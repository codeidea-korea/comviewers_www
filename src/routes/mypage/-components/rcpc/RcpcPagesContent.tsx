import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { myRcpcQuerySchema } from '@/api/myRcpc'
import { useSession } from '@/app/session/SessionProvider'
import { Pagination } from '@/components/ui/PaginationControl'
import { RcpcFilterSelect as NativeSelect } from '../RcpcFilterSelect'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { MyPageLayout, MyPageTabs, MyPageToolbar } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { isAccountReadDenied } from '../accountReadAccess'
import { AccountReadDeniedDialog } from '../modals/AccountReadDeniedDialog'
import { RcpcMobileSort } from '../RcpcMobileSort'
import { RcpcListSurface } from '../RcpcListSurface'
import { serverPresenceQueryOptions } from '@/lib/serverPresenceQueryOptions'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
export function RcpcListContent({ api, mutations }: { api: MyRcpcReadServices; mutations?: RcpcMutations }) {
  const { uiText, t } = useUiTranslation()
  const session = useSession()
  const [searchParams] = useSearchParams()
  const initialProductNo = (searchParams.get('productNo') ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16)
  const parsedStatus = myRcpcQuerySchema.safeParse({ status: searchParams.get('status') ?? undefined })
  const parsedUsage = myRcpcQuerySchema.safeParse({ usageStatus: searchParams.get('usageStatus') ?? undefined })
  const initialStatus = parsedStatus.success ? parsedStatus.data.status : undefined
  const initialUsage = parsedUsage.success ? parsedUsage.data.usageStatus : undefined
  const [query, setQuery] = useState<MyRcpcQuery>({
    page: 0,
    size: 10,
    sort: 'serverStatus',
    sortDirection: 'asc',
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

  const [canRetainRows, setCanRetainRows] = useState(true)
  const available = useQuery({
    queryKey: ['my-rcpcs', api.organizationId, 'filter-options'],
    queryFn: ({ signal }) => api.filterOptions(signal),
  })
  const rows = useQuery({
    ...serverPresenceQueryOptions,
    queryKey: ['my-rcpcs', api.organizationId, query],
    queryFn: ({ signal }) => api.list(query, signal),
    meta: { rcpcListScope: api },
    placeholderData: (previous, previousQuery) => canRetainRows && previousQuery?.state.status === 'success'
      && previousQuery.meta?.rcpcListScope === api
      && previousQuery.queryKey[0] === 'my-rcpcs'
      && previousQuery.queryKey[1] === api.organizationId
      && typeof previousQuery.queryKey[2] === 'object' ? previous : undefined,
  })
  const listRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState(0)
  useLayoutEffect(() => {
    const element = listRef.current
    if (!element || rows.isPending || rows.isError) return
    const measure = () => setListHeight(element.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [rows.isPending, rows.isError])
  // The observer can remember a successful query from before a no-data error.
  const retentionError = rows.isError || available.isError
  if (retentionError && canRetainRows) setCanRetainRows(false)
  if (!retentionError && rows.isSuccess && !rows.isPlaceholderData && !canRetainRows) setCanRetainRows(true)
  const accessDenied = isAccountReadDenied(available.error) || isAccountReadDenied(rows.error)
  // A forbidden response must also hide data retained from an earlier successful query.
  const filterOptions = accessDenied ? undefined : available.data
  const page = accessDenied ? undefined : rows.data
  const regions = filterOptions?.regions ?? []
  const rooms = (filterOptions?.serverRooms ?? [])
    .filter(room => !query.region || room.region === query.region)
    .map(room => [room.id, room.name ?? String(room.id)] as const)
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
  const usageCounts = filterOptions?.usageCounts ?? {}
  const tabs = [
    { id: 'all', label: t("mypageRcpc.ui211", { v0: filterOptions?.total ?? 0 }), href: '/mypage/rcpc' },
    { id: 'using', label: t("mypageRcpc.ui212", { v0: usageCounts.using ?? 0 }), href: '/mypage/rcpc?usageStatus=using' },
    { id: 'waiting', label: t("mypageRcpc.ui213", { v0: usageCounts.extension_waiting ?? 0 }), href: '/mypage/rcpc?usageStatus=extension_waiting' },
    { id: 'ended', label: t("mypageRcpc.ui214", { v0: usageCounts.ended ?? 0 }), href: '/mypage/rcpc?usageStatus=ended' },
  ]
  const emptyMessage = query.usageStatus ? uiText("해당 상태의 RCPC가 없습니다.") : uiText("이용 중인 RCPC가 없습니다.")

  return <MyPageLayout title={uiText("이용 RCPC")}>
    <div className="rcpc-list-page" ref={listRef} style={rows.isPending && listHeight > 0 ? { minHeight: listHeight } : undefined}>
      <div className="mobile-list-page-heading mobile-list-page-heading--rcpc">
        <h1>{uiText("이용 RCPC")}</h1>
        <RcpcMobileSort disabled={accessDenied} sort={{ key: query.sort ?? 'serverStatus', direction: query.sortDirection ?? 'asc' }} onChange={sort => setQuery(previous => ({ ...previous, page: 0, sort: sort.key, sortDirection: sort.direction }))}/>
      </div>
      <MyPageTabs active={activeTab} items={tabs} preventScrollReset/>
      <MyPageToolbar count={page?.totalElements ?? 0} label={uiText("총")} suffix={uiText("개 상품")}>
        <NativeSelect aria-label={uiText("서버 위치")} disabled={accessDenied} onChange={event => {
          const region = event.target.value || undefined
          const matchingRooms = filterOptions?.serverRooms.filter(room => room.region === region) ?? []
          setQuery(previous => ({ ...previous, page: 0, region, serverRoomId: matchingRooms.length === 1 ? matchingRooms[0].id : undefined }))
        }} value={accessDenied ? '' : query.region ?? ''}>
          <option value="">{uiText("서버 위치 전체")}</option>
          {regions.map(region => <option key={region} value={region}>{region}</option>)}
        </NativeSelect>
        <NativeSelect aria-label={uiText("서버실")} disabled={accessDenied} onChange={event => setQuery(previous => ({ ...previous, page: 0, serverRoomId: event.target.value ? Number(event.target.value) : undefined }))} value={accessDenied ? '' : query.serverRoomId ?? ''}>
          <option value="">{uiText("서버실 선택")}</option>
          {rooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </NativeSelect>
      </MyPageToolbar>
      {!accessDenied && available.error ? <p role="alert">{uiText("서버실 목록을 불러오지 못했습니다.")} <button onClick={() => void available.refetch()} type="button">{uiText("다시 시도")}</button></p> : null}
      {!accessDenied ? <AccountQueryState error={rows.error} pending={rows.isPending} retry={rows.refetch}/> : null}
      {accessDenied || page ? <>
        <RcpcListSurface api={api} canEditAlias={canEditAlias} canExtend={canExtend} emptyMessage={emptyMessage} items={page?.items ?? []} key={`${api.organizationId}:${accessDenied}:${JSON.stringify(query)}`} mutations={mutations} onSort={sort => { if (!accessDenied) setQuery(previous => ({ ...previous, page: 0, sort: sort.key, sortDirection: sort.direction })) }} pending={rows.isPlaceholderData} sortConfig={{ key: query.sort ?? 'serverStatus', direction: query.sortDirection ?? 'asc' }}/>
        {page && page.totalPages > 1 ? <Pagination currentPage={(rows.isPlaceholderData ? query.page ?? 0 : page.page) + 1} onPageChange={nextPage => setQuery(previous => ({ ...previous, page: nextPage - 1 }))} totalPages={page.totalPages}/> : null}
      </> : null}
    </div>
    {accessDenied ? <AccountReadDeniedDialog key={api.organizationId} resource="RCPC"/> : null}
  </MyPageLayout>
}
