import { useUiTranslation } from '@/i18n/uiTranslation'

const coreLinePattern = /^(?:CORE|Core|코어 수): (?:([1-9]\d*) Cores?|-)$/u

/** Render explicit specification lines without splitting historic summaries or authored descriptions. */
export function PcSpecSummary({ text, fallback = '-', showMissingCores = false }: {
  text: string | null | undefined
  fallback?: string
  showMissingCores?: boolean
}) {
  const { uiText } = useUiTranslation()
  const lines = (text || fallback).split('\n')
  const hasCores = lines.some(line => coreLinePattern.test(line))
  const shown = showMissingCores && !hasCores ? [...lines, 'Core: -'] : lines
  return <span className="pc-spec-summary">{shown.map((line, index) => <span className="pc-spec-summary__line" key={index}>
    {coreLinePattern.test(line)
      ? <>{uiText('Core')}: <span className="notranslate" translate="no">{line.slice(line.indexOf(': ') + 2)}</span></>
      : line}
  </span>)}</span>
}
