import { z } from 'zod'

export const colocationDraftFieldsSchema = z.object({
  businessName: z.string().max(200), businessNumber: z.string().max(30), representative: z.string().max(100),
  managerName: z.string().max(100), position: z.string().max(100), emailId: z.string().max(100), emailDomain: z.string().max(200),
  phonePrefix: z.string().max(10), phoneMiddle: z.string().max(10), phoneLast: z.string().max(10),
  serverRoomName: z.string().max(200), messenger: z.string().max(100), messengerId: z.string().max(200),
})
export const cleanColocationEvidenceFileSchema = z.object({
  fileType: z.enum(['business_license', 'bankbook']),
  fileName: z.string().min(1).max(255),
  storageKey: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/),
  mimeType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  sha256Hash: z.string().regex(/^[a-fA-F0-9]{64}$/),
})
export const colocationDraftInputSchema = z.object({
  fields: colocationDraftFieldsSchema,
  files: z.array(z.instanceof(File).refine((file) => /\.(jpe?g|png|pdf)$/i.test(file.name) && file.size <= 10 * 1024 * 1024, '첨부파일 형식과 크기를 확인해 주세요.')).min(2, '필수 증빙서류를 선택해 주세요.').max(5),
  termsPolicyVersionId: z.number().int().positive().optional(),
  cleanEvidenceFiles: z.array(cleanColocationEvidenceFileSchema).optional(),
  fileTypes: z.array(z.enum(['business_license', 'bankbook', 'other'])).max(5).optional(),
  accepted: z.boolean().optional(),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/).optional(),
})
export type ColocationDraftInput = z.infer<typeof colocationDraftInputSchema>
export const colocationDraftSchema = colocationDraftInputSchema.extend({ savedAt: z.iso.datetime(), applicationId: z.number().int().positive().optional() })
export type ColocationDraft = z.infer<typeof colocationDraftSchema>
export interface ColocationDraftRepository {
  readonly mode?: 'draft' | 'live'
  get(signal?: AbortSignal): Promise<ColocationDraft | null>
  save(input: ColocationDraftInput): Promise<ColocationDraft>
  terms?(signal?: AbortSignal): Promise<{ id: number; title: string; version: string; effectiveDate: string; content: string } | null>
}


