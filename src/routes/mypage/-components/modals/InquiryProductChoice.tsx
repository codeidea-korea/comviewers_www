import type { ReactNode } from 'react'
import serverOnIcon from '../../../../assets/figma/icon-server-on.svg'
import modalClose from '../../../../assets/figma/inquiry-modal-close.svg'
import { Checkbox } from '../../../../components/ui/CheckboxControl'
import { type InquiryChoice } from '../inquiryChoice'

export function ProductChoiceRow({ checked = false, onCheckedChange = () => {}, product }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void; product: InquiryChoice }) {
  return (
    <label className="inquiry-product-choice__row">
      <Checkbox checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
      <span><b>{product.alias}</b><small>{product.productName}</small><small>{product.productNo}</small><small>{product.location}</small></span>
      <em><i><img alt="" src={serverOnIcon} /></i>{product.state}</em>
      <p>{product.spec}</p>
      <small><span>주문일 <b>{product.orderDate}</b></span><i/><span>이용기간 <b>{product.period}</b></span></small>
    </label>
  )
}

export function ProductChoiceContent({ actionLabel = '다음', allowEmpty = true, notice, onClose, onEmpty, onNext, onSelectedChange, selectedIndexes, products }: { actionLabel?: string; allowEmpty?: boolean; notice?: ReactNode; onClose: () => void; onEmpty?: () => void; onNext: () => void; onSelectedChange: (indexes: number[]) => void; selectedIndexes: number[]; products: InquiryChoice[] }) {
  const selectedCount = selectedIndexes.length
  const changeOne = (index: number, checked: boolean) => onSelectedChange(checked
    ? [...selectedIndexes, index].filter((value, position, values) => values.indexOf(value) === position)
    : selectedIndexes.filter((value) => value !== index))
  return (
    <section aria-modal="true" className={`inquiry-preview-dialog inquiry-product-choice${selectedCount ? ' is-selected' : ''}${products.length ? ' has-products' : ' is-empty'}`} role="dialog" tabIndex={-1}>
      <header><h2>상품 선택</h2><button aria-label="닫기" onClick={onClose} type="button"><img alt="" src={modalClose} /></button></header>
      {allowEmpty ? <button className="inquiry-product-choice__empty" onClick={() => { onSelectedChange([]); (onEmpty ?? onNext)() }} type="button">선택안함</button> : null}
      <div>{notice}{products.map((product, index) => <ProductChoiceRow checked={selectedIndexes.includes(index)} key={product.selectionId} onCheckedChange={(checked) => changeOne(index, checked)} product={product} />)}</div>
      <footer><span>선택 상품 <b>{selectedCount}개</b></span><button disabled={!selectedCount} onClick={onNext} type="button">{actionLabel}</button></footer>
    </section>
  )
}
