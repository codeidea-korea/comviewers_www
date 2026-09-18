import { usePostDetail } from './-components/hooks/usePostDetail'
import { PostCommentSection } from './-components/PostCommentSection'
import { useParams, useSearchParams } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Modal } from '../../components/ui/ModalControl'
import { AttachmentList } from '../../components/ui/AttachmentListControl'
import { RichContentRenderer } from '../../components/ui/RichContentRendererControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { Toast } from '../../components/ui/ToastControl'
import downloadIcon from '../../assets/figma/community-company/support-download.svg'
import windowIcon from '../../assets/figma/icon-window.png'
import { usePost } from '@/routes/community/-components/hooks/useContent'
import type { Post } from '@/domain/storefront/services'
import { CommunityShell } from './CommunityComponentsView'
import { useSession } from '@/app/session/SessionProvider'
import { communityListReturnTo } from './communityNavigation'

export function CommunityPostDetailPage() {
  const { postId } = useParams()
  const result = usePost(postId)
  if (result.isPending) return <CommunityShell><LoadingState label="게시글을 불러오는 중입니다." /></CommunityShell>
  if (result.isError) return <CommunityShell><p role="alert">게시글을 불러오지 못했습니다.</p><Link to="/community/posts">목록으로</Link></CommunityShell>
  if (!result.data) return <CommunityShell><p role="alert">게시글을 찾을 수 없습니다.</p><Link to="/community/posts">목록으로</Link></CommunityShell>
  return <PostDetail key={result.data.postId} post={result.data} />
}

function PostDetail({ post }: { post: Post }) {
  const session = useSession()
  const communityWriteAllowed = session.status !== 'authenticated' || (session.capabilityStatus === 'ready' && session.customerSession?.myPageOnly !== true)
  const [params] = useSearchParams()
  const listUrl = communityListReturnTo(params)
  const detail = usePostDetail(post, listUrl)
  const { postId, navigate, compact, menuOpen, setMenuOpen, setDeleteOpen, attachments, displayTitle, postContent, deletePost, notice, toastKey, actions, deleteOpen, commentDeleteId, setCommentDeleteId, deleteComment } = detail
  return (
    <CommunityShell isolated={compact}>
      <article className={`post-detail content-container${compact ? ' post-detail--compact' : ''}`}>
        <header><div><h1>{displayTitle}</h1><p><span className="post-avatar"><img alt="" className="post-avatar__mark" src={post.authorProfileImageUrl ?? windowIcon} /></span><span className="post-detail__author"><strong>작성자 {post.author}</strong><small><time>작성일시 {post.dateTime ?? post.date}</time><i aria-hidden="true" />조회수 <b>{post.views}</b></small></span></p>{post.isMine && communityWriteAllowed ? <span className="post-detail__menu-anchor"><button aria-expanded={menuOpen} aria-label="게시글 메뉴" onClick={() => setMenuOpen((value) => !value)} type="button">⋮</button>{menuOpen ? <div className="post-detail__menu"><button onClick={() => navigate(`/community/posts/${postId}/edit${listUrl.slice('/community/posts'.length)}`)} type="button">수정</button><button onClick={() => { setMenuOpen(false); setDeleteOpen(true) }} type="button">삭제</button></div> : null}</span> : null}</div></header>
        {post.image ? <img alt={displayTitle} className="post-detail__image" src={post.image} /> : null}
        <div className="post-detail__body"><RichContentRenderer attachments={attachments} document={post.richContent} fallback={postContent} /></div>
        <AttachmentList attachments={attachments} downloadIcon={downloadIcon} />
        <PostCommentSection {...detail} />
        <Link className="board-list-button" to={listUrl}>게시글 목록</Link>
        <Toast message={notice} toastKey={toastKey}/>
      </article>
      <Modal closeLabel="취소" confirmLabel="삭제" confirmDisabled={actions.remove.isPending} isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => void deletePost()} title="게시글을 삭제하시겠습니까?"><p>삭제한 게시글은 복구할 수 없습니다.</p></Modal>
      <Modal closeLabel="취소" confirmLabel="삭제" confirmDisabled={detail.commentQuery.remove.isPending} isOpen={commentDeleteId !== null} onClose={() => setCommentDeleteId(null)} onConfirm={() => { if (commentDeleteId) void deleteComment(commentDeleteId) }} title="댓글을 삭제하시겠습니까?"><p>삭제한 댓글은 복구할 수 없습니다.</p></Modal>
    </CommunityShell>
  )
}
