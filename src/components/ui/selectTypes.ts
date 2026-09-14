import type { AriaAttributes, KeyboardEvent, MouseEventHandler, ReactNode, RefObject, SelectHTMLAttributes } from 'react'

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: readonly (string | SelectOption)[]
  placeholder?: { label: string; value?: string }
}

export interface DropdownSelectProps {
  className?: string
  controls?: string
  expanded?: boolean
  hasPopup?: AriaAttributes['aria-haspopup']
  label: ReactNode
  onToggle: MouseEventHandler<HTMLButtonElement>
  panel?: ReactNode
  triggerIcon?: ReactNode
  value: ReactNode
}

export interface DropdownOptionListProps {
  className?: string
  id?: string
  label: string
  onClose: () => void
  onSelect: (option: string) => void
  options: readonly string[]
  selected: string
}

export interface SelectGroup {
  label: string
  options: readonly (string | SelectOption)[]
}

export interface GroupedMultiSelectProps {
  ariaLabel: string
  chevronIcon: string
  className: string
  groups: readonly SelectGroup[]
  id: string
  onChange: (values: Set<string>) => void
  selectedValues: ReadonlySet<string>
  thumbTravel?: number
}

export interface DismissibleSelectProps {
  containerRef: RefObject<HTMLElement | null>
  isOpen: boolean
  onDismiss: (options: { restoreFocus: boolean }) => void
}

export type OptionKeyEvent = KeyboardEvent<HTMLButtonElement>
