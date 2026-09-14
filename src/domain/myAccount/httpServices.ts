import type { ApiClient } from '@/api/httpClient'
import { createMyAccountApi } from '@/api/myAccount'
// Read projections preserve server pagination, nullable fields, KST wall times and string IDs.
export type MyAccountReadServices = ReturnType<typeof createMyAccountApi>
export function createHttpMyAccountServices(client: ApiClient, organizationId: string | null = null): MyAccountReadServices {
  return createMyAccountApi(client, organizationId)
}
