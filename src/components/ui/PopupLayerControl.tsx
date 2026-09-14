import type { DialogLayerProps } from './DialogLayerControl'
import { DialogLayer } from './DialogLayerControl'

export interface PopupLayerProps extends Omit<DialogLayerProps, 'asChild' | 'backdropClassName'> {
  className?: string
}


export function PopupLayer({ children, className = '', dialogClassName = '', focusKey, initialFocus, isOpen, onClose, returnFocusRef, showTitle = true, title }: PopupLayerProps) {
  return (
    <DialogLayer
      backdropClassName={className}
      dialogClassName={dialogClassName}
      focusKey={focusKey}
      initialFocus={initialFocus}
      isOpen={isOpen}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      showTitle={showTitle}
      title={title}
    >
      {children}
    </DialogLayer>
  )
}

