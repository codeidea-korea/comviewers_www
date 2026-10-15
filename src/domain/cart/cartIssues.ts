import { translate, type TranslationKey } from '@/i18n/translation-core'

const translationKeys: Readonly<Record<string, TranslationKey>> = {
  SOLD_OUT: 'cart.soldOut', UNAVAILABLE: 'cart.unavailable', STOCK_RESERVED: 'cart.stockReserved',
  MISSING_PRICE: 'cart.missingPrice', INVALID_SELECTION: 'cart.invalidSelection',
  PRICING_MODEL_CHANGED: 'cart.pricingModelChanged', UNSUPPORTED_BILLING_UNIT: 'cart.unsupportedBillingUnit',
  ORDER_RESTRICTED: 'cart.orderRestricted', ORDER_UNAVAILABLE: 'cart.orderUnavailable', PRICE_OVERFLOW: 'cart.priceOverflow',
}
export const cartIssueMessage = (code: string) => {
  const key = translationKeys[code]
  return translate(key ?? 'cart.unknownIssue')
}
