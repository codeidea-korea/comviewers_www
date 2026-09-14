import windowsLogo from '@/assets/figma/windows-logo.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import closeIcon from '@/assets/figma/product-list-close.svg'
import addIcon from '@/assets/figma/icon-add.svg'
import removeIcon from '@/assets/figma/icon-remove.svg'
import defaultProductImage from '@/assets/figma/windows-card-render.png'
import { Checkbox } from '@/components/ui/CheckboxControl'
import type { CartItem } from '@/domain/cart/schemas'
import { getCartItemAmount, getCartItemPoints, getCartSelectionUnits, cartUnitLabel, cartPriceLabel } from '@/domain/cart/cartEstimate'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import { CartMoney } from './CartMoney'

interface Props {
  item: CartItem
  selected: boolean
  disabled: boolean
  onToggle: () => void
  onRemove: () => void
  onQuantityChange: (quantity: number) => void
}

export function CartProductRow({ item, selected, disabled, onToggle, onRemove, onQuantityChange }: Props) {
  const partner = item.type === 'part'
  const waiting = item.source === 'mock' ? item.rowKind === 'waiting' : item.instantAvailable === false
  const units = getCartSelectionUnits(item)
  const quantityDisabled = disabled || !item.quantityEditable
  const kind = item.rowKind
  const increased = item.maximumQuantity !== null && units >= item.maximumQuantity
  const statusCopy = item.source === 'api' ? (!item.available ? '현재 주문할 수 없습니다.' : item.instantAvailable === null ? '접속 상태 확인 필요' : item.instantAvailable ? '이용 가능' : '준비 중') : waiting
    ? '대기 중인 서버로, 주문 완료 시 1~24시간 이내로 관리자가 확인 후 접속 가능합니다.'
    : '구매 즉시 접속 가능합니다.'
  return <article className={`purchase-row cart-item cart-item--${kind} purchase-row--${kind}`}>
    <header className="purchase-row__header cart-item__header">
      <label><Checkbox checked={selected} disabled={disabled} onChange={onToggle} />{partner ? <span className="cart-item__product-name">{item.label}</span> : <span className="cart-item__number"><span>품번</span><b>{item.productId}</b></span>}{!partner && <small>{item.location}</small>}</label>
      <button aria-label={`${item.label} 삭제`} disabled={disabled} onClick={onRemove} type="button"><img alt="" src={closeIcon} /></button>
    </header>
    <div className="purchase-row__body cart-item__body">
      <div className="purchase-row__image cart-item__image">{(item.image || !partner) && <img alt={item.label} src={item.image ?? defaultProductImage} />}{!partner && <img alt="" src={windowsLogo} />}</div>
      <div className="purchase-row__details cart-item__details">
        {!partner ? <div className="cart-item__intro"><div className={`purchase-row__status cart-item__status cart-item__status--${waiting ? 'waiting' : 'online'}`}>{(item.source !== 'api' || item.instantAvailable !== null) && <i><img alt="" src={waiting ? serverOffIcon : serverOnIcon} /></i>}<span>{statusCopy}</span></div><p className="purchase-row__spec cart-item__spec">{item.spec ?? '-'}</p></div> : <p className="purchase-row__spec cart-item__spec">{item.spec ?? '-'}</p>}
        {!partner && <div className="purchase-row__fees cart-item__fees"><p><span>세팅비</span><span><CartMoney value={item.setupFee} /></span></p><p><span>{cartPriceLabel(item)}</span><span><CartMoney value={item.rentalFee} /></span></p></div>}
        {item.priceChanged && <p role="status">가격이 변경되었습니다. 현재 금액을 확인해 주세요.</p>}{item.issues.map((issue) => <p key={issue} role="status">{cartIssueMessage(issue)}</p>)}
        <div className="cart-item__bottom">
          <div className="purchase-row__quantity cart-quantity"><div><button aria-label="수량 감소" disabled={quantityDisabled || units <= item.minimumQuantity} onClick={() => onQuantityChange(Math.min(item.maximumQuantity ?? Number.MAX_SAFE_INTEGER, units - 1))} type="button"><img alt="" src={removeIcon} /></button><b>{units}</b><button aria-label="수량 증가" disabled={quantityDisabled || increased} onClick={() => onQuantityChange(Math.max(item.minimumQuantity, units + 1))} type="button"><img alt="" src={addIcon} /></button></div><span>{cartUnitLabel(item)}</span></div>
          <div className="purchase-row__amount cart-item__amount">{!partner && <span className="cart-item__points"><span>포인트 적립</span><span className="cart-item__point-value"><b>{getCartItemPoints(item) ?? '-'}</b>{getCartItemPoints(item) !== null && <span>점</span>}</span></span>}<CartMoney className={`cart-money--item${!partner && increased ? ' cart-money--item--expanded' : ''}`} value={getCartItemAmount(item)} /></div>
        </div>
      </div>
    </div>
  </article>
}
