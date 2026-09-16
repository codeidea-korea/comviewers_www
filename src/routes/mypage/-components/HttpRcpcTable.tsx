import { Link } from 'react-router'
import type { MyRcpcItem, MyRcpcQuery } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import starEmptyIcon from '@/assets/figma/review-star-empty.svg'
import starFilledIcon from '@/assets/figma/review-star-filled.svg'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import { RcpcFavoriteButton } from './RcpcFavoriteButton'
import { RcpcReboot, RcpcWanIp } from './RcpcDeviceActions'
import { RcpcAliasButton, RcpcPeriodLabel, RcpcSpecButton } from './RcpcItemTools'
import { RcpcRemoteAccess } from './RcpcRemoteAccess'
import { extensionBlocked, extensionTarget, serverStatusLabels, totalTraffic } from './rcpcPresentation'
import { Button } from '@/components/ui/ButtonControl'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type SortKey = NonNullable<MyRcpcQuery['sort']>
type MobileVariant = 'none' | 'rcpc' | 'favorites'

const sortHeaders: ReadonlyArray<{ label: string; sort?: SortKey }> = [
  { label: 'RCPC', sort: 'productNo' }, { label: '서버 위치', sort: 'serverRoom' },
  { label: '서버 상태', sort: 'serverStatus' }, { label: '이용 기간', sort: 'servicePeriod' },
  { label: '접속 정보' }, { label: '트래픽 사용량', sort: 'traffic' }, { label: '빠른 실행' },
]

/** API-backed rows use the same card/grid surface as the publishing original. */
export function RcpcDashboardTable({ api, canEditAlias = false, canExtend, items, selected, onSelectedChange, sort, onSort, emptyMessage, mutations, selectable = true, className = '', mobileVariant = 'none' }: {
  api: MyRcpcReadServices; canEditAlias?: boolean; canExtend: boolean; items: readonly MyRcpcItem[]
  selected: ReadonlySet<number>; onSelectedChange: (next: ReadonlySet<number>) => void
  sort: MyRcpcQuery['sort']; onSort: (sort: SortKey) => void; emptyMessage: string; mutations?: RcpcMutations; selectable?: boolean; className?: string; mobileVariant?: MobileVariant
}) {
  const selectableItems = items.filter(item => !extensionBlocked(item))
  const allSelected = selectableItems.length > 0 && selectableItems.every(item => selected.has(item.rentalId))
  const header = (column: { label: string; sort?: SortKey }) => column.sort
    ? <button aria-pressed={sort === column.sort} className="table-sort-button" type="button" onClick={() => onSort(column.sort!)}>{column.label}<span aria-hidden="true">↕</span></button>
    : column.label
  return <>
  <div className={`mypage-home-rcpc${selectable ? ' is-selectable' : ''}${className ? ` ${className}` : ''}`} role="table" aria-label="RCPC 목록">
    <div className="mypage-home-rcpc__head" role="row">
      {selectable ? <span role="columnheader"><input aria-label="현재 페이지 전체 선택" type="checkbox" checked={allSelected} disabled={selectableItems.length === 0} onChange={event => onSelectedChange(new Set(event.target.checked ? selectableItems.map(item => item.rentalId) : []))}/></span> : null}
      {sortHeaders.map(column => <span key={column.label} role="columnheader">{header(column)}</span>)}
    </div>
    {items.map(item => <RcpcDashboardRow api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={item.rentalId} mutations={mutations} selectable={selectable} selected={selected.has(item.rentalId)} selection={selected} onSelectedChange={onSelectedChange}/>) }
    {items.length === 0 ? <p className="mypage-table__empty" role="status">{emptyMessage}</p> : null}
  </div>
  {mobileVariant === 'rcpc' ? <div className="mobile-rcpc-list" aria-label="RCPC 모바일 목록">{items.map(item => <MobileRcpcDashboardCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={`mobile:${item.rentalId}`} mutations={mutations}/>)}{items.length === 0 ? <p className="mypage-table__empty" role="status">{emptyMessage}</p> : null}</div> : null}
  {mobileVariant === 'favorites' ? <div className="favorites-table favorites-table--mobile" role="table" aria-label="즐겨찾기 RCPC 모바일 목록">{items.map((item, index) => <MobileFavoriteCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} index={index} item={item} key={`favorite-mobile:${item.rentalId}`} mutations={mutations} selectable={selectable} selected={selected.has(item.rentalId)} selection={selected} onSelectedChange={onSelectedChange}/>)}</div> : null}
  </>
}

function RcpcDashboardRow({ api, canEditAlias, canExtend, item, mutations, selectable, selected, selection, onSelectedChange }: {
  api: MyRcpcReadServices; canEditAlias: boolean; canExtend: boolean; item: MyRcpcItem; mutations?: RcpcMutations
  selectable: boolean; selected: boolean; selection: ReadonlySet<number>; onSelectedChange: (next: ReadonlySet<number>) => void
}) {
  const unavailable = extensionBlocked(item)
  const state = serverStatusLabels[item.serverStatus] ?? item.serverStatus
  const stateIcon = unavailable ? serverDisabledIcon : item.serverStatus === 'needs_attention' ? serverOffIcon : item.serverStatus === 'extension_waiting' ? serverWaitingIcon : serverOnIcon
  return <article className={unavailable ? 'is-disabled' : undefined} role="row">
    {selectable ? <div className="mypage-home-rcpc__select" role="cell"><input aria-label={`${item.productNo} 선택`} type="checkbox" checked={selected} disabled={unavailable} onChange={event => onSelectedChange(new Set(event.target.checked ? [...selection, item.rentalId] : [...selection].filter(id => id !== item.rentalId)))}/></div> : null}
    <div className="mypage-home-rcpc__alias" role="cell"><strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}<span>{item.preference.alias || item.productNo}</span>{canEditAlias && mutations && item.preference.alias ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}</strong><span>{item.preference.alias && canEditAlias && mutations ? null : canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}<RcpcSpecButton api={api} item={item} compact/></span></div>
    <div className="mypage-home-rcpc__server" role="cell"><span>{item.serverRoomRegion ?? '-'}<br />{item.serverRoomName ?? '-'}</span></div>
    <div className="mypage-home-rcpc__state" role="cell"><img alt="" src={stateIcon}/><span>{state}</span></div>
    <div className="mypage-home-rcpc__period" role="cell"><span><strong><RcpcPeriodLabel item={item}/></strong></span></div>
    <div className="mypage-home-rcpc__connection" role="cell"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div>
    <div className="mypage-home-rcpc__traffic" role="cell">{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</div>
    <div className="mypage-home-rcpc__actions" role="cell"><span><RcpcReboot api={api} item={item}/><Button as={Link} size="small" variant="secondary" to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Button></span>{canExtend ? unavailable ? <Button size="small" disabled>기간연장</Button> : <RcpcExtensionCheckout api={api} rentalIds={[item.rentalId]} displayTargets={[extensionTarget(item)]} triggerLabel="기간연장"/> : null}</div>
  </article>
}

function rcpcStateIcon(item: MyRcpcItem, unavailable = extensionBlocked(item)) {
  if (unavailable) return serverDisabledIcon
  if (item.serverStatus === 'needs_attention') return serverOffIcon
  if (item.serverStatus === 'extension_waiting') return serverWaitingIcon
  return serverOnIcon
}

function rcpcDisplayName(item: MyRcpcItem) {
  return item.preference.alias || item.productNo
}

function MobileRcpcDashboardCard({ api, canEditAlias, canExtend, item, mutations }: { api: MyRcpcReadServices; canEditAlias: boolean; canExtend: boolean; item: MyRcpcItem; mutations?: RcpcMutations }) {
  const unavailable = extensionBlocked(item)
  const state = serverStatusLabels[item.serverStatus] ?? item.serverStatus
  return <article className={`mobile-rcpc-card${unavailable ? ' is-ended' : ''}`}>
    <header>
      <strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}<span>{rcpcDisplayName(item)}</span>{canEditAlias && mutations && item.preference.alias ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}</strong>
      {canEditAlias && mutations && !item.preference.alias ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
      <span className="mobile-rcpc-card__spec"><RcpcSpecButton api={api} item={item} compact/></span>
    </header>
    <dl className="mobile-rcpc-card__facts">
      <div><dt>서버 위치</dt><dd>{item.serverRoomRegion ?? '-'} / {item.serverRoomName ?? '-'}</dd></div>
      <div className="mobile-rcpc-card__state"><dt>서버 상태</dt><dd><img alt="" src={rcpcStateIcon(item, unavailable)}/><span>{state}</span></dd></div>
      <div><dt>이용 기간</dt><dd><strong><RcpcPeriodLabel item={item}/></strong></dd></div>
      <div className="mobile-rcpc-card__connection"><dt>접속 정보</dt><dd><div className="rcpc-list__connect"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div></dd></div>
      <div><dt>트래픽 사용량</dt><dd>{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</dd></div>
    </dl>
    <footer><span><RcpcReboot api={api} item={item}/><Button as={Link} size="small" variant="secondary" to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Button></span>{canExtend ? unavailable ? <Button size="small" disabled>기간연장</Button> : <RcpcExtensionCheckout api={api} rentalIds={[item.rentalId]} displayTargets={[extensionTarget(item)]} triggerLabel="기간연장"/> : null}</footer>
  </article>
}

function MobileFavoriteCard({ api, canEditAlias, canExtend, index, item, mutations, selectable, selected, selection, onSelectedChange }: {
  api: MyRcpcReadServices; canEditAlias: boolean; canExtend: boolean; index: number; item: MyRcpcItem; mutations?: RcpcMutations
  selectable: boolean; selected: boolean; selection: ReadonlySet<number>; onSelectedChange: (next: ReadonlySet<number>) => void
}) {
  const unavailable = extensionBlocked(item)
  const state = serverStatusLabels[item.serverStatus] ?? item.serverStatus
  return <article className={`mobile-scrap-card${unavailable ? ' is-ended' : ''}`} data-sort-row={index} role="row">
    <div className="mobile-scrap-card__selection" role="cell">{selectable ? <input aria-label={`${item.productNo} 선택`} type="checkbox" checked={selected} disabled={unavailable} onChange={event => onSelectedChange(new Set(event.target.checked ? [...selection, item.rentalId] : [...selection].filter(id => id !== item.rentalId)))}/> : null}</div>
    <div className="rcpc-list__product" role="cell">
      <strong>
        <img alt="" className="mobile-scrap-card__star mobile-scrap-card__star--desktop" src={item.preference.favorite ? starFilledIcon : starEmptyIcon}/>
        <img alt="" className="mobile-scrap-card__star mobile-scrap-card__star--mobile" src={starFilledIcon}/>
        <span className="mobile-scrap-card__alias mobile-scrap-card__alias--desktop">{rcpcDisplayName(item)}</span>
        <span className="mobile-scrap-card__alias mobile-scrap-card__alias--mobile">{rcpcDisplayName(item)}</span>
        {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
      </strong>
      <RcpcSpecButton api={api} item={item} compact/>
    </div>
    <div data-mobile-label="서버실" role="cell"><span className="mobile-scrap-card__server-value">{item.serverRoomRegion ?? '-'}<span className="mobile-scrap-card__server-separator">/</span><br />{item.serverRoomName ?? '-'}</span></div>
    <div className="rcpc-list__state" data-mobile-label="서버 상태" role="cell"><span className="rcpc-list__state-value"><img alt="" src={rcpcStateIcon(item, unavailable)}/><span>{state}</span></span></div>
    <div data-mobile-label="이용 기간" role="cell"><strong><RcpcPeriodLabel item={item}/></strong></div>
    <div className="rcpc-list__connect" data-mobile-label="접속 정보" role="cell"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div>
    <div data-mobile-label="트래픽 사용량" role="cell"><span className="mobile-scrap-card__traffic-value">{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</span></div>
    <div className="rcpc-list__actions" role="cell"><span><RcpcReboot api={api} item={item}/><Button as={Link} size="small" variant="secondary" to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Button></span>{canExtend ? unavailable ? <Button size="small" disabled>기간연장</Button> : <RcpcExtensionCheckout api={api} rentalIds={[item.rentalId]} displayTargets={[extensionTarget(item)]} triggerLabel="기간연장"/> : null}</div>
  </article>
}
