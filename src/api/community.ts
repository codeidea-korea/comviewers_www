import { z } from 'zod'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const count = z.number().int().nonnegative().safe()
const time = z.iso.datetime({ local: true })
const attachment = z.object({
  id,
  fileName: z.string(),
  mimeType: z.string().optional(),
  contentType: z.string().optional(),
  fileSize: count.optional(),
  fileSizeBytes: count.nullable().optional(),
  downloadUrl: z.string().nullable().optional(),
  uploadStatus: z.string().optional(),
  linkStatus: z.string().optional(),
  malwareScanStatus: z.string().optional(),
})
const comment = z.object({ id, parentCommentId: id.nullable(), author: z.string(), authorProfileImageUrl: z.string().nullable().optional(), mine: z.boolean(), content: z.string(), status: z.string(), createdAt: time, updatedAt: time })
const post = z.object({ id, boardCode: z.string(), boardName: z.string(), author: z.string(), mine: z.boolean(), title: z.string(), content: z.string(),
  authorProfileImageUrl: z.string().nullable().optional(),
  contentFormat: z.string().optional(), richContent: z.unknown().optional().nullable(),
  notice: z.boolean(), pinned: z.boolean(), viewCount: count, status: z.string(), createdAt: time, updatedAt: time, commentCount: count, attachmentCount: count })
const detail = post.omit({ commentCount: true, attachmentCount: true }).extend({ moderationReason: z.string().nullable(), comments: comment.array(), attachments: attachment.array() })
const nullableDetail = detail.nullish().transform((value) => value ?? null)
const page = z.object({ items: post.array(), page: count, size: count.min(1).max(100), totalCount: count, totalPages: count })
const draft = z.object({
  title: z.string().trim().min(2).max(100),
  content: z.string().trim().min(10).max(10000),
  richContent: z.unknown().optional().nullable(),
  attachmentIds: z.array(id).max(3).optional(),
})

export function createCommunityApi(client: ApiClient, authenticated: boolean) {
  const auth = { authenticated } as const
  return {
    posts(pageNumber = 0, options: { keyword?: string; mineOnly?: boolean; sort?: string; size?: number; signal?: AbortSignal } = {}) { return client.request('/api/v1/community/posts', page, { ...auth, query: { page: pageNumber, size: options.size ?? 100, keyword: options.keyword || undefined, mineOnly: options.mineOnly, sort: options.sort }, signal: options.signal }) },
    post(postId: number, signal?: AbortSignal) { return client.request(`/api/v1/community/posts/${id.parse(postId)}`, nullableDetail, { ...auth, includeCredentials: true, signal }) },
    comments(postId: number, signal?: AbortSignal) { return client.request(`/api/v1/community/posts/${id.parse(postId)}/comments`, comment.array(), { ...auth, signal }) },
    uploadAttachment(file: File) {
      const form = new FormData()
      form.set('file', file)
      return client.request('/api/v1/community/attachments', attachment, { method: 'POST', body: form, authenticated: true })
    },
    create(input: z.input<typeof draft>, idempotencyKey: string) { return client.request('/api/v1/community/posts', detail, { method: 'POST', body: draft.parse(input), authenticated: true, idempotencyKey }) },
    update(postId: number, input: z.input<typeof draft>) { return client.request(`/api/v1/community/posts/${id.parse(postId)}`, detail, { method: 'PUT', body: draft.parse(input), authenticated: true }) },
    remove(postId: number) { return client.request(`/api/v1/community/posts/${id.parse(postId)}`, z.undefined(), { method: 'DELETE', authenticated: true }) },
    createComment(postId: number, content: string) { return client.request(`/api/v1/community/posts/${id.parse(postId)}/comments`, comment, { method: 'POST', body: { parentCommentId: null, content: z.string().trim().min(1).max(1000).parse(content) }, authenticated: true }) },
    updateComment(commentId: number, content: string) { return client.request(`/api/v1/community/comments/${id.parse(commentId)}`, comment, { method: 'PUT', body: { parentCommentId: null, content: z.string().trim().min(1).max(1000).parse(content) }, authenticated: true }) },
    removeComment(commentId: number) { return client.request(`/api/v1/community/comments/${id.parse(commentId)}`, z.undefined(), { method: 'DELETE', authenticated: true }) },
    articles(pageNumber = 0, options: { keyword?: string; sort?: string; size?: number; signal?: AbortSignal } = {}) { return client.request('/api/v1/support/articles', page, { ...auth, query: { page: pageNumber, size: options.size ?? 100, keyword: options.keyword || undefined, sort: options.sort }, signal: options.signal }) },
    article(articleId: number, signal?: AbortSignal) { return client.request(`/api/v1/support/articles/${id.parse(articleId)}`, nullableDetail, { ...auth, signal }) },
  }
}
export type CommunityPostDto = z.infer<typeof post>
export type CommunityDetailDto = z.infer<typeof detail>
