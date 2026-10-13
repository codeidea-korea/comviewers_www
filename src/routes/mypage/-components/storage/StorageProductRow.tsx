import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { CommerceMoney as CartMoney } from '@/components/common/CommerceMoney'
import defaultImage from '@/assets/figma/store/product-04.png'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import './storage-products.css'

interface Props {
  productNo: string | null
  title: string
  serverRoom: string | null
  imageUrl?: string | null
  description: ReactNode
  instantAvailable?: boolean
  fees: readonly { label: string; amount: number | null }[]
  quantity: ReactNode
  amount: number
  points: number
  selected: boolean
  disabled?: boolean
  onSelect: (checked: boolean) => void
}

// Share the current cart's presentation, not its cart mutation or pricing rules.
export function StorageProductRow({ productNo, title, serverRoom, imageUrl, description, instantAvailable, fees, quantity, amount, points, selected, disabled, onSelect }: Props) {
  const image = imageUrl && /^(https?:\/\/|\/[^/])/.test(imageUrl) ? imageUrl : defaultImage
  return <article className="purchase-row cart-item storage-product-row">
    <header className="purchase-row__header cart-item__header"><label>
      <Checkbox aria-label={`${productNo ?? title} 선택`} checked={selected} disabled={disabled} onChange={event => onSelect(event.target.checked)} />
      <span className="cart-item__number">품번 <b>{productNo ?? '-'}</b></span><small>{serverRoom ?? '-'}</small>
    </label></header>
    <div className="purchase-row__body cart-item__body">
      <div className="purchase-row__image cart-item__image"><img alt={title} src={image}/></div>
      <div className="purchase-row__details cart-item__details">
        <div className="cart-item__intro"><strong className="cart-item__title">{title}</strong>
          {instantAvailable !== undefined ? <div className={`purchase-row__status cart-item__status cart-item__status--${instantAvailable ? 'online' : 'waiting'}`}><i><img alt="" src={instantAvailable ? serverOnIcon : serverOffIcon}/></i><span>{instantAvailable ? '결제 후 바로 접속 가능합니다.' : '접속 준비 상태를 확인해 주세요.'}</span></div> : null}
          <p className="purchase-row__spec cart-item__spec">{description}</p>
        </div>
        <div className="purchase-row__fees cart-item__fees">{fees.map(fee => <p key={fee.label}>{fee.label}<span><CartMoney value={fee.amount}/></span></p>)}</div>
        <div className="cart-item__bottom"><div className="purchase-row__quantity storage-product-row__quantity">{quantity}</div>
          <div className="purchase-row__amount cart-item__amount"><span className="cart-item__points">포인트 적립 <span className="cart-item__point-value"><b>{points.toLocaleString('ko-KR')}</b><span>점</span></span></span><CartMoney className="cart-money--item" value={amount}/></div>
        </div>
      </div>
    </div>
  </article>
}
