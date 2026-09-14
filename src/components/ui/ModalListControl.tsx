import type { Product } from '../../domain/products/types'

export interface ModalListProps { checked?: boolean; onCheckedChange?: (checked: boolean) => void; product: Pick<Product, 'productId' | 'os' | 'cpu' | 'ram' | 'disk' | 'gpu'>; status?: string; type?: 'product-add' | 'inquiry-product' | 'summary' | 'extension' }
import serverLink from '../../assets/figma/server-link.svg'
import checkboxCheckIcon from '../../assets/figma/auth-checkbox-check.svg'
import { Checkbox } from './CheckboxControl'

export function ModalList({
  checked = true,
  onCheckedChange,
  product,
  status,
  type = 'product-add',
}: ModalListProps) {
  const isProductAdd = type === 'product-add'
  const isInquiryProduct = type === 'inquiry-product'
  const hasMeta = isProductAdd || isInquiryProduct
  const title = type === 'extension' ? `품번 ${product.productId}` : `게임용_${product.productId}`

  return (
    <article className={`modal-list modal-list--${type}`}>
      <div className="modal-list__title">
        {isProductAdd && onCheckedChange ? (
          <Checkbox
            aria-label={`상품 ${product.productId} 선택`}
            checked={checked}
            checkIcon={checkboxCheckIcon}
            inputClassName="modal-list__check"
            onChange={(event) => onCheckedChange(event.target.checked)}
          />
        ) : isProductAdd && checked ? <span aria-label="선택됨" className="modal-list__check-display" role="img"><img alt="" src={checkboxCheckIcon} /></span> : null}
        {isInquiryProduct ? <strong className="modal-list__status">[{status || '처리중'}]</strong> : null}
        <strong>{title}</strong>
        {type !== 'extension' ? <span className="tag tag--gray">IRC코리아/메가서버실</span> : null}
        {isProductAdd ? (
          <span className="modal-list__server-state">
            <span className="modal-list__server-icon"><img alt="" src={serverLink} /></span>
            {status || '이용중'}
          </span>
        ) : null}
      </div>
      <p>{product.os} / {product.cpu} / {product.ram} / {product.disk} / {product.gpu}</p>
      {hasMeta ? (
        <div className="modal-list__meta">
          <span><small>주문일</small> <strong>2026.07.01</strong></span>
          <span><small>이용기간</small> <strong>2026.07.01~2026.07.31</strong></span>
        </div>
      ) : null}
    </article>
  )
}
