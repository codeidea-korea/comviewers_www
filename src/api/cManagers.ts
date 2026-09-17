import { z } from 'zod'
import type { ApiClient } from './httpClient'
import { productNoResponseSchema } from './productNo'

const id = z.number().int().positive().safe()
const time = z.iso.datetime({ local: true }).nullable()
const rcpc = z.object({ rentalId: id, pcAssetId: id.nullable(), assetNo: productNoResponseSchema.nullable(), deviceAlias: z.string().nullable(),
  rentalStatus: z.string().nullable(), assetStatus: z.string().nullable(), deviceRentalStatus: z.string().nullable(), lastHeartbeatAt: time, assignedAt: time,
  serviceStartedAt: time, serviceEndsAt: time })
const summary = z.object({ memberId: id, userId: id, username: z.string(), name: z.string().nullable(), managementMemo: z.string().nullable(),
  status: z.string(), permissionGroupId: id.nullable(), permissionGroupName: z.string().nullable(), permissionGroupAssignedByMemberId: id.nullable(),
  permissionGroupAssignedByName: z.string().nullable(), permissionGroupAssignedAt: time, assignedRcpcCount: z.number().int().nonnegative(),
  assignedOnlineDeviceCount: z.number().int().nonnegative(), createdAt: time })
const detail = summary.extend({ rcpcs: rcpc.array() })
const name = z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,10}$/)
const username = z.string().trim().regex(/^[A-Za-z0-9_]{5,16}$/)
const password = z.string().regex(/^[A-Za-z0-9!@#$%]{8,16}$/)
const memo = z.string().max(500)
export const cManagerFeatureCodes = ['rcpc', 'rcpc.preference', 'rcpc.group', 'rcpc.remote_access', 'operation_request'] as const
const permissionRule = z.object({ featureCode: z.enum(cManagerFeatureCodes), canRead: z.boolean(), canCreate: z.boolean(), canUpdate: z.boolean(), canDelete: z.boolean() })
const permissionGroupFields = { id, name, description: z.string().nullable(), createdByMemberId: id.nullable(), createdByName: z.string().nullable(), updatedByMemberId: id.nullable(), updatedByName: z.string().nullable(), createdAt: time, updatedAt: time }
const permissionGroupSummary = z.object({ ...permissionGroupFields, assignedMemberCount: z.number().int().nonnegative().safe() })
const permissionGroup = z.object({ ...permissionGroupFields, customerOrganizationId: id, rules: permissionRule.array() })
const permissionGroupInput = z.object({ name, description: memo.nullable(), rules: permissionRule.array().max(5).refine(rules => new Set(rules.map(rule => rule.featureCode)).size === rules.length) })
export type CManagerPermissionRuleDto = z.infer<typeof permissionRule>
export type CManagerPermissionGroupDto = z.infer<typeof permissionGroup>
export type CManagerPermissionGroupInput = z.infer<typeof permissionGroupInput>

export type CManagerRcpcDto = z.infer<typeof rcpc>
export type CManagerSummaryDto = z.infer<typeof summary>
export type CManagerDetailDto = z.infer<typeof detail>

export function createCManagersApi(client: ApiClient, organizationId: string) {
  const context = { authenticated: true, customerOrganizationId: organizationId } as const
  const path = (memberId: number) => `/api/v1/my/c-managers/${id.parse(memberId)}`
  return {
    organizationId,
    list: (signal?: AbortSignal) => client.request('/api/v1/my/c-managers', summary.array(), { ...context, signal }),
    detail: (memberId: number, signal?: AbortSignal) => client.request(path(memberId), detail, { ...context, signal }),
    rcpcs: (signal?: AbortSignal) => client.request('/api/v1/my/c-managers/rcpcs', rcpc.array(), { ...context, signal }),
    managerRcpcs: (memberId: number, signal?: AbortSignal) => client.request(`${path(memberId)}/rcpcs`, rcpc.array(), { ...context, signal }),
    availability: (value: string, signal?: AbortSignal) => client.request('/api/v1/my/c-managers/username-availability', z.object({ available: z.boolean() }), { ...context, query: { username: username.parse(value) }, signal }),
    create: (input: { name: string; username: string; password: string; managementMemo: string }) => client.request('/api/v1/my/c-managers', id, { ...context, method: 'POST', body: z.object({ name, username, password, managementMemo: memo }).parse(input) }),
    update: (memberId: number, input: { name: string; password?: string | null; managementMemo: string }) => client.request(path(memberId), z.undefined(), { ...context, method: 'PUT', body: z.object({ name, password: password.nullish(), managementMemo: memo }).parse(input) }),
    changePassword: (memberId: number, nextPassword: string) => client.request(`${path(memberId)}/password`, z.undefined(), { ...context, method: 'PATCH', body: { password: password.parse(nextPassword) } }),
    deactivate: (memberId: number) => client.request(`${path(memberId)}/deactivation`, z.undefined(), { ...context, method: 'PATCH' }),
    assignments: (memberId: number, rentalIds: number[]) => client.request(`${path(memberId)}/rcpcs`, z.undefined(), { ...context, method: 'PUT', body: { rentalIds: z.array(id).parse(rentalIds) } }),
    assignRcpcs: (rentalIds: readonly number[], memberId: number | null) => client.request('/api/v1/my/c-managers/rcpc-assignments', z.undefined(),
      { ...context, method: 'PUT', body: z.object({ rentalIds: z.array(id).min(1).max(100).refine(ids => new Set(ids).size === ids.length), memberId: id.nullable() }).parse({ rentalIds, memberId }) }),
    permissionGroups: (signal?: AbortSignal) => client.request('/api/v1/my/c-managers/permission-groups', permissionGroupSummary.array(), { ...context, signal }),
    permissionGroup: (groupId: number, signal?: AbortSignal) => client.request(`/api/v1/my/c-managers/permission-groups/${id.parse(groupId)}`, permissionGroup, { ...context, signal }),
    createPermissionGroup: (input: CManagerPermissionGroupInput) => client.request('/api/v1/my/c-managers/permission-groups', permissionGroup, { ...context, method: 'POST', body: permissionGroupInput.parse(input) }),
    updatePermissionGroup: (groupId: number, input: CManagerPermissionGroupInput) => client.request(`/api/v1/my/c-managers/permission-groups/${id.parse(groupId)}`, permissionGroup, { ...context, method: 'PUT', body: permissionGroupInput.parse(input) }),
    assignPermissionGroup: (memberId: number, permissionGroupId: number | null) => client.request(`${path(memberId)}/permission-group`, detail, { ...context, method: 'PUT', body: { permissionGroupId: id.nullable().parse(permissionGroupId) } }),
  }
}
export type CManagersApi = ReturnType<typeof createCManagersApi>
