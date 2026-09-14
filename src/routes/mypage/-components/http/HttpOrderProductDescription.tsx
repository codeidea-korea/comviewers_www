import type { AccountOrderItem } from '@/api/myAccountOrders'

export function HttpOrderProductDescription({ item }: { item: AccountOrderItem }) {
  return item.billingUnit === 'unit'
    ? <p className="order-catalog-item__spec">주문 당시 상품 설명: {item.specSummary ?? '기록 없음'}</p>
    : <p className="order-catalog-item__spec">{item.instantAvailable ? '현재 바로 접속 가능' : '현재 접속 준비 상태 확인 필요'} · 주문 당시 사양: {item.specSummary ?? '기록 없음'}</p>
}
