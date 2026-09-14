import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcDetail, MyRcpcQuery } from '@/api/myRcpc'
import { myRcpcQuerySchema } from '@/api/myRcpc'
import { Pagination } from '@/components/ui/PaginationControl'
import { MyPageLayout, MyPageMobileFilterSheet } from '../MypageComponentsView'
import { AccountQueryState } from './AccountQueryState'
import { useSession } from '@/app/session/SessionProvider'
import { RcpcRemoteAccess } from './RcpcRemoteAccess'
import { connectionLabels, endedRental, extensionBlocked, loadAuthorizedRcpcs, traffic } from './rcpcPresentation'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import { RcpcReplacementCheckoutEntry } from './RcpcReplacementCheckout'
import { RcpcFavoriteButton } from './RcpcFavoriteButton'
import { RcpcReboot, RcpcWanIp } from './RcpcDeviceActions'
import { RcpcAliasButton, RcpcPeriodLabel, RcpcSpecButton } from './RcpcItemTools'
import { extensionTarget, HttpRcpcTable } from './HttpRcpcTable'

type SortKey = NonNullable<MyRcpcQuery['sort']>

const rentalLabels: Record<string, string> = { pending_payment: '결제 대기', ready: '준비', active: '이용 중', expiring: '만료 예정', grace_period: '유예 기간', access_restricted: '접속 제한', expired: '기간 만료', termination_pending: '종료 대기', resetting: '초기화 중', terminated: '종료', cancelled: '취소', refunded: '환불' }
const mobileSortLabels: Partial<Record<SortKey, string>> = { productNo: 'RCPC', serverRoom: '서버 위치', serverStatus: '서버 상태', servicePeriod: '이용 기간', traffic: '트래픽 사용량' }
const mobileSortByLabel: Record<string, SortKey> = Object.fromEntries(Object.entries(mobileSortLabels).map(([sort, label]) => [label, sort])) as Record<string, SortKey>
const mobileSortItems = Object.values(mobileSortLabels)

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
export function HttpRcpcList({ api, favorite = false, mutations }: { api: MyRcpcReadServices; favorite?: boolean; mutations?: RcpcMutations }) {
  const session = useSession()
  const [searchParams] = useSearchParams()
  const initialProductNo = (searchParams.get('productNo') ?? '').slice(0, 50)
  const parsedStatus = myRcpcQuerySchema.safeParse({ status: searchParams.get('status') ?? undefined })
  const parsedUsage = myRcpcQuerySchema.safeParse({ usageStatus: searchParams.get('usageStatus') ?? undefined })
  const initialUsage = parsedUsage.success ? parsedUsage.data.usageStatus : undefined
  const initialStatus = parsedStatus.success ? parsedStatus.data.status : undefined
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set())
  const [mobileSortOpen, setMobileSortOpen] = useState(false)
  const [query, setQuery] = useState<MyRcpcQuery>({ page: 0, size: 20, sort: 'serverStatus', productNo: initialProductNo || undefined, status: initialStatus, usageStatus: initialUsage })
  useEffect(() => {
    setSelected(new Set())
    setQuery(previous => ({ ...previous, page: 0, productNo: initialProductNo || undefined, status: initialStatus, usageStatus: initialUsage }))
  }, [initialProductNo, initialStatus, initialUsage])
  const available = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'authorized-options'], queryFn: ({ signal }) => loadAuthorizedRcpcs(api, signal) })
  const regions = [...new Set((available.data ?? []).map(item => item.serverRoomRegion).filter((value): value is string => Boolean(value)))].sort()
  const rooms = [...new Map((available.data ?? []).filter((item) => item.serverRoomId !== null && (!query.region || item.serverRoomRegion === query.region)).map((item) => [item.serverRoomId!, item.serverRoomName ?? String(item.serverRoomId)])).entries()]
  const request = { ...query, favorite: favorite ? true : undefined }
  const rows = useQuery({ queryKey: ['my-rcpcs', api.organizationId, request], queryFn: ({ signal }) => api.list(request, signal) })
  const selectedItems = (rows.data?.items ?? []).filter(item => selected.has(item.rentalId) && !extensionBlocked(item)).slice(0, 20)
  const canExtend = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
    && session.customerSession.commerceAvailable
  const canEditAlias = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
  const emptyMessage = query.usageStatus ? '해당 상태의 RCPC가 없습니다.' : '이용 중인 RCPC가 없습니다.'
  return <MyPageLayout title={favorite ? '즐겨찾기' : '이용 RCPC'}>
    <div className="rcpc-list-page rcpc-list-page--live">
    <div className="mobile-list-page-heading mobile-list-page-heading--rcpc"><h1>{favorite ? '즐겨찾기' : '이용 RCPC'}</h1><button aria-expanded={mobileSortOpen} aria-haspopup="dialog" onClick={() => setMobileSortOpen(true)} type="button">{mobileSortLabels[query.sort ?? 'serverStatus'] ?? '서버 상태'} <span aria-hidden="true">↕</span></button></div>
    <div className="mypage-tabs mypage-tabs--buttons">{([{ value: undefined, label: '전체' }, { value: 'using', label: '이용 중' }, { value: 'extension_waiting', label: '연장대기' }, { value: 'ended', label: '종료' }] as const).map(tab => <button type="button" key={tab.value ?? 'all'} aria-pressed={query.usageStatus === tab.value} onClick={() => setQuery(previous => ({ ...previous, page: 0, usageStatus: tab.value, status: undefined }))}>{tab.label} {(available.data ?? []).filter(item => !tab.value || item.usageStatus === tab.value).length}</button>)}</div>
    <div className="rcpc-list-toolbar"><div className="rcpc-list-filters"><label>서버 위치<select value={query.region ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 0, region: event.target.value || undefined, serverRoomId: undefined }))}><option value="">전체</option>{regions.map(region => <option key={region} value={region}>{region}</option>)}</select></label><label>서버실<select value={query.serverRoomId ?? ''} onChange={(event) => setQuery(previous => ({ ...previous, page: 0, serverRoomId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">전체</option>{rooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div><div className="rcpc-list-bulk-actions"><Link aria-disabled={selectedItems.length === 0} className={selectedItems.length === 0 ? 'is-disabled' : ''} to={selectedItems.length ? `/mypage/inquiries?pcAssetIds=${selectedItems.map(item => item.pcAssetId).join(',')}` : '#'}>문의</Link>{canExtend ? selectedItems.length ? <RcpcExtensionCheckout key={selectedItems.map(item => item.rentalId).join(',')} api={api} rentalIds={selectedItems.map(item => item.rentalId)} displayTargets={selectedItems.map(extensionTarget)} triggerLabel="기간연장"/> : <button type="button" disabled>기간연장</button> : null}</div></div>
    {available.error ? <p role="alert">서버실 목록을 불러오지 못했습니다. <button onClick={() => void available.refetch()} type="button">다시 시도</button></p> : null}
    <AccountQueryState pending={rows.isPending} error={rows.error} retry={rows.refetch} />
    {rows.data ? <><p className="rcpc-list-count">총 <b>{rows.data.totalElements}</b>개 상품</p><HttpRcpcTable api={api} canEditAlias={canEditAlias} canExtend={canExtend} items={rows.data.items} selected={selected} onSelectedChange={setSelected} sort={query.sort} onSort={sort => setQuery(previous => ({ ...previous, page: 0, sort }))} emptyMessage={emptyMessage} mutations={mutations} mobileVariant="rcpc"/>{rows.data.totalPages > 1 ? <Pagination currentPage={rows.data.page + 1} totalPages={rows.data.totalPages} onPageChange={(page) => setQuery(previous => ({ ...previous, page: page - 1 }))} /> : null}</> : null}
    </div>
    <MyPageMobileFilterSheet items={mobileSortItems} open={mobileSortOpen} onClose={() => setMobileSortOpen(false)} onSelect={label => setQuery(previous => ({ ...previous, page: 0, sort: mobileSortByLabel[label] ?? previous.sort }))}/>
  </MyPageLayout>
}

export function HttpRcpcDetail({ api, mutations }: { api: MyRcpcReadServices; mutations?: RcpcMutations }) {
  const session = useSession()
  const { rcpcId } = useParams()
  const id = Number(rcpcId)
  const valid = /^[1-9]\d*$/.test(rcpcId ?? '') && Number.isSafeInteger(id)
  const detail = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'detail', rcpcId], enabled: valid, queryFn: ({ signal }) => api.detail(id, signal) })
  if (!valid) return <MyPageLayout title="RCPC 상세"><p>올바른 RCPC 주소가 아닙니다.</p></MyPageLayout>
  const item = detail.data
  const canExtend = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
    && session.customerSession.commerceAvailable
  const canEditAlias = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
  return <MyPageLayout title="RCPC 상세"><div className="rcpc-detail-page"><Link to="/mypage/rcpc">목록</Link><AccountQueryState pending={detail.isPending} error={detail.error} retry={detail.refetch} />{item ? <section className="rcpc-detail-card"><header className="rcpc-detail-card__heading"><div><span>RCPC 정보</span><h2>{item.preference.alias || item.productNo}</h2><p>{item.productNo} · <RcpcPeriodLabel item={item}/></p></div>{mutations ? <RcpcFavoriteButton api={api} item={item} mutations={mutations}/> : null}</header><dl className="rcpc-spec-grid"><div><dt>서버실</dt><dd>{item.serverRoomName ?? '-'}</dd></div><div><dt>상태</dt><dd>{rentalLabels[item.rentalStatus] ?? item.rentalStatus} / {connectionLabels[item.connectionStatus] ?? item.connectionStatus}</dd></div><div><dt>이용 기간</dt><dd>{item.serviceStartedAt ?? '-'} / {item.serviceEndsAt ?? '-'}</dd></div><div><dt>누적 트래픽</dt><dd>{traffic(item.trafficDownloadTotalBytes)} / {traffic(item.trafficUploadTotalBytes)}</dd></div><div><dt>OS</dt><dd>{item.pcSpec?.osName ?? '-'}</dd></div><div><dt>CPU</dt><dd>{item.pcSpec?.cpuModel ?? '-'}</dd></div><div><dt>RAM</dt><dd>{item.pcSpec?.ramGb == null ? '-' : `${item.pcSpec.ramGb} GB`}</dd></div><div><dt>GPU</dt><dd>{item.pcSpec?.gpuModel ?? '-'}</dd></div><div><dt>SSD / HDD</dt><dd>{item.pcSpec?.ssdGb ?? '-'} GB / {item.pcSpec?.hddGb ?? '-'} GB</dd></div></dl><div className="rcpc-detail-actions">{canEditAlias ? <RcpcAliasButton api={api} item={item} mutations={mutations}/> : null}<RcpcSpecButton api={api} item={item}/><Link to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Link>{canExtend && !endedRental(item.rentalStatus) ? <><RcpcExtension api={api} item={item}/><RcpcReplacementCheckoutEntry api={api} rentalId={item.rentalId}/></> : null}</div><section className="rcpc-detail-card__remote"><RcpcRemoteAccess key={item.rentalId} api={api} item={item}/><div><RcpcWanIp key={`wan:${item.rentalId}`} api={api} item={item}/><RcpcReboot api={api} item={item}/></div></section></section> : null}</div></MyPageLayout>
}
function RcpcExtension({ api, item }: { api: MyRcpcReadServices; item: MyRcpcDetail }) {
  return <RcpcExtensionCheckout api={api} rentalIds={[item.rentalId]} displayTargets={[{ rcpcId: item.productNo, location: item.serverRoomName ?? undefined, os: [item.pcSpec?.osName, item.pcSpec?.osVersion].filter(Boolean).join(' '), cpu: item.pcSpec?.cpuModel ?? undefined, ram: item.pcSpec?.ramGb == null ? undefined : `${item.pcSpec.ramGb}GB`, disk: [`SSD ${item.pcSpec?.ssdGb ?? '-'}GB`, `HDD ${item.pcSpec?.hddGb ?? '-'}GB`].join(' / '), gpu: item.pcSpec?.gpuModel ?? undefined }]}/>
}
