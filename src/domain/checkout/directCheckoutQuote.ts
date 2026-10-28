import type { ExtensionQuote, ExtensionSelection } from '@/api/extensionCheckout'
import { cartSchema } from '@/domain/cart/schemas'
import type { CheckoutQuote } from './checkoutRepository'

export function validateDirectCheckoutQuote(quote: ExtensionQuote, selection: ExtensionSelection): ExtensionQuote {
  const expected = [
    ...(selection.storageItems ?? []).map(item => ({ sourceType: 'storage_rental', sourceId: item.itemId, quantity: 1, durationUnits: item.durationUnits })),
    ...(selection.partOffers ?? []).map(item => ({ sourceType: 'storage_part', sourceId: item.offerId, quantity: item.quantity, durationUnits: null })),
    ...(selection.cartItemIds ?? []).map(sourceId => ({ sourceType: 'cart', sourceId })),
  ]
  const keys = quote.purchaseItems.map(item => `${item.sourceType}:${item.sourceId}`)
  if (quote.purchaseItems.length !== expected.length || new Set(keys).size !== expected.length
    || expected.some(item => !quote.purchaseItems.some(row => row.sourceType === item.sourceType && row.sourceId === item.sourceId
      && (!('quantity' in item) || row.quantity === item.quantity) && (!('durationUnits' in item) || row.durationUnits === item.durationUnits)))
    || quote.items.length !== selection.rentalIds.length || new Set(quote.items.map(item => item.rentalId)).size !== selection.rentalIds.length
    || quote.items.some(item => !selection.rentalIds.includes(item.rentalId))) {
    throw new Error('선택한 상품과 주문 견적이 일치하지 않습니다.')
  }
  const merchandise = quote.purchaseItems.reduce((sum, item) => sum + BigInt(item.lineAmount), 0n)
  const setup = quote.purchaseItems.reduce((sum, item) => sum + BigInt(item.setupFee) * BigInt(item.quantity), 0n)
  const extensionAmount = quote.items.reduce((sum, item) => sum + BigInt(item.amount ?? 0), 0n)
  const extensionsEligible = quote.items.every(item => item.eligible && item.amount !== null) && extensionAmount <= 2147483647n
  const expectedExtensionAmount = extensionsEligible ? extensionAmount : 0n
  if (quote.purchaseItems.some(item => item.productNo === null
    || (item.billingUnit !== 'unit' && item.durationUnits === null)
    || BigInt(item.unitPrice) * BigInt(item.quantity) * BigInt(item.billingUnit === 'unit' ? 1 : item.durationUnits ?? 0) !== BigInt(item.lineAmount))
    || merchandise !== BigInt(quote.purchaseSubtotalAmount) || setup !== BigInt(quote.purchaseSetupFeeAmount)
    || BigInt(quote.totalAmount) !== BigInt(quote.extensionAmount) + merchandise + setup
    || expectedExtensionAmount !== BigInt(quote.extensionAmount) || (quote.eligible && !extensionsEligible)) {
    throw new Error('주문 견적 금액을 확인할 수 없습니다.')
  }
  return quote
}

export function directCheckoutSummary(quote: ExtensionQuote): CheckoutQuote {
  const items = cartSchema.parse(quote.purchaseItems.map(item => ({
    id: `${item.sourceType}:${item.sourceId}`, productId: item.productNo, source: 'api',
    type: item.billingUnit === 'unit' ? 'part' : 'rental', rowKind: item.billingUnit === 'unit' ? 'partner' : 'normal',
    label: item.title || item.productNo, location: item.serverRoomName ?? '-', image: item.imageUrl,
    spec: item.spec || null, osFilterValue: null, available: true, instantAvailable: null,
    billingUnit: item.billingUnit, durationUnits: item.durationUnits, quantity: item.quantity,
    setupFee: item.setupFee, rentalFee: item.unitPrice, quotedAmount: item.lineAmount + item.setupFee * item.quantity,
    expectedPoints: item.pointAmount, checkoutEligible: true, quantityEditable: false, issues: [], maximumQuantity: null,
  })))
  const rentals = quote.purchaseItems.filter(item => item.billingUnit !== 'unit')
  const rentalSetupTotal = rentals.reduce((sum, item) => sum + item.setupFee * item.quantity, 0)
  const rentalMonthlyTotal = rentals.reduce((sum, item) => sum + item.lineAmount, 0)
  const hasPurchase = items.length > 0
  return { source: 'api', items, checkoutEligible: quote.eligible, issues: [], benefits: 'available', estimate: {
    rentalSetupTotal, rentalMonthlyTotal: hasPurchase ? rentalMonthlyTotal : quote.extensionAmount,
    rentalTotal: hasPurchase ? rentalMonthlyTotal + rentalSetupTotal : quote.extensionAmount,
    partTotal: quote.purchaseItems.filter(item => item.billingUnit === 'unit').reduce((sum, item) => sum + item.lineAmount + item.setupFee * item.quantity, 0),
    expectedTotal: quote.totalAmount, pointTotal: null,
    subtotalAmount: quote.extensionAmount + quote.purchaseSubtotalAmount, setupFeeAmount: quote.purchaseSetupFeeAmount,
  } }
}
