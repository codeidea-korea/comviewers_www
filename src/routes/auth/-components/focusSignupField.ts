/** Scope validation focus to this form, including compound fields without a shared name. */
export function focusSignupField(form: HTMLFormElement, field: string) {
  const fieldNames: Readonly<Record<string, string>> = {
    email: 'emailId',
    phone: 'phone1',
  }
  const name = fieldNames[field] ?? field
  const target = form.elements.namedItem(name)
  if (target instanceof HTMLElement) {
    target.focus()
    target.scrollIntoView({ block: 'center' })
  }
}
