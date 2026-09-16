export const accountMoney = (value: number | null) => value === null ? '-' : `${value.toLocaleString('ko-KR')}원`
export const accountDate = (value: string | null) => value?.replace('T', ' ') ?? '-'

const statuses: Record<string, string> = { created: '주문 생성', payment_pending: '결제 대기', pending: '결제 대기', approved: '결제 완료', failed: '결제 실패', waiting_for_deposit: '입금 대기', active: '이용 중', paid: '결제 완료', completed: '완료', cancelled: '취소', refunded: '환불', available: '사용 가능', used: '사용', expired: '만료', reserved: '예약', revoked: '회수', stored: '보관 중', moved_to_cart: '장바구니 이동', ordered: '주문 완료' }
export const accountStatus = (value: string) => statuses[value] ?? value
