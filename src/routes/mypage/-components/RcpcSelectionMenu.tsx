import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import './rcpc-list-controls.css'

type NativeAction = { button: HTMLButtonElement; label: string; disabled: boolean }

export function RcpcSelectionMenu({ children, label, className = '', nativeOnMobile = false }: { children: ReactNode; label: string; className?: string; nativeOnMobile?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const actions = useRef<HTMLElement>(null)
  const [nativeActions, setNativeActions] = useState<readonly NativeAction[]>([])
  useLayoutEffect(() => {
    const nav = actions.current
    if (!nativeOnMobile || !nav) return
    // Dispatch through the existing buttons so capability checks and confirmation flows stay shared.
    const update = () => setNativeActions(Array.from(nav.querySelectorAll<HTMLButtonElement>(':scope > button, :scope > section > button'), button => ({
      button, label: button.textContent?.trim() ?? '', disabled: button.disabled,
    })))
    update()
    const observer = new MutationObserver(update)
    observer.observe(nav, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled'] })
    return () => observer.disconnect()
  }, [nativeOnMobile])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div className={`rcpc-selection-menu${nativeOnMobile ? ' rcpc-selection-menu--native' : ''}${open ? ' is-open' : ''}`} ref={container}>
    {nativeOnMobile ? <select aria-label={label} className="rcpc-selection-menu__native" disabled={!nativeActions.some(action => !action.disabled)} value="" onChange={event => {
      const choice = event.currentTarget.value
      event.currentTarget.value = ''
      if (!choice) return
      const action = nativeActions[Number(choice)]
      if (action && !action.button.disabled) action.button.click()
    }}><option value="">선택작업</option>{nativeActions.map((action, index) => <option disabled={action.disabled} key={index} value={index}>{action.label}</option>)}</select> : null}
    <button aria-controls={id} aria-expanded={open} className="rcpc-selection-menu__trigger" onClick={() => setOpen(value => !value)} ref={trigger} type="button">선택작업 <i aria-hidden="true" /></button>
    <nav aria-label={label} className={`rcpc-bulk-actions ${className}`} id={id} ref={actions} onClick={event => { if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) setOpen(false) }}>{children}</nav>
  </div>
}
