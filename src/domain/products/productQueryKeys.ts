import type { ProductListQuery } from './types'

/** Keep list invalidation separate from future detail/metadata queries. */
export const productQueryKeys = {
  all: ['products'] as const,
  lists: ['products', 'list'] as const,
  list: (query: ProductListQuery) => ['products', 'list', query] as const,
  detail: (productNo: string | undefined) => ['products', 'detail', productNo] as const,
}
