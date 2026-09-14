import type { RefObject } from 'react'

export interface InquiryTarget {
  rcpcId: string | number
  selectionId?: string
  orderId?: string | number
  alias?: string
  location?: string
}

export type InquiryStep = 'selection-required' | 'select-type' | 'write' | null

export interface InquiryComposer {
  pending?: boolean
  notice?: string
  message: string
  sentMessages: readonly string[]
  onMessageChange: (message: string) => void
  onSend: () => void
}

export interface InquiryFlowDialogProps {
  step: InquiryStep
  rcpcs: readonly InquiryTarget[]
  typeIndex: number | null
  onClose: () => void
  onTypeChange: (index: number) => void
  onNext: () => void
  onBack: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
  composer: InquiryComposer
}
