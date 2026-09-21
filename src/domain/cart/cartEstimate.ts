import type { CartItem } from './schemas'
import { translate } from '@/i18n/translation-core'

export const getCartSelectionUnits = (item: CartItem) => item.durationUnits ?? item.quantity
export const cartUnitLabel = (item: CartItem) => ({ thirty_day: '개월', day: '일', hour: '시간', unit: '개' })[item.billingUnit]
export const cartSelectionLabel = (item: CartItem) => translate(({
  thirty_day: 'unit.months', day: 'unit.days', hour: 'unit.hours', unit: 'unit.quantity',
} as const)[item.billingUnit], { count: getCartSelectionUnits(item) })
export const cartPriceLabel = (item: CartItem) => translate(({
  thirty_day: 'money.monthlyRental', day: 'money.dailyRental', hour: 'money.hourlyRental', unit: 'money.productAmount',
} as const)[item.billingUnit])
export const getCartItemAmount = (item: CartItem) => item.quotedAmount
// ADR 0015: setup fees do not earn purchase-confirmation points.
export const getCartItemPoints = (item: CartItem) => item.expectedPoints

export function calculateCartEstimate(items: readonly CartItem[]) {
  if (items.some((item) => item.setupFee === null || item.rentalFee === null)) {
    throw new Error('현재 상품 금액을 확인할 수 없습니다.')
  }
  const rentals = items.filter((item) => item.type === 'rental')
  const rentalSetupTotal = rentals.reduce((sum, item) => sum + (item.setupFee ?? 0), 0)
  const rentalMonthlyTotal = rentals.reduce((sum, item) => sum + (item.rentalFee ?? 0) * item.quantity * (item.durationUnits ?? 1), 0)
  const rentalTotal = rentalSetupTotal + rentalMonthlyTotal
  const partTotal = items.filter((item) => item.type === 'part').reduce((sum, item) => sum + (getCartItemAmount(item) ?? 0), 0)
  return {
    rentalSetupTotal, rentalMonthlyTotal, rentalTotal, partTotal,
    expectedTotal: rentalTotal + partTotal,
    pointTotal: rentals.reduce((sum, item) => sum + (getCartItemPoints(item) ?? 0), 0),
  }
}
export type CartEstimate = ReturnType<typeof calculateCartEstimate>

// Display only server-quoted amounts. Order eligibility is checked separately.
export function summarizeQuotedCartItems(items: readonly CartItem[]): { [K in keyof CartEstimate]: number | null } {
  const sum = (values: readonly (number | null)[]) => values.some(value => value === null)
    ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0)
  const excludedFromQuote = (item: CartItem) => item.quotedAmount === 0
    && item.issues.some(issue => ['SOLD_OUT', 'STOCK_RESERVED', 'UNAVAILABLE', 'PRICING_MODEL_CHANGED'].includes(issue))
  const rentals = items.filter(item => item.type === 'rental')
  const rentalTotal = sum(rentals.map(item => item.quotedAmount))
  const rentalSetupTotal = sum(rentals.map(item => excludedFromQuote(item) ? 0
    : item.quotedAmount === null || item.setupFee === null ? null : item.setupFee * item.quantity))
  return {
    rentalTotal,
    rentalSetupTotal,
    rentalMonthlyTotal: rentalTotal === null || rentalSetupTotal === null || rentalTotal < rentalSetupTotal
      ? null : rentalTotal - rentalSetupTotal,
    partTotal: sum(items.filter(item => item.type === 'part').map(item => item.quotedAmount)),
    expectedTotal: sum(items.map(item => item.quotedAmount)),
    pointTotal: sum(items.map(item => excludedFromQuote(item) ? 0 : item.expectedPoints)),
  }
}
