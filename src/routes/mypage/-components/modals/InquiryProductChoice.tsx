import type { ReactNode } from 'react'
import serverOnIcon from '@/assets/figma/inquiry-choice-connected.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import modalClose from '@/assets/figma/inquiry-choice-close.svg'
import backIcon from '@/assets/figma/mypage-mobile-back.png'
import { Checkbox } from '../../../../components/ui/CheckboxControl'
import { NativeSelect } from '../../../../components/ui/SelectControl'
import { type InquiryChoice } from '../inquiryChoice'
import './inquiry-product-choice.css'

export function ProductChoiceRow({ checked = false, disabled = false, onCheckedChange = () => {}, product }: { checked?: boolean; disabled?: boolean; onCheckedChange?: (checked: boolean) => void; product: InquiryChoice }) {
  const formatDate = (value: string) => value.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1.$2.$3')
  return (
    <label className="inquiry-product-choice__row">
      <Checkbox checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)} />
      <span><b title={`${product.alias} · ${product.productNo}`}>{product.alias} · {product.productNo}</b><small title={product.location}>{product.location}</small><em className="inquiry-product-choice__state" data-status={product.statusRank === 3 ? 'on' : 'off'}><i><img alt="" src={product.statusRank === 3 ? serverOnIcon : serverOffIcon} /></i>{product.state}</em></span>
      <p>{product.spec}</p>
      <small><span>주문일 <b>{formatDate(product.orderDate)}</b></span><i/><span>이용기간 <b>{formatDate(product.period)}</b></span></small>
    </label>
  )
}

type ServerRoomFilter = { value: number | null; options: readonly { id: number; name: string }[]; onChange: (id: number | null) => void }

export function ProductChoiceContent({ actionLabel = '선택', allowEmpty = true, lockedIds = [], maxSelection = 20, filters, notice, onClose, onEmpty, onNext, onSelectedChange, selectedIds, products, serverRoomFilter, standalone = false, title = '상품 선택' }: { actionLabel?: string; allowEmpty?: boolean; lockedIds?: readonly number[]; maxSelection?: number; filters?: ReactNode; notice?: ReactNode; onClose: () => void; onEmpty?: () => void; onNext: () => void; onSelectedChange: (ids: number[]) => void; selectedIds: readonly number[]; products: InquiryChoice[]; serverRoomFilter?: ServerRoomFilter; standalone?: boolean; title?: string }) {
  const selectedCount = selectedIds.length
  const allSelected = products.length > 0 && products.every(product => selectedIds.includes(Number(product.rcpcId)))
  const overLimit = selectedCount > maxSelection
  const missingTargets = selectedIds.some(id => !products.some(product => Number(product.rcpcId) === id))
  const changeOne = (id: number, checked: boolean) => onSelectedChange(checked
    ? [...new Set([...selectedIds, id])]
    : selectedIds.filter(value => value !== id || lockedIds.includes(value)))
  return (
    <section aria-label={title} aria-modal={standalone ? undefined : true} className={`inquiry-preview-dialog inquiry-product-choice${selectedCount ? ' is-selected' : ''}${products.length ? ' has-products' : ' is-empty'}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
      <header>{standalone || title !== '상품 선택' ? <button aria-label="이전 화면으로" className="inquiry-flow-back" onClick={onClose} type="button"><img alt="" src={backIcon}/></button> : null}<h2>{title}</h2>{!standalone ? <button aria-label="닫기" onClick={onClose} type="button"><img alt="" src={modalClose} /></button> : null}</header>
      {filters}
      {serverRoomFilter ? <label className="inquiry-product-choice__server-room"><span>서버실</span><NativeSelect aria-label="문의 상품 서버실" disabled={!serverRoomFilter.options.length} onChange={event => serverRoomFilter.onChange(event.target.value ? Number(event.target.value) : null)} options={serverRoomFilter.options.map(room => ({ value: String(room.id), label: room.name }))} placeholder={{ label: '서버실 선택' }} value={serverRoomFilter.value ?? ''} /></label> : null}
      <label className="inquiry-product-choice__all"><Checkbox checked={allSelected} disabled={!products.length} onChange={event => onSelectedChange(event.target.checked ? [...new Set([...selectedIds, ...products.map(product => Number(product.rcpcId))])] : [...lockedIds])} /><span>모두선택</span></label>
      <div className="inquiry-product-choice__products">{notice}{products.map(product => <ProductChoiceRow checked={selectedIds.includes(Number(product.rcpcId))} disabled={lockedIds.includes(Number(product.rcpcId))} key={product.selectionId} onCheckedChange={checked => changeOne(Number(product.rcpcId), checked)} product={product} />)}</div>
      <footer>
        {overLimit ? <p className="inquiry-product-choice__limit" role="alert">최대 {maxSelection}대까지 선택할 수 있습니다. 선택한 상품을 줄여 주세요.</p> : null}
        {missingTargets ? <p role="alert">선택한 문의 대상 RCPC를 확인할 수 없습니다. 다시 확인해 주세요.</p> : null}
        {allowEmpty ? <button onClick={() => { onSelectedChange([]); (onEmpty ?? onNext)() }} type="button">선택안함</button> : null}
        <button disabled={!selectedCount || overLimit || missingTargets} onClick={onNext} type="button"><span aria-live="polite">{selectedCount ? <><b>{selectedCount}대</b> {actionLabel}</> : '다음'}</span></button>
      </footer>
    </section>
  )
}
