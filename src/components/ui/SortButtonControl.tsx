import type { ReactNode } from 'react'

export interface SortConfig<Key extends string = string> { key: Key; direction: 'asc' | 'desc' }

export function nextSortConfig<Key extends string>(current: SortConfig<Key> | null | undefined, key: Key): SortConfig<Key> {
  if (current?.key !== key) return { key, direction: 'asc' }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

export function sortRows<Row, Key extends string>(rows: readonly Row[], sortConfig: SortConfig<Key> | null | undefined, getValue: (row: Row, key: Key) => unknown): Row[] {
  if (!sortConfig) return [...rows]

  const direction = sortConfig.direction === 'asc' ? 1 : -1
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
  return [...rows].sort((left, right) => {
    const leftValue = getValue(left, sortConfig.key)
    const rightValue = getValue(right, sortConfig.key)
    const numericValues = Number.isFinite(Number(leftValue)) && Number.isFinite(Number(rightValue))
      && leftValue !== '' && rightValue !== ''
    const comparison = numericValues
      ? Number(leftValue) - Number(rightValue)
      : collator.compare(String(leftValue), String(rightValue))
    return comparison * direction
  })
}

export interface SortButtonProps<Key extends string = string> { children?: ReactNode; className?: string; icon?: string; label: string; onSort: (key: Key) => void; sortConfig?: SortConfig<Key> | null; sortKey: Key }

export function SortButton<Key extends string>({ children, className = '', icon, label, onSort, sortConfig, sortKey }: SortButtonProps<Key>) {
  const direction = sortConfig?.key === sortKey ? sortConfig.direction : 'none'
  const directionLabel = direction === 'asc' ? '오름차순' : direction === 'desc' ? '내림차순' : '기본'

  return (
    <button
      aria-label={`${label} 정렬: ${directionLabel}`}
      aria-pressed={direction !== 'none'}
      className={`table-sort-button ${className}`.trim()}
      data-sort-direction={direction}
      data-sort-key={sortKey}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      {children}<img alt="" src={icon} />
    </button>
  )
}
