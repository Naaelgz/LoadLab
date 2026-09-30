import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'node:http'
import { createApp } from '../server.js'

const accessToken = 'valid-cloudflare-access-token'
let server
let baseUrl

before(async () => {
  const app = createApp({
    verifyAccessToken: async (token) => {
      if (token !== accessToken) throw new Error('Invalid Access token')
    },
    resolveTarget: async () => ({ address: '93.184.216.34', family: 4 }),
    sendRequest: async () => ({
      statusCode: 200,
      reasonPhrase: 'OK',
      responseTime: 12.5,
    }),
  })
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint is available without an Access token', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('load-test endpoint rejects missing and invalid Cloudflare Access tokens', async () => {
  for (const token of [undefined, 'invalid-access-token']) {
    const response = await fetch(`${baseUrl}/api/load-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}) },
      body: JSON.stringify({ target: 'https://example.com', numberOfRequests: 1, concurrency: 1, timeoutSeconds: 2 }),
    })
    assert.equal(response.status, 401)
  }
})

test('load-test endpoint returns request results and statistics', async () => {
  const response = await fetch(`${baseUrl}/api/load-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cf-Access-Jwt-Assertion': accessToken },
    body: JSON.stringify({ target: 'https://example.com/path', numberOfRequests: 3, concurrency: 2, timeoutSeconds: 2 }),
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.results.length, 3)
  assert.deepEqual(payload.results.map((result) => result.requestNumber), [1, 2, 3])
  assert.deepEqual(payload.statistics, {
    totalRequests: 3,
    successfulRequests: 3,
    failedRequests: 0,
    totalResponseTime: 37.5,
    averageResponseTime: 12.5,
  })
})

test('load-test endpoint rejects excessive load parameters', async () => {
  const response = await fetch(`${baseUrl}/api/load-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cf-Access-Jwt-Assertion': accessToken },
    body: JSON.stringify({ target: 'https://example.com', numberOfRequests: 1001, concurrency: 1, timeoutSeconds: 2 }),
  })

  assert.equal(response.status, 400)
})

test('production target resolver rejects loopback addresses', async () => {
  const app = createApp()
  const testServer = createServer(app)
  await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve))

  try {
    const response = await fetch(`http://127.0.0.1:${testServer.address().port}/api/load-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'http://127.0.0.1:80', numberOfRequests: 1, concurrency: 1, timeoutSeconds: 2 }),
    })

    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /public IP addresses/)
  } finally {
    await new Promise((resolve, reject) => testServer.close((error) => error ? reject(error) : resolve()))
  }
})

test('backend measures a real upstream response and preserves its HTTP status', async () => {
  const targetServer = createServer((_request, response) => {
    response.writeHead(201, 'Created')
    setTimeout(() => response.end('created'), 80)
  })
  await new Promise((resolve) => targetServer.listen(0, '127.0.0.1', resolve))

  const app = createApp({
    resolveTarget: async () => ({ address: '127.0.0.1', family: 4 }),
  })
  const testServer = createServer(app)
  await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve))

  try {
    const response = await fetch(`http://127.0.0.1:${testServer.address().port}/api/load-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: `http://127.0.0.1:${targetServer.address().port}/test`,
        numberOfRequests: 1,
        concurrency: 1,
        timeoutSeconds: 2,
      }),
    })
    const payload = await response.json()

    assert.equal(response.status, 200)
    assert.equal(payload.results[0].statusCode, 201)
    assert.ok(payload.results[0].responseTime >= 60)
    assert.equal(payload.statistics.successfulRequests, 1)
  } finally {
    await new Promise((resolve, reject) => testServer.close((error) => error ? reject(error) : resolve()))
    await new Promise((resolve, reject) => targetServer.close((error) => error ? reject(error) : resolve()))
  }
})

test('production configuration fails closed without Cloudflare Access', () => {
  assert.throws(
    () => createApp({ verifyAccessToken: null, allowLocalAccess: false }),
    /CF_ACCESS_ISSUER and CF_ACCESS_AUD/
  )
})