import { z } from 'zod'

export const tossPaymentRequestSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/), orderName: z.string().min(1).max(100),
  customerEmail: z.string().nullable(), customerName: z.string().nullable(), customerMobilePhone: z.string().nullable(),
  successUrl: z.url(), failUrl: z.url(),
})

export const foreignPayloadSchema = z.object({
  sdkUrl: z.literal('https://js.tosspayments.com/v2/standard'),
  clientKey: z.string().regex(/^(test|live)_gck_/), customerKey: z.string().min(1),
  merchantId: z.literal('comvie6ys2'),
  requestedPaymentMethod: z.literal('foreign_card'),
  amount: z.object({ value: z.number().positive().finite().refine(value => {
    const cents = Math.round(value * 100)
    return Number.isSafeInteger(cents) && Number(value.toFixed(2)) === value
  }), currency: z.literal('USD') }),
  originalAmount: z.object({ value: z.number().int().positive().safe(), currency: z.literal('KRW') }),
  exchangeRate: z.number().positive().finite(), rateBaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  variantKey: z.string().min(1), agreementVariantKey: z.string().min(1),
  paymentRequest: tossPaymentRequestSchema,
})

type ForeignPayload = z.infer<typeof foreignPayloadSchema>
type PaymentRequest = z.infer<typeof tossPaymentRequestSchema>
type WidgetWindow = {
  on(event: 'paymentRequest', callback: (event: unknown) => void): void
  on(event: 'cancel', callback: () => void): void
  destroy(): void | Promise<void>
}
type Widgets = {
  setAmount(amount: ForeignPayload['amount']): Promise<void>
  renderPaymentWindow(options: { orderName: string; variantKey: { paymentMethod: string; agreement: string } }): Promise<WidgetWindow>
  requestPayment(request: Omit<PaymentRequest, 'customerEmail' | 'customerName' | 'customerMobilePhone'> & {
    customerEmail?: string; customerName?: string; customerMobilePhone?: string
  }): Promise<void>
}
export type ForeignTossClient = { widgets(options: { customerKey: string }): Widgets }

// The USD-only merchant/variant must be enabled on the server after the provider contract is verified.
export async function openForeignPaymentWindow(client: ForeignTossClient, payload: ForeignPayload, signal: AbortSignal,
  cancelled: () => Error): Promise<void> {
  const widgets = client.widgets({ customerKey: payload.customerKey })
  await widgets.setAmount(payload.amount)
  signal.throwIfAborted()
  let control: WidgetWindow | undefined
  let redirected = false
  try {
    control = await widgets.renderPaymentWindow({ orderName: payload.paymentRequest.orderName,
      variantKey: { paymentMethod: payload.variantKey, agreement: payload.agreementVariantKey } })
    signal.throwIfAborted()
    const { customerEmail, customerName, customerMobilePhone, ...required } = payload.paymentRequest
    await new Promise<void>((resolve, reject) => {
      let settled = false
      let requesting = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', abort)
        if (error) reject(error); else resolve()
      }
      const abort = () => finish(new Error('결제창을 닫았습니다.'))
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) { abort(); return }
      control!.on('cancel', () => finish(cancelled()))
      control!.on('paymentRequest', event => {
        if (settled || requesting || signal.aborted) return
        const selected = z.object({ paymentMethod: z.object({ method: z.literal('CARD'),
          card: z.object({ easyPay: z.string().optional() }).optional() }),
        paymentInfo: z.object({ amount: foreignPayloadSchema.shape.amount }) }).safeParse(event)
        if (!selected.success || selected.data.paymentMethod.card?.easyPay
          || selected.data.paymentInfo.amount.value !== payload.amount.value) {
          finish(new Error('현재 결제창에서는 USD 해외카드 결제만 이용할 수 있습니다. 주문서에서 다시 선택해 주세요.'))
          return
        }
        requesting = true
        void Promise.resolve().then(() => {
          if (signal.aborted) return
          return widgets.requestPayment({ ...required, ...(customerEmail ? { customerEmail } : {}),
            ...(customerName ? { customerName } : {}), ...(customerMobilePhone ? { customerMobilePhone } : {}) })
        }).then(() => {
          if (settled || signal.aborted) return
          redirected = true
          finish()
        }).catch(error => {
          const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
          finish(code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL' || code === 'PAYMENT_REQUEST_ABORTED'
            ? cancelled() : new Error('결제가 완료되지 않았습니다. 주문내역을 확인하거나 다시 시도해 주세요.'))
        })
      })
    })
  } finally {
    if (control && !redirected) {
      try { await control.destroy() }
      catch { throw new Error('결제창을 닫지 못했습니다. 페이지를 새로고침해 주세요.') }
    }
  }
}
