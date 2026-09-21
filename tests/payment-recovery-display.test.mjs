import assert from 'node:assert/strict'
import { test } from 'node:test'
import { orderPaymentDisplay } from '../src/lib/orderPaymentDisplay.ts'
import { confirmAttemptKey } from '../src/routes/commerce/-components/checkout/confirmAttemptKey.ts'

const now = Date.parse('2026-09-19T12:00:00+09:00')
const issued = {
  orderStatus: 'payment_pending', paymentStatus: 'pending', paymentMethod: 'virtual_account',
  paymentRecordStatus: 'pending', virtualAccountStatus: 'issued',
  virtualAccountDepositDueAt: '2026-09-19T12:30:00', paymentTerminationReason: null,
}

test('only issued, pending and unexpired virtual accounts allow deposit instructions', () => {
  assert.deepEqual(orderPaymentDisplay(issued, now), { label: '입금대기', waitingForDeposit: true })
  for (const state of [null, 'cancelled', 'expired', 'paid']) {
    assert.equal(orderPaymentDisplay({ ...issued, virtualAccountStatus: state }, now).waitingForDeposit, false)
  }
  assert.equal(orderPaymentDisplay({ ...issued, paymentMethod: 'card' }, now).waitingForDeposit, false)
})

test('same open page changes to deadline-passed at the exact KST boundary', () => {
  for (const deadline of ['2026-09-19T12:30:00', '2026-09-19T12:30:00+09:00', '2026-09-19T03:30:00Z']) {
    const state = { ...issued, virtualAccountDepositDueAt: deadline }
    assert.equal(orderPaymentDisplay(state, now + 30 * 60000 - 1).waitingForDeposit, true)
    assert.deepEqual(orderPaymentDisplay(state, now + 30 * 60000), {
      label: '입금기한 경과 · 결과 확인 중', waitingForDeposit: false,
    })
  }
})

test('terminal states override stale pending responses and never solicit another deposit', () => {
  for (const [status, label] of [
    ['cancelled', '취소완료'], ['failed', '결제실패'], ['expired', '결제기한 만료'],
    ['refunded', '환불완료'], ['partially_refunded', '부분환불'], ['approved', '결제완료'],
  ]) {
    assert.deepEqual(orderPaymentDisplay({ ...issued, paymentRecordStatus: status }, now, 'pending'), {
      label, waitingForDeposit: false,
    })
  }
  assert.equal(orderPaymentDisplay({ ...issued, virtualAccountDepositDueAt: null }, now).waitingForDeposit, false)
})

test('confirmation key survives repeated calls and module reload without storing payment credentials', async () => {
  const storage = new Map()
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value),
  } })
  const orderId = 'CVPAY-TEST-RELOAD-001'
  const first = confirmAttemptKey(orderId)
  assert.equal(confirmAttemptKey(orderId), first)
  const reloaded = await import('../src/routes/commerce/-components/checkout/confirmAttemptKey.ts?reload=1')
  assert.equal(reloaded.confirmAttemptKey(orderId), first)
  assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i)
  assert.deepEqual([...storage.keys()], [`comviewers:toss-confirm:${orderId}`])
  storage.set(`comviewers:toss-confirm:${orderId}`, '-'.repeat(36))
  assert.notEqual(confirmAttemptKey(orderId), '-'.repeat(36))
  delete globalThis.sessionStorage
})

test('blocked session storage still reuses the in-memory key', () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('blocked') } })
  const key = confirmAttemptKey('CVPAY-TEST-STORAGE-BLOCKED')
  assert.equal(confirmAttemptKey('CVPAY-TEST-STORAGE-BLOCKED'), key)
  delete globalThis.sessionStorage
})
