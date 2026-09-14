import { createCatalogApi } from '@/api/catalog'
import { ApiClientError, type ApiClient } from '@/api/httpClient'
import type { ProductRepository } from './productRepository'
import { mapCatalogProduct } from './catalogProductMapper'
import { productPageSchema, productQuerySchema } from './schemas'
import { z } from 'zod'

export class UnsupportedProductFilterError extends Error {
  constructor() { super('이전 검색 조건을 현재 상품 필터로 다시 선택해 주세요.') }
}

// Opt-in adapter only: ServiceProvider continues to construct the mock repository.
export function createHttpProductRepository(client: ApiClient): ProductRepository {
  const api = createCatalogApi(client)
  return {
    capabilities: { instantOnly: true, rooms: true, primarySelectors: false, detailFilters: [], facetCounts: true },
    filterMetadata: (categoryCode, signal) => api.filterMetadata(categoryCode, signal),
    async list(input, signal) {
      const query = productQuerySchema.parse(input)
      if (query.line !== '전체' || query.ip !== '전체' || query.purpose !== '전체'
        || Object.values(query.details).some((values) => values?.length)) throw new UnsupportedProductFilterError()
      // Comparison prices are separate from the unchanged checkout billing unit and unit price.
      const serverRoomIds = query.rooms.map(value => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive().safe()).parse(value))
      const dto = await api.list({ categoryCode: query.categoryCode, page: query.page - 1, size: query.pageSize,
        serverRoomIds, instantOnly: query.instantOnly, saleAvailableOnly: query.saleAvailableOnly,
        filterOptionIds: query.filterOptionIds, minPrice: query.minPrice, maxPrice: query.maxPrice, priceBasis: query.priceBasis,
        keyboardConnectionStatus: query.keyboardConnectionStatus, mouseConnectionStatus: query.mouseConnectionStatus,
        sort: query.sort,
      }, signal)
      return productPageSchema.parse({ items: dto.items.map(mapCatalogProduct), total: dto.totalElements, totalPages: dto.totalPages, page: dto.page + 1, facets: null })
    },
    async get(productNo, signal) {
      try { return mapCatalogProduct(await api.get(productNo, signal)) }
      catch (error) {
        if (error instanceof ApiClientError && error.code === 'PD001') return null
        throw error
      }
    },
  }
}
