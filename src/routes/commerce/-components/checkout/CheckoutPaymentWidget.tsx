import { useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import type { PreparedPayment } from '@/api/ordersPayments'
import { CheckoutPaymentRefresh } from './CheckoutPaymentRefresh'

const sdkUrl = 'https://js.tosspayments.com/v2/standard'
const payloadSchema = z.object({
  sdkUrl: z.literal(sdkUrl), clientKey: z.string().min(1), customerKey: z.string().min(1), variantKey: z.string().nullable(),
  amount: z.object({ value: z.number().int().positive().safe(), currency: z.literal('KRW') }),
  paymentRequest: z.object({ orderId: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/), orderName: z.string().min(1).max(100),
    customerEmail: z.string().nullable(), customerName: z.string().nullable(), customerMobilePhone: z.string().nullable(), successUrl: z.url(), failUrl: z.url() }),
})
type Request = z.infer<typeof payloadSchema>['paymentRequest']
type WidgetControl = { destroy(): void | Promise<void> }
type MethodControl = WidgetControl & { getSelectedPaymentMethod(): unknown }
type Widgets = {
  setAmount(amount: { value: number; currency: 'KRW' }): Promise<void>
  renderPaymentMethods(options: { selector: string; variantKey?: string }): Promise<MethodControl>
  renderAgreement(options: { selector: string }): Promise<WidgetControl>
  requestPayment(request: Omit<Request, 'customerEmail' | 'customerName' | 'customerMobilePhone'> & { customerEmail?: string; customerName?: string; customerMobilePhone?: string }): Promise<void>
}
type TossFactory = (key: string) => { widgets(options: { customerKey: string }): Widgets }
let sdkLoad: Promise<TossFactory> | undefined
function loadSdk(): Promise<TossFactory> {
  const getFactory = () => (window as Window & { TossPayments?: TossFactory }).TossPayments
  if (getFactory()) return Promise.resolve(getFactory()!)
  if (!sdkLoad) sdkLoad = new Promise<TossFactory>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = sdkUrl
    script.async = true
    script.onload = () => { const factory = getFactory(); if (factory) resolve(factory); else { sdkLoad = undefined; reject(new Error('결제창을 불러오지 못했습니다.')) } }
    script.onerror = () => { sdkLoad = undefined; script.remove(); reject(new Error('결제창을 불러오지 못했습니다.')) }
    document.head.append(script)
  })
  return sdkLoad
}

export function CheckoutPaymentWidget({ payment }: { payment: PreparedPayment }) {
  const identifier = useId().replace(/[^A-Za-z0-9_-]/g, '')
  const widgets = useRef<Widgets | null>(null)
  const methodControl = useRef<MethodControl | null>(null)
  const request = useRef<Request | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let disposed = false
    let controls: WidgetControl[] = []
    async function initialize() {
      try {
        if (payment.provider !== 'toss_payments' || payment.providerPreparationStatus !== 'ready'
          || payment.checkoutAction.type !== 'sdk' || payment.checkoutAction.operation !== 'widgets.requestPayment'
          || payment.checkoutAction.sdkUrl !== sdkUrl) throw new Error('현재 결제를 진행할 수 없습니다. 주문내역에서 상태를 확인해 주세요.')
        const payload = payloadSchema.parse(JSON.parse(payment.checkoutAction.clientPayload ?? 'null'))
        if (payload.amount.value !== payment.amount || payload.amount.currency !== payment.currency || payload.paymentRequest.orderId !== payment.providerOrderId) throw new Error('결제 정보가 일치하지 않습니다.')
        for (const url of [payload.paymentRequest.successUrl, payload.paymentRequest.failUrl]) {
          if (new URL(url).origin !== window.location.origin || new URL(url).pathname !== '/checkout/complete') throw new Error('결제 반환 주소를 확인할 수 없습니다.')
        }
        const factory = await loadSdk()
        if (disposed) return
        const instance = factory(payload.clientKey).widgets({ customerKey: payload.customerKey })
        await instance.setAmount(payload.amount)
        if (disposed) return
        const methods = await instance.renderPaymentMethods({ selector: `#payment-methods-${identifier}`, ...(payload.variantKey ? { variantKey: payload.variantKey } : {}) })
        controls = [methods]
        if (disposed) { await methods.destroy(); return }
        const agreement = await instance.renderAgreement({ selector: `#payment-agreement-${identifier}` })
        controls = [methods, agreement]
        if (disposed) { await agreement.destroy(); return }
        widgets.current = instance
        methodControl.current = methods
        request.current = payload.paymentRequest
        setReady(true)
      } catch { if (!disposed) setError('결제창을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.') }
    }
    void initialize()
    return () => { disposed = true; widgets.current = null; methodControl.current = null; request.current = null; controls.forEach(control => { void control.destroy() }) }
  }, [payment, identifier, attempt])
  async function pay() {
    if (!widgets.current || !methodControl.current || !request.current || busy) return
    setBusy(true)
    setError('')
    const { customerEmail, customerName, customerMobilePhone, ...required } = request.current
    try {
      const selected = z.object({ code: z.string().nullish(), method: z.string().nullish(), type: z.string().nullish(), easyPay: z.object({ provider: z.string() }).nullish() }).parse(await methodControl.current.getSelectedPaymentMethod())
      const code = selected.easyPay?.provider ?? selected.code ?? selected.method
      const allowed: Record<string, string[]> = { card: ['CARD', '카드'], virtual_account: ['VIRTUAL_ACCOUNT', '가상계좌'], payco: ['PAYCO', '페이코'] }
      if (!code || (selected.type && selected.type !== 'NORMAL') || !allowed[payment.paymentMethod]?.includes(code)) {
        setError('주문서에서 선택한 결제수단과 같은 수단을 선택해 주세요.')
        return
      }
      await widgets.current.requestPayment({ ...required, ...(customerEmail ? { customerEmail } : {}), ...(customerName ? { customerName } : {}), ...(customerMobilePhone ? { customerMobilePhone } : {}) })
    } catch { setError('결제가 완료되지 않았습니다. 결제수단을 확인하고 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  return <section className="checkout-payment-widget"><h2>결제 진행</h2><p>주문번호 {payment.orderNo} · {payment.amount.toLocaleString('ko-KR')}원</p><p>아래 결제창에서 최종 결제수단을 확인해 주세요.</p>
    <div id={`payment-methods-${identifier}`} /><div id={`payment-agreement-${identifier}`} />
    {error && <p role="alert">{error}</p>}{!ready && error && <button type="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}>결제창 다시 불러오기</button>}
    <button type="button" disabled={!ready || busy} onClick={() => void pay()}>{busy ? '결제 진행 중…' : '결제하기'}</button>
    <CheckoutPaymentRefresh payment={payment} />
  </section>
}
