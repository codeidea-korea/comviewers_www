import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function isolatedServer(options) {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'comviewers-manager-test-'))
  const removeCache = async () => {
    assert(path.resolve(cacheDir).startsWith(path.resolve(tmpdir()) + path.sep))
    assert(path.basename(cacheDir).startsWith('comviewers-manager-test-'))
    await rm(cacheDir, { recursive: true, force: true })
  }
  try {
    const server = await createServer({ ...options, cacheDir })
    return { server, close: async () => { try { await server.close() } finally { await removeCache() } } }
  } catch (error) { await removeCache(); throw error }
}
async function modules(run) {
  const { server, close } = await isolatedServer({ root, logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false } })
  try {
    const reader = await server.ssrLoadModule('/src/domain/myAccount/httpManagerServices.ts')
    const managers = await server.ssrLoadModule('/src/api/cManagers.ts')
    await run({ ...reader, ...managers })
  } finally { await close() }
}
const rcpc = rentalId => ({ rentalId, productNo: `PC${rentalId}`, serverRoomName: 'Test room', rentalStatus: 'active', preference: { favorite: false }, serviceEndExclusiveDate: null, trafficDownloadTotalBytes: null, trafficUploadTotalBytes: null })
const managerApi = { list: async () => [], rcpcs: async () => [], detail: async () => ({ rcpcs: [] }) }
const dependencies = list => ({ list })

test('담당자 목록은 요청 페이지만 읽고 전체 건수와 마지막 페이지 장비를 보존한다', async () => modules(async ({ createHttpManagerServices }) => {
  const calls = []
  const catalog = async ({ page, size }) => {
    calls.push({ page, size })
    return { items: Array.from({ length: page < 20 ? 10 : 1 }, (_, i) => ({ ...rcpc(page * 10 + i + 1), assignable: true })), managers: [], assignments: [], counts: [{ memberId: null, count: 201 }], page, size, totalElements: 201, totalPages: 21 }
  }
  const services = createHttpManagerServices({ ...managerApi, catalog }, dependencies(() => { throw new Error('full RCPC fetch is forbidden') }))
  const first = await services.readPage({ page: 0, size: 10 })
  assert.equal(first.rcpcs.length, 10)
  assert.equal(first.totalElements, 201)
  const last = await services.readPage({ page: 20, size: 10 })
  assert.equal(last.rcpcs.length, 1)
  assert.equal(last.rcpcs[0].id, '201')
  assert.equal(last.unassignedCount, 201)
  assert.deepEqual(calls, [0, 20].map(page => ({ page, size: 10 })))
}))

test('담당자 페이지 조회는 필터와 취소 신호를 전달하고 실패를 숨기지 않는다', async () => modules(async ({ createHttpManagerServices }) => {
  const controller = new AbortController()
  const query = { page: 2, size: 10, keyword: 'PC20', managerId: 7 }
  const services = createHttpManagerServices({ ...managerApi, catalog: async (actual, signal) => {
    assert.deepEqual(actual, query)
    assert.equal(signal, controller.signal)
    throw new Error('page unavailable')
  } }, dependencies(() => assert.fail('unexpected RCPC request')))
  await assert.rejects(services.readPage(query, controller.signal), /page unavailable/)
}))

test('담당자 계정 생성·수정 요청에 선택한 그룹을 함께 보내고 다른 조직 경로를 쓰지 않는다', async () => modules(async ({ createCManagersApi }) => {
  const requests = []
  const api = createCManagersApi({ request: async (url, schema, options) => {
    requests.push({ url, options })
    return schema.parse(options.method === 'POST' ? 42 : undefined)
  } }, '7')
  await api.create({ name: '담당자', username: 'test_manager', password: 'Test123!', managementMemo: '', permissionGroupId: 9 })
  await api.update(42, { name: '담당자', managementMemo: '', permissionGroupId: 10 })
  assert.equal(requests[0].url, '/api/v1/my/c-managers')
  assert.equal(requests[0].options.body.permissionGroupId, 9)
  assert.equal(requests[1].url, '/api/v1/my/c-managers/42')
  assert.equal(requests[1].options.body.permissionGroupId, 10)
  assert(requests.every(({ options }) => options.authenticated && options.customerOrganizationId === '7'))
  assert.throws(() => api.create({ name: '담당자', username: 'test_manager', password: 'Test123!', managementMemo: '', permissionGroupId: 0 }))
  assert.equal(requests.length, 2)
}))

test('[browser] 권한 그룹이 없는 신규 담당자는 화면에서 그룹 생성·선택 후 저장할 수 있다', { timeout: 90_000 }, async () => {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { ServiceProvider } from '/src/app/ServiceProvider.tsx';
    import { ManagerEditorForm } from '/src/routes/mypage/-components/modals/ManagerEditorForm.tsx';
    const state = window.managerQa = { groups: [], saved: [], rules: [], failNext: false };
    const api = { organizationId: '7', permissionGroups: async () => state.groups,
      permissionGroup: async id => state.groups.find(group => group.id === id),
      createPermissionGroup: async input => {
        if (state.failNext) { state.failNext = false; throw new Error('test failure'); }
        state.rules.push(input.rules);
        const group = { ...input, id: state.groups.length + 1, customerOrganizationId: 7, assignedMemberCount: 0 };
        state.groups = [...state.groups, group]; return group;
      }
    };
    createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,
      { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
      React.createElement(ServiceProvider, { services: { myAccount: { managerApi: api } } },
        React.createElement(ManagerEditorForm, { pending: false, checkLogin: async () => true, onClose: () => {}, onSave: async draft => { state.saved.push(draft); } }))));
  `
  const { server, close } = await isolatedServer({ root, logLevel: 'error', optimizeDeps: { entries: [] }, server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false }, plugins: [{
    name: 'manager-memory-harness', configureServer(instance) {
      instance.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__manager_qa') return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await instance.transformIndexHtml('/__manager_qa', `<html><body><div id="root"></div><script type="module">${source}</script></body></html>`))
      })
    },
  }] })
  try {
    await server.listen()
    const address = server.httpServer.address()
    const bundled = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python312', 'python.exe')
    const python = process.env.PYTHON || (bundled && existsSync(bundled) ? bundled : 'python')
    await new Promise((resolve, reject) => {
      const child = spawn(python, [path.join(root, 'tests/helpers/manager_permission_groups.py'), `http://127.0.0.1:${address.port}`], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
      let output = ''
      child.stdout.on('data', value => { output += value })
      child.stderr.on('data', value => { output += value })
      child.once('error', reject)
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(output)))
    })
  } finally { await close() }
})
