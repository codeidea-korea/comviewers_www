import { z } from 'zod'
import type { ApiClient } from './httpClient'
import { productNoPathSchema, productNoResponseSchema } from './productNo'

// ProductCatalogController + domain/product/dto. This is a wire DTO contract,
// deliberately separate from domain/products' publishing-oriented view model.
const javaIntMax = 2_147_483_647
const int = z.number().int().min(-2_147_483_648).max(javaIntMax)
const amount = int.nonnegative()
const id = z.number().int().positive().safe()
const count = z.number().int().nonnegative().safe()
const nullableText = z.string().nullable()
export const catalogProductNoSchema = productNoPathSchema
export const catalogSortSchema = z.enum(['newest', 'priceAsc', 'priceDesc'])
const inputStatus = z.enum(['connected', 'disconnected', 'unknown'])
const categoryCode = z.string().trim().toLowerCase().transform((value) => value || undefined)
  .pipe(z.string().regex(/^[a-z0-9][a-z0-9_-]{0,49}$/).optional()).optional()
const statusQuery = z.string().trim().toLowerCase().transform((value) => value || undefined)
  .pipe(inputStatus.optional()).optional()

export const catalogListQuerySchema = z.object({
  categoryCode,
  filterOptionIds: z.array(id).transform((ids) => [...new Set(ids)].sort((a, b) => a - b))
    .pipe(z.array(id).max(50)).optional(),
  keyboardConnectionStatus: statusQuery,
  mouseConnectionStatus: statusQuery,
  minPrice: count.optional(), maxPrice: count.optional(),
  priceBasis: z.enum(['monthly', 'unit']).optional(),
  serverRoomIds: z.array(id).max(50).optional(),
  instantOnly: z.boolean().optional(), saleAvailableOnly: z.boolean().optional(),
  sort: catalogSortSchema.default('newest'),
  page: int.nonnegative().default(0), size: int.min(1).max(100).default(20),
}).superRefine((query, context) => {
  if (query.page * query.size > javaIntMax) context.addIssue({ code: 'custom', path: ['page'], message: '페이지 오프셋이 허용 범위를 초과합니다.' })
  if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
    context.addIssue({ code: 'custom', path: ['maxPrice'], message: '최대 가격은 최소 가격 이상이어야 합니다.' })
  }
})
export type CatalogListQuery = z.input<typeof catalogListQuerySchema>

export const catalogCategorySchema = z.object({
  id, code: z.string(), name: z.string(), categoryType: z.string(), displayOrder: int,
})
export const catalogFilterGroupSchema = z.object({
  id, code: z.string(), name: z.string(), displayOrder: int,
  categoryId: id.nullable(), categoryCode: nullableText, categoryName: nullableText,
  options: z.array(z.object({ id, label: z.string(), value: nullableText, displayOrder: int })),
})
const categorySummary = z.object({ code: nullableText, name: nullableText, type: nullableText })
const serverRoom = z.object({ id, name: z.string(), providerName: nullableText, status: z.string() })
export const catalogPricingSchema = z.object({
  pricingType: z.string(), billingUnit: z.string(), unitPrice: amount,
  monthlyPrice: amount.nullable(), setupFee: amount,
  pointRate: z.number().finite().nonnegative(), currency: z.literal('KRW'),
})
export const catalogSpecSchema = z.object({
  osName: nullableText, cpuModel: nullableText, cpuClockGhz: z.number().finite().nullable(),
  cpuCores: int.nullable(), cpuThreads: int.nullable(), ramGb: int.nullable(), ramType: nullableText,
  ssdGb: int.nullable(), hddGb: int.nullable(), gpuModel: nullableText,
  gpuVramGb: int.nullable(), maskedIp: nullableText,
})
const inputDeviceStatus = z.object({
  keyboardConnectionStatus: inputStatus.nullable(), mouseConnectionStatus: inputStatus.nullable(),
})
const productFields = {
  productNo: productNoResponseSchema, title: z.string(), category: categorySummary,
  serverRoom, pricing: catalogPricingSchema, availability: z.enum(['AVAILABLE', 'SOLD_OUT']),
  spec: catalogSpecSchema.nullable(), inputDeviceStatus,
}
const catalogRefundPolicySchema = z.object({
  policyVersionId: id,
  policyName: z.string().min(1),
  version: z.string().min(1),
  scopeType: z.enum(['product', 'server_room', 'global']),
  scopeId: id.nullable(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().min(1).nullable(),
}).nullable()
export const catalogListItemSchema = z.object({
  ...productFields, primaryImageUrl: nullableText, primaryImageAltText: nullableText,
  instantAvailable: z.boolean().nullable().optional(),
  connectionStatus: z.enum(['ONLINE', 'STALE', 'OFFLINE', 'NEVER_CONNECTED']).nullable().optional(),
})
export const catalogFilterMetadataSchema = z.object({
  groups: catalogFilterGroupSchema.array(),
  optionCounts: z.object({ optionId: id, productCount: count }).array(),
  rooms: z.object({ id, name: z.string(), groupName: nullableText, productCount: count }).array(),
  priceBuckets: z.object({ minPrice: count, maxPrice: count, productCount: count, priceBasis: z.enum(['monthly', 'unit']) }).array(),
})
export type CatalogFilterMetadata = z.infer<typeof catalogFilterMetadataSchema>
export const catalogPageSchema = z.object({
  items: z.array(catalogListItemSchema), page: int.nonnegative(), size: int.min(1).max(100),
  totalElements: count, totalPages: count, sort: catalogSortSchema,
})
export const catalogDetailSchema = z.object({
  ...productFields, description: nullableText, detailInformation: nullableText.optional(),
  stockQuantity: int.nonnegative(), minUnits: int.positive(), maxUnits: int.nonnegative(),
  instantAvailable: z.boolean(),
  connectionStatus: z.enum(['ONLINE', 'STALE', 'OFFLINE', 'NEVER_CONNECTED']).nullable(),
  refundPolicy: catalogRefundPolicySchema,
  images: z.array(z.object({ id, url: z.string(), altText: nullableText, displayOrder: int, primary: z.boolean() })),
  filterGroups: z.array(catalogFilterGroupSchema),
  executableApps: z.array(z.object({
    code: z.string(), name: z.string(), appType: z.string(), vendor: nullableText,
    installStatus: z.enum(['available', 'installed']), version: nullableText,
  })),
})
export type CatalogCategory = z.infer<typeof catalogCategorySchema>
export type CatalogFilterGroup = z.infer<typeof catalogFilterGroupSchema>
export type CatalogListItem = z.infer<typeof catalogListItemSchema>
export type CatalogPage = z.infer<typeof catalogPageSchema>
export type CatalogDetail = z.infer<typeof catalogDetailSchema>

export function createCatalogApi(client: ApiClient) {
  return {
    list(input: CatalogListQuery = {}, signal?: AbortSignal): Promise<CatalogPage> {
      const parsed = catalogListQuerySchema.parse(input)
      return client.request('/api/v1/products', catalogPageSchema, {
        query: { ...parsed, filterOptionIds: parsed.filterOptionIds?.length ? parsed.filterOptionIds.join(',') : undefined,
          serverRoomIds: parsed.serverRoomIds?.length ? parsed.serverRoomIds.join(',') : undefined },
        signal, authenticated: false,
      })
    },
    get(productNo: string, signal?: AbortSignal): Promise<CatalogDetail> {
      const parsed = catalogProductNoSchema.parse(productNo)
      return client.request(`/api/v1/products/${encodeURIComponent(parsed)}`, catalogDetailSchema, { signal, authenticated: false })
    },
    categories(signal?: AbortSignal): Promise<CatalogCategory[]> {
      return client.request('/api/v1/product-categories', z.array(catalogCategorySchema), { signal, authenticated: false })
    },
    filters(code?: string, signal?: AbortSignal): Promise<CatalogFilterGroup[]> {
      return client.request('/api/v1/product-filters', z.array(catalogFilterGroupSchema), {
        query: { categoryCode: categoryCode.parse(code) }, signal, authenticated: false,
      })
    },
    filterMetadata(code?: string, signal?: AbortSignal): Promise<CatalogFilterMetadata> {
      return client.request('/api/v1/product-filter-metadata', catalogFilterMetadataSchema, { query: { categoryCode: categoryCode.parse(code) }, signal, authenticated: false })
    },
  }
}
