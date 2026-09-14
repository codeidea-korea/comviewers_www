import { z } from 'zod'
import { createApiClient } from './httpClient'
const idSchema = z.union([z.string(), z.number().int().positive().safe()]).transform(String)
  .refine(value => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n)
export const customerSessionSchema = z.object({
  customerOrganizationId: idSchema, customerMemberId: idSchema, memberRole: z.enum(['owner', 'c_manager']),
  myPageOnly: z.boolean(), customerNicknameVisible: z.boolean(), commerceAvailable: z.boolean(), cManagerManagementAvailable: z.boolean(),
  displayName: z.string().nullable().optional(),
}).refine(value => value.memberRole !== 'c_manager' || (value.myPageOnly && !value.commerceAvailable && !value.cManagerManagementAvailable && !value.customerNicknameVisible))
export type CustomerSession = Readonly<z.infer<typeof customerSessionSchema>>
export interface CustomerSessionRequest { accessToken: string; organizationId: string; signal: AbortSignal }
export function createCustomerSessionLoader(baseUrl: string) {
  return ({ accessToken, organizationId, signal }: CustomerSessionRequest): Promise<CustomerSession> =>
    createApiClient({ baseUrl, getAccessToken: () => accessToken }).request('/api/v1/my/session', customerSessionSchema,
      { authenticated: true, customerOrganizationId: organizationId, signal })
}
