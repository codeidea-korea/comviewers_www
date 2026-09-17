import { z } from 'zod'
import { productNoResponseSchema } from './productNo'

const integer = z.number().int().min(-2147483648).max(2147483647)
const count = z.number().int().nonnegative().safe()
export const accountId = z.number().int().positive().safe().transform(String)
export const accountPathId = z.string().regex(/^[1-9]\d{0,18}$/).refine((value) => BigInt(value) <= 9223372036854775807n)
const text = z.string().nullable()
// Server LocalDateTime is KST wall time: preserve it, never parse through UTC Date.
export const accountTime = z.iso.datetime({ local: true }).refine((value) => !/[Zz]|[+-]\d{2}:?\d{2}$/.test(value))
const time = accountTime.nullable()
export const accountPageQuery = z.object({ page: integer.nonnegative().default(0), size: integer.min(1).max(100).default(20) }).refine((value) => value.page * value.size <= 2147483647)
export const accountPageFields = { page: integer.nonnegative(), size: integer.min(1).max(100), totalElements: count, totalPages: integer.nonnegative() }
export const profileResponseSchema = z.object({ username: z.string(), socialLoginOnly: z.boolean(), name: text, nickname: text, nicknameChangedAt: time, nicknameChangeAvailableAt: time, phone: text, messengerType: text, messengerId: text, email: text, marketingEmailAgreed: z.boolean(), marketingEmailConsentChangedAt: time, updatedAt: time, profileImageAttachmentId: accountId.nullable().optional() })
export const benefitSummarySchema = z.object({ pointBalance: integer, availableCouponCount: count, expiringCouponCount: count })
export const pointEntrySchema = z.object({ id: accountId, customerId: accountId, loginId: text, sourceType: z.string(), sourceId: accountId.nullable(), reason: text, amount: integer, balanceAfter: integer, createdByAdminId: accountId.nullable(), occurredAt: accountTime })
export const pointPageSchema = z.object({ ...accountPageFields, balance: integer, items: z.array(pointEntrySchema) })
export const couponItemSchema = z.object({ userCouponId: accountId, couponId: accountId, name: z.string(), discountType: z.string(), discountValue: integer.nonnegative(), minOrderAmount: integer.nonnegative(), serverRoomId: accountId.nullable(), serverRoomName: text, status: z.string(), downloadedAt: time, expiresAt: time, startsAt: time, endsAt: time, usedAt: time, usedOrderNo: text, usedDiscountAmount: count.nullable() })
export const couponPageSchema = z.object({ ...accountPageFields, items: z.array(couponItemSchema), availableCount: count, usedCount: count, expiredCount: count })
export const downloadableCouponSchema = z.object({ serverRoomName: text, couponId: accountId, name: z.string(), discountType: z.string(), discountValue: integer.nonnegative(), minOrderAmount: integer.nonnegative(), serverRoomId: accountId.nullable(), validDaysAfterDownload: integer.positive().nullable(), startsAt: time, endsAt: time })
export const storageItemResponseSchema = z.object({ id: accountId, status: z.string(), reservationFulfillmentId: accountId.nullable(), productId: accountId.nullable(), productNo: productNoResponseSchema.nullable(), productTitle: text, serverRoomName: text, specSummary: text, imageUrl: text, instantAvailable: z.boolean(), pricingType: text, billingUnit: text, unitPrice: integer.nonnegative().nullable(), setupFee: integer.nonnegative().nullable(), minUnits: integer.positive().nullable(), maxUnits: integer.nonnegative().nullable(), pcAssetId: accountId.nullable(), managementNo: text, cartItemId: accountId.nullable(), orderItemId: accountId.nullable(), paymentDueAt: time, storedAt: time, removedAt: time })
export const storagePageSchema = z.object({ ...accountPageFields, items: z.array(storageItemResponseSchema) })
export const storageSummarySchema = z.object({ rentalCount: count, partCount: count, totalCount: count })
export type AccountProfileRead = z.infer<typeof profileResponseSchema>
export type AccountPointPage = z.infer<typeof pointPageSchema>
export type AccountCouponPage = z.infer<typeof couponPageSchema>
export type AccountStoragePage = z.infer<typeof storagePageSchema>
export type AccountStorageItem = z.infer<typeof storageItemResponseSchema>
