import { useState } from 'react'
import type { CartItem } from '@/domain/cart/schemas'
import { getCartItemAmount, getCartItemPoints, getCartSelectionUnits, cartUnitLabel, cartSelectionLabel, cartPriceLabel } from '@/domain/cart/cartEstimate'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import windowsLogo from '@/assets/figma/windows-logo.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import tollIcon from '@/assets/figma/icon-toll-green.svg'
import defaultProductImage from '@/assets/figma/store/product-04.png'
import { CheckoutSectionTitle, formatCheckoutMoney as money } from './CheckoutFields'
import { TranslatedText, useTranslation } from '@/i18n/translation'

function CheckoutProductImage({ item }: { item: CartItem }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const fallback = !item.image || failedSource === item.image
  return <div className="commerce-product-row__image">
    <img className="checkout-product-image" alt={item.label} src={fallback ? defaultProductImage : item.image ?? defaultProductImage}
      onError={fallback ? undefined : () => setFailedSource(item.image)} />
    {fallback && <img className="checkout-product-logo" alt="" src={windowsLogo} />}
  </div>
}

export function CheckoutProducts({ items }: { items: readonly CartItem[] }) {
  const { locale, t } = useTranslation()
  return <section className="checkout-products"><CheckoutSectionTitle>주문상품</CheckoutSectionTitle>{items.map((item) => {
    const partner = item.type === 'part'
    const waiting = !item.available || (!partner && item.instantAvailable === false)
    const status = !item.available ? <TranslatedText id="checkout.unavailable" /> : partner ? '구매 가능합니다.'
      : item.instantAvailable === null ? <TranslatedText id="product.connectionUnknown" /> : item.instantAvailable ? '구매 즉시 접속 가능합니다.' : <TranslatedText id="product.preparing" />
    const points = getCartItemPoints(item)
    return <article className="commerce-product-row commerce-product-row--compact" key={item.id}>
      <header className="commerce-product-row__heading">{partner ? <span>{item.label}</span> : <><span className="checkout-product-number"><TranslatedText id="product.number" /> <b>{item.productId}</b></span><small>{item.location}</small></>}</header>
      <div className="commerce-product-row__content">
        <CheckoutProductImage item={item} />
        <div className="commerce-product-row__body">
          <p className={`commerce-product-row__status${waiting ? ' commerce-product-row__status--waiting' : ''}`}>{(partner || item.instantAvailable !== null) && <i><img alt="" src={waiting ? serverOffIcon : serverOnIcon} /></i>}{status}</p>
          <p className="commerce-product-row__spec">{item.spec ?? '-'}</p>
        </div>
      </div>
      {item.priceChanged && <p role="status"><TranslatedText id="cart.priceChanged" /></p>}{item.issues.map((issue) => <p className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined} key={issue} role="status">{cartIssueMessage(issue)}</p>)}
      <div className="commerce-product-row__meta">
        <div className="commerce-product-row__terms">{partner ? <><span><TranslatedText id="money.productAmount" /> <strong className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(item.rentalFee)}</strong></span><b aria-hidden="true" /><span>{locale === 'ko' && '수량 '}<strong className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{t('unit.quantity', { count: item.quantity })}</strong></span></> : <><span><TranslatedText id="money.setupFee" /> <strong className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(item.setupFee)}</strong></span><b aria-hidden="true" /><span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{cartPriceLabel(item)} <strong>{money(item.rentalFee)}</strong></span><b aria-hidden="true" /><span>{locale === 'ko' && '이용기간 '}<strong className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{locale === 'ko' ? `${getCartSelectionUnits(item)}${cartUnitLabel(item)}` : cartSelectionLabel(item)}</strong></span></>}</div>
        <div className="commerce-product-row__amount">{!partner && <span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}><img alt="" src={tollIcon} />{locale === 'ko' ? <><b>{points ?? '-'}</b>{points !== null && '점 적립'}</> : <b>{points === null ? '-' : t('money.pointAmount', { points })}</b>}</span>}<strong className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(getCartItemAmount(item))}</strong></div>
      </div>
    </article>
  })}</section>
}
