import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'

export const pendingConfirmationKey = ['my-account', 'read', 'orders', 'purchase-confirmation-candidates'] as const

export function pendingOrders(api: MyAccountReadServices, signal: AbortSignal, page = 0, size = 10) {
  return api.pendingConfirmations({ page, size }, signal)
}
