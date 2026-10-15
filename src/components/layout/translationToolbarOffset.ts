const toolbarSelector = 'iframe.goog-te-banner-frame, iframe.skiptranslate'
const offsetProperty = '--google-trial-bar-height'

function visibleToolbarBottom(frame: HTMLIFrameElement) {
  const rect = frame.getBoundingClientRect()
  const style = window.getComputedStyle(frame)
  // Ignore Google's floating menus/tooltips and frames hidden with their parent.
  if (style.visibility === 'hidden' || style.display === 'none' || rect.height <= 0
    || rect.width < document.documentElement.clientWidth / 2 || rect.top > 1) return 0
  return Math.max(0, rect.bottom)
}

/** Keep fixed/sticky UI below Google's banner without reading cross-origin content. */
export function trackTranslationToolbarOffset() {
  let animationFrame = 0
  let previousOffset: number | undefined
  let observedFrames: readonly HTMLIFrameElement[] = []
  const sync = () => {
    animationFrame = 0
    const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>(toolbarSelector))
    if (frames.length !== observedFrames.length || frames.some((frame, index) => frame !== observedFrames[index])) {
      resizeObserver.disconnect()
      frames.forEach(frame => resizeObserver.observe(frame))
      observedFrames = frames
    }
    // Before a banner frame is inserted, retain Google's original body offset.
    const offset = frames.length
      ? Math.max(0, ...frames.map(visibleToolbarBottom))
      : Math.max(0, Number.parseFloat(document.body.style.top) || 0)
    if (offset === previousOffset) return
    previousOffset = offset
    document.documentElement.style.setProperty(offsetProperty, `${offset}px`)
  }
  const scheduleSync = () => {
    if (!animationFrame) animationFrame = window.requestAnimationFrame(sync)
  }
  const resizeObserver = new ResizeObserver(scheduleSync)
  const mutationObserver = new MutationObserver(scheduleSync)
  mutationObserver.observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'],
  })
  window.addEventListener('resize', scheduleSync)
  window.visualViewport?.addEventListener('resize', scheduleSync)
  window.visualViewport?.addEventListener('scroll', scheduleSync)
  sync()
  return () => {
    window.cancelAnimationFrame(animationFrame)
    mutationObserver.disconnect()
    resizeObserver.disconnect()
    window.removeEventListener('resize', scheduleSync)
    window.visualViewport?.removeEventListener('resize', scheduleSync)
    window.visualViewport?.removeEventListener('scroll', scheduleSync)
    document.documentElement.style.removeProperty(offsetProperty)
  }
}
