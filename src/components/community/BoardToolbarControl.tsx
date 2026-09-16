import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import { SearchField } from '../ui/SearchFieldControl'
import { NativeSelect } from '../ui/SelectControl'
import { sortOptions as defaultSortOptions } from '../../lib/formOptions'

export interface BoardToolbarProps {
  className?: string
  count: number
  onSearchChange?: (search: string) => void
  onSortChange?: (sort: string) => void
  onWrite?: () => void
  search?: string
  searchIcon?: string
  showWrite?: boolean
  sort?: string
  sortIcon?: string
  sortOptions?: readonly { label: string; value: string }[]
  writeLabel?: string
  writeTo?: string
}

export function BoardToolbar({ className = 'board-toolbar', count, onSearchChange, onSortChange, onWrite, search = '', searchIcon, showWrite = false, sort = 'latest', sortIcon, sortOptions = defaultSortOptions, writeLabel = '글쓰기', writeTo = '/community/posts/new' }: BoardToolbarProps) {
  return <div className={className}>
    {className === 'support-toolbar' ? <span>총 {count}개</span> : <span>총 <span><b>{count}</b>개</span></span>}
    <div className={`${className}__controls`}>
      <label className={`${className}__sort${className === 'support-toolbar' ? ' support-sort' : ''}`}><span className="sr-only">정렬</span><NativeSelect aria-label="정렬" onChange={(event) => onSortChange?.(event.target.value)} value={sort}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect><img alt="" aria-hidden="true" src={sortIcon} /></label>
      <SearchField className={`${className}__search`} icon={searchIcon} label="제목 또는 내용 검색" onChange={(event) => onSearchChange?.(event.target.value)} placeholder="제목 또는 내용 검색" submitLabel="검색" value={search} />
      {showWrite ? onWrite ? <button className="board-write-button" onClick={onWrite} type="button">{writeLabel}</button> : <Link className="board-write-button" to={writeTo}>{writeLabel}</Link> : null}
    </div>
  </div>
}
