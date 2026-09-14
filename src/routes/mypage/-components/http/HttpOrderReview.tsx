import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import type { AccountOrderItem } from '@/api/myAccountOrders'
import { reviewDraftSchema } from '@/domain/reviews/reviewRepository'
import { ProductReviewDialog } from '@/components/commerce/ProductReviewDialogControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'

export function HttpOrderReview({ item }: { item: AccountOrderItem }) {
  const { reviews } = useServices()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const eligible = useQuery({ queryKey: ['productReviewEligible', item.productNo], enabled: open,
    queryFn: ({ signal }) => reviews.listEligibleRentals(item.productNo, signal) })
  const sourceId = item.rentalId ?? (item.billingUnit === 'unit' ? `order-item:${item.orderItemId}` : null)
  const allowed = Boolean(sourceId && eligible.data?.some((rental) => rental.id === sourceId))
  const save = useMutation({ mutationFn: async ({ draft, rentalId }: { draft: { rating: number; body: string }; rentalId: string }) => {
    if (!allowed || !sourceId || rentalId !== sourceId) throw new Error('후기 작성 가능한 구매 상품을 확인해 주세요.')
    return reviews.create(item.productNo, sourceId, reviewDraftSchema.parse(draft))
  }, onSuccess: async () => {
    setOpen(false)
    await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }), client.invalidateQueries({ queryKey: ['productReviewEligible', item.productNo] }), client.invalidateQueries({ queryKey: ['productReviews', item.productNo] })])
  } })
  if (item.reviewId || save.isSuccess) return <RelativeLink to={`/products/${encodeURIComponent(item.productNo)}#reviews`}>후기 보기</RelativeLink>
  return <>
    <button type="button" onClick={() => setOpen(true)}>후기 작성</button>
    <ProductReviewDialog
      eligibleRentals={sourceId && allowed ? [{ id: sourceId, label: `${item.title} · ${item.productNo}` }] : []}
      eligibilityPending={eligible.isPending}
      error={eligible.isError ? '후기 작성 가능 여부를 확인하지 못했습니다.' : eligible.isSuccess && !allowed ? '이미 후기를 작성했거나 현재 후기 작성 대상이 아닙니다.' : save.isError ? '후기를 등록하지 못했습니다. 작성 가능 여부를 확인해 주세요.' : undefined}
      isOpen={open}
      onClose={() => { if (!save.isPending) setOpen(false) }}
      onSubmit={(draft, rentalId) => save.mutate({ draft, rentalId })}
      pending={save.isPending}
      product={{ productId: item.productNo, serverRoom: item.serverRoomName ?? '-', pricingType: item.billingUnit === 'unit' ? 'one_time' : 'rental', title: item.title, description: item.specSummary, os: null, cpu: item.specSummary, ram: null, disk: null, gpu: null }}
    />
  </>
}
