import { z } from 'zod'
import type { ApiClient } from './httpClient'
import { catalogProductNoSchema } from './catalog'

const safeId = z.union([z.string().regex(/^[1-9]\d{0,18}$/), z.number().int().positive().safe().transform(String)])
export const productReviewResponseSchema = z.object({
  id: safeId,
  productNo: catalogProductNoSchema,
  productTitle: z.string(),
  serverRoomName: z.string(),
  author: z.string(),
  authorAvatarUrl: z.string().nullable(),
  mine: z.boolean(),
  rating: z.number().int().min(1).max(5),
  content: z.string(),
  status: z.string(),
  orderNo: z.string().nullable(),
  reviewedAt: z.string(),
  updatedAt: z.string().nullable(),
})
export type ProductReviewResponse = z.infer<typeof productReviewResponseSchema>
export const productReviewPageResponseSchema = z.object({
  items: z.array(productReviewResponseSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalCount: z.number().int().nonnegative().safe(),
  totalPages: z.number().int().nonnegative(),
})
export const eligibleReviewRentalResponseSchema = z.object({
  rentalId: z.string().regex(/^[1-9]\d{0,18}$/).nullable(),
  orderItemId: safeId,
  productNo: catalogProductNoSchema,
  productTitle: z.string(),
  serverRoomName: z.string().nullable(),
})

export function createProductReviewsApi(client: ApiClient) {
  return {
    listPublic(page: number, size: number, authenticated: boolean, signal?: AbortSignal) {
      return client.request('/api/v1/product-reviews', productReviewPageResponseSchema, {
        authenticated, query: { sort: 'latest', page, size }, signal,
      })
    },
    list(productNo: string, page: number, size: number, authenticated: boolean, signal?: AbortSignal) {
      return client.request(`/api/v1/products/${encodeURIComponent(catalogProductNoSchema.parse(productNo))}/reviews`,
        productReviewPageResponseSchema, { authenticated, query: { sort: 'latest', page, size }, signal })
    },
    eligible(productNo: string, customerOrganizationId: string, signal?: AbortSignal) {
      return client.request(`/api/v1/products/${encodeURIComponent(catalogProductNoSchema.parse(productNo))}/review-eligible-rentals`,
        eligibleReviewRentalResponseSchema.array(), { authenticated: true, customerOrganizationId, signal })
    },
  }
}
