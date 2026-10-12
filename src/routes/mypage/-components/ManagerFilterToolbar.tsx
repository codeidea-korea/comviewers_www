import { useId, useRef, useState } from 'react'
import type { AccountManager } from '@/domain/myAccount/managerServices'
import { useDismissibleSelect } from '@/components/ui/SelectControl'
import unfoldIcon from '@/assets/figma/favorites-group-unfold.svg'
import settingsIcon from '@/assets/figma/favorites-group-settings.svg'

export function ManagerFilterToolbar({ managers, selected, unassignedCount, onSelect, onSettings }: {
  managers: readonly AccountManager[]
  selected: string | null
  unassignedCount: number
  onSelect: (id: string | null) => void
  onSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  useDismissibleSelect({ containerRef, isOpen: open, onDismiss: ({ restoreFocus }) => { setOpen(false); if (restoreFocus) triggerRef.current?.focus() } })
  const choose = (id: string | null) => { onSelect(id); setOpen(false); triggerRef.current?.focus() }
  const label = selected === 'unassigned' ? '미배정' : managers.find(manager => manager.id === selected)?.name ?? '전체'
  return <div className="favorites-group-toolbar manager-filter-toolbar" ref={containerRef}>
    <h1>RCPC 담당자 관리</h1>
    <div className="favorites-group-toolbar__picker">
      <button aria-controls={menuId} aria-expanded={open} aria-haspopup="true" className="favorites-group-toolbar__trigger" onClick={() => setOpen(value => !value)} ref={triggerRef} type="button">{label}<img alt="" src={unfoldIcon}/></button>
      {open ? <div aria-label="담당자 목록" className="favorites-group-menu manager-filter-menu" id={menuId}>
        <button aria-pressed={selected === null} onClick={() => choose(null)} type="button">전체</button>
        {managers.map(manager => <button aria-pressed={selected === manager.id} key={manager.id} onClick={() => choose(manager.id)} type="button"><b>{manager.name}</b><span>{manager.assignedRcpcIds.length}</span></button>)}
        <button aria-pressed={selected === 'unassigned'} onClick={() => choose('unassigned')} type="button"><b>미배정</b><span>{unassignedCount}</span></button>
      </div> : null}
    </div>
    <button className="favorites-group-toolbar__settings" onClick={onSettings} type="button">담당자 설정<img alt="" src={settingsIcon}/></button>
  </div>
}
