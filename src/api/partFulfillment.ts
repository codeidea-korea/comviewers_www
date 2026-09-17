import { z } from 'zod'
import { productNoResponseSchema } from './productNo'
import { accountId, accountTime } from './myAccountSchemas'
export const partFulfillmentSchema = z.object({ orderItemId: accountId, productNo: productNoResponseSchema, title: z.string(), quantity: z.number().int().positive(),
  serverRoomName: z.string().nullable(), fulfilledAt: accountTime.nullable(), purchaseConfirmedAt: accountTime.nullable(), canConfirm: z.boolean() })
