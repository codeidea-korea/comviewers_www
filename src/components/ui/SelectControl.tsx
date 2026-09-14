import type { UIEvent } from 'react'
import type { NativeSelectProps, DropdownSelectProps, DropdownOptionListProps, GroupedMultiSelectProps, SelectGroup, SelectOption, DismissibleSelectProps, OptionKeyEvent } from './selectTypes'
import { useEffect, useRef, useState } from 'react'
import { Checkbox } from './CheckboxControl'

const normalizeOption = (option: string | SelectOption): SelectOption => (
  typeof option === 'string' ? { label: option, value: option } : option
)

export function NativeSelect({ children, options, placeholder, ...props }: NativeSelectProps) {
  return (
    <select data-ui="native-select" {...props}>
      {placeholder ? <option value={placeholder.value ?? ''}>{placeholder.label}</option> : null}
      {options?.map((option) => {
        const normalized = normalizeOption(option)
        return <option disabled={normalized.disabled} key={normalized.value} value={normalized.value}>{normalized.label}</option>
      })}
      {children}
    </select>
  )
}

export function DropdownSelect({ className, controls, expanded, hasPopup = 'listbox', label, onToggle, panel, triggerIcon, value }: DropdownSelectProps) {
  return (
    <div className={className} data-ui="dropdown-select">
      <span>{label}</span>
      <button aria-controls={controls} aria-expanded={expanded} aria-haspopup={hasPopup || undefined} onClick={onToggle} type="button">
        <strong>{value}</strong>
        {triggerIcon}
      </button>
      {panel}
    </div>
  )
}

export function DropdownOptionList({ className, id, label, onClose, onSelect, options, selected }: DropdownOptionListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const selectedOption = listRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
    const firstOption = listRef.current?.querySelector<HTMLElement>('[role="option"]')
    const focusTarget = selectedOption ?? firstOption
    focusTarget?.focus()
  }, [selected])
  const moveFocus = (event: OptionKeyEvent, direction: number | 'first' | 'last') => {
    const optionElements = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
    const currentIndex = optionElements.indexOf(event.currentTarget)
    const nextIndex = direction === 'first'
      ? 0
      : direction === 'last'
        ? optionElements.length - 1
        : (currentIndex + direction + optionElements.length) % optionElements.length
    optionElements[nextIndex]?.focus()
  }
  const handleKeyDown = (event: OptionKeyEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(event, 1) }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(event, -1) }
    if (event.key === 'Home') { event.preventDefault(); moveFocus(event, 'first') }
    if (event.key === 'End') { event.preventDefault(); moveFocus(event, 'last') }
    if (event.key === 'Escape') { event.preventDefault(); onClose() }
  }

  return (
    <div aria-label={`${label} 선택`} className={className} id={id} ref={listRef} role="listbox">
      {options.map((option) => (
        <button aria-selected={selected === option} key={option} onClick={() => onSelect(option)} onKeyDown={handleKeyDown} role="option" type="button">{option}</button>
      ))}
    </div>
  )
}

export function GroupedMultiSelect({ ariaLabel, chevronIcon, className, groups, id, onChange, selectedValues, thumbTravel = 0 }: GroupedMultiSelectProps) {
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(groups.map((group) => group.label)))
  const [scrollProgress, setScrollProgress] = useState(0)
  const toggleGroup = (groupLabel: string) => setExpandedGroups((current) => {
    const next = new Set(current)
    if (next.has(groupLabel)) next.delete(groupLabel)
    else next.add(groupLabel)
    return next
  })
  const toggleGroupSelection = (group: SelectGroup, checked: boolean) => {
    const next = new Set(selectedValues)
    group.options.forEach((option) => {
      const value = typeof option === 'string' ? option : option.value
      if (checked) next.add(value)
      else next.delete(value)
    })
    onChange(next)
  }
  const toggleOption = (value: string, checked: boolean) => {
    const next = new Set(selectedValues)
    if (checked) next.add(value)
    else next.delete(value)
    onChange(next)
  }
  const updateScrollProgress = (event: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget
    const maximum = scrollHeight - clientHeight
    setScrollProgress(maximum > 0 ? scrollTop / maximum : 0)
  }

  return (
    <div aria-label={ariaLabel} className={className} data-ui="grouped-multi-select" id={id} role="group">
      <div className={`${className}__scroll`} onScroll={updateScrollProgress}>
        {groups.map((group, groupIndex) => {
          const values = group.options.map((option) => typeof option === 'string' ? option : option.value)
          const selectedCount = values.filter((value) => selectedValues.has(value)).length
          const expanded = expandedGroups.has(group.label)
          const optionsId = `${id}-group-${groupIndex}`
          return (
            <section key={group.label}>
              <div className={`${className}__group`}>
                <label>
                  <Checkbox aria-label={`${group.label} 전체 선택`} checked={selectedCount === values.length} indeterminate={selectedCount > 0 && selectedCount < values.length} inputClassName={selectedCount > 0 && selectedCount < values.length ? `${className}__check--mixed` : undefined} onChange={(event) => toggleGroupSelection(group, event.target.checked)} />
                  <span>{group.label}</span>
                </label>
                <button aria-controls={optionsId} aria-expanded={expanded} aria-label={`${group.label} 그룹 ${expanded ? '접기' : '펼치기'}`} onClick={() => toggleGroup(group.label)} type="button"><img alt="" src={chevronIcon} /></button>
              </div>
              {expanded ? <div className={`${className}__options`} id={optionsId}>
                {group.options.map((option) => {
                  const normalized = normalizeOption(option)
                  const checked = selectedValues.has(normalized.value)
                  return (
                    <label key={normalized.value}>
                      <Checkbox aria-label={normalized.label} checked={checked} onChange={(event) => toggleOption(normalized.value, event.target.checked)} />
                      <span>{normalized.label}</span>
                    </label>
                  )
                })}
              </div> : null}
            </section>
          )
        })}
      </div>
      <span aria-hidden="true" className={`${className}__thumb`} style={{ transform: `translateY(${scrollProgress * thumbTravel}px)` }} />
    </div>
  )
}

export function useDismissibleSelect({ containerRef, isOpen, onDismiss }: DismissibleSelectProps) {
  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) onDismiss({ restoreFocus: false })
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss({ restoreFocus: true })
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [containerRef, isOpen, onDismiss])
}

