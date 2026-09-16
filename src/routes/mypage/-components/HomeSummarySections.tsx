import type { MouseEventHandler } from 'react'
import commentIcon from '../../../assets/figma/icon-bubble.png'
import tollIcon from '../../../assets/figma/icon-toll.svg'
import moreIcon from '../../../assets/figma/notice-zoom-in.svg'
import windowsBackground from '../../../assets/figma/windows-card-render.png'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import { AccountQueryState } from './AccountQueryState'
import { useMyAccount,useMyAccountPosts } from './hooks/useMyAccount'

export function HomeSectionHeading({ href, title }: { href?: string; title: string }) {
  return <div className="mypage-home-heading"><h2>{title}</h2>{href ? <Link to={href}>더보기 <img alt="" src={moreIcon} /></Link> : null}</div>
}

export function HomeActivityList({ community = false }: { community?: boolean }) {
  const account = useMyAccount()
  const entries = account.data?.inquiries ?? []
  const posts = useMyAccountPosts()
  return <div className="mypage-home-text-list">{community ? <><AccountQueryState pending={posts.isPending} error={posts.error} retry={posts.refetch}/>{posts.data?.map((post) => <Link key={post.id} to={`/community/posts/${post.postId}`}><span><small>커뮤니티</small><span className="mypage-home-text-list__title">{post.title}<span className="mypage-home-text-list__comments"><i aria-hidden="true"/><img alt="" src={commentIcon}/>{post.comments}</span></span></span><time>{post.date}</time></Link>)}{posts.data?.length === 0 ? <p>작성한 게시글이 없습니다.</p> : null}</> : entries.map((entry) => <Link key={entry.id} to={`/mypage/inquiries/${entry.inquiryId}`}><span><small>{entry.status}</small><span className="mypage-home-text-list__title">{entry.title}</span></span><time>{entry.createdAt}</time></Link>)}</div>
}

export function HomeUseStatusCard({ onOpenPurchase }: { onOpenPurchase: MouseEventHandler<HTMLButtonElement> }) {
  const account = useMyAccount()
  const rcpcs = account.data?.rcpcs ?? []
  const pendingOrders = account.data?.orders.filter((item) => item.status === '결제완료') ?? []
  return <div className="mypage-home-use"><div><span>이용 중<strong>{rcpcs.filter((item) => item.status === '이용중').length}<small>대</small></strong></span><span>연장대기<strong>{rcpcs.filter((item) => item.status === '연장대기').length}<small>대</small></strong></span><span>종료<strong>{rcpcs.filter((item) => item.state === '이용종료').length}<small>대</small></strong></span></div><div className="mypage-home-use__orders"><p>구매 확정이 필요한 주문 <b>{pendingOrders.length}</b><Link to="/mypage/orders">주문내역 보기</Link></p><div className="mypage-home-use__order-list">{pendingOrders.slice(0, 2).map((order) => <article key={order.id}><div className="mypage-home-use__product"><img alt="" src={windowsBackground} /><span><strong>{order.productId}</strong><small>주문번호 {order.orderId}</small></span></div><button onClick={onOpenPurchase} type="button"><span>구매확정</span><span className="mypage-home-use__tooltip"><img alt="" src={tollIcon} />포인트 받기</span></button></article>)}</div></div></div>
}
