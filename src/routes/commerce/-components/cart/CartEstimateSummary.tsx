import type { CartEstimate } from '@/domain/cart/cartEstimate'
import { CartMoney } from './CartMoney'
import { TranslatedText, useTranslation } from '@/i18n/translation'

interface Props {
  estimate: { [K in keyof CartEstimate]: number | null } & { subtotalAmount?: number; setupFeeAmount?: number }
  selectedCount: number
  disabled: boolean
  quoteError?: boolean
  onRetryQuote?: () => void
  onPurchase: () => void
  onPrevious: () => void
}

export function CartEstimateSummary({ estimate, selectedCount, disabled, quoteError = false, onRetryQuote, onPurchase, onPrevious }: Props) {
  const { locale, t } = useTranslation()
  return <aside className={`purchase-summary cart-summary${quoteError ? ' cart-summary--error' : ''}`}>
    <h2><TranslatedText id="cart.estimatedOrder" /></h2>
    {quoteError ? <p className="cart-summary__error" role="alert">주문 금액을 확인하지 못했습니다. <button onClick={onRetryQuote} type="button"><TranslatedText id="common.retry" /></button></p> : null}
    <div className="purchase-summary__box cart-summary__box">
      <dl>
        <div className="purchase-summary__products cart-summary__products">
          <div className="cart-summary__main"><dt><TranslatedText id="cart.rentalProducts" /></dt><dd><CartMoney value={estimate.rentalTotal} /></dd></div>
          <div className="cart-summary__sub"><dt>L <TranslatedText id="money.setupFee" /></dt><dd><CartMoney value={estimate.rentalSetupTotal} /></dd></div>
          <div className="cart-summary__sub"><dt>L <TranslatedText id="money.rentalAmount" /></dt><dd><CartMoney value={estimate.rentalMonthlyTotal} /></dd></div>
          <div className="cart-summary__main"><dt><TranslatedText id="nav.parts" /></dt><dd><CartMoney value={estimate.partTotal} /></dd></div>
        </div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__points cart-summary__points"><dt><TranslatedText id="cart.pointsToEarn" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{estimate.pointTotal === null ? <span>-</span> : locale === 'ko' ? <><span>{estimate.pointTotal}</span><span>점</span></> : <span>{t('money.pointAmount', { points: estimate.pointTotal })}</span>}</dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__total cart-summary__total"><dt><TranslatedText id="cart.estimatedPayment" /></dt><dd><CartMoney value={estimate.expectedTotal} /></dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
      </dl>
      <p><TranslatedText id="cart.benefitsAtCheckout" /></p>
    </div>
    <div className="purchase-summary__actions cart-summary__actions"><button className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined} disabled={disabled || !selectedCount} onClick={onPurchase} type="button">{locale === 'ko' ? <><strong>선택 상품 {selectedCount}개</strong> 구매하기</> : <strong>{t('cart.purchaseSelected', { count: selectedCount })}</strong>}</button><button onClick={onPrevious} type="button"><TranslatedText id="common.previousPage" /></button></div>
  </aside>
}
