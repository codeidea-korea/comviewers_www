import { z } from 'zod'

export const reviewDraftSchema = z.object({
  rating: z.number().int().min(1, '별점을 선택해 주세요.').max(5),
  body: z.string().trim().min(10, '후기는 10자 이상으로 등록하실 수 있습니다.').max(500, '후기 내용은 500자 이하로 입력해 주세요.'),
})
export const productReviewSchema = reviewDraftSchema.extend({
  id: z.string().min(1), productId: z.string().min(1), rentalId: z.string().min(1).nullable(),
  author: z.string(), avatar: z.string(), avatarClassName: z.string(),
  authorAvatarUrl: z.string().nullable().default(null),
  date: z.string(), edited: z.boolean(), isMine: z.boolean(),
})
export const reviewPageSchema = z.object({
  items: z.array(productReviewSchema),
  page: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative().safe(),
  totalPages: z.number().int().nonnegative(),
})
export const eligibleRentalSchema = z.object({ id: z.string().min(1), label: z.string().min(1) })
export type ReviewDraft = z.infer<typeof reviewDraftSchema>
export type ProductReview = z.infer<typeof productReviewSchema>
export type ProductReviews = z.infer<typeof reviewPageSchema>
export type EligibleRental = z.infer<typeof eligibleRentalSchema>
export interface ReviewRepository {
  downloadAvatar?(path: string, signal?: AbortSignal): Promise<Blob>
  list(productId: string, options: { page: number; size: number; signal?: AbortSignal }): Promise<ProductReviews>
  listEligibleRentals(productId: string, signal?: AbortSignal): Promise<EligibleRental[]>
  create(productId: string, rentalId: string, draft: ReviewDraft): Promise<ProductReview>
  update(productId: string, reviewId: string, draft: ReviewDraft): Promise<ProductReview>
  remove(productId: string, reviewId: string): Promise<void>
}
