import type { AccountOrderItem } from '@/api/myAccountOrders'

export const isReplacementOriginal = (item: AccountOrderItem) => Boolean(item.currentPcAssetId && item.currentPcAssetId !== item.pcAssetId)
export const currentOrderPcAssetId = (item: AccountOrderItem) => isReplacementOriginal(item) ? null : item.pcAssetId
