import type { ApiClient } from '@/api/httpClient'
import { createMyRcpcApi } from '@/api/myRcpc'
import { createOperationRequestsApi } from '@/api/operationRequests'

// Organization-scoped HTTP services; each mutation/reveal is authorized by the API.
export type MyRcpcReadServices = ReturnType<typeof createMyRcpcApi>
export type InquiryReadServices = ReturnType<typeof createOperationRequestsApi>
export function createHttpMyRcpcServices(client: ApiClient, organizationId: string): MyRcpcReadServices {
  return createMyRcpcApi(client, organizationId)
}
export function createHttpInquiryServices(client: ApiClient, organizationId: string): InquiryReadServices {
  return createOperationRequestsApi(client, organizationId)
}
