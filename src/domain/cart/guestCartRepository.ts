import { z } from 'zod'
import type { createCatalogApi, CatalogDetail } from '@/api/catalog'
import { ApiClientError } from '@/api/httpClient'
import type { CartRepository } from './cartRepository'
import { addCartItemSchema, cartSchema, changeCartQuantitySchema, removeCartItemsSchema, type CartItem } from './schemas'

const storageKey = 'comviewers.guest-cart.v1'
const selectionSchema = z.array(z.object({ productNo: addCartItemSchema.shape.productNo, rentalPeriods: z.number().int().positive().max(2147483647) }))
  .max(100).refine((rows) => new Set(rows.map((row) => row.productNo)).size === rows.length)
type Selection = z.infer<typeof selectionSchema>[number]
type CatalogApi = ReturnType<typeof createCatalogApi>

function readSelections(): Selection[] {
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw === null ? [] : selectionSchema.parse(JSON.parse(raw))
  } catch {
    throw new Error('저장된 장바구니를 읽지 못했습니다. 브라우저 저장 공간을 확인해 주세요.')
  }
}

function writeSelections(rows: Selection[]) {
  const serialized = JSON.stringify(selectionSchema.parse(rows))
  try { window.localStorage.setItem(storageKey, serialized) }
  catch { throw new Error('장바구니를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.') }
}

function validateUnits(product: CatalogDetail, rentalPeriods: number) {
  const unit = product.pricing.billingUnit
  const supported = product.pricing.pricingType === 'one_time' && unit === 'unit'
    || product.pricing.pricingType === 'rental' && ['thirty_day', 'day', 'hour'].includes(unit)
  if (!supported || product.availability !== 'AVAILABLE' || rentalPeriods < product.minUnits
    || rentalPeriods > product.maxUnits || (unit === 'unit' && rentalPeriods > product.stockQuantity)
    || !Number.isSafeInteger((product.pricing.setupFee + product.pricing.unitPrice * (unit === 'unit' ? 1 : rentalPeriods)) * (unit === 'unit' ? rentalPeriods : 1))) {
    throw new Error('선택한 상품의 수량 또는 이용기간을 확인해 주세요.')
  }
}

async function itemFor(selection: Selection, catalog: CatalogApi, signal?: AbortSignal): Promise<CartItem> {
  let product: CatalogDetail | null
  try { product = await catalog.get(selection.productNo, signal) }
  catch (error) {
    if (!(error instanceof ApiClientError && error.status === 404)) throw error
    product = null
  }
  const supported = Boolean(product && (product.pricing.pricingType === 'one_time' && product.pricing.billingUnit === 'unit'
    || product.pricing.pricingType === 'rental' && ['thirty_day', 'day', 'hour'].includes(product.pricing.billingUnit)))
  const billingUnit = product && ['thirty_day', 'day', 'hour', 'unit'].includes(product.pricing.billingUnit)
    ? product.pricing.billingUnit as CartItem['billingUnit'] : 'thirty_day'
  const quantity = billingUnit === 'unit' ? selection.rentalPeriods : 1
  const durationUnits = billingUnit === 'unit' ? null : selection.rentalPeriods
  const available = product?.availability === 'AVAILABLE'
  const validUnits = Boolean(product && supported && selection.rentalPeriods >= product.minUnits && selection.rentalPeriods <= product.maxUnits
    && (billingUnit !== 'unit' || selection.rentalPeriods <= product.stockQuantity))
  const amount = product ? (product.pricing.setupFee + product.pricing.unitPrice * (durationUnits ?? 1)) * quantity : null
  const amountSafe = amount !== null && Number.isSafeInteger(amount)
  const spec = product?.spec
  const specText = spec ? [spec.osName, spec.cpuModel, spec.ramGb === null ? null : `${spec.ramGb}GB RAM`, spec.ssdGb === null ? null : `${spec.ssdGb}GB SSD`, spec.gpuModel].filter(Boolean).join(' / ') : null
  return {
    id: `guest:${selection.productNo}`, productId: selection.productNo, source: 'guest',
    type: billingUnit === 'unit' ? 'part' : 'rental', rowKind: billingUnit === 'unit' ? 'partner' : 'normal',
    label: product?.title || selection.productNo,
    location: product ? `${product.serverRoom.providerName ? `${product.serverRoom.providerName}/` : ''}${product.serverRoom.name}` : '-',
    image: product?.images.find((image) => image.primary)?.url ?? product?.images[0]?.url ?? null,
    spec: billingUnit === 'unit' ? product?.description ?? null : specText || null,
    available, instantAvailable: product?.instantAvailable ?? null,
    billingUnit, durationUnits, quantity, minimumQuantity: product?.minUnits ?? 1,
    maximumQuantity: product ? (billingUnit === 'unit' ? Math.min(product.maxUnits, product.stockQuantity) : product.maxUnits) : null,
    setupFee: amountSafe ? product?.pricing.setupFee ?? null : null,
    rentalFee: amountSafe ? product?.pricing.unitPrice ?? null : null, priceChanged: false,
    checkoutEligible: available && validUnits && amountSafe, quantityEditable: available && validUnits,
    issues: !product ? ['UNAVAILABLE'] : !available ? ['SOLD_OUT'] : !validUnits ? ['ORDER_UNAVAILABLE'] : !amountSafe ? ['MISSING_PRICE'] : [],
    quotedAmount: amountSafe && available && validUnits ? amount : null,
    expectedPoints: null,
  }
}

export function createGuestCartRepository(catalog: CatalogApi): CartRepository {
  const list = async (signal?: AbortSignal) => cartSchema.parse(await Promise.all(readSelections().map((row) => itemFor(row, catalog, signal))))
  return {
    list,
    async count() { return readSelections().length },
    async add(input) {
      const selection = addCartItemSchema.parse(input)
      validateUnits(await catalog.get(selection.productNo), selection.rentalPeriods)
      const rows = readSelections()
      writeSelections(rows.some((row) => row.productNo === selection.productNo)
        ? rows.map((row) => row.productNo === selection.productNo ? selection : row) : [...rows, selection])
      return `guest:${selection.productNo}`
    },
    async remove(ids) {
      const removed = new Set(removeCartItemsSchema.parse(ids))
      writeSelections(readSelections().filter((row) => !removed.has(`guest:${row.productNo}`)))
      return list()
    },
    async changeQuantity(item, quantity) {
      changeCartQuantitySchema.parse({ id: item.id, quantity })
      const rows = readSelections()
      if (!rows.some((row) => `guest:${row.productNo}` === item.id)) throw new Error('장바구니 상품을 찾을 수 없습니다.')
      const product = await catalog.get(item.productId)
      validateUnits(product, quantity)
      writeSelections(rows.map((row) => `guest:${row.productNo}` === item.id ? { ...row, rentalPeriods: quantity } : row))
    },
  }
}

export async function mergeGuestCartInto(accountCart: CartRepository): Promise<void> {
  const rows = readSelections()
  for (const row of rows) {
    try {
      await accountCart.add(row)
      // Remove only the selection that was transferred; a newer guest edit remains available.
      const current = readSelections()
      writeSelections(current.filter((candidate) => candidate.productNo !== row.productNo || candidate.rentalPeriods !== row.rentalPeriods))
    } catch {
      // Keep failed selections in browser storage for explicit retry or removal.
    }
  }
}

export function pendingGuestCartSelections(): readonly Selection[] {
  return readSelections()
}

export function removePendingGuestCartSelection(productNo: string): void {
  const validated = addCartItemSchema.shape.productNo.parse(productNo)
  writeSelections(readSelections().filter((row) => row.productNo !== validated))
}

export function clearUnreadableGuestCart(): void {
  try { window.localStorage.removeItem(storageKey) }
  catch { throw new Error('저장된 장바구니를 초기화하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.') }
}
