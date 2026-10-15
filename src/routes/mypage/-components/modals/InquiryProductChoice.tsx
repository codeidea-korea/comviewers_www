import { useUiTranslation } from '@/i18n/uiTranslation'
import { LocalizedServerRoomOption } from '@/components/mypage/LocalizedServerRoomOption'
import { useLocalizedServiceName } from '@/components/common/LocalizedServiceName'
import type { ReactNode } from 'react'
import { ProductServerState } from '@/components/product/ProductServerStateView'
import modalClose from '@/assets/figma/inquiry-choice-close.svg'
import chatClose from '@/assets/figma/inquiry-modal-close.svg'
import backChevron from '@/assets/figma/chevron-left.svg'
import { Checkbox } from '../../../../components/ui/CheckboxControl'
import { NativeSelect } from '../../../../components/ui/SelectControl'
import { type InquiryChoice } from '../inquiryChoice'
import './inquiry-product-choice.css'

export function ProductChoiceRow({ checked = false, disabled = false, onCheckedChange = () => {}, product }: { checked?: boolean; disabled?: boolean; onCheckedChange?: (checked: boolean) => void; product: InquiryChoice }) {
  const { uiText } = useUiTranslation()
  const alias = product.alias?.trim()
  const location = useLocalizedServiceName('serverRoom', product.location === '서버실 정보 없음' ? null : product.location, uiText('서버실 정보 없음'))
  const title = alias ? `${alias} · ${product.productNo}` : product.productNo
  const formatDate = (value: string) => value.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1.$2.$3')
  return (
    <label className="inquiry-product-choice__row">
      <Checkbox checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)} />
      <span><b title={title}>{title}</b><small title={location}>{location}</small><em className="inquiry-product-choice__state" data-status={product.statusRank === 3 ? 'on' : 'off'}><ProductServerState state={product.statusRank === 3 ? 'online' : 'offline'}/>{uiText(product.state)}</em></span>
      <p>{product.spec === "PC 사양 정보 없음" ? uiText(product.spec) : product.spec}</p>
      <small><span>{uiText("주문일")} <b>{formatDate(product.orderDate)}</b></span><i/><span>{uiText("이용기간")} <b>{formatDate(product.period)}</b></span></small>
    </label>
  )
}

type ServerRoomFilter = { value: number | null; options: readonly { id: number; name: string }[]; onChange: (id: number | null) => void }

export function ProductChoiceContent({ actionLabel = '선택', allowEmpty = true, busy = false, lockedIds = [], maxSelection = 20, filters, notice, selectionNotice, onClose, onEmpty, onNext, onSelectedChange, selectedIds, products, serverRoomFilter, standalone = false, title = '상품 선택', variant }: { actionLabel?: string; allowEmpty?: boolean; busy?: boolean; lockedIds?: readonly number[]; maxSelection?: number; filters?: ReactNode; notice?: ReactNode; selectionNotice?: string; onClose: () => void; onEmpty?: () => void; onNext: () => void; onSelectedChange: (ids: number[]) => void; selectedIds: readonly number[]; products: InquiryChoice[]; serverRoomFilter?: ServerRoomFilter; standalone?: boolean; title?: string; variant?: 'addition' }) {
  const { uiText, t } = useUiTranslation()
  const selectedCount = selectedIds.length
  const allSelected = products.length > 0 && products.every(product => selectedIds.includes(Number(product.rcpcId)))
  const overLimit = selectedCount > maxSelection
  const missingTargets = selectedIds.some(id => !products.some(product => Number(product.rcpcId) === id))
  const changeOne = (id: number, checked: boolean) => onSelectedChange(checked
    ? [...new Set([...selectedIds, id])]
    : selectedIds.filter(value => value !== id || lockedIds.includes(value)))
  return (
    <section aria-label={uiText(title)} aria-modal={standalone ? undefined : true} className={`inquiry-preview-dialog inquiry-product-choice${variant === 'addition' ? ' inquiry-product-choice--addition' : ''}${selectedCount ? ' is-selected' : ''}${products.length ? ' has-products' : ' is-empty'}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
      <header>{standalone || (title !== '상품 선택' && title !== uiText('상품 선택')) ? <button aria-label={uiText("이전 화면으로")} className="inquiry-flow-back" disabled={busy} onClick={onClose} type="button"><img alt="" src={backChevron}/></button> : null}<h2>{uiText(title)}</h2>{!standalone || variant === 'addition' ? <button aria-label={uiText("닫기")} disabled={busy} onClick={onClose} type="button"><img alt="" src={variant === 'addition' ? chatClose : modalClose} /></button> : null}</header>
      {filters}
      {serverRoomFilter ? <label className="inquiry-product-choice__server-room"><span>{uiText("서버실")}</span><NativeSelect aria-label={uiText("문의 상품 서버실")} disabled={!serverRoomFilter.options.length} onChange={event => serverRoomFilter.onChange(event.target.value ? Number(event.target.value) : null)} placeholder={{ label: uiText("서버실 선택") }} value={serverRoomFilter.value ?? ''}>{serverRoomFilter.options.map(room => <LocalizedServerRoomOption key={room.id} value={String(room.id)} name={room.name === '서버실 정보 없음' ? null : room.name} fallback={uiText('서버실 정보 없음')} />)}</NativeSelect></label> : null}
      <label className="inquiry-product-choice__all"><Checkbox checked={allSelected} disabled={busy || !products.length} onChange={event => onSelectedChange(event.target.checked ? [...new Set([...selectedIds, ...products.map(product => Number(product.rcpcId))])] : [...lockedIds])} /><span>{uiText("모두선택")}</span></label>
      <div className="inquiry-product-choice__products">{notice}{products.map(product => <ProductChoiceRow checked={selectedIds.includes(Number(product.rcpcId))} disabled={busy || lockedIds.includes(Number(product.rcpcId))} key={product.selectionId} onCheckedChange={checked => changeOne(Number(product.rcpcId), checked)} product={product} />)}</div>
      <footer>
        {overLimit ? <p className="inquiry-product-choice__limit" role="alert">{t("mypageSupport.selectionLimit", { count: maxSelection })}</p> : null}
        {missingTargets ? <p role="alert">{uiText("선택한 문의 대상 RCPC를 확인할 수 없습니다. 다시 확인해 주세요.")}</p> : null}
        {selectionNotice ? <p className="inquiry-product-choice__selection-notice" role="alert">{uiText(selectionNotice)}</p> : null}
        {allowEmpty ? <button onClick={() => { onSelectedChange([]); (onEmpty ?? onNext)() }} type="button">{uiText("선택안함")}</button> : null}
        <button disabled={busy || !selectedCount || overLimit || missingTargets} onClick={onNext} type="button"><span aria-live="polite">{selectedCount ? <><b>{selectedCount}{uiText("대")}</b> {uiText(actionLabel)}</> : variant === 'addition' ? uiText(actionLabel) : uiText("다음")}</span></button>
      </footer>
    </section>
  )
}
