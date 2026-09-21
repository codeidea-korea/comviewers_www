import { productQueryKeys } from '@/domain/products/productQueryKeys'
import { productSchema } from '@/domain/products/schemas'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { usePublicCatalogQueryClient } from '@/app/PublicCatalogQueryProvider'

export function useProductDetail(productNo: string | undefined) {
  const { products } = useServices()
  const publicCatalogClient = usePublicCatalogQueryClient()
  return useQuery({
    queryKey: productQueryKeys.detail(productNo),
    queryFn: async () => productSchema.nullable().parse(await products.get(productNo ?? '')),
  }, publicCatalogClient)
}
