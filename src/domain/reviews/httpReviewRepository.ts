import defaultAvatar from '@/assets/figma/review-avatar-blue.png'
import type { ApiClient } from '@/api/httpClient'
import { createProductReviewsApi, productReviewResponseSchema } from '@/api/productReviews'
import { createProductReviewMutations } from '@/api/productReviewMutations'
import {
  eligibleRentalSchema,
  productReviewSchema,
  reviewDraftSchema,
  reviewPageSchema,
  type ProductReview,
  type ReviewRepository,
} from './reviewRepository'

interface HttpReviewRepositoryOptions {
  authenticated: boolean
  customerOrganizationId: string | null
  writeAvailable: boolean
}

function dateLabel(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date).replace(/\. /g, '.').replace(/\.$/, '')
}

function toReview(input: unknown): ProductReview {
  const review = productReviewResponseSchema.parse(input)
  return productReviewSchema.parse({
    id: review.id,
    productId: review.productNo,
    rentalId: null,
    author: review.author,
    avatar: defaultAvatar,
    avatarClassName: 'review-avatar--blue',
    authorAvatarUrl: review.authorAvatarUrl,
    rating: review.rating,
    body: review.content,
    date: dateLabel(review.reviewedAt),
    edited: review.updatedAt !== null && review.updatedAt !== review.reviewedAt,
    isMine: review.mine,
  })
}

export function createHttpReviewRepository(client: ApiClient, options: HttpReviewRepositoryOptions): ReviewRepository {
  const reads = createProductReviewsApi(client)
  const writes = createProductReviewMutations(client, options.customerOrganizationId ?? undefined)
  return {
    downloadAvatar(path, signal) {
      if (!/^\/api\/v1\/community\/profile-images\/[1-9]\d*$/.test(path)) throw new Error('프로필 이미지 주소를 확인할 수 없습니다.')
      return client.download(path, { signal })
    },
    async list(productId, { page, size, signal }) {
      const response = await reads.list(productId, page, size, options.authenticated, signal)
      return reviewPageSchema.parse({
        items: response.items.map(toReview),
        page: response.page,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
      })
    },
    async listEligibleRentals(productId, signal) {
      if (!options.authenticated || !options.writeAvailable || options.customerOrganizationId === null) return []
      const items = await reads.eligible(productId, options.customerOrganizationId, signal)
      return eligibleRentalSchema.array().parse(items.map((item) => ({
        id: item.rentalId ?? `order-item:${item.orderItemId}`,
        label: [item.productTitle || item.productNo, item.serverRoomName, item.rentalId ? '렌탈 구매확정' : '부품 수령·구매확정'].filter(Boolean).join(' · '),
      })))
    },
    async create(productId, rentalId, draft) {
      if (!options.writeAvailable || options.customerOrganizationId === null) throw new Error('후기를 작성할 권한이 없습니다.')
      const parsed = reviewDraftSchema.parse(draft)
      const source = rentalId.startsWith('order-item:') ? { orderItemId: rentalId.slice('order-item:'.length) } : { rentalId }
      return toReview(await writes.create(productId, { ...source, rating: parsed.rating, content: parsed.body }))
    },
    async update(_productId, reviewId, draft) {
      if (!options.writeAvailable) throw new Error('후기를 수정할 권한이 없습니다.')
      const parsed = reviewDraftSchema.parse(draft)
      return toReview(await writes.update(reviewId, { rating: parsed.rating, content: parsed.body }))
    },
    async remove(_productId, reviewId) {
      if (!options.writeAvailable) throw new Error('후기를 삭제할 권한이 없습니다.')
      await writes.remove(reviewId)
    },
  }
}
