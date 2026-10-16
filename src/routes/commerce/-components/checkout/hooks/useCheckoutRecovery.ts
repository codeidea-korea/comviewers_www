import { useEffect, useState } from 'react'
import { useSession } from '@/app/session/SessionProvider'
import type { CheckoutCancellationRequest } from '@/api/ordersPayments'
import { bindCheckoutRecoveryOrder, checkoutRecoveryKey, clearCheckoutRecovery, readCheckoutRecovery, saveCheckoutRecovery } from '@/domain/checkout/checkoutRecovery'

export function useCheckoutRecovery(identity: string, returnTo: string) {
  const session = useSession()
  const member = session.status === 'authenticated' ? session.customerSession : null
  const key = member ? checkoutRecoveryKey(member.customerOrganizationId, member.customerMemberId, identity) : ''
  const [saved, setSaved] = useState(() => ({ key, record: key ? readCheckoutRecovery(key) : null }))
  useEffect(() => { setSaved({ key, record: key ? readCheckoutRecovery(key) : null }) }, [key])
  const record = saved.key === key ? saved.record : null
  return {
    record,
    persist(request: CheckoutCancellationRequest) {
      if (!key) throw new Error('주문서의 조직과 회원을 확인할 수 없습니다.')
      setSaved({ key, record: saveCheckoutRecovery(key, request, returnTo) })
    },
    bindOrder(orderNo: string) { if (key) bindCheckoutRecoveryOrder(key, orderNo) },
    clear() { if (key) clearCheckoutRecovery(key); setSaved({ key, record: null }) },
  }
}
