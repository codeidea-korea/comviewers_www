import { useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { usePublishingPopupPreview } from '../../../../lib/usePublishingPopupPreview'
import { useComments, usePostActions } from './useContent'
import type { Post } from '@/domain/storefront/services'
import { useSession } from '@/app/session/SessionProvider'

export function usePostDetail(post: Post, listUrl: string) {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const publishingState = import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true' ? params.get('publishingState') : null
  const compact = publishingState === 'comment-filled'
  const menusOpenPreview = publishingState === 'menus-open'
  const actions = usePostActions()
  const session = useSession()
  const mutationInFlight = useRef(false)
  const commentQuery = useComments(post.postId)
  const comments = commentQuery.data ?? []
  const attachments = post.attachments || []
  const displayTitle = compact ? `${post.title} ${post.title} ${post.title}` : post.title
  const postContent = post.content
  const [comment, setComment] = useState(compact ? '저는' : '')
  const [menuOpen, setMenuOpen] = useState(menusOpenPreview)
  const [commentMenuIndex, setCommentMenuIndex] = useState<number | null>(menusOpenPreview ? 0 : null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  usePublishingPopupPreview({
    '게시글을 삭제하시겠습니까?': () => setDeleteOpen(true),
  })
  const addComment = async () => {
    if (!comment.trim() || mutationInFlight.current) return
    if (session.status !== 'authenticated') { setNotice('로그인 후 댓글을 작성할 수 있습니다.'); return }
    if (comment.length > 1000) { setNotice('댓글은 1~1,000자로 입력해 주세요.'); return }
    mutationInFlight.current = true
    try {
      await commentQuery.save.mutateAsync({ content: comment, id: editingCommentId ?? undefined })
      setEditingCommentId(null); setComment(''); setNotice('댓글을 저장했습니다.')
    } catch (error) { setNotice(error instanceof Error ? error.message : '댓글 처리에 실패했습니다.') } finally { mutationInFlight.current = false }
  }
  const deleteComment = async (id: string) => {
    if (mutationInFlight.current) return
    mutationInFlight.current = true
    try { await commentQuery.remove.mutateAsync(id); setCommentDeleteId(null); setCommentMenuIndex(null); setEditingCommentId(null); setComment(''); setNotice('댓글을 삭제했습니다.') }
    catch (error) { setNotice(error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.') } finally { mutationInFlight.current = false }
  }
  const deletePost = async () => {
    if (mutationInFlight.current) return
    mutationInFlight.current = true
    try { await actions.remove.mutateAsync(post.postId); void navigate(listUrl) }
    catch (error) { setNotice(error instanceof Error ? error.message : '게시글 삭제에 실패했습니다.'); setDeleteOpen(false) } finally { mutationInFlight.current = false }
  }
  const displayedCommentCount = comments.length
  return { postId, navigate, compact, menuOpen, setMenuOpen, setDeleteOpen, attachments, displayTitle, postContent, commentQuery, comments, comment, setComment, commentMenuIndex, setCommentMenuIndex, setEditingCommentId, addComment, deleteComment, deletePost, displayedCommentCount, notice, actions, deleteOpen, commentDeleteId, setCommentDeleteId, commentAuthenticated: session.status === 'authenticated' }
}
