import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { productReviewSchema, reviewDraftSchema, reviewPageSchema, type ReviewDraft } from '@/domain/reviews/reviewRepository'
import { usePublishingPopupPreview } from '../../../../lib/usePublishingPopupPreview'

const reviewPageSize = 3
function isReviewPopupState(state: unknown): boolean {
  return import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true'
    && typeof state === 'object' && state !== null && 'publishingPopup' in state && state.publishingPopup === 'product-review'
}

export function useProductReviews({ productId, noReviewsPreview, visualComposite, onMessage }: { productId: string | undefined; noReviewsPreview: boolean; visualComposite: boolean; onMessage: (message: string) => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const repository = useServices().reviews
  const client = useQueryClient()
  const [reviewPage, setReviewPage] = useState(1)
  const queryKey = ['productReviews', productId, reviewPage] as const
  const eligibilityQueryKey = ['productReviewEligible', productId] as const
  const query = useQuery({ queryKey, enabled: Boolean(productId), queryFn: async ({ signal }) => reviewPageSchema.parse(
    await repository.list(productId!, { page: reviewPage - 1, size: reviewPageSize, signal })), placeholderData: (previous) => previous })
  const eligibilityQuery = useQuery({ queryKey: eligibilityQueryKey, enabled: Boolean(productId),
    queryFn: ({ signal }) => repository.listEligibleRentals(productId!, signal) })
  const reviews = query.data?.items ?? []
  const eligibleRentals = eligibilityQuery.data ?? []
  const [reviewMenuIndex, setReviewMenuIndex] = useState<string | null>(null)
  const [deleteReviewIndex, setDeleteReviewIndex] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reviewDialogMode, setReviewDialogMode] = useState<'create' | 'edit' | null>(isReviewPopupState(location.state) ? 'create' : null)
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const reviewCreateTriggerRef = useRef<HTMLButtonElement | null>(null)
  const reviewDialogReturnFocusRef = useRef<HTMLButtonElement | null>(null)
  const reviewDeleteReturnFocusRef = useRef<HTMLButtonElement | null>(null)
  const reviewMenuButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const reviewPageCount = Math.max(1, query.data?.totalPages ?? 0)
  const reviewCount = query.data?.totalCount ?? 0
  const currentReviewPage = Math.min(reviewPage, reviewPageCount)
  const reviewOffset = (currentReviewPage - 1) * reviewPageSize
  const visibleReviews = reviews
  const save = useMutation({ mutationFn: async ({ draft, rentalId }: { draft: ReviewDraft; rentalId: string }) => {
    const parsed = reviewDraftSchema.parse(draft)
    if (!productId) throw new Error('상품을 찾을 수 없습니다.')
    return productReviewSchema.parse(editingId ? await repository.update(productId, editingId, parsed) : await repository.create(productId, rentalId, parsed))
  }, onSettled: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['productReviews', productId] }), client.invalidateQueries({ queryKey: eligibilityQueryKey })]) } })
  const remove = useMutation({ mutationFn: (id: string) => repository.remove(productId!, id),
    onSettled: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['productReviews', productId] }), client.invalidateQueries({ queryKey: eligibilityQueryKey })]) } })
  const pending = save.isPending || remove.isPending
  usePublishingPopupPreview({
    '후기 작성': () => { if (visualComposite) return false; setReviewDialogMode('create') },
    '후기를 삭제하시겠습니까?': () => setDeleteReviewIndex(reviews.find((review) => review.isMine)?.id ?? null),
  })
  useEffect(() => {
    if (!isReviewPopupState(location.state)) return
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }, [location.hash, location.pathname, location.search, location.state, navigate])
  async function submitReview(draft: ReviewDraft, rentalId: string) {
    if (busyRef.current) return
    const parsed = reviewDraftSchema.safeParse(draft)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.'); return }
    busyRef.current = true
    setError('')
    try { await save.mutateAsync({ draft: parsed.data, rentalId }); setReviewDialogMode(null); setReviewPage(1); onMessage(editingId ? '후기를 수정했습니다.' : '후기를 등록했습니다.') }
    catch (failure) { setError(failure instanceof Error ? failure.message : '후기 저장에 실패했습니다.') }
    finally { busyRef.current = false }
  }
  async function confirmReviewDelete() {
    if (!deleteReviewIndex || busyRef.current) return
    busyRef.current = true
    setError('')
    try { await remove.mutateAsync(deleteReviewIndex); setReviewMenuIndex(null); setDeleteReviewIndex(null); onMessage('후기를 삭제했습니다.') }
    catch (failure) { setError(failure instanceof Error ? failure.message : '후기 삭제에 실패했습니다.') }
    finally { busyRef.current = false }
  }
  function openCreate() {
    setError(''); setEditingId(null)
    reviewDialogReturnFocusRef.current = reviewCreateTriggerRef.current
    setReviewDialogMode('create')
  }
  function openEdit(id: string) {
    if (!reviews.some((review) => review.id === id && review.isMine)) return
    setError(''); setEditingId(id)
    reviewDialogReturnFocusRef.current = reviewMenuButtonRefs.current.get(id) ?? null
    setReviewMenuIndex(null); setReviewDialogMode('edit')
  }
  function openDelete(id: string) {
    if (!reviews.some((review) => review.id === id && review.isMine)) return
    setError('')
    reviewDeleteReturnFocusRef.current = reviewMenuButtonRefs.current.get(id) ?? null
    setReviewMenuIndex(null); setDeleteReviewIndex(id)
  }
  function changePage(page: number) {
    if (!Number.isInteger(page)) return
    setReviewPage(Math.min(Math.max(page, 1), reviewPageCount)); setReviewMenuIndex(null)
    requestAnimationFrame(() => document.getElementById('reviews')?.scrollIntoView({ block: 'start' }))
  }
  function registerMenuButton(id: string, element: HTMLButtonElement | null) {
    const previous = reviewMenuButtonRefs.current
    reviewMenuButtonRefs.current = element ? new Map([...previous, [id, element]]) : new Map([...previous].filter(([key]) => key !== id))
  }
  return { reviews, eligibleRentals, eligibilityQuery, query, error, pending, submitReview, editingReview: reviews.find((review) => review.id === editingId),
    reviewsEmpty: noReviewsPreview || reviews.length === 0,
    reviewSectionClass: !reviews.length ? ' product-detail-reviews--empty' : reviews.length < 3 ? ` product-detail-reviews--count-${reviews.length}` : '',
    reviewMenuIndex, setReviewMenuIndex, deleteReviewIndex, setDeleteReviewIndex, reviewDialogMode, setReviewDialogMode,
    reviewCreateTriggerRef, reviewDialogReturnFocusRef, reviewDeleteReturnFocusRef,
    reviewPage: currentReviewPage, reviewPageCount, reviewCount, reviewOffset, visibleReviews,
    openCreate, openEdit, openDelete, changePage, registerMenuButton, confirmReviewDelete }
}
export type ProductReviewController = ReturnType<typeof useProductReviews>
