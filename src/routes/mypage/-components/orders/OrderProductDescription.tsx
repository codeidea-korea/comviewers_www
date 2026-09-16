import type { AccountOrderItem } from '@/api/myAccountOrders'

export function OrderProductDescription({ item }: { item: AccountOrderItem }) {
  return item.billingUnit === 'unit'
    ? <p className="order-catalog-item__spec">주문 당시 상품 설명: {item.specSummary ?? '기록 없음'}</p>
    : <p className="order-catalog-item__spec">{item.specSummary ?? '주문 당시 사양 기록 없음'}</p>
}
