import { useState, type ReactNode } from 'react'
import { useServices } from '@/app/ServiceProvider'
import { Button } from '@/components/ui/ButtonControl'
import { InquiryDialog } from './InquiryDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'

export function InquiryAction({ initialIds = [], initialProductNo = '', requestId, disabled = false, appearance = 'button', className, children = '문의' }: {
  initialIds?: readonly number[]
  initialProductNo?: string
  requestId?: number
  disabled?: boolean
  appearance?: 'button' | 'text'
  className?: string
  children?: ReactNode
}) {
  const { myAccount } = useServices()
  const [open, setOpen] = useState(false)
  const unavailable = disabled || !myAccount.inquiryApi || (requestId === undefined && !myAccount.rcpcApi)
  return <>
    {appearance === 'text'
      ? <button className={`inquiry-action-link${className ? ` ${className}` : ''}`} disabled={unavailable} onClick={() => setOpen(true)} type="button">{children}</button>
      : <Button className={className} disabled={unavailable} onClick={() => setOpen(true)} size="small" variant="secondary">{children}</Button>}
    {open && myAccount.inquiryApi && (requestId !== undefined
      ? <InquiryConversationDialog api={myAccount.inquiryApi} id={requestId} onClose={() => setOpen(false)} />
      : myAccount.rcpcApi ? <InquiryDialog api={myAccount.inquiryApi} rcpcApi={myAccount.rcpcApi} initialIds={initialIds} initialProductNo={initialProductNo} onClose={() => setOpen(false)} /> : null)}
  </>
}
