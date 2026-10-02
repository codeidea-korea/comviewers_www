import type { QueryClient } from '@tanstack/react-query'
import { productQueryKeys } from './productQueryKeys'

export function invalidateProductCatalog(client: QueryClient) {
  return client.invalidateQueries({ queryKey: productQueryKeys.all })
}
