import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import type { AccountOrderItem } from '@/api/myAccountOrders'

export function OrderProductDescription({ item }: { item: AccountOrderItem }) {
  useUiTranslation()
  return item.billingUnit === 'unit'
    ? <p className="order-catalog-item__spec">{uiText("주문 당시 상품 설명:")} {item.specSummary ?? uiText('기록 없음')}</p>
    : <p className="order-catalog-item__spec">{item.currentReplacementUsing ? uiText('주문 당시 사양: ') : ''}{item.specSummary ?? uiText('주문 당시 사양 기록 없음')}</p>
}
