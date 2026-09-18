import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { usePostDetail } from './hooks/usePostDetail'
import commentFace from '../../../assets/figma/comment-face-fill.svg'
import reviewAvatarOrange from '../../../assets/figma/review-avatar-orange.jpeg'
import reviewAvatarPink from '../../../assets/figma/review-avatar-pink.jpeg'
import { Modal } from '../../../components/ui/ModalControl'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import { useSession } from '@/app/session/SessionProvider'

type CommentSectionProps = Pick<ReturnType<typeof usePostDetail>, 'commentQuery' | 'comments' | 'comment' | 'setComment' | 'commentMenuIndex' | 'setCommentMenuIndex' | 'editingCommentId' | 'setEditingCommentId' | 'addComment' | 'displayedCommentCount' | 'setCommentDeleteId' | 'commentAuthenticated'>

export function PostCommentSection({
  commentQuery, comments, comment, setComment, commentMenuIndex,
  setCommentMenuIndex, editingCommentId, setEditingCommentId, addComment, setCommentDeleteId,
  displayedCommentCount, commentAuthenticated,
}: CommentSectionProps) {
  const [loginOpen, setLoginOpen] = useState(false)
  const registerButtonRef = useRef<HTMLButtonElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const [editFocusRequest, setEditFocusRequest] = useState(0)
  useEffect(() => {
    if (!editFocusRequest) return
    const input = commentInputRef.current
    if (!input) return
    input.focus({ preventScroll: true })
    input.setSelectionRange(input.value.length, input.value.length)
    input.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [editFocusRequest])
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const commentAllowed = session.status !== 'authenticated' || (session.capabilityStatus === 'ready' && session.customerSession?.myPageOnly !== true)
  const requestLogin = () => setLoginOpen(true)
  const registerComment = () => {
    if (!commentAuthenticated) {
      requestLogin()
      return
    }
    addComment()
  }
  return (
    <section className="comment-section">
      {commentQuery.isPending ? <LoadingState className="route-loading--compact" label="댓글을 불러오는 중입니다." /> : commentQuery.isError ? <p role="alert">댓글을 불러오지 못했습니다.</p> : null}
      <h2>댓글 {displayedCommentCount}{editingCommentId ? <small className="comment-editing-label" role="status">댓글 수정 중</small> : null}</h2>
      {commentAllowed ? <label className={editingCommentId ? 'comment-editor--editing' : undefined}>
        <span className="sr-only">{editingCommentId ? '댓글 수정' : '댓글 입력'}</span>
        <textarea ref={commentInputRef} maxLength={1000} onChange={(event) => setComment(event.target.value)} onClick={() => { if (!commentAuthenticated) requestLogin() }} onFocus={() => { if (!commentAuthenticated) requestLogin() }} placeholder="댓글을 입력해 주세요." readOnly={!commentAuthenticated} rows={5} value={comment} />
        <small>{comment.length.toLocaleString('ko-KR')} / 1,000</small>
        <button disabled={commentAuthenticated && (!comment.trim() || comment.length > 1000 || commentQuery.save.isPending || commentQuery.remove.isPending)} onClick={registerComment} ref={registerButtonRef} type="button">{editingCommentId ? '수정 완료' : '댓글 등록'}</button>
      </label> : null}
      <div>
        {comments.map((item, index) => (
          <article key={item.id}>
            <span className={`comment-avatar comment-avatar--${item.avatar}`}>
              {item.authorProfileImageUrl ? <img alt="" src={item.authorProfileImageUrl} /> : item.avatar === 'orange' ? <img alt="" src={reviewAvatarOrange} /> : item.avatar === 'pink' ? <img alt="" src={reviewAvatarPink} /> : <img alt="" src={commentFace} />}
            </span>
            <div>
              <span className="comment-author"><strong>{item.author}</strong><time>{item.date}</time>{item.edited ? <small>수정됨</small> : null}</span>
              <p>{item.content}</p>
            </div>
            {item.isMine ? <span className="comment-menu-anchor">
              <button aria-expanded={commentMenuIndex === index} aria-label="댓글 메뉴" onClick={() => setCommentMenuIndex((current) => current === index ? null : index)} type="button">⋮</button>
              {commentMenuIndex === index ? (
                <div className="comment-menu">
                  <button onClick={() => { setComment(item.content); setEditingCommentId(item.id); setCommentMenuIndex(null); setEditFocusRequest(previous => previous + 1) }} type="button">수정</button>
                  <button onClick={() => { setCommentDeleteId(item.id); setCommentMenuIndex(null) }} type="button">삭제</button>
                </div>
              ) : null}
            </span> : null}
          </article>
        ))}
      </div>
      <Modal closeLabel="취소" confirmLabel="로그인하기" isOpen={loginOpen} onClose={() => setLoginOpen(false)} onConfirm={() => navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)} returnFocusRef={registerButtonRef} title="로그인이 필요합니다."><p>댓글을 작성하려면 로그인해 주세요.<br />로그인 후 댓글 작성을 계속할 수 있습니다.</p></Modal>
    </section>
  )
}
