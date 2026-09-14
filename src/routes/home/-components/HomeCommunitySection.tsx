import type { useHomeContent } from './hooks/useHomeContent'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import commentBubble from '../../../assets/figma/community-bubble.svg'
import noticeZoom from '../../../assets/figma/notice-zoom-in.svg'
import reviewStarEmpty from '../../../assets/figma/review-star-empty.svg'
import reviewStarFilled from '../../../assets/figma/review-star-filled.svg'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import { SectionHeading } from './HomeSectionHeading'


export function HomeCommunitySection({ content, onWritePost }: { content: Pick<ReturnType<typeof useHomeContent>, 'posts' | 'articles' | 'reviews'>; onWritePost: () => void }) {
  const communityPosts = content.posts.data?.slice(0, 4) ?? []
  const reviews = content.reviews.data?.slice(0, 4) ?? []
  const notice = content.articles.data?.[0]
  return (
      <section className="home-section community-section">
        <div className="content-container">
          {notice ? <Link className="notice-card" to={`/support/${notice.articleId}`}><strong>공지사항</strong><i aria-hidden="true" /><span>{notice.title}</span><time>{notice.date}</time><img alt="" src={noticeZoom} /></Link> : content.articles.isPending ? <LoadingState className="route-loading--compact" label="공지사항을 불러오는 중입니다." /> : <p role={content.articles.isError ? 'alert' : 'status'}>{content.articles.isError ? '공지사항을 불러오지 못했습니다.' : '공지사항이 없습니다.'}</p>}
          <div className="community-grid"><article><SectionHeading link="/community/posts" linkLabel="전체보기">커뮤니티 게시판</SectionHeading><button className="community-write-link" onClick={onWritePost} type="button">글쓰기</button><ul>{content.posts.isError ? <li role="alert">게시글을 불러오지 못했습니다.</li> : content.posts.isPending ? <li><LoadingState className="route-loading--compact" label="게시글을 불러오는 중입니다." /></li> : communityPosts.length === 0 ? <li>게시글이 없습니다.</li> : null}{communityPosts.map((post) => <li key={post.id}><Link to={`/community/posts/${post.postId}`}><span>{post.title} <small className="community-comment-count"><img alt="" src={commentBubble} />{post.comments}</small></span><time>{post.date}</time></Link></li>)}</ul></article><article><SectionHeading link="/community/reviews" linkLabel="전체보기">렌탈 후기</SectionHeading><ul>{content.reviews.isError ? <li role="alert">후기를 불러오지 못했습니다.</li> : content.reviews.isPending ? <li><LoadingState className="route-loading--compact" label="후기를 불러오는 중입니다." /></li> : reviews.length === 0 ? <li>후기가 없습니다.</li> : null}{reviews.map((review, index) => <li key={`${review.content}-${index}`}><Link state={{ publishingPopup: 'rental-review', reviewId: review.reviewId }} to="/community/reviews"><span>{review.content}</span><span aria-label={`별점 ${review.rating}점`} className="community-review-stars">{Array.from({ length: 5 }, (_, starIndex) => <img alt="" key={starIndex} src={starIndex < review.rating ? reviewStarFilled : reviewStarEmpty} />)}</span></Link></li>)}</ul></article></div>
        </div>
      </section>
  )
}
