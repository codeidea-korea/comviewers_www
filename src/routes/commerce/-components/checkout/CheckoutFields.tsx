import type { ReactNode } from 'react'

export function CheckoutSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="commerce-section-title">{children}</h2>
}
export function CheckoutField({ children, label, required = false }: { children: ReactNode; label: string; required?: boolean }) {
  return <div className="commerce-field"><span>{required ? <em>*</em> : null}{label}</span>{children}</div>
}
export const formatCheckoutMoney = (value: number | null) => value === null ? '-' : `${value.toLocaleString('ko-KR')}원`
