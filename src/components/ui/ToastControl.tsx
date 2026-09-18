import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

// Keep the shared RCPC toast appearance here, isolated from page layout styles.
const toastStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(32,32,32,.92)',
  borderRadius: 5,
  bottom: 28,
  boxSizing: 'border-box',
  color: 'white',
  display: 'flex',
  fontSize: 13,
  justifyContent: 'center',
  left: '50%',
  lineHeight: 1.5,
  margin: 0,
  maxWidth: 'calc(100vw - 32px)',
  minWidth: 240,
  padding: '12px 18px',
  position: 'fixed',
  textAlign: 'center',
  transform: 'translateX(-50%)',
  whiteSpace: 'normal',
  width: 'max-content',
  zIndex: 1200,
}

const toastDuration = 3000
const motionDuration = 180
let nextToastKey = 0
let activeToastKey = 0
const toastListeners = new Set<() => void>()

function subscribeToToast(listener: () => void) {
  toastListeners.add(listener)
  return () => { toastListeners.delete(listener) }
}

const getActiveToastKey = () => activeToastKey
const getServerToastKey = () => 0

function activateToast(key: number) {
  // Older notices must not replace a newer event or reappear after it closes.
  if (key <= activeToastKey) return
  activeToastKey = key
  toastListeners.forEach(listener => listener())
}

/** A new event restarts the toast even when its message is unchanged. */
export function useToastMessage() {
  const [notification, setNotification] = useState({ message: '', revision: 0 })
  const setMessage = useCallback((message: string) => {
    setNotification({ message, revision: ++nextToastKey })
  }, [])
  return { message: notification.message, toastKey: notification.revision, setMessage }
}

function TimedToast({ message }: { message: string }) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations: Animation[] = []
    if (!reducedMotion.matches) {
      animations.push(element.animate([
        { opacity: 0, transform: 'translate(-50%, 8px)' },
        { opacity: 1, transform: 'translate(-50%, 0)' },
      ], { duration: motionDuration, easing: 'ease-out' }))
    }
    const exitTimer = window.setTimeout(() => {
      if (!reducedMotion.matches) {
        animations.push(element.animate([
          { opacity: 1, transform: 'translate(-50%, 0)' },
          { opacity: 0, transform: 'translate(-50%, 4px)' },
        ], { duration: motionDuration, easing: 'ease-in', fill: 'forwards' }))
      }
    }, toastDuration - motionDuration)
    const dismissTimer = window.setTimeout(() => setVisible(false), toastDuration)
    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(dismissTimer)
      animations.forEach(animation => animation.cancel())
    }
  }, [])

  if (!visible) return null
  return createPortal(
    <div ref={elementRef} data-ui="toast" role="status" aria-live="polite" aria-atomic="true" style={toastStyle}>{message}</div>,
    document.body,
  )
}

/** Style, lifetime and motion are shared by every toast caller. */
export function Toast({ message, toastKey }: { message?: string | null; toastKey: number }) {
  const activeKey = useSyncExternalStore(subscribeToToast, getActiveToastKey, getServerToastKey)
  useLayoutEffect(() => {
    if (message) activateToast(toastKey)
  }, [message, toastKey])
  if (!message || activeKey !== toastKey) return null
  return <TimedToast key={`${toastKey}:${message}`} message={message}/>
}
