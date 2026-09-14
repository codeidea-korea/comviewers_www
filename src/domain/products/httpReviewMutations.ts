import { z } from 'zod'
import { createProductReviewMutations, productReviewCreateSchema, productReviewEditSchema } from '@/api/productReviewMutations'
import type { ApiClient } from '@/api/httpClient'

export function createHttpReviewMutations(client: ApiClient, context: {
  assertActiveSession: () => void; invalidateReviews: () => Promise<void>
}) {
  const api = createProductReviewMutations(client)
  async function write<T>(action: () => Promise<T>): Promise<T> {
    context.assertActiveSession()
    try { return await action() }
    finally { await context.invalidateReviews() }
  }
  return {
    create: (productNo: string, input: z.infer<typeof productReviewCreateSchema>) => write(() => api.create(productNo, input)),
    update: (reviewId: number, input: z.infer<typeof productReviewEditSchema>) => write(() => api.update(reviewId, input)),
    remove: (reviewId: number) => write(() => api.remove(reviewId)),
  }
}
