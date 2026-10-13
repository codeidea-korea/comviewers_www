import { productQueryKeys } from '@/domain/products/productQueryKeys'
import { productSchema } from '@/domain/products/schemas'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { usePublicCatalogQueryClient } from '@/app/PublicCatalogQueryProvider'

export function useProductDetail(productNo: string | undefined, reviewId?: string, organizationId?: string | null, orderItemId?: string) {
  const { products } = useServices()
  const publicCatalogClient = usePublicCatalogQueryClient()
  return useQuery({
    queryKey: [...productQueryKeys.detail(productNo), reviewId, organizationId, orderItemId],
    queryFn: async () => productSchema.nullable().parse(reviewId && organizationId && products.getReviewed
      ? await products.getReviewed(productNo ?? '', reviewId, organizationId)
      : orderItemId && organizationId && products.getPurchased
        ? await products.getPurchased(productNo ?? '', orderItemId, organizationId)
        : await products.get(productNo ?? '')),
  }, publicCatalogClient)
}
