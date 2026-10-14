import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Button } from '@/components/ui/ButtonControl'
import { Modal } from '@/components/ui/ModalControl'
import type { MyRcpcItem } from '@/api/myRcpc'
import { InquiryDialog } from './InquiryDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'
import { managerScopedPath } from '../managerPortalPath'
import { isMobileInquiryViewport } from './inquiryViewport'
import { loadAuthorizedRcpcs } from '../rcpcPresentation'
import { bulkInquiryServerRoomNotice, hasSameInquiryServerRoom } from '../inquiryServerRoomScope'

export function InquiryAction({ initialIds = [], initialTargets = [], initialProductNo = '', fixedTarget = false, requestId, disabled = false, appearance = 'button', className, children = '문의', onCreated }: {
  initialIds?: readonly number[]
  initialTargets?: readonly Pick<MyRcpcItem, 'pcAssetId' | 'serverRoomId' | 'serverRoomBusinessKey'>[]
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
  const [notice, setNotice] = useState('')
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
      if (!hasSameInquiryServerRoom(targets.filter(target => target !== undefined))) throw new Error(bulkInquiryServerRoomNotice)
    },
  })
  const unavailable = disabled || check.isPending || !myAccount.inquiryApi || (requestId === undefined && !myAccount.rcpcApi)
  const openInquiry = () => {
    if (unavailable) return
    setNotice('')
    if (requestId !== undefined && isMobileInquiryViewport()) {
      navigate(managerScopedPath(`/mypage/inquiries/${requestId}`, location.pathname))
      return
    }
    if (requestId === undefined && initialIds.length > 1) {
      const ids = [...initialIds]
      const knownTargets = initialTargets.filter(target => ids.includes(target.pcAssetId))
      if (knownTargets.length > 1 && !hasSameInquiryServerRoom(knownTargets)) {
        setNotice(bulkInquiryServerRoomNotice)
        return
      }
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
    <Modal isOpen={Boolean(notice)} title={notice === bulkInquiryServerRoomNotice ? '일괄 문의 불가' : '문의 접수 안내'} showClose={false} onClose={() => setNotice('')} onConfirm={() => setNotice('')}>
      <p>{notice}</p>
    </Modal>
    {appearance === 'text'
      ? <button aria-busy={check.isPending} className={`inquiry-action-link${className ? ` ${className}` : ''}`} disabled={unavailable} onClick={openInquiry} type="button">{check.isPending ? '확인 중…' : children}</button>
      : <Button aria-busy={check.isPending} className={className} disabled={unavailable} onClick={openInquiry} size="small" variant="secondary">{check.isPending ? '확인 중…' : children}</Button>}
    {open && myAccount.inquiryApi && (requestId !== undefined
      ? <InquiryConversationDialog api={myAccount.inquiryApi} id={requestId} onClose={() => setOpen(false)} />
      : myAccount.rcpcApi ? <InquiryDialog api={myAccount.inquiryApi} rcpcApi={myAccount.rcpcApi} initialIds={openedIds} initialProductNo={initialProductNo} fixedTarget={fixedTarget} onClose={() => setOpen(false)} onCreated={onCreated} /> : null)}
  </>
}
