import type { ReactNode } from 'react'
import serverOnIcon from '../../../../assets/figma/icon-server-on.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import modalClose from '../../../../assets/figma/inquiry-modal-close.svg'
import backIcon from '@/assets/figma/mypage-mobile-back.png'
import { Checkbox } from '../../../../components/ui/CheckboxControl'
import { type InquiryChoice } from '../inquiryChoice'

export function ProductChoiceRow({ checked = false, onCheckedChange = () => {}, product }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void; product: InquiryChoice }) {
  return (
    <label className="inquiry-product-choice__row">
      <Checkbox checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
      <span><b title={`${product.alias} · ${product.productNo}`}>{product.alias} · {product.productNo}</b><small title={product.location}>{product.location}</small><em className="inquiry-product-choice__state" data-status={product.statusRank === 3 ? 'on' : 'off'}><i><img alt="" src={product.statusRank === 3 ? serverOnIcon : serverOffIcon} /></i>{product.state}</em></span>
      <p>{product.spec}</p>
      <small><span>주문일 <b>{product.orderDate}</b></span><i/><span>이용기간 <b>{product.period}</b></span></small>
    </label>
  )
}

export function ProductChoiceContent({ actionLabel = '선택', allowEmpty = true, maxSelection = 20, notice, onClose, onEmpty, onNext, onSelectedChange, selectedIndexes, products, standalone = false, title = '상품 선택' }: { actionLabel?: string; allowEmpty?: boolean; maxSelection?: number; notice?: ReactNode; onClose: () => void; onEmpty?: () => void; onNext: () => void; onSelectedChange: (indexes: number[]) => void; selectedIndexes: number[]; products: InquiryChoice[]; standalone?: boolean; title?: string }) {
  const selectedCount = selectedIndexes.length
  const allSelected = products.length > 0 && products.every((_, index) => selectedIndexes.includes(index))
  const overLimit = selectedCount > maxSelection
  const changeOne = (index: number, checked: boolean) => onSelectedChange(checked
    ? [...selectedIndexes, index].filter((value, position, values) => values.indexOf(value) === position)
    : selectedIndexes.filter((value) => value !== index))
  return (
    <section aria-label={standalone ? title : undefined} aria-modal={standalone ? undefined : true} className={`inquiry-preview-dialog inquiry-product-choice${selectedCount ? ' is-selected' : ''}${products.length ? ' has-products' : ' is-empty'}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
      <header>{standalone || title !== '상품 선택' ? <button aria-label="이전 화면으로" className="inquiry-flow-back" onClick={onClose} type="button"><img alt="" src={backIcon}/></button> : null}<h2>{title}</h2>{!standalone ? <button aria-label="닫기" onClick={onClose} type="button"><img alt="" src={modalClose} /></button> : null}</header>
      <label className="inquiry-product-choice__all"><Checkbox checked={allSelected} disabled={!products.length} onChange={event => onSelectedChange(event.target.checked ? products.map((_, index) => index) : [])} /><span>모두선택</span></label>
      <div className="inquiry-product-choice__products">{notice}{products.map((product, index) => <ProductChoiceRow checked={selectedIndexes.includes(index)} key={product.selectionId} onCheckedChange={(checked) => changeOne(index, checked)} product={product} />)}</div>
      <footer>
        {overLimit ? <p className="inquiry-product-choice__limit" role="alert">최대 {maxSelection}대까지 선택할 수 있습니다. 선택한 상품을 줄여 주세요.</p> : null}
        {allowEmpty ? <button onClick={() => { onSelectedChange([]); (onEmpty ?? onNext)() }} type="button">선택안함</button> : null}
        <button disabled={!selectedCount || overLimit} onClick={onNext} type="button"><span aria-live="polite">{selectedCount ? <><b>{selectedCount}대</b> {actionLabel}</> : '다음'}</span></button>
      </footer>
    </section>
  )
}
