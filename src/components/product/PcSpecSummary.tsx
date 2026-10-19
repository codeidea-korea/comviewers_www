import { useUiTranslation } from '@/i18n/uiTranslation'
import { Fragment } from 'react'

const coreLinePattern = /^(?:CORE|Core|코어 수): (?:([1-9]\d*) Cores?|-)$/u

/** Render explicit specification lines without splitting historic summaries or authored descriptions. */
export function PcSpecSummary({ text, fallback = '-', showMissingCores = false, layout = 'lines' }: {
  text: string | null | undefined
  fallback?: string
  showMissingCores?: boolean
  layout?: 'lines' | 'inline'
}) {
  const { uiText } = useUiTranslation()
  const lines = (text || fallback).split('\n')
  const hasCores = lines.some(line => coreLinePattern.test(line))
  const shown = showMissingCores && !hasCores ? [...lines, 'Core: -'] : lines
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
