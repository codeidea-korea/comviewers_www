import assert from 'node:assert/strict'
import { accessSync, constants } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'
import { withSourceModules } from './helpers/withSourceModules.mjs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'

const root = path.resolve(import.meta.dirname, '..')
test('QA USR-0480/0728: latest rental represents each PC once; equal aliases remain distinct; input preserved', async () => withSourceModules(async load => {
  const { sortInquiryChoices } = await load('/src/routes/mypage/-components/inquiryChoice.ts')
  const item = { rentalId: 10, pcAssetId: 1, productNo: 'QA1', preference: { alias: 'same' }, connectionStatus: 'ONLINE', pcSpec: null, serverRoomId: 1 }
  const rows = [item, { ...item, rentalId: 2, productNo: 'OLD' }, { ...item, rentalId: 11, pcAssetId: 2, productNo: 'QA2' }]
  const before = structuredClone(rows)
  const result = sortInquiryChoices(rows)
  assert.deepEqual(result.map(row => row.rcpcId), [1, 2])
  assert.equal(result[0].productNo, 'QA1')
  assert.deepEqual(rows, before)
}))
test('QA USR-0728: same business permits multiple rooms; unknown/different businesses fail', async () => withSourceModules(async load => {
  const { hasSameInquiryBusiness } = await load('/src/routes/mypage/-components/inquiryBusinessScope.ts')
  assert.equal(hasSameInquiryBusiness([{ serverRoomBusinessKey: 'a' }, { serverRoomBusinessKey: 'a' }]), true)
  assert.equal(hasSameInquiryBusiness([{ serverRoomBusinessKey: 'a' }, { serverRoomBusinessKey: 'b' }]), false)
  assert.equal(hasSameInquiryBusiness([{}, {}]), false)
}))
test('QA ADM-0313 customer: partial refund preserves active sibling purchase confirmation, pending/refunded item stays blocked', async () => withSourceModules(async load => {
  const { OrderItemActions } = await load('/src/routes/mypage/-components/orders/OrderItemActions.tsx')
  const { SessionProvider } = await load('/src/app/session/SessionProvider.tsx')
  const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
  const client = new QueryClient()
  const snapshot = { status: 'authenticated', customerSession: { memberRole: 'owner', commerceAvailable: true } }
  const store = { subscribe: () => () => {}, getSnapshot: () => snapshot }
  const local = delta => new Date(Date.now() + delta + 9 * 3_600_000).toISOString().slice(0, 19)
  const item = { orderItemId: 1, rentalId: 2, pcAssetId: 3, productNo: 'QA3', itemStatus: 'active', customerRentalStatus: 'active', rentalStatus: 'active',
    refundPending: false, purchaseConfirmedAt: null, serviceStartedAt: local(-86_400_000), serviceEndsAt: local(86_400_000),
    automaticConfirmationAt: local(2 * 86_400_000), expectedPoints: 100 }
  const render = (patch, variant = 'purchase-summary') => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(QueryClientProvider, { client }, createElement(SessionProvider, { store },
      createElement(ServiceProvider, { services: { myAccount: { inquiryApi: {}, rcpcApi: { organizationId: 'qa' } } } }, createElement(OrderItemActions, {
        api: {}, item: { ...item, ...patch }, paymentStatus: 'partially_refunded', orderStatus: 'paid', variant,
      }))))))
  try {
    assert.match(render({}), /<button[^>]*>.*?구매확정/s)
    assert.doesNotMatch(render({}), /<button[^>]*disabled/)
    assert.doesNotMatch(render({ refundPending: true }), /<button[^>]*>.*?구매확정/s)
    assert.doesNotMatch(render({ rentalStatus: 'refunded' }), /<button[^>]*>.*?구매확정/s)
    const activeActions = render({}, 'default')
    assert.match(activeActions, /aria-label="RCPC 기간 연장"/)
    assert.match(activeActions, /<button[^>]*>해지신청<\/button>/)
    assert.match(render({ itemStatus: 'refunded' }, 'default'), /order-catalog-item__actions--terminal/)
    assert.doesNotMatch(render({ itemStatus: 'refunded' }, 'default'), /aria-label="RCPC 기간 연장"/)
    assert.doesNotMatch(render({ refundPending: true }, 'default'), /aria-label="RCPC 기간 연장"/)
  } finally { client.clear() }
}))

test('[browser] QA 20261014 customer inquiry, email error mapping, PNG bytes and coupon return refresh', { timeout: 150_000 }, async () => {
  const previous = process.env.VITE_API_BASE_URL
  process.env.VITE_API_BASE_URL = '/backend'
  const server = await createServer({ root, logLevel: 'error', optimizeDeps: { entries: [] }, server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false }, plugins: [{
    name: 'qa-only-html', configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__qa_customer__')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, '<!doctype html><html><body><div id="root"></div><script type="module" src="/tests/helpers/qa_customer_fixture.jsx"></script></body></html>'))
      })
    },
  }] })
  try {
    await server.listen()
    const address = server.httpServer.address()
    const candidate = process.env.PYTHON || path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python312', 'python.exe')
    let python = candidate
    try { accessSync(candidate, constants.X_OK) } catch { python = 'python' }
    await new Promise((resolve, reject) => {
      const child = spawn(python, [path.join(root, 'tests/helpers/qa_customer_browser.py'), `http://127.0.0.1:${address.port}`], { cwd: root, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, windowsHide: true })
      let output = ''
      child.stdout.on('data', data => { output += data })
      child.stderr.on('data', data => { output += data })
      child.once('error', reject)
      child.once('exit', code => code === 0 ? (console.log(output.trim()), resolve()) : reject(new Error(output)))
    })
  } finally {
    await server.close()
    if (previous === undefined) delete process.env.VITE_API_BASE_URL
    else process.env.VITE_API_BASE_URL = previous
  }
})
