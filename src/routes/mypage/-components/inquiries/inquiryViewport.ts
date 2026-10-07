import { useEffect, useState } from 'react'

export function isMobileInquiryViewport() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches
}

export function useMobileInquiryViewport() {
  const [mobile, setMobile] = useState(isMobileInquiryViewport)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(max-width: 767px)')
    const update = (event: MediaQueryListEvent) => setMobile(event.matches)
    setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return mobile
}
