import { PcSpecSummary } from '@/components/product/PcSpecSummary'
import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import type { AccountOrderItem } from '@/api/myAccountOrders'
import { showsRentalUsagePeriod } from '@/lib/orderItemPresentation'

export function OrderProductDescription({ item }: { item: AccountOrderItem }) {
  useUiTranslation()
  return !showsRentalUsagePeriod(item)
    ? <p className="order-catalog-item__spec">{uiText("주문 당시 상품 설명:")} {item.specSummary ?? uiText('기록 없음')}</p>
    : <p className="order-catalog-item__spec order-catalog-item__spec--pc">{item.currentReplacementUsing ? uiText('주문 당시 사양: ') : ''}{<PcSpecSummary text={item.specSummary} fallback={uiText('주문 당시 사양 기록 없음')} />}</p>
}
