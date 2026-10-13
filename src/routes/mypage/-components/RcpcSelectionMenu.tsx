import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './rcpc-list-controls.css'

export function RcpcSelectionMenu({ children, label, className = '' }: { children: ReactNode; label: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div className={`rcpc-selection-menu${open ? ' is-open' : ''}`} ref={container}>
    <button aria-controls={id} aria-expanded={open} className="rcpc-selection-menu__trigger" onClick={() => setOpen(value => !value)} ref={trigger} type="button">선택작업 <i aria-hidden="true" /></button>
    <nav aria-label={label} className={`rcpc-bulk-actions ${className}`} id={id} onClick={event => { if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) setOpen(false) }}>{children}</nav>
  </div>
}
