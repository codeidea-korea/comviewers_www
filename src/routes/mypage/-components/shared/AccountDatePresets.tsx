import { useUiTranslation } from '@/i18n/uiTranslation'
export type AccountDatePreset = 'today' | 'week' | 'month' | 'quarter'
export function accountDateRange(preset: AccountDatePreset) {
  const to = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [year, month, day] = to.split('-').map(Number)
  const months = preset === 'month' ? 1 : preset === 'quarter' ? 3 : 0
  const end = new Date(Date.UTC(year!, month! - months, 0)).getUTCDate()
  const date = new Date(Date.UTC(year!, month! - 1 - months, months ? Math.min(day!, end) : day! - (preset === 'week' ? 6 : 0)))
  return { from: date.toISOString().slice(0, 10), to }
}
export function AccountDatePresets({ onChange }: { onChange: (dates: { from: string; to: string }) => void }) {
  const { uiText } = useUiTranslation()
  return <div className="account-date-presets">{([{ value: 'today', label: uiText("오늘") }, { value: 'week', label: uiText("1주일") }, { value: 'month', label: uiText("1개월") }, { value: 'quarter', label: uiText("3개월") }] as const).map(item => <button type="button" key={item.value} onClick={() => onChange(accountDateRange(item.value))}>{item.label}</button>)}</div>
}
