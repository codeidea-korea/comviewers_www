export interface ExtensionResultItem {
  addedDays: number | null
  amount: number | null
  eligible: boolean
  reason: string | null
}

export function extensionResultText(item: ExtensionResultItem) {
  if (!item.eligible && item.addedDays !== null && item.addedDays > 90) return '최대 3개월까지만 연장할 수 있습니다.'
  return item.reason ?? `${item.amount?.toLocaleString('ko-KR') ?? '-'}원`
}
