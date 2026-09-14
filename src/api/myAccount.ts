import { z } from 'zod'
import { partStorageOfferSchema, partStorageSelectionSchema } from './partStorage'
import { partFulfillmentSchema } from './partFulfillment'
import type { ApiClient } from './httpClient'
import { createChangeOrderRefundApi } from './changeOrderRefunds'
import { accountId, accountPageQuery, accountPathId, profileResponseSchema, benefitSummarySchema, pointPageSchema, couponPageSchema, downloadableCouponSchema, storagePageSchema, storageItemResponseSchema } from './myAccountSchemas'
import { accountOrderQuerySchema, accountOrderPageSchema, accountOrderDetailSchema, type AccountOrderQuery } from './myAccountOrders'
export type AccountPageQuery = z.input<typeof accountPageQuery>
const benefitDateQuery = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }).refine(value => !value.from || !value.to || value.from <= value.to)
export type BenefitDateQuery = z.input<typeof benefitDateQuery>
export type PointEntryType = 'all' | 'earned' | 'used'
export type CouponStatus = 'all' | 'available' | 'used' | 'expired' | 'reserved' | 'revoked'
export type StorageStatus = 'stored' | 'moved_to_cart' | 'ordered' | 'expired' | 'cancelled' | 'unpaid'
const storageMoveRequestSchema = z.object({ durationUnits: z.number().int().positive().nullable() })
const idempotencyKeyPartSchema = z.string().uuid()
export function createMyAccountApi(client: ApiClient, organizationId: string | null = null) {
  const context = () => ({ authenticated: true, customerOrganizationId: accountPathId.parse(organizationId) } as const)
  return {
    moveMixedStorage: (input: {rentals:readonly {itemId:number;durationUnits:number|null}[];parts:readonly {id:number;quantity:number}[]},key:string) => client.request('/api/v1/my/storage/mixed/move-to-cart',
      z.object({cartItemIds:z.array(z.number().int().positive().safe()).min(1).max(100),replayed:z.boolean()}),{...context(),method:'POST',idempotencyKey:z.string().uuid().parse(key),body:z.object({
        rentals:z.array(z.object({itemId:z.number().int().positive().safe(),durationUnits:z.number().int().positive().nullable()})).max(100),
        parts:partStorageSelectionSchema.array().max(100)}).refine(value=>value.rentals.length+value.parts.length>0&&value.rentals.length+value.parts.length<=100).parse(input)}),
    partFulfillment: (itemId: string) => client.request(`/api/v1/my/order-items/${accountPathId.parse(itemId)}/part-fulfillment`, partFulfillmentSchema, context()),
    partStorageOffers: (page=0) => client.request('/api/v1/my/storage/parts', partStorageOfferSchema.array(), { ...context(),query:{page:z.number().int().nonnegative().max(1000000).parse(page)} }),
    movePartStorageBatch: (items: readonly { id: number; quantity: number }[], key: string) => client.request('/api/v1/my/storage/parts/move-to-cart', partStorageOfferSchema.array(),
      { ...context(), method: 'POST', idempotencyKey: z.string().uuid().parse(key), body: { items: partStorageSelectionSchema.array().min(1).max(100).parse(items) } }),
    changeOrderRefunds: createChangeOrderRefundApi(client, context),
    profile: (signal?: AbortSignal) => client.request('/api/v1/my/profile', profileResponseSchema, { authenticated: true, signal }),
    benefits: (signal?: AbortSignal) => client.request('/api/v1/my/benefits/summary', benefitSummarySchema, { ...context(), signal }),
    points: (input: AccountPageQuery & BenefitDateQuery & { entryType?: PointEntryType } = {}, signal?: AbortSignal) => client.request('/api/v1/my/benefits/points', pointPageSchema, { ...context(), signal, query: { ...accountPageQuery.parse(input), ...benefitDateQuery.parse(input), entryType: z.enum(['all', 'earned', 'used']).parse(input.entryType ?? 'all') } }),
    coupons: (input: AccountPageQuery & BenefitDateQuery & { status?: CouponStatus } = {}, signal?: AbortSignal) => client.request('/api/v1/my/benefits/coupons', couponPageSchema, { ...context(), signal, query: { ...accountPageQuery.parse(input), ...benefitDateQuery.parse(input), status: z.enum(['all', 'available', 'used', 'expired', 'reserved', 'revoked']).parse(input.status ?? 'all') } }),
    downloadableCoupons: (signal?: AbortSignal) => client.request('/api/v1/my/benefits/coupons/downloadable', z.array(downloadableCouponSchema), { ...context(), signal }),
    downloadCoupon: (couponId: string, key: string = crypto.randomUUID()) => client.request(`/api/v1/my/benefits/coupons/${accountPathId.parse(couponId)}/download`,
      z.object({ userCouponId: accountId, couponId: accountId, downloadedAt: z.iso.datetime({ local: true }), expiresAt: z.iso.datetime({ local: true }).nullable(), replayed: z.boolean() }),
      { ...context(), method: 'POST', idempotencyKey: `coupon:${idempotencyKeyPartSchema.parse(key)}` }),
    orders: (input: AccountOrderQuery = {}, signal?: AbortSignal) => client.request('/api/v1/my/orders', accountOrderPageSchema, { ...context(), signal, query: accountOrderQuerySchema.parse(input) }),
    order: (orderNo: string, signal?: AbortSignal) => client.request(`/api/v1/my/orders/${encodeURIComponent(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).parse(orderNo))}`, accountOrderDetailSchema, { ...context(), signal }),
    confirmPurchase: (orderItemId: string, key: string = crypto.randomUUID()) => client.request(`/api/v1/my/order-items/${accountPathId.parse(orderItemId)}/purchase-confirmation`,
      z.object({ confirmationEventId: accountId, orderId: accountId, orderItemId: accountId, confirmationType: z.string(),
        accruedPoints: z.number().int().nonnegative(), pointBalance: z.number().int().nonnegative(), confirmedAt: z.iso.datetime({ local: true }), replayed: z.boolean() }),
      { ...context(), method: 'POST', idempotencyKey: `purchase-confirmation:${idempotencyKeyPartSchema.parse(key)}` }),
    storage: (input: AccountPageQuery & { status?: StorageStatus } = {}, signal?: AbortSignal) => client.request('/api/v1/my/storage', storagePageSchema, { ...context(), signal, query: { ...accountPageQuery.parse(input), status: z.enum(['stored', 'moved_to_cart', 'ordered', 'expired', 'cancelled', 'unpaid']).optional().parse(input.status) } }),
    storageItem: (id: string, signal?: AbortSignal) => client.request(`/api/v1/my/storage/${accountPathId.parse(id)}`, storageItemResponseSchema, { ...context(), signal }),
    moveStorageBatch: (items: readonly { itemId: number; durationUnits: number | null }[], key: string) => client.request('/api/v1/my/storage/move-to-cart', z.array(storageItemResponseSchema),
      { ...context(), method: 'POST', body: z.object({ items: z.array(z.object({ itemId: z.number().int().positive().safe(), durationUnits: z.number().int().positive().nullable() })).min(1).max(100) }).parse({ items }), idempotencyKey: idempotencyKeyPartSchema.parse(key) }),
    moveStorageToCart: (itemId: string, durationUnits: number | null, idempotencyKey: string) => client.request(`/api/v1/my/storage/${accountPathId.parse(itemId)}/move-to-cart`, storageItemResponseSchema,
      { ...context(), method: 'POST', body: storageMoveRequestSchema.parse({ durationUnits }), idempotencyKey: `storage-to-cart:${idempotencyKeyPartSchema.parse(idempotencyKey)}` }),
  }
}
