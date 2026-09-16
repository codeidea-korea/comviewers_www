import { productQueryKeys } from '@/domain/products/productQueryKeys'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { UnsupportedProductFilterError } from '@/domain/products/httpProductRepository'
import { detailSelectionsSchema, productPageSchema, productQuerySchema } from '@/domain/products/schemas'
import type { DetailSelections, ProductListQuery } from '@/domain/products/types'

type Selectors = Pick<ProductListQuery, 'line' | 'ip' | 'purpose'>
type Update<T> = T | ((current: T) => T)
const resolve = <T,>(update: Update<T>, current: T): T => typeof update === 'function' ? (update as (value: T) => T)(current) : update

function readDetails(raw: string | null): DetailSelections {
  if (!raw || raw.length > 6000) return {}
  try {
    const result = detailSelectionsSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : {}
  } catch { return {} }
}

function readQuery(params: URLSearchParams, defaultInstantOnly = true): ProductListQuery {
  const candidate = {
    page: Number(params.get('page') ?? 1), pageSize: 12,
    categoryCode: params.get('categoryCode') ?? params.get('category') ?? undefined,
    instantOnly: params.has('instantOnly') ? params.get('instantOnly') !== 'false' : defaultInstantOnly, rooms: params.getAll('room'),
    line: params.get('line') ?? '전체', ip: params.get('ip') ?? '전체', purpose: params.get('purpose') ?? '전체',
    details: readDetails(params.get('details')),
    filterOptionIds: params.getAll('filterOptionId').map(Number),
    minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    priceBasis: params.get('priceBasis') || undefined,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    keyboardConnectionStatus: params.get('keyboard') || undefined,
    mouseConnectionStatus: params.get('mouse') || undefined,
    saleAvailableOnly: params.get('saleAvailableOnly') === 'true',
    sort: params.get('sort') ?? 'newest',
  }
  const result = productQuerySchema.safeParse(candidate)
  return result.success ? result.data : { page: 1, pageSize: 12, categoryCode: candidate.categoryCode, instantOnly: defaultInstantOnly, rooms: [], line: '전체', ip: '전체', purpose: '전체', details: {} }
}

export function useProductList() {
  const [params, setParams] = useSearchParams()
  const { products } = useServices()
  const defaultInstantOnly = products.filterMetadata ? false : products.capabilities?.instantOnly !== false
  const storedQuery = readQuery(params, defaultInstantOnly)
  const metadata = useQuery({ queryKey: ['product-filter-metadata', storedQuery.categoryCode], enabled: Boolean(products.filterMetadata), queryFn: ({ signal }) => products.filterMetadata!(storedQuery.categoryCode, signal) })
  const defaultPriceBasis = metadata.data?.priceBuckets.some(bucket => bucket.priceBasis === 'unit')
    && !metadata.data.priceBuckets.some(bucket => bucket.priceBasis === 'monthly') ? 'unit' : 'monthly'
  const query: ProductListQuery = { ...storedQuery, priceBasis: storedQuery.priceBasis ?? defaultPriceBasis }
  const result = useQuery({
    queryKey: productQueryKeys.list(query),
    queryFn: async ({ signal }) => productPageSchema.parse(await products.list(query, signal)),
  })
  const resolvedPage = result.data?.page
  useEffect(() => {
    if (resolvedPage === undefined || resolvedPage === query.page) return
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('page', String(resolvedPage))
      return next
    }, { replace: true })
  }, [resolvedPage, query.page, setParams])
  function updateQuery(changes: Partial<ProductListQuery>, resetPage = true) {
    setParams((previous) => {
      const nextQuery = { ...readQuery(previous, defaultInstantOnly), priceBasis: query.priceBasis, ...changes, ...(resetPage ? { page: 1 } : {}) }
      const next = new URLSearchParams(previous)
      next.set('page', String(nextQuery.page))
      next.set('instantOnly', String(nextQuery.instantOnly))
      next.delete('room')
      nextQuery.rooms.forEach((room) => next.append('room', room))
      for (const key of ['line', 'ip', 'purpose'] as const) {
        if (nextQuery[key] === '전체') next.delete(key)
        else next.set(key, nextQuery[key])
      }
      if (Object.values(nextQuery.details).some((values) => values && values.length > 0)) next.set('details', JSON.stringify(nextQuery.details))
      else next.delete('details')
      next.delete('filterOptionId')
      nextQuery.filterOptionIds?.forEach(id => next.append('filterOptionId', String(id)))
      for (const key of ['minPrice', 'maxPrice', 'priceBasis', 'sort', 'saleAvailableOnly'] as const) {
        if (nextQuery[key] === undefined || nextQuery[key] === false) next.delete(key)
        else next.set(key, String(nextQuery[key]))
      }
      if (nextQuery.keyboardConnectionStatus) next.set('keyboard', nextQuery.keyboardConnectionStatus)
      else next.delete('keyboard')
      if (nextQuery.mouseConnectionStatus) next.set('mouse', nextQuery.mouseConnectionStatus)
      else next.delete('mouse')
      return next
    })
  }
  const selectorSelections: Selectors = { line: query.line, ip: query.ip, purpose: query.purpose }
  return {
    filterMetadata: metadata.data,
    filterMetadataPending: metadata.isPending, filterMetadataError: metadata.isError, refetchFilterMetadata: metadata.refetch,
    catalogSelections: query,
    setCatalogSelections: (changes: Partial<ProductListQuery>) => updateQuery(changes),
    ...result, errorMessage: result.error instanceof UnsupportedProductFilterError ? result.error.message : '상품 목록을 불러오지 못했습니다.',
    visibleProducts: result.data?.items ?? [], resultTotal: result.data?.total ?? 0,
    totalPages: result.data?.totalPages ?? 0, currentPage: result.data?.page ?? query.page,
    facets: result.data?.facets ?? null, capabilities: products.capabilities, instantOnly: query.instantOnly,
    selectedRooms: new Set(query.rooms), detailSelections: query.details, selectorSelections,
    setCurrentPage: (page: number) => updateQuery({ page }, false),
    setInstantOnly: (instantOnly: boolean) => updateQuery({ instantOnly }),
    setSelectedRooms: (rooms: Set<string>) => updateQuery({ rooms: [...rooms] }),
    setDetailSelections: (update: Update<DetailSelections>) => updateQuery({ details: resolve(update, query.details) }),
    setSelectorSelections: (update: Update<Selectors>) => updateQuery(resolve(update, selectorSelections)),
    resetFilters: () => updateQuery({ instantOnly: defaultInstantOnly, rooms: [], line: '전체', ip: '전체', purpose: '전체', details: {}, filterOptionIds: [], priceBasis: undefined, minPrice: undefined, maxPrice: undefined, keyboardConnectionStatus: undefined, mouseConnectionStatus: undefined, saleAvailableOnly: false, sort: 'newest' }),
  }
}
