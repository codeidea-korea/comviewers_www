import { Link } from 'react-router'
import type { MyRcpcItem, MyRcpcQuery } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import { Button } from '@/components/ui/ButtonControl'
import { RcpcReboot, RcpcWanIp } from './RcpcDeviceActions'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import { RcpcFavoriteButton } from './RcpcFavoriteButton'
import { RcpcAliasButton, RcpcPeriodLabel, RcpcSpecButton } from './RcpcItemTools'
import { RcpcRemoteAccess } from './RcpcRemoteAccess'
import { extensionBlocked, extensionTarget, serverStatusLabels, totalTraffic } from './rcpcPresentation'

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

export function RcpcListSurface({ api, canEditAlias, canExtend, emptyMessage, items, mutations, onSort, sort }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  emptyMessage: string
  items: readonly MyRcpcItem[]
  mutations?: RcpcMutations
  onSort: (sort: SortKey) => void
  sort: MyRcpcQuery['sort']
}) {
  const header = (column: { label: string; sort?: SortKey }) => column.sort
    ? <button aria-pressed={sort === column.sort} className="table-sort-button" onClick={() => onSort(column.sort!)} type="button">{column.label}<span aria-hidden="true">↕</span></button>
    : column.label

  return <>
    <div aria-label="RCPC 목록" className="rcpc-list rcpc-list--table" role="table">
      <div className="rcpc-list__header" role="row">
        {columns.map(column => <span key={column.label} role="columnheader">{header(column)}</span>)}
      </div>
      {items.map(item => <RcpcListRow api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={item.rentalId} mutations={mutations}/>) }
      {items.length === 0 ? <p className="mypage-table__empty" role="status">{emptyMessage}</p> : null}
    </div>
    <div aria-label="RCPC 모바일 목록" className="mobile-rcpc-list">
      {items.map(item => <MobileRcpcCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={`mobile:${item.rentalId}`} mutations={mutations}/>) }
      {items.length === 0 ? <p className="mypage-table__empty" role="status">{emptyMessage}</p> : null}
    </div>
  </>
}

function RcpcListRow({ api, canEditAlias, canExtend, item, mutations }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
}) {
  const unavailable = extensionBlocked(item)
  return <article className={unavailable ? 'is-ended' : undefined} role="row">
    <RcpcProduct api={api} canEditAlias={canEditAlias} item={item} mutations={mutations}/>
    <div role="cell">{item.serverRoomRegion ?? '-'}<br/>{item.serverRoomName ?? '-'}</div>
    <RcpcState item={item}/>
    <div role="cell"><strong><RcpcPeriodLabel item={item}/></strong></div>
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
  return <div className="rcpc-list__product" role="cell">
    <strong>
      {mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}
      <span>{item.preference.alias || item.productNo}</span>
      {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
    </strong>
    <span className="rcpc-list__spec-action"><span>{item.productNo} </span><RcpcSpecButton api={api} item={item} compact/></span>
  </div>
}

function RcpcState({ item }: { item: MyRcpcItem }) {
  return <div className="rcpc-list__state" role="cell"><img alt="" src={rcpcStateIcon(item)}/><span>{serverStatusLabels[item.serverStatus] ?? item.serverStatus}</span></div>
}

function rcpcStateIcon(item: MyRcpcItem) {
  return extensionBlocked(item)
    ? serverDisabledIcon
    : item.serverStatus === 'needs_attention'
      ? serverOffIcon
      : item.serverStatus === 'extension_waiting'
        ? serverWaitingIcon
        : serverOnIcon
}

function RcpcActions({ api, canExtend, item }: { api: MyRcpcReadServices; canExtend: boolean; item: MyRcpcItem }) {
  const unavailable = extensionBlocked(item)
  return <div className="rcpc-list__actions" role="cell">
    <span><RcpcReboot api={api} item={item}/><Button as={Link} size="small" variant="secondary" to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Button></span>
    {canExtend
      ? unavailable
        ? <Button disabled size="small">기간연장</Button>
        : <RcpcExtensionCheckout api={api} displayTargets={[extensionTarget(item)]} rentalIds={[item.rentalId]} triggerLabel="기간연장"/>
      : null}
  </div>
}

function MobileRcpcCard({ api, canEditAlias, canExtend, item, mutations }: {
  api: MyRcpcReadServices
  canEditAlias: boolean
  canExtend: boolean
  item: MyRcpcItem
  mutations?: RcpcMutations
}) {
  const unavailable = extensionBlocked(item)
  return <article className={`mobile-rcpc-card${unavailable ? ' is-ended' : ''}`}>
    <header>
      <strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}<span>{item.preference.alias || item.productNo}</span></strong>
      {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact/> : null}
      <span className="mobile-rcpc-card__spec"><span>{item.productNo} </span><RcpcSpecButton api={api} item={item} compact/></span>
    </header>
    <dl className="mobile-rcpc-card__facts">
      <div><dt>서버실</dt><dd>{item.serverRoomRegion ?? '-'} / {item.serverRoomName ?? '-'}</dd></div>
      <div><dt>서버 상태</dt><dd className="mobile-rcpc-card__state"><img alt="" src={rcpcStateIcon(item)}/><span>{serverStatusLabels[item.serverStatus] ?? item.serverStatus}</span></dd></div>
      <div><dt>이용 기간</dt><dd><strong><RcpcPeriodLabel item={item}/></strong></dd></div>
      <div className="mobile-rcpc-card__connection"><dt>접속 정보</dt><dd><div className="rcpc-list__connect"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div></dd></div>
      <div><dt>트래픽 사용량</dt><dd>{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</dd></div>
    </dl>
    <footer>
      <span><RcpcReboot api={api} item={item}/><Button as={Link} size="small" variant="secondary" to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Button></span>
      {canExtend
        ? unavailable
          ? <Button disabled size="small">기간연장</Button>
          : <RcpcExtensionCheckout api={api} displayTargets={[extensionTarget(item)]} rentalIds={[item.rentalId]} triggerLabel="기간연장"/>
        : null}
    </footer>
  </article>
}
