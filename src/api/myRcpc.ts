import { z } from 'zod'
import { productNoResponseSchema, productNoSearchSchema } from './productNo'
import type { ApiClient } from './httpClient'
import { createExtensionCheckoutApi } from './extensionCheckout'
import { createRentalChangeCheckoutApi } from './rentalChangeCheckout'

const id = z.number().int().positive().safe()
const count = z.number().int().nonnegative().safe()
const text = z.string().nullable()
const instant = z.iso.datetime({ offset: true }).nullable()
const status = z.enum(['pending_payment', 'ready', 'active', 'expiring', 'grace_period', 'access_restricted', 'expired', 'termination_pending', 'resetting', 'terminated', 'cancelled', 'refunded'])
const preference = z.object({
  alias: z.string().optional(), favorite: z.boolean(), groupId: id.optional(),
  groupName: z.string().optional(), parentGroupId: id.optional(), parentGroupName: z.string().optional(),
})
const remoteSupport = z.object({
  anyDeskMaskedId: text, anyDeskPasswordConfigured: z.boolean(), teamViewerMaskedId: text,
  teamViewerPasswordConfigured: z.boolean(), updatedAt: instant,
}).nullable()
const pcSpec = z.object({
  osFamily: text, osName: text, osVersion: text, osArchitecture: text, cpuBrand: text, cpuModel: text,
  cpuClockGhz: z.number().nonnegative().nullable(), cpuCores: count.nullable(), cpuThreads: count.nullable(),
  ramGb: count.nullable(), ramType: text, ssdGb: count.nullable(), hddGb: count.nullable(),
  gpuBrand: text, gpuModel: text, gpuVramGb: count.nullable(), collectedAt: instant,
}).nullable()
export const myRcpcItemSchema = z.object({
  rentalId: id, pcAssetId: id, productNo: productNoResponseSchema, managementNo: text, serverRoomId: id.nullable(), serverRoomName: text,
  productTitle: text, orderedAt: instant, serviceStartedAt: instant,
  serverRoomRegion: text, serverStatus: z.enum(['needs_attention', 'format_waiting', 'extension_waiting', 'running', 'ended']),
  usageStatus: z.enum(['using', 'extension_waiting', 'ended', 'other']), rentalStatus: status, serviceEndExclusiveDate: z.iso.date().nullable(), connectionStatus: z.string(),
  presenceLastSeenAt: instant, secondsSinceLastSeen: count.nullable(), trafficCounterEpoch: count.nullable(),
  trafficDownloadTotalBytes: count.nullable(), trafficUploadTotalBytes: count.nullable(), trafficObservedAt: instant, preference,
  pcSpec,
  remoteSupport,
})
export const myRcpcPageSchema = z.object({ items: z.array(myRcpcItemSchema), page: count, size: z.number().int().min(1).max(100), totalElements: count, totalPages: count })
export const myRcpcSummarySchema = z.object({ total: count, usageCounts: z.object({ using: count, extension_waiting: count, ended: count, other: count }), statusCounts: z.object({
  pending_payment: count, ready: count, active: count, expiring: count, grace_period: count,
  access_restricted: count, expired: count, termination_pending: count, resetting: count,
  terminated: count, cancelled: count, refunded: count, other: count,
}) })
export const myRcpcFilterOptionsSchema = z.object({
  regions: z.array(z.string()),
  serverRooms: z.array(z.object({ id, name: text, region: text })),
  total: count,
  usageCounts: z.record(z.string(), count),
  unclassifiedFavoriteCount: count,
})
export const myRcpcDetailSchema = myRcpcItemSchema.extend({
  productTitle: text.default(null), orderedAt: instant.default(null), serviceEndsAt: instant, maskedWanIp: text,
})
export const myRcpcQuerySchema = z.object({
  usageStatus: z.enum(['using', 'extension_waiting', 'ended', 'other']).optional(),
  productNo: productNoSearchSchema.optional(), serverRoomId: id.optional(), region: z.string().trim().max(100).optional(), status: status.optional(),
  favorite: z.boolean().optional(), groupId: count.optional(), ungrouped: z.boolean().optional(), sort: z.enum(['recent', 'expiring', 'productNo', 'serverRoom', 'serverStatus', 'servicePeriod', 'traffic', 'favoriteEdited']).default('recent'),
  page: z.number().int().nonnegative().max(2147483647).default(0), size: z.number().int().min(1).max(100).default(20),
}).refine(({ page, size }) => page * size <= 2147483647)
export type MyRcpcQuery = z.input<typeof myRcpcQuerySchema>
export type MyRcpcDetail = z.infer<typeof myRcpcDetailSchema>
export type MyRcpcItem = z.infer<typeof myRcpcItemSchema>
export type RemoteAccessType = 'anydesk' | 'teamviewer'
const rebootStatusSchema = z.object({ status: z.enum(['idle', 'requested', 'failed', 'expired', 'communication_resumed', 'waiting_communication']), pending: z.boolean(), available: z.boolean() })
const remoteAccessSchema = z.object({ accessType: z.enum(['anydesk', 'teamviewer']), remoteId: z.string(), password: z.string().optional(), serviceEndsAt: z.iso.datetime({ offset: true }) })
const remoteIdentifierSchema = z.object({ remoteId: z.string().min(1), serviceEndsAt: z.iso.datetime({ offset: true }) })

export function createMyRcpcApi(client: ApiClient, organizationId: string) {
  const customerOrganizationId = z.string().regex(/^[1-9]\d{0,18}$/).refine((value) => BigInt(value) <= 9223372036854775807n).parse(organizationId)
  const context = { authenticated: true, customerOrganizationId } as const
  return {
    organizationId: customerOrganizationId,
    extensionCheckout: createExtensionCheckoutApi(client, customerOrganizationId),
    changeCheckout: createRentalChangeCheckoutApi(client, customerOrganizationId),
    rebootStatus: (rentalId: number, signal?: AbortSignal) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/reboot`, rebootStatusSchema, { ...context, signal }),
    reboot: (rentalId: number, idempotencyKey: string) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/reboot`, rebootStatusSchema, { ...context, method: 'POST', idempotencyKey: z.uuid().parse(idempotencyKey) }),
    wanIp: (rentalId: number, action: 'reveal' | 'copy', signal?: AbortSignal) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/wan-ip/${z.enum(['reveal', 'copy']).parse(action)}`, z.object({ wanIp: z.string().min(1).max(45) }), { ...context, method: 'POST', signal }),
    list: (query: MyRcpcQuery = {}, signal?: AbortSignal) => client.request('/api/v1/my/rcpcs', myRcpcPageSchema, { ...context, query: myRcpcQuerySchema.parse(query), signal }),
    summary: (signal?: AbortSignal) => client.request('/api/v1/my/rcpcs/summary', myRcpcSummarySchema, { ...context, signal }),
    filterOptions: (signal?: AbortSignal) => client.request('/api/v1/my/rcpcs/filter-options', myRcpcFilterOptionsSchema, { ...context, signal }),
    detail: (rentalId: number, signal?: AbortSignal) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}`, myRcpcDetailSchema, { ...context, signal }),
    reveal: (rentalId: number, accessType: RemoteAccessType, signal?: AbortSignal) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/remote-access/${z.enum(['anydesk', 'teamviewer']).parse(accessType)}/reveal`, remoteAccessSchema, { ...context, method: 'POST', signal }),
    identifier: (rentalId: number, accessType: RemoteAccessType, signal?: AbortSignal) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/remote-access/${z.enum(['anydesk', 'teamviewer']).parse(accessType)}/identifier`, remoteIdentifierSchema, { ...context, method: 'POST', signal }),
    copy: (rentalId: number, accessType: RemoteAccessType, field: 'remote_id' | 'password', signal?: AbortSignal) => client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/remote-access/${z.enum(['anydesk', 'teamviewer']).parse(accessType)}/copy`, z.undefined(), { ...context, method: 'POST', body: { field: z.enum(['remote_id', 'password']).parse(field) }, signal }),
    extensionQuote: (rentalId: number, units: number) => client.request(`/api/v1/my/rentals/${id.parse(rentalId)}/extension-quotes`,
      z.object({ rentalId: id, extensionType: z.string(), units: z.number().int().positive(), billingUnit: z.string(),
        previousServiceEndsAt: instant, quotedServiceEndsAt: z.iso.datetime({ offset: true }), quotedAmount: count, currency: z.string() }),
      { ...context, method: 'POST', body: { units: z.number().int().min(1).max(10000).parse(units) } }),
    requestExtension: (rentalId: number, units: number, idempotencyKey = `extension:${crypto.randomUUID()}`) => client.request(`/api/v1/my/rentals/${id.parse(rentalId)}/extension-requests`,
      z.object({ extensionRequestId: id, requestNo: z.string(), rentalId: id, orderId: id, orderItemId: id, extensionType: z.string(),
        units: z.number().int().positive(), billingUnit: z.string(), previousServiceEndsAt: instant, quotedServiceEndsAt: z.iso.datetime({ offset: true }),
        quotedAmount: count, currency: z.string(), status: z.string(), paymentRequired: z.boolean(), replayed: z.boolean(), requestedAt: z.iso.datetime({ offset: true }) }),
      { ...context, method: 'POST', body: { units: z.number().int().min(1).max(10000).parse(units) }, idempotencyKey }),
  }
}
