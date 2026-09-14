import { productQueryKeys } from '@/domain/products/productQueryKeys'
import { productSchema } from '@/domain/products/schemas'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'

export function useProductDetail(productNo: string | undefined) {
  const { products } = useServices()
  return useQuery({
    queryKey: productQueryKeys.detail(productNo),
    queryFn: async ({ signal }) => productSchema.nullable().parse(await products.get(productNo ?? '', signal)),
  })
}
