import type { ReactNode, RefObject } from 'react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface DialogLayerProps {
  asChild?: boolean
  backdropClassName?: string
  children?: ReactNode
  dialogClassName?: string
  focusKey?: string | number
  initialFocus?: 'first-focusable' | 'dialog'
  isOpen: boolean
  onClose?: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
  showTitle?: boolean
  title?: string
}

interface DocumentScrollState {
  bodyOverflow: string
  bodyPaddingRight: string
  rootOverflow: string
  scrollX: number
  scrollY: number
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

let openDialogCount = 0
let documentScrollState: DocumentScrollState | null = null

function lockDocumentScroll() {
  if (documentScrollState) return

  const root = document.documentElement
  const body = document.body
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth)
  const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0

  documentScrollState = {
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    rootOverflow: root.style.overflow,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }

  root.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`
}

function unlockDocumentScroll() {
  if (!documentScrollState) return null

  const { bodyOverflow, bodyPaddingRight, rootOverflow, scrollX, scrollY } = documentScrollState
  document.documentElement.style.overflow = rootOverflow
  document.body.style.overflow = bodyOverflow
  document.body.style.paddingRight = bodyPaddingRight
  documentScrollState = null
  window.scrollTo(scrollX, scrollY)
  return { scrollX, scrollY }
}

function setApplicationInert(inert: boolean) {
  const appRoot = document.getElementById('root')
  if (!appRoot) return

  if (inert) {
    appRoot.setAttribute('aria-hidden', 'true')
    appRoot.inert = true
    return
  }

  appRoot.removeAttribute('aria-hidden')
  appRoot.inert = false
}

export function DialogLayer({
  asChild = false,
  backdropClassName = '',
  children,
  dialogClassName = '',
  focusKey = '',
  initialFocus = 'first-focusable',
  isOpen,
  onClose,
  returnFocusRef,
  showTitle = true,
  title,
}: DialogLayerProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const dialogRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  closeRef.current = onClose

  useEffect(() => {
    if (!isOpen) return undefined
    if (asChild) dialogRef.current = backdropRef.current?.querySelector<HTMLElement>('[role="dialog"]') ?? null
    const dialog = dialogRef.current
    if (asChild && !showTitle && title && dialog && !dialog.hasAttribute('aria-label')) dialog.setAttribute('aria-label', title)
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector)
    const initialFocusTarget = initialFocus === 'dialog' ? dialog : firstFocusable ?? dialog
    const focusFrame = window.requestAnimationFrame(() => initialFocusTarget?.focus({ preventScroll: true }))

    return () => window.cancelAnimationFrame(focusFrame)
  }, [asChild, focusKey, initialFocus, isOpen, showTitle, title])

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const returnTarget = returnFocusRef?.current ?? previousFocusRef.current
    openDialogCount += 1
    if (openDialogCount === 1) {
      setApplicationInert(true)
      lockDocumentScroll()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      openDialogCount = Math.max(0, openDialogCount - 1)
      if (openDialogCount === 0) {
        setApplicationInert(false)
        const restoreScroll = unlockDocumentScroll()
        if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true })
        if (restoreScroll) {
          window.requestAnimationFrame(() => window.scrollTo(restoreScroll.scrollX, restoreScroll.scrollY))
        }
      }
    }
  }, [isOpen, returnFocusRef])

  if (!isOpen) return null

  return createPortal(
    <div
      className={backdropClassName}
      data-ui="dialog-layer"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        closeRef.current?.()
      }}
      ref={backdropRef}
      role="presentation"
    >
      {asChild ? children : <section
        aria-label={showTitle ? undefined : title}
        aria-labelledby={showTitle ? titleId : undefined}
        aria-modal="true"
        className={dialogClassName}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        {showTitle ? <h2 id={titleId}>{title}</h2> : null}
        {children}
      </section>}
    </div>,
    document.body,
  )
}

