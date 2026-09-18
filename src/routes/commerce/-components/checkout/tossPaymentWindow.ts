import { z } from 'zod'
import type { PreparedPayment } from '@/api/ordersPayments'

const sdkUrl = 'https://js.tosspayments.com/v2/standard'
const payloadSchema = z.object({
  sdkUrl: z.literal(sdkUrl), clientKey: z.string().min(1), customerKey: z.string().min(1),
  virtualAccountDueDate: z.string().nullable(),
  cashReceiptType: z.enum(['not_requested', 'income_deduction', 'business_expense']),
  requestedPaymentMethod: z.enum(['card', 'virtual_account', 'payco']),
  amount: z.object({ value: z.number().int().positive().safe(), currency: z.literal('KRW') }),
  paymentRequest: z.object({ orderId: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/), orderName: z.string().min(1).max(100),
    customerEmail: z.string().nullable(), customerName: z.string().nullable(), customerMobilePhone: z.string().nullable(), successUrl: z.url(), failUrl: z.url() }),
})
type Request = z.infer<typeof payloadSchema>['paymentRequest']
type PaymentOptions =
  | { method: 'CARD'; card: { flowMode: 'DEFAULT' } | { flowMode: 'DIRECT'; easyPay: 'PAYCO' } }
  | { method: 'VIRTUAL_ACCOUNT'; virtualAccount: { dueDate: string; cashReceipt: { type: '미발행' | '소득공제' | '지출증빙' } } }
type PaymentWindow = {
  requestPayment(request: Omit<Request, 'customerEmail' | 'customerName' | 'customerMobilePhone'> & PaymentOptions & {
    amount: { value: number; currency: 'KRW' }; customerEmail?: string; customerName?: string; customerMobilePhone?: string
  }): Promise<void>
  destroy(): Promise<void>
}
type TossFactory = (key: string) => { payment(options: { customerKey: string }): PaymentWindow }
let sdkLoad: Promise<TossFactory> | undefined
let windowOpening = false

function lockPaymentBackground(signal: AbortSignal): () => void {
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  // A separate stylesheet keeps the lock active when a preceding app modal closes.
  const style = document.createElement('style')
  style.textContent = 'html { overflow: hidden !important; overscroll-behavior: none !important; scrollbar-gutter: stable; } body { overflow: hidden !important; }'
  document.head.append(style)
  let released = false
  const release = () => {
    if (released) return
    released = true
    signal.removeEventListener('abort', release)
    style.remove()
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
  }
  signal.addEventListener('abort', release, { once: true })
  return release
}

function loadSdk(): Promise<TossFactory> {
  const getFactory = () => (window as Window & { TossPayments?: TossFactory }).TossPayments
  if (getFactory()) return Promise.resolve(getFactory()!)
  if (!sdkLoad) sdkLoad = new Promise<TossFactory>((resolve, reject) => {
    const script = document.createElement('script')
    const failed = () => { clearTimeout(timeout); script.remove(); reject(new Error('결제창을 불러오지 못했습니다. 다시 시도해 주세요.')) }
    const timeout = window.setTimeout(failed, 15000)
    script.src = sdkUrl
    script.async = true
    script.onload = () => { clearTimeout(timeout); const factory = getFactory(); if (factory) resolve(factory); else failed() }
    script.onerror = failed
    document.head.append(script)
  }).catch(error => { sdkLoad = undefined; throw error })
  return sdkLoad
}

function validatedPayload(payment: PreparedPayment) {
  if (payment.provider !== 'toss_payments' || payment.providerPreparationStatus !== 'ready'
    || payment.checkoutAction.type !== 'sdk' || payment.checkoutAction.operation !== 'payment.requestPayment'
    || payment.checkoutAction.sdkUrl !== sdkUrl) {
    throw new Error('현재 결제창을 준비할 수 없습니다. 잠시 후 다시 시도하거나 주문내역을 확인해 주세요.')
  }
  const parsed = payloadSchema.safeParse(JSON.parse(payment.checkoutAction.clientPayload ?? 'null'))
  if (!parsed.success) throw new Error('결제 정보를 확인할 수 없습니다. 주문내역을 확인해 주세요.')
  const payload = parsed.data
  if (payload.amount.value !== payment.amount || payload.amount.currency !== payment.currency
    || payload.paymentRequest.orderId !== payment.providerOrderId || payload.requestedPaymentMethod !== payment.paymentMethod) {
    throw new Error('결제 정보가 일치하지 않습니다. 주문내역을 확인해 주세요.')
  }
  for (const url of [payload.paymentRequest.successUrl, payload.paymentRequest.failUrl]) {
    if (new URL(url).origin !== window.location.origin || new URL(url).pathname !== '/checkout/complete') {
      throw new Error('결제 반환 주소를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    }
  }
  return payload
}

function paymentOptions(payload: z.infer<typeof payloadSchema>): PaymentOptions {
  switch (payload.requestedPaymentMethod) {
    case 'card': return { method: 'CARD', card: { flowMode: 'DEFAULT' } }
    case 'payco': return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: 'PAYCO' } }
    case 'virtual_account': {
      const dueDate = payload.virtualAccountDueDate
      if (!dueDate || !Number.isFinite(Date.parse(dueDate)) || Date.parse(dueDate) <= Date.now()) {
        throw new Error('결제 기한이 만료되었거나 확인되지 않습니다. 주문 상태를 확인해 주세요.')
      }
      const receiptTypes = { not_requested: '미발행', income_deduction: '소득공제', business_expense: '지출증빙' } as const
      return { method: 'VIRTUAL_ACCOUNT', virtualAccount: { dueDate, cashReceipt: { type: receiptTypes[payload.cashReceiptType] } } }
    }
  }
}

function providerErrorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined
}

// The order form selects the method; Toss owns authentication and provider agreements.
export async function openTossPaymentWindow(payment: PreparedPayment, signal: AbortSignal): Promise<void> {
  if (windowOpening) throw new Error('이미 결제창이 열려 있습니다.')
  windowOpening = true
  let control: PaymentWindow | undefined
  let requestPending = false
  let unlockBackground: (() => void) | undefined
  try {
    const payload = validatedPayload(payment)
    if (!/^(test|live)_ck_/.test(payload.clientKey)) {
      throw new Error('현재 결제창 설정이 올바르지 않습니다. 관리자에게 문의해 주세요.')
    }
    const options = paymentOptions(payload)
    const factory = await loadSdk()
    signal.throwIfAborted()
    control = factory(payload.clientKey).payment({ customerKey: payload.customerKey })
    const paymentWindow = control
    const { customerEmail, customerName, customerMobilePhone, ...required } = payload.paymentRequest
    unlockBackground = lockPaymentBackground(signal)
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', aborted)
        if (error) reject(error); else resolve()
      }
      const aborted = () => finish(new Error('결제창을 닫았습니다.'))
      signal.addEventListener('abort', aborted, { once: true })
      if (signal.aborted) { aborted(); return }
      requestPending = true
      void Promise.resolve().then(() => {
        if (signal.aborted) return
        return paymentWindow.requestPayment({ ...required, ...options, amount: payload.amount,
          ...(customerEmail ? { customerEmail } : {}), ...(customerName ? { customerName } : {}),
          ...(customerMobilePhone ? { customerMobilePhone } : {}) })
      }).then(() => { requestPending = false; finish() }).catch(error => {
        requestPending = false
        const code = providerErrorCode(error)
        if (code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL' || code === 'PAYMENT_REQUEST_ABORTED') {
          finish(new Error('결제를 취소했습니다. 다시 시도할 수 있습니다.'))
        } else finish(new Error('결제가 완료되지 않았습니다. 주문내역을 확인하거나 다시 시도해 주세요.'))
      })
    })
  } finally {
    try {
      if (control && requestPending) {
        try { await control.destroy() } catch (error) {
          if (providerErrorCode(error) !== 'NO_ACTIVE_PAYMENT_REQUEST') {
            throw new Error('결제창을 닫지 못했습니다. 페이지를 새로고침해 주세요.')
          }
        }
      }
    } finally {
      unlockBackground?.()
      windowOpening = false
    }
  }
}

export function paymentWindowError(error: unknown): string {
  if (error instanceof Error && /^결제|^현재 결제|^이미 결제|^주문서에서/.test(error.message)) return error.message
  const fallback = '결제창을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  if (!import.meta.env.DEV || !error || typeof error !== 'object') return fallback
  const code = 'code' in error && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(error.code) ? error.code : null
  const name = error instanceof Error && /^[A-Za-z]{1,60}Error$/.test(error.name) ? error.name : null
  // Never expose provider messages, keys, checkout payloads, or customer details.
  const diagnostic = code ?? name
  return diagnostic ? `${fallback} (오류 코드: ${diagnostic})` : fallback
}
