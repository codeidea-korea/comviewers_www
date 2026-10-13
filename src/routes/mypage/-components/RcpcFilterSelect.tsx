import type { ComponentProps } from 'react'
import { NativeSelect } from '@/components/ui/SelectControl'
import './rcpc-list-controls.css'

export function RcpcFilterSelect(props: ComponentProps<typeof NativeSelect>) {
  return <span className="rcpc-filter-select"><NativeSelect {...props}/><i aria-hidden="true" /></span>
}
