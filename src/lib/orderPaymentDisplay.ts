import { useEffect, useState } from 'react'
import type { AccountOrderPage } from '@/api/myAccountOrders'

type OrderPaymentState = Pick<AccountOrderPage['items'][number], 'orderStatus' | 'paymentStatus' | 'paymentMethod' | 'paymentRecordStatus' | 'virtualAccountStatus' | 'virtualAccountDepositDueAt' | 'paymentTerminationReason'>

export function orderPaymentDisplay(order: OrderPaymentState, now: number, paymentStatus = order.paymentRecordStatus ?? order.paymentStatus) {
  const statuses = [order.paymentStatus, paymentStatus, order.paymentRecordStatus ?? '']
  if (order.orderStatus === 'refunded' || statuses.includes('refunded')) return { label: '환불완료', waitingForDeposit: false }
  if (statuses.includes('partially_refunded')) return { label: '부분환불', waitingForDeposit: false }
  if (order.orderStatus === 'cancelled' || statuses.some(status => ['cancelled', 'expired', 'failed'].includes(status))) {
    const label = order.paymentTerminationReason === 'pg_aborted' || statuses.includes('failed') ? '결제실패'
      : ['pg_expired', 'payment_deadline_expired'].includes(order.paymentTerminationReason ?? '') || statuses.includes('expired') ? '결제기한 만료' : '취소완료'
    return { label, waitingForDeposit: false }
  }
  if (statuses.includes('approved')) return { label: '결제완료', waitingForDeposit: false }
  const issued = order.paymentMethod === 'virtual_account' && order.paymentStatus === 'pending'
    && ['pending', 'waiting_for_deposit'].includes(paymentStatus)
    && ['created', 'payment_pending'].includes(order.orderStatus)
    && ['issued', 'partially_paid'].includes(order.virtualAccountStatus ?? '')
  if (!issued) return { label: '결제 결과 확인 중', waitingForDeposit: false }
  const normalized = order.virtualAccountDepositDueAt?.replace(' ', 'T')
  const dueAt = normalized ? Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) ? normalized : `${normalized}+09:00`) : NaN
  const waitingForDeposit = Number.isFinite(dueAt) && dueAt > now
  return { label: waitingForDeposit ? '입금대기' : Number.isFinite(dueAt) ? '입금기한 경과 · 결과 확인 중' : '입금기한 확인 중', waitingForDeposit }
}

// Re-evaluate deadlines even when the customer leaves the page open or returns to its tab.
export function usePaymentDisplayClock(enabled: boolean) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!enabled) return
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [enabled])
  return now
}
