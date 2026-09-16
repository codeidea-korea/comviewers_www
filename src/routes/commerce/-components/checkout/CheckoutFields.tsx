import type { ReactNode } from 'react'

export function CheckoutSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="commerce-section-title">{children}</h2>
}
export function CheckoutField({ children, error, label, required = false }: { children: ReactNode; error?: string; label: string; required?: boolean }) {
  return <div className="commerce-field"><span>{required ? <em>*</em> : null}{label}</span>{children}{error ? <small className="commerce-field__error" role="alert">{error}</small> : null}</div>
}
export const formatCheckoutMoney = (value: number | null) => value === null ? '-' : `${value.toLocaleString('ko-KR')}원`
