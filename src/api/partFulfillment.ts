import { z } from 'zod'
import { accountId, accountTime } from './myAccountSchemas'
export const partFulfillmentSchema = z.object({ orderItemId: accountId, productNo: z.string(), title: z.string(), quantity: z.number().int().positive(),
  serverRoomName: z.string().nullable(), fulfilledAt: accountTime.nullable(), purchaseConfirmedAt: accountTime.nullable(), canConfirm: z.boolean() })
