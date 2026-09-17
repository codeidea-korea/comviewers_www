import { z } from 'zod'
import { productNoResponseSchema } from './productNo'
export const partStorageOfferSchema = z.object({ id: z.number().int().positive().safe(), productNo: productNoResponseSchema, title: z.string(),
  description: z.string().nullable(), serverRoomName: z.string(), unitPrice: z.number().int().nonnegative().safe(), setupFee: z.number().int().nonnegative().safe(),
  minimumQuantity: z.number().int().positive(), maximumQuantity: z.number().int().positive(), availableQuantity: z.number().int().nonnegative(),
  status: z.enum(['stored','moved_to_cart','ordered','paid','cancelled','expired']), orderNo: z.string().nullable(), paymentDueAt: z.iso.datetime({ local: true }).nullable(), createdAt: z.iso.datetime({ local: true }),
  cartItemId: z.number().int().positive().safe().nullable(), selectedQuantity: z.number().int().positive().nullable() })
export const partStorageSelectionSchema = z.object({ id: z.number().int().positive().safe(), quantity: z.number().int().positive().max(2147483647) })
