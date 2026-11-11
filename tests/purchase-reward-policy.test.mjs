import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { withSourceModules } from './helpers/withSourceModules.mjs'

const item = {
  orderItemId: 11, productNo: '132001', title: '정책 검증 PC', serverRoomName: null,
  categoryCode: 'rcpc', categoryName: 'RCPC', pcAssetId: 31, quantity: 1, billingUnit: 'month',
  durationUnits: 1, unitPrice: 50_000, setupFee: 0, amount: 50_000, itemStatus: 'active',
  serviceStartedAt: '2000-01-01T00:00:00', serviceEndsAt: '2099-12-31T00:00:00', rentalId: 21,
  rentalStatus: 'active', purchaseConfirmedAt: null, automaticConfirmationAt: '2099-12-20T00:00:00',
  specSummary: null, imageUrl: null, couponDiscountAmount: 0, pointUsedAmount: 0,
  refundPending: false, reviewId: null, expectedPoints: 500, accruedPoints: null,
  customerRentalStatus: 'active', instantAvailable: true,
}

test('order response retains payment reward policy and nullable legacy policy without changing amounts', async () => withSourceModules(async load => {
  const { accountOrderItemSchema } = await load('/src/api/myAccountOrders.ts')
  const paid = accountOrderItemSchema.parse({ ...item, commercePolicyVersion: 'payment_reward_v1', accruedPoints: 500 })
  assert.equal(paid.commercePolicyVersion, 'payment_reward_v1')
  assert.equal(paid.accruedPoints, 500)
  assert.equal(paid.purchaseConfirmedAt, null)
  for (const policy of [null, undefined]) {
    const legacy = accountOrderItemSchema.parse({ ...item, commercePolicyVersion: policy })
    assert.equal(legacy.commercePolicyVersion, policy)
    assert.equal(legacy.accruedPoints, null)
    assert.equal(legacy.expectedPoints, 500)
  }
}))

test('point refund quotes preserve 5/7-day component windows and server-only restrictions including legacy nulls', async () => withSourceModules(async load => {
  const { createOperationRequestsApi } = await load('/src/api/operationRequests.ts')
  const quoteItem = { operationRequestTargetId: 1, orderItemId: 11, orderNo: 'TEST-ORDER', productNo: '132001', title: '검증', rentalId: 21,
    policyVersionId: 1, cashAmount: 0, pointAmount: 30_000, couponDeduction: 0, usedDays: 4, remainingDays: 26,
    bankRequired: false, refundMethod: 'point', dailyQuantity: 1, usedDaysRateBasisPoints: 0, dailyQuantityRateBasisPoints: 0,
    remainingSettlement: 30_500, usedDaysDeduction: 0, dailyQuantityDeduction: 0, setupFee: 0, formatFee: 0,
    promotionalPointDeduction: 0, purchaseConfirmationPointReversal: 500 }
  let response
  const api = createOperationRequestsApi({ request: async (path, schema) => {
    assert.equal(path, '/api/v1/my/refunds/direct-application-quote')
    return schema.parse(response)
  } }, '1')
  for (const days of [[5], [7], [5, 7], null, undefined]) {
    response = { items: [{ ...quoteItem, originalPaymentRefundDays: days, originalRefundUnavailableReason: '구매확정 후에는 포인트 환불만 선택할 수 있습니다.' }],
      cashTotal: 0, pointTotal: 30_000, bankRequired: false, fingerprint: 'a'.repeat(64), quotedAt: '2026-11-10T12:00:00', policyExplanation: '검증' }
    const result = await api.refundDirectApplicationQuote({ method: 'point', selections: [{ orderItemId: 11, rentalId: 21 }] })
    assert.deepEqual(result.items[0].originalPaymentRefundDays, days)
    assert.equal(result.items[0].originalRefundUnavailableReason, response.items[0].originalRefundUnavailableReason)
    assert.equal(result.items[0].purchaseConfirmationPointReversal, 500)
  }
}))

test('purchase confirmation stays available while paid rewards replace the earn-points prompt only for new orders', async () => withSourceModules(async load => {
  const { accountOrderItemSchema } = await load('/src/api/myAccountOrders.ts')
  const { OrderItemActions } = await load('/src/routes/mypage/-components/orders/OrderItemActions.tsx')
  const { SessionProvider } = await load('/src/app/session/SessionProvider.tsx')
  const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
  const client = new QueryClient()
  const snapshot = { status: 'authenticated', customerSession: { memberRole: 'owner' } }
  const store = { getSnapshot: () => snapshot, subscribe: () => () => {} }
  const render = (policy, accruedPoints, variant = 'purchase-summary') => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(QueryClientProvider, { client }, createElement(SessionProvider, { store }, createElement(ServiceProvider, { services: { myAccount: {} } },
      createElement(OrderItemActions, { api: {}, item: accountOrderItemSchema.parse({ ...item, commercePolicyVersion: policy, accruedPoints }), orderStatus: 'paid', paymentStatus: 'approved', variant }))))))
  try {
    const legacy = render(null, null)
    const current = render('payment_reward_v1', 500)
    assert.match(legacy, /포인트 500P 받기/)
    assert.match(current, /포인트 500P 지급 완료/)
    assert.match(current, /구매확정/)
    assert.doesNotMatch(current, /포인트 받기|500P 받기/)
    assert.match(render('payment_reward_v1', 0), /포인트 0P 지급 완료/)
    assert.match(render(null, null, 'dashboard'), /포인트 받기/)
    assert.doesNotMatch(render('payment_reward_v1', 500, 'dashboard'), /포인트 받기/)
  } finally { client.clear() }
}))

test('payment benefit refresh invalidates usable balances and checkout quotes while preserving unrelated account data', async () => withSourceModules(async load => {
  const { invalidatePaymentBenefits } = await load('/src/lib/useRefreshBenefitsAfterPayment.ts')
  const client = new QueryClient()
  const targets = [['my-account', 'read', 'benefits'], ['my-account', 'read', 'points', 0], ['checkout', 'benefits', [11]], ['checkout', 'extension', [21]]]
  for (const key of targets) client.setQueryData(key, { old: true })
  const unrelated = ['my-account', 'read', 'profile']
  client.setQueryData(unrelated, { name: '검증' })
  try {
    await invalidatePaymentBenefits(client)
    for (const key of targets) assert.equal(client.getQueryState(key).isInvalidated, true)
    assert.equal(client.getQueryState(unrelated).isInvalidated, false)
  } finally { client.clear() }
}))

test('new refund selection period and paid reward copy retain values across customer languages', async () => withSourceModules(async load => {
  const { setTranslationLocale } = await load('/src/i18n/translation-core.ts')
  const { translateUiText } = await load('/src/i18n/uiTranslation.ts')
  const previousWindow = globalThis.window
  globalThis.window = { sessionStorage: { setItem() {} } }
  try {
    setTranslationLocale('en')
    assert.equal(translateUiText('결제 완료 후 {days}일 이내, 구매확정 전에 선택할 수 있습니다.', { days: 5 }), 'Available within 5 days after payment completion and before purchase confirmation.')
    assert.equal(translateUiText('포인트 {points}P 지급 완료', { points: '500' }), '500P awarded')
    assert.match(translateUiText('결제 완료 후 5일이 지나 포인트 환불만 선택할 수 있습니다.'), /More than 5 days/)
  } finally {
    setTranslationLocale('ko')
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
  }
}))
