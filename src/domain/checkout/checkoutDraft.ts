import { z } from 'zod'

// Order content confirmation is local to this form; PG consent belongs to the payment widget.
export const checkoutDraftSchema = z.object({
  contact: z.object({
    name: z.string().trim().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.'),
    email: z.email('이메일 주소를 확인해 주세요.').max(100),
    phone: z.string().trim().max(30).regex(/^(?:01[016789]-\d{4}-\d{4})?$/, '핸드폰 번호의 가운데와 끝자리를 각각 4자리로 입력해 주세요.'),
    messengerType: z.string().max(50), messengerId: z.string().max(100),
  }),
  payment: z.enum(['virtual-account', 'card', 'payco', 'global-card'], { error: '결제수단을 선택해 주세요.' }),
  receiptType: z.enum(['not_requested', 'income_deduction', 'business_expense']),
  receiptIdentifier: z.string(),
  orderAgreed: z.literal(true, { error: '주문 내용 확인을 선택해 주세요.' }),
}).superRefine((draft, context) => {
  if (Boolean(draft.contact.messengerType.trim()) !== Boolean(draft.contact.messengerId.trim())) {
    context.addIssue({ code: 'custom', path: ['contact', 'messengerId'], message: '메신저 종류와 아이디를 함께 입력해 주세요.' })
  }
  if (draft.payment !== 'virtual-account' || draft.receiptType === 'not_requested') return
  const valid = draft.receiptType === 'business_expense' ? /^\d{10}$/.test(draft.receiptIdentifier) : /^\d{10,11}$/.test(draft.receiptIdentifier)
  if (!valid) context.addIssue({ code: 'custom', path: ['receiptIdentifier'], message: '현금영수증 식별정보를 확인해 주세요.' })
})
