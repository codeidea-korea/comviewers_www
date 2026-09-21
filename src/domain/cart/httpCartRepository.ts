import { z } from 'zod'
import type { createCartApi, CartDto } from '@/api/cart'
import type { createCatalogApi, CatalogDetail } from '@/api/catalog'
import { ApiClientError } from '@/api/httpClient'
import type { CartRepository } from './cartRepository'
import { addCartItemSchema, cartItemSchema, cartSchema, changeCartQuantitySchema, removeCartItemsSchema } from './schemas'

type CartApi = ReturnType<typeof createCartApi>
type CatalogApi = ReturnType<typeof createCatalogApi>
export const apiCartItemIdSchema = z.string().regex(/^[1-9]\d*$/)
  .transform(Number).pipe(z.number().int().positive().safe())

async function getProduct(catalog: CatalogApi, number: string, signal?: AbortSignal) {
  try { return await catalog.get(number, signal) } catch (error) {
    // A removed public product has no display metadata; never substitute a fixture.
    if (error instanceof ApiClientError && error.status === 404) return null
    throw error
  }
}

function mapItem(row: CartDto['items'][number], product: CatalogDetail | null) {
  const unit = row.billingUnit
  const supported = ['thirty_day', 'day', 'hour', 'unit'].includes(unit)
  const pricingMissing = row.currentUnitPrice === null || row.currentSetupFee === null
  const pricingChanged = row.currentBillingUnit !== unit
  const soldOut = product?.availability === 'SOLD_OUT'
  const issues = [
    ...(!supported ? ['UNSUPPORTED_BILLING_UNIT'] : []),
    ...(pricingMissing ? ['MISSING_PRICE'] : []),
    ...(pricingChanged ? ['PRICING_MODEL_CHANGED'] : []),
    ...(soldOut ? ['SOLD_OUT'] : []),
    ...(!row.available ? ['ORDER_UNAVAILABLE'] : []),
    ...(!product ? ['UNAVAILABLE'] : []),
  ]
  const spec = product?.spec
  const specText = spec ? [spec.osName, spec.cpuModel, spec.ramGb === null ? null : `${spec.ramGb}GB RAM`, spec.ssdGb === null ? null : `${spec.ssdGb}GB SSD`, spec.gpuModel].filter((value) => value !== null).join(' / ') : null
  return {
    id: String(row.id), productId: row.productNo, source: 'api',
    type: unit === 'unit' ? 'part' : 'rental', rowKind: unit === 'unit' ? 'partner' : 'normal',
    label: row.title || row.productNo, location: product ? `${product.serverRoom.providerName ? `${product.serverRoom.providerName}/` : ''}${product.serverRoom.name}` : '-',
    image: product?.images.find((image) => image.primary)?.url ?? product?.images[0]?.url ?? null,
    spec: unit === 'unit' ? (product?.description ?? specText) || null : specText || null, available: product?.availability === 'AVAILABLE', instantAvailable: product?.instantAvailable ?? null,
    billingUnit: unit, durationUnits: row.durationUnits, quantity: row.quantity,
    minimumQuantity: product?.minUnits ?? 1,
    maximumQuantity: product ? (unit === 'unit' ? Math.min(product.maxUnits, product.stockQuantity) : product.maxUnits) : null,
    setupFee: row.currentSetupFee, rentalFee: row.currentUnitPrice,
    priceChanged: row.priceChanged, checkoutEligible: issues.length === 0,
    quantityEditable: supported && !pricingMissing && !pricingChanged && product?.availability === 'AVAILABLE' && (unit !== 'unit' || product.stockQuantity > 0),
    issues, quotedAmount: null,
  }
}

export function createHttpCartRepository(api: CartApi, catalog: CatalogApi): CartRepository {
  async function list(signal?: AbortSignal) {
    const response = await api.list(signal)
    const rows = await Promise.all(response.items.map(async (row) => mapItem(row, await getProduct(catalog, row.productNo, signal))))
    return cartSchema.parse(rows)
  }
  return {
    list,
    async count(signal) {
      return (await api.list(signal)).items.length
    },
    async add(input) {
      const { productNo, rentalPeriods } = addCartItemSchema.parse(input)
      const product = await catalog.get(productNo)
      const part = product.pricing.pricingType === 'one_time' && product.pricing.billingUnit === 'unit'
      const rental = product.pricing.pricingType === 'rental' && ['thirty_day', 'day', 'hour'].includes(product.pricing.billingUnit)
      const maximum = product.maxUnits
      if ((!part && !rental) || rentalPeriods < product.minUnits || rentalPeriods > maximum) {
        throw new Error('선택한 상품의 수량 또는 이용기간을 확인해 주세요.')
      }
      const quantity = part ? rentalPeriods : 1
      const durationUnits = part ? null : rentalPeriods
      const item = await api.putItem(productNo, { quantity, durationUnits })
      if (item.productNo !== productNo || item.quantity !== quantity || item.durationUnits !== durationUnits) {
        throw new Error('장바구니에 저장된 상품을 확인하지 못했습니다.')
      }
      return String(item.id)
    },
    async remove(input) {
      const ids = removeCartItemsSchema.parse(input).map((id) => apiCartItemIdSchema.parse(id))
      const results = await Promise.allSettled(ids.map((id) => api.removeItem(id)))
      // Read canonical state even after a partial deletion; callers invalidate on failure.
      const items = await list()
      if (results.some((result) => result.status === 'rejected')) throw new Error('일부 상품을 삭제하지 못했습니다. 장바구니를 다시 확인해 주세요.')
      return items
    },
    async changeQuantity(currentItem, quantity) {
      const item = cartItemSchema.parse(currentItem)
      const change = changeCartQuantitySchema.parse({ id: item.id, quantity })
      apiCartItemIdSchema.parse(item.id)
      if (!item.quantityEditable || change.quantity < item.minimumQuantity
        || (item.maximumQuantity !== null && change.quantity > item.maximumQuantity)) {
        throw new Error('변경할 상품 또는 수량을 확인해 주세요.')
      }
      const saved = await api.putItem(item.productId, item.billingUnit === 'unit'
        ? { quantity: change.quantity, durationUnits: null }
        : { quantity: 1, durationUnits: change.quantity })
      const expectedQuantity = item.billingUnit === 'unit' ? change.quantity : 1
      const expectedDuration = item.billingUnit === 'unit' ? null : change.quantity
      if (saved.id !== Number(item.id) || saved.productNo !== item.productId
        || saved.quantity !== expectedQuantity || saved.durationUnits !== expectedDuration) {
        throw new Error('변경된 장바구니 상품을 확인하지 못했습니다.')
      }
    },
  }
}
