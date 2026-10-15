import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { NativeSelect } from '@/components/ui/SelectControl'
import './rcpc-list-controls.css'

export function RcpcFilterSelect(props: ComponentProps<typeof NativeSelect>) {
  const options = Children.toArray(props.children).filter(child => isValidElement<{ value?: string | number; children?: ReactNode }>(child) && child.type === 'option')
  const defaultOption = options.find(option => isValidElement<{ value?: string | number }>(option) && option.props.value === '') ?? options[0]
  const firstOption = props.options?.[0]
  const label = props.placeholder?.label
    ?? (isValidElement<{ children?: ReactNode }>(defaultOption) ? defaultOption.props.children : null)
    ?? (typeof firstOption === 'string' ? firstOption : firstOption?.label)
  return <span className="rcpc-filter-select"><span aria-hidden="true" className="rcpc-filter-select__label">{label}</span><NativeSelect {...props}/><i aria-hidden="true" /></span>
}
