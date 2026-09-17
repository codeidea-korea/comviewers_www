import { z } from 'zod'

export const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  size: z.string().default(''),
  type: z.string().default(''),
  href: z.string().optional(),
  file: z.custom<File>((value) => typeof File !== 'undefined' && value instanceof File).optional(),
})
export const commentSchema = z.object({ id: z.string(), author: z.string(), authorProfileImageUrl: z.string().nullable().optional(), date: z.string(), content: z.string(), edited: z.boolean().optional(), avatar: z.string().optional(), isMine: z.boolean().default(false) })
export const postSchema = z.object({ boardName: z.string().optional(), id: z.string(), postId: z.string(), number: z.number(), title: z.string(), author: z.string(), authorProfileImageUrl: z.string().nullable().optional(), date: z.string(), dateTime: z.string().optional(), views: z.number(), comments: z.number(), isMine: z.boolean().default(false), image: z.string().optional(), attachments: z.array(attachmentSchema).default([]), content: z.array(z.string()).default([]), richContent: z.unknown().optional().nullable() })
export const articleSchema = z.object({ id: z.string(), articleId: z.string(), number: z.union([z.string(), z.number()]), title: z.string(), date: z.string(), dateTime: z.string().optional(), pinned: z.boolean().default(false), content: z.array(z.string()).default([]), richContent: z.unknown().optional().nullable(), attachments: z.array(attachmentSchema).default([]) })
export const reviewSchema = z.object({ id: z.string(), reviewId: z.string(), productId: z.string(), productName: z.string(), center: z.string(), rating: z.number().int().min(1).max(5), author: z.string(), date: z.string(), content: z.string(), isMine: z.boolean().default(false) })
export const draftSchema = z.object({ title: z.string().trim().min(2, '제목은 2자 이상 입력해 주세요.').max(100, '제목은 100자 이하로 입력해 주세요.'), content: z.array(z.string()).min(1, '내용을 입력해 주세요.'), richContent: z.unknown().optional().nullable(), attachments: z.array(attachmentSchema).max(3) })
export type Post = z.infer<typeof postSchema>
export type Article = z.infer<typeof articleSchema>
export type RentalReview = z.infer<typeof reviewSchema>
export type Comment = z.infer<typeof commentSchema>
export type PostDraft = z.infer<typeof draftSchema>
export interface StorefrontPopup {
  id: number
  title: string
  content: string | null
  imageUrl: string | null
  linkUrl: string | null
  displayPosition: 'left' | 'center' | 'right'
  targets: { targetType: string; targetId: number }[]
}
export interface StorefrontServices {
  listActivePopups(signal?: AbortSignal): Promise<StorefrontPopup[]>
  listPosts(input?: { keyword?: string; mineOnly?: boolean; sort?: string }): Promise<Post[]>
  getPost(id: string): Promise<Post | null>
  savePost(draft: PostDraft, id?: string): Promise<Post>
  removePost(id: string): Promise<void>
  listComments(postId: string): Promise<Comment[]>
  saveComment(postId: string, content: string, id?: string): Promise<void>
  removeComment(postId: string, id: string): Promise<void>
  listArticles(input?: { keyword?: string; sort?: string }): Promise<Article[]>
  getArticle(id: string): Promise<Article | null>
  listReviews(): Promise<RentalReview[]>
}
