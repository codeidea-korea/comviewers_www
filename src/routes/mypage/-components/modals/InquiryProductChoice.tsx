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

export function ProductChoiceContent({ actionLabel = '선택', allowEmpty = true, maxSelection = 20, notice, onClose, onEmpty, onNext, onSelectedChange, selectedIndexes, products }: { actionLabel?: string; allowEmpty?: boolean; maxSelection?: number; notice?: ReactNode; onClose: () => void; onEmpty?: () => void; onNext: () => void; onSelectedChange: (indexes: number[]) => void; selectedIndexes: number[]; products: InquiryChoice[] }) {
  const selectedCount = selectedIndexes.length
  const allSelected = products.length > 0 && products.every((_, index) => selectedIndexes.includes(index))
  const overLimit = selectedCount > maxSelection
  const changeOne = (index: number, checked: boolean) => onSelectedChange(checked
    ? [...selectedIndexes, index].filter((value, position, values) => values.indexOf(value) === position)
    : selectedIndexes.filter((value) => value !== index))
  return (
    <section aria-modal="true" className={`inquiry-preview-dialog inquiry-product-choice${selectedCount ? ' is-selected' : ''}${products.length ? ' has-products' : ' is-empty'}`} role="dialog" tabIndex={-1}>
      <header><h2>상품 선택</h2><button aria-label="닫기" onClick={onClose} type="button"><img alt="" src={modalClose} /></button></header>
      <label className="inquiry-product-choice__all"><Checkbox checked={allSelected} disabled={!products.length} indeterminate={selectedCount > 0 && !allSelected} onChange={event => onSelectedChange(event.target.checked ? products.map((_, index) => index) : [])} /><span>모두선택</span></label>
      <div className="inquiry-product-choice__products">{notice}{products.map((product, index) => <ProductChoiceRow checked={selectedIndexes.includes(index)} key={product.selectionId} onCheckedChange={(checked) => changeOne(index, checked)} product={product} />)}</div>
      <footer>
        {overLimit ? <p className="inquiry-product-choice__limit" role="alert">최대 {maxSelection}대까지 선택할 수 있습니다. 선택한 상품을 줄여 주세요.</p> : null}
        {allowEmpty ? <button onClick={() => { onSelectedChange([]); (onEmpty ?? onNext)() }} type="button">선택안함</button> : null}
        <button disabled={!selectedCount || overLimit} onClick={onNext} type="button"><span aria-live="polite">{selectedCount ? <><b>{selectedCount}대</b> {actionLabel}</> : '다음'}</span></button>
      </footer>
    </section>
  )
}
