import { useLayoutEffect, useRef } from 'react'
import type { Location, NavigationType } from 'react-router'

interface ScrollPosition {
  left: number
  top: number
}

interface PageScrollPosition {
  window: ScrollPosition
  region: ScrollPosition
}

const origin: ScrollPosition = { left: 0, top: 0 }
const regionSelector = '[data-route-scroll-region]'
const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '])

function readPosition(): PageScrollPosition {
  const region = document.querySelector<HTMLElement>(regionSelector)
  return {
    window: { left: window.scrollX, top: window.scrollY },
    region: region ? { left: region.scrollLeft, top: region.scrollTop } : origin,
  }
}

function restorePosition(position: PageScrollPosition) {
  window.scrollTo({ ...position.window, behavior: 'instant' })
  document.querySelector<HTMLElement>(regionSelector)?.scrollTo({ ...position.region, behavior: 'instant' })
  const current = readPosition()
  return Math.abs(current.window.top - position.window.top) <= 1
    && Math.abs(current.window.left - position.window.left) <= 1
    && Math.abs(current.region.top - position.region.top) <= 1
    && Math.abs(current.region.left - position.region.left) <= 1
}

// Mount inside Suspense so restoration runs when the destination lazy route commits.
export function RouteScrollRestoration({ location, navigationType }: { location: Location; navigationType: NavigationType }) {
  const positions = useRef(new Map<string, PageScrollPosition>())
  const previousPath = useRef<string | null>(null)

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    const saved = positions.current.get(location.key)
    const shouldReset = previousPath.current !== location.pathname
    previousPath.current = location.pathname
    const target = navigationType === 'POP'
      ? saved ?? { window: origin, region: origin }
      : shouldReset ? { window: origin, region: origin } : null
    let restoring = true
    let frame: number | undefined
    let timeout: number | undefined
    let resizeObserver: ResizeObserver | undefined
    let mutationObserver: MutationObserver | undefined

    const save = () => {
      if (!restoring) {
        const entries = [...positions.current.entries()].filter(([key]) => key !== location.key)
        positions.current = new Map([...entries.slice(-99), [location.key, readPosition()]])
      }
    }
    const stopRestoring = () => {
      restoring = false
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      if (timeout !== undefined) window.clearTimeout(timeout)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      save()
    }
    const restore = () => {
      frame = undefined
      if (target === null || restorePosition(target)) stopRestoring()
    }
    const scheduleRestore = () => {
      if (restoring && frame === undefined) frame = window.requestAnimationFrame(restore)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) stopRestoring()
    }
    // Record before leaving; effect cleanup runs after the old page DOM changes.
    const onScroll = (event: Event) => {
      if (event.target === document || (event.target instanceof HTMLElement && event.target.matches(regionSelector))) save()
    }

    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('click', save, true)
    restore()
    if (restoring) {
      // Queries and images may not yet provide enough height for the saved offset.
      resizeObserver = new ResizeObserver(scheduleRestore)
      const observeLayout = () => {
        resizeObserver?.observe(document.body)
        document.querySelectorAll(`main, ${regionSelector}`).forEach(element => resizeObserver?.observe(element))
      }
      observeLayout()
      mutationObserver = new MutationObserver(() => {
        observeLayout()
        scheduleRestore()
      })
      mutationObserver.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
      timeout = window.setTimeout(stopRestoring, 10_000)
      window.addEventListener('wheel', stopRestoring, { passive: true })
      window.addEventListener('touchstart', stopRestoring, { passive: true })
      window.addEventListener('pointerdown', stopRestoring, { passive: true })
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      if (timeout !== undefined) window.clearTimeout(timeout)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('click', save, true)
      window.removeEventListener('wheel', stopRestoring)
      window.removeEventListener('touchstart', stopRestoring)
      window.removeEventListener('pointerdown', stopRestoring)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [location.key, location.pathname, navigationType])

  return null
}
