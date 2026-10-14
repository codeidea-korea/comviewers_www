import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'

test('[browser] email verification preserves token through StrictMode/auth HTTP scope restoration', { timeout: 180000 }, async () => {
  const root = path.resolve(import.meta.dirname, '..')
  const previous = process.env.VITE_API_BASE_URL
  process.env.VITE_API_BASE_URL = '/backend'
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'comviewers-email-session-'))
  let server
  try {
    server = await createServer({ root, cacheDir, logLevel: 'error', optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'react-router', '@tanstack/react-query', 'zod'] }, server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false }, plugins: [{ name: 'email-session-fixture', configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!/^\/email-verification(\?|$)/.test(req.url ?? '')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, '<!doctype html><html><body><div id="root"></div><script type="module" src="/tests/helpers/email_verification_session_fixture.jsx"></script></body></html>'))
      })
    } }] })
    await server.listen()
    const python = path.join(process.env.LOCALAPPDATA, 'Programs/Python/Python312/python.exe')
    const { code, output } = await new Promise((resolve, reject) => {
      const child = spawn(python, [path.join(root, 'tests/helpers/email_verification_session_browser.py'), `http://127.0.0.1:${server.httpServer.address().port}`], { cwd: root, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
      let output = ''
      child.stdout.on('data', value => { output += value }); child.stderr.on('data', value => { output += value })
      child.once('error', reject); child.once('exit', code => resolve({ code, output }))
    })
    console.log(output.trim())
    assert.equal(code, 0, output)
  } finally {
    await server?.close()
    assert(path.dirname(cacheDir) === path.resolve(tmpdir()) && path.basename(cacheDir).startsWith('comviewers-email-session-'))
    await rm(cacheDir, { recursive: true, force: true })
    if (previous === undefined) delete process.env.VITE_API_BASE_URL
    else process.env.VITE_API_BASE_URL = previous
  }
})
