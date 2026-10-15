import { useEffect, useRef, useState } from 'react'

/** CSS-hidden desktop/mobile copies must not fetch connection information. */
export function useVisibleConnection() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof globalThis.IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => {
        setVisible(entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0))
      })
      observer.observe(element)
      return () => observer.disconnect()
    }
    const update = () => {
      const bounds = element.getBoundingClientRect()
      setVisible(element.getClientRects().length > 0 && bounds.width > 0 && bounds.height > 0
        && bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [])
  return { ref, visible }
}
