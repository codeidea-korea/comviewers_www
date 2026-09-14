import { z } from 'zod'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const count = z.number().int().nonnegative().safe()
const time = z.iso.datetime({ local: true }).nullable()
const restriction = z.object({ code: z.string(), message: z.string(), value: z.number().int() })
export const withdrawalEligibilitySchema = z.object({ eligible: z.boolean(), policyStatus: z.string(), policyVersion: z.string().nullable(),
  temporarySafetyGuard: z.boolean(), activeOrProcessingRentalCount: count, pendingOrPaidOrderCount: count, openRefundCount: count,
  pointBalance: z.number().int(), pendingPointAccrualCount: count, reservedCouponCount: count, availableCouponCount: count,
  restrictions: restriction.array(), checkedAt: z.iso.datetime({ local: true }) })
const request = z.object({ id, requestNo: z.string(), status: z.string(), reason: z.string().nullable(), restrictionSnapshot: z.unknown(),
  requestedAt: z.iso.datetime({ local: true }), reviewedAt: time, cancelledAt: time, completedAt: time })

export function createCustomerWithdrawalApi(client: ApiClient) {
  return {
    eligibility: (signal?: AbortSignal) => client.request('/api/v1/my/withdrawal/eligibility', withdrawalEligibilitySchema, { authenticated: true, signal }),
    create: (reason: string) => client.request('/api/v1/my/withdrawal/requests', request, { method: 'POST', body: { reason: z.string().max(2000).parse(reason) }, authenticated: true, idempotencyKey: `withdrawal:${crypto.randomUUID()}` }),
  }
}
export type CustomerWithdrawalApi = ReturnType<typeof createCustomerWithdrawalApi>
