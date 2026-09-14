import { z } from 'zod'
import { createCustomerRcpcMutations, rcpcMutationIdSchema } from '@/api/customerRcpcMutations'
import type { ApiClient } from '@/api/httpClient'
import type { MyAccountServices } from './services'

interface PreferenceMutationContext {
  organizationId: string
  // Must map a current HTTP snapshot row to rental PK, never asset/display number.
  resolveRentalId: (rowId: string) => Promise<string>
  assertActiveScope: () => void
  invalidateAccount: () => Promise<void>
}

export function createHttpPreferenceMutations(client: ApiClient, context: PreferenceMutationContext):
  Pick<MyAccountServices, 'addFavoriteGroup' | 'moveFavorites'> & {
    savePreference(rowId: string, input: { alias: string | null; favorite: boolean }): Promise<void>
  } {
  const api = createCustomerRcpcMutations(client, context.organizationId)
  async function write(action: () => Promise<unknown>): Promise<void> {
    context.assertActiveScope()
    try { await action() }
    finally { await context.invalidateAccount() }
  }
  return {
    addFavoriteGroup(label, parentId) {
      // The mock sentinel is not a group PK or a valid parent group.
      const parentGroupId = parentId === null ? null : Number(rcpcMutationIdSchema.parse(parentId))
      return write(() => api.createGroup({ name: label, parentGroupId }))
    },
    async moveFavorites(rowIds, groupId) {
      const selected = z.array(z.string().min(1)).min(1).max(100).parse(rowIds)
      const target = groupId === 'unclassified' ? null : rcpcMutationIdSchema.parse(groupId)
      context.assertActiveScope()
      // Resolve every reference before issuing the first write.
      const rentalIds = [...new Set(await Promise.all(selected.map(async (rowId) => rcpcMutationIdSchema.parse(await context.resolveRentalId(rowId)))))]
      await write(async () => {
        for (const rentalId of rentalIds) {
          context.assertActiveScope()
          await api.assignGroup(rentalId, target)
        }
      })
      // Failure after one assignment propagates; finally refetches partial state.
    },
    async savePreference(rowId, input) {
      context.assertActiveScope()
      const rentalId = rcpcMutationIdSchema.parse(await context.resolveRentalId(rowId))
      await write(() => api.preference(rentalId, input))
    },
  }
}
