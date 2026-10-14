import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { NativeSelect } from '@/components/ui/SelectControl'
import './rcpc-list-controls.css'

export function RcpcFilterSelect(props: ComponentProps<typeof NativeSelect>) {
  const options = Children.toArray(props.children).filter(child => isValidElement<{ value?: string | number; children?: ReactNode }>(child) && child.type === 'option')
  const selected = options.find(option => isValidElement<{ value?: string | number }>(option) && String(option.props.value ?? '') === String(props.value ?? props.defaultValue ?? ''))
  const label = isValidElement<{ children?: ReactNode }>(selected) ? selected.props.children : null
  return <span className="rcpc-filter-select"><span aria-hidden="true" className="rcpc-filter-select__label">{label}</span><NativeSelect {...props}/><i aria-hidden="true" /></span>
}
