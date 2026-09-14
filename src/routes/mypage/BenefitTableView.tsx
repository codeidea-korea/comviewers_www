import type { ReactNode } from 'react'
import type { AccountSort } from './-components/accountSorting'
import { useState } from 'react'
import sortIcon from '../../assets/figma/icon-unfold-less.svg'
import { nextSortConfig, sortRows, SortButton } from './-components/accountSorting'

export function BenefitTable({ ariaLabel = '혜택 내역', headers, rows, sortConfig: controlledSort, onSort, manualSorting = false }: { ariaLabel?: string; headers: readonly (string | { label: string; sortable?: boolean })[]; rows: readonly ReactNode[][]; sortConfig?: AccountSort | null; onSort?: (sort: AccountSort) => void; manualSorting?: boolean }) {
  const [internalSort, setSortConfig] = useState<AccountSort | null>(null)
  const sortConfig = controlledSort === undefined ? internalSort : controlledSort
  const sortedRows = manualSorting ? rows : sortRows(rows, sortConfig, (row, key) => row[Number(key)])
  const sort = (key: string) => { const next = nextSortConfig(sortConfig, key); if (onSort) onSort(next); else setSortConfig(next) }
  const columnStyle = { gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }
  return <div aria-label={ariaLabel} className="benefit-table" role="table"><div role="row" style={columnStyle}>{headers.map((header, index) => {
    const label = typeof header === 'string' ? header : header.label
    return <strong key={label} role="columnheader">{typeof header !== 'string' && header.sortable ? <SortButton icon={sortIcon} label={label} onSort={sort} sortConfig={sortConfig} sortKey={String(index)}>{label}</SortButton> : label}</strong>
  })}</div>{sortedRows.map((row,index)=><p data-sort-row={row.map((value) => String(value)).join('|')} key={`${sortConfig?.key ?? 'default'}-${index}`} role="row" style={columnStyle}>{row.map((value,columnIndex)=><span key={`${columnIndex}-${value}`} role="cell">{value}</span>)}</p>)}</div>
}
