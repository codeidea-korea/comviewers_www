import { createCustomerProfileMutations, type CustomerProfilePatch } from '@/api/customerProfileMutations'
import type { ApiClient } from '@/api/httpClient'

// Separate from saveProfileDraft: a draft can contain unverified email/image changes.
export function createHttpProfileMutations(client: ApiClient, context: {
  assertActiveSession: () => void; invalidateProfile: () => Promise<void>
}) {
  const api = createCustomerProfileMutations(client)
  return {
    async patchProfile(input: CustomerProfilePatch) {
      context.assertActiveSession()
      try { return await api.patch(input) }
      finally { await context.invalidateProfile() }
    },
  }
}
