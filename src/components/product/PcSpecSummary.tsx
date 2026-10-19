import { CpuCoreBadge } from './CpuCoreBadge'

const coreLinePattern = /^(?:CORE|Core|코어 수): (?:([1-9]\d*) Cores?|-)$/u

/** Render explicit specification lines without splitting historic summaries or authored descriptions. */
export function PcSpecSummary({ text, fallback = '-', showMissingCores = false }: {
  text: string | null | undefined
  fallback?: string
  showMissingCores?: boolean
}) {
  const lines = (text || fallback).split('\n')
  const hasCores = lines.some(line => coreLinePattern.test(line))
  const shown = showMissingCores && !hasCores ? [...lines, 'Core: -'] : lines
  return <span className="pc-spec-summary">{shown.map((line, index) => {
    const cores = coreLinePattern.exec(line)
    return <span className={`pc-spec-summary__line${cores ? ' pc-spec-summary__line--cores notranslate' : ''}`} key={index} translate={cores ? 'no' : undefined}>
      {cores ? <>CORE <CpuCoreBadge value={cores[1] ? Number(cores[1]) : null} /></> : line}
    </span>
  })}</span>
}
