import type { z } from 'zod'
import type { detailSelectionsSchema, productPageSchema, productQuerySchema, productSchema } from './schemas'

export type Product = z.infer<typeof productSchema>
export type ProductListQuery = z.infer<typeof productQuerySchema>
export type ProductPage = z.infer<typeof productPageSchema>
export type DetailSelections = z.infer<typeof detailSelectionsSchema>
