import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { checkoutQueryKeys, checkoutQuoteSchema, checkoutSelectionSchema } from '@/domain/checkout/checkoutRepository'

export function useCheckoutQuote(ids: readonly string[]) {
  const { checkout } = useServices()
  const selection = checkoutSelectionSchema.safeParse(ids)
  const result = useQuery({
    queryKey: checkoutQueryKeys.quote(ids),
    queryFn: async ({ signal }) => {
      const quote = checkoutQuoteSchema.parse(await checkout.quote(ids, signal))
      if (quote.items.length !== ids.length || quote.items.some((item) => !ids.includes(item.id))) {
        throw new Error('선택한 상품과 주문서 응답이 일치하지 않습니다.')
      }
      return quote
    },
    enabled: selection.success,
    retry: false,
    staleTime: 0,
  })
  return { ...result, validSelection: selection.success }
}
