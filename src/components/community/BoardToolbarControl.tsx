import { useUiTranslation } from '@/i18n/uiTranslation'
import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import { SearchField } from '../ui/SearchFieldControl'
import { NativeSelect } from '../ui/SelectControl'
import { sortOptions as defaultSortOptions } from '../../lib/formOptions'
import { useState } from 'react'
import { BoardSearchSheet } from './BoardSearchSheet'

export const BOARD_SEARCH_MAX_LENGTH = 200

export interface BoardToolbarProps {
  className?: string
  count: number
  onSearchChange?: (search: string) => void
  onSearchSubmit?: (search: string) => void
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

export function BoardToolbar({ className = 'board-toolbar', count, onSearchChange, onSearchSubmit, onSortChange, onWrite, search = '', searchIcon, showWrite = false, sort = 'latest', sortIcon, sortOptions = defaultSortOptions, writeLabel = '글쓰기', writeTo = '/community/posts/new' }: BoardToolbarProps) {
  const { uiText } = useUiTranslation()
  const [searchOpen, setSearchOpen] = useState(false)
  return <div className={className}>
    {className === 'support-toolbar' ? <span>{uiText('총 {count}개', { count })}</span> : <span>{uiText('총')} <span><b>{count}</b>{uiText('개')}</span></span>}
    <div className={`${className}__controls`}>
      <label className={`${className}__sort${className === 'support-toolbar' ? ' support-sort' : ''}`}><span className="sr-only">{uiText('정렬')}</span>{className === 'board-toolbar' ? <span aria-hidden="true" className="board-toolbar__sort-label">{uiText(sortOptions.find(option => option.value === sort)?.label)}</span> : null}<NativeSelect aria-label={uiText('정렬')} onChange={(event) => onSortChange?.(event.target.value)} value={sort}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{uiText(option.label)}</option>)}</NativeSelect><img alt="" aria-hidden="true" src={sortIcon} /></label>
      <SearchField className={`${className}__search`} controlClassName={className === 'board-toolbar' ? 'board-toolbar__search-control' : undefined} icon={searchIcon} label={uiText('제목 또는 내용 검색')} maxLength={BOARD_SEARCH_MAX_LENGTH} onChange={(event) => onSearchChange?.(event.target.value.slice(0, BOARD_SEARCH_MAX_LENGTH))} onSubmit={onSearchSubmit} placeholder={uiText('제목 또는 내용 검색')} submitLabel={uiText('검색')} value={search} />
      {className === 'board-toolbar' ? <button aria-label={uiText('검색 열기')} aria-expanded={searchOpen} className="board-toolbar__mobile-search" onClick={() => setSearchOpen(true)} type="button"><img alt="" src={searchIcon}/></button> : null}
      {showWrite ? onWrite ? <button className="board-write-button" onClick={onWrite} type="button">{uiText(writeLabel)}</button> : <Link className="board-write-button" to={writeTo}>{uiText(writeLabel)}</Link> : null}
    </div>
    {className === 'board-toolbar' ? <BoardSearchSheet open={searchOpen} value={search} maxLength={BOARD_SEARCH_MAX_LENGTH} onChange={value => onSearchChange?.(value.slice(0, BOARD_SEARCH_MAX_LENGTH))} onSubmit={value => onSearchSubmit ? onSearchSubmit(value) : onSearchChange?.(value)} onClose={() => setSearchOpen(false)}/> : null}
  </div>
}
