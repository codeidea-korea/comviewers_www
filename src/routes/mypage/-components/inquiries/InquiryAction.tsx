import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Button } from '@/components/ui/ButtonControl'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { InquiryDialog } from './InquiryDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'
import { managerScopedPath } from '../managerPortalPath'
import { isMobileInquiryViewport } from './inquiryViewport'
import { loadAuthorizedRcpcs } from '../rcpcPresentation'
import { bulkInquiryBusinessNotice, hasSameInquiryBusiness } from '../inquiryBusinessScope'

export function InquiryAction({ initialIds = [], initialProductNo = '', fixedTarget = false, requestId, disabled = false, appearance = 'button', className, children = '문의', onCreated }: {
  initialIds?: readonly number[]
  initialProductNo?: string
  fixedTarget?: boolean
  requestId?: number
  disabled?: boolean
  appearance?: 'button' | 'text'
  className?: string
  children?: ReactNode
  onCreated?: () => void
}) {
  const { myAccount } = useServices()
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [openedIds, setOpenedIds] = useState<readonly number[]>(initialIds)
  const { message: notice, setMessage: setNotice, toastKey } = useToastMessage()
  const check = useMutation({
    mutationFn: async (ids: readonly number[]) => {
      const api = myAccount.rcpcApi
      if (!api) throw new Error('문의 대상 RCPC를 확인할 수 없습니다.')
      const items = await client.fetchQuery({
        queryKey: ['my-rcpcs', api.organizationId, 'authorized-options'],
        queryFn: ({ signal }) => loadAuthorizedRcpcs(api, signal),
      })
      const targets = [...new Set(ids)].map(id => items.find(item => item.pcAssetId === id))
      if (targets.some(target => !target)) throw new Error('문의 대상 RCPC를 확인할 수 없습니다.')
      if (!hasSameInquiryBusiness(targets.filter(target => target !== undefined))) throw new Error(bulkInquiryBusinessNotice)
    },
  })
  const unavailable = disabled || check.isPending || !myAccount.inquiryApi || (requestId === undefined && !myAccount.rcpcApi)
  const openInquiry = () => {
    if (unavailable) return
    if (requestId !== undefined && isMobileInquiryViewport()) {
      navigate(managerScopedPath(`/mypage/inquiries/${requestId}`, location.pathname))
      return
    }
    if (requestId === undefined && initialIds.length > 1) {
      const ids = [...initialIds]
      check.mutate(ids, {
        onSuccess: () => { setOpenedIds(ids); setOpen(true) },
        onError: error => setNotice(error.message),
      })
      return
    }
    setOpenedIds([...initialIds])
    setOpen(true)
  }
  return <>
    <Toast message={notice} toastKey={toastKey} />
    {appearance === 'text'
      ? <button className={`inquiry-action-link${className ? ` ${className}` : ''}`} disabled={unavailable} onClick={openInquiry} type="button">{children}</button>
      : <Button className={className} disabled={unavailable} onClick={openInquiry} size="small" variant="secondary">{children}</Button>}
    {open && myAccount.inquiryApi && (requestId !== undefined
      ? <InquiryConversationDialog api={myAccount.inquiryApi} id={requestId} onClose={() => setOpen(false)} />
      : myAccount.rcpcApi ? <InquiryDialog api={myAccount.inquiryApi} rcpcApi={myAccount.rcpcApi} initialIds={openedIds} initialProductNo={initialProductNo} fixedTarget={fixedTarget} onClose={() => setOpen(false)} onCreated={onCreated} /> : null)}
  </>
}
