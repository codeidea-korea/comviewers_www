import type { ChangeEventHandler, MouseEventHandler, ReactNode } from 'react'
import { Checkbox } from './CheckboxControl'

export interface SelectionToolbarProps {
  checked: boolean
  className?: string
  indeterminate?: boolean
  onChange: ChangeEventHandler<HTMLInputElement>
  onRemove?: MouseEventHandler<HTMLButtonElement>
  removeDisabled?: boolean
  removeLabel?: string
  children?: ReactNode
}

export function SelectionToolbar({ checked, children, className = '', indeterminate = false, onChange, onRemove, removeDisabled = false, removeLabel = '선택 삭제' }: SelectionToolbarProps) {
  return <div className={`selection-toolbar${className ? ` ${className}` : ''}`}>
    <Checkbox checked={checked} indeterminate={indeterminate} onChange={onChange} visualClassName="">모두선택</Checkbox>
    {children}
    <button disabled={removeDisabled} onClick={onRemove} type="button">{removeLabel}</button>
  </div>
}

