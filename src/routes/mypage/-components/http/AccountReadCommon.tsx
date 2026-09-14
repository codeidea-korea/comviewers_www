import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/PaginationControl'
export const accountMoney = (value: number | null) => value === null ? '-' : `${value.toLocaleString('ko-KR')}원`
export const accountDate = (value: string | null) => value?.replace('T', ' ') ?? '-'
const statuses: Record<string, string> = { created: '주문 생성', payment_pending: '결제 대기', pending: '결제 대기', approved: '결제 완료', failed: '결제 실패', waiting_for_deposit: '입금 대기', active: '이용 중', paid: '결제 완료', completed: '완료', cancelled: '취소', refunded: '환불', available: '사용 가능', used: '사용', expired: '만료', reserved: '예약', revoked: '회수', stored: '보관 중', moved_to_cart: '장바구니 이동', ordered: '주문 완료' }
export const accountStatus = (value: string) => statuses[value] ?? value
export function useAccountRead<T>(key: readonly (string | number)[], read: (signal: AbortSignal) => Promise<T>) {
  return useQuery({ queryKey: ['my-account', 'http', ...key], queryFn: ({ signal }) => read(signal), retry: false })
}
export function ReadPages({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (value: number) => void }) {
  return totalPages > 1 ? <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(next) => onChange(next - 1)} /> : null
}
export function AccountInfo({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '-'}</dd></div>)}</dl>
}
