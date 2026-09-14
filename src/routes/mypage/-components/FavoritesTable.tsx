import type { AccountRcpc } from '@/domain/myAccount/services'
import { useEffect,useState } from 'react'
import sortIcon from '../../../assets/figma/icon-unfold-less.svg'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { Pagination } from '../../../components/ui/PaginationControl'
import type { AccountSort } from './accountSorting'
import { SortButton,nextSortConfig,sortRows } from './accountSorting'
import { FavoriteRcpcRow } from './FavoriteRcpcRow'
import { type OpenRcpc,type TargetAction,getFavoriteRcpc } from './favoritesTypes'

export function FavoritesTable({ canManage = true, items, onChangeGroup, onExtend, onInquiry, onOpenRcpcPopup, onSelectionRequired, selectedGroup }: { canManage?: boolean; items: AccountRcpc[]; onChangeGroup: TargetAction; onExtend: TargetAction; onInquiry: TargetAction; onOpenRcpcPopup: OpenRcpc; onSelectionRequired: (trigger: HTMLButtonElement) => void; selectedGroup: string }) {
  const rowIds = items.map((_, index) => index)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [sortConfig, setSortConfig] = useState<AccountSort | null>(null)
  const membership = items.map((item) => item.id).join('|')
  useEffect(() => setSelectedRows([]), [selectedGroup, membership])
  const allSelected = rowIds.length > 0 && selectedRows.length === rowIds.length
  const someSelected = selectedRows.length > 0 && !allSelected
  const toggleAll = (checked: boolean) => setSelectedRows(checked ? rowIds : [])
  const toggleRow = (index: number, checked: boolean) => {
    setSelectedRows((current) => checked
      ? [...current, index].filter((value, position, values) => values.indexOf(value) === position)
      : current.filter((value) => value !== index))
  }
  const selectedRcpcs = selectedRows.filter((index) => items[index]).map((index) => getFavoriteRcpc(items[index]))
  const runSelectedAction = (action: TargetAction, trigger: HTMLButtonElement) => {
    if (selectedRcpcs.length > 0) action(selectedRcpcs, trigger)
    else onSelectionRequired(trigger)
  }
  const sortedRowIds = sortRows(rowIds, sortConfig, (index, key) => {
    const item = items[index]
    if (key === 'rcpc') return item.alias
    if (key === 'location') return `${item.company} ${item.center}`
    if (key === 'state') return item.state
    if (key === 'period') return item.daysLeft
    return item.traffic
  })
  const sort = (key: string) => setSortConfig((current) => nextSortConfig(current, key))

  return (
    <section className="favorites-results" id="favorites-results">
      <div className="favorites-results__toolbar">
        <Checkbox checked={allSelected} indeterminate={someSelected} onChange={(event) => toggleAll(event.target.checked)} visualClassName="">모두선택</Checkbox>
        <nav>{canManage ? <button onClick={(event) => runSelectedAction(onChangeGroup, event.currentTarget)} type="button">그룹 변경</button> : null}<button onClick={(event) => runSelectedAction(onInquiry, event.currentTarget)} type="button">문의</button>{canManage ? <button onClick={(event) => runSelectedAction(onExtend, event.currentTarget)} type="button">기간연장</button> : null}</nav>
      </div>
      <div aria-label="즐겨찾기 RCPC 목록" className="rcpc-list rcpc-list--table favorites-table" role="table">
        <div className="rcpc-list__header" role="row">
          <span aria-label="선택" role="columnheader"><Checkbox aria-label="전체 RCPC 선택" checked={allSelected} indeterminate={someSelected} inputClassName="favorites-table__check" onChange={(event) => toggleAll(event.target.checked)} /></span>
          <span role="columnheader"><SortButton icon={sortIcon} label="RCPC" onSort={sort} sortConfig={sortConfig} sortKey="rcpc">RCPC</SortButton></span><span role="columnheader"><SortButton icon={sortIcon} label="서버 위치" onSort={sort} sortConfig={sortConfig} sortKey="location">서버 위치</SortButton></span>
          <span role="columnheader"><SortButton icon={sortIcon} label="서버 상태" onSort={sort} sortConfig={sortConfig} sortKey="state">서버 상태</SortButton></span><span role="columnheader"><SortButton icon={sortIcon} label="이용 기간" onSort={sort} sortConfig={sortConfig} sortKey="period">이용 기간</SortButton></span>
          <span role="columnheader">접속 정보</span><span role="columnheader"><SortButton icon={sortIcon} label="트래픽 사용량" onSort={sort} sortConfig={sortConfig} sortKey="traffic">트래픽<br />사용량</SortButton></span><span role="columnheader">빠른 실행</span>
        </div>
        {sortedRowIds.map((index) => <FavoriteRcpcRow canManage={canManage} checked={selectedRows.includes(index)} index={index} item={items[index]} key={items[index].id} onCheckedChange={toggleRow} onExtend={onExtend} onInquiry={onInquiry} onOpenRcpcPopup={onOpenRcpcPopup} />)}
      </div>
      <Pagination totalPages={1} />
    </section>
  )
}
