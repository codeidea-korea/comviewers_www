import { useUiTranslation } from '@/i18n/uiTranslation'
import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AccountManager } from '@/domain/myAccount/managerServices'
import { useDismissibleSelect } from '@/components/ui/SelectControl'
import unfoldIcon from '@/assets/figma/favorites-group-unfold.svg'
import settingsIcon from '@/assets/figma/favorites-group-settings.svg'
import searchIcon from '@/assets/figma/mypage-search.svg'
import { MobileBottomSheet } from '../MypageComponentsView'
import { SearchField } from '@/components/ui/SearchFieldControl'

export function ManagerFilterToolbar({ managers, selected, unassignedCount, onSelect, onSettings, onCreate, onCopyLink, search, onSearch }: {
  onCreate: () => void
  onCopyLink: () => void
  search: string
  onSearch: (value: string) => void
  managers: readonly AccountManager[]
  selected: string | null
  unassignedCount: number
  onSelect: (id: string | null) => void
  onSettings: () => void
}) {
  const { uiText } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState(search)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchTriggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  useDismissibleSelect({ containerRef, isOpen: open, onDismiss: ({ restoreFocus }) => { setOpen(false); if (restoreFocus) triggerRef.current?.focus() } })
  const choose = (id: string | null) => { onSelect(id); setOpen(false); setMobileOpen(false); triggerRef.current?.focus() }
  const label = selected === 'unassigned' ? uiText("미배정") : managers.find(manager => manager.id === selected)?.name ?? uiText("전체")
  const closeSearch = () => { setSearchOpen(false); requestAnimationFrame(() => searchTriggerRef.current?.focus({ preventScroll: true })) }
  return <div className="favorites-group-toolbar manager-filter-toolbar" ref={containerRef}>
    <h1>{uiText("RCPC 담당자 관리")}</h1>
    <div className="manager-mobile-heading-actions"><button onClick={onCopyLink} type="button">{uiText("접속 링크복사")}</button><button onClick={onCreate} type="button">{uiText("담당자 등록")}</button></div>
    <div className="manager-filter-toolbar__controls">
    <div className="favorites-group-toolbar__picker">
      <button aria-controls={mobileOpen ? `${menuId}-sheet` : menuId} aria-expanded={open || mobileOpen} aria-haspopup={mobileOpen ? 'dialog' : true} className="favorites-group-toolbar__trigger" onClick={() => { if (window.matchMedia('(max-width: 767px)').matches) { setOpen(false); setMobileOpen(true) } else { setMobileOpen(false); setOpen(value => !value) } }} ref={triggerRef} type="button">{label}<img alt="" src={unfoldIcon}/></button>
      {open ? <div aria-label={uiText("담당자 목록")} className="favorites-group-menu manager-filter-menu" id={menuId}>
        <button aria-pressed={selected === null} onClick={() => choose(null)} type="button">{uiText("전체")}</button>
        {managers.map(manager => <button aria-pressed={selected === manager.id} key={manager.id} onClick={() => choose(manager.id)} type="button"><b>{manager.name}</b><span>{manager.assignedRcpcIds.length}</span></button>)}
        <button aria-pressed={selected === 'unassigned'} onClick={() => choose('unassigned')} type="button"><b>{uiText("미배정")}</b><span>{unassignedCount}</span></button>
      </div> : null}
    </div>
    <button className="favorites-group-toolbar__settings" onClick={onSettings} type="button">{uiText("담당자 설정")}<img alt="" src={settingsIcon}/></button>
    <button aria-controls={`${menuId}-search-sheet`} aria-expanded={searchOpen} aria-label={uiText("담당자 검색")} className="manager-mobile-search-trigger" onClick={() => { setSearchDraft(search); setSearchOpen(true) }} ref={searchTriggerRef} type="button"><img alt="" src={searchIcon}/></button>
    </div>
    {createPortal(<MobileBottomSheet id={`${menuId}-search-sheet`} label={uiText("담당자 검색")} onClose={closeSearch} open={searchOpen}><form onSubmit={event => { event.preventDefault(); onSearch(searchDraft); closeSearch() }}><SearchField className="mypage-mobile-search" controlClassName="mypage-mobile-search__control" label={uiText("담당자 검색")} onChange={event => setSearchDraft(event.target.value)} placeholder={uiText("담당자명, RCPC 품번 또는 별명 검색")} value={searchDraft}/><button className="mypage-mobile-search__submit" type="submit">{uiText("조회")}</button></form></MobileBottomSheet>, document.body)}
    {createPortal(<MobileBottomSheet id={`${menuId}-sheet`} label={uiText("담당자 선택")} onClose={() => setMobileOpen(false)} open={mobileOpen}>
      <div className="manager-mobile-picker-options"><button aria-pressed={selected === null} onClick={() => choose(null)} type="button">{uiText("전체")}</button>
        {managers.map(manager => <button aria-pressed={selected === manager.id} key={manager.id} onClick={() => choose(manager.id)} type="button"><span>{manager.name}</span><span>{manager.assignedRcpcIds.length}</span></button>)}
        <button aria-pressed={selected === 'unassigned'} onClick={() => choose('unassigned')} type="button"><span>{uiText("미배정")}</span><span>{unassignedCount}</span></button>
      </div>
    </MobileBottomSheet>, document.body)}
  </div>
}
