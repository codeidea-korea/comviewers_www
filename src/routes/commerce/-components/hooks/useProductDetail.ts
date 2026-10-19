import { productQueryKeys } from '@/domain/products/productQueryKeys'
import { productSchema } from '@/domain/products/schemas'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { usePublicCatalogQueryClient } from '@/app/PublicCatalogQueryProvider'
import { serverPresenceQueryOptions } from '@/lib/serverPresenceQueryOptions'

export function useProductDetail(productNo: string | undefined, reviewId?: string, organizationId?: string | null, orderItemId?: string) {
  const { products } = useServices()
  const publicCatalogClient = usePublicCatalogQueryClient()
  return useQuery({
    ...serverPresenceQueryOptions,
    queryKey: reviewId ? productQueryKeys.reviewLink(productNo, reviewId)
      : [...productQueryKeys.detail(productNo), organizationId, orderItemId],
    queryFn: async () => productSchema.nullable().parse(reviewId
      ? products.getReviewLinked ? await products.getReviewLinked(productNo ?? '', reviewId) : null
      : orderItemId && organizationId && products.getPurchased
        ? await products.getPurchased(productNo ?? '', orderItemId, organizationId)
        : await products.get(productNo ?? '')),
  }, publicCatalogClient)
}
