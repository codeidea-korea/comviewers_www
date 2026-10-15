import type { useHomeContent } from './hooks/useHomeContent'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import commentBubble from '../../../assets/figma/community-bubble.svg'
import noticeZoom from '../../../assets/figma/notice-zoom-in.svg'
import reviewStarEmpty from '../../../assets/figma/review-star-empty.svg'
import reviewStarFilled from '../../../assets/figma/review-star-filled.svg'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import { SectionHeading } from './HomeSectionHeading'
import { useUiTranslation } from '@/i18n/uiTranslation'


export function HomeCommunitySection({ content }: { content: Pick<ReturnType<typeof useHomeContent>, 'posts' | 'articles' | 'reviews'> }) {
  const { uiText } = useUiTranslation()
  const communityPosts = content.posts.data?.items ?? []
  const reviews = content.reviews.data?.items ?? []
  const notice = content.articles.data?.items[0]
  return (
      <section className="home-section community-section">
        <div className="content-container">
          {notice ? <Link className="notice-card" to={`/support/${notice.articleId}`}><strong>공지사항</strong><i aria-hidden="true" /><span>{notice.title}</span><time>{notice.date}</time><img alt="" src={noticeZoom} /></Link> : content.articles.isPending ? <LoadingState className="route-loading--compact" label="공지사항을 불러오는 중입니다." /> : <p className="notranslate" translate="no" role={content.articles.isError ? 'alert' : 'status'}>{uiText(content.articles.isError ? '공지사항을 불러오지 못했습니다.' : '공지사항이 없습니다.')}</p>}
          <div className="community-grid"><article><SectionHeading link="/community/posts" linkIcon="arrow" linkLabel="전체보기">커뮤니티 게시판</SectionHeading><ul>{content.posts.isError ? <li className="notranslate" translate="no" role="alert">{uiText('게시글을 불러오지 못했습니다.')}</li> : content.posts.isPending ? <li><LoadingState className="route-loading--compact" label="게시글을 불러오는 중입니다." /></li> : communityPosts.length === 0 ? <li className="notranslate" translate="no">{uiText('게시글이 없습니다.')}</li> : null}{communityPosts.map((post) => <li key={post.id}><Link to={`/community/posts/${post.postId}`}><span>{post.title} <small className="community-comment-count"><img alt="" src={commentBubble} />{post.comments}</small></span><time>{post.date}</time></Link></li>)}</ul></article><article><SectionHeading link="/community/reviews" linkIcon="arrow" linkLabel="전체보기">렌탈 후기</SectionHeading><ul>{content.reviews.isError ? <li className="notranslate" translate="no" role="alert">{uiText('후기를 불러오지 못했습니다.')}</li> : content.reviews.isPending ? <li><LoadingState className="route-loading--compact" label="후기를 불러오는 중입니다." /></li> : reviews.length === 0 ? <li className="notranslate" translate="no">{uiText('후기가 없습니다.')}</li> : null}{reviews.map((review, index) => <li key={`${review.content}-${index}`}><Link to={`/community/reviews?review=${encodeURIComponent(review.reviewId)}`}><span>{review.content}</span><span aria-label={`별점 ${review.rating}점`} className="community-review-stars">{Array.from({ length: 5 }, (_, starIndex) => <img alt="" key={starIndex} src={starIndex < review.rating ? reviewStarFilled : reviewStarEmpty} />)}</span></Link></li>)}</ul></article></div>
        </div>
      </section>
  )
}
