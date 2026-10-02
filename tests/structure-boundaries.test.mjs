import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient } from '@tanstack/react-query'
import { sortRows } from '../src/lib/sortRows.ts'
import { createManagerReader } from '../src/domain/myAccount/httpManagerServices.ts'
import { withSourceModules } from './helpers/withSourceModules.mjs'

const login = accessToken => ({ userId: '1', role: 'USER', status: 'ACTIVE', passwordChangeRequired: false, accessToken, tokenType: 'Bearer', expiresInMs: 3_600_000 })
const capability = { customerOrganizationId: '7', customerMemberId: '8', memberRole: 'owner', myPageOnly: false, customerNicknameVisible: true, commerceAvailable: true, cManagerManagementAvailable: true }

test('token refresh preserves scope, capability and service credentials; organization changes revoke old services', async () => withSourceModules(async load => {
  const { createSessionStore } = await load('/src/app/session/sessionStore.ts')
  const { createServiceScope } = await load('/src/app/session/serviceScope.ts')
  const store = createSessionStore()
  store.establishFromVerifiedResponse(login('first.token'), { expectedRevision: 0, receivedAt: Date.now(), organizations: [{ id: '7', name: 'one', role: 'owner' }, { id: '9', name: 'two', role: 'owner' }], preferredOrganizationId: '7' })
  store.establishCustomerSession(capability, { expectedRevision: store.getSnapshot().revision, organizationId: '7' })
  const initial = store.getSnapshot()
  const service = createServiceScope(store, initial)
  store.establishFromVerifiedResponse(login('new.token'), { expectedRevision: initial.revision, receivedAt: Date.now(), preferredOrganizationId: '7', preserveVerifiedOrganizations: true })
  const refreshed = store.getSnapshot()
  assert.notEqual(refreshed.revision, initial.revision)
  assert.equal(refreshed.scopeRevision, initial.scopeRevision)
  assert.equal(refreshed.customerSession, initial.customerSession)
  assert.equal(service.getAccessToken(), 'new.token')
  store.selectOrganization('9')
  assert.notEqual(store.getSnapshot().scopeRevision, initial.scopeRevision)
  assert.equal(service.getAccessToken(), null)
  service.logout()
  assert.equal(store.getSnapshot().status, 'authenticated')
  store.logout()
}))

test('capability revalidation revokes old services immediately without changing the principal scope', async () => withSourceModules(async load => {
  const { createSessionStore } = await load('/src/app/session/sessionStore.ts')
  const { createServiceScope } = await load('/src/app/session/serviceScope.ts')
  const store = createSessionStore()
  store.establishFromVerifiedResponse(login('token'), { expectedRevision: 0, receivedAt: Date.now(), organizations: [{ id: '7', name: 'one', role: 'owner' }] })
  store.establishCustomerSession(capability, { expectedRevision: store.getSnapshot().revision, organizationId: '7' })
  const before = store.getSnapshot()
  const old = createServiceScope(store, before)
  store.retryCustomerSession()
  assert.equal(store.getSnapshot().scopeRevision, before.scopeRevision)
  assert.equal(old.getAccessToken(), null)
  store.logout()
}))

test('product invalidation reaches the public catalog cache and retains unrelated account queries', async () => withSourceModules(async load => {
  const { invalidateProductCatalog } = await load('/src/domain/products/invalidateProductCatalog.ts')
  const catalog = new QueryClient()
  const account = new QueryClient()
  catalog.setQueryData(['products', 'list', {}], ['old-stock'])
  catalog.setQueryData(['products', 'detail', 'PC1'], { stock: 1 })
  account.setQueryData(['my-account', 'profile'], { name: 'owner' })
  await invalidateProductCatalog(catalog)
  assert.equal(catalog.getQueryState(['products', 'list', {}]).isInvalidated, true)
  assert.equal(catalog.getQueryState(['products', 'detail', 'PC1']).isInvalidated, true)
  assert.equal(account.getQueryState(['my-account', 'profile']).isInvalidated, false)
  catalog.clear(); account.clear()
}))

test('manager workspace reads only RCPCs and assignments and keeps assigned rental ids', async () => {
  const calls = []
  const api = {
    list: async () => { calls.push('managers'); return [{ memberId: 2, username: 'manager', name: '담당자', status: 'active' }] },
    rcpcs: async () => { calls.push('assignable'); return [{ rentalId: 3, assetNo: 'PC3' }] },
    detail: async id => { calls.push(`detail:${id}`); return { rcpcs: [{ rentalId: 3 }] } },
  }
  const rcpcApi = { list: async () => { calls.push('rcpcs'); return { page: 0, totalPages: 1, totalElements: 1, items: [{ rentalId: 3, productNo: 'PC3', preference: {}, rentalStatus: 'active', trafficDownloadTotalBytes: null, trafficUploadTotalBytes: null }] } } }
  const result = await createManagerReader(api, rcpcApi)()
  assert.deepEqual(Object.keys(result).sort(), ['managers', 'rcpcs'])
  assert.deepEqual(result.managers[0].assignedRcpcIds, ['3'])
  assert.equal(result.rcpcs[0].assignable, true)
  assert.deepEqual(calls.sort(), ['assignable', 'detail:2', 'managers', 'rcpcs'])
})

test('point ordering uses signed numeric amounts and never mutates the response', () => {
  const rows = [900, 1000, -100, -10, 20].map(amount => ({ amount }))
  assert.deepEqual(sortRows(rows, { key: 'amount', direction: 'asc' }, row => row.amount).map(row => row.amount), [-100, -10, 20, 900, 1000])
  assert.deepEqual(sortRows(rows, { key: 'amount', direction: 'desc' }, row => row.amount).map(row => row.amount), [1000, 900, 20, -10, -100])
  assert.deepEqual(rows.map(row => row.amount), [900, 1000, -100, -10, 20])
})

test('benefit table renders formatted values in source-value order and preserves row identity', async () => withSourceModules(async load => {
  const { BenefitTable } = await load('/src/routes/mypage/BenefitTableView.tsx')
  const html = renderToStaticMarkup(createElement(BenefitTable, {
    rows: [{ id: 'big', amount: 1000 }, { id: 'small', amount: 20 }, { id: 'minus', amount: -100 }], rowKey: row => row.id,
    columns: [{ key: 'amount', label: '포인트', sortValue: row => row.amount, renderCell: row => `${row.amount.toLocaleString('ko-KR')}P` }],
    sortConfig: { key: 'amount', direction: 'asc' },
  }))
  assert.deepEqual([...html.matchAll(/data-row-id="([^"]+)"/g)].map(match => match[1]), ['minus', 'small', 'big'])
  assert.match(html, /1,000P/)
}))
