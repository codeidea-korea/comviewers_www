import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { articleSchema, commentSchema, postSchema, reviewSchema, type PostDraft, type StorefrontPageInput } from '@/domain/storefront/services'
import { productSchema } from '@/domain/products/schemas'
import { usePublicCatalogQueryClient } from '@/app/PublicCatalogQueryProvider'

export function useReviewProduct(productId: string | undefined) {
  const { products } = useServices()
  const publicCatalogClient = usePublicCatalogQueryClient()
  return useQuery({ queryKey: ['products', 'detail', productId], queryFn: async () => productSchema.nullable().parse(await products.get(productId ?? '')), enabled: productId !== undefined }, publicCatalogClient)
}

export function usePostPage(input: StorefrontPageInput & { keyword?: string; mineOnly?: boolean; sort?: string }, client?: QueryClient) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'post-page', input], queryFn: async () => {
    const result = await storefront.listPostPage(input)
    return { ...result, items: postSchema.array().parse(result.items) }
  } }, client)
}
export function usePost(id: string | undefined) {
  const { storefront } = useServices()
  const client = useQueryClient()
  return useQuery({
    queryKey: ['storefront', 'posts', id],
    queryFn: async () => {
      const post = postSchema.nullable().parse(await storefront.getPost(id ?? ''))
      await client.invalidateQueries({ queryKey: ['storefront', 'post-page'], refetchType: 'none' })
      return post
    },
    enabled: Boolean(id),
    staleTime: 0,
  })
}
export function useArticlePage(input: StorefrontPageInput & { keyword?: string; sort?: string }, client?: QueryClient) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'article-page', input], queryFn: async () => {
    const result = await storefront.listArticlePage(input)
    return { ...result, items: articleSchema.array().parse(result.items) }
  } }, client)
}
export function useArticle(id: string | undefined) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'articles', id], queryFn: async () => articleSchema.nullable().parse(await storefront.getArticle(id ?? '')), enabled: Boolean(id) })
}
export function useReviewPage(input: StorefrontPageInput & { keyword?: string; mineOnly?: boolean; sort?: string }, client?: QueryClient) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'review-page', input], queryFn: async () => {
    const result = await storefront.listReviewPage(input)
    return { ...result, items: reviewSchema.array().parse(result.items) }
  } }, client)
}
export function useReview(id: string | null) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'review', id], queryFn: async () => reviewSchema.nullable().parse(await storefront.getReview(id ?? '')), enabled: Boolean(id) })
}
export function usePostActions() {
  const { storefront } = useServices()
  const client = useQueryClient()
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ['storefront', 'posts'] }),
    client.invalidateQueries({ queryKey: ['storefront', 'post-page'] }),
  ])
  const save = useMutation({ mutationFn: ({ draft, id, idempotencyKey }: { draft: PostDraft; id?: string; idempotencyKey?: string }) => storefront.savePost(draft, id, idempotencyKey), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (id: string) => storefront.removePost(id), onSuccess: invalidate })
  return { save, remove }
}
export function useComments(postId: string | undefined) {
  const { storefront } = useServices()
  const client = useQueryClient()
  const queryKey = ['storefront', 'comments', postId] as const
  const query = useQuery({ queryKey, queryFn: async () => commentSchema.array().parse(await storefront.listComments(postId ?? '')), enabled: Boolean(postId) })
  const refresh = async () => { await client.invalidateQueries({ queryKey }); await client.invalidateQueries({ queryKey: ['storefront', 'posts'] }); await client.invalidateQueries({ queryKey: ['storefront', 'post-page'] }) }
  const save = useMutation({ mutationFn: ({ content, id }: { content: string; id?: string }) => storefront.saveComment(postId ?? '', content, id), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: string) => storefront.removeComment(postId ?? '', id), onSuccess: refresh })
  return { ...query, save, remove }
}
