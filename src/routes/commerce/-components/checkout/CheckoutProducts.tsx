import { PcSpecSummary } from '@/components/product/PcSpecSummary'
import { useUiTranslation } from '@/i18n/uiTranslation'
import type { CartItem } from '@/domain/cart/schemas'
import { getCartItemAmount, getCartItemPoints, getCartSelectionUnits, cartUnitLabel, cartSelectionLabel, cartPriceLabel } from '@/domain/cart/cartEstimate'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import { productOsVisual } from '@/components/product/productOsVisual'
import { ProductOsOverlay } from '@/components/product/ProductOsOverlay'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import tollIcon from '@/assets/figma/icon-toll-green.svg'
import { CheckoutSectionTitle, formatCheckoutMoney as money } from './CheckoutFields'
import { TranslatedText } from '@/i18n/translation'
import type { OrderBenefitQuote } from '@/api/ordersPayments'

function CheckoutProductImage({ item }: { item: CartItem }) {
  const { uiText } = useUiTranslation()
  const visual = productOsVisual(item.osFilterValue, item.type === 'part', item.image)
  return <div className="commerce-product-row__image">
    <img className="checkout-product-image" alt={visual.label ? uiText('{name} 상품 이미지', { name: visual.label }) : uiText('상품 기본 이미지')} src={visual.image} />
    {!item.image ? <ProductOsOverlay label={visual.label} /> : null}
  </div>
}

export function CheckoutProducts({ items, benefits, refreshing }: { items: readonly CartItem[]; benefits?: OrderBenefitQuote; refreshing: boolean }) {
  const { uiText, locale, t } = useUiTranslation()
  return <section className="checkout-products"><CheckoutSectionTitle>{uiText("주문상품")}</CheckoutSectionTitle>{items.map((item) => {
    const partner = item.type === 'part'
    const waiting = !item.available || (!partner && item.instantAvailable === false)
    const status = !item.available ? <TranslatedText id="checkout.unavailable" /> : partner ? uiText('구매 가능합니다.')
      : item.instantAvailable === null ? <TranslatedText id="product.connectionUnknown" />: item.instantAvailable ? uiText('구매 즉시 접속 가능합니다.') : <TranslatedText id="product.preparing" />
    const points = benefits?.itemExpectedPoints?.find((row) => String(row.cartItemId) === item.id)?.expectedPoints ?? getCartItemPoints(item)
    return <article className={`commerce-product-row commerce-product-row--compact${partner ? ' commerce-product-row--partner' : ''}`} key={item.id}>
      <header className="commerce-product-row__heading"><span className="checkout-product-number"><TranslatedText id="product.number" /> <b>{item.productId}</b></span>{partner ? <span>{item.label}</span> : <small>{item.location}</small>}</header>
      <div className="commerce-product-row__content">
        <CheckoutProductImage item={item} />
        <div className="commerce-product-row__body">
          <p className={`commerce-product-row__status${waiting ? ' commerce-product-row__status--waiting' : ''}`}>{(partner || item.instantAvailable !== null) && <i><img alt="" src={waiting ? serverOffIcon : serverOnIcon} /></i>}{status}</p>
          <p className="commerce-product-row__spec">{partner ? item.spec ?? '-' : <PcSpecSummary text={item.spec} showMissingCores />}</p>
        </div>
      </div>
      {item.priceChanged && <p role="status"><TranslatedText id="cart.priceChanged" /></p>}{item.issues.map((issue) => <p className="notranslate" translate="no" key={issue} role="status">{uiText(cartIssueMessage(issue))}</p>)}
      <div className="commerce-product-row__meta">
        <div className="commerce-product-row__terms">{partner ? <><span><TranslatedText id="money.productAmount" /> <strong className="notranslate" translate="no">{money(item.rentalFee)}</strong></span><b aria-hidden="true" /><span>{locale === 'ko' && '수량 '}<strong className="notranslate" translate="no">{t('unit.quantity', { count: item.quantity })}</strong></span></> : <><span><TranslatedText id="money.setupFee" /> <strong className="notranslate" translate="no">{money(item.setupFee)}</strong></span><b aria-hidden="true" /><span className="notranslate" translate="no">{cartPriceLabel(item)} <strong>{money(item.rentalFee)}</strong></span><b aria-hidden="true" /><span>{locale === 'ko' && '이용기간 '}<strong className="notranslate" translate="no">{locale === 'ko' ? `${getCartSelectionUnits(item)}${cartUnitLabel(item)}` : cartSelectionLabel(item)}</strong></span></>}</div>
        <div className="commerce-product-row__amount">{!partner && <span className="notranslate" translate="no"><img alt="" src={tollIcon} />{locale === 'ko' ? <><b>{refreshing ? '-' : points ?? '-'}</b>{!refreshing && points !== null && '점 적립'}</> : <b>{refreshing || points === null ? '-' : t('money.pointAmount', { points })}</b>}</span>}<strong className="notranslate" translate="no">{money(getCartItemAmount(item))}</strong></div>
      </div>
    </article>
  })}</section>
}
