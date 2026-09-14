import { z } from 'zod'
import type { ApiClient } from '@/api/httpClient'
import { legalDocumentSchema, type LegalKind, type LegalRepository } from './legalRepository'

const publicPolicyDocumentSchema = z.object({
  id: z.number().int().positive().safe(),
  kind: z.enum(['terms', 'rental', 'privacy', 'refund', 'point']),
  title: z.string().min(1),
  version: z.string().min(1),
  effectiveDate: z.iso.date(),
  content: z.string().min(1),
  contentFormat: z.string().optional(),
  richContent: z.unknown().optional().nullable(),
})
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
function richContent(value: unknown) { if (typeof value !== 'string') return value ?? null; try { return JSON.parse(value) } catch { return null } }
const paragraphs = (value: string) => htmlToText(value).split(/\r?\n/).filter((line) => line.trim())

export function createHttpLegalRepository(client: ApiClient): LegalRepository {
  return {
    async list(kind: LegalKind, signal?: AbortSignal) {
      const rows = await client.request('/api/v1/policies/public-documents', publicPolicyDocumentSchema.array(), {
        query: { kind }, signal,
      })
      return rows.map(row => legalDocumentSchema.parse({
        id: String(row.id), kind: row.kind, title: row.title, version: row.version,
        effectiveDate: row.effectiveDate, paragraphs: paragraphs(row.content), richContent: richContent(row.richContent),
      }))
    },
  }
}
