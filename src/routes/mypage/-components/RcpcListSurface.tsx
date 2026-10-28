import { useUiTranslation } from '@/i18n/uiTranslation'
import { LocalizedServiceName } from '@/components/common/LocalizedServiceName'
import { InquiryAction } from './inquiries/InquiryAction'
import { InquirySearchAction } from './inquiries/InquirySearchAction'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { MyRcpcItem, MyRcpcQuery } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useServices } from '@/app/ServiceProvider'
import { Checkbox } from '@/components/ui/CheckboxControl'

import { RcpcReboot, RcpcWanIp } from './RcpcDeviceActions'
import { RcpcFavoriteButton } from './RcpcFavoriteButton'
import { RcpcAliasButton, RcpcPeriodLabel, RcpcSpecButton, RcpcTablePeriod } from './RcpcItemTools'
import { RcpcRemoteAccess } from './RcpcRemoteAccess'
import { extensionBlocked, extensionTarget, rentalActionsEnded, rentalResumptionWaiting } from './rcpcPresentation'
import { RcpcStatusContents } from './rcpc/RcpcStatusContents'
import { RcpcExtensionAction } from './rcpc/RcpcExtensionAction'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import { useRcpcDateBoundary } from './rcpc/useRcpcDateBoundary'
import { InquiryRefundApplicationDialog } from './InquiryRefundApplication'
import { nextSortConfig, SortButton, type SortConfig } from '@/components/ui/SortButtonControl'
import sortIcon from '@/assets/figma/icon-unfold-less.svg'
import { RcpcSelectionMenu } from './RcpcSelectionMenu'
import { RcpcLatestInquiry } from './rcpc/RcpcLatestInquiry'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type SortKey = NonNullable<MyRcpcQuery['sort']>

const columns: ReadonlyArray<{ label: string; sort?: SortKey }> = [
  { label: 'RCPC', sort: 'productNo' },
  { label: '서버 위치', sort: 'serverRoom' },
  { label: '서버 상태', sort: 'serverStatus' },
  { label: '이용 기간', sort: 'servicePeriod' },
  { label: '접속 정보' },
  { label: '최근 문의' },
  { label: '빠른 실행' },
]

export function RcpcListSurface({ api, canEditAlias, canExtend, emptyMessage, items, totalCount, loadAll, mutations, onSort, pending = false, sortConfig }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  emptyMessage: string
  items: readonly MyRcpcItem[]
  totalCount: number
  loadAll: (signal: AbortSignal) => Promise<MyRcpcItem[]>
  mutations?: RcpcMutations
  onSort: (sort: SortConfig<SortKey>) => void
  pending?: boolean
  sortConfig: SortConfig<SortKey>
}) {
  const { uiText, t } = useUiTranslation()
  const { myAccount } = useServices()
  const [selectedRentalSelectionIds, setSelectedRentalSelectionIds] = useState<readonly number[]>([])
  const [refundRentalIds, setRefundRentalIds] = useState<readonly number[] | null>(null)
  const refundTriggerRef = useRef<HTMLButtonElement>(null)
  const refundReturnFocusRef = useRef<HTMLElement>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<readonly MyRcpcItem[]>([])
  const [selectingAll, setSelectingAll] = useState(false)
  const [selectionError, setSelectionError] = useState(false)
  const selectionRequest = useRef<AbortController | null>(null)
  useEffect(() => () => { selectionRequest.current?.abort() }, [])
  const selectedSet = new Set(selectedRentalSelectionIds)
  const combinedItems = [...new Map([...selectedSnapshot, ...items].map(item => [item.rentalId, item] as const)).values()]
  const selectedItems = combinedItems.filter(item => selectedSet.has(item.rentalId))
  const selectedRentalIds = selectedItems.map(item => item.rentalId)
  const allSelected = totalCount > 0 && (selectedRentalSelectionIds.length === totalCount || (selectedSnapshot.length === totalCount && selectedSnapshot.every(item => selectedSet.has(item.rentalId))))
  const showRentalActions = combinedItems.some(item => !rentalActionsEnded(item))
  const showExtensionActions = combinedItems.some(item => !rentalActionsEnded(item) || rentalResumptionWaiting(item))
  const toggle = (item: MyRcpcItem, checked: boolean) => {
    setSelectedRentalSelectionIds(previous => checked
      ? previous.includes(item.rentalId) ? previous : [...previous, item.rentalId]
      : previous.filter(value => value !== item.rentalId))
    setSelectedSnapshot(previous => checked
      ? [...previous.filter(candidate => candidate.rentalId !== item.rentalId), item]
      : previous.filter(candidate => candidate.rentalId !== item.rentalId))
  }
  const toggleAll = async (checked: boolean) => {
    if (!checked) { selectionRequest.current?.abort(); setSelectedRentalSelectionIds([]); setSelectedSnapshot([]); setSelectionError(false); return }
    const controller = new AbortController()
    selectionRequest.current = controller
    setSelectingAll(true)
    setSelectionError(false)
    try {
      const all = await loadAll(controller.signal)
      if (controller.signal.aborted) return
      setSelectedSnapshot(all)
      setSelectedRentalSelectionIds([...new Set(all.map(item => item.rentalId))])
    } catch {
      if (!controller.signal.aborted) setSelectionError(true)
    } finally {
      if (!controller.signal.aborted) setSelectingAll(false)
    }
  }
  return <>
    <div className="rcpc-list__bulk-actions" inert={pending || selectingAll}>
      <Checkbox checked={allSelected} className="rcpc-list__bulk-select" disabled={totalCount === 0} indeterminate={selectedRentalSelectionIds.length > 0 && !allSelected} onChange={event => void toggleAll(event.target.checked)} visualClassName="">{uiText("모두선택")}</Checkbox>
      <span role="status">{t('mypageRcpc.selectedCount', { count: selectedRentalSelectionIds.length })}</span>
      <RcpcSelectionMenu label={uiText("선택한 RCPC 처리")} className="rcpc-list__bulk-action-buttons" nativeOnMobile>
        <InquiryAction appearance="text" disabled={selectedRentalSelectionIds.length === 0 || selectedItems.length !== selectedRentalSelectionIds.length} fixedTarget initialIds={[...new Set(selectedItems.map(item => item.pcAssetId))]} initialTargets={selectedItems} key={`inquiry:${selectedRentalSelectionIds.join(',')}`}>{uiText("문의")}</InquiryAction>
        {showRentalActions ? <button disabled={selectedRentalIds.length === 0 || selectedItems.length !== selectedRentalSelectionIds.length || selectedItems.some(rentalActionsEnded) || !myAccount.inquiryApi} onClick={() => { refundReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : refundTriggerRef.current; setRefundRentalIds([...selectedRentalIds]) }} ref={refundTriggerRef} type="button">{uiText("해지신청")}</button> : null}
        {showExtensionActions ? canExtend && selectedItems.length && selectedItems.length === selectedRentalSelectionIds.length && !selectedItems.some(extensionBlocked) ? <RcpcExtensionCheckout api={api} displayTargets={selectedItems.map(extensionTarget)} key={`extension:${selectedRentalIds.join(',')}`} rentalIds={selectedRentalIds} triggerLabel={uiText("기간연장")}/> : <button disabled type="button">{uiText("기간연장")}</button> : null}
      </RcpcSelectionMenu>
    </div>
    {selectingAll ? <p role="status">{uiText("정보를 불러오는 중입니다.")}</p> : null}
    {selectionError ? <p role="alert">{uiText("이용 RCPC를 불러오지 못했습니다.")} {uiText("다시 시도")}</p> : null}
    {refundRentalIds && myAccount.inquiryApi ? <InquiryRefundApplicationDialog api={myAccount.inquiryApi} initialRentalIds={refundRentalIds} onClose={() => setRefundRentalIds(null)} onComplete={() => { setRefundRentalIds(null); setSelectedRentalSelectionIds([]); setSelectedSnapshot([]) }} returnFocusRef={refundReturnFocusRef}/> : null}
    <RcpcListTable api={api} canEditAlias={canEditAlias} canExtend={canExtend} emptyMessage={emptyMessage} items={items} mutations={mutations} onSort={onSort} pending={pending} sortConfig={sortConfig} selection={{
      header: <Checkbox aria-label={uiText("모두선택")} checked={allSelected} disabled={pending || selectingAll || totalCount === 0} indeterminate={selectedRentalSelectionIds.length > 0 && !allSelected} onChange={event => void toggleAll(event.target.checked)}/>,
      isSelected: item => selectedRentalSelectionIds.includes(item.rentalId),
      isDisabled: () => selectingAll,
      onChange: (item, checked) => toggle(item, checked),
    }}/>
  </>
}

export function RcpcListTable({ api, canEditAlias, canExtend, emptyMessage, items, mutations, onSort, pending = false, sortConfig, selection }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  emptyMessage: string
  items: readonly MyRcpcItem[]
  mutations?: RcpcMutations
  onSort: (sort: SortConfig<SortKey>) => void
  pending?: boolean
  sortConfig: SortConfig<SortKey>
  selection: {
    header: ReactNode
    isSelected: (item: MyRcpcItem) => boolean
    isDisabled: (item: MyRcpcItem) => boolean
    onChange: (item: MyRcpcItem, checked: boolean) => void
  }
}) {
  const { uiText, locale } = useUiTranslation()
  useRcpcDateBoundary(api.organizationId)
  // CSS-hidden rows still mount effects; only mount the visible layout.
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const header = (column: { label: string; sort?: SortKey }) => column.sort
    ? <SortButton icon={sortIcon} label={uiText(column.label)} onSort={key => onSort(nextSortConfig(sortConfig, key))} sortConfig={sortConfig} sortKey={column.sort}>{uiText(column.label)}</SortButton>
    : uiText(column.label)
  return <>
    {!mobile ? <div aria-busy={pending} aria-label={uiText("RCPC 목록")} className={`rcpc-list rcpc-list--table${locale === 'ja' ? ' rcpc-list--japanese' : ''}`} role="table">
      <div className="rcpc-list__header" role="row">
        <span role="columnheader">{selection.header}</span>
        {columns.map(column => <span key={column.label} role="columnheader">{header(column)}</span>)}
      </div>
      {items.map(item => <RcpcListRow api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={item.rentalId} mutations={mutations} onSelectedChange={checked => selection.onChange(item, checked)} pending={pending} selected={selection.isSelected(item)} selectionDisabled={selection.isDisabled(item)}/>) }
      {items.length === 0 ? <p className="mypage-table__empty" role="status">{uiText(emptyMessage)}</p> : null}
    </div> : <div aria-busy={pending} aria-label={uiText("RCPC 모바일 목록")} className="mobile-rcpc-list">
      {items.map(item => <MobileRcpcCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={`mobile:${item.rentalId}`} mutations={mutations} onSelectedChange={checked => selection.onChange(item, checked)} pending={pending} selected={selection.isSelected(item)} selectionDisabled={selection.isDisabled(item)}/>) }
      {items.length === 0 ? <p className="mypage-table__empty" role="status">{uiText(emptyMessage)}</p> : null}
    </div>}
  </>
}

function RcpcListRow({ api, canEditAlias, canExtend, item, mutations, onSelectedChange, pending = false, selected, selectionDisabled }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
  onSelectedChange: (checked: boolean) => void
  pending?: boolean
  selected: boolean
  selectionDisabled: boolean
}) {
  const { t } = useUiTranslation()
  const unavailable = extensionBlocked(item)
  return <article className={unavailable ? 'is-ended' : undefined} inert={pending} role="row">
    <div className="rcpc-list__row-select" role="cell"><Checkbox aria-label={t("mypageRcpc.ui089", { v0: item.productNo })} checked={selected} disabled={selectionDisabled} onChange={event => onSelectedChange(event.target.checked)}/></div>
    <RcpcProduct api={api} canEditAlias={canEditAlias} item={item} mutations={mutations}/>
    <div role="cell"><LocalizedServiceName kind="serverRoomRegion" name={item.serverRoomRegion} /><br/><LocalizedServiceName kind="serverRoom" name={item.serverRoomName} /></div>
    <RcpcState item={item}/>
    <div className="rcpc-list__period" role="cell"><RcpcTablePeriod item={item}/></div>
    <div className="rcpc-list__connect" role="cell"><div className="rcpc-connection-content"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div></div>
    <div className="rcpc-latest-inquiry" role="cell"><RcpcLatestInquiry item={item}/></div>
    <RcpcActions api={api} canExtend={canExtend} item={item}/>
  </article>
}

function RcpcProduct({ api, canEditAlias, item, mutations }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
}) {
  const alias = item.preference.alias?.trim()
  return <div className="rcpc-list__product" role="cell">
    <strong>
      {mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}
      {alias ? <span>{alias}</span> : null}
      {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
    </strong>
    <span className="rcpc-list__spec-action"><RelativeLink to={`/mypage/rcpc/${item.rentalId}`}>{item.productNo}</RelativeLink> <RcpcSpecButton api={api} item={item} compact/></span>
  </div>
}

function RcpcState({ item }: { item: MyRcpcItem }) {
  return <div className="rcpc-list__state" role="cell"><RcpcStatusContents item={item}/></div>
}

function RcpcActions({ api, canExtend, item }: { api: MyRcpcReadServices; canExtend: boolean; item: MyRcpcItem }) {
  return <div className="rcpc-list__actions" role="cell">
    <span><RcpcReboot api={api} item={item}/><InquirySearchAction disabled={!item.latestInquiry} productNo={item.productNo}/></span>
    <RcpcExtensionAction api={api} canExtend={canExtend} item={item}/>
  </div>
}

export function MobileRcpcCard({ api, canEditAlias, canExtend, item, mutations, onSelectedChange, pending = false, selected, selectionDisabled }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
  onSelectedChange: (checked: boolean) => void
  pending?: boolean
  selected: boolean
  selectionDisabled: boolean
}) {
  const { uiText, t } = useUiTranslation()
  const unavailable = extensionBlocked(item)
  const alias = item.preference.alias?.trim()
  return <article className={`mobile-rcpc-card${unavailable ? ' is-ended' : ''}`} inert={pending}>
    <header>
      <Checkbox aria-label={t("mypageRcpc.ui089", { v0: item.productNo })} checked={selected} disabled={selectionDisabled} onChange={event => onSelectedChange(event.target.checked)}/>
      <strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}<span>{alias || item.productNo}</span></strong>
      {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
      <span className="mobile-rcpc-card__spec"><RelativeLink to={`/mypage/rcpc/${item.rentalId}`}>{item.productNo}</RelativeLink> <RcpcSpecButton api={api} item={item} compact/></span>
    </header>
    <dl className="mobile-rcpc-card__facts">
      <div><dt>{uiText("서버실")}</dt><dd><LocalizedServiceName kind="serverRoomRegion" name={item.serverRoomRegion} /> / <LocalizedServiceName kind="serverRoom" name={item.serverRoomName} /></dd></div>
      <div><dt>{uiText("서버 상태")}</dt><dd className="mobile-rcpc-card__state"><RcpcStatusContents item={item}/></dd></div>
      <div className="mobile-rcpc-card__period"><dt>{uiText("이용 기간")}</dt><dd><RcpcPeriodLabel item={item}/></dd></div>
      <div className="mobile-rcpc-card__connection"><dt>{uiText("접속 정보")}</dt><dd><div className="rcpc-list__connect"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div></dd></div>
      <div><dt>{uiText("최근 문의")}</dt><dd className="rcpc-latest-inquiry"><RcpcLatestInquiry item={item}/></dd></div>
    </dl>
    <footer>
      <span><RcpcReboot api={api} item={item}/><InquirySearchAction disabled={!item.latestInquiry} productNo={item.productNo}/></span>
      <RcpcExtensionAction api={api} canExtend={canExtend} item={item}/>
    </footer>
  </article>
}
