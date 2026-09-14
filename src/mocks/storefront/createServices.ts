import { z } from 'zod'
import { mockCommunityPosts, mockCommunityComments, mockSupportArticles, mockRentalReviews } from '../communityCompany'
import { articleSchema, commentSchema, draftSchema, postSchema, reviewSchema, type Comment, type StorefrontServices } from '@/domain/storefront/services'

// Session-only synthetic content. No network, browser persistence or authentication.
export function createStorefrontServices(): StorefrontServices {
  let posts = postSchema.array().parse(mockCommunityPosts)
  let comments: Readonly<Record<string, Comment[]>> = Object.fromEntries(posts.map((post) => [post.postId, commentSchema.array().parse(post.postId === 'COMM-1001' ? mockCommunityComments : [])]))
  posts = posts.map((post) => ({ ...post, comments: comments[post.postId]?.length ?? 0 }))
  const articles = articleSchema.array().parse(mockSupportArticles)
  const reviews = reviewSchema.array().parse(mockRentalReviews)
  function requirePost(id: string) {
    const post = posts.find((item) => item.postId === id)
    if (!post) throw new Error('게시글을 찾을 수 없습니다.')
    return post
  }
  function updateComments(postId: string, rows: Comment[]) {
    comments = { ...comments, [postId]: rows }
    posts = posts.map((post) => post.postId === postId ? { ...post, comments: rows.length } : post)
  }
  return {
    async listPosts() { return structuredClone(posts) },
    async getPost(id) { return structuredClone(posts.find((post) => post.postId === id) ?? null) },
    async savePost(input, id) {
      const draft = draftSchema.parse(input)
      const previous = id ? requirePost(id) : undefined
      if (previous && !previous.isMine) throw new Error('내 게시글만 수정할 수 있습니다.')
      const postId = id ?? `MOCK-${crypto.randomUUID()}`
      const post = postSchema.parse({ ...previous, ...draft, id: previous?.id ?? postId, postId, number: previous?.number ?? Math.max(0, ...posts.map((item) => item.number)) + 1, author: previous?.author ?? 'mock_user', isMine: true, date: previous?.date ?? new Date().toLocaleDateString('sv-SE').replaceAll('-', '.'), views: previous?.views ?? 0, comments: previous?.comments ?? 0 })
      posts = previous ? posts.map((item) => item.postId === postId ? post : item) : [post, ...posts]
      return structuredClone(post)
    },
    async removePost(id) {
      if (!requirePost(id).isMine) throw new Error('내 게시글만 삭제할 수 있습니다.')
      posts = posts.filter((item) => item.postId !== id)
      comments = Object.fromEntries(Object.entries(comments).filter(([key]) => key !== id))
    },
    async listComments(id) { requirePost(id); return structuredClone(comments[id] ?? []) },
    async saveComment(postId, input, id) {
      requirePost(postId)
      const content = z.string().trim().min(1).parse(input)
      const rows = comments[postId] ?? []
      const previous = id ? rows.find((row) => row.id === id) : undefined
      if (id && !previous?.isMine) throw new Error('내 댓글만 수정할 수 있습니다.')
      updateComments(postId, previous ? rows.map((row) => row.id === id ? { ...row, content, edited: true } : row) : [...rows, { id: crypto.randomUUID(), author: 'mock_user', content, date: '방금 전', isMine: true }])
    },
    async removeComment(postId, id) {
      requirePost(postId)
      const rows = comments[postId] ?? []
      if (!rows.find((row) => row.id === id)?.isMine) throw new Error('내 댓글만 삭제할 수 있습니다.')
      updateComments(postId, rows.filter((row) => row.id !== id))
    },
    async listArticles() { return structuredClone(articles) },
    async getArticle(id) { return structuredClone(articles.find((article) => article.articleId === id) ?? null) },
    async listReviews() { return structuredClone(reviews) },
  }
}
