import type { RefObject } from 'react'
import { useLayoutEffect } from 'react'

interface DatePickerPopoverOptions {
  open: boolean
  triggerRef: RefObject<HTMLButtonElement | null>
  panelRef: RefObject<HTMLDivElement | null>
  onDismiss: () => void
}

export function useDatePickerPopover({ open, triggerRef, panelRef, onDismiss }: DatePickerPopoverOptions) {
  useLayoutEffect(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!open || !trigger || !panel) return

    const hasPopover = typeof panel.showPopover === 'function'
    if (hasPopover) panel.showPopover()
    // Older browsers still get an operable inline calendar.
    else panel.setAttribute('data-inline', '')

    const position = () => {
      if (!hasPopover) return
      const anchor = trigger.getBoundingClientRect()
      const viewport = window.visualViewport
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8
      const topEdge = (viewport?.offsetTop ?? 0) + 8
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 16
      const width = Math.min(304, rightEdge - leftEdge)
      panel.style.width = `${width}px`
      panel.style.maxHeight = `${bottomEdge - topEdge}px`
      const height = panel.getBoundingClientRect().height
      const below = anchor.bottom + 4
      const top = below + height <= bottomEdge ? below : anchor.top - height - 4
      panel.style.left = `${Math.max(leftEdge, Math.min(anchor.left, rightEdge - width))}px`
      panel.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - height))}px`
    }
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !trigger.contains(event.target)) onDismiss()
    }
    const toggle = () => {
      if (hasPopover && !panel.matches(':popover-open')) onDismiss()
    }
    position()
    panel.querySelector<HTMLElement>('[data-active-date]')?.focus({ preventScroll: true })
    const resizeObserver = new ResizeObserver(position)
    resizeObserver.observe(panel)
    resizeObserver.observe(trigger)
    panel.addEventListener('toggle', toggle)
    document.addEventListener('pointerdown', dismissOutside)
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      resizeObserver.disconnect()
      panel.removeEventListener('toggle', toggle)
      document.removeEventListener('pointerdown', dismissOutside)
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
      if (hasPopover && panel.matches(':popover-open')) panel.hidePopover()
    }
  }, [open, triggerRef, panelRef, onDismiss])
}
