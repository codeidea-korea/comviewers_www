import { z } from 'zod'
import type { PreparedPayment } from '@/api/ordersPayments'

const sdkUrl = 'https://js.tosspayments.com/v2/standard'
const payloadSchema = z.object({
  sdkUrl: z.literal(sdkUrl), clientKey: z.string().min(1), customerKey: z.string().min(1), variantKey: z.string().nullable(),
  requestedPaymentMethod: z.enum(['card', 'virtual_account', 'payco']),
  amount: z.object({ value: z.number().int().positive().safe(), currency: z.literal('KRW') }),
  paymentRequest: z.object({ orderId: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/), orderName: z.string().min(1).max(100),
    customerEmail: z.string().nullable(), customerName: z.string().nullable(), customerMobilePhone: z.string().nullable(), successUrl: z.url(), failUrl: z.url() }),
})
type Request = z.infer<typeof payloadSchema>['paymentRequest']
type PaymentWindow = {
  on(event: 'paymentRequest', callback: (paymentMethod: { code: string }) => void): void
  on(event: 'cancel', callback: () => void): void
  destroy(): void | Promise<void>
}
type Widgets = {
  setAmount(amount: { value: number; currency: 'KRW' }): Promise<void>
  renderPaymentWindow(options?: { variantKey: { paymentMethod: string } }): Promise<PaymentWindow>
  requestPayment(request: Omit<Request, 'customerEmail' | 'customerName' | 'customerMobilePhone'> & { customerEmail?: string; customerName?: string; customerMobilePhone?: string }): Promise<void>
}
type TossFactory = (key: string) => { widgets(options: { customerKey: string }): Widgets }
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
    || payment.checkoutAction.type !== 'sdk' || payment.checkoutAction.operation !== 'widgets.requestPayment'
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

// The provider window owns its payment-method and agreement UI; no intermediate app page.
export async function openTossPaymentWindow(payment: PreparedPayment, signal: AbortSignal): Promise<void> {
  if (windowOpening) throw new Error('이미 결제창이 열려 있습니다.')
  windowOpening = true
  let control: PaymentWindow | undefined
  let unlockBackground: (() => void) | undefined
  try {
    const payload = validatedPayload(payment)
    const factory = await loadSdk()
    signal.throwIfAborted()
    const widgets = factory(payload.clientKey).widgets({ customerKey: payload.customerKey })
    await widgets.setAmount(payload.amount)
    signal.throwIfAborted()
    unlockBackground = lockPaymentBackground(signal)
    control = await widgets.renderPaymentWindow(payload.variantKey ? { variantKey: { paymentMethod: payload.variantKey } } : undefined)
    signal.throwIfAborted()
    const paymentWindow = control
    await new Promise<void>((resolve, reject) => {
      let settled = false
      let requesting = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', aborted)
        if (error) reject(error); else resolve()
      }
      const aborted = () => finish(new Error('결제창을 닫았습니다.'))
      signal.addEventListener('abort', aborted, { once: true })
      paymentWindow.on('cancel', () => finish(new Error('결제를 취소했습니다. 다시 시도할 수 있습니다.')))
      paymentWindow.on('paymentRequest', method => {
        if (settled || requesting) return
        const allowed: Record<string, readonly string[]> = { card: ['CARD', '카드'], virtual_account: ['VIRTUAL_ACCOUNT', '가상계좌'], payco: ['PAYCO', '페이코'] }
        if (!allowed[payment.paymentMethod]?.includes(method?.code)) {
          finish(new Error('주문서에서 선택한 결제수단과 같은 수단을 선택해 주세요.'))
          return
        }
        requesting = true
        const { customerEmail, customerName, customerMobilePhone, ...required } = payload.paymentRequest
        void Promise.resolve().then(() => {
          if (settled || signal.aborted) return
          return widgets.requestPayment({ ...required, ...(customerEmail ? { customerEmail } : {}), ...(customerName ? { customerName } : {}), ...(customerMobilePhone ? { customerMobilePhone } : {}) })
        })
          .then(() => finish())
          .catch(() => finish(new Error('결제가 완료되지 않았습니다. 주문내역을 확인하거나 다시 시도해 주세요.')))
      })
    })
  } finally {
    try { await control?.destroy() } finally {
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
