import { useEffect, useRef } from 'react'

let openOverlayCount = 0

export function useMobileOverlay(open: boolean, onEscape?: () => void) {
  const onEscapeRef = useRef(onEscape)

  useEffect(() => { onEscapeRef.current = onEscape }, [onEscape])

  useEffect(() => {
    if (!open) return undefined

    openOverlayCount += 1
    document.body.classList.add('mobile-overlay-open')
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscapeRef.current?.()
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      openOverlayCount -= 1
      if (openOverlayCount === 0) document.body.classList.remove('mobile-overlay-open')
    }
  }, [open])
}
