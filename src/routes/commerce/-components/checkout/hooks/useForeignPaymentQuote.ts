import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import type { ForeignPaymentQuote, PreparedPayment } from '@/api/ordersPayments'
import { preparedForeignQuote } from '../tossPaymentWindow'

const unavailableMessage = '현재 USD 결제금액을 확인할 수 없습니다. 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.'

function available(quote: ForeignPaymentQuote | undefined, amountKrw: number | null): quote is ForeignPaymentQuote {
  return Boolean(quote?.available && quote.krwAmount === amountKrw && quote.usdAmount && quote.exchangeRate && quote.rateBaseDate)
}

export function useForeignPaymentQuote(selected: boolean, amountKrw: number | null) {
  const { checkout } = useServices()
  const [prepared, setPrepared] = useState<ForeignPaymentQuote | undefined>()
  const [verifying, setVerifying] = useState(false)
  const query = useQuery({ queryKey: ['checkout', 'foreign-quote', amountKrw],
    queryFn: ({ signal }) => checkout.foreignQuote!(amountKrw!, signal),
    enabled: Boolean(selected && amountKrw && checkout.foreignQuote && !prepared), retry: false,
    staleTime: 0, refetchOnWindowFocus: true })
  const quote = prepared ?? query.data
  const required = selected && amountKrw !== null && amountKrw > 0
  const ready = !required || available(quote, amountKrw)
  return {
    quote: required && available(quote, amountKrw) ? quote : undefined,
    verifying,
    // A failed HTTP lookup can be retried with the existing order button. verify() still runs before creation.
    blocked: required && !ready && !query.isError,
    error: required && !prepared && (!checkout.foreignQuote || query.isError || (query.isSuccess && !ready)) ? unavailableMessage : null,
    clearPrepared: () => setPrepared(undefined),
    bindPrepared: (payment: PreparedPayment, expectedForeign: boolean) => {
      const snapshot = preparedForeignQuote(payment)
      if (payment.amount > 0 && Boolean(snapshot) !== expectedForeign)
        throw new Error('결제수단 정보가 일치하지 않습니다. 주문내역을 확인해 주세요.')
      setPrepared(snapshot)
    },
    // Refresh before order creation as well as retries: an old display quote cannot enable USD checkout.
    verify: async (foreign: boolean, expectedKrw: number, signal?: AbortSignal) => {
      if (!foreign || expectedKrw === 0) return
      if (!checkout.foreignQuote) throw new Error(unavailableMessage)
      setVerifying(true)
      try {
        const fresh = await checkout.foreignQuote(expectedKrw, signal)
        if (!available(fresh, expectedKrw)) throw new Error(unavailableMessage)
      } finally { setVerifying(false) }
    },
  }
}
