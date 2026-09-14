import type { CartItem } from '@/domain/cart/schemas'
import { getCartItemAmount, getCartItemPoints, getCartSelectionUnits, cartUnitLabel, cartPriceLabel } from '@/domain/cart/cartEstimate'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import windowsLogo from '@/assets/figma/windows-logo.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import tollIcon from '@/assets/figma/icon-toll-green.svg'
import { CheckoutSectionTitle, formatCheckoutMoney as money } from './CheckoutFields'

export function CheckoutProducts({ items }: { items: readonly CartItem[] }) {
  return <section className="checkout-products"><CheckoutSectionTitle>주문상품</CheckoutSectionTitle>{items.map((item) => {
    const partner = item.type === 'part'
    return <article className="commerce-product-row commerce-product-row--compact" key={item.id}>
      <header className="commerce-product-row__heading"><span>{item.label}</span>{!partner && <small>{item.location}</small>}</header>
      <div className="commerce-product-row__content">
        <div className="commerce-product-row__image">{item.image && <img alt={item.label} src={item.image} />}{!partner && <img alt="" src={windowsLogo} />}</div>
        <div className="commerce-product-row__body">
          {!partner && <p className="commerce-product-row__status">{(item.source !== 'api' || item.instantAvailable !== null) && <i><img alt="" src={(item.source === 'mock' ? item.rowKind !== 'waiting' : item.instantAvailable) ? serverOnIcon : serverOffIcon} /></i>}{item.source === 'api' ? !item.available ? '판매 불가' : item.instantAvailable === null ? '접속 상태 확인 필요' : item.instantAvailable ? '이용 가능' : '준비 중' : item.rowKind === 'waiting' ? '준비 중' : '이용 가능'}</p>}
          <p className="commerce-product-row__spec">{item.spec ?? '-'}</p>
        </div>
      </div>
      {item.priceChanged && <p role="status">가격이 변경되었습니다. 현재 금액을 확인해 주세요.</p>}{item.issues.map((issue) => <p key={issue} role="status">{cartIssueMessage(issue)}</p>)}
      <div className="commerce-product-row__meta">
        <div className="commerce-product-row__terms">{partner ? <><span>상품금액 {money(item.rentalFee)}</span><b aria-hidden="true" /><span>수량 {item.quantity}개</span></> : <><span>세팅비 {money(item.setupFee)}</span><b aria-hidden="true" /><span>{cartPriceLabel(item)} {money(item.rentalFee)}</span><b aria-hidden="true" /><span>이용기간 {getCartSelectionUnits(item)}{cartUnitLabel(item)}</span></>}</div>
        <div className="commerce-product-row__amount"><span><img alt="" src={tollIcon} /><b>{getCartItemPoints(item) ?? '-'}</b>{getCartItemPoints(item) !== null && '점 적립 예정'}</span><strong>{money(getCartItemAmount(item))}</strong></div>
      </div>
    </article>
  })}</section>
}
