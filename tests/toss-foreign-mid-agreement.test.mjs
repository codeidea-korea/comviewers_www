import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { foreignPayloadSchema, openForeignPaymentWindow } from '../src/routes/commerce/-components/checkout/tossForeignPaymentWindow.ts'

const basePayload = () => ({
  sdkUrl: 'https://js.tosspayments.com/v2/standard',
  clientKey: 'test_gck_fixture_only', customerKey: 'fixture-customer-0001',
  merchantId: 'tcomvie6ys2', requestedPaymentMethod: 'foreign_card',
  amount: { value: 10.25, currency: 'USD' },
  originalAmount: { value: 14350, currency: 'KRW' },
  exchangeRate: 1400, rateBaseDate: '2026-10-22', variantKey: 'FOREIGN_USD',
  paymentRequest: {
    orderId: 'USD-FIXTURE-0001', orderName: 'Fixture only',
    customerEmail: null, customerName: null, customerMobilePhone: null,
    successUrl: 'https://fixture.example.test/complete',
    failUrl: 'https://fixture.example.test/complete',
  },
})

for (const [mode, merchantId] of [['test', 'tcomvie6ys2'], ['live', 'comvie6ys2']]) {
  test(`USD payload accepts only the matching ${mode} client and MID`, () => {
    const payload = { ...basePayload(), clientKey: `${mode}_gck_fixture_only`, merchantId }
    assert.equal(foreignPayloadSchema.parse(payload).merchantId, merchantId)
  })
}

const rejectedPairs = [
  ['test key with live MID', 'test_gck_fixture_only', 'comvie6ys2'],
  ['live key with test MID', 'live_gck_fixture_only', 'tcomvie6ys2'],
  ['domestic MID', 'test_gck_fixture_only', 'tcomviet835'],
  ['other overseas MID', 'test_gck_fixture_only', 'tcomvie8v5b'],
  ['individual API key', 'test_ck_fixture_only', 'tcomvie6ys2'],
  ['unrecognized client mode', 'other_gck_fixture_only', 'comvie6ys2'],
]
for (const [label, clientKey, merchantId] of rejectedPairs) {
  test(`USD payload rejects ${label}`, () => {
    assert.equal(foreignPayloadSchema.safeParse({ ...basePayload(), clientKey, merchantId }).success, false)
  })
}

test('refined USD schema keeps amount shape and union discrimination', () => {
  assert.equal(foreignPayloadSchema.shape.amount.parse(basePayload().amount).currency, 'USD')
  const schema = z.union([z.object({ requestedPaymentMethod: z.literal('card') }), foreignPayloadSchema])
  assert.equal(schema.parse(basePayload()).merchantId, 'tcomvie6ys2')
  assert.equal(schema.safeParse({ ...basePayload(), merchantId: 'comvie6ys2' }).success, false)
})

test('USD schema rejects KRW or fractional-cent amounts', () => {
  assert.equal(foreignPayloadSchema.safeParse({ ...basePayload(), amount: { value: 10.25, currency: 'KRW' } }).success, false)
  assert.equal(foreignPayloadSchema.safeParse({ ...basePayload(), amount: { value: 10.251, currency: 'USD' } }).success, false)
})

test('USD schema rejects an excessive custom agreement key', () => {
  assert.equal(foreignPayloadSchema.safeParse({ ...basePayload(), agreementVariantKey: 'A'.repeat(101) }).success, false)
})

const agreementCases = [
  ['missing', undefined, undefined],
  ['null', null, undefined],
  ['empty', '', undefined],
  ['whitespace', ' \t ', undefined],
  ['custom', 'USD_TERMS', 'USD_TERMS'],
  ['trimmed custom', ' USD_TERMS ', 'USD_TERMS'],
]
for (const [label, value, expected] of agreementCases) {
  test(`USD window ${label} agreement preserves the payment UI and never requests payment`, async () => {
    const raw = basePayload()
    if (value !== undefined) raw.agreementVariantKey = value
    const payload = foreignPayloadSchema.parse(raw)
    const calls = { amounts: [], renders: [], requested: 0, destroyed: 0 }
    const cancellation = new Error('fixture cancelled without a payment action')
    const control = {
      on(event, callback) {
        // No paymentRequest event is ever emitted. Cancel only after registration completes.
        if (event === 'cancel') queueMicrotask(callback)
      },
      destroy() { calls.destroyed++ },
    }
    const client = {
      widgets(options) {
        assert.deepEqual(options, { customerKey: payload.customerKey })
        return {
          async setAmount(amount) { calls.amounts.push(amount) },
          async renderPaymentWindow(options) { calls.renders.push(options); return control },
          async requestPayment() { calls.requested++; throw new Error('Payment request is forbidden in this test') },
        }
      },
    }
    await assert.rejects(openForeignPaymentWindow(client, payload, new AbortController().signal, () => cancellation), error => error === cancellation)
    assert.deepEqual(calls.amounts, [payload.amount])
    assert.equal(calls.renders.length, 1)
    assert.equal(calls.renders[0].orderName, payload.paymentRequest.orderName)
    assert.equal(calls.renders[0].variantKey.paymentMethod, 'FOREIGN_USD')
    if (expected === undefined) assert.equal(Object.hasOwn(calls.renders[0].variantKey, 'agreement'), false)
    else assert.equal(calls.renders[0].variantKey.agreement, expected)
    assert.equal(calls.requested, 0)
    assert.equal(calls.destroyed, 1)
  })
}

function visibilityFixture(initialVisibility) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const documentEvents = new EventTarget()
  const documentListeners = new Set()
  const signalListeners = new Set()
  const controller = new AbortController()
  const add = controller.signal.addEventListener.bind(controller.signal)
  const remove = controller.signal.removeEventListener.bind(controller.signal)
  controller.signal.addEventListener = (name, listener, options) => {
    if (name === 'abort') signalListeners.add(listener)
    add(name, listener, options)
  }
  controller.signal.removeEventListener = (name, listener, options) => {
    if (name === 'abort') signalListeners.delete(listener)
    remove(name, listener, options)
  }
  const document = {
    visibilityState: initialVisibility,
    addEventListener(name, listener, options) {
      if (name === 'visibilitychange') documentListeners.add(listener)
      documentEvents.addEventListener(name, listener, options)
    },
    removeEventListener(name, listener, options) {
      if (name === 'visibilitychange') documentListeners.delete(listener)
      documentEvents.removeEventListener(name, listener, options)
    },
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document })
  const calls = { widgets: 0, amounts: 0, renders: 0, requests: 0, destroyed: 0 }
  const cancellation = new Error('fixture window closed without a payment action')
  const client = {
    widgets() {
      calls.widgets++
      return {
        async setAmount() { calls.amounts++; client.onAmount?.() },
        async renderPaymentWindow() {
          calls.renders++
          return {
            on(name, callback) { if (name === 'cancel') queueMicrotask(callback) },
            destroy() { calls.destroyed++ },
          }
        },
        async requestPayment() { calls.requests++; throw new Error('Payment requests are forbidden') },
      }
    },
  }
  return {
    controller, client, calls, cancellation, documentListeners, signalListeners,
    change(value) {
      document.visibilityState = value
      documentEvents.dispatchEvent(new Event('visibilitychange'))
    },
    open() {
      const result = openForeignPaymentWindow(client, foreignPayloadSchema.parse(basePayload()), controller.signal, () => cancellation)
      void result.catch(() => { /* The test asserts the rejection after its controlled event. */ })
      return result
    },
    restore() {
      if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
      else delete globalThis.document
    },
  }
}

async function drainMicrotasks() {
  for (let index = 0; index < 8; index++) await Promise.resolve()
}

test('USD visibility guard waits before initializing the SDK in a hidden document', async () => {
  const fixture = visibilityFixture('hidden')
  try {
    const result = fixture.open()
    await drainMicrotasks()
    assert.equal(fixture.calls.widgets, 0)
    assert.equal(fixture.documentListeners.size, 1)
    fixture.change('hidden')
    await drainMicrotasks()
    assert.equal(fixture.calls.widgets, 0)
    fixture.change('visible')
    await assert.rejects(result, error => error === fixture.cancellation)
    assert.deepEqual(fixture.calls, { widgets: 1, amounts: 1, renders: 1, requests: 0, destroyed: 1 })
    assert.equal(fixture.documentListeners.size, 0)
    assert.equal(fixture.signalListeners.size, 0)
  } finally { fixture.restore() }
})

test('USD visibility guard rechecks visibility after the asynchronous amount update', async () => {
  const fixture = visibilityFixture('visible')
  fixture.client.onAmount = () => fixture.change('hidden')
  try {
    const result = fixture.open()
    await drainMicrotasks()
    assert.equal(fixture.calls.amounts, 1)
    assert.equal(fixture.calls.renders, 0)
    fixture.change('visible')
    await assert.rejects(result, error => error === fixture.cancellation)
    assert.equal(fixture.calls.renders, 1)
    assert.equal(fixture.calls.requests, 0)
    assert.equal(fixture.documentListeners.size, 0)
    assert.equal(fixture.signalListeners.size, 0)
  } finally { fixture.restore() }
})

for (const stage of ['initial', 'after amount']) {
  test(`USD visibility guard aborts ${stage} hidden wait and removes all listeners`, async () => {
    const fixture = visibilityFixture(stage === 'initial' ? 'hidden' : 'visible')
    if (stage === 'after amount') fixture.client.onAmount = () => fixture.change('hidden')
    try {
      const result = fixture.open()
      await drainMicrotasks()
      const aborted = new DOMException('fixture aborted', 'AbortError')
      fixture.controller.abort(aborted)
      await assert.rejects(result, error => error === aborted)
      fixture.change('visible')
      await drainMicrotasks()
      assert.equal(fixture.calls.renders, 0)
      assert.equal(fixture.calls.requests, 0)
      assert.equal(fixture.documentListeners.size, 0)
      assert.equal(fixture.signalListeners.size, 0)
    } finally { fixture.restore() }
  })
}

test('USD visibility guard leaves an already visible document unchanged', async () => {
  const fixture = visibilityFixture('visible')
  try {
    await assert.rejects(fixture.open(), error => error === fixture.cancellation)
    assert.deepEqual(fixture.calls, { widgets: 1, amounts: 1, renders: 1, requests: 0, destroyed: 1 })
    assert.equal(fixture.documentListeners.size, 0)
    assert.equal(fixture.signalListeners.size, 0)
  } finally { fixture.restore() }
})

test('USD visibility guard rejects an already aborted attempt before SDK initialization', async () => {
  const fixture = visibilityFixture('visible')
  try {
    const aborted = new DOMException('fixture aborted before initialization', 'AbortError')
    fixture.controller.abort(aborted)
    await assert.rejects(fixture.open(), error => error === aborted)
    assert.equal(fixture.calls.widgets, 0)
    assert.equal(fixture.documentListeners.size, 0)
    assert.equal(fixture.signalListeners.size, 0)
  } finally { fixture.restore() }
})

test('USD visibility guard preserves an abort between visibility change and SDK initialization', async () => {
  const fixture = visibilityFixture('hidden')
  try {
    const result = fixture.open()
    fixture.change('visible')
    const aborted = new DOMException('fixture aborted as document became visible', 'AbortError')
    fixture.controller.abort(aborted)
    await assert.rejects(result, error => error === aborted)
    assert.equal(fixture.calls.widgets, 0)
    assert.equal(fixture.documentListeners.size, 0)
    assert.equal(fixture.signalListeners.size, 0)
  } finally { fixture.restore() }
})
