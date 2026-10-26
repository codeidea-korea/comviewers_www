import { translateUiText } from '@/i18n/uiTranslation'
export interface ExtensionResultItem {
  addedDays: number | null
  amount: number | null
  eligible: boolean
  reason: string | null
}

export function extensionResultText(item: ExtensionResultItem) {
  return item.reason !== null ? translateUiText(item.reason) : translateUiText('{v0}원', { v0: item.amount?.toLocaleString('ko-KR') ?? '-' })
}
