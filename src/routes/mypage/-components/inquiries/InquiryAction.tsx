import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Button } from '@/components/ui/ButtonControl'
import { InquiryDialog } from './InquiryDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'
import { managerScopedPath } from '../managerPortalPath'
import { isMobileInquiryViewport } from './inquiryViewport'

export function InquiryAction({ initialIds = [], initialProductNo = '', fixedTarget = false, requestId, disabled = false, appearance = 'button', className, children = '문의' }: {
  initialIds?: readonly number[]
  initialProductNo?: string
  fixedTarget?: boolean
  requestId?: number
  disabled?: boolean
  appearance?: 'button' | 'text'
  className?: string
  children?: ReactNode
}) {
  const { myAccount } = useServices()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const unavailable = disabled || !myAccount.inquiryApi || (requestId === undefined && !myAccount.rcpcApi)
  const openInquiry = () => {
    if (requestId !== undefined && isMobileInquiryViewport()) {
      navigate(managerScopedPath(`/mypage/inquiries/${requestId}`, location.pathname))
      return
    }
    setOpen(true)
  }
  return <>
    {appearance === 'text'
      ? <button className={`inquiry-action-link${className ? ` ${className}` : ''}`} disabled={unavailable} onClick={openInquiry} type="button">{children}</button>
      : <Button className={className} disabled={unavailable} onClick={openInquiry} size="small" variant="secondary">{children}</Button>}
    {open && myAccount.inquiryApi && (requestId !== undefined
      ? <InquiryConversationDialog api={myAccount.inquiryApi} id={requestId} onClose={() => setOpen(false)} />
      : myAccount.rcpcApi ? <InquiryDialog api={myAccount.inquiryApi} rcpcApi={myAccount.rcpcApi} initialIds={initialIds} initialProductNo={initialProductNo} fixedTarget={fixedTarget} onClose={() => setOpen(false)} /> : null)}
  </>
}
