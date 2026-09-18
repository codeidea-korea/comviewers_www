import type { ApiClient } from '@/api/httpClient'
import { createCommunityApi, type CommunityDetailDto, type CommunityPostDto } from '@/api/community'
import { createProductReviewsApi, type ProductReviewResponse } from '@/api/productReviews'
import { createStorePopupsApi } from '@/api/storePopups'
import type { Article, Comment, Post, StorefrontServices } from './services'
import { contentDateTime } from './contentDateTime'
import { publicApiResourceUrl, toPublicAttachment } from './publicAttachment'

const date = (value: string) => value.slice(0, 10).replaceAll('-', '.')
const htmlToText = (value: string) => value
  .replace(/<\s*br\s*\/?\s*>/gi, '\n')
  .replace(/<\/p\s*>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
const paragraphs = (value: string) => htmlToText(value).split(/\r?\n/).filter((line) => line.trim())
function richContent(value: unknown) { if (typeof value !== 'string') return value ?? null; try { return JSON.parse(value) } catch { return null } }
const toPost = (row: CommunityPostDto | CommunityDetailDto, baseUrl: string): Post => ({ id: String(row.id), postId: String(row.id), number: row.id,
  boardName: row.boardName, title: row.title, author: row.author, authorProfileImageUrl: row.authorProfileImageUrl ?? null, date: date(row.createdAt), dateTime: contentDateTime(row.createdAt), views: row.viewCount,
  comments: 'comments' in row ? row.comments.filter((comment) => comment.status !== 'hidden').length : row.commentCount, isMine: row.mine,
  content: paragraphs(row.content), richContent: richContent(row.richContent), attachments: 'attachments' in row ? row.attachments.map((file) => toPublicAttachment(file, baseUrl)) : [] })
const toArticle = (row: CommunityPostDto | CommunityDetailDto, baseUrl: string): Article => ({
  id: String(row.id), articleId: String(row.id), number: row.pinned ? '공지' : row.id, title: row.title, date: date(row.createdAt), dateTime: contentDateTime(row.createdAt), pinned: row.pinned,
  attachmentCount: 'attachmentCount' in row ? row.attachmentCount : row.attachments.length,
  content: paragraphs(row.content), richContent: richContent(row.richContent), attachments: 'attachments' in row ? row.attachments.map((file) => toPublicAttachment(file, baseUrl)) : [],
})
const toComment = (row: CommunityDetailDto['comments'][number]): Comment => ({ id: String(row.id), author: row.author, authorProfileImageUrl: row.authorProfileImageUrl ?? null,
  date: date(row.createdAt), content: row.content, edited: row.updatedAt !== row.createdAt, isMine: row.mine })
const toReview = (row: ProductReviewResponse) => ({
  id: String(row.id), reviewId: String(row.id), productId: row.productNo, productName: row.productTitle,
  center: row.serverRoomName, rating: row.rating, author: row.author, date: date(row.reviewedAt),
  content: row.content, isMine: row.mine,
})
async function collect<T>(first: { totalPages: number; items: T[] }, next: (page: number) => Promise<{ totalPages: number; items: T[] }>) {
  if (first.totalPages <= 1) return first.items
  const pages = await Promise.all(Array.from({ length: first.totalPages - 1 }, (_, index) => next(index + 1)))
  return [...first.items, ...pages.flatMap((page) => page.items)]
}
export function createHttpStorefrontServices(client: ApiClient, authenticated: boolean, baseUrl = ''): StorefrontServices {
  const api = createCommunityApi(client, authenticated)
  const reviewApi = createProductReviewsApi(client)
  const popupApi = createStorePopupsApi(client)
  return {
    async listActivePopups(signal) {
      return (await popupApi.active(signal)).map((popup) => ({ ...popup, imageUrl: publicApiResourceUrl(popup.imageUrl, baseUrl) ?? null }))
    },
    async listPosts(input) { const first = await api.posts(0, input); return (await collect(first, (page) => api.posts(page, input))).map((row) => toPost(row, baseUrl)) },
    async getPost(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) return null; const row = await api.post(id); return row ? toPost(row, baseUrl) : null },
    async savePost(draft, value) {
      const attachmentIds = await Promise.all(draft.attachments.map(async (attachment) => {
        if (attachment.file) return (await api.uploadAttachment(attachment.file)).id
        const id = Number(attachment.id)
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error('첨부파일 정보를 확인할 수 없습니다.')
        return id
      }))
      const input = { title: draft.title, content: draft.content.join('\n'), richContent: draft.richContent ?? null, attachmentIds }
      return toPost(value ? await api.update(Number(value), input) : await api.create(input), baseUrl)
    },
    async removePost(value) { await api.remove(Number(value)) },
    async listComments(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) return []; return (await api.comments(id)).map(toComment) },
    async saveComment(postId, content, value) { if (value) await api.updateComment(Number(value), content); else await api.createComment(Number(postId), content) },
    async removeComment(_postId, value) { await api.removeComment(Number(value)) },
    async listArticles(input) { const first = await api.articles(0, input); return (await collect(first, (page) => api.articles(page, input))).map((row) => toArticle(row, baseUrl)) },
    async getArticle(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) return null; const row = await api.article(id); return row ? toArticle(row, baseUrl) : null },
    async listReviews() {
      const first = await reviewApi.listPublic(0, 100, authenticated)
      return (await collect(first, (page) => reviewApi.listPublic(page, 100, authenticated))).map(toReview)
    },
  }
}

