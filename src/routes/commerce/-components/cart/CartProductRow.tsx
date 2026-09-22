import windowsLogo from '@/assets/figma/windows-logo.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import closeIcon from '@/assets/figma/product-list-close.svg'
import addIcon from '@/assets/figma/icon-add.svg'
import removeIcon from '@/assets/figma/icon-remove.svg'
import defaultPartProductImage from '@/assets/figma/cart-product-partner.png'
import defaultProductImage from '@/assets/figma/windows-card-render.png'
import { Checkbox } from '@/components/ui/CheckboxControl'
import type { CartItem } from '@/domain/cart/schemas'
import { getCartItemAmount, getCartItemPoints, getCartSelectionUnits, cartUnitLabel, cartSelectionLabel, cartPriceLabel } from '@/domain/cart/cartEstimate'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import { CartMoney } from './CartMoney'
import { TranslatedText, useTranslation } from '@/i18n/translation'

interface Props {
  item: CartItem
  selected: boolean
  disabled: boolean
  quantityUpdating: boolean
  onToggle: () => void
  onRemove: () => void
  onQuantityChange: (quantity: number) => void
}

export function CartProductRow({ item, selected, disabled, quantityUpdating, onToggle, onRemove, onQuantityChange }: Props) {
  const { locale, t } = useTranslation()
  const partner = item.type === 'part'
  const fallbackImage = partner ? defaultPartProductImage : defaultProductImage
  const waiting = item.instantAvailable === false
  const soldOut = item.issues.includes('SOLD_OUT')
  const stockReserved = item.issues.includes('STOCK_RESERVED')
  const hasStockNotice = soldOut || stockReserved
  const hasNotice = !hasStockNotice && (item.priceChanged || item.issues.length > 0)
  const units = getCartSelectionUnits(item)
  const quantityDisabled = quantityUpdating || !item.quantityEditable
  const kind = item.rowKind
  const increased = item.maximumQuantity !== null && units >= item.maximumQuantity
  const statusCopy = t(!item.available ? 'checkout.unavailable' : item.instantAvailable === null ? 'product.connectionUnknown' : item.instantAvailable ? 'product.available' : 'product.preparing')
  const points = getCartItemPoints(item)
  return <article className={`purchase-row cart-item cart-item--${kind} purchase-row--${kind}${hasNotice ? ' cart-item--has-notice' : ''}`}>
    {soldOut && <div className="cart-item__sold-out" role="status">[품절] <TranslatedText id="cart.soldOut" /> 선택을 해제한 후 주문해 주세요.</div>}
    {!soldOut && stockReserved && <div className="cart-item__sold-out" role="status">[결제 대기] <TranslatedText id="cart.stockReserved" /> 선택을 해제한 후 주문해 주세요.</div>}
    <header className="purchase-row__header cart-item__header">
      <label><Checkbox checked={selected} disabled={disabled} onChange={onToggle} />{partner ? <span className="cart-item__product-name">{item.label}</span> : <span className="cart-item__number"><TranslatedText id="product.number" /><b>{item.productId}</b></span>}{!partner && <small>{item.location}</small>}</label>
      <button aria-label={`${item.label} 삭제`} disabled={disabled} onClick={onRemove} type="button"><img alt="" src={closeIcon} /></button>
    </header>
    <div className="purchase-row__body cart-item__body">
      <div className="purchase-row__image cart-item__image"><img alt={item.label} onError={(event) => {
        if (event.currentTarget.dataset.fallbackApplied === 'true') return
        event.currentTarget.dataset.fallbackApplied = 'true'
        event.currentTarget.src = fallbackImage
      }} src={item.image ?? fallbackImage} />{!partner && <img alt="" src={windowsLogo} />}</div>
      <div className="purchase-row__details cart-item__details">
        {!partner ? <div className="cart-item__intro"><div className={`purchase-row__status cart-item__status cart-item__status--${waiting ? 'waiting' : 'online'}`}>{item.instantAvailable !== null && <i><img alt="" src={waiting ? serverOffIcon : serverOnIcon} /></i>}<span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{statusCopy}</span></div><p className="purchase-row__spec cart-item__spec">{item.spec ?? '-'}</p></div> : <p className="purchase-row__spec cart-item__spec">{item.spec ?? '-'}</p>}
        {!partner && <div className="purchase-row__fees cart-item__fees"><p><TranslatedText id="money.setupFee" /><span><CartMoney value={item.setupFee} /></span></p><p><span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{cartPriceLabel(item)}</span><span><CartMoney value={item.rentalFee} /></span></p></div>}
        {!hasStockNotice && <>
          {item.priceChanged && <p className="cart-item__notice" role="status"><TranslatedText id="cart.priceChanged" /></p>}
          {item.issues.map(issue => <p className="cart-item__notice" key={issue} role="status"><span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{cartIssueMessage(issue)}</span></p>)}
        </>}
        <div className="cart-item__bottom">
          <div aria-busy={quantityUpdating} className={`purchase-row__quantity cart-quantity${import.meta.env.DEV ? ' notranslate' : ''}`} translate={import.meta.env.DEV ? 'no' : undefined}><div><button aria-label={t('cart.decreaseQuantity')} disabled={quantityDisabled || units <= item.minimumQuantity} onClick={() => onQuantityChange(Math.min(item.maximumQuantity ?? Number.MAX_SAFE_INTEGER, units - 1))} type="button"><img alt="" src={removeIcon} /></button><b style={locale === 'ko' ? undefined : { width: 'auto', minWidth: 50, paddingInline: 8 }}>{locale === 'ko' ? units : cartSelectionLabel(item)}</b><button aria-label={t('cart.increaseQuantity')} disabled={quantityDisabled || increased} onClick={() => onQuantityChange(Math.max(item.minimumQuantity, units + 1))} type="button"><img alt="" src={addIcon} /></button></div>{locale === 'ko' && <span>{cartUnitLabel(item)}</span>}</div>
          <div className="purchase-row__amount cart-item__amount">{!partner && <span className="cart-item__points"><TranslatedText id="cart.pointsToEarn" /><span className={`cart-item__point-value${import.meta.env.DEV ? ' notranslate' : ''}`} translate={import.meta.env.DEV ? 'no' : undefined}>{locale === 'ko' ? <><b>{points ?? '-'}</b>{points !== null && <span>점</span>}</> : <b>{points === null ? '-' : t('money.pointAmount', { points })}</b>}</span></span>}<CartMoney className="cart-money--item" value={getCartItemAmount(item)} /></div>
        </div>
      </div>
    </div>
  </article>
}
