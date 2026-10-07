import type { Key, ReactNode } from 'react'
import type { AccountSort } from './-components/accountSorting'
import type { SortValue } from '@/lib/sortRows'
import { useState } from 'react'
import sortIcon from '../../assets/figma/icon-unfold-less.svg'
import { nextSortConfig, sortRows, SortButton } from './-components/accountSorting'

export interface BenefitColumn<T> {
  key: string
  label: string
  renderCell: (row: T) => ReactNode
  sortValue?: (row: T) => SortValue
}

export function BenefitTable<T>({ ariaLabel = '혜택 내역', columns, rows, rowKey, sortConfig: controlledSort, onSort, manualSorting = false }: {
  ariaLabel?: string; columns: readonly BenefitColumn<T>[]; rows: readonly T[]; rowKey: (row: T) => Key
  sortConfig?: AccountSort | null; onSort?: (sort: AccountSort) => void; manualSorting?: boolean
}) {
  const [internalSort, setSortConfig] = useState<AccountSort | null>(null)
  const sortConfig = controlledSort === undefined ? internalSort : controlledSort
  const sortColumn = columns.find(column => column.key === sortConfig?.key)
  const sortedRows = manualSorting || !sortColumn?.sortValue ? rows : sortRows(rows, sortConfig, row => sortColumn.sortValue!(row))
  const sort = (key: string) => { const next = nextSortConfig(sortConfig, key); if (onSort) onSort(next); else setSortConfig(next) }
  const columnStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }
  return <div aria-label={ariaLabel} className="benefit-table" role="table">
    <div role="row" style={columnStyle}>{columns.map(column => <strong key={column.key} role="columnheader">
      {column.sortValue ? <SortButton icon={sortIcon} label={column.label} onSort={sort} sortConfig={sortConfig} sortKey={column.key}>{column.label}</SortButton> : column.label}
    </strong>)}</div>
    {sortedRows.map(row => <p data-row-id={rowKey(row)} key={rowKey(row)} role="row" style={columnStyle}>
      {columns.map(column => <span data-label={column.label} key={column.key} role="cell">{column.renderCell(row)}</span>)}
    </p>)}
  </div>
}
