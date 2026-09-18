import { useState } from 'react'
import type { CartItem } from '@/domain/cart/schemas'
import { getCartItemAmount, getCartItemPoints, getCartSelectionUnits, cartUnitLabel, cartPriceLabel } from '@/domain/cart/cartEstimate'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import windowsLogo from '@/assets/figma/windows-logo.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import tollIcon from '@/assets/figma/icon-toll-green.svg'
import defaultProductImage from '@/assets/figma/store/product-04.png'
import { CheckoutSectionTitle, formatCheckoutMoney as money } from './CheckoutFields'

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
  return <section className="checkout-products"><CheckoutSectionTitle>주문상품</CheckoutSectionTitle>{items.map((item) => {
    const partner = item.type === 'part'
    const waiting = !item.available || (!partner && item.instantAvailable === false)
    const status = !item.available ? '현재 주문할 수 없습니다.' : partner ? '구매 가능합니다.'
      : item.instantAvailable === null ? '접속 상태 확인 필요' : item.instantAvailable ? '구매 즉시 접속 가능합니다.' : '준비 중'
    return <article className="commerce-product-row commerce-product-row--compact" key={item.id}>
      <header className="commerce-product-row__heading">{partner ? <span>{item.label}</span> : <><span className="checkout-product-number">품번 <b>{item.productId}</b></span><small>{item.location}</small></>}</header>
      <div className="commerce-product-row__content">
        <CheckoutProductImage item={item} />
        <div className="commerce-product-row__body">
          <p className={`commerce-product-row__status${waiting ? ' commerce-product-row__status--waiting' : ''}`}>{(partner || item.instantAvailable !== null) && <i><img alt="" src={waiting ? serverOffIcon : serverOnIcon} /></i>}{status}</p>
          <p className="commerce-product-row__spec">{item.spec ?? '-'}</p>
        </div>
      </div>
      {item.priceChanged && <p role="status">가격이 변경되었습니다. 현재 금액을 확인해 주세요.</p>}{item.issues.map((issue) => <p key={issue} role="status">{cartIssueMessage(issue)}</p>)}
      <div className="commerce-product-row__meta">
        <div className="commerce-product-row__terms">{partner ? <><span>상품금액 <strong>{money(item.rentalFee)}</strong></span><b aria-hidden="true" /><span>수량 <strong>{item.quantity}개</strong></span></> : <><span>세팅비 <strong>{money(item.setupFee)}</strong></span><b aria-hidden="true" /><span>{cartPriceLabel(item)} <strong>{money(item.rentalFee)}</strong></span><b aria-hidden="true" /><span>이용기간 <strong>{getCartSelectionUnits(item)}{cartUnitLabel(item)}</strong></span></>}</div>
        <div className="commerce-product-row__amount">{!partner && <span><img alt="" src={tollIcon} /><b>{getCartItemPoints(item) ?? '-'}</b>{getCartItemPoints(item) !== null && '점 적립'}</span>}<strong>{money(getCartItemAmount(item))}</strong></div>
      </div>
    </article>
  })}</section>
}
