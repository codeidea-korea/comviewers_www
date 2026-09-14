import { z } from 'zod'

export const legalKinds = ['terms', 'rental', 'privacy', 'refund', 'point'] as const
export type LegalKind = typeof legalKinds[number]
export const legalDocumentSchema = z.object({
  id: z.string().min(1), kind: z.enum(legalKinds), title: z.string().min(1),
  version: z.string().min(1), effectiveDate: z.iso.date(), paragraphs: z.array(z.string().min(1)).min(1),
  richContent: z.unknown().optional().nullable(),
})
export type LegalDocument = z.infer<typeof legalDocumentSchema>
/** Publicly readable published versions only; exclude drafts from this projection. */
export interface LegalRepository { list(kind: LegalKind, signal?: AbortSignal): Promise<LegalDocument[]> }
