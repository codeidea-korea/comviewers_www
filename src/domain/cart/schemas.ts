import { z } from 'zod'
import { productNoPathSchema } from '@/api/productNo'

const amount = z.number().int().nonnegative().safe()
export const cartItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['rental', 'part']),
  rowKind: z.enum(['partner', 'connected', 'normal', 'waiting']),
  label: z.string().min(1),
  productId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/),
  source: z.enum(['mock', 'api']).default('mock'),
  billingUnit: z.enum(['thirty_day', 'day', 'hour', 'unit']).default('thirty_day'),
  durationUnits: z.number().int().positive().safe().nullable().default(null),
  instantAvailable: z.boolean().nullable().default(null),
  priceChanged: z.boolean().default(false),
  checkoutEligible: z.boolean().default(true),
  quantityEditable: z.boolean().default(true),
  issues: z.array(z.string()).default([]),
  quotedAmount: amount.nullable().default(null), expectedPoints: amount.nullable().default(null),
  location: z.string(),
  image: z.string().min(1).nullable(),
  spec: z.string().min(1).nullable(),
  available: z.boolean(),
  setupFee: amount.nullable(),
  rentalFee: amount.nullable(),
  // API quantity is the item count; rental duration is durationUnits.
  // Mock storage without durationUnits retains its existing period-count field.
  quantity: z.number().int().positive().safe(),
  minimumQuantity: z.number().int().positive().safe().default(1),
  maximumQuantity: z.number().int().nonnegative().safe().nullable(),
}).refine((item) => item.source === 'api' || item.maximumQuantity === null || (item.durationUnits ?? item.quantity) <= item.maximumQuantity, {
  message: '선택 가능한 수량을 초과했습니다.', path: ['quantity'],
}).refine((item) => (item.setupFee === null || item.rentalFee === null || Number.isSafeInteger(item.setupFee + item.rentalFee * item.quantity * (item.durationUnits ?? 1))), {
  message: '계산 가능한 금액 범위를 초과했습니다.', path: ['quantity'],
})
export const cartSchema = z.array(cartItemSchema).refine(
  (items) => new Set(items.map((item) => item.id)).size === items.length,
  { message: '장바구니 항목 ID가 중복되었습니다.' },
).refine((items) => Number.isSafeInteger(items.reduce((sum, item) => sum + (item.setupFee ?? 0) + (item.rentalFee ?? 0) * item.quantity * (item.durationUnits ?? 1), 0)), {
  message: '계산 가능한 장바구니 합계 범위를 초과했습니다.',
})
export const removeCartItemsSchema = z.array(z.string().min(1)).min(1)
export const changeCartQuantitySchema = z.object({
  // Selected item count (unit) or duration count (rental), translated by the repository.
  id: z.string().min(1), quantity: z.number().int().positive().safe(),
})
export const addCartItemSchema = z.object({
  productNo: productNoPathSchema,
  rentalPeriods: z.number().int().positive().max(2147483647),
})
export type AddCartItem = z.infer<typeof addCartItemSchema>
export type CartItem = z.infer<typeof cartItemSchema>
export type ChangeCartQuantity = z.infer<typeof changeCartQuantitySchema>
