import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { checkoutPaymentInput, resolveCheckoutGlobalCardPayment, verifyCheckoutPaymentMode } from '../src/domain/checkout/checkoutDraft.ts'
import { withSourceModules } from './helpers/withSourceModules.mjs'

const draft = (payment = 'global-card', finalAmount = 1000) => ({
  contact: { name: 'Fixture', email: 'fixture@example.test', phone: '', messengerType: '', messengerId: '' },
  finalAmount, payment, receiptType: 'not_requested', receiptIdentifier: '', orderAgreed: true, paymentServiceAgreed: true,
})

test('global-card OFF keeps the existing card/KRW preparation', () => {
  assert.equal(checkoutPaymentInput(draft(), false).payment, 'card')
})

test('global-card ON requests the foreign-card/USD preparation', () => {
  assert.equal(checkoutPaymentInput(draft(), true).payment, 'foreign_card')
})

test('a frozen KRW attempt stays KRW if the server flag later turns ON', () => {
  assert.equal(checkoutPaymentInput(draft(), true, 'card').payment, 'card')
})

test('a frozen USD attempt stays USD if the server flag later turns OFF', () => {
  assert.equal(checkoutPaymentInput(draft(), false, 'foreign_card').payment, 'foreign_card')
})

test('direct domestic methods and zero-amount settlement never become USD', () => {
  for (const enabled of [false, true]) {
    assert.equal(checkoutPaymentInput(draft('card'), enabled).payment, 'card')
    assert.equal(checkoutPaymentInput(draft('virtual-account'), enabled).payment, 'virtual_account')
    assert.equal(checkoutPaymentInput(draft('payco'), enabled).payment, 'payco')
    assert.equal(checkoutPaymentInput(draft('global-card', 0), enabled).payment, null)
  }
})

test('availability accepts the server flag and defaults only successful legacy responses to OFF', async () => withSourceModules(async load => {
  const { createOrdersPaymentsApi } = await load('/src/api/ordersPayments.ts')
  for (const [extra, expected] of [[{}, false], [{ foreignUsdEnabled: false }, false], [{ foreignUsdEnabled: true }, true]]) {
    const client = { request: async (url, schema) => {
      assert.equal(url, '/api/v1/payments/direct-easy-pay-methods')
      return schema.parse({ naverPay: false, kakaoPay: false, ...extra })
    } }
    assert.equal((await createOrdersPaymentsApi(client, '1').directEasyPayMethods()).foreignUsdEnabled, expected)
  }
}))

test('a capability HTTP or malformed response is never silently turned into OFF', async () => withSourceModules(async load => {
  const { createOrdersPaymentsApi } = await load('/src/api/ordersPayments.ts')
  const failure = new Error('fixture capability lookup failed')
  await assert.rejects(createOrdersPaymentsApi({ request: async () => { throw failure } }, '1').directEasyPayMethods(), error => error === failure)
  await assert.rejects(createOrdersPaymentsApi({ request: async (url, schema) => schema.parse({ naverPay: false, kakaoPay: false, foreignUsdEnabled: 'false' }) }, '1').directEasyPayMethods())
}))

test('frozen route resolution never rechecks the changing server flag', async () => {
  let calls = 0
  const unavailable = async () => { calls++; throw new Error('unavailable') }
  assert.equal(await resolveCheckoutGlobalCardPayment('card', unavailable), 'card')
  assert.equal(await resolveCheckoutGlobalCardPayment('foreign_card', unavailable), 'foreign_card')
  assert.equal(calls, 0)
  await assert.rejects(resolveCheckoutGlobalCardPayment(undefined, unavailable))
  assert.equal(calls, 1)
})

test('new KRW checkout skips every USD quote verification, while USD errors cannot fall back', async () => {
  let fx = 0
  const request = { amountKrw: 1000, globalCardSelected: true, retrying: false }
  const verify = async () => { fx++; throw new Error('fixture exchange outage') }
  assert.equal(await verifyCheckoutPaymentMode(request, async () => 'card', verify), 'card')
  assert.equal(fx, 0)
  await assert.rejects(verifyCheckoutPaymentMode(request, async () => 'foreign_card', verify), /exchange outage/)
  assert.equal(fx, 1)
})

test('lookup failure stops creation before any USD quote validation', async () => {
  let fx = 0
  await assert.rejects(verifyCheckoutPaymentMode({ amountKrw: 1000, globalCardSelected: true, retrying: false },
    async () => { throw new Error('capability unavailable') }, async () => { fx++ }), /capability unavailable/)
  assert.equal(fx, 0)
})

test('all ordinary KRW methods stay available without a successful USD capability lookup', async () => {
  let capabilities = 0
  let fx = 0
  const unavailable = async () => { capabilities++; throw new Error('capability unavailable') }
  for (const method of ['card', 'virtual-account', 'payco', 'naver-pay', 'kakao-pay']) {
    const mode = await verifyCheckoutPaymentMode({ amountKrw: 1000, globalCardSelected: false, retrying: false },
      unavailable, async () => { fx++ })
    assert.equal(mode, 'card')
    assert.equal(checkoutPaymentInput(draft(method), false, mode).payment,
      { card: 'card', 'virtual-account': 'virtual_account', payco: 'payco', 'naver-pay': 'naver_pay', 'kakao-pay': 'kakao_pay' }[method])
    // A later last-logo retry of this same KRW order must keep the frozen route.
    assert.equal(await verifyCheckoutPaymentMode({ amountKrw: 1000, globalCardSelected: true, retrying: true,
      frozenGlobalCardPayment: mode }, unavailable, async () => { fx++ }), 'card')
  }
  assert.equal(capabilities, 0)
  assert.equal(fx, 0)
})

test('the actual modes hook exposes no lookup error or pending UI lock for ordinary KRW selection', async () => withSourceModules(async load => {
  const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
  const { useCheckoutPaymentModes } = await load('/src/routes/commerce/-components/checkout/hooks/useCheckoutPaymentModes.ts')
  for (const failing of [false, true]) {
    const client = new QueryClient()
    if (failing) client.getQueryCache().build(client, { queryKey: ['checkout', 'direct-easy-pay-methods'] })
      .setState({ status: 'error', error: new Error('fixture unavailable') })
    function Probe() {
      const modes = useCheckoutPaymentModes(undefined, false, false)
      assert.equal(modes.pending, false)
      assert.equal(modes.error, null)
      return null
    }
    try {
      renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ServiceProvider,
        { services: { checkout: { directEasyPayMethods: async () => { throw new Error('no I/O in SSR') } } } }, createElement(Probe))))
    } finally { client.clear() }
  }
}))

for (const [shown, fresh] of [['foreign_card', 'card'], ['card', 'foreign_card']]) {
  test(`a submit stops when the displayed ${shown} route changes to ${fresh}, then permits an explicit retry`, async () => withSourceModules(async load => {
    const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
    const { useCheckoutPaymentModes } = await load('/src/routes/commerce/-components/checkout/hooks/useCheckoutPaymentModes.ts')
    const client = new QueryClient()
    const queryKey = ['checkout', 'direct-easy-pay-methods']
    client.setQueryData(queryKey, { naverPay: false, kakaoPay: false, foreignUsdEnabled: shown === 'foreign_card' })
    let current
    let capabilities = 0
    let fx = 0
    function Probe() { current = useCheckoutPaymentModes(undefined, false); return null }
    const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ServiceProvider,
      { services: { checkout: { directEasyPayMethods: async () => {
        capabilities++
        return { naverPay: false, kakaoPay: false, foreignUsdEnabled: fresh === 'foreign_card' }
      } } } }, createElement(Probe))))
    const request = { amountKrw: 1000, globalCardSelected: true, retrying: false }
    const verifyQuote = async () => { fx++ }
    try {
      render()
      assert.equal(current.globalCardPayment, shown)
      await assert.rejects(verifyCheckoutPaymentMode(request, current.verify, verifyQuote), /결제수단 정보를 확인하지 못했습니다/)
      assert.equal(client.getQueryData(queryKey).foreignUsdEnabled, fresh === 'foreign_card')
      assert.equal(fx, 0)
      render() // The next click sees the updated displayed currency.
      assert.equal(current.globalCardPayment, fresh)
      assert.equal(await verifyCheckoutPaymentMode(request, current.verify, verifyQuote), fresh)
      assert.equal(fx, fresh === 'foreign_card' ? 1 : 0)
      assert.equal(capabilities, 2)
    } finally { client.clear() }
  }))
}

test('the first unknown mode may resolve, while a frozen mode never rechecks capability', async () => withSourceModules(async load => {
  const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
  const { useCheckoutPaymentModes } = await load('/src/routes/commerce/-components/checkout/hooks/useCheckoutPaymentModes.ts')
  const client = new QueryClient()
  let current
  let capabilities = 0
  let frozen
  function Probe() { current = useCheckoutPaymentModes(frozen, false); return null }
  const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ServiceProvider,
    { services: { checkout: { directEasyPayMethods: async () => {
      capabilities++
      return { naverPay: false, kakaoPay: false, foreignUsdEnabled: true }
    } } } }, createElement(Probe))))
  try {
    render()
    assert.equal(current.globalCardPayment, undefined)
    assert.equal(await current.verify(), 'foreign_card')
    for (const mode of ['card', 'foreign_card']) {
      frozen = mode
      render()
      assert.equal(await current.verify(), mode)
    }
    assert.equal(capabilities, 1)
  } finally { client.clear() }
}))

test('existing prepared KRW and USD payments ignore both flag changes and fresh FX availability', async () => {
  let capabilities = 0
  let fx = 0
  const load = async () => { capabilities++; throw new Error('must not read changed flag') }
  const verify = async () => { fx++; throw new Error('must not replace frozen FX') }
  for (const mode of ['card', 'foreign_card']) {
    assert.equal(await verifyCheckoutPaymentMode({ amountKrw: 1000, globalCardSelected: true, retrying: false,
      frozenGlobalCardPayment: mode, frozenPaymentMethod: mode, paymentPrepared: true }, load, verify), mode)
  }
  assert.equal(capabilities, 0)
  assert.equal(fx, 0)
})

test('a new payment attempt on the same order uses its original currency route', async () => {
  let capabilities = 0
  let fx = 0
  const load = async () => { capabilities++; return 'card' }
  const verify = async amount => { assert.equal(amount, 1000); fx++ }
  const retry = { amountKrw: 1000, globalCardSelected: true, retrying: true, paymentPrepared: true }
  assert.equal(await verifyCheckoutPaymentMode({ ...retry, frozenGlobalCardPayment: 'foreign_card', frozenPaymentMethod: 'foreign_card' }, load, verify), 'foreign_card')
  assert.equal(fx, 1)
  assert.equal(await verifyCheckoutPaymentMode({ ...retry, frozenGlobalCardPayment: 'card', frozenPaymentMethod: 'card' }, load, verify), 'card')
  assert.equal(fx, 1)
  assert.equal(capabilities, 0)
})

test('zero-payment and an aborted preparation never reach external quote verification', async () => {
  let capabilities = 0
  let fx = 0
  const load = async () => { capabilities++; return 'foreign_card' }
  const verify = async () => { fx++ }
  assert.equal(await verifyCheckoutPaymentMode({ amountKrw: 0, globalCardSelected: true, retrying: false }, load, verify), 'card')
  const abort = new AbortController()
  abort.abort(new Error('fixture page closed'))
  await assert.rejects(verifyCheckoutPaymentMode({ amountKrw: 1000, globalCardSelected: true, retrying: false }, load, verify, abort.signal), /page closed/)
  assert.equal(capabilities, 1)
  assert.equal(fx, 0)
})

test('the actual quote hook disables USD fetching for OFF and restored KRW orders', async () => withSourceModules(async load => {
  const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
  const { useCheckoutPaymentModes } = await load('/src/routes/commerce/-components/checkout/hooks/useCheckoutPaymentModes.ts')
  const { useForeignPaymentQuote } = await load('/src/routes/commerce/-components/checkout/hooks/useForeignPaymentQuote.ts')
  for (const [enabled, frozen, recovering, expected] of [[false, undefined, false, false], [true, 'card', false, false],
    [true, undefined, false, true], [false, 'foreign_card', false, true], [true, 'foreign_card', true, false]]) {
    const client = new QueryClient()
    client.setQueryData(['checkout', 'direct-easy-pay-methods'], { naverPay: false, kakaoPay: false, foreignUsdEnabled: enabled })
    let quoteCalls = 0
    let selected
    function Probe() {
      const modes = useCheckoutPaymentModes(frozen, recovering)
      selected = !recovering && modes.globalCardPayment === 'foreign_card'
      const quote = useForeignPaymentQuote(selected, 1000)
      assert.equal(quote.quote, undefined)
      return null
    }
    try {
      renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ServiceProvider,
        { services: { checkout: { directEasyPayMethods: async () => ({ naverPay: false, kakaoPay: false, foreignUsdEnabled: enabled }),
          foreignQuote: async () => { quoteCalls++; throw new Error('no network allowed') } } } }, createElement(Probe))))
      assert.equal(selected, expected)
      assert.equal(client.getQueryCache().find({ queryKey: ['checkout', 'foreign-quote', 1000], exact: true }).options.enabled, expected)
      assert.equal(quoteCalls, 0) // SSR never performs the enabled ON request; its actual option is checked above.
    } finally { client.clear() }
  }
}))

const benefits = { subtotalAmount: 1000, setupFeeAmount: 0, couponDiscountAmount: 0, pointUsedAmount: 0,
  finalAmount: 1000, availablePoints: 0, userCouponId: null, coupons: [] }
const quote = { source: 'api', checkoutEligible: true, issues: [], benefits: 'available',
  items: [{ id: '1', type: 'part', rowKind: 'normal', label: 'Fixture', productId: 'FIXTURE', location: '',
    image: null, spec: null, available: true, setupFee: 0, rentalFee: 1000, quantity: 1, maximumQuantity: null }],
  estimate: { rentalSetupTotal: 0, rentalMonthlyTotal: 0, rentalTotal: 0, partTotal: 1000, expectedTotal: 1000, pointTotal: 0 } }
const fxQuote = { available: true, krwAmount: 1000, usdAmount: 0.75, exchangeRate: 1333, rateBaseDate: '2026-10-23' }

test('the same summary hides all USD text when OFF while preserving every existing card logo', async () => withSourceModules(async load => {
  const { CheckoutSummary } = await load('/src/routes/commerce/-components/checkout/CheckoutSummary.tsx')
  const form = { finalAmount: 1000, payment: 'global-card', orderAgreed: true, paymentServiceAgreed: true,
    fieldError: () => undefined, setPayment() {}, setOrderAgreed() {}, setPaymentServiceAgreed() {} }
  const render = foreignUsdSelected => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(CheckoutSummary, { quote, benefits, form, foreignUsdSelected, foreignQuote: fxQuote,
      refreshing: false, locked: false, submitting: false, onSubmit() {} })))
  const off = render(false)
  const on = render(true)
  assert.doesNotMatch(off, /USD/)
  assert.match(on, /USD 0\.75/)
  for (const logo of ['Mastercard', 'Visa', 'WeChat Pay', 'JCB']) {
    assert.ok(off.includes(`alt="${logo}"`))
    assert.ok(on.includes(`alt="${logo}"`))
  }
  assert.equal((off.match(/name="payment"/g) ?? []).length, (on.match(/name="payment"/g) ?? []).length)
}))

test('cart, extension and mixed recovery snapshots preserve the frozen global-card lane', async () => withSourceModules(async load => {
  const { saveCheckoutRecovery, readCheckoutRecovery, bindCheckoutRecoveryOrder } = await load('/src/domain/checkout/checkoutRecovery.ts')
  const oldStorage = globalThis.sessionStorage
  const oldTimer = globalThis.setTimeout
  const storage = new Map()
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  globalThis.setTimeout = () => 0
  const extension = { items: [], purchaseItems: [], totalAmount: 1000, eligible: true, quoteHash: 'a'.repeat(64),
    benefits, extensionAmount: 1000, purchaseSubtotalAmount: 0, purchaseSetupFeeAmount: 0 }
  try {
    for (const mode of ['card', 'foreign_card']) {
      for (const [label, source, display] of [['cart', 'cart', { source: 'cart', quote, benefits }],
        ['extension', 'extension', { source: 'extension', quote: extension }],
        ['mixed', 'extension', { source: 'extension', quote: { ...extension, extensionAmount: 500, purchaseSubtotalAmount: 500 } }]]) {
        const key = `fixture:${label}:${mode}`
        const request = { creationKey: '00000000-0000-4000-8000-000000000001', source, originalRequest: { contact: draft().contact } }
        saveCheckoutRecovery(key, request, '/cart', { ...display, payment: 'global-card', globalCardPayment: mode })
        bindCheckoutRecoveryOrder(key, 'FIXTURE-ORDER')
        const restored = readCheckoutRecovery(key)
        assert.equal(restored.display.payment, 'global-card')
        assert.equal(restored.display.globalCardPayment, mode)
        assert.equal(restored.orderNo, 'FIXTURE-ORDER')
        assert.doesNotMatch(storage.get(key), /clientKey|secretKey|paymentKey/)
      }
    }
    saveCheckoutRecovery('fixture:legacy', { creationKey: '00000000-0000-4000-8000-000000000001', source: 'cart', originalRequest: {} }, '/cart',
      { source: 'cart', quote, benefits, payment: 'global-card' })
    assert.equal(readCheckoutRecovery('fixture:legacy').display.globalCardPayment, undefined)
  } finally {
    globalThis.setTimeout = oldTimer
    if (oldStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = oldStorage
  }
}))

test('a prepared KRW global-card payment constructs only the existing domestic SDK, even after USD is enabled', async () => withSourceModules(async load => {
  const { openTossPaymentWindow } = await load('/src/routes/commerce/-components/checkout/tossPaymentWindow.ts')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const calls = { widgets: 0, payment: 0, requested: [] }
  globalThis.window = { location: { origin: 'https://fixture.example.test' }, scrollX: 0, scrollY: 0, scrollTo() {},
    TossPayments: key => {
      assert.equal(key, 'test_ck_fixture_only')
      return { widgets() { calls.widgets++; throw new Error('USD widgets forbidden for frozen KRW') },
        payment() { calls.payment++; return { async requestPayment(request) { calls.requested.push(request) }, async destroy() {} } } }
    } }
  globalThis.document = { createElement: () => ({ remove() {} }), head: { append() {} } }
  const payload = { sdkUrl: 'https://js.tosspayments.com/v2/standard', clientKey: 'test_ck_fixture_only', customerKey: 'fixture-customer',
    requestedPaymentMethod: 'card', amount: { value: 1000, currency: 'KRW' }, virtualAccountDueDate: null, cashReceiptType: 'not_requested',
    paymentRequest: { orderId: 'FIXTURE-ORDER', orderName: 'Fixture', customerName: null, customerEmail: null, customerMobilePhone: null,
      successUrl: 'https://fixture.example.test/checkout/complete', failUrl: 'https://fixture.example.test/checkout/complete' } }
  const prepared = { provider: 'toss_payments', providerPreparationStatus: 'ready', paymentMethod: 'card', amount: 1000, currency: 'KRW',
    providerOrderId: payload.paymentRequest.orderId, checkoutAction: { type: 'sdk', operation: 'payment.requestPayment', sdkUrl: payload.sdkUrl, clientPayload: JSON.stringify(payload) } }
  try {
    await openTossPaymentWindow(prepared, new AbortController().signal)
    assert.equal(calls.payment, 1)
    assert.equal(calls.widgets, 0)
    assert.equal(calls.requested.length, 1)
    assert.deepEqual(calls.requested[0].amount, { value: 1000, currency: 'KRW' })
    assert.equal(calls.requested[0].method, 'CARD')
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument
  }
}))
