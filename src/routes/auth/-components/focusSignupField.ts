/** Scope validation focus to this form, including compound fields without a shared name. */
export function focusSignupField(form: HTMLFormElement, field: string) {
  const selectors: Record<string, string> = {
    email: 'input[aria-label="이메일 아이디"]',
    phone: 'select[aria-label="휴대전화 앞자리"]',
    phone1: 'select[aria-label="휴대전화 앞자리"]',
    phone2: 'input[aria-label="휴대전화 중간자리"]',
    phone3: 'input[aria-label="휴대전화 끝자리"]',
    messenger: 'select[aria-label="메신저 선택"]',
    messengerId: 'input[aria-label="메신저 아이디"]',
  }
  const selector = selectors[field]
  const target = form.elements.namedItem(field) ?? (selector ? form.querySelector(selector) : null)
  if (target instanceof HTMLElement) {
    target.focus()
    target.scrollIntoView({ block: 'center' })
  }
}
