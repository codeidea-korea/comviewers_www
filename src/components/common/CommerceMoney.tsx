import { useTranslation } from '@/i18n/translation'

export function CommerceMoney({ className = '', value }: { className?: string; value: number | null }) {
  const { locale, t } = useTranslation()
  if (value === null) return <span className={`cart-money${className ? ` ${className}` : ''}`}>-</span>
  const amount = value.toLocaleString('ko-KR')
  return <span className={`cart-money notranslate${className ? ` ${className}` : ''}`} translate="no">{locale === 'ko' ? <><span>{amount}</span><span>원</span></> : <span>{t('money.krwAmount', { amount })}</span>}</span>
}
