import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { myRcpcQuerySchema } from '@/api/myRcpc'
import { useSession } from '@/app/session/SessionProvider'
import { Pagination } from '@/components/ui/PaginationControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { MyPageLayout, MyPageMobileFilterSheet, MyPageTabs, MyPageToolbar } from '../MypageComponentsView'
import { AccountQueryState } from './AccountQueryState'
import { RcpcListSurface } from './RcpcListSurface'
import { loadAuthorizedRcpcs } from './rcpcPresentation'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type SortKey = NonNullable<MyRcpcQuery['sort']>

const mobileSortLabels: Partial<Record<SortKey, string>> = {
  productNo: 'RCPC',
  serverRoom: '서버 위치',
  serverStatus: '서버 상태',
  servicePeriod: '이용 기간',
  traffic: '트래픽 사용량',
}
const mobileSortByLabel = Object.fromEntries(Object.entries(mobileSortLabels).map(([sort, label]) => [label, sort])) as Record<string, SortKey>
const mobileSortItems = Object.values(mobileSortLabels)

export function RcpcListContent({ api, mutations }: { api: MyRcpcReadServices; mutations?: RcpcMutations }) {
  const session = useSession()
  const [searchParams] = useSearchParams()
  const initialProductNo = (searchParams.get('productNo') ?? '').slice(0, 50)
  const parsedStatus = myRcpcQuerySchema.safeParse({ status: searchParams.get('status') ?? undefined })
  const parsedUsage = myRcpcQuerySchema.safeParse({ usageStatus: searchParams.get('usageStatus') ?? undefined })
  const initialStatus = parsedStatus.success ? parsedStatus.data.status : undefined
  const initialUsage = parsedUsage.success ? parsedUsage.data.usageStatus : undefined
  const [mobileSortOpen, setMobileSortOpen] = useState(false)
  const [query, setQuery] = useState<MyRcpcQuery>({
    page: 0,
    size: 20,
    sort: 'serverStatus',
    productNo: initialProductNo || undefined,
    status: initialStatus,
    usageStatus: initialUsage,
  })

  useEffect(() => {
    setQuery(previous => ({
      ...previous,
      page: 0,
      productNo: initialProductNo || undefined,
      status: initialStatus,
      usageStatus: initialUsage,
    }))
  }, [initialProductNo, initialStatus, initialUsage])

  const available = useQuery({
    queryKey: ['my-rcpcs', api.organizationId, 'authorized-options'],
    queryFn: ({ signal }) => loadAuthorizedRcpcs(api, signal),
  })
  const regions = [...new Set((available.data ?? []).map(item => item.serverRoomRegion).filter((value): value is string => Boolean(value)))].sort()
  const rooms = [...new Map((available.data ?? [])
    .filter(item => item.serverRoomId !== null && (!query.region || item.serverRoomRegion === query.region))
    .map(item => [item.serverRoomId!, item.serverRoomName ?? String(item.serverRoomId)])).entries()]
  const rows = useQuery({
    queryKey: ['my-rcpcs', api.organizationId, query],
    queryFn: ({ signal }) => api.list(query, signal),
  })
  const capability = session.status === 'authenticated' ? session.customerSession : null
  const canExtend = capability?.memberRole === 'owner' && capability.commerceAvailable
  const canEditAlias = capability?.memberRole === 'owner'
  const currentUsage = query.usageStatus
  const activeTab = currentUsage === 'using'
    ? 'using'
    : currentUsage === 'extension_waiting'
      ? 'waiting'
      : currentUsage === 'ended'
        ? 'ended'
        : 'all'
  const usageCounts = (available.data ?? []).reduce((counts, item) => ({
    ...counts,
    [item.usageStatus]: (counts[item.usageStatus] ?? 0) + 1,
  }), {} as Record<string, number>)
  const tabs = [
    { id: 'all', label: `전체 ${available.data?.length ?? 0}`, href: '/mypage/rcpc' },
    { id: 'using', label: `이용 중 ${usageCounts.using ?? 0}`, href: '/mypage/rcpc?usageStatus=using' },
    { id: 'waiting', label: `연장대기 ${usageCounts.extension_waiting ?? 0}`, href: '/mypage/rcpc?usageStatus=extension_waiting' },
    { id: 'ended', label: `이용 종료 ${usageCounts.ended ?? 0}`, href: '/mypage/rcpc?usageStatus=ended' },
  ]
  const emptyMessage = query.usageStatus ? '해당 상태의 RCPC가 없습니다.' : '이용 중인 RCPC가 없습니다.'

  return <MyPageLayout title="이용 RCPC">
    <div className="rcpc-list-page">
      <div className="mobile-list-page-heading mobile-list-page-heading--rcpc">
        <h1>이용 RCPC</h1>
        <button aria-expanded={mobileSortOpen} aria-haspopup="dialog" onClick={() => setMobileSortOpen(true)} type="button">
          {mobileSortLabels[query.sort ?? 'serverStatus'] ?? '서버 상태'} <span aria-hidden="true">↕</span>
        </button>
      </div>
      <MyPageTabs active={activeTab} items={tabs}/>
      <MyPageToolbar count={rows.data?.totalElements ?? 0} label="총" suffix="개 상품">
        <NativeSelect aria-label="서버 위치" onChange={event => setQuery(previous => ({ ...previous, page: 0, region: event.target.value || undefined, serverRoomId: undefined }))} value={query.region ?? ''}>
          <option value="">서버 위치 전체</option>
          {regions.map(region => <option key={region} value={region}>{region}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="서버실" onChange={event => setQuery(previous => ({ ...previous, page: 0, serverRoomId: event.target.value ? Number(event.target.value) : undefined }))} value={query.serverRoomId ?? ''}>
          <option value="">서버실 선택</option>
          {rooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </NativeSelect>
      </MyPageToolbar>
      {available.error ? <p role="alert">서버실 목록을 불러오지 못했습니다. <button onClick={() => void available.refetch()} type="button">다시 시도</button></p> : null}
      <AccountQueryState error={rows.error} pending={rows.isPending} retry={rows.refetch}/>
      {rows.data ? <>
        <RcpcListSurface api={api} canEditAlias={canEditAlias} canExtend={canExtend} emptyMessage={emptyMessage} items={rows.data.items} mutations={mutations} onSort={sort => setQuery(previous => ({ ...previous, page: 0, sort }))} sort={query.sort}/>
        {rows.data.totalPages > 1 ? <Pagination currentPage={rows.data.page + 1} onPageChange={page => setQuery(previous => ({ ...previous, page: page - 1 }))} totalPages={rows.data.totalPages}/> : null}
      </> : null}
    </div>
    <MyPageMobileFilterSheet items={mobileSortItems} onClose={() => setMobileSortOpen(false)} onSelect={label => setQuery(previous => ({ ...previous, page: 0, sort: mobileSortByLabel[label] ?? previous.sort }))} open={mobileSortOpen}/>
  </MyPageLayout>
}
