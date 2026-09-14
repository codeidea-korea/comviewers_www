import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { productPageSchema } from '@/domain/products/schemas'
import { useArticles, usePosts, useReviews } from '@/routes/community/-components/hooks/useContent'

export function useHomeContent(category: string) {
  const { products } = useServices()
  const query = { page: 1, pageSize: 8, instantOnly: false, rooms: [], line: '전체', ip: '전체', purpose: category === '스트리밍' ? '방송·스트리밍용' : category, details: {} }
  const recommended = useQuery({ queryKey: ['products', 'home', query], queryFn: async () => productPageSchema.parse(await products.list(query)) })
  const posts = usePosts()
  const articles = useArticles()
  const usageGuides = useArticles({ keyword: '이용안내', sort: 'latest' })
  const reviews = useReviews()
  return { recommended, posts, articles, usageGuides, reviews }
}
