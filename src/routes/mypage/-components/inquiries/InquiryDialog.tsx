import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { InquiryCreateDialog } from '../InquiryCreateDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'
import { managerScopedPath } from '../managerPortalPath'
import { isMobileInquiryViewport } from './inquiryViewport'

export function InquiryDialog({ api, rcpcApi, initialIds = [], initialProductNo = '', fixedTarget = false, onClose, onCreated }: {
  api: InquiryReadServices
  rcpcApi: MyRcpcReadServices
  initialIds?: readonly number[]
  initialProductNo?: string
  fixedTarget?: boolean
  onClose: () => void
  onCreated?: () => void
}) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [createdId, setCreatedId] = useState<number | null>(null)
  if (createdId !== null) return <InquiryConversationDialog api={api} id={createdId} onClose={onClose} />
  return <InquiryCreateDialog api={api} rcpcApi={rcpcApi} initialIds={initialIds} initialProductNo={initialProductNo} fixedTarget={fixedTarget} onClose={onClose} onCreated={async id => {
    onCreated?.()
    if (isMobileInquiryViewport()) {
      onClose()
      navigate(managerScopedPath(`/mypage/inquiries/${id}`, location.pathname))
      void client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] })
      return
    }
    setCreatedId(id)
    await client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] })
  }} />
}
