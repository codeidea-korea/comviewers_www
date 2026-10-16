import { useUiTranslation } from '@/i18n/uiTranslation'
import { LocalizedServiceName } from '@/components/common/LocalizedServiceName'
import { useEffect, useRef, useState } from 'react'
import { InquirySearchAction } from '../inquiries/InquirySearchAction'
import type { MyRcpcItem, MyRcpcQuery } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import starEmptyIcon from '@/assets/figma/review-star-empty.svg'
import starFilledIcon from '@/assets/figma/review-star-filled.svg'
import { RcpcFavoriteButton } from '../RcpcFavoriteButton'
import { RcpcReboot, RcpcWanIp } from '../RcpcDeviceActions'
import { RcpcAliasButton, RcpcPeriodLabel, RcpcSpecButton, RcpcTablePeriod } from '../RcpcItemTools'
import { RcpcRemoteAccess } from '../RcpcRemoteAccess'
import { extensionBlocked, totalTraffic } from '../rcpcPresentation'
import { RcpcStatusContents } from './RcpcStatusContents'
import { RcpcExtensionAction } from './RcpcExtensionAction'
import { useRcpcDateBoundary } from './useRcpcDateBoundary'
import { nextSortConfig, SortButton, type SortConfig } from '@/components/ui/SortButtonControl'
import sortIcon from '@/assets/figma/icon-unfold-less.svg'
import { Checkbox } from '@/components/ui/CheckboxControl'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type SortKey = NonNullable<MyRcpcQuery['sort']>
type MobileVariant = 'none' | 'rcpc' | 'favorites'

const sortHeaders: ReadonlyArray<{ label: string; sort?: SortKey }> = [
  { label: 'RCPC', sort: 'productNo' }, { label: '서버 위치', sort: 'serverRoom' },
  { label: '서버 상태', sort: 'serverStatus' }, { label: '이용 기간', sort: 'servicePeriod' },
  { label: '접속 정보' }, { label: '트래픽 사용량', sort: 'traffic' }, { label: '빠른 실행' },
]

/** API-backed rows use the same card/grid surface as the publishing original. */
export function RcpcDashboardTable({ api, canEditAlias = false, canExtend, items, selected, onSelectedChange, sortConfig, onSort, emptyMessage, mutations, selectable = true, className = '', mobileVariant = 'none', showAccessValuesByDefault = false, onAliasSaved }: {
  api: MyRcpcReadServices; canEditAlias?: boolean; canExtend: boolean; items: readonly MyRcpcItem[]
  selected: ReadonlySet<number>; onSelectedChange: (next: ReadonlySet<number>) => void
  sortConfig: SortConfig<SortKey>; onSort: (sort: SortConfig<SortKey>) => void; emptyMessage: string; mutations?: RcpcMutations; selectable?: boolean; className?: string; mobileVariant?: MobileVariant; showAccessValuesByDefault?: boolean; onAliasSaved?: () => void | Promise<unknown>
}) {
  const { uiText, locale } = useUiTranslation()
  useRcpcDateBoundary(api.organizationId)
  const selectableItems = items.filter(item => !extensionBlocked(item))
  const allSelected = selectableItems.length > 0 && selectableItems.every(item => selected.has(item.rentalId))
  const header = (column: { label: string; sort?: SortKey }) => column.sort
    ? <SortButton icon={sortIcon} label={uiText(column.label)} onSort={key => onSort(nextSortConfig(sortConfig, key))} sortConfig={sortConfig} sortKey={column.sort}>{column.label === '트래픽 사용량' && locale !== 'en' && locale !== 'ja' ? <span className="table-sort-button__multiline-label">{uiText("트래픽")}<br/>{uiText("사용량")}</span> : uiText(column.label)}</SortButton>
    : uiText(column.label)
  return <>
  <div className={`mypage-home-rcpc${locale === 'en' || locale === 'ja' ? ' mypage-home-rcpc--translated' : ''}${selectable ? ' is-selectable' : ''}${className ? ` ${className}` : ''}`} role="table" aria-label={uiText("RCPC 목록")}>
    <div className="mypage-home-rcpc__head" role="row">
      {selectable ? <span role="columnheader"><input aria-label={uiText("현재 페이지 전체 선택")} type="checkbox" checked={allSelected} disabled={selectableItems.length === 0} onChange={event => onSelectedChange(new Set(event.target.checked ? selectableItems.map(item => item.rentalId) : []))}/></span> : null}
      {sortHeaders.map(column => <span key={column.label} role="columnheader">{header(column)}</span>)}
    </div>
    {items.map((item, index) => <RcpcDashboardRow api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={item.rentalId} mutations={mutations} onAliasSaved={onAliasSaved} selectable={selectable} selected={selected.has(item.rentalId)} selection={selected} onSelectedChange={onSelectedChange} showAccessValuesByDefault={showAccessValuesByDefault && index < 5}/>) }
    {items.length === 0 ? <p className="mypage-table__empty" role="status">{uiText(emptyMessage)}</p> : null}
  </div>
  {mobileVariant === 'rcpc' ? <div className="mobile-rcpc-list" aria-label={uiText("RCPC 모바일 목록")}>{items.map(item => <MobileRcpcDashboardCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} item={item} key={`mobile:${item.rentalId}`} mutations={mutations} onAliasSaved={onAliasSaved} selected={selected.has(item.rentalId)} onSelectedChange={checked => onSelectedChange(new Set(checked ? [...selected, item.rentalId] : [...selected].filter(id => id !== item.rentalId)))}/>)}{items.length === 0 ? <p className="mypage-table__empty" role="status">{uiText(emptyMessage)}</p> : null}</div> : null}
  {mobileVariant === 'favorites' ? <div className="favorites-table favorites-table--mobile" role={items.length ? 'table' : undefined} aria-label={uiText("즐겨찾기 RCPC 모바일 목록")}>{items.map((item, index) => <MobileFavoriteCard api={api} canEditAlias={canEditAlias} canExtend={canExtend} index={index} item={item} key={`favorite-mobile:${item.rentalId}`} mutations={mutations} onAliasSaved={onAliasSaved} selectable={selectable} selected={selected.has(item.rentalId)} selection={selected} onSelectedChange={onSelectedChange}/>)}{items.length === 0 ? <p className="mypage-table__empty" role="status">{uiText(emptyMessage)}</p> : null}</div> : null}
  </>
}

function RcpcDashboardRow({ api, canEditAlias, canExtend, item, mutations, onAliasSaved, selectable, selected, selection, onSelectedChange, showAccessValuesByDefault }: {
  api: MyRcpcReadServices; canEditAlias: boolean; canExtend: boolean; item: MyRcpcItem; mutations?: RcpcMutations
  onAliasSaved?: () => void | Promise<unknown>; selectable: boolean; selected: boolean; selection: ReadonlySet<number>; onSelectedChange: (next: ReadonlySet<number>) => void; showAccessValuesByDefault: boolean
}) {
  const { t } = useUiTranslation()
  const connectionRef = useRef<HTMLDivElement>(null)
  const [connectionVisible, setConnectionVisible] = useState(false)
  useEffect(() => {
    if (!showAccessValuesByDefault || connectionVisible || !connectionRef.current) return
    if (!('IntersectionObserver' in window)) { setConnectionVisible(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setConnectionVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    observer.observe(connectionRef.current)
    return () => observer.disconnect()
  }, [showAccessValuesByDefault, connectionVisible])
  const unavailable = extensionBlocked(item)
  return <article className={unavailable ? 'is-disabled' : undefined} role="row">
    {selectable ? <div className="mypage-home-rcpc__select" role="cell"><input aria-label={t("mypageRcpc.ui209", { v0: item.productNo })} type="checkbox" checked={selected} disabled={unavailable} onChange={event => onSelectedChange(new Set(event.target.checked ? [...selection, item.rentalId] : [...selection].filter(id => id !== item.rentalId)))}/></div> : null}
    <div className="mypage-home-rcpc__alias" role="cell"><strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}<span>{item.preference.alias || item.productNo}</span>{canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact onAliasSaved={onAliasSaved}/> : null}</strong><span><RcpcSpecButton api={api} item={item} compact/></span></div>
    <div className="mypage-home-rcpc__server" role="cell"><span><LocalizedServiceName kind="serverRoomRegion" name={item.serverRoomRegion} /><br /><LocalizedServiceName kind="serverRoom" name={item.serverRoomName} /></span></div>
    <div className="mypage-home-rcpc__state" role="cell"><RcpcStatusContents item={item}/></div>
    <div className="mypage-home-rcpc__period" role="cell"><span><RcpcTablePeriod item={item}/></span></div>
    <div className="mypage-home-rcpc__connection" ref={connectionRef} role="cell"><RcpcWanIp api={api} item={item} compact autoReveal={!showAccessValuesByDefault || connectionVisible}/><RcpcRemoteAccess api={api} item={item} compact autoRevealId={connectionVisible}/></div>
    <div className="mypage-home-rcpc__traffic" role="cell">{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</div>
    <div className="mypage-home-rcpc__actions" role="cell"><span><RcpcReboot api={api} item={item}/><InquirySearchAction productNo={item.productNo}/></span><RcpcExtensionAction api={api} canExtend={canExtend} item={item}/></div>
  </article>
}

function rcpcDisplayName(item: MyRcpcItem) {
  return item.preference.alias || item.productNo
}

function MobileRcpcDashboardCard({ api, canEditAlias, canExtend, item, mutations, onAliasSaved, selected, onSelectedChange }: { api: MyRcpcReadServices; canEditAlias: boolean; canExtend: boolean; item: MyRcpcItem; mutations?: RcpcMutations; onAliasSaved?: () => void | Promise<unknown>; selected: boolean; onSelectedChange: (checked: boolean) => void }) {
  const { uiText, t } = useUiTranslation()
  const unavailable = extensionBlocked(item)
  return <article className={`mobile-rcpc-card${unavailable ? ' is-ended' : ''}`}>
    <header>
      <Checkbox aria-label={t("mypageRcpc.ui209", { v0: item.productNo })} checked={selected} disabled={unavailable} onChange={event => onSelectedChange(event.target.checked)}/>
      <strong>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations} compact/> : null}<span>{rcpcDisplayName(item)}</span>{canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact onAliasSaved={onAliasSaved}/> : null}</strong>
      <span className="mobile-rcpc-card__spec"><span>{item.productNo} </span><RcpcSpecButton api={api} item={item} compact/></span>
    </header>
    <dl className="mobile-rcpc-card__facts">
      <div><dt>{uiText("서버실")}</dt><dd>{item.serverRoomRegion ? <><LocalizedServiceName kind="serverRoomRegion" name={item.serverRoomRegion} /> </> : null}<LocalizedServiceName kind="serverRoom" name={item.serverRoomName} /></dd></div>
      <div className="mobile-rcpc-card__state"><dt>{uiText("서버 상태")}</dt><dd><RcpcStatusContents item={item}/></dd></div>
      <div className="mobile-rcpc-card__period"><dt>{uiText("이용 기간")}</dt><dd><RcpcTablePeriod item={item} inlineEndDate/></dd></div>
      <div className="mobile-rcpc-card__connection"><dt>{uiText("접속 정보")}</dt><dd><div className="rcpc-list__connect"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div></dd></div>
      <div><dt>{uiText("트래픽사용량")}</dt><dd>{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</dd></div>
    </dl>
    <footer><span><RcpcReboot api={api} item={item}/><InquirySearchAction productNo={item.productNo}/></span><RcpcExtensionAction api={api} canExtend={canExtend} item={item}/></footer>
  </article>
}

function MobileFavoriteCard({ api, canEditAlias, canExtend, index, item, mutations, onAliasSaved, selectable, selected, selection, onSelectedChange }: {
  api: MyRcpcReadServices; canEditAlias: boolean; canExtend: boolean; index: number; item: MyRcpcItem; mutations?: RcpcMutations
  onAliasSaved?: () => void | Promise<unknown>; selectable: boolean; selected: boolean; selection: ReadonlySet<number>; onSelectedChange: (next: ReadonlySet<number>) => void
}) {
  const { uiText, t } = useUiTranslation()
  const unavailable = extensionBlocked(item)
  return <article className={`mobile-scrap-card${unavailable ? ' is-ended' : ''}`} data-sort-row={index} role="row">
    <div className="mobile-scrap-card__selection" role="cell">{selectable ? <input aria-label={t("mypageRcpc.ui209", { v0: item.productNo })} type="checkbox" checked={selected} disabled={unavailable} onChange={event => onSelectedChange(new Set(event.target.checked ? [...selection, item.rentalId] : [...selection].filter(id => id !== item.rentalId)))}/> : null}</div>
    <div className="rcpc-list__product" role="cell">
      <strong>
        <img alt="" className="mobile-scrap-card__star mobile-scrap-card__star--desktop" src={item.preference.favorite ? starFilledIcon : starEmptyIcon}/>
        <img alt="" className="mobile-scrap-card__star mobile-scrap-card__star--mobile" src={starFilledIcon}/>
        <span className="mobile-scrap-card__alias mobile-scrap-card__alias--desktop">{rcpcDisplayName(item)}</span>
        <span className="mobile-scrap-card__alias mobile-scrap-card__alias--mobile">{rcpcDisplayName(item)}</span>
        {canEditAlias && mutations ? <RcpcAliasButton api={api} item={item} mutations={mutations} compact onAliasSaved={onAliasSaved}/> : null}
      </strong>
      <RcpcSpecButton api={api} item={item} compact/>
    </div>
    <div data-mobile-label={uiText("서버실")} role="cell"><span className="mobile-scrap-card__server-value"><LocalizedServiceName kind="serverRoomRegion" name={item.serverRoomRegion} /><span className="mobile-scrap-card__server-separator">/</span><br /><LocalizedServiceName kind="serverRoom" name={item.serverRoomName} /></span></div>
    <div className="rcpc-list__state" data-mobile-label={uiText("서버 상태")} role="cell"><span className="rcpc-list__state-value"><RcpcStatusContents item={item}/></span></div>
    <div data-mobile-label={uiText("이용 기간")} role="cell"><strong><RcpcPeriodLabel item={item}/></strong></div>
    <div className="rcpc-list__connect" data-mobile-label={uiText("접속 정보")} role="cell"><RcpcWanIp api={api} item={item} compact/><RcpcRemoteAccess api={api} item={item} compact/></div>
    <div data-mobile-label={uiText("트래픽 사용량")} role="cell"><span className="mobile-scrap-card__traffic-value">{totalTraffic(item.trafficDownloadTotalBytes, item.trafficUploadTotalBytes)}</span></div>
    <div className="rcpc-list__actions" role="cell"><span><RcpcReboot api={api} item={item}/><InquirySearchAction productNo={item.productNo}/></span><RcpcExtensionAction api={api} canExtend={canExtend} item={item} showUnavailable/></div>
  </article>
}
