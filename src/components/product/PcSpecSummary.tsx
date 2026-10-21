import { useUiTranslation } from '@/i18n/uiTranslation'
import { Fragment } from 'react'

const coreLinePattern = /^(?:CORE|Core|코어 수): (?:([1-9]\d*) Cores?|-)$/u
const missingCoreLinePattern = /^(?:CORE|Core|코어 수):\s*-$/u

/** Join PC summary groups for display without rewriting stored specifications. */
export function PcSpecSummary({ text, fallback = '-', layout = 'inline' }: {
  text: string | null | undefined
  fallback?: string
  layout?: 'lines' | 'inline'
}) {
  const { uiText } = useUiTranslation()
  const lines = (text ?? '').split('\n').filter(line => !missingCoreLinePattern.test(line.trim()))
  const shown = lines.some(line => line.trim() && line.trim() !== '-') ? lines : [fallback]
  const inline = layout === 'inline'
  const displayed = inline ? shown.filter(line => line.trim()) : shown
  return <span className={`pc-spec-summary${inline ? ' pc-spec-summary--inline' : ''}`}>{displayed.map((line, index) => <Fragment key={index}>
    {inline && index > 0 ? ' / ' : null}
    <span className="pc-spec-summary__line">
      {coreLinePattern.test(line)
        ? <>{!inline && <>{uiText('Core')}: </>}<span className="notranslate" translate="no">{line.slice(line.indexOf(': ') + 2)}</span></>
        : line}
    </span>
  </Fragment>)}</span>
}
