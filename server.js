import { lookup } from 'node:dns/promises'
import { existsSync } from 'node:fs'
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import express from 'express'
import rateLimit from 'express-rate-limit'
import ipaddr from 'ipaddr.js'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const MAX_REQUESTS = 1000
const MAX_CONCURRENCY = 50
const MAX_TIMEOUT_SECONDS = 30
const MAX_TARGET_LENGTH = 2048
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308])
const projectDirectory = dirname(fileURLToPath(import.meta.url))

function isPublicAddress(address) {
  try {
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}

async function resolvePublicTarget(target) {
  const hostname = target.hostname.replace(/^\[|\]$/g, '')
  const addresses = await lookup(hostname, { all: true, verbatim: true })

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Target must resolve only to public IP addresses.')
  }

  return addresses[0]
}

function requestTarget(target, address, timeoutMs) {
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest
  const hostname = target.hostname.replace(/^\[|\]$/g, '')

  return new Promise((resolveRequest, rejectRequest) => {
    const request = transport({
      hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      agent: false,
      lookup: (_hostname, options, callback) => {
        if (options?.all) {
          callback(null, [address])
        } else {
          callback(null, address.address, address.family)
        }
      },
      headers: { 'user-agent': 'LoadTesting-JS/1.0' },
    }, (response) => {
      const statusCode = response.statusCode || 0
      const reasonPhrase = response.statusMessage || ''
      const location = response.headers.location
      response.resume()
      response.once('end', () => resolveRequest({ statusCode, reasonPhrase, location }))
      response.once('error', rejectRequest)
    })

    request.setTimeout(timeoutMs, () => request.destroy(new Error('Timeout')))
    request.once('error', rejectRequest)
    request.end()
  })
}

async function performRequest(target, timeoutSeconds, resolver = resolvePublicTarget) {
  const startedAt = performance.now()
  const timeoutMs = timeoutSeconds * 1000
  let currentTarget = target

  try {
    for (let redirects = 0; ; redirects++) {
      const address = await resolver(currentTarget)
      const response = await requestTarget(currentTarget, address, timeoutMs)

      if (!REDIRECT_CODES.has(response.statusCode) || !response.location) {
        return {
          statusCode: response.statusCode,
          reasonPhrase: response.reasonPhrase,
          responseTime: performance.now() - startedAt,
        }
      }

      if (redirects >= 5) {
        throw new Error('Too many redirects')
      }

      currentTarget = new URL(response.location, currentTarget)
      if (!['http:', 'https:'].includes(currentTarget.protocol)) {
        throw new Error('Redirect uses an unsupported protocol.')
      }
    }
  } catch (error) {
    return {
      statusCode: 'Error',
      reasonPhrase: error.message === 'Timeout' ? 'Timeout' : error.message,
      responseTime: performance.now() - startedAt,
    }
  }
}

function validateLoadTest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON request body is required.'
  }

  if (typeof body.target !== 'string' || body.target.length > MAX_TARGET_LENGTH) {
    return `Target must be a URL shorter than ${MAX_TARGET_LENGTH} characters.`
  }

  let target
  try {
    target = new URL(body.target)
  } catch {
    return 'Target must be a valid URL.'
  }

  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
    return 'Target must be an HTTP(S) URL without embedded credentials.'
  }

  if (!Number.isInteger(body.numberOfRequests) || body.numberOfRequests < 1 || body.numberOfRequests > MAX_REQUESTS) {
    return `numberOfRequests must be an integer from 1 to ${MAX_REQUESTS}.`
  }

  if (!Number.isInteger(body.concurrency) || body.concurrency < 1 || body.concurrency > MAX_CONCURRENCY) {
    return `concurrency must be an integer from 1 to ${MAX_CONCURRENCY}.`
  }

  if (!Number.isFinite(body.timeoutSeconds) || body.timeoutSeconds < 0.1 || body.timeoutSeconds > MAX_TIMEOUT_SECONDS) {
    return `timeoutSeconds must be from 0.1 to ${MAX_TIMEOUT_SECONDS}.`
  }

  return null
}

export function createApp({
  verifyAccessToken = createAccessVerifier(),
  allowLocalAccess = process.env.NODE_ENV !== 'production',
  resolveTarget = resolvePublicTarget,
  sendRequest = (target, timeout) => performRequest(target, timeout, resolveTarget),
} = {}) {
  if (!verifyAccessToken && !allowLocalAccess) {
    throw new Error('Set CF_ACCESS_ISSUER and CF_ACCESS_AUD to protect the production API with Cloudflare Access.')
  }

  const app = express()
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0)
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.')
  }

  app.set('trust proxy', trustProxyHops)
  const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Try again in a minute.' },
  })

  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

  const requireAccess = async (request, response, next) => {
    if (verifyAccessToken) {
      const token = request.get('cf-access-jwt-assertion')
      if (!token) {
        response.status(401).json({ error: 'Sign in through Cloudflare Access to run a test.' })
        return
      }

      try {
        await verifyAccessToken(token)
      } catch {
        response.status(401).json({ error: 'Cloudflare Access token is invalid or expired.' })
        return
      }

      next()
      return
    }

    if (!allowLocalAccess || !isLoopbackAddress(request.socket.remoteAddress)) {
      response.status(401).json({ error: 'Cloudflare Access authentication is required.' })
      return
    }

    next()
  }

  app.post('/api/load-test', apiRateLimit, requireAccess, async (request, response) => {

    const validationError = validateLoadTest(request.body)
    if (validationError) {
      response.status(400).json({ error: validationError })
      return
    }

    const target = new URL(request.body.target)
    try {
      await resolveTarget(target)
    } catch (error) {
      response.status(400).json({ error: error.message || 'Target host could not be resolved safely.' })
      return
    }

    const { numberOfRequests, concurrency, timeoutSeconds } = request.body
    const results = new Array(numberOfRequests)
    let nextRequest = 0

    const runWorker = async () => {
      while (nextRequest < numberOfRequests) {
        const index = nextRequest++
        results[index] = {
          requestNumber: index + 1,
          ...await sendRequest(target, timeoutSeconds),
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, numberOfRequests) }, runWorker)
    )

    const successfulRequests = results.filter((result) => Number(result.statusCode) >= 200 && Number(result.statusCode) < 300).length
    const totalResponseTime = results.reduce((total, result) => total + result.responseTime, 0)

    response.json({
      results,
      statistics: {
        totalRequests: numberOfRequests,
        successfulRequests,
        failedRequests: numberOfRequests - successfulRequests,
        totalResponseTime,
        averageResponseTime: totalResponseTime / numberOfRequests,
      },
    })
  })

  const staticDirectory = resolve(projectDirectory, 'dist')
  if (existsSync(resolve(staticDirectory, 'index.html'))) {
    app.use(express.static(staticDirectory, { index: false }))
    app.get(/.*/, (_request, response) => response.sendFile(resolve(staticDirectory, 'index.html')))
  }

  return app
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  let app
  try {
    app = createApp()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  const portArgumentIndex = process.argv.indexOf('--port')
  const defaultPort = portArgumentIndex >= 0 ? process.argv[portArgumentIndex + 1] : 3000
  const port = Number(process.env.PORT || defaultPort)
  const defaultHost = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'
  const host = process.env.HOST || defaultHost
  const server = createHttpServer(app)
  server.listen(port, host, () => {
    console.log(`Load-testing server listening on http://${host}:${port}`)
  })
}

function isLoopbackAddress(address) {
  try {
    return ipaddr.process(address).range() === 'loopback'
  } catch {
    return false
  }
}

function createAccessVerifier() {
  const issuer = process.env.CF_ACCESS_ISSUER?.replace(/\/$/, '')
  const audience = process.env.CF_ACCESS_AUD
  if (!issuer || !audience) return null

  const issuerUrl = new URL(issuer)
  if (issuerUrl.protocol !== 'https:' || issuerUrl.pathname !== '/') {
    throw new Error('CF_ACCESS_ISSUER must be an HTTPS Cloudflare Access issuer URL.')
  }

  const jwks = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuerUrl))
  return (token) => jwtVerify(token, jwks, { issuer, audience })
}