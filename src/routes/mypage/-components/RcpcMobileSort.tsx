import { useState } from 'react'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { createPortal } from 'react-dom'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { nextSortConfig, type SortConfig } from '@/components/ui/SortButtonControl'
import { MyPageMobileFilterSheet } from '../MypageComponentsView'
import './rcpc-mobile-sort.css'

type SortKey = NonNullable<MyRcpcQuery['sort']>
const options: readonly { key: SortKey; label: string }[] = [
  { key: 'productNo', label: 'RCPC' },
  { key: 'serverRoom', label: '서버 위치' },
  { key: 'serverStatus', label: '서버 상태' },
  { key: 'servicePeriod', label: '이용 기간' },
]

export function RcpcMobileSort({ sort, onChange, disabled = false, favorites = false }: {
  sort: SortConfig<SortKey>; onChange: (sort: SortConfig<SortKey>) => void; disabled?: boolean; favorites?: boolean
}) {
  const { uiText } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const items = favorites ? [...options, { key: 'favoriteEdited' as const, label: '즐겨찾기 변경순' }] : options
  const label = items.find(item => item.key === sort.key)?.label ?? '정렬'
  const ascending = sort.direction === 'asc'
  return <div className="rcpc-mobile-sort">
    <button aria-expanded={!disabled && open} aria-haspopup="dialog" disabled={disabled} onClick={() => setOpen(true)} type="button">{uiText(label)}</button>
    <button aria-label={uiText('{label}: 현재 {current}, {next}으로 변경', { label: uiText(label), current: uiText(ascending ? '오름차순' : '내림차순'), next: uiText(ascending ? '내림차순' : '오름차순') })} className="rcpc-mobile-sort__direction" disabled={disabled} onClick={() => onChange(nextSortConfig(sort, sort.key))} type="button">
      <svg aria-hidden="true" data-direction={sort.direction} height="14.2632" viewBox="0 0 10 14.2632" width="10"><path className="rcpc-mobile-sort__asc" d="M10 5H0L5 .25 10 5Z"/><path className="rcpc-mobile-sort__desc" d="M0 9h10l-5 5-5-5Z"/></svg>
    </button>
    {open && !disabled ? createPortal(<MyPageMobileFilterSheet items={items.map(item => item.label)} open={!disabled && open} onClose={() => setOpen(false)} onSelect={selected => {
      const item = items.find(option => option.label === selected)
      if (item) onChange(item.key === 'favoriteEdited' && sort.key !== item.key ? { key: item.key, direction: 'desc' } : nextSortConfig(sort, item.key))
    }}/>, document.body) : null}
  </div>
}
