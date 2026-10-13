import { z } from 'zod'
import { extensionSelectionSchema } from '@/api/extensionCheckout'

export const extensionCheckoutStateSchema = z.object({
  kind: z.literal('extension'),
  selection: extensionSelectionSchema.refine(value => new Set(value.rentalIds).size === value.rentalIds.length),
  offerIds: z.array(z.number().int().positive().safe()).min(1).max(100)
    .refine(value => new Set(value).size === value.length).optional(),
}).refine(value => value.offerIds === undefined ? value.selection.offerIds === undefined
  : value.offerIds.length === value.selection.offerIds?.length && value.offerIds.every(id => value.selection.offerIds?.includes(id)))
export type ExtensionCheckoutState = z.infer<typeof extensionCheckoutStateSchema>
