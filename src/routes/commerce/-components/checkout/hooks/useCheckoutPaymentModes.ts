import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { checkoutGlobalCardPayment, checkoutPaymentMethodsUnavailable, resolveCheckoutGlobalCardPayment,
  type GlobalCardPayment } from '@/domain/checkout/checkoutDraft'

const queryKey = ['checkout', 'direct-easy-pay-methods'] as const

export function useCheckoutPaymentModes(frozen: GlobalCardPayment | undefined, recovering: boolean, required = true) {
  const { checkout } = useServices()
  const client = useQueryClient()
  const [verifying, setVerifying] = useState(false)
  const query = useQuery({ queryKey, queryFn: ({ signal }) => checkout.directEasyPayMethods!(signal),
    enabled: Boolean(checkout.directEasyPayMethods && !recovering), retry: false, staleTime: 0,
    refetchOnWindowFocus: true })
  const globalCardPayment = frozen ?? (query.isError ? undefined : checkoutGlobalCardPayment(query.data))
  return {
    methods: query.data,
    globalCardPayment,
    verifying,
    pending: required && !frozen && Boolean(checkout.directEasyPayMethods) && query.isPending,
    error: required && !frozen && !recovering && (!checkout.directEasyPayMethods || query.isError) ? checkoutPaymentMethodsUnavailable : null,
    verify: async (signal?: AbortSignal) => {
      if (frozen) return frozen
      setVerifying(true)
      try {
        const payment = await resolveCheckoutGlobalCardPayment(undefined, checkout.directEasyPayMethods ? async currentSignal => {
          const capabilities = await checkout.directEasyPayMethods!(currentSignal)
          currentSignal?.throwIfAborted()
          client.setQueryData(queryKey, capabilities)
          return capabilities
        } : undefined, signal)
        // Refresh the displayed currency, but require another click if the user saw a different one.
        if (globalCardPayment && payment !== globalCardPayment) throw new Error(checkoutPaymentMethodsUnavailable)
        return payment
      } finally { setVerifying(false) }
    },
  }
}
