import { useUiTranslation } from '@/i18n/uiTranslation'
import type { ReactNode } from 'react'
import { translate } from '@/i18n/translation'

export function CheckoutSectionTitle({ children }: { children: ReactNode }) {
  const { uiText } = useUiTranslation()
  return <h2 className="commerce-section-title">{typeof children === 'string' ? uiText(children) : children}</h2>
}
export function CheckoutField({ children, error, label, required = false }: { children: ReactNode; error?: string; label: string; required?: boolean }) {
  const { uiText } = useUiTranslation()
  return <div className="commerce-field"><span>{required ? <em>*</em> : null}{uiText(label)}</span>{typeof children === 'string' ? uiText(children) : children}{error ? <small className="commerce-field__error" role="alert">{uiText(error)}</small> : null}</div>
}
export const formatCheckoutMoney = (value: number | null) => value === null ? '-' : translate('money.krwAmount', { amount: value.toLocaleString('ko-KR') })
