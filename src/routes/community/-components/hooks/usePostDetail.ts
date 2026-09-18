import { useToastMessage } from '@/components/ui/ToastControl'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useComments, usePostActions } from './useContent'
import type { Post } from '@/domain/storefront/services'
import { useSession } from '@/app/session/SessionProvider'

export function usePostDetail(post: Post, listUrl: string) {
  const { postId } = useParams()
  const navigate = useNavigate()
  const compact = false
  const actions = usePostActions()
  const session = useSession()
  const mutationInFlight = useRef(false)
  const commentQuery = useComments(post.postId)
  const comments = commentQuery.data ?? []
  const attachments = post.attachments || []
  const displayTitle = compact ? `${post.title} ${post.title} ${post.title}` : post.title
  const postContent = post.content
  const [comment, setComment] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [commentMenuIndex, setCommentMenuIndex] = useState<number | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null)
  const { message: notice, setMessage: setNotice, toastKey } = useToastMessage()
  const addComment = async () => {
    if (!comment.trim() || mutationInFlight.current) return
    if (session.status !== 'authenticated') { setNotice('로그인 후 댓글을 작성할 수 있습니다.'); return }
    if (comment.length > 1000) { setNotice('댓글은 1~1,000자로 입력해 주세요.'); return }
    mutationInFlight.current = true
    setNotice('')
    try {
      await commentQuery.save.mutateAsync({ content: comment, id: editingCommentId ?? undefined })
      setEditingCommentId(null); setComment(''); setNotice(editingCommentId ? '댓글을 수정했습니다.' : '댓글을 등록했습니다.')
    } catch (error) { setNotice(error instanceof Error ? error.message : '댓글 처리에 실패했습니다.') } finally { mutationInFlight.current = false }
  }
  const deleteComment = async (id: string) => {
    if (mutationInFlight.current) return
    mutationInFlight.current = true
    setNotice('')
    try { await commentQuery.remove.mutateAsync(id); setCommentDeleteId(null); setCommentMenuIndex(null); setEditingCommentId(null); setComment(''); setNotice('댓글을 삭제했습니다.') }
    catch (error) { setNotice(error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.') } finally { mutationInFlight.current = false }
  }
  const deletePost = async () => {
    if (mutationInFlight.current) return
    mutationInFlight.current = true
    setNotice('')
    try { await actions.remove.mutateAsync(post.postId); void navigate(listUrl) }
    catch (error) { setNotice(error instanceof Error ? error.message : '게시글 삭제에 실패했습니다.'); setDeleteOpen(false) } finally { mutationInFlight.current = false }
  }
  const displayedCommentCount = comments.length
  return { postId, navigate, compact, menuOpen, setMenuOpen, setDeleteOpen, attachments, displayTitle, postContent, commentQuery, comments, comment, setComment, commentMenuIndex, setCommentMenuIndex, editingCommentId, setEditingCommentId, addComment, deleteComment, deletePost, displayedCommentCount, notice, toastKey, actions, deleteOpen, commentDeleteId, setCommentDeleteId, commentAuthenticated: session.status === 'authenticated' }
}
