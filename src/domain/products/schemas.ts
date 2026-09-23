import { z } from 'zod'

// Frontend contract; the eventual HTTP adapter must map the API DTO explicitly.
export const detailFilterIds = ['os', 'cpu-type', 'cpu-clock', 'cpu-core', 'ram-spec', 'ram-size', 'disk-type', 'disk-size', 'gpu-type', 'gpu-memory', 'peripheral', 'game', 'monthly-fee'] as const
const selectedValues = z.array(z.string().max(100)).max(30).optional()
export const detailSelectionsSchema = z.object({
  os: selectedValues, 'cpu-type': selectedValues, 'cpu-clock': selectedValues, 'cpu-core': selectedValues,
  'ram-spec': selectedValues, 'ram-size': selectedValues, 'disk-type': selectedValues, 'disk-size': selectedValues,
  'gpu-type': selectedValues, 'gpu-memory': selectedValues, peripheral: selectedValues, game: selectedValues,
  'monthly-fee': selectedValues,
})
export const productQuerySchema = z.object({
  categoryCode: z.string().optional(),
  page: z.number().int().min(1).max(100000),
  pageSize: z.number().int().min(1).max(100),
  instantOnly: z.boolean(),
  rooms: z.array(z.string().max(100)).max(50),
  line: z.string().max(100),
  ip: z.string().max(100),
  purpose: z.string().max(100),
  details: detailSelectionsSchema,
  filterOptionIds: z.array(z.number().int().positive().safe()).max(50).optional(),
  minPrice: z.number().int().nonnegative().safe().optional(),
  maxPrice: z.number().int().nonnegative().safe().optional(),
  priceBasis: z.enum(['monthly', 'unit']).optional(),
  keyboardConnectionStatus: z.enum(['connected', 'disconnected', 'unknown']).optional(),
  mouseConnectionStatus: z.enum(['connected', 'disconnected', 'unknown']).optional(),
  saleAvailableOnly: z.boolean().optional(),
  sort: z.enum(['newest', 'priceAsc', 'priceDesc']).optional(),
})
export const productSchema = z.object({
  id: z.string(), productId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/), image: z.string().nullable(),
  title: z.string().nullable().default(null), description: z.string().nullable().default(null),
  detailRichContent: z.unknown().nullable().optional(),
  detailInformation: z.string().nullable().optional(),
  os: z.string().nullable(), cpu: z.string().nullable(), ram: z.string().nullable(), disk: z.string().nullable(), gpu: z.string().nullable(),
  country: z.string().nullable(), ip: z.string().nullable(), serverRoom: z.string(), serverRoomProvider: z.string().nullable().default(null),
  setupFee: z.number().nonnegative(), monthlyPrice: z.number().nonnegative().nullable(),
  unitPrice: z.number().int().nonnegative().safe().nullable().default(null),
  // available is the instant-access state; saleAvailability is the orderable catalog state.
  available: z.boolean().nullable(), saleAvailability: z.enum(['AVAILABLE', 'SOLD_OUT']).nullable().default(null),
  billingUnit: z.string().nullable().default(null),
  pricingType: z.enum(['rental', 'one_time']).nullable().default(null),
  minPurchaseQuantity: z.number().int().positive().safe().nullable().default(null),
  maxPurchaseQuantity: z.number().int().nonnegative().safe().nullable().default(null),
  pointRate: z.number().nonnegative().nullable().default(null),
  minRentalUnits: z.number().int().positive().safe().nullable().default(null),
  maxRentalUnits: z.number().int().positive().safe().nullable().default(null),
  serverState: z.enum(['online', 'offline']).nullable(),
  mouseIncluded: z.boolean().nullable(), keyboardIncluded: z.boolean().nullable(),
  peripherals: z.array(z.enum(['mouse', 'keyboard'])).nullable(),
  refundPolicy: z.object({
    policyVersionId: z.number().int().positive().safe(),
    policyName: z.string(),
    version: z.string(),
    scopeType: z.enum(['product', 'server_room', 'global']),
    scopeId: z.number().int().positive().safe().nullable(),
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullable(),
  }).nullable().default(null),
})
export const productPageSchema = z.object({
  items: z.array(productSchema), total: z.number().int().nonnegative(),
  page: z.number().int().positive(), totalPages: z.number().int().nonnegative(),
  facets: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).nullable(),
})
