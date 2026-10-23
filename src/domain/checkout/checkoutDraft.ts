import { z } from 'zod'

export const checkoutPaymentMethodSchema = z.enum(['', 'virtual-account', 'card', 'payco', 'naver-pay', 'kakao-pay', 'global-card'])

// Order content confirmation is local to this form; PG consent belongs to the payment widget.
export const checkoutDraftSchema = z.object({
  contact: z.object({
    name: z.string().trim().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.'),
    email: z.email('이메일 주소를 확인해 주세요.').max(100),
    phone: z.string().trim().max(30).regex(/^(?:01[016789]-\d{4}-\d{4})?$/, '핸드폰 번호의 가운데와 끝자리를 각각 4자리로 입력해 주세요.'),
    messengerType: z.string().max(50), messengerId: z.string().max(100),
  }),
  finalAmount: z.number({ error: '최종 결제금액을 확인해 주세요.' }).int().nonnegative().safe(),
  payment: checkoutPaymentMethodSchema,
  receiptType: z.enum(['not_requested', 'income_deduction', 'business_expense']),
  receiptIdentifier: z.string(),
  orderAgreed: z.literal(true, { error: '필수 항목에 동의해 주세요.' }),
  paymentServiceAgreed: z.literal(true, { error: '필수 항목에 동의해 주세요.' }),
}).superRefine((draft, context) => {
  if (draft.finalAmount > 0 && !draft.payment) {
    context.addIssue({ code: 'custom', path: ['payment'], message: '결제수단을 선택해 주세요.' })
  }
  if (Boolean(draft.contact.messengerType.trim()) !== Boolean(draft.contact.messengerId.trim())) {
    context.addIssue({ code: 'custom', path: ['contact', 'messengerId'], message: '메신저 종류와 아이디를 함께 입력해 주세요.' })
  }
  if (draft.finalAmount === 0 || draft.payment !== 'virtual-account' || draft.receiptType === 'not_requested') return
  const valid = draft.receiptType === 'business_expense' ? /^\d{10}$/.test(draft.receiptIdentifier) : /^\d{10,11}$/.test(draft.receiptIdentifier)
  if (!valid) context.addIssue({ code: 'custom', path: ['receiptIdentifier'], message: '현금영수증 식별정보를 확인해 주세요.' })
})

// A zero-amount order has no PG method or cash-receipt request, even if one was previously selected.
export function checkoutPaymentInput(draft: z.infer<typeof checkoutDraftSchema>, foreignUsdEnabled = false,
  frozenGlobalCardPayment?: GlobalCardPayment) {
  const globalCardPayment = frozenGlobalCardPayment ?? (foreignUsdEnabled ? 'foreign_card' : 'card')
  const methods = { '': null, 'virtual-account': 'virtual_account', card: 'card', payco: 'payco', 'naver-pay': 'naver_pay', 'kakao-pay': 'kakao_pay', 'global-card': globalCardPayment } as const
  const payment = draft.finalAmount === 0 ? null : methods[draft.payment]
  return { payment, cashReceiptType: payment === 'virtual_account' ? draft.receiptType : 'not_requested' as const,
    cashReceiptIdentifier: payment === 'virtual_account' ? draft.receiptIdentifier : '' }
}

export type GlobalCardPayment = 'card' | 'foreign_card'
type PaymentCapabilities = { foreignUsdEnabled?: boolean }
export const checkoutPaymentMethodsUnavailable = '결제수단 정보를 확인하지 못했습니다. 다시 시도해 주세요.'

// A successful legacy response without the new flag preserves its original KRW route.
// An absent/failed response is unknown, rather than an instruction to change currency.
export function checkoutGlobalCardPayment(capabilities: PaymentCapabilities | undefined): GlobalCardPayment | undefined {
  if (!capabilities) return undefined
  if (capabilities.foreignUsdEnabled !== undefined && typeof capabilities.foreignUsdEnabled !== 'boolean')
    throw new Error(checkoutPaymentMethodsUnavailable)
  return capabilities.foreignUsdEnabled ? 'foreign_card' : 'card'
}

export async function resolveCheckoutGlobalCardPayment(frozen: GlobalCardPayment | undefined,
  load: ((signal?: AbortSignal) => Promise<PaymentCapabilities>) | undefined, signal?: AbortSignal): Promise<GlobalCardPayment> {
  if (frozen) return frozen
  if (!load) throw new Error(checkoutPaymentMethodsUnavailable)
  const capabilities = await load(signal)
  signal?.throwIfAborted()
  const payment = checkoutGlobalCardPayment(capabilities)
  if (!payment) throw new Error(checkoutPaymentMethodsUnavailable)
  return payment
}

export async function verifyCheckoutPaymentMode(request: {
  amountKrw: number; globalCardSelected: boolean; retrying: boolean; paymentPrepared?: boolean;
  frozenGlobalCardPayment?: GlobalCardPayment; frozenPaymentMethod?: string | null
}, loadMode: (signal?: AbortSignal) => Promise<GlobalCardPayment>,
verifyForeignQuote: (amountKrw: number, signal?: AbortSignal) => Promise<void>, signal?: AbortSignal): Promise<GlobalCardPayment> {
  if (request.amountKrw === 0) return request.frozenGlobalCardPayment ?? 'card'
  // Ordinary KRW methods do not depend on the optional USD capability endpoint.
  // Once such an order exists, its last-logo retry must also remain on KRW.
  const mode = request.frozenGlobalCardPayment ?? (request.globalCardSelected ? await loadMode(signal) : 'card')
  signal?.throwIfAborted()
  const needsForeignQuote = request.frozenPaymentMethod !== undefined && !request.retrying
    ? request.frozenPaymentMethod === 'foreign_card' && !request.paymentPrepared
    : request.globalCardSelected && mode === 'foreign_card'
  if (needsForeignQuote) await verifyForeignQuote(request.amountKrw, signal)
  signal?.throwIfAborted()
  return mode
}
