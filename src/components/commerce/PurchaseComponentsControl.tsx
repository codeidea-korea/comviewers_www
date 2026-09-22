export interface PurchaseItem {
  id: string
  type?: string
  quantity: number
  setupFee?: number
  rentalFee?: number
  price?: number
  available?: boolean
  label?: string
  productId?: string | number
  location?: string
  image?: string
  product?: { image?: string }
}
export interface PurchaseRowProps {
  item: PurchaseItem
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  onSelectionChange: (selected: boolean) => void
  quantity?: number
  removeLabel?: string
  rowKind?: 'partner' | 'waiting' | 'connected' | 'normal'
  selected: boolean
  spec?: string
}
export interface PurchaseSummaryProps {
  expectedTotal: number
  onBrowse?: () => void
  onPurchase: () => void
  partTotal: number
  pointTotal: number
  rentalMonthlyTotal: number
  rentalSetupTotal: number
  rentalTotal: number
  selectedCount: number
  showBrowse?: boolean
}
import windowsLogo from '../../assets/figma/windows-logo.svg'
import serverOnIcon from '../../assets/figma/icon-server-on.svg'
import serverOffIcon from '../../assets/figma/icon-server-off.svg'
import closeIcon from '../../assets/figma/product-list-close.svg'
import addIcon from '../../assets/figma/icon-add.svg'
import removeIcon from '../../assets/figma/icon-remove.svg'
import { formatWon } from '../../lib/currency'
import { Checkbox } from '../ui/CheckboxControl'
import { getEarnedPoints, getItemAmount, isPartProduct, MAX_RENTAL_MONTHS } from '../../lib/commerceCalculations'

const defaultSpec = 'Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB) '

function Money({ className = '', value }: { className?: string; value: number }) {
  const formatted = formatWon(value)
  return <span className={`cart-money${className ? ` ${className}` : ''}`}><span>{formatted.slice(0, -1)}</span><span>원</span></span>
}

/** The complete selectable product-row anatomy shared by Cart and Storage. */
export function PurchaseProductRow({ item, onQuantityChange, onRemove, onSelectionChange, quantity, removeLabel, rowKind, selected, spec = defaultSpec }: PurchaseRowProps) {
  const resolvedQuantity = quantity ?? item.quantity
  const normalizedItem = { ...item, quantity: resolvedQuantity }
  const partner = isPartProduct(normalizedItem)
  const waiting = item.available === false || rowKind === 'waiting'
  const kind = rowKind ?? (partner ? 'partner' : waiting ? 'waiting' : 'connected')
  const amount = getItemAmount(normalizedItem)
  const repeatedSpec = kind === 'normal' ? `${spec}${spec}` : spec
  const statusCopy = waiting
    ? '대기 중인 서버로, 주문 완료 시 1~24시간 이내로 관리자가 확인 후 접속 가능합니다.'
    : '구매 즉시 접속 가능합니다.'

  return <article className={`purchase-row cart-item cart-item--${kind} purchase-row--${kind}`}>
    <header className="purchase-row__header cart-item__header">
      <label><Checkbox checked={selected} onChange={(event) => onSelectionChange(event.target.checked)} />{partner ? <span className="cart-item__product-name">{item.label ?? '파트상품이름'}</span> : <span className="cart-item__number"><span>품번</span><b>{item.productId ?? 89023}</b></span>}{!partner && <small>{item.location ?? 'IRC코리아/메가서버실'}</small>}</label>
      <button aria-label={removeLabel ?? `${item.label ?? (partner ? '파트상품' : '품번 89023')} 삭제`} onClick={onRemove} type="button"><img alt="" src={closeIcon} /></button>
    </header>
    <div className="purchase-row__body cart-item__body">
      <div className="purchase-row__image cart-item__image"><img alt="Windows 11 RCPC 상품" src={item.image ?? item.product?.image} /><img alt="" src={windowsLogo} /></div>
      <div className="purchase-row__details cart-item__details">
        {!partner ? <div className="cart-item__intro"><div className={`purchase-row__status cart-item__status cart-item__status--${waiting ? 'waiting' : 'online'}`}><i><img alt="" src={waiting ? serverOffIcon : serverOnIcon} /></i><span>{statusCopy}</span></div><p className="purchase-row__spec cart-item__spec">{repeatedSpec}</p></div> : <p className="purchase-row__spec cart-item__spec">{repeatedSpec}</p>}
        {!partner && <div className="purchase-row__fees cart-item__fees"><p><span>세팅비</span><span>{formatWon(item.setupFee ?? 0)}</span></p><p><span>월 렌탈료</span><span>{formatWon(item.rentalFee ?? item.price ?? 0)}</span></p></div>}
        <div className="cart-item__bottom">
          <PurchaseQuantityControl className="purchase-row__quantity cart-quantity" maximum={partner ? undefined : MAX_RENTAL_MONTHS} onChange={onQuantityChange} quantity={resolvedQuantity} unit={partner ? '개' : '개월'} />
          <div className="purchase-row__amount cart-item__amount">{!partner && <span className="cart-item__points"><span>포인트 적립</span><span className="cart-item__point-value"><b>{getEarnedPoints(normalizedItem)}</b><span>점</span></span></span>}<Money className="cart-money--item" value={amount} /></div>
        </div>
      </div>
    </div>
  </article>
}

export function PurchaseQuantityControl({ className, maximum, onChange, quantity, unit }: { className?: string; maximum?: number; onChange: (quantity: number) => void; quantity: number; unit: string }) {
  const increaseDisabled = maximum !== undefined && quantity >= maximum
  return <div className={className}><div><button aria-label="수량 감소" disabled={quantity === 1} onClick={() => onChange(quantity - 1)} type="button"><img alt="" src={removeIcon} /></button><b>{quantity}</b><button aria-label="수량 증가" disabled={increaseDisabled} onClick={() => onChange(quantity + 1)} type="button"><img alt="" src={addIcon} /></button></div><span>{unit}</span></div>
}

/** The complete order-estimate anatomy shared by Cart and Storage. */
export function PurchaseEstimateSummary({ expectedTotal, onBrowse, onPurchase, partTotal, pointTotal, rentalMonthlyTotal, rentalSetupTotal, rentalTotal, selectedCount, showBrowse = false }: PurchaseSummaryProps) {
  return <aside className="purchase-summary cart-summary">
    <h2>주문 예상 금액</h2>
    <div className="purchase-summary__box cart-summary__box">
      <dl>
        <div className="purchase-summary__products cart-summary__products">
          <div className="cart-summary__main"><dt>렌탈상품</dt><dd><Money value={rentalTotal} /></dd></div>
          <div className="cart-summary__sub"><dt>L 세팅비</dt><dd><Money value={rentalSetupTotal} /></dd></div>
          <div className="cart-summary__sub"><dt>L 렌탈금액</dt><dd><Money value={rentalMonthlyTotal} /></dd></div>
          <div className="cart-summary__main"><dt>파트상품</dt><dd><Money value={partTotal} /></dd></div>
        </div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__points cart-summary__points"><dt>적립 포인트</dt><dd><span>{pointTotal}</span><span>점</span></dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__total cart-summary__total"><dt>예상 결제 금액</dt><dd><Money value={expectedTotal} /></dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
      </dl>
      <p>쿠폰·포인트는 결제 단계에서 사용할 수 있습니다.</p>
    </div>
    <div className="purchase-summary__actions cart-summary__actions"><button disabled={!selectedCount} onClick={onPurchase} type="button"><strong>선택 상품 {selectedCount}개</strong> 구매하기</button>{showBrowse && <button onClick={onBrowse} type="button">상품 둘러보기</button>}</div>
  </aside>
}
