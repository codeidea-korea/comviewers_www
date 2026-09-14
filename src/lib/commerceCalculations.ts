export interface CommerceItem {
  id?: string
  type?: string
  quantity?: number
  rentalFee?: number
  price?: number
  setupFee?: number
}

export const MAX_RENTAL_MONTHS = 3
export const POINT_EARNING_RATE = 0.01

export function isPartProduct(item: CommerceItem) {
  return item.id === 'partner' || item.type === 'part'
}

export function getQuantity(item: CommerceItem) {
  return item.quantity ?? 1
}

export function getRentalFee(item: CommerceItem) {
  return item.rentalFee ?? item.price ?? 0
}

export function getSetupFee(item: CommerceItem) {
  return isPartProduct(item) ? 0 : item.setupFee ?? 0
}

export function getItemAmount(item: CommerceItem) {
  return getSetupFee(item) + getRentalFee(item) * getQuantity(item)
}

export function getEarnedPoints(item: CommerceItem) {
  return isPartProduct(item) ? 0 : Math.floor(getItemAmount(item) * POINT_EARNING_RATE)
}

export function clampQuantity(item: CommerceItem, quantity: number) {
  const maximum = isPartProduct(item) ? Number.POSITIVE_INFINITY : MAX_RENTAL_MONTHS
  return Math.max(1, Math.min(maximum, quantity))
}

export function calculateCommerceSummary(items: readonly CommerceItem[]) {
  const rentalItems = items.filter((item) => !isPartProduct(item))
  const partItems = items.filter(isPartProduct)
  const rentalSetupTotal = rentalItems.reduce((total, item) => total + getSetupFee(item), 0)
  const rentalMonthlyTotal = rentalItems.reduce((total, item) => total + getRentalFee(item) * getQuantity(item), 0)
  const rentalTotal = rentalSetupTotal + rentalMonthlyTotal
  const partTotal = partItems.reduce((total, item) => total + getItemAmount(item), 0)
  const pointTotal = rentalItems.reduce((total, item) => total + getEarnedPoints(item), 0)

  return {
    expectedTotal: rentalTotal + partTotal,
    partTotal,
    pointTotal,
    rentalMonthlyTotal,
    rentalSetupTotal,
    rentalTotal,
  }
}
