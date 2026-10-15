import { useLayoutEffect, useRef } from 'react'

const termHeadingPattern = /^(제 ?\d+ ?장|제 ?\d+ ?조|제\d+조|부칙$)/

/** Google owns the paragraph nodes; React only owns the surrounding region. */
export function SignupTermsCopy({ content, label }: { content: string; label: string }) {
  const region = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = region.current
    if (!container) return
    const paragraphs = content.split('\n').map((paragraph) => {
      const element = document.createElement('p')
      if (termHeadingPattern.test(paragraph)) {
        const heading = document.createElement('strong')
        heading.textContent = paragraph
        element.appendChild(heading)
      } else {
        element.textContent = paragraph || '\u00a0'
      }
      return element
    })
    container.replaceChildren(...paragraphs)
    container.dataset.translationContentReady = 'true'
  }, [content])

  return <div aria-label={label} className="terms-copy" lang="ko" ref={region} role="region" tabIndex={0} translate="yes" />
}
