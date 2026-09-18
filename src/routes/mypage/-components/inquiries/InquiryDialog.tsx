import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { InquiryCreateDialog } from '../InquiryCreateDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'

export function InquiryDialog({ api, rcpcApi, initialIds = [], initialProductNo = '', onClose, onCreated }: {
  api: InquiryReadServices
  rcpcApi: MyRcpcReadServices
  initialIds?: readonly number[]
  initialProductNo?: string
  onClose: () => void
  onCreated?: () => void
}) {
  const client = useQueryClient()
  const [createdId, setCreatedId] = useState<number | null>(null)
  if (createdId !== null) return <InquiryConversationDialog api={api} id={createdId} onClose={onClose} />
  return <InquiryCreateDialog api={api} rcpcApi={rcpcApi} initialIds={initialIds} initialProductNo={initialProductNo} onClose={onClose} onCreated={async id => {
    setCreatedId(id)
    onCreated?.()
    await client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] })
  }} />
}
