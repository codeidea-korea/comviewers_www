import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MyRcpcItem } from '@/api/myRcpc'
import { inquirySummaryDeniedKey } from '@/lib/inquiryQueryCache'

/** Hide stale summaries in both query data and observer-only pagination placeholders. */
export function useRcpcInquiryItems(organizationId: string, items: readonly MyRcpcItem[] | undefined, dataUpdatedAt: number) {
  const { data: deniedAt } = useQuery({
    queryKey: inquirySummaryDeniedKey(organizationId),
    enabled: false,
    initialData: 0,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  return useMemo(() => deniedAt > 0 && dataUpdatedAt <= deniedAt
    ? items?.map(item => ({ ...item, latestInquiry: null }))
    : items, [items, dataUpdatedAt, deniedAt])
}
