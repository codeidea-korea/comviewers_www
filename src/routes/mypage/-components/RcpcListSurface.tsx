import { useUiTranslation } from '@/i18n/uiTranslation'
import { LocalizedServiceName } from '@/components/common/LocalizedServiceName'
import { InquiryAction } from './inquiries/InquiryAction'
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
import { extensionBlocked, extensionTarget, rentalActionsEnded, totalTraffic } from './rcpcPresentation'
import { RcpcStatusContents } from './rcpc/RcpcStatusContents'
import { RcpcExtensionAction } from './rcpc/RcpcExtensionAction'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import { useRcpcDateBoundary } from './rcpc/useRcpcDateBoundary'
import { InquiryRefundApplicationDialog } from './InquiryRefundApplication'
import { nextSortConfig, SortButton, type SortConfig } from '@/components/ui/SortButtonControl'
import sortIcon from '@/assets/figma/icon-unfold-less.svg'
import { RcpcSelectionMenu } from './RcpcSelectionMenu'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type SortKey = NonNullable<MyRcpcQuery['sort']>

const columns: ReadonlyArray<{ label: string; sort?: SortKey }> = [
  { label: 'RCPC', sort: 'productNo' },
  { label: '서버 위치', sort: 'serverRoom' },
  { label: '서버 상태', sort: 'serverStatus' },
  { label: '이용 기간', sort: 'servicePeriod' },
  { label: '접속 정보' },
  { label: '트래픽 사용량', sort: 'traffic' },
  { label: '빠른 실행' },
]

export function RcpcListSurface({ api, canEditAlias, canExtend, emptyMessage, items, mutations, onSort, pending = false, sortConfig }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  emptyMessage: string
  items: readonly MyRcpcItem[]
  mutations?: RcpcMutations
  onSort: (sort: SortConfig<SortKey>) => void
  pending?: boolean
  sortConfig: SortConfig<SortKey>
}) {
  const { uiText, t } = useUiTranslation()
  const { myAccount } = useServices()
  const [selectedAssetIds, setSelectedAssetIds] = useState<readonly number[]>([])
  const [refundRentalIds, setRefundRentalIds] = useState<readonly number[] | null>(null)
  const refundTriggerRef = useRef<HTMLButtonElement>(null)
  const refundReturnFocusRef = useRef<HTMLElement>(null)
  const visibleIds = items.map(item => item.pcAssetId)
  const selectedVisibleCount = visibleIds.filter(id => selectedAssetIds.includes(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const selectedItems = items.filter(item => selectedAssetIds.includes(item.pcAssetId))
  const selectedRentalIds = selectedItems.map(item => item.rentalId)
  const showRentalActions = items.some(item => !rentalActionsEnded(item))
  const toggle = (id: number, checked: boolean) => setSelectedAssetIds(previous => checked
    ? previous.includes(id) || previous.length >= 20 ? previous : [...previous, id]
    : previous.filter(value => value !== id))
  const toggleVisible = (checked: boolean) => setSelectedAssetIds(previous => checked
    ? [...previous, ...visibleIds.filter(id => !previous.includes(id)).slice(0, 20 - previous.length)]
    : previous.filter(id => !visibleIds.includes(id)))
  return <>
    <div className="rcpc-list__bulk-actions" inert={pending}>
      <Checkbox checked={allVisibleSelected} className="rcpc-list__bulk-select" disabled={visibleIds.length === 0} indeterminate={selectedVisibleCount > 0 && !allVisibleSelected} onChange={event => toggleVisible(event.target.checked)} visualClassName="">{uiText("모두선택")}</Checkbox>
      <span className="sr-only" role="status">{t('mypageRcpc.selectedCount', { count: selectedAssetIds.length })}</span>
      <RcpcSelectionMenu label={uiText("선택한 RCPC 처리")} className="rcpc-list__bulk-action-buttons" nativeOnMobile>
        <InquiryAction appearance="text" disabled={selectedAssetIds.length === 0} fixedTarget initialIds={selectedAssetIds} initialTargets={selectedItems} key={selectedAssetIds.join(',')}>{uiText("문의")}</InquiryAction>
        {showRentalActions ? <button disabled={selectedRentalIds.length === 0 || selectedItems.some(rentalActionsEnded) || !myAccount.inquiryApi} onClick={() => { refundReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : refundTriggerRef.current; setRefundRentalIds([...selectedRentalIds]) }} ref={refundTriggerRef} type="button">{uiText("해지신청")}</button> : null}
        {showRentalActions ? canExtend && selectedItems.length && !selectedItems.some(extensionBlocked) ? <RcpcExtensionCheckout api={api} displayTargets={selectedItems.map(extensionTarget)} key={selectedRentalIds.join(',')} rentalIds={selectedRentalIds} triggerLabel={uiText("기간연장")}/> : <button disabled type="button">{uiText("기간연장")}</button> : null}
      </RcpcSelectionMenu>
    </div>
    {refundRentalIds && myAccount.inquiryApi ? <InquiryRefundApplicationDialog api={myAccount.inquiryApi} initialRentalIds={refundRentalIds} onClose={() => setRefundRentalIds(null)} onComplete={() => { setRefundRentalIds(null); setSelectedAssetIds([]) }} returnFocusRef={refundReturnFocusRef}/> : null}
    <RcpcListTable api={api} canEditAlias={canEditAlias} canExtend={canExtend} emptyMessage={emptyMessage} items={items} mutations={mutations} onSort={onSort} pending={pending} sortConfig={sortConfig} selection={{
      header: <Checkbox aria-label={uiText("현재 페이지 RCPC 전체 선택")} checked={allVisibleSelected} disabled={pending || visibleIds.length === 0} indeterminate={selectedVisibleCount > 0 && !allVisibleSelected} onChange={event => toggleVisible(event.target.checked)}/>,
      isSelected: item => selectedAssetIds.includes(item.pcAssetId),
      isDisabled: item => selectedAssetIds.length >= 20 && !selectedAssetIds.includes(item.pcAssetId),
      onChange: (item, checked) => toggle(item.pcAssetId, checked),
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
    ? <SortButton icon={sortIcon} label={uiText(column.label)} onSort={key => onSort(nextSortConfig(sortConfig, key))} sortConfig={sortConfig} sortKey={column.sort}>{column.label === '트래픽 사용량' && locale !== 'ja' ? <span className="table-sort-button__multiline-label">{uiText("트래픽")}<br/>{uiText("사용량")}</span> : uiText(column.label)}</SortButton>
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
    <div className="rcpc-list__connect" role="cell"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div>
    <div role="cell">{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</div>
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
    <span><RcpcReboot api={api} item={item}/><InquiryAction fixedTarget initialIds={[item.pcAssetId]} /></span>
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
      <div><dt>{uiText("트래픽 사용량")}</dt><dd>{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</dd></div>
    </dl>
    <footer>
      <span><RcpcReboot api={api} item={item}/><InquiryAction fixedTarget initialIds={[item.pcAssetId]} /></span>
      <RcpcExtensionAction api={api} canExtend={canExtend} item={item}/>
    </footer>
  </article>
}
