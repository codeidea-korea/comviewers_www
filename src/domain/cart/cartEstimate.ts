import type { CartItem } from './schemas'

export const getCartSelectionUnits = (item: CartItem) => item.durationUnits ?? item.quantity
export const cartUnitLabel = (item: CartItem) => ({ thirty_day: '개월', day: '일', hour: '시간', unit: '개' })[item.billingUnit]
export const cartPriceLabel = (item: CartItem) => ({ thirty_day: '월 렌탈료', day: '일 렌탈료', hour: '시간 렌탈료', unit: '상품금액' })[item.billingUnit]
export const getCartItemAmount = (item: CartItem) => {
  if (item.source === 'api') return item.quotedAmount
  if (item.setupFee === null || item.rentalFee === null) return null
  return item.setupFee + item.rentalFee * item.quantity * (item.durationUnits ?? 1)
}
// ADR 0015: setup fees do not earn purchase-confirmation points.
export const getCartItemPoints = (item: CartItem) => item.source === 'api' ? item.expectedPoints : item.rentalFee === null ? null : item.type === 'part' ? 0 : Math.floor(item.rentalFee * item.quantity * (item.durationUnits ?? 1) / 100)

export function calculateCartEstimate(items: readonly CartItem[]) {
  if (items.some((item) => item.source === 'api' || item.setupFee === null || item.rentalFee === null)) {
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
