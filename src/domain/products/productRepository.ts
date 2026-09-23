import type { Product, ProductListQuery, ProductPage } from './types'

export interface ProductRepository {
  loadEditorImage?(id: number): Promise<Blob>
  readonly filterMetadata?: (categoryCode?: string, signal?: AbortSignal) => Promise<import('@/api/catalog').CatalogFilterMetadata>
  readonly capabilities?: { readonly instantOnly: boolean; readonly rooms: boolean; readonly primarySelectors: boolean; readonly detailFilters: readonly string[]; readonly facetCounts: boolean }
  list(query: ProductListQuery, signal?: AbortSignal): Promise<ProductPage>
  get(productNo: string, signal?: AbortSignal): Promise<Product | null>
}
