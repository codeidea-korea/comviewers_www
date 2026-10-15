import type { ChangeEventHandler, MouseEventHandler, ReactNode } from 'react'
import { Checkbox } from './CheckboxControl'
import { TranslatedText } from '@/i18n/translation'

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
    <Checkbox checked={checked} indeterminate={indeterminate} onChange={onChange} visualClassName=""><TranslatedText id="cart.selectAll" /></Checkbox>
    {children}
    <button disabled={removeDisabled} onClick={onRemove} type="button">{removeLabel === '선택 삭제' ? <TranslatedText id="cart.removeSelected" /> : removeLabel}</button>
  </div>
}

