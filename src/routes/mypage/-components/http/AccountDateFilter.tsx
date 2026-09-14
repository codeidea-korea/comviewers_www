import { useState } from 'react'
import { AccountDatePresets } from './AccountDatePresets'
type Dates = { from: string; to: string }
export function AccountDateFilter({ value, onChange }: { value: Dates; onChange: (next: Dates) => void }) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  function apply(next: Dates) { setDraft(next); setError(''); onChange(next) }
  return <section aria-label="조회 기간"><AccountDatePresets onChange={apply} />
    <form onSubmit={event => { event.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setError('종료일은 시작일 이후로 선택해 주세요.'); return } apply(draft) }}>
      <label>시작일<input type="date" value={draft.from} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} /></label>
      <label>종료일<input type="date" value={draft.to} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} /></label>
      <button type="submit">조회</button>
    </form>{error && <p role="alert">{error}</p>}
  </section>
}
