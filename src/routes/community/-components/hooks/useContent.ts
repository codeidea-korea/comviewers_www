import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { articleSchema, commentSchema, postSchema, reviewSchema, type PostDraft } from '@/domain/storefront/services'
import { productSchema } from '@/domain/products/schemas'

export function useReviewProduct(productId: string | undefined) {
  const { products } = useServices()
  return useQuery({ queryKey: ['products', 'detail', productId], queryFn: async () => productSchema.nullable().parse(await products.get(productId ?? '')), enabled: productId !== undefined })
}

export function usePosts(input?: { keyword?: string; mineOnly?: boolean; sort?: string }) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'posts', input], queryFn: async () => postSchema.array().parse(await storefront.listPosts(input)) })
}
export function usePost(id: string | undefined) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'posts', id], queryFn: async () => postSchema.nullable().parse(await storefront.getPost(id ?? '')), enabled: Boolean(id) })
}
export function useArticles(input?: { keyword?: string; sort?: string }) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'articles', input?.keyword ?? '', input?.sort ?? ''], queryFn: async () => articleSchema.array().parse(await storefront.listArticles(input)) })
}
export function useArticle(id: string | undefined) {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'articles', id], queryFn: async () => articleSchema.nullable().parse(await storefront.getArticle(id ?? '')), enabled: Boolean(id) })
}
export function useReviews() {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'reviews'], queryFn: async () => reviewSchema.array().parse(await storefront.listReviews()) })
}
export function usePostActions() {
  const { storefront } = useServices()
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: ['storefront', 'posts'] })
  const save = useMutation({ mutationFn: ({ draft, id }: { draft: PostDraft; id?: string }) => storefront.savePost(draft, id), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (id: string) => storefront.removePost(id), onSuccess: invalidate })
  return { save, remove }
}
export function useComments(postId: string | undefined) {
  const { storefront } = useServices()
  const client = useQueryClient()
  const queryKey = ['storefront', 'comments', postId] as const
  const query = useQuery({ queryKey, queryFn: async () => commentSchema.array().parse(await storefront.listComments(postId ?? '')), enabled: Boolean(postId) })
  const refresh = async () => { await client.invalidateQueries({ queryKey }); await client.invalidateQueries({ queryKey: ['storefront', 'posts'] }) }
  const save = useMutation({ mutationFn: ({ content, id }: { content: string; id?: string }) => storefront.saveComment(postId ?? '', content, id), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: string) => storefront.removeComment(postId ?? '', id), onSuccess: refresh })
  return { ...query, save, remove }
}
