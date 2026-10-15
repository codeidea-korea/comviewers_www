import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { datePickerCopy } from '@/i18n/date-picker-copy'
import calendarIcon from '@/assets/figma/icon-date-range.svg'
import previousIcon from '@/assets/figma/chevron-left.svg'
import nextIcon from '@/assets/figma/chevron-right.svg'
import { addDays, addMonths, calendarDays, dateValue, localToday, parseDate, supportedDate } from './datePickerModel'
import { useDatePickerPopover } from './useDatePickerPopover'
import './date-picker.css'

interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function DatePicker({ label, value, onChange, disabled = false }: DatePickerProps) {
  const { locale } = useUiTranslation()
  const copy = datePickerCopy[locale]
  const [open, setOpen] = useState(false)
  const [activeDate, setActiveDate] = useState(() => parseDate(value) ?? localToday())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusDateRef = useRef(false)
  const panelId = useId()
  const monthId = useId()
  const today = dateValue(localToday())
  const selectedDate = parseDate(value)
  const isOpen = open && !disabled
  const year = activeDate.getUTCFullYear()
  const month = activeDate.getUTCMonth()
  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const fullDateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' })
  const headingFormat = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' })
  const monthFirst = headingFormat.formatToParts(activeDate).find(part => part.type === 'month' || part.type === 'year')?.type === 'month'
  const days = calendarDays(activeDate)
  const dismiss = useCallback(() => setOpen(false), [])
  useDatePickerPopover({ open: isOpen, triggerRef, panelRef, onDismiss: dismiss })

  useEffect(() => { if (disabled) dismiss() }, [disabled, dismiss])

  useLayoutEffect(() => {
    if (!isOpen || !focusDateRef.current) return
    focusDateRef.current = false
    panelRef.current?.querySelector<HTMLElement>('[data-active-date]')?.focus({ preventScroll: true })
  }, [activeDate, isOpen])

  function close() {
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  function selectDate(next: string) {
    // Close before the quote request can disable the field.
    close()
    onChange(next)
  }

  function moveTo(next: Date, focus = false) {
    focusDateRef.current = focus
    setActiveDate(next)
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const dayOffsets: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -day.getUTCDay(), End: 6 - day.getUTCDay() }
    const offset = dayOffsets[event.key]
    if (offset !== undefined) {
      event.preventDefault()
      moveTo(addDays(day, offset), true)
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      moveTo(addMonths(day, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1)), true)
    }
  }

  return <div className="date-picker notranslate" lang={locale} translate="no" onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) dismiss()
  }} onKeyDown={event => {
    if (isOpen && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }}>
    <button aria-controls={isOpen ? panelId : undefined} aria-expanded={isOpen} aria-haspopup="dialog" aria-label={`${label}${selectedDate ? `: ${fullDateFormat.format(selectedDate)}` : ''}`} className="date-picker__trigger" disabled={disabled} onClick={() => {
      if (!isOpen) setActiveDate(parseDate(value) ?? localToday())
      setOpen(!isOpen)
    }} ref={triggerRef} type="button">
      <span>{selectedDate ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).format(selectedDate) : copy.placeholder}</span>
      <img alt="" src={calendarIcon} />
    </button>
    {isOpen ? <div aria-label={label} className="date-picker__panel" id={panelId} popover="manual" ref={panelRef} role="dialog">
      <div className="date-picker__header">
        <div className={`date-picker__month-fields${monthFirst ? ' is-month-first' : ''}`}>
          <input aria-label={copy.year} className="date-picker__year" max={9999} min={1} onChange={event => {
            const nextYear = Number(event.target.value)
            if (Number.isInteger(nextYear) && nextYear >= 1 && nextYear <= 9999) moveTo(addMonths(activeDate, (nextYear - year) * 12))
          }} type="number" value={year} />
          <select aria-label={copy.month} onChange={event => moveTo(addMonths(activeDate, Number(event.target.value) - month))} value={month}>
            {Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{monthFormat.format(addMonths(activeDate, index - month))}</option>)}
          </select>
        </div>
        <button aria-label={copy.previousMonth} disabled={year === 1 && month === 0} onClick={() => moveTo(addMonths(activeDate, -1))} type="button"><img alt="" src={previousIcon} /></button>
        <button aria-label={copy.nextMonth} disabled={year === 9999 && month === 11} onClick={() => moveTo(addMonths(activeDate, 1))} type="button"><img alt="" src={nextIcon} /></button>
      </div>
      <div aria-live="polite" className="sr-only" id={monthId}>{headingFormat.format(activeDate)}</div>
      <table aria-labelledby={monthId} className="date-picker__calendar" role="grid">
        <thead><tr>{Array.from({ length: 7 }, (_, index) => <th key={index} scope="col">{weekdayFormat.format(new Date(`2024-01-${String(7 + index).padStart(2, '0')}T12:00:00Z`))}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(day => {
          const key = dateValue(day)
          const active = key === dateValue(activeDate)
          return <td aria-selected={key === value} key={key} role="gridcell"><button aria-current={key === today ? 'date' : undefined} aria-label={fullDateFormat.format(day)} className={day.getUTCMonth() !== month ? 'is-outside' : undefined} data-active-date={active ? '' : undefined} disabled={!supportedDate(day)} onClick={() => selectDate(key)} onFocus={() => {
            if (day.getUTCMonth() === month) setActiveDate(day)
          }} onKeyDown={event => navigate(event, day)} tabIndex={active ? 0 : -1} type="button">{day.getUTCDate()}</button></td>
        })}</tr>)}</tbody>
      </table>
      <div className="date-picker__actions"><button onClick={() => selectDate('')} type="button">{copy.clear}</button><button onClick={() => selectDate(today)} type="button">{copy.today}</button></div>
    </div> : null}
  </div>
}
