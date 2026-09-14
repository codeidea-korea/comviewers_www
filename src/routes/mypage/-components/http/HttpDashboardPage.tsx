import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useServices } from '@/app/ServiceProvider'
import { useSession } from '@/app/session/SessionProvider'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { MyRcpcReadServices, InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { pendingOrders } from './pendingConfirmationOrders'
import { MyPageLayout, MyPageMobileFilterSheet } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { HttpRcpcTable } from '../HttpRcpcTable'
import { HttpOrderItemActions } from './HttpOrderItemActions'
import { accountDate } from './AccountReadCommon'
import { ProfileAvatar } from './ProfileAvatar'

type SortKey = NonNullable<MyRcpcQuery['sort']>

const mobileFavoriteSortLabels: Partial<Record<SortKey, string>> = { productNo: 'RCPC', serverRoom: '서버 위치', serverStatus: '서버 상태', servicePeriod: '이용 기간', traffic: '트래픽 사용량' }
const mobileFavoriteSortByLabel: Record<string, SortKey> = Object.fromEntries(Object.entries(mobileFavoriteSortLabels).map(([sort, label]) => [label, sort])) as Record<string, SortKey>
const mobileFavoriteSortItems = Object.values(mobileFavoriteSortLabels)

export function HttpDashboardPage({ read, rcpcs, inquiries }: { read: MyAccountReadServices; rcpcs: MyRcpcReadServices; inquiries: InquiryReadServices }) {
  const { storefront, myAccount } = useServices()
  const session = useSession()
  const capability = session.status === 'authenticated' ? session.customerSession : null
  const owner = capability?.memberRole === 'owner'
  const commerce = owner && capability?.commerceAvailable === true
  const [favoriteSort, setFavoriteSort] = useState<SortKey>('serverStatus')
  const [mobileFavoriteSortOpen, setMobileFavoriteSortOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<ReadonlySet<number>>(() => new Set())
  const profile = useQuery({ queryKey: ['my-account', 'http', 'profile'], enabled: owner,
    queryFn: ({ signal }) => read.profile(signal), retry: false })
  const benefits = useQuery({ queryKey: ['my-account', 'http', 'benefits'], enabled: commerce,
    queryFn: ({ signal }) => read.benefits(signal), retry: false })
  const favorites = useQuery({ queryKey: ['my-account', 'http', 'home-favorites', favoriteSort],
    queryFn: ({ signal }) => rcpcs.list({ favorite: true, page: 0, size: 5, sort: favoriteSort }, signal), retry: false })
  const summary = useQuery({ queryKey: ['my-account', 'http', 'home-rcpc-summary'],
    queryFn: ({ signal }) => rcpcs.summary(signal), retry: false })
  const recentInquiries = useQuery({ queryKey: ['my-account', 'http', 'home-inquiries'],
    queryFn: ({ signal }) => inquiries.list({ page: 0, size: 5 }, signal), retry: false })
  const orders = useQuery({ queryKey: ['my-account', 'http', 'home-unconfirmed-orders'], enabled: commerce,
    queryFn: ({ signal }) => pendingOrders(read, signal), retry: false })
  const storage = useQuery({ queryKey: ['my-account', 'http', 'home-storage'], enabled: commerce,
    queryFn: ({ signal }) => read.storage({ page: 0, size: 1, status: 'unpaid' }, signal), retry: false })
  const posts = useQuery({ queryKey: ['storefront', 'home-my-posts'], enabled: owner,
    queryFn: () => storefront.listPosts({ mineOnly: true, sort: 'latest' }), retry: false })
  const counts = summary.data?.usageCounts
  const favoriteHeading = owner ? '즐겨찾기 그룹' : '즐겨찾기 내역'
  const heading = (title: string, href: string, linkLabel = '더보기') => <div className="mypage-home-heading"><h2>{title}</h2><Link to={href}>{linkLabel}</Link></div>
  return <MyPageLayout><><div className="mypage-home mypage-home--live">
    <section className="mypage-home-summary"><div className="mypage-home-user"><ProfileAvatar key={profile.data?.profileImageAttachmentId ?? 'default'} attachmentId={owner ? profile.data?.profileImageAttachmentId : null}/><div><strong>{owner ? profile.data?.name ?? profile.data?.nickname ?? profile.data?.username ?? '내 계정' : capability?.displayName ?? '내 계정'} <span>{owner ? '대표관리자' : 'C매니저'}</span></strong><p>{owner ? '보유 RCPC와 이용현황을 확인해 보세요.' : '배정된 RCPC와 문의를 확인해 보세요.'}</p></div></div>
      {owner && <><AccountQueryState pending={profile.isPending} error={profile.error} retry={profile.refetch}/><AccountQueryState pending={benefits.isPending} error={benefits.error} retry={benefits.refetch}/>{benefits.data && <><Link to="/mypage/points">보유 포인트 <strong>{benefits.data.pointBalance.toLocaleString('ko-KR')}점</strong></Link><Link to="/mypage/coupons">보유 쿠폰 <strong>{benefits.data.availableCouponCount}장</strong></Link></>}</>}
    </section>
    <section className="mypage-home-section mypage-home-section--live-rcpc">{heading(favoriteHeading, '/mypage/favorites')}<div className="mobile-list-page-heading mobile-list-page-heading--rcpc"><h1>{favoriteHeading}</h1><button aria-expanded={mobileFavoriteSortOpen} aria-haspopup="dialog" onClick={() => setMobileFavoriteSortOpen(true)} type="button">{mobileFavoriteSortLabels[favoriteSort] ?? '서버 상태'} <span aria-hidden="true">↕</span></button></div><AccountQueryState pending={favorites.isPending} error={favorites.error} retry={favorites.refetch}/>
      {favorites.data ? <HttpRcpcTable api={rcpcs} canEditAlias={owner} canExtend={commerce} emptyMessage="즐겨찾기로 등록된 RCPC가 없습니다." items={favorites.data.items} mutations={myAccount.rcpcMutations} onSelectedChange={setSelectedFavorites} onSort={setFavoriteSort} selectable={false} selected={selectedFavorites} sort={favoriteSort} mobileVariant="rcpc"/> : null}
    </section>
    <div className="mypage-home-columns"><div><section>{heading('이용현황', '/mypage/rcpc')}<AccountQueryState pending={summary.isPending} error={summary.error} retry={summary.refetch}/>{counts && <div className="mypage-home-use"><div><Link to="/mypage/rcpc?usageStatus=using">이용 중 <strong>{counts.using}대</strong></Link><Link to="/mypage/rcpc?usageStatus=extension_waiting">연장대기 <strong>{counts.extension_waiting}대</strong></Link><Link to="/mypage/rcpc?usageStatus=ended">종료 <strong>{counts.ended}대</strong></Link></div></div>}</section>
      {owner && <>{(orders.isPending || orders.isError || (orders.data?.length ?? 0) > 0) && <section>{heading('구매확정이 필요한 주문', '/mypage/orders', '주문내역 보기')}<AccountQueryState pending={orders.isPending} error={orders.error} retry={orders.refetch}/>{orders.data && <p>총 {orders.data.length}건</p>}{orders.data?.slice(0, 2).map(order => <article key={order.orderId}><Link to={`/mypage/orders/${encodeURIComponent(order.orderNo)}`}>{order.orderNo}</Link>{order.items.slice(0, 2).map(item => <div key={item.orderItemId}><strong>{item.title} · {item.productNo}</strong><HttpOrderItemActions api={read} item={item} paymentStatus={order.paymentStatus} orderStatus={order.orderStatus}/></div>)}</article>)}</section>}
      <section>{heading('보관함', '/mypage/storage')}<AccountQueryState pending={storage.isPending} error={storage.error} retry={storage.refetch}/>{storage.data && <div className="mypage-home-storage__card"><span>결제 대기</span><strong>{storage.data.totalElements}<small>대</small></strong></div>}</section></>}
    </div><div><section>{heading('문의/AS 내역', '/mypage/inquiries')}<AccountQueryState pending={recentInquiries.isPending} error={recentInquiries.error} retry={recentInquiries.refetch}/>{recentInquiries.data?.items.length === 0 && <p>등록된 문의 내역이 없습니다.</p>}<div className="mypage-home-text-list">{recentInquiries.data?.items.map(item => <Link key={item.operationRequestId} to={`/mypage/inquiries/${item.operationRequestId}`}><span>{item.customerVisibleStatus}</span><strong>{item.title}</strong><time>{accountDate(item.createdAt)}</time></Link>)}</div></section>
      {owner && <section>{heading('내 게시글', '/community/posts?mineOnly=true')}<AccountQueryState pending={posts.isPending} error={posts.error} retry={posts.refetch}/>{posts.data?.length === 0 && <p>작성한 게시글이 없습니다.</p>}<div className="mypage-home-text-list">{posts.data?.slice(0, 5).map(post => <Link key={post.id} to={`/community/posts/${encodeURIComponent(post.postId)}`}><span>{post.boardName}</span><strong>{post.title} ({post.comments})</strong><time>{post.date}</time></Link>)}</div></section>}
    </div></div>
  </div><MyPageMobileFilterSheet items={mobileFavoriteSortItems} open={mobileFavoriteSortOpen} onClose={() => setMobileFavoriteSortOpen(false)} onSelect={label => setFavoriteSort(mobileFavoriteSortByLabel[label] ?? favoriteSort)}/></></MyPageLayout>
}
