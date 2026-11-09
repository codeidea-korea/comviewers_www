import { z } from 'zod'
import type { ForeignPaymentQuote, PaymentFailureDiagnostic, PreparedPayment } from '@/api/ordersPayments'
import { foreignPayloadSchema, openForeignPaymentWindow, tossPaymentRequestSchema, type ForeignTossClient } from './tossForeignPaymentWindow'

const sdkUrl = 'https://js.tosspayments.com/v2/standard'
const payloadSchema = z.object({
  sdkUrl: z.literal(sdkUrl), clientKey: z.string().min(1), customerKey: z.string().min(1),
  virtualAccountDueDate: z.string().nullable(),
  cashReceiptType: z.enum(['not_requested', 'income_deduction', 'business_expense']),
  requestedPaymentMethod: z.enum(['card', 'virtual_account', 'payco', 'naver_pay', 'kakao_pay']),
  amount: z.object({ value: z.number().int().positive().safe(), currency: z.literal('KRW') }),
  paymentRequest: tossPaymentRequestSchema,
})
type Request = z.infer<typeof payloadSchema>['paymentRequest']
type PaymentOptions =
  | { method: 'CARD'; card: { flowMode: 'DEFAULT' } | { flowMode: 'DIRECT'; easyPay: 'PAYCO' | 'NAVERPAY' | 'KAKAOPAY' } }
  | { method: 'VIRTUAL_ACCOUNT'; virtualAccount: { dueDate: string; cashReceipt: { type: '미발행' | '소득공제' | '지출증빙' } } }
type PaymentWindow = {
  requestPayment(request: Omit<Request, 'customerEmail' | 'customerName' | 'customerMobilePhone'> & PaymentOptions & {
    amount: { value: number; currency: 'KRW' }; customerEmail?: string; customerName?: string; customerMobilePhone?: string
  }): Promise<void>
  destroy(): Promise<void>
}
type TossFactory = (key: string) => ForeignTossClient & { payment(options: { customerKey: string }): PaymentWindow }
let sdkLoad: Promise<TossFactory> | undefined
let windowOpening = false

class PaymentWindowFailureError extends Error {
  readonly diagnostic: PaymentFailureDiagnostic
  constructor(message: string, diagnostic: PaymentFailureDiagnostic) { super(message); this.diagnostic = diagnostic }
}
class PaymentWindowCancelledError extends PaymentWindowFailureError {}

const safeProviderCodes = new Set([
  'INVALID_CLIENT_KEY', 'INVALID_CUSTOMER_KEY', 'INCORRECT_FAIL_URL_FORMAT', 'INCORRECT_SUCCESS_URL_FORMAT',
  'EXCEED_DEPOSIT_AMOUNT_LIMIT', 'EXCEED_MAX_DUE_DATE', 'PAY_PROCESS_CANCELED', 'USER_CANCEL',
  'PAYMENT_REQUEST_ABORTED', 'NETWORK_ERROR',
  'BELOW_ZERO_AMOUNT', 'INVALID_AMOUNT_CURRENCY', 'INVALID_AMOUNT_VALUE', 'INVALID_METHOD_TRANSACTION',
  'INVALID_PARAMETERS', 'INVALID_PARAMETER', 'NOT_SUPPORTED_METHOD', 'NOT_SUPPORTED_PROMISE',
  'V1_METHOD_NOT_SUPPORTED', 'INSECURE_KEY_USAGE', 'INVALID_METADATA', 'NOT_SUPPORTED_WIDGET_KEY',
  'NO_ACTIVE_PAYMENT_REQUEST', 'PAY_PROCESS_ABORTED', 'REJECT_CARD_COMPANY', 'PROVIDER_STATUS_UNHEALTHY',
  'INVALID_VARIANT_KEY', 'INVALID_SELECTOR', 'NOT_SELECTED_PAYMENT_METHOD', 'NOT_SETUP_AMOUNT',
  'NEED_AGREEMENT_WITH_REQUIRED_TERMS', 'NOT_SUPPORTED_API_INDIVIDUAL_KEY', 'UNKNOWN_PAYMENT_ERROR',
  'COMMON_ERROR', 'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING',
])

export function safePaymentErrorCode(error: unknown, fallback = 'UNKNOWN_ERROR'): string {
  const code = typeof error === 'string' ? error : providerErrorCode(error)
  return code && safeProviderCodes.has(code) ? code : fallback
}

export function paymentFailureDiagnostic(error: unknown): PaymentFailureDiagnostic {
  return error instanceof PaymentWindowFailureError ? error.diagnostic : { stage: 'UNKNOWN', code: 'UNKNOWN_ERROR' }
}

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
    const failed = (code: 'SDK_LOAD_TIMEOUT' | 'SDK_LOAD_FAILED') => { clearTimeout(timeout); script.remove(); reject(new PaymentWindowFailureError('결제창을 불러오지 못했습니다. 다시 시도해 주세요.', { stage: 'SDK_LOAD', code })) }
    const timeout = window.setTimeout(() => failed('SDK_LOAD_TIMEOUT'), 15000)
    script.src = sdkUrl
    script.async = true
    script.onload = () => { clearTimeout(timeout); const factory = getFactory(); if (factory) resolve(factory); else failed('SDK_LOAD_FAILED') }
    script.onerror = () => failed('SDK_LOAD_FAILED')
    document.head.append(script)
  }).catch(error => { sdkLoad = undefined; throw error })
  return sdkLoad
}

function validatedPayload(payment: PreparedPayment) {
  if (payment.provider !== 'toss_payments' || payment.providerPreparationStatus !== 'ready'
    || payment.checkoutAction.type !== 'sdk' || !['payment.requestPayment', 'widgets.renderPaymentWindow'].includes(payment.checkoutAction.operation ?? '')
    || payment.checkoutAction.sdkUrl !== sdkUrl) {
    throw new PaymentWindowFailureError('현재 결제창을 준비할 수 없습니다. 잠시 후 다시 시도하거나 주문내역을 확인해 주세요.', { stage: 'PAYLOAD_VALIDATION', code: 'INVALID_PREPARATION' })
  }
  let raw: unknown
  try { raw = JSON.parse(payment.checkoutAction.clientPayload ?? 'null') }
  catch { throw new PaymentWindowFailureError('결제 정보를 확인할 수 없습니다. 주문내역을 확인해 주세요.', { stage: 'PAYLOAD_VALIDATION', code: 'INVALID_PAYLOAD' }) }
  const parsed = z.union([payloadSchema, foreignPayloadSchema]).safeParse(raw)
  if (!parsed.success) throw new PaymentWindowFailureError('결제 정보를 확인할 수 없습니다. 주문내역을 확인해 주세요.', { stage: 'PAYLOAD_VALIDATION', code: 'INVALID_PAYLOAD' })
  const payload = parsed.data
  const foreign = payload.requestedPaymentMethod === 'foreign_card'
  const matches = foreign
    ? payload.originalAmount.value === payment.amount && payment.currency === 'KRW' && payment.paymentMethod === 'card'
      && payment.checkoutAction.operation === 'widgets.renderPaymentWindow'
    : payload.amount.value === payment.amount && payload.amount.currency === payment.currency
      && payload.requestedPaymentMethod === payment.paymentMethod && payment.checkoutAction.operation === 'payment.requestPayment'
  if (!matches || payload.paymentRequest.orderId !== payment.providerOrderId) {
    throw new PaymentWindowFailureError('결제 정보가 일치하지 않습니다. 주문내역을 확인해 주세요.', { stage: 'PAYLOAD_VALIDATION', code: 'PAYMENT_MISMATCH' })
  }
  for (const url of [payload.paymentRequest.successUrl, payload.paymentRequest.failUrl]) {
    if (new URL(url).origin !== window.location.origin || new URL(url).pathname !== '/checkout/complete') {
      throw new PaymentWindowFailureError('결제 반환 주소를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', { stage: 'PAYLOAD_VALIDATION', code: 'INVALID_CALLBACK_ORIGIN' })
    }
  }
  return payload
}

export function preparedForeignQuote(payment: PreparedPayment): ForeignPaymentQuote | undefined {
  if (payment.checkoutAction.operation !== 'widgets.renderPaymentWindow') return undefined
  const payload = validatedPayload(payment)
  if (payload.requestedPaymentMethod !== 'foreign_card') return undefined
  return { available: true, krwAmount: payload.originalAmount.value, usdAmount: payload.amount.value,
    exchangeRate: payload.exchangeRate, rateBaseDate: payload.rateBaseDate }
}

function paymentOptions(payload: z.infer<typeof payloadSchema>): PaymentOptions {
  switch (payload.requestedPaymentMethod) {
    case 'card': return { method: 'CARD', card: { flowMode: 'DEFAULT' } }
    case 'payco': return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: 'PAYCO' } }
    case 'naver_pay': return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: 'NAVERPAY' } }
    case 'kakao_pay': return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: 'KAKAOPAY' } }
    case 'virtual_account': {
      const dueDate = payload.virtualAccountDueDate
      if (!dueDate || !Number.isFinite(Date.parse(dueDate)) || Date.parse(dueDate) <= Date.now()) {
        throw new PaymentWindowFailureError('결제 기한이 만료되었거나 확인되지 않습니다. 주문 상태를 확인해 주세요.', { stage: 'PAYMENT_OPTIONS', code: 'INVALID_DUE_DATE' })
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
  let requestRejected = false
  let unlockBackground: (() => void) | undefined
  let phase: PaymentFailureDiagnostic['stage'] = 'PAYLOAD_VALIDATION'
  let originalFailure: PaymentFailureDiagnostic | undefined
  try {
    const payload = validatedPayload(payment)
    if (payload.requestedPaymentMethod === 'foreign_card') {
      phase = 'SDK_LOAD'
      const factory = await loadSdk()
      signal.throwIfAborted()
      unlockBackground = lockPaymentBackground(signal)
      phase = 'FOREIGN_REQUEST'
      await openForeignPaymentWindow(factory(payload.clientKey), payload, signal,
        () => new PaymentWindowCancelledError('결제를 취소했습니다. 다시 시도할 수 있습니다.', { stage: 'FOREIGN_REQUEST', code: 'REQUEST_CANCELLED' }),
        error => new PaymentWindowFailureError('결제가 완료되지 않았습니다. 주문내역을 확인하거나 다시 시도해 주세요.', { stage: 'FOREIGN_REQUEST', code: safePaymentErrorCode(error, 'SDK_REQUEST_FAILED') }),
        original => new PaymentWindowFailureError('결제창을 닫지 못했습니다. 페이지를 새로고침해 주세요.', original instanceof PaymentWindowFailureError ? original.diagnostic : { stage: 'SDK_CLEANUP', code: 'SDK_CLEANUP_FAILED' }))
      return
    }
    if (!/^(test|live)_ck_/.test(payload.clientKey)) {
      throw new PaymentWindowFailureError('현재 결제창 설정이 올바르지 않습니다. 관리자에게 문의해 주세요.', { stage: 'PAYLOAD_VALIDATION', code: 'INVALID_CLIENT_KEY' })
    }
    phase = 'PAYMENT_OPTIONS'
    const options = paymentOptions(payload)
    phase = 'SDK_LOAD'
    const factory = await loadSdk()
    signal.throwIfAborted()
    phase = 'SDK_INITIALIZATION'
    control = factory(payload.clientKey).payment({ customerKey: payload.customerKey })
    const paymentWindow = control
    const { customerEmail, customerName, customerMobilePhone, ...required } = payload.paymentRequest
    unlockBackground = lockPaymentBackground(signal)
    phase = 'SDK_REQUEST'
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
        requestRejected = true
        const code = providerErrorCode(error)
        if (code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL' || code === 'PAYMENT_REQUEST_ABORTED') {
          finish(new PaymentWindowCancelledError('결제를 취소했습니다. 다시 시도할 수 있습니다.', { stage: 'SDK_REQUEST', code: safePaymentErrorCode(code, 'REQUEST_CANCELLED') }))
        } else finish(new PaymentWindowFailureError('결제가 완료되지 않았습니다. 주문내역을 확인하거나 다시 시도해 주세요.', { stage: 'SDK_REQUEST', code: safePaymentErrorCode(code, 'SDK_REQUEST_FAILED') }))
      })
    })
  } catch (error) {
    const diagnostic = error instanceof PaymentWindowFailureError ? error.diagnostic : {
      stage: phase,
      code: safePaymentErrorCode(error, phase === 'SDK_INITIALIZATION' ? 'SDK_INITIALIZATION_FAILED' : 'UNKNOWN_ERROR'),
    }
    originalFailure = diagnostic
    if (error instanceof PaymentWindowFailureError) throw error
    throw new PaymentWindowFailureError(error instanceof Error ? error.message : '', diagnostic)
  } finally {
    try {
      // A rejected request can leave the SDK iframe mounted over the checkout.
      // Keep the successful redirect path untouched while cleaning up cancelled attempts.
      if (control && (requestPending || requestRejected)) {
        try { await control.destroy() } catch (error) {
          if (providerErrorCode(error) !== 'NO_ACTIVE_PAYMENT_REQUEST') {
            throw new PaymentWindowFailureError('결제창을 닫지 못했습니다. 페이지를 새로고침해 주세요.', originalFailure ?? { stage: 'SDK_CLEANUP', code: 'SDK_CLEANUP_FAILED' })
          }
        }
      }
    } finally {
      unlockBackground?.()
      windowOpening = false
    }
  }
}

export function isPaymentWindowCancelled(error: unknown): boolean {
  return error instanceof PaymentWindowCancelledError
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
