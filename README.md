# LoadTesting-JS

A browser interface and Node.js backend for running bounded HTTP load tests.

## Requirements

- Node.js 20 or newer
- A Cloudflare Access application protecting the production hostname

## Development

Start the Vite frontend and API server:

```powershell
npm install
npm run dev
```

Vite forwards `/api` requests to the backend on port `3001`. Local development does not need a key; the backend binds to `127.0.0.1` and accepts test requests only from loopback clients.

## Production

Build the frontend and run the Node server from the same project directory:

```powershell
npm ci
npm run build
$env:NODE_ENV = "production"
$env:CF_ACCESS_ISSUER = "https://your-team.cloudflareaccess.com"
$env:CF_ACCESS_AUD = "your-cloudflare-access-application-aud-tag"
$env:PORT = "3000"
npm start
```

Create a Cloudflare Access self-hosted application for the hostname and add an allow policy for authorized users. The Node API validates the `Cf-Access-Jwt-Assertion` header signature, issuer, and audience on every load-test request. Set `CF_ACCESS_ISSUER` to the exact HTTPS team issuer URL and `CF_ACCESS_AUD` to the application's audience tag. Production startup fails closed if either value is missing. The server serves the `dist` frontend and API from the same origin; keep the origin inaccessible except through Cloudflare Access. `PORT` defaults to `3000`; `/api/health` remains available for health checks.

When running behind a reverse proxy, set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops so rate limiting can use the originating client IP. It defaults to `0` (trust no forwarded IP headers).

## Limits and security

- Cloudflare Access protects the public hostname, and the origin independently verifies Access JWTs before accepting load-test submissions.
- The API allows at most five test submissions per client IP each minute.
- Each test is limited to 1,000 requests, 50 concurrent requests, and a 30-second per-request timeout.
- Targets must use HTTP or HTTPS and resolve only to public IP addresses. DNS is checked and pinned per outbound request; private, loopback, and link-local targets are rejected, including redirects.
- Redirects are followed for up to five hops, validating each destination. Response bodies are discarded.
- This backend is intended for authorized testing. Run a single instance unless rate limiting is configured with a shared store for your deployment topology.

## Checks

```sh
npm test
npm run lint
npm run build
```
