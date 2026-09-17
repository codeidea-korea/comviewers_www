import type { MyAccountReadServices } from './httpServices'
import type { createCustomerProfileMutations } from '@/api/customerProfileMutations'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { CManagersApi } from '@/api/cManagers'
import type { AccountDraftServices } from './draftServices'
import type { InquiryReadServices, MyRcpcReadServices } from './rcpcInquiryReadServices'
import type { ManagerServices } from './managerServices'
import { z } from 'zod'
import { cartItemSchema } from '@/domain/cart/schemas'
import type { CustomerWithdrawalApi } from '@/api/customerWithdrawal'

export const accountRcpcSchema = z.object({
  id: z.string(), rcpcId: z.string(), alias: z.string(), company: z.string(), center: z.string(),
  status: z.string(), daysLeft: z.number(), startedAt: z.string(), endsAt: z.string(),
  assignable: z.boolean().default(true),
  wanIp: z.string(), remote: z.string(), remotePassword: z.string(), disk: z.string(),
  traffic: z.string(), state: z.string(), favorite: z.boolean().default(false), groupId: z.string().default('unclassified'),
})
export const accountOrderSchema = z.object({
  id: z.string(), orderId: z.string(), orderedAt: z.string(), status: z.string(), item: z.string(), amount: z.number().nonnegative(), image: z.string(),
  productId: z.string(), rcpcId: z.string(), period: z.string(), spec: z.string(), paymentMethod: z.string(),
})
export const accountPointSchema = z.object({ id: z.string(), date: z.string(), detail: z.string(), type: z.enum(['적립', '사용']), amount: z.string() })
export const accountCouponSchema = z.object({ id: z.string(), name: z.string(), value: z.string(), condition: z.string(), expiresAt: z.string(), usedAt: z.string(), orderId: z.string() })
export const couponOfferSchema = z.object({ id: z.string(), name: z.string(), rate: z.number().min(0).max(100), validityText: z.string(), scopeText: z.string() })
export const accountInquirySchema = z.object({ id: z.string(), inquiryId: z.string(), type: z.string(), title: z.string(), content: z.string(), status: z.string(), createdAt: z.string(), rcpcIds: z.array(z.string()), answer: z.string() })
export const accountManagerSchema = z.object({ id: z.string(), managerId: z.string(), name: z.string(), loginId: z.string(), assignedRcpcIds: z.array(z.string()), assignmentHistory: z.array(z.object({ rcpcId: z.string(), action: z.enum(['assigned', 'unassigned']), at: z.string() })).default([]), memo: z.string(), status: z.string() })
export const accountProfileSchema = z.object({ id: z.string(), userId: z.string(), name: z.string(), nickname: z.string(), email: z.string(), phone: z.string(), messenger: z.string(), marketingAgreedAt: z.string() })
export const storageItemSchema = cartItemSchema
export const favoriteGroupSchema = z.object({ id: z.string(), label: z.string(), parentId: z.string().nullable() })
export const myAccountSchema = z.object({
  rcpcs: z.array(accountRcpcSchema), orders: z.array(accountOrderSchema), points: z.array(accountPointSchema),
  coupons: z.array(accountCouponSchema), couponOffers: z.array(couponOfferSchema), inquiries: z.array(accountInquirySchema), managers: z.array(accountManagerSchema),
  profile: accountProfileSchema, storage: z.array(storageItemSchema), favoriteGroups: z.array(favoriteGroupSchema), pointBalance: z.number().nonnegative(),
})
export type AccountRcpc = z.infer<typeof accountRcpcSchema>
export type AccountOrder = z.infer<typeof accountOrderSchema>
export type AccountProfile = z.infer<typeof accountProfileSchema>
export type CouponOffer = z.infer<typeof couponOfferSchema>
export type StorageItem = z.infer<typeof storageItemSchema>
export type FavoriteGroup = z.infer<typeof favoriteGroupSchema>
export type MyAccountSnapshot = z.infer<typeof myAccountSchema>
export interface MyAccountServices extends ManagerServices, AccountDraftServices {
  rcpcApi?: MyRcpcReadServices
  inquiryApi?: InquiryReadServices
  readApi?: MyAccountReadServices
  profileMutations?: ReturnType<typeof createCustomerProfileMutations>
  rcpcMutations?: ReturnType<typeof createCustomerRcpcMutations>
  managerApi?: CManagersApi
  withdrawalApi?: CustomerWithdrawalApi
  read(): Promise<MyAccountSnapshot>
  removeStorage(ids: readonly string[]): Promise<void>
  changeStorageQuantity(id: string, quantity: number): Promise<void>
  addFavoriteGroup(label: string, parentId: string | null): Promise<void>
  moveFavorites(rcpcIds: readonly string[], groupId: string): Promise<void>
}
