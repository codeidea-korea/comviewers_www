import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

export function invalidatePaymentBenefits(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['my-account', 'read', 'benefits'] }),
    client.invalidateQueries({ queryKey: ['my-account', 'read', 'points'] }),
    client.invalidateQueries({ queryKey: ['checkout', 'benefits'] }),
    client.invalidateQueries({ queryKey: ['checkout', 'extension'] }),
  ])
}

export function useRefreshBenefitsAfterPayment(paymentKey: string | number | undefined, status: string | undefined) {
  const client = useQueryClient()
  const refreshedPayment = useRef<string | number | undefined>(undefined)

  useEffect(() => {
    if (paymentKey === undefined || status !== 'approved' || refreshedPayment.current === paymentKey) return
    refreshedPayment.current = paymentKey
    void invalidatePaymentBenefits(client)
  }, [client, paymentKey, status])
}
