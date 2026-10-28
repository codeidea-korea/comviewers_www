import { useUiTranslation } from '@/i18n/uiTranslation'
import { LocalizedServerRoomOption } from '@/components/mypage/LocalizedServerRoomOption'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { myRcpcQuerySchema } from '@/api/myRcpc'
import { useSession } from '@/app/session/SessionProvider'
import { RcpcFilterSelect as NativeSelect } from '../RcpcFilterSelect'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { MyPageLayout, MyPageTabs, MyPageToolbar } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { isAccountReadDenied } from '../accountReadAccess'
import { AccountReadDeniedDialog } from '../modals/AccountReadDeniedDialog'
import { RcpcMobileSort } from '../RcpcMobileSort'
import { RcpcListSurface } from '../RcpcListSurface'
import { serverPresenceQueryOptions } from '@/lib/serverPresenceQueryOptions'
import { useRcpcInquiryItems } from './useRcpcInquiryItems'

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

  const available = useQuery({
    queryKey: ['my-rcpcs', api.organizationId, 'filter-options'],
    queryFn: ({ signal }) => api.filterOptions(signal),
  })
  const rows = useInfiniteQuery({
    ...serverPresenceQueryOptions,
    queryKey: ['my-rcpcs', api.organizationId, 'infinite-list', query],
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => api.list({ ...query, page: pageParam }, signal),
    getNextPageParam: last => last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  })
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } = rows
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage || isFetching || isFetchNextPageError) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void fetchNextPage()
    }, { rootMargin: '300px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage])
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
  const [selectionAccessDenied, setSelectionAccessDenied] = useState(false)
  useEffect(() => { setSelectionAccessDenied(false) }, [api.organizationId])
  const accessDenied = selectionAccessDenied || isAccountReadDenied(available.error) || isAccountReadDenied(rows.error)
  const filterOptions = accessDenied ? undefined : available.data
  const page = accessDenied ? undefined : rows.data?.pages[0]
  const loadedItems = accessDenied || !rows.data ? undefined : [...new Map(
    rows.data.pages.flatMap(part => part.items).map(item => [item.rentalId, item] as const),
  ).values()]
  const inquiryItems = useRcpcInquiryItems(api.organizationId, loadedItems, rows.dataUpdatedAt)
  const loadAll = async (signal: AbortSignal) => {
    try {
      const first = await api.list({ ...query, page: 0, size: 100 }, signal)
      const items = [...first.items]
      for (let pageNumber = 1; pageNumber < first.totalPages; pageNumber += 1) {
        const next = await api.list({ ...query, page: pageNumber, size: 100 }, signal)
        if (next.totalElements !== first.totalElements || next.totalPages !== first.totalPages) throw new Error('목록이 변경되었습니다.')
        items.push(...next.items)
      }
      const unique = [...new Map(items.map(item => [item.rentalId, item] as const)).values()]
      if (unique.length !== first.totalElements) throw new Error('목록이 변경되었습니다.')
      return unique
    } catch (error) {
      if (error instanceof Error && isAccountReadDenied(error)) setSelectionAccessDenied(true)
      throw error
    }
  }
  const regions = filterOptions?.regions ?? []
  const rooms = (filterOptions?.serverRooms ?? [])
    .filter(room => !query.region || room.region === query.region)
    .map(room => [room.id, room.name] as const)
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
          {regions.map(region => <LocalizedServerRoomOption key={region} value={region} kind="serverRoomRegion" name={region} />)}
        </NativeSelect>
        <NativeSelect aria-label={uiText("서버실")} disabled={accessDenied} onChange={event => setQuery(previous => ({ ...previous, page: 0, serverRoomId: event.target.value ? Number(event.target.value) : undefined }))} value={accessDenied ? '' : query.serverRoomId ?? ''}>
          <option value="">{uiText("서버실 선택")}</option>
          {rooms.map(([id, name]) => <LocalizedServerRoomOption key={id} value={id} name={name} fallback={String(id)} />)}
        </NativeSelect>
      </MyPageToolbar>
      {!accessDenied && available.error ? <p role="alert">{uiText("서버실 목록을 불러오지 못했습니다.")} <button onClick={() => void available.refetch()} type="button">{uiText("다시 시도")}</button></p> : null}
      {!accessDenied ? <AccountQueryState error={rows.isFetchNextPageError ? null : rows.error} pending={rows.isPending} retry={rows.refetch}/> : null}
      {accessDenied || page ? <>
        <RcpcListSurface api={api} canEditAlias={canEditAlias} canExtend={canExtend} emptyMessage={emptyMessage} items={inquiryItems ?? []} totalCount={page?.totalElements ?? 0} loadAll={loadAll} key={`${api.organizationId}:${accessDenied}:${JSON.stringify(query)}`} mutations={mutations} onSort={sort => { if (!accessDenied) setQuery(previous => ({ ...previous, page: 0, sort: sort.key, sortDirection: sort.direction })) }} pending={false} sortConfig={{ key: query.sort ?? 'serverStatus', direction: query.sortDirection ?? 'asc' }}/>
        {!accessDenied && rows.hasNextPage ? <div ref={sentinelRef} role="status">{rows.isFetchingNextPage ? <p className="rcpc-list__loading">{uiText("정보를 불러오는 중입니다.")}</p> : null}</div> : null}
        {!accessDenied && rows.isFetchNextPageError ? <p role="alert">{uiText("목록을 불러오지 못했습니다.")} <button type="button" onClick={() => void rows.fetchNextPage()}>{uiText("다시 시도")}</button></p> : null}
      </> : null}
    </div>
    {accessDenied ? <AccountReadDeniedDialog key={api.organizationId} resource="RCPC"/> : null}
  </MyPageLayout>
}
