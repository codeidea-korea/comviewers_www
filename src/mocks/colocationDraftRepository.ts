import { colocationDraftInputSchema, type ColocationDraft, type ColocationDraftRepository } from '@/domain/colocation/draftRepository'

// File blobs remain in the session-scoped service instance; nothing is uploaded.
export function createMockColocationDraftRepository(): ColocationDraftRepository {
  let draft: ColocationDraft | null = null
  const copy = (value: ColocationDraft): ColocationDraft => ({ ...value, fields: { ...value.fields }, files: [...value.files] })
  return {
    async get(signal) { signal?.throwIfAborted(); return draft ? copy(draft) : null },
    async save(input) {
      const parsed = colocationDraftInputSchema.parse(input)
      draft = { ...parsed, savedAt: new Date().toISOString() }
      return copy(draft)
    },
  }
}
