import { translate, type TranslationKey } from '@/i18n/translation-core'

const translationKeys: Readonly<Record<string, TranslationKey>> = {
  SOLD_OUT: 'cart.soldOut', UNAVAILABLE: 'cart.unavailable', STOCK_RESERVED: 'cart.stockReserved',
  MISSING_PRICE: 'cart.missingPrice', INVALID_SELECTION: 'cart.invalidSelection',
}
const messages: Record<string, string> = {
  SOLD_OUT: '품절된 상품입니다.', UNAVAILABLE: '현재 판매하지 않는 상품입니다.',
  STOCK_RESERVED: '결제 대기 중인 주문이 있어 선택한 수량을 주문할 수 없습니다.',
  MISSING_PRICE: '현재 가격을 확인할 수 없습니다.',
  PRICING_MODEL_CHANGED: '요금제가 변경되었습니다. 상품을 다시 선택해 주세요.',
  UNSUPPORTED_BILLING_UNIT: '현재 선택할 수 없는 이용 단위입니다.',
  ORDER_RESTRICTED: '주문이 제한된 상품입니다.', INVALID_SELECTION: '수량 또는 이용기간을 확인해 주세요.',
  ORDER_UNAVAILABLE: '현재 주문할 수 없습니다. 수량과 상품 상태를 확인해 주세요.',
  PRICE_OVERFLOW: '상품 금액을 확인할 수 없습니다.',
}
export const cartIssueMessage = (code: string) => {
  const key = translationKeys[code]
  return key ? translate(key) : messages[code] ?? '현재 주문할 수 없는 상품입니다.'
}
