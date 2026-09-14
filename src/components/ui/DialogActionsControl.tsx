import type { ReactNode } from 'react'

export interface DialogActionsProps {
  children?: ReactNode
  className?: string
}

export function DialogActions({ children, className = '' }: DialogActionsProps) {
  return <footer className={`dialog-actions${className ? ` ${className}` : ''}`}>{children}</footer>
}

