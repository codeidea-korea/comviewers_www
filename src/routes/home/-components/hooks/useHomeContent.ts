import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { productPageSchema } from '@/domain/products/schemas'
import { useArticles, usePosts, useReviews } from '@/routes/community/-components/hooks/useContent'

export function useHomeContent(recommendedUseOptionId: number | null) {
  const { products } = useServices()
  const query = { page: 1, pageSize: 8, instantOnly: false, rooms: [], line: '전체', ip: '전체', purpose: '전체', details: {}, filterOptionIds: recommendedUseOptionId ? [recommendedUseOptionId] : [] }
  const recommended = useQuery({ queryKey: ['products', 'home', query], queryFn: async () => productPageSchema.parse(await products.list(query)) })
  const recommendedUseMetadata = useQuery({
    queryKey: ['product-filter-metadata', 'home', 'rcpc'],
    enabled: Boolean(products.filterMetadata),
    queryFn: ({ signal }) => products.filterMetadata!('rcpc', signal),
  })
  const posts = usePosts()
  const articles = useArticles()
  const usageGuides = useArticles({ keyword: '이용안내', sort: 'latest' })
  const reviews = useReviews()
  return { recommended, recommendedUseMetadata, posts, articles, usageGuides, reviews }
}
