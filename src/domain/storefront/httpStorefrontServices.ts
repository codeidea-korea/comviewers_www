import type { ApiClient } from '@/api/httpClient'
import { createCommunityApi, type CommunityDetailDto, type CommunityPostDto } from '@/api/community'
import { createProductReviewsApi, type ProductReviewResponse } from '@/api/productReviews'
import { createStorePopupsApi } from '@/api/storePopups'
import type { Article, Comment, Post, StorefrontServices } from './services'
import { contentDateTime } from './contentDateTime'
import { publicApiResourceUrl, toPublicAttachment } from './publicAttachment'
import { isDefinitivePostRejection } from './postSaveRetry'

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
export function createHttpStorefrontServices(client: ApiClient, authenticated: boolean, baseUrl = ''): StorefrontServices {
  const api = createCommunityApi(client, authenticated)
  const publicApi = createCommunityApi(client, false)
  const reviewApi = createProductReviewsApi(client)
  const popupApi = createStorePopupsApi(client)
  type PreparedPost = { title: string; content: string; richContent: unknown; attachmentIds: number[] }
  let preparedPosts = new Map<string, Promise<PreparedPost>>()
  return {
    async listActivePopups(signal) {
      return (await popupApi.active(signal)).map((popup) => ({ ...popup, imageUrl: publicApiResourceUrl(popup.imageUrl, baseUrl) ?? null }))
    },
    async listPostPage(input) {
      const result = await (input.anonymous ? publicApi : api).posts(input.page - 1, { ...input, size: input.size })
      return { items: result.items.map((row) => toPost(row, baseUrl)), totalCount: result.totalCount, totalPages: result.totalPages }
    },
    async getPost(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) return null; const row = await api.post(id); return row ? toPost(row, baseUrl) : null },
    async savePost(draft, value, idempotencyKey) {
      if (!value && !idempotencyKey) throw new Error('게시글 저장 요청을 확인할 수 없습니다.')
      const body = { title: draft.title, content: draft.content.join('\n'), richContent: draft.richContent == null ? null : structuredClone(draft.richContent) }
      const prepare = async (): Promise<PreparedPost> => {
        const attachmentIds = await Promise.all(draft.attachments.map(async (attachment) => {
          if (attachment.file) return (await api.uploadAttachment(attachment.file)).id
          const id = Number(attachment.id)
          if (!Number.isSafeInteger(id) || id <= 0) throw new Error('첨부파일 정보를 확인할 수 없습니다.')
          return id
        }))
        return { ...body, attachmentIds }
      }
      let pending = idempotencyKey && !value ? preparedPosts.get(idempotencyKey) : undefined
      if (!pending) {
        pending = prepare()
        if (idempotencyKey && !value) preparedPosts = new Map([...preparedPosts, [idempotencyKey, pending]])
      }
      let input: PreparedPost
      try { input = await pending } catch (error) {
        if (idempotencyKey && !value) preparedPosts = new Map([...preparedPosts].filter(([key]) => key !== idempotencyKey))
        throw error
      }
      try {
        const saved = toPost(value ? await api.update(Number(value), input) : await api.create(input, idempotencyKey!), baseUrl)
        if (idempotencyKey && !value) preparedPosts = new Map([...preparedPosts].filter(([key]) => key !== idempotencyKey))
        return saved
      } catch (error) {
        if (idempotencyKey && !value && isDefinitivePostRejection(error)) {
          preparedPosts = new Map([...preparedPosts].filter(([key]) => key !== idempotencyKey))
        }
        throw error
      }
    },
    async removePost(value) { await api.remove(Number(value)) },
    async listComments(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) return []; return (await api.comments(id)).map(toComment) },
    async saveComment(postId, content, value) { if (value) await api.updateComment(Number(value), content); else await api.createComment(Number(postId), content) },
    async removeComment(_postId, value) { await api.removeComment(Number(value)) },
    async listArticlePage(input) {
      const result = await (input.anonymous ? publicApi : api).articles(input.page - 1, { ...input, size: input.size })
      return { items: result.items.map((row) => toArticle(row, baseUrl)), totalCount: result.totalCount, totalPages: result.totalPages }
    },
    async getArticle(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) return null; const row = await api.article(id); return row ? toArticle(row, baseUrl) : null },
    async listReviewPage(input) {
      const result = await reviewApi.listPublic(input.page - 1, input.size, !input.anonymous && authenticated, input)
      return { items: result.items.map(toReview), totalCount: result.totalCount, totalPages: result.totalPages }
    },
    async getReview(value) {
      const row = await reviewApi.detail(value, authenticated)
      return row ? toReview(row) : null
    },
  }
}

