import { useQuery } from '@tanstack/react-query'
import { InquiryAction } from '../inquiries/InquiryAction'
import { useState } from 'react'
import { useParams } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { useSession } from '@/app/session/SessionProvider'
import { ApiClientError } from '@/api/httpClient'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { MyRcpcReadServices, InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { pendingOrders } from '../shared/pendingConfirmationOrders'
import { MyPageLayout, MyPageMobileFilterSheet } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { RcpcDashboardTable } from '../rcpc/RcpcDashboardTable'
import { OrderItemActions } from '../orders/OrderItemActions'
import { accountDate } from '../shared/AccountReadCommon'
import { ProfileAvatar } from './ProfileAvatar'
import windowsBackground from '@/assets/figma/windows-card-render.png'
import windowIcon from '@/assets/figma/icon-window.png'
import moreIcon from '@/assets/figma/notice-zoom-in.svg'
import sortIcon from '@/assets/figma/icon-unfold-less.svg'
import type { SortConfig } from '@/components/ui/SortButtonControl'

type SortKey = NonNullable<MyRcpcQuery['sort']>

async function readStorageSummary(read: MyAccountReadServices, signal: AbortSignal) {
  try {
    return await read.storageSummary(signal)
  } catch (error) {
    // An already-running local API may not have the summary endpoint yet.
    if (!(error instanceof ApiClientError) || ![400, 404].includes(error.status ?? 0)) throw error
  }
  let rentalCount = 0
  let partCount = 0
  const maxPages = 100
  for (let page = 0; page < maxPages; page += 1) {
    const result = await read.storage({ page, size: 100, status: 'stored' }, signal)
    rentalCount += result.items.filter(item => !item.paymentDueAt || new Date(`${item.paymentDueAt}+09:00`).getTime() > Date.now()).length
    if (page + 1 >= result.totalPages) break
    if (page + 1 === maxPages) throw new Error('보관함 상품 수를 모두 확인하지 못했습니다.')
  }
  for (let page = 0; page < maxPages; page += 1) {
    const rows = await read.partStorageOffers(page, signal)
    partCount += rows.filter(row => row.status === 'stored').length
    if (rows.length < 50) break
    if (page + 1 === maxPages) throw new Error('파트 보관 상품 수를 모두 확인하지 못했습니다.')
  }
  return { rentalCount, partCount, totalCount: rentalCount + partCount }
}

const mobileFavoriteSortLabels: Partial<Record<SortKey, string>> = { productNo: 'RCPC', serverRoom: '서버 위치', serverStatus: '서버 상태', servicePeriod: '이용 기간', traffic: '트래픽 사용량' }
const mobileFavoriteSortByLabel: Record<string, SortKey> = Object.fromEntries(Object.entries(mobileFavoriteSortLabels).map(([sort, label]) => [label, sort])) as Record<string, SortKey>
const mobileFavoriteSortItems = Object.values(mobileFavoriteSortLabels)

export function MypageDashboardContent({ detailMode = false, read, rcpcs, inquiries }: { detailMode?: boolean; read: MyAccountReadServices; rcpcs: MyRcpcReadServices; inquiries: InquiryReadServices }) {
  const { storefront, myAccount } = useServices()
  const { rcpcId, id } = useParams()
  const session = useSession()
  const capability = session.status === 'authenticated' ? session.customerSession : null
  const owner = capability?.memberRole === 'owner'
  const commerce = owner && capability?.commerceAvailable === true
  const [favoriteSort, setFavoriteSort] = useState<SortConfig<SortKey>>({ key: 'serverStatus', direction: 'asc' })
  const [mobileFavoriteSortOpen, setMobileFavoriteSortOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<ReadonlySet<number>>(() => new Set())
  const detailRentalId = Number(rcpcId ?? id ?? '')
  const profile = useQuery({ queryKey: ['my-account', 'read', 'profile'], enabled: owner,
    queryFn: ({ signal }) => read.profile(signal), retry: false })
  const benefits = useQuery({ queryKey: ['my-account', 'read', 'benefits'], enabled: commerce,
    queryFn: ({ signal }) => read.benefits(signal), retry: false })
  const favorites = useQuery({ queryKey: ['my-account', 'read', 'home-favorites', favoriteSort],
    enabled: !detailMode, queryFn: ({ signal }) => rcpcs.list({ favorite: true, page: 0, size: 5, sort: favoriteSort.key, sortDirection: favoriteSort.direction }, signal), retry: false })
  const detail = useQuery({ queryKey: ['my-rcpcs', rcpcs.organizationId, 'detail-surface', detailRentalId],
    enabled: detailMode && Number.isSafeInteger(detailRentalId) && detailRentalId > 0,
    queryFn: ({ signal }) => rcpcs.detail(detailRentalId, signal), retry: false })
  const summary = useQuery({ queryKey: ['my-account', 'read', 'home-rcpc-summary'],
    queryFn: ({ signal }) => rcpcs.summary(signal), retry: false })
  const recentInquiries = useQuery({ queryKey: ['my-account', 'read', 'home-inquiries'],
    queryFn: ({ signal }) => inquiries.list({ page: 0, size: 5 }, signal), retry: false })
  const orders = useQuery({ queryKey: ['my-account', 'read', 'home-unconfirmed-orders'], enabled: commerce,
    queryFn: ({ signal }) => pendingOrders(read, signal), retry: false })
  const storage = useQuery({ queryKey: ['my-account', 'read', 'home-storage'], enabled: commerce,
    queryFn: ({ signal }) => readStorageSummary(read, signal), retry: false })
  const posts = useQuery({ queryKey: ['storefront', 'home-my-posts'], enabled: owner,
    queryFn: () => storefront.listPostPage({ page: 1, size: 5, mineOnly: true, sort: 'latest' }), retry: false })
  const counts = summary.data?.usageCounts
  const favoriteHeading = detailMode ? 'RCPC 상세' : owner ? '즐겨찾기 그룹' : '즐겨찾기 내역'
  const favoriteItems = detailMode ? detail.data ? [detail.data] : undefined : favorites.data?.items
  const favoritePending = detailMode ? detail.isPending : favorites.isPending
  const favoriteError = detailMode ? detail.error : favorites.error
  const refetchFavorites = detailMode ? detail.refetch : favorites.refetch
  const pendingOrderItems = orders.data?.flatMap(order => order.items.map(item => ({ item, order }))) ?? []
  const heading = (title: string, href?: string) => <div className="mypage-home-heading"><h2>{title}</h2>{href ? <Link to={href}>더보기 <img alt="" src={moreIcon}/></Link> : null}</div>
  return <MyPageLayout><>
    <div className={`mypage-home${owner ? '' : ' is-manager'}`}>
      <section className="mypage-home-summary">
        <div className="mypage-home-user">
          {detailMode ? <span className="mypage-home-user__device"><img alt="" src={windowIcon}/></span> : <ProfileAvatar key={profile.data?.profileImageAttachmentId ?? 'default'} attachmentId={owner ? profile.data?.profileImageAttachmentId : null}/>}
          <div><strong>{owner ? profile.data?.name ?? profile.data?.nickname ?? profile.data?.username ?? '내 계정' : capability?.displayName ?? '내 계정'} <span>✓ {owner ? '대표관리자' : '담당자'}</span></strong><p>{owner ? '보유 RCPC와 이용현황을 확인해 보세요.' : '관리 RCPC와 이용현황을 확인해 보세요.'}</p></div>
        </div>
        {owner && <><Link to="/mypage/points"><span>보유 포인트</span><strong>{benefits.data?.pointBalance.toLocaleString('ko-KR') ?? 0}<small>점</small></strong></Link><Link to="/mypage/coupons"><span>보유 쿠폰</span><strong>{benefits.data?.availableCouponCount ?? 0}<small>장</small></strong></Link></>}
      </section>
      {owner ? <AccountQueryState pending={profile.isPending || benefits.isPending} error={profile.error ?? benefits.error} retry={() => { void profile.refetch(); void benefits.refetch() }}/> : null}

      <section className="mypage-home-section mypage-home-section--rcpc">
        {heading(favoriteHeading, detailMode ? '/mypage/rcpc' : owner ? '/mypage/favorites' : '/mypage/rcpc')}
        <div className="mypage-home-mobile-heading"><Link to={detailMode ? '/mypage/rcpc' : owner ? '/mypage/favorites' : '/mypage/rcpc'}>{favoriteHeading} <span aria-hidden="true">›</span></Link><button aria-expanded={mobileFavoriteSortOpen} aria-haspopup="dialog" className="mypage-mobile-filter-trigger" onClick={() => setMobileFavoriteSortOpen(true)} type="button">{mobileFavoriteSortLabels[favoriteSort.key] ?? '서버 상태'}<img alt="" src={sortIcon}/></button></div>
        <AccountQueryState pending={favoritePending} error={favoriteError} retry={refetchFavorites}/>
        {favoriteItems ? <RcpcDashboardTable api={rcpcs} canEditAlias={owner} canExtend={commerce} emptyMessage={detailMode ? '선택한 RCPC를 찾을 수 없습니다.' : '즐겨찾기로 등록된 RCPC가 없습니다.'} items={favoriteItems} mutations={owner ? myAccount.rcpcMutations : undefined} onSelectedChange={setSelectedFavorites} onSort={setFavoriteSort} selectable={detailMode} selected={selectedFavorites} sortConfig={favoriteSort} mobileVariant="rcpc" showAccessValuesByDefault/> : null}
      </section>

      <div className={`mypage-home-columns${owner ? '' : ' is-manager'}`}>
        <div>
          <section>
            {heading('이용현황', '/mypage/rcpc')}
            <AccountQueryState pending={summary.isPending || (owner && orders.isPending)} error={summary.error ?? (owner ? orders.error : null)} retry={() => { void summary.refetch(); if (owner) void orders.refetch() }}/>
            <div className="mypage-home-use">
              <div><span>이용 중<strong>{counts?.using ?? 0}<small>대</small></strong></span><span>연장대기<strong>{counts?.extension_waiting ?? 0}<small>대</small></strong></span><span>종료<strong>{counts?.ended ?? 0}<small>대</small></strong></span></div>
              {owner && pendingOrderItems.length > 0 ? <div className="mypage-home-use__orders"><p>구매 확정이 필요한 주문 <b>{pendingOrderItems.length}</b><Link to="/mypage/orders">주문내역 보기</Link></p><div className="mypage-home-use__order-list">{pendingOrderItems.slice(0, 2).map(({ item, order }) => <article key={item.orderItemId}><div className="mypage-home-use__product"><img alt="" src={windowsBackground}/><span><strong>{item.productNo}</strong><small>주문번호 {order.orderNo}</small></span></div><OrderItemActions api={read} item={item} paymentStatus={order.paymentStatus} orderStatus={order.orderStatus} variant="dashboard"/></article>)}</div></div> : null}
            </div>
          </section>
          {owner ? <section className="mypage-home-storage">{heading('보관함', '/mypage/storage')}<AccountQueryState pending={storage.isPending} error={storage.error} retry={storage.refetch}/><div className="mypage-home-storage__card"><span>결제 대기</span><strong>{storage.data?.totalCount ?? '—'}<small>건</small></strong></div></section> : null}
        </div>
        <div>
          <section>{heading('문의/AS 내역', '/mypage/inquiries')}<AccountQueryState pending={recentInquiries.isPending} error={recentInquiries.error} retry={recentInquiries.refetch}/><div className="mypage-home-text-list">{recentInquiries.data?.items.length === 0 ? <p>등록된 문의 내역이 없습니다.</p> : recentInquiries.data?.items.map(item => <InquiryAction appearance="text" key={item.operationRequestId} requestId={item.operationRequestId}><span><small>{item.customerVisibleStatus}</small><span className="mypage-home-text-list__title">{item.title}</span></span><time>{accountDate(item.createdAt)}</time></InquiryAction>)}</div></section>
          {owner ? <section className="mypage-home-posts">{heading('내 게시글', '/community/posts?mineOnly=true')}<AccountQueryState pending={posts.isPending} error={posts.error} retry={posts.refetch}/><div className="mypage-home-text-list">{posts.data?.items.length === 0 ? <p>작성한 게시글이 없습니다.</p> : posts.data?.items.map(post => <Link key={post.id} to={`/community/posts/${encodeURIComponent(post.postId)}`}><span><small>{post.boardName}</small><span className="mypage-home-text-list__title">{post.title} ({post.comments})</span></span><time>{post.date}</time></Link>)}</div></section> : null}
        </div>
      </div>
    </div>
    <MyPageMobileFilterSheet items={mobileFavoriteSortItems} open={mobileFavoriteSortOpen} onClose={() => setMobileFavoriteSortOpen(false)} onSelect={label => setFavoriteSort({ key: mobileFavoriteSortByLabel[label] ?? favoriteSort.key, direction: 'asc' })}/>
  </></MyPageLayout>
}
