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
    const reader = await server.ssrLoadModule('/src/domain/myAccount/liveSnapshot.ts')
    const managers = await server.ssrLoadModule('/src/api/cManagers.ts')
    await run({ ...reader, ...managers })
  } finally { await close() }
}
const rcpc = rentalId => ({ rentalId, productNo: `PC${rentalId}`, serverRoomName: 'Test room', rentalStatus: 'active', preference: { favorite: false }, serviceEndExclusiveDate: null, trafficDownloadTotalBytes: null, trafficUploadTotalBytes: null })
const emptyPage = async () => ({ items: [] })
function dependencies(list) {
  return {
    readApi: { profile: async () => ({ username: 'test_owner' }), benefits: async () => ({ pointBalance: 0 }), orders: emptyPage, points: emptyPage, coupons: emptyPage, storage: emptyPage },
    rcpcApi: { list }, inquiryApi: { list: emptyPage }, rcpcMutations: { groups: async () => [] },
  }
}

test('담당자 목록은 201대 전체를 읽어 100대 이후 장비를 보존한다', async () => modules(async ({ createLiveMyAccountReader }) => {
  const calls = []
  const reader = createLiveMyAccountReader(dependencies(async ({ page, size }) => {
    calls.push({ page, size })
    return { items: Array.from({ length: page < 2 ? 100 : 1 }, (_, i) => rcpc(page * 100 + i + 1)), page, size, totalElements: 201, totalPages: 3 }
  }))
  const snapshot = await reader()
  assert.equal(snapshot.rcpcs.length, 201)
  assert.equal(snapshot.rcpcs[200].id, '201')
  assert.deepEqual(calls, [0, 1, 2].map(page => ({ page, size: 100 })))
}))

for (const mode of ['network', 'empty', 'duplicate', 'count_changed']) {
  test(`담당자 전체 조회 ${mode} 실패를 부분 성공으로 반환하지 않는다`, async () => modules(async ({ createLiveMyAccountReader }) => {
    const reader = createLiveMyAccountReader(dependencies(async ({ page, size }) => {
      if (page === 1 && mode === 'network') throw new Error('page unavailable')
      return { items: page === 0 ? Array.from({ length: 100 }, (_, i) => rcpc(i + 1)) : mode === 'empty' ? [] : [rcpc(mode === 'duplicate' ? 1 : 101)], page, size, totalElements: page === 1 && mode === 'count_changed' ? 102 : 101, totalPages: 2 }
    }))
    await assert.rejects(reader(), mode === 'network' ? /page unavailable/ : /다시 조회/)
  }))
}

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

test('권한 그룹이 없는 신규 담당자는 화면에서 그룹 생성·선택 후 저장할 수 있다', { timeout: 90_000 }, async () => {
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
