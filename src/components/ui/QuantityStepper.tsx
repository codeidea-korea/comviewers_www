import { useUiTranslation } from '@/i18n/uiTranslation'
import addIcon from '@/assets/figma/icon-add.svg'
import removeIcon from '@/assets/figma/icon-remove.svg'

type Props = {
  label: string
  value: number | null
  minimum: number | null
  maximum: number | null
  unit: string
  onChange: (value: number) => void
  disabled?: boolean
  showLabel?: boolean
}

export function QuantityStepper({ label, value, minimum, maximum, unit, onChange, disabled = false, showLabel = true }: Props) {
  const { uiText } = useUiTranslation()
  const available = !disabled && value !== null && minimum !== null && maximum !== null && minimum <= maximum
  const change = (delta: number) => {
    if (available) onChange(Math.max(minimum, Math.min(maximum, value + delta)))
  }
  return <div className="quantity-control" role="group" aria-label={uiText(label)}>
    {showLabel && <span>{uiText(label)}</span>}
    <button aria-label={uiText('{label} 줄이기', { label: uiText(label) })} disabled={!available || value <= minimum} onClick={() => change(-1)} type="button"><img alt="" src={removeIcon} /></button>
    <strong aria-live="polite">{value ?? '—'}</strong>
    <button aria-label={uiText('{label} 늘리기', { label: uiText(label) })} disabled={!available || value >= maximum} onClick={() => change(1)} type="button"><img alt="" src={addIcon} /></button>
    <span>{uiText(unit)}</span>
  </div>
}
