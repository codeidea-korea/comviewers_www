import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { usePublicCatalogQueryClient } from '@/app/PublicCatalogQueryProvider'
import { productPageSchema } from '@/domain/products/schemas'
import { useArticlePage, usePostPage, useReviewPage } from '@/routes/community/-components/hooks/useContent'

export function useHomeContent(recommendedUseOptionId: number | null) {
  const { products } = useServices()
  const publicCatalogClient = usePublicCatalogQueryClient()
  const query = { page: 1, pageSize: 8, instantOnly: false, rooms: [], line: '전체', ip: '전체', purpose: '전체', details: {}, filterOptionIds: recommendedUseOptionId ? [recommendedUseOptionId] : [] }
  const recommended = useQuery({ queryKey: ['products', 'home', query], queryFn: async () => productPageSchema.parse(await products.list(query)) }, publicCatalogClient)
  const recommendedUseMetadata = useQuery({
    queryKey: ['product-filter-metadata', 'rcpc'],
    enabled: Boolean(products.filterMetadata),
    queryFn: () => products.filterMetadata!('rcpc'),
  }, publicCatalogClient)
  const posts = usePostPage({ page: 1, size: 4, sort: 'latest', anonymous: true }, publicCatalogClient)
  const articles = useArticlePage({ page: 1, size: 1, sort: 'latest', anonymous: true }, publicCatalogClient)
  const usageGuides = useArticlePage({ page: 1, size: 1, keyword: '이용안내', sort: 'latest', anonymous: true }, publicCatalogClient)
  const reviews = useReviewPage({ page: 1, size: 4, sort: 'latest', anonymous: true }, publicCatalogClient)
  return { recommended, recommendedUseMetadata, posts, articles, usageGuides, reviews }
}
