import { useUiTranslation } from '@/i18n/uiTranslation'
import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/PaginationControl'
export { accountDate, accountMoney, accountStatus } from '@/lib/accountFormat'
type AccountReadOptions = {
  refreshOnReturn?: boolean
  retainPreviousList?: { scope: object; prefix: readonly (string | number)[] }
}
export function useAccountRead<T>(key: readonly (string | number)[], read: (signal: AbortSignal) => Promise<T>, options: AccountReadOptions = {}) {
  const retention = options.retainPreviousList
  const [canRetain, setCanRetain] = useState(true)
  const result = useQuery({ queryKey: ['my-account', 'read', ...key], queryFn: ({ signal }) => read(signal), retry: false,
    meta: { accountReadScope: retention?.scope },
    placeholderData: (previous, previousQuery) => canRetain && retention
      && previousQuery?.state.status === 'success'
      && previousQuery.meta?.accountReadScope === retention.scope
      && previousQuery.queryKey.length === key.length + 2
      && retention.prefix.every((part, index) => previousQuery.queryKey[index + 2] === part)
      ? previous : undefined,
    ...(options.refreshOnReturn ? { staleTime: 0, refetchOnMount: 'always' as const, refetchOnWindowFocus: true } : {}) })
  // previousQuery may precede a failed/forbidden request that never returned data.
  if (result.isError && canRetain) setCanRetain(false)
  if (result.isSuccess && !result.isPlaceholderData && !canRetain) setCanRetain(true)
  return result
}
export function ReadPages({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (value: number) => void }) {
  return totalPages > 1 ? <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(next) => onChange(next - 1)} /> : null
}
export function AccountInfo({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  const { uiText } = useUiTranslation()
  return <dl>{rows.map(([label, value]) => <div key={label}><dt>{uiText(label)}</dt><dd>{value ?? '-'}</dd></div>)}</dl>
}
