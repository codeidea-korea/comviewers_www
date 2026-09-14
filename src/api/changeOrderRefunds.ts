import { z } from 'zod'
import type { ApiClient, ApiRequestOptions } from './httpClient'
import { accountId, accountPathId } from './myAccountSchemas'

const amount = z.number().int().nonnegative()
const quoteSchema = z.object({ orderItemId: accountId, cashAmount: amount, pointAmount: amount,
  refundMethod: z.enum(['cash', 'point', 'mixed']), originalAvailable: z.boolean(),
  couponDeductionAmount: amount, promotionalPointDeductionAmount: amount, requestCeiling: amount }).nullish().transform(value => value ?? null)
export type ChangeOrderRefundQuote = NonNullable<z.output<typeof quoteSchema>>
export interface ChangeOrderRefundInput { orderNo: string; quote: ChangeOrderRefundQuote; reason: string; contactPhone: string }
export function createChangeOrderRefundApi(client: ApiClient, context: () => ApiRequestOptions) {
  return {
    quote: (orderNo: string, method: 'point' | 'original', signal?: AbortSignal) => client.request('/api/v1/my/change-order-refunds/quote', quoteSchema,
      { ...context(), query: { orderNo: z.string().regex(/^[A-Za-z0-9_-]{1,50}$/).parse(orderNo), method }, signal }),
    submit: (input: ChangeOrderRefundInput, key: string) => client.request('/api/v1/my/refunds',
      z.object({ request: z.object({ id: accountId, status: z.string() }) }), {
        ...context(), method: 'POST', idempotencyKey: z.string().uuid().parse(key), body: {
          orderNo: input.orderNo, orderItemId: accountPathId.parse(input.quote.orderItemId), rentalId: null,
          refundType: 'item_refund', refundMethod: input.quote.refundMethod,
          reason: z.string().trim().min(1).max(2000).parse(input.reason),
          contactPhone: z.string().trim().min(1).max(30).parse(input.contactPhone),
          requestedAmount: input.quote.cashAmount, requestedPointAmount: input.quote.pointAmount,
          operationRequestId: null, operationRequestTargetId: null,
        },
      }),
  }
}
