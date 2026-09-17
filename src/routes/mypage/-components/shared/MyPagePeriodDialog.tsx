import { useState } from 'react'
import { PopupLayer } from '@/components/ui/PopupLayerControl'
import { DialogActions } from '@/components/ui/DialogActionsControl'
import dateRangeIcon from '@/assets/figma/icon-date-range.svg'
import { dateRangeError } from '../accountDates'
import { accountDateRange, type AccountDatePreset } from './AccountDatePresets'

const presets: readonly { label: string; value: AccountDatePreset }[] = [
  { label: '오늘', value: 'today' },
  { label: '1주일', value: 'week' },
  { label: '1개월', value: 'month' },
  { label: '3개월', value: 'quarter' },
]

const displayDate = (value: string, placeholder: string) => value ? value.replaceAll('-', '.') : placeholder

export function MyPagePeriodDialog({ dates, onApply, onClose }: {
  dates: { from: string; to: string }
  onApply: (dates: { from: string; to: string }) => void
  onClose: () => void
}) {
  const [from, setFrom] = useState(dates.from)
  const [to, setTo] = useState(dates.to)
  const [selectedPreset, setSelectedPreset] = useState(() =>
    presets.find(({ value }) => {
      const range = accountDateRange(value)
      return range.from === dates.from && range.to === dates.to
    })?.value ?? '')
  const [error, setError] = useState('')

  const selectPreset = (preset: AccountDatePreset) => {
    const range = accountDateRange(preset)
    setSelectedPreset(preset)
    setFrom(range.from)
    setTo(range.to)
    setError('')
  }

  const apply = () => {
    const nextError = dateRangeError(from, to)
    setError(nextError)
    if (!nextError) onApply({ from, to })
  }

  return <PopupLayer className="order-period-layer" dialogClassName="order-period-dialog" initialFocus="dialog" isOpen onClose={onClose} title="기간 선택">
    <div className="order-period-dialog__presets">
      <strong>기간</strong>
      <nav aria-label="빠른 기간 선택">{presets.map(({ label, value }) => <button aria-pressed={selectedPreset === value} key={value} onClick={() => selectPreset(value)} type="button">{label}</button>)}</nav>
    </div>
    <div className="order-period-dialog__dates">
      <strong>기간</strong>
      <p>
        <label><span>{displayDate(from, '시작일')}</span><img alt="" src={dateRangeIcon} /><input aria-label="시작일" onChange={event => { setSelectedPreset(''); setFrom(event.target.value); setError('') }} type="date" value={from} /></label>
        <span aria-hidden="true">~</span>
        <label><span>{displayDate(to, '종료일')}</span><img alt="" src={dateRangeIcon} /><input aria-label="종료일" onChange={event => { setSelectedPreset(''); setTo(event.target.value); setError('') }} type="date" value={to} /></label>
      </p>
    </div>
    {error ? <p className="order-period-dialog__error" role="alert">{error}</p> : null}
    <DialogActions><button onClick={onClose} type="button">취소</button><button onClick={apply} type="button">조회</button></DialogActions>
  </PopupLayer>
}
