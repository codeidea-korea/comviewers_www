import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/PaginationControl'
export { accountDate, accountMoney, accountStatus } from '@/lib/accountFormat'
export function useAccountRead<T>(key: readonly (string | number)[], read: (signal: AbortSignal) => Promise<T>) {
  return useQuery({ queryKey: ['my-account', 'read', ...key], queryFn: ({ signal }) => read(signal), retry: false })
}
export function ReadPages({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (value: number) => void }) {
  return totalPages > 1 ? <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(next) => onChange(next - 1)} /> : null
}
export function AccountInfo({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '-'}</dd></div>)}</dl>
}
