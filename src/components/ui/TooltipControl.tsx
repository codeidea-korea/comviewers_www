import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import './tooltip.css'

type Placement = { left: number; top: number; arrow: number; side: 'top' | 'bottom' }

/** Supply only currently disclosed content; the tooltip can omit the visible label. */
export function TooltipText({ text, tooltipText = text, className = '', enabled = true }: { text: string; tooltipText?: string; className?: string; enabled?: boolean }) {
  return enabled ? <ActiveTooltipText text={text} tooltipText={tooltipText} className={className}/> : <span className={className || undefined}>{text}</span>
}

function ActiveTooltipText({ text, tooltipText, className }: { text: string; tooltipText: string; className: string }) {
  const id = useId()
  const trigger = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focused = useRef(false)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const cancelClose = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const show = () => { cancelClose(); setOpen(true) }
  const close = () => { cancelClose(); setOpen(false); setPlacement(null) }
  const leave = () => {
    cancelClose()
    if (!focused.current) closeTimer.current = setTimeout(close, 120)
  }

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
  }, [])

  useLayoutEffect(() => {
    if (!open || !trigger.current || !bubble.current) return
    const anchor = trigger.current.getBoundingClientRect()
    const box = bubble.current.getBoundingClientRect()
    const margin = 12
    const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - box.width / 2, window.innerWidth - box.width - margin))
    const side = anchor.top >= box.height + margin + 8 ? 'top' : 'bottom'
    const top = side === 'top' ? anchor.top - box.height - 8 : Math.min(anchor.bottom + 8, window.innerHeight - box.height - margin)
    setPlacement({ left, top: Math.max(margin, top), side, arrow: Math.max(12, Math.min(anchor.left + anchor.width / 2 - left, box.width - 12)) })
  }, [open, text, tooltipText])

  useEffect(() => {
    if (!open) return
    const dismiss = () => { setOpen(false); setPlacement(null) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !bubble.current?.contains(event.target)) dismiss()
    }
    window.addEventListener('keydown', escape)
    window.addEventListener('blur', dismiss)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('keydown', escape)
      window.removeEventListener('blur', dismiss)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  const style = {
    left: placement?.left ?? 0,
    top: placement?.top ?? 0,
    visibility: placement ? 'visible' : 'hidden',
    '--tooltip-arrow': `${placement?.arrow ?? 12}px`,
  } as CSSProperties

  return <>
    <span ref={trigger} className={`ui-tooltip-text ${className}`.trim()} tabIndex={0} aria-describedby={open ? id : undefined}
      onMouseEnter={show} onMouseLeave={leave}
      onFocus={() => { focused.current = true; show() }}
      onBlur={() => { focused.current = false; close() }}>{text}</span>
    {open && createPortal(<div ref={bubble} id={id} role="tooltip" className="ui-tooltip" data-side={placement?.side ?? 'top'} style={style}
      onMouseEnter={cancelClose} onMouseLeave={leave}><div className="ui-tooltip__content">{tooltipText}</div></div>, document.body)}
  </>
}
