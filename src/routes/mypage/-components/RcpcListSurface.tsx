import { InquiryAction } from './inquiries/InquiryAction'
import { useRef, useState } from 'react'
import type { MyRcpcItem, MyRcpcQuery } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useServices } from '@/app/ServiceProvider'
import { Checkbox } from '@/components/ui/CheckboxControl'

import { RcpcReboot, RcpcWanIp } from './RcpcDeviceActions'
import { RcpcFavoriteButton } from './RcpcFavoriteButton'
import { RcpcAliasButton, RcpcPeriodLabel, RcpcSpecButton } from './RcpcItemTools'
import { RcpcRemoteAccess } from './RcpcRemoteAccess'
import { extensionBlocked, totalTraffic } from './rcpcPresentation'
import { RcpcStatusContents } from './rcpc/RcpcStatusContents'
import { RcpcExtensionAction } from './rcpc/RcpcExtensionAction'
import { InquiryRefundApplicationDialog } from './InquiryRefundApplication'
import { nextSortConfig, SortButton, type SortConfig } from '@/components/ui/SortButtonControl'
import sortIcon from '@/assets/figma/icon-unfold-less.svg'

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

export function RcpcListSurface({ api, canEditAlias, canExtend, emptyMessage, items, mutations, onSort, sortConfig }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  emptyMessage: string
  items: readonly MyRcpcItem[]
  mutations?: RcpcMutations
  onSort: (sort: SortConfig<SortKey>) => void
  sortConfig: SortConfig<SortKey>
}) {
  const { myAccount } = useServices()
  const [selectedAssetIds, setSelectedAssetIds] = useState<readonly number[]>([])
  const [refundRentalIds, setRefundRentalIds] = useState<readonly number[] | null>(null)
  const refundTriggerRef = useRef<HTMLButtonElement>(null)
  const visibleIds = items.map(item => item.pcAssetId)
  const selectedVisibleCount = visibleIds.filter(id => selectedAssetIds.includes(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const selectedRentalIds = items.filter(item => selectedAssetIds.includes(item.pcAssetId)).map(item => item.rentalId)
  const toggle = (id: number, checked: boolean) => setSelectedAssetIds(previous => checked
    ? previous.includes(id) || previous.length >= 20 ? previous : [...previous, id]
    : previous.filter(value => value !== id))
  const toggleVisible = (checked: boolean) => setSelectedAssetIds(previous => checked
    ? [...previous, ...visibleIds.filter(id => !previous.includes(id)).slice(0, 20 - previous.length)]
    : previous.filter(id => !visibleIds.includes(id)))
  const header = (column: { label: string; sort?: SortKey }) => column.sort
    ? <SortButton icon={sortIcon} label={column.label} onSort={key => onSort(nextSortConfig(sortConfig, key))} sortConfig={sortConfig} sortKey={column.sort}>{column.label === '트래픽 사용량' ? <span className="table-sort-button__multiline-label">트래픽<br/>사용량</span> : column.label}</SortButton>
    : column.label

  return <>
    <div className="rcpc-list__bulk-actions">
      <Checkbox checked={allVisibleSelected} className="rcpc-list__bulk-select" disabled={visibleIds.length === 0} indeterminate={selectedVisibleCount > 0 && !allVisibleSelected} onChange={event => toggleVisible(event.target.checked)} visualClassName="">모두선택</Checkbox>
      <span className="sr-only" role="status">선택 {selectedAssetIds.length}대, 최대 20대</span>
      <div className="rcpc-list__bulk-action-buttons">
        <InquiryAction appearance="text" disabled={selectedAssetIds.length === 0} fixedTarget initialIds={selectedAssetIds} key={selectedAssetIds.join(',')}>문의</InquiryAction>
        <span aria-hidden="true" className="rcpc-list__bulk-divider"/>
        <button disabled={selectedRentalIds.length === 0 || !myAccount.inquiryApi} onClick={() => setRefundRentalIds([...selectedRentalIds])} ref={refundTriggerRef} type="button">해지신청</button>
      </div>
    </div>
    {refundRentalIds && myAccount.inquiryApi ? <InquiryRefundApplicationDialog api={myAccount.inquiryApi} initialRentalIds={refundRentalIds} onClose={() => setRefundRentalIds(null)} onComplete={() => { setRefundRentalIds(null); setSelectedAssetIds([]) }} returnFocusRef={refundTriggerRef}/> : null}
    <div aria-label="RCPC 목록" className="rcpc-list rcpc-list--table" role="table">
      <div className="rcpc-list__header" role="row">
        {columns.map(column => <span key={column.label} role="columnheader">{column.label === 'RCPC' ? <span className="rcpc-list__select-all"><Checkbox aria-label="현재 페이지 RCPC 전체 선택" checked={allVisibleSelected} disabled={visibleIds.length === 0} indeterminate={selectedVisibleCount > 0 && !allVisibleSelected} onChange={event => toggleVisible(event.target.checked)}/>{header(column)}</span> : header(column)}</span>)}
      </div>
      {items.map(item => <RcpcListRow api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={item.rentalId} mutations={mutations} onSelectedChange={checked => toggle(item.pcAssetId, checked)} selected={selectedAssetIds.includes(item.pcAssetId)} selectionFull={selectedAssetIds.length >= 20}/>) }
      {items.length === 0 ? <p className="mypage-table__empty" role="status">{emptyMessage}</p> : null}
    </div>
    <div aria-label="RCPC 모바일 목록" className="mobile-rcpc-list">
      {items.map(item => <MobileRcpcCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={`mobile:${item.rentalId}`} mutations={mutations} onSelectedChange={checked => toggle(item.pcAssetId, checked)} selected={selectedAssetIds.includes(item.pcAssetId)} selectionFull={selectedAssetIds.length >= 20}/>) }
      {items.length === 0 ? <p className="mypage-table__empty" role="status">{emptyMessage}</p> : null}
    </div>
  </>
}

function RcpcListRow({ api, canEditAlias, canExtend, item, mutations, onSelectedChange, selected, selectionFull }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
  onSelectedChange: (checked: boolean) => void
  selected: boolean
  selectionFull: boolean
}) {
  const unavailable = extensionBlocked(item)
  return <article className={unavailable ? 'is-ended' : undefined} role="row">
    <RcpcProduct api={api} canEditAlias={canEditAlias} item={item} mutations={mutations} onSelectedChange={onSelectedChange} selected={selected} selectionFull={selectionFull}/>
    <div role="cell">{item.serverRoomRegion ?? '-'}<br/>{item.serverRoomName ?? '-'}</div>
    <RcpcState item={item}/>
    <div role="cell"><strong><RcpcPeriodLabel item={item}/></strong></div>
    <div className="rcpc-list__connect" role="cell"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div>
    <div role="cell">{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</div>
    <RcpcActions api={api} canExtend={canExtend} item={item}/>
  </article>
}

function RcpcProduct({ api, canEditAlias, item, mutations, onSelectedChange, selected, selectionFull }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
  onSelectedChange: (checked: boolean) => void
  selected: boolean
  selectionFull: boolean
}) {
  const alias = item.preference.alias?.trim()
  return <div className="rcpc-list__product" role="cell">
    <strong>
      <input aria-label={`${item.productNo} 문의 대상 선택`} checked={selected} disabled={selectionFull && !selected} onChange={event => onSelectedChange(event.target.checked)} type="checkbox" />
      {mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}
      {alias ? <span>{alias}</span> : null}
      {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
    </strong>
    <span className="rcpc-list__spec-action"><span>{item.productNo} </span><RcpcSpecButton api={api} item={item} compact/></span>
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

export function MobileRcpcCard({ api, canEditAlias, canExtend, item, mutations, onSelectedChange, selected, selectionFull }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
  onSelectedChange: (checked: boolean) => void
  selected: boolean
  selectionFull: boolean
}) {
  const unavailable = extensionBlocked(item)
  const alias = item.preference.alias?.trim()
  return <article className={`mobile-rcpc-card${unavailable ? ' is-ended' : ''}`}>
    <header>
      <input aria-label={`${item.productNo} 문의 대상 선택`} checked={selected} disabled={selectionFull && !selected} onChange={event => onSelectedChange(event.target.checked)} type="checkbox" />
      <strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}{alias ? <span>{alias}</span> : null}</strong>
      {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
      <span className="mobile-rcpc-card__spec"><span>{item.productNo} </span><RcpcSpecButton api={api} item={item} compact/></span>
    </header>
    <dl className="mobile-rcpc-card__facts">
      <div><dt>서버실</dt><dd>{item.serverRoomRegion ?? '-'} / {item.serverRoomName ?? '-'}</dd></div>
      <div><dt>서버 상태</dt><dd className="mobile-rcpc-card__state"><RcpcStatusContents item={item}/></dd></div>
      <div><dt>이용 기간</dt><dd><strong><RcpcPeriodLabel item={item}/></strong></dd></div>
      <div className="mobile-rcpc-card__connection"><dt>접속 정보</dt><dd><div className="rcpc-list__connect"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div></dd></div>
      <div><dt>트래픽 사용량</dt><dd>{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</dd></div>
    </dl>
    <footer>
      <span><RcpcReboot api={api} item={item}/><InquiryAction fixedTarget initialIds={[item.pcAssetId]} /></span>
      <RcpcExtensionAction api={api} canExtend={canExtend} item={item}/>
    </footer>
  </article>
}
