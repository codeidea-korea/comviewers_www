import { useCallback } from 'react'
import { usePublicCatalogQueryClient } from '@/app/PublicCatalogQueryProvider'
import { invalidateProductCatalog } from '@/domain/products/invalidateProductCatalog'

export function useInvalidateProductCatalog() {
  const client = usePublicCatalogQueryClient()
  return useCallback(() => invalidateProductCatalog(client), [client])
}
