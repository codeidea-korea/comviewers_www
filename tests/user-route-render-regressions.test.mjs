import assert from 'node:assert/strict'
import { accessSync, constants } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function resolvePython() {
  const candidates = [
    process.env.PYTHON,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python312', 'python.exe'),
    'python',
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (candidate === 'python') return candidate
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch { /* Try the next configured interpreter. */ }
  }
  throw new Error('Playwright 검수에 사용할 Python 실행 파일을 찾을 수 없습니다.')
}

function runBrowserAssertions(baseUrl) {
  const script = path.join(projectRoot, 'tests', 'helpers', 'user_route_render_regressions.py')
  return new Promise((resolve, reject) => {
    const child = spawn(resolvePython(), [script, baseUrl], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`브라우저 렌더링 검수가 실패했습니다.\n${stdout}${stderr}`))
    })
  })
}

test('실제 라우트는 인증·권한 상태와 PDF 대시보드 CTA·반응형 품번 검색을 렌더링한다', { timeout: 90_000 }, async () => {
  const previousApiBaseUrl = process.env.VITE_API_BASE_URL
  process.env.VITE_API_BASE_URL = '/backend'
  const server = await createServer({
    root: projectRoot,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false },
  })
  try {
    await server.listen()
    const address = server.httpServer?.address()
    assert(address && typeof address === 'object')
    await runBrowserAssertions(`http://127.0.0.1:${address.port}`)
  } finally {
    await server.close()
    if (previousApiBaseUrl === undefined) delete process.env.VITE_API_BASE_URL
    else process.env.VITE_API_BASE_URL = previousApiBaseUrl
  }
})
