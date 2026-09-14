import { z } from 'zod'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
export const rcpcMutationIdSchema = z.string().regex(/^[1-9]\d*$/)
  .refine((value) => Number.isSafeInteger(Number(value)), '식별자가 지원 범위를 초과합니다.')
const preferenceInput = z.object({ alias: z.string().max(20).nullable(), favorite: z.boolean() }).strict()
export const savedRcpcPreferenceSchema = z.object({
  alias: z.string().optional(), favorite: z.boolean(), groupId: id.optional(), groupName: z.string().optional(),
  parentGroupId: id.optional(), parentGroupName: z.string().optional(),
})
export interface SavedRcpcGroup { id: number; parentGroupId: number | null; groupLevel: number; name: string; displayOrder: number; rcpcCount: number; children: SavedRcpcGroup[] }
export const savedRcpcGroupSchema: z.ZodType<SavedRcpcGroup> = z.lazy(() => z.object({
  id, parentGroupId: id.nullable(), groupLevel: z.number().int(), name: z.string(),
  displayOrder: z.number().int().nonnegative(), rcpcCount: z.number().int().nonnegative().safe(), children: z.array(savedRcpcGroupSchema),
}))
const groupCreate = z.object({ name: z.string().trim().min(1).max(30), parentGroupId: id.nullable(), displayOrder: z.number().int().min(0).max(2147483647).optional() }).strict()
const groupUpdate = z.object({ name: z.string().trim().min(1).max(30), displayOrder: z.number().int().min(0).max(2147483647) }).strict()
const groupMove = z.object({ parentGroupId: id.nullable() }).strict()

// Bind this factory to the authenticated session's selected organization, not a form field.
export function createCustomerRcpcMutations(client: ApiClient, organizationId: string) {
  const customerOrganizationId = rcpcMutationIdSchema.parse(organizationId)
  const scoped = { authenticated: true, customerOrganizationId } as const
  return {
    organizationId: customerOrganizationId,
    favorite(rentalId: number, favorite: boolean, groupId: number | null = null) {
      return client.request(`/api/v1/my/rcpcs/${id.parse(rentalId)}/favorite`, savedRcpcPreferenceSchema,
        { ...scoped, method: 'PUT', body: z.object({ favorite: z.boolean(), groupId: id.nullable() }).parse({ favorite, groupId }) })
    },
    groups(signal?: AbortSignal) {
      return client.request('/api/v1/my/rcpc-groups', z.array(savedRcpcGroupSchema), { ...scoped, signal })
    },
    preference(rentalId: string, input: z.infer<typeof preferenceInput>) {
      return client.request(`/api/v1/my/rcpcs/${rcpcMutationIdSchema.parse(rentalId)}/preference`, savedRcpcPreferenceSchema,
        { ...scoped, method: 'PUT', body: preferenceInput.parse(input) })
    },
    assignGroup(rentalId: string, groupId: string | null) {
      const path = `/api/v1/my/rcpcs/${rcpcMutationIdSchema.parse(rentalId)}/group`
      return groupId === null
        ? client.request(path, savedRcpcPreferenceSchema, { ...scoped, method: 'DELETE' })
        : client.request(path, savedRcpcPreferenceSchema, { ...scoped, method: 'PUT', body: { groupId: Number(rcpcMutationIdSchema.parse(groupId)) } })
    },
    createGroup(input: z.infer<typeof groupCreate>) {
      return client.request('/api/v1/my/rcpc-groups', savedRcpcGroupSchema, { ...scoped, method: 'POST', body: groupCreate.parse(input) })
    },
    updateGroup(groupId: number, input: z.infer<typeof groupUpdate>) {
      return client.request(`/api/v1/my/rcpc-groups/${id.parse(groupId)}`, savedRcpcGroupSchema,
        { ...scoped, method: 'PUT', body: groupUpdate.parse(input) })
    },
    moveGroup(groupId: number, parentGroupId: number | null) {
      return client.request(`/api/v1/my/rcpc-groups/${id.parse(groupId)}/parent`, savedRcpcGroupSchema,
        { ...scoped, method: 'PUT', body: groupMove.parse({ parentGroupId }) })
    },
    deleteGroup(groupId: number) {
      return client.request(`/api/v1/my/rcpc-groups/${id.parse(groupId)}`, z.undefined(), { ...scoped, method: 'DELETE' })
    },
  }
}
