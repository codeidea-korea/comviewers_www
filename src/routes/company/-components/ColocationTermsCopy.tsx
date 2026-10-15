import { useLayoutEffect, useRef } from 'react'

/** Google owns only these public policy nodes; form rerenders do not replace them. */
export function ColocationTermsCopy({ content, label }: { content: string; label: string }) {
  const region = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const container = region.current
    if (!container) return
    container.textContent = content
    container.dataset.translationContentReady = 'true'
  }, [content])

  return <div aria-label={label} className="colocation-terms-box" ref={region} role="region" tabIndex={0} translate="yes" style={{ whiteSpace: 'pre-wrap' }} />
}
