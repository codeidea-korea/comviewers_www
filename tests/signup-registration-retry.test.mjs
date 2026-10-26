import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'
import { withSourceModules } from './helpers/withSourceModules.mjs'

test('signup retry policy obeys Retry-After and retries only known pre-transaction failures', async () => withSourceModules(async load => {
  const policy = await load('/src/routes/auth/-components/signupRegistrationRetry.ts')
  const { ApiClientError } = await load('/src/api/httpClient.ts')
  const now = Date.parse('2026-10-26T02:00:00Z')
  const error = (status, code, retryAfter) => new ApiClientError('http', status, { code, retryAfter })
  assert.equal(policy.signupRetryDelayMillis(error(429, 'A007', '2'), now), 3000)
  assert.equal(policy.signupRetryDelayMillis(error(503, 'A008', 'Mon, 26 Oct 2026 02:00:12 GMT'), now), 13000)
  assert.equal(policy.signupRetryDelayMillis(error(429, 'A007'), now), 60000)
  assert.equal(policy.signupRetryDelayMillis(error(503, 'A008', 'invalid'), now), 30000)
  for (const cause of [error(503, 'C003'), error(429, 'OTHER'), error(400, 'A007'), new ApiClientError('network'), new Error('unknown')]) {
    assert.equal(policy.signupRetryDelayMillis(cause, now), null)
  }
  assert.equal(policy.maximumAutomaticSignupRetries, 3)
}))

test('signup proof expiry is interpreted as KST and uncertain registration responses require login confirmation', async () => withSourceModules(async load => {
  const policy = await load('/src/routes/auth/-components/signupRegistrationRetry.ts')
  const { ApiClientError } = await load('/src/api/httpClient.ts')
  assert.equal(policy.verificationExpiryMillis('2026-10-26T11:05:00'), Date.parse('2026-10-26T02:05:00Z'))
  assert.equal(policy.verificationExpiryMillis('2026-10-26 11:05:00'), Date.parse('2026-10-26T02:05:00Z'))
  assert.equal(policy.verificationExpiryMillis('2026-10-26T02:05:00Z'), Date.parse('2026-10-26T02:05:00Z'))
  assert.ok(Number.isNaN(policy.verificationExpiryMillis('malformed')))
  assert.equal(policy.signupNeedsLoginCheck(new ApiClientError('network')), true)
  assert.equal(policy.signupNeedsLoginCheck(new ApiClientError('contract', 201)), true)
  assert.equal(policy.signupNeedsLoginCheck(new ApiClientError('http', 500)), true)
  assert.equal(policy.signupNeedsLoginCheck(new ApiClientError('http', 409, { code: 'U002' })), true)
  assert.equal(policy.signupNeedsLoginCheck(new ApiClientError('http', 400, { code: 'A009' })), false)
}))

test('public signup HTTP adapter retains A007/A008 retry metadata after friendly message mapping', async () => withSourceModules(async load => {
  const { createPublicAccountApi } = await load('/src/api/publicAccount.ts')
  const { ApiClientError } = await load('/src/api/httpClient.ts')
  const previousFetch = globalThis.fetch
  try {
    for (const [status, code] of [[429, 'A007'], [503, 'A008']]) {
      let calls = 0
      globalThis.fetch = async (url, options) => {
        calls += 1
        assert.equal(url, '/backend/api/auth/register')
        assert.equal(options.method, 'POST')
        return new Response(JSON.stringify({ code, message: 'synthetic status' }), { status, headers: { 'Content-Type': 'application/json', 'Retry-After': '17' } })
      }
      await assert.rejects(createPublicAccountApi('/backend').register({}), error => {
        assert.ok(error instanceof ApiClientError)
        assert.equal(error.kind, 'http')
        assert.equal(error.status, status)
        assert.equal(error.code, code)
        assert.equal(error.retryAfter, '17')
        return true
      })
      assert.equal(calls, 1)
    }
  } finally { globalThis.fetch = previousFetch }
}))

test('[browser] signup registration retries preserve verification and coordinate original/email tabs', { timeout: 180000 }, async () => {
  const root = path.resolve(import.meta.dirname, '..')
  const previous = process.env.VITE_API_BASE_URL
  process.env.VITE_API_BASE_URL = '/backend'
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'comviewers-signup-retry-'))
  let server
  try {
    server = await createServer({ configFile: false, root, cacheDir, logLevel: 'error',
      resolve: { alias: { '@': path.join(root, 'src') } }, esbuild: { jsx: 'automatic' },
      optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'react-router', '@tanstack/react-query', 'zod'] },
      server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false },
      plugins: [{ name: 'signup-retry-fixture', configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!/^\/(?:signup\/(?:profile|complete)|email-verification|login)(?:\?|$)/.test(req.url ?? '')) return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await vite.transformIndexHtml(req.url, '<!doctype html><html><body><div id="root"></div><script type="module" src="/tests/helpers/signup_registration_retry_fixture.jsx"></script></body></html>'))
        })
      } }] })
    await server.listen()
    const python = process.env.PYTHON ?? path.join(process.env.LOCALAPPDATA, 'Programs/Python/Python312/python.exe')
    const { code, output } = await new Promise((resolve, reject) => {
      const child = spawn(python, [path.join(root, 'tests/helpers/signup_registration_retry_browser.py'), `http://127.0.0.1:${server.httpServer.address().port}`], { cwd: root, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
      let output = ''
      child.stdout.on('data', value => { output += value; process.stdout.write(value) }); child.stderr.on('data', value => { output += value; process.stderr.write(value) })
      child.once('error', reject); child.once('exit', code => resolve({ code, output }))
    })
    assert.equal(code, 0, output)
  } finally {
    await server?.close()
    assert(path.dirname(cacheDir) === path.resolve(tmpdir()) && path.basename(cacheDir).startsWith('comviewers-signup-retry-'))
    await rm(cacheDir, { recursive: true, force: true })
    if (previous === undefined) delete process.env.VITE_API_BASE_URL
    else process.env.VITE_API_BASE_URL = previous
  }
})
