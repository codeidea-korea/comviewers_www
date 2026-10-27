import type { AccountOrderItem } from '@/api/myAccountOrders'

// Extension checkout uses unit billing for its total charge, while still carrying rental dates.
export const isRentalExtensionOrderItem = (item: AccountOrderItem) => item.fulfillmentType === 'rental_extension'
export const showsRentalUsagePeriod = (item: AccountOrderItem) => item.billingUnit !== 'unit' || isRentalExtensionOrderItem(item)
