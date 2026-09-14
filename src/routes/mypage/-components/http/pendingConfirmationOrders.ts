import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { AccountOrderPage } from '@/api/myAccountOrders'

export async function pendingOrders(api: MyAccountReadServices, signal: AbortSignal) {
  const first = await api.orders({ page: 0, size: 100, category: 'completed', pendingPurchaseConfirmation: true }, signal)
  let orders: AccountOrderPage['items'] = first.items
  for (let page = 1; page < first.totalPages; page += 1) {
    signal.throwIfAborted()
    const next = await api.orders({ page, size: 100, category: 'completed', pendingPurchaseConfirmation: true }, signal)
    orders = [...orders, ...next.items]
  }
  return orders.filter(order => order.paymentStatus === 'approved' && ['paid', 'completed'].includes(order.orderStatus))
    .map(order => ({ ...order, items: order.items.filter(item => !item.purchaseConfirmedAt && !item.refundPending
      && ['active', 'expiring'].includes(item.rentalStatus ?? '')
      && item.serviceStartedAt && item.serviceEndsAt
      && Date.parse(`${item.serviceStartedAt}+09:00`) <= Date.now() && Date.parse(`${item.serviceEndsAt}+09:00`) > Date.now()
      && ['paid', 'active', 'completed'].includes(item.itemStatus)) })).filter(order => order.items.length > 0)
}
