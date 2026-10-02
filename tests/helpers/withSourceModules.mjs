import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'

export async function withSourceModules(run) {
  const root = path.resolve(import.meta.dirname, '../..')
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'comviewers-structure-test-'))
  let server
  try {
    server = await createServer({ root, cacheDir, logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false } })
    return await run(file => server.ssrLoadModule(file))
  } finally {
    await server?.close()
    assert(path.dirname(cacheDir) === path.resolve(tmpdir()) && path.basename(cacheDir).startsWith('comviewers-structure-test-'))
    await rm(cacheDir, { recursive: true, force: true })
  }
}
