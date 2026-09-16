import type { ApiClient } from '@/api/httpClient'
import { createServerRoomApplicationApi } from '@/api/colocation'
import { colocationDraftInputSchema, type ColocationDraft, type ColocationDraftRepository } from './draftRepository'

export function createHttpColocationDraftRepository(client: ApiClient, authenticated: boolean): ColocationDraftRepository {
  const api = createServerRoomApplicationApi(client, authenticated)
  const copy = (value: ColocationDraft): ColocationDraft => ({ ...value, fields: { ...value.fields }, files: [...value.files], cleanEvidenceFiles: value.cleanEvidenceFiles ? [...value.cleanEvidenceFiles] : undefined })
  return {
    async get(signal) { signal?.throwIfAborted(); return null },
    terms: signal => api.terms(signal),
    async save(input) {
      const parsed = colocationDraftInputSchema.parse(input)
      const applicationId = await api.create(parsed)
      const draft = { ...parsed, applicationId, savedAt: new Date().toISOString() }
      return copy(draft)
    },
  }
}
