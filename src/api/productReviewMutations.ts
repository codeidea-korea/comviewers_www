import { z } from 'zod'
import type { ApiClient } from './httpClient'
import { catalogProductNoSchema } from './catalog'
import { productReviewResponseSchema } from './productReviews'

const id = z.union([z.string().regex(/^[1-9]\d{0,18}$/), z.number().int().positive().safe().transform(String)])
export const productReviewEditSchema = z.object({ rating: z.number().int().min(1, '상품 만족도를 선택해 주세요.').max(5), content: z.string().trim().min(10, '후기는 10자 이상으로 등록하실 수 있습니다.').max(500, '후기 내용은 500자 이하로 입력해 주세요.') }).strict()
export const productReviewCreateSchema = productReviewEditSchema.extend({ rentalId: id.optional(), orderItemId: id.optional() })
  .refine(value => Boolean(value.rentalId) !== Boolean(value.orderItemId))
export const savedProductReviewSchema = productReviewResponseSchema
export function createProductReviewMutations(client: ApiClient, customerOrganizationId?: string) {
  return {
    create(productNo: string, input: z.infer<typeof productReviewCreateSchema>) {
      return client.request(`/api/v1/products/${encodeURIComponent(catalogProductNoSchema.parse(productNo))}/reviews`, savedProductReviewSchema,
        { authenticated: true, customerOrganizationId, method: 'POST', body: productReviewCreateSchema.parse(input) })
    },
    update(reviewId: string | number, input: z.infer<typeof productReviewEditSchema>) {
      return client.request(`/api/v1/product-reviews/${id.parse(reviewId)}`, savedProductReviewSchema,
        { authenticated: true, method: 'PUT', body: productReviewEditSchema.parse(input) })
    },
    remove(reviewId: string | number) {
      return client.request(`/api/v1/product-reviews/${id.parse(reviewId)}`, z.undefined(), { authenticated: true, method: 'DELETE' })
    },
  }
}
