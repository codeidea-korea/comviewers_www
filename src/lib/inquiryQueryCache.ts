import { type QueryClient, type QueryKey } from '@tanstack/react-query'
import { ApiClientError } from '@/api/httpClient'

export const inquirySummaryDeniedKey = (organizationId: string) => ['rcpc-inquiry-denied-at', organizationId] as const

/** Both RCPC tables and the independent mypage favorites table carry inquiry summaries. */
export async function invalidateInquiryQueries(client: QueryClient, organizationId: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['operation-requests', organizationId] }),
    client.invalidateQueries({ queryKey: ['my-rcpcs', organizationId] }),
    client.invalidateQueries({ queryKey: ['my-account', 'read', 'home-favorites'] }),
    client.invalidateQueries({ queryKey: ['my-account', 'read', 'home-inquiries'] }),
  ])
}

function isRcpcSummaryKey(key: QueryKey, organizationId: string) {
  return key[0] === 'my-rcpcs' && key[1] === organizationId
    || key[0] === 'my-account' && key[1] === 'read' && key[2] === 'home-favorites'
}

function withoutInquirySummaries(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(withoutInquirySummaries)
  if (data === null || typeof data !== 'object') return data
  if ('latestInquiry' in data) return { ...data, latestInquiry: null }
  if ('items' in data && Array.isArray(data.items)) return { ...data, items: data.items.map(withoutInquirySummaries) }
  return data
}

/** RCPC visibility alone must not retain an inquiry summary after inquiry access is rejected. */
export function clearDeniedInquirySummaries(client: QueryClient, error: unknown, key: QueryKey, organizationId: string | null) {
  if (!organizationId || !(error instanceof ApiClientError) || ![401, 403].includes(error.status ?? 0)) return
  const inquiryRead = key[0] === 'operation-requests' && key[1] === organizationId
    || key[0] === 'my-account' && key[1] === 'read' && key[2] === 'home-inquiries'
  if (!inquiryRead && !isRcpcSummaryKey(key, organizationId)) return
  // Observers can retain placeholder rows outside query.state.data. Notify their render
  // guards too; only data fetched after this denial may expose inquiry summaries again.
  client.setQueryData(inquirySummaryDeniedKey(organizationId), Date.now())
  const filters = { predicate: (query: { queryKey: QueryKey }) => isRcpcSummaryKey(query.queryKey, organizationId) }
  // Cancellation reverts in-flight queries before the immutable scrub. The render guard
  // separately hides observer-held placeholder copies, which are not stored in these states.
  void client.cancelQueries(filters)
  client.getQueryCache().findAll(filters).forEach(query => {
    // Preserve a failed RCPC read's error state; setQueryData would mark it successful.
    query.setState({ data: withoutInquirySummaries(query.state.data) })
  })
}
