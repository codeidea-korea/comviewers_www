import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import './tooltip.css'

type Placement = { left: number; top: number; arrow: number; side: 'top' | 'bottom' }

/** Supply only currently disclosed content; the tooltip can omit the visible label. */
export function TooltipText({ text, tooltipText = text, className = '', enabled = true }: { text: string; tooltipText?: string; className?: string; enabled?: boolean }) {
  return enabled ? <ActiveTooltipText text={text} tooltipText={tooltipText} className={className}/> : <span className={className || undefined}>{text}</span>
}

/** Clamp the displayed text and disclose its current, translated text only when clipped. */
export function EllipsisText({ children, lines = 2, className = '', asChild = false }: { children: ReactNode; lines?: 1 | 2; className?: string; asChild?: boolean }) {
  return <ActiveTooltipText className={className} lines={lines} asChild={asChild}>{children}</ActiveTooltipText>
}

type TriggerElement = ReactElement<HTMLAttributes<HTMLSpanElement> & { ref?: Ref<HTMLSpanElement> }>

function ActiveTooltipText({ text, tooltipText, className, children, lines, asChild = false }: { text?: string; tooltipText?: string; className: string; children?: ReactNode; lines?: 1 | 2; asChild?: boolean }) {
  const id = useId()
  const trigger = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focused = useRef(false)
  const content = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [disclosedText, setDisclosedText] = useState('')
  const isEllipsis = lines !== undefined
  const child = asChild && isValidElement(children) ? children as TriggerElement : null

  const cancelClose = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const show = () => {
    cancelClose()
    const node = content.current
    if (isEllipsis && (!node || (node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight))) return
    setDisclosedText(tooltipText ?? trigger.current?.textContent?.trim() ?? '')
    setOpen(true)
  }
  const close = () => { cancelClose(); setOpen(false); setPlacement(null) }
  const leave = () => {
    cancelClose()
    if (!focused.current) closeTimer.current = setTimeout(close, 120)
  }

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
  }, [])

  useLayoutEffect(() => {
    const node = content.current
    if (!isEllipsis || !node) return
    let active = true
    const measure = () => {
      if (!active) return
      const clipped = node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight
      setTruncated(clipped)
      setOpen(false)
      setPlacement(null)
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(node)
    const mutations = new MutationObserver(measure)
    mutations.observe(node, { childList: true, characterData: true, subtree: true })
    void document.fonts.ready.then(measure)
    return () => { active = false; resize.disconnect(); mutations.disconnect() }
  }, [isEllipsis, lines])

  useLayoutEffect(() => {
    if (!open || !trigger.current || !bubble.current) return
    const anchor = trigger.current.getBoundingClientRect()
    const box = bubble.current.getBoundingClientRect()
    const margin = 12
    const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - box.width / 2, window.innerWidth - box.width - margin))
    const side = anchor.top >= box.height + margin + 8 ? 'top' : 'bottom'
    const top = side === 'top' ? anchor.top - box.height - 8 : Math.min(anchor.bottom + 8, window.innerHeight - box.height - margin)
    setPlacement({ left, top: Math.max(margin, top), side, arrow: Math.max(12, Math.min(anchor.left + anchor.width / 2 - left, box.width - 12)) })
  }, [open, text, tooltipText, disclosedText])

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

  const triggerProps = {
    ref: trigger,
    className: `${isEllipsis ? 'ui-ellipsis' : 'ui-tooltip-text'} ${className} ${child?.props.className ?? ''}`.trim(),
    tabIndex: isEllipsis ? (truncated ? 0 : -1) : 0,
    'aria-describedby': open ? id : undefined,
    'data-truncated': truncated ? 'true' : 'false',
    onMouseEnter: show,
    onMouseLeave: leave,
    onFocus: () => { focused.current = true; show() },
    onBlur: () => { focused.current = false; close() },
  }
  const visibleContent = isEllipsis ? <span ref={content} className="ui-ellipsis__content" data-lines={lines}>{child ? child.props.children : children}</span> : text

  return <>
    {child ? cloneElement(child, triggerProps, visibleContent) : <span {...triggerProps}>{visibleContent}</span>}
    {open && createPortal(<div ref={bubble} id={id} role="tooltip" className={`ui-tooltip${isEllipsis ? ' ui-tooltip--ellipsis notranslate' : ''}`} translate={isEllipsis ? 'no' : undefined} data-side={placement?.side ?? 'top'} style={style}
      onMouseEnter={cancelClose} onMouseLeave={leave}>
      {isEllipsis ? <div aria-hidden="true" className="ui-tooltip__surface" /> : null}
      <div className="ui-tooltip__content">{tooltipText ?? disclosedText}</div>
    </div>, document.body)}
  </>
}
