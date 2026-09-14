import { fixtures } from './products/productFixtures'
import { detailFilterIds, productPageSchema, productQuerySchema, productSchema } from '../domain/products/schemas'
import type { ProductRepository } from '../domain/products/productRepository'
import type { DetailSelections, ProductListQuery } from '../domain/products/types'

function matchesDetails(fixture: typeof fixtures[number], details: DetailSelections) {
  return Object.entries(details).every(([id, selected]) => {
    if (!selected || selected.length === 0) return true
    if (id === 'monthly-fee') {
      const maximum = Number(selected[0])
      return Number.isFinite(maximum) && fixture.product.monthlyPrice !== null && fixture.product.monthlyPrice <= maximum
    }
    const values = fixture.details[id as keyof DetailSelections] ?? []
    return selected.some((value) => values.includes(value))
  })
}

function selectProducts(query: ProductListQuery) {
  return fixtures.filter((fixture) =>
    // This fixture collection contains RCPC products only.
    (!query.categoryCode || query.categoryCode === 'rcpc') &&
    (!query.instantOnly || fixture.product.available) &&
    (query.rooms.length === 0 || query.rooms.includes(fixture.room!)) &&
    (query.line === '전체' || fixture.line === query.line) &&
    (query.ip === '전체' || fixture.ip === query.ip) &&
    (query.purpose === '전체' || fixture.purpose === query.purpose) &&
    matchesDetails(fixture, query.details))
}

export function createMockProductRepository(): ProductRepository {
  return {
    capabilities: { instantOnly: true, rooms: true, primarySelectors: true, detailFilters: detailFilterIds, facetCounts: true },
    async get(productNo, signal) {
      signal?.throwIfAborted()
      await Promise.resolve()
      signal?.throwIfAborted()
      const match = fixtures.find(({ product }) => String(product.productId) === productNo)
      return match ? productSchema.parse(match.product) : null
    },
    async list(input, signal) {
      signal?.throwIfAborted()
      const query = productQuerySchema.parse(input)
      await Promise.resolve()
      signal?.throwIfAborted()
      const matches = selectProducts(query)
      const totalPages = Math.ceil(matches.length / query.pageSize)
      const page = Math.min(query.page, Math.max(1, totalPages))
      const facets = Object.fromEntries(detailFilterIds.filter((id) => id !== 'monthly-fee').map((id) => {
        const values = fixtures.flatMap((fixture) => fixture.details[id] ?? [])
        return [id, Object.fromEntries([...new Set(values)].map((value) => [value, fixtures.filter((fixture) => fixture.details[id]?.includes(value)).length]))]
      }))
      return productPageSchema.parse({
        items: matches.slice((page - 1) * query.pageSize, page * query.pageSize).map(({ product }) => product),
        total: matches.length, totalPages, page, facets,
      })
    },
  }
}
