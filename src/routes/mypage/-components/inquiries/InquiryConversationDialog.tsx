import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { Button } from '@/components/ui/ButtonControl'
import { useSession } from '@/app/session/SessionProvider'
import modalClose from '@/assets/figma/inquiry-modal-close.svg'
import moreVertical from '@/assets/figma/comment-more-fill.svg'
import productThumb from '@/assets/figma/windows-card-render.png'
import { AccountQueryState } from '../AccountQueryState'
import { InquiryProductConversations } from '../InquiryProductConversations'
import { inquiryTypeLabel } from '../InquiryPresentation'
import { InquiryTargetAddition } from '../InquiryTargetAddition'
import { InquiryAttachments, InquiryAttachmentDownload, type InquiryDraftAttachment } from '../InquiryAttachments'
import { RefundDetail } from '../InquiryRefundRequests'

const customerStatusLabel = (value: string) => value === '처리 완료' ? '처리완료' : value

export function InquiryConversationDialog({ api, id, onClose }: { api: InquiryReadServices; id: number; onClose: () => void }) {
  const [activeId, setActiveId] = useState(id)
  return <InquiryChat key={`${api.organizationId}:${activeId}`} api={api} id={activeId} onClose={onClose} onSelectInquiry={setActiveId} />
}
function InquiryChat({ api, id, onClose, onSelectInquiry }: { api: InquiryReadServices; id: number; onClose: () => void; onSelectInquiry: (id: number) => void }) {
  const session = useSession()
  const isManager = session.status === 'authenticated' && session.role === 'C_MANAGER'
  const client = useQueryClient()

  const [message, setMessage] = useState('')
  const [messageId, setMessageId] = useState(() => `customer-web:${crypto.randomUUID()}`)
  const [readError, setReadError] = useState(false)
  const [files, setFiles] = useState<readonly InquiryDraftAttachment[]>([])
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  const [olderMessages, setOlderMessages] = useState<Awaited<ReturnType<InquiryReadServices['chat']>>['messages']>([])
  const [historyEnd, setHistoryEnd] = useState(false)
  const [productConversation, setProductConversation] = useState<string | null>(null)
  const [productMenuOpen, setProductMenuOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const lastRead = useRef(0)
  const chatKey = useMemo(() => ['operation-requests', api.organizationId, 'chat', id] as const, [api.organizationId, id])
  // The stream only wakes the cached REST query. A minute fallback covers intermediaries that
  // silently drop long-lived SSE connections without exposing chat content in the stream itself.
  const chat = useQuery({ queryKey: chatKey, queryFn: ({ signal }) => api.chat(id, 100, signal), refetchInterval: 60_000, refetchIntervalInBackground: false })
  const requestInfo = useQuery({ queryKey: ['operation-requests', api.organizationId, 'info', id], queryFn: ({ signal }) => api.list({ requestId: id, size: 1 }, signal) })
  const refundLink = useQuery({ queryKey: ['my-refund-requests', api.organizationId, 'operation-request', id], queryFn: ({ signal }) => api.refundsForOperationRequest(id, signal), enabled: !isManager && requestInfo.data?.items[0]?.requestType === 'refund_cancel' })
  const refund = refundLink.data?.items.find((item) => item.operationRequestId === id)
  const closed = chat.data?.operationRequest.customerVisibleStatus === '처리 완료' || ['completed', 'cancelled'].includes(chat.data?.operationRequest.status ?? '')
  const messages = [...new Map([...olderMessages, ...(chat.data?.messages ?? [])].map((item) => [item.id, item])).values()]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id - right.id)
  const earlier = useMutation({ mutationFn: () => api.chat(id, 100, undefined, messages[0]?.id), onSuccess: (response) => {
    setOlderMessages((previous) => [...new Map([...response.messages, ...previous, ...(chat.data?.messages ?? [])].map((item) => [item.id, item])).values()])
    setHistoryEnd(response.messages.length < 100)
  } })
  const lastId = Math.max(0, ...(chat.data?.messages.map((item) => item.id) ?? []))
  useEffect(() => api.subscribeChatEvents(id, () => {
    void client.invalidateQueries({ queryKey: chatKey })
    void client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] })
  }), [api, api.organizationId, chatKey, client, id])
  useEffect(() => {
    if (!lastId || lastId <= lastRead.current) return
    const controller = new AbortController()
    void api.markRead(id, lastId, controller.signal).then(() => { lastRead.current = lastId; setReadError(false) }).catch(() => { if (!controller.signal.aborted) setReadError(true) })
    return () => controller.abort()
  }, [api, id, lastId])
  const send = useMutation({ mutationFn: () => api.sendMessage(id, message, messageId, files.map((file) => file.attachmentId)), onSuccess: async (response) => {
    setMessage(''); setFiles([]); setMessageId(`customer-web:${crypto.randomUUID()}`)
    client.setQueryData(chatKey, response)
    await client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] })
  } })
  const submit = () => { if ((message.trim() || files.length) && !closed && !send.isPending && !attachmentBusy) send.mutate() }
  const close = onClose
  const type = requestInfo.data?.items[0] ? inquiryTypeLabel(requestInfo.data.items[0].requestType) : '문의'
  return <DialogLayer asChild backdropClassName="inquiry-preview-layer inquiry-detail-preview" isOpen onClose={close} showTitle={false} title="문의 상세">
    <section aria-modal="true" className={`inquiry-preview-dialog inquiry-chat${closed ? ' inquiry-chat--complete' : ''}`} role="dialog" tabIndex={-1}>
      <header>
        {chat.data ? <InquiryTargetAddition api={api} requestId={id} existingIds={chat.data.operationRequest.targets.flatMap((target) => target.pcAssetId === null ? [] : [target.pcAssetId])} total={chat.data.operationRequest.targets.length} closed={closed}/> : <span/>}
        <h2>[{chat.data ? customerStatusLabel(chat.data.operationRequest.customerVisibleStatus) : '조회 중'}] {type}</h2>
        <button aria-expanded={productMenuOpen} aria-label="문의 상품 보기" className="inquiry-chat__products-trigger" disabled={!chat.data?.operationRequest.targets.length} onClick={() => setProductMenuOpen((open) => !open)} type="button"><img alt="" src={moreVertical}/></button>
        <button aria-label="닫기" onClick={close} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose}/></button>
      </header>
      {productMenuOpen && chat.data ? <div className="inquiry-chat__products-menu" role="menu"><strong>문의 상품 {chat.data.operationRequest.targets.length}개</strong>{chat.data.operationRequest.targets.map((target, index) => <button disabled={!target.productNo} key={`${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`} onClick={() => { if (target.productNo) { setProductMenuOpen(false); setProductConversation(target.productNo) } }} role="menuitem" type="button"><span>{target.productNo ? `${target.alias ? `${target.alias}·` : ''}${target.productNo}` : '상품 정보 없음'}</span><small>{target.serverRoomName ?? '서버실 정보 없음'}</small></button>)}</div> : null}
      <div className="inquiry-chat__scroll">
        <AccountQueryState pending={chat.isPending || requestInfo.isPending} error={chat.error ?? requestInfo.error} retry={() => Promise.all([chat.refetch(), requestInfo.refetch()])}/>
        {chat.data && requestInfo.data ? <>
          {requestInfo.data?.items[0] ? <time>{new Date(requestInfo.data.items[0].createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</time> : null}
          {chat.data.operationRequest.targets.map((target, index) => <article className="inquiry-chat__product" key={`${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`}>
            <span>문의 상품</span><img alt="RCPC 상품" src={productThumb}/><div><button type="button" onClick={() => target.productNo && setProductConversation(target.productNo)}>{target.productNo ? `${target.alias ? `${target.alias}·` : ''}${target.productNo}` : '상품 정보 없음'}</button><em>{target.serverRoomName ?? '서버실 정보 없음'}</em></div>
          </article>)}
          {!isManager && requestInfo.data?.items[0]?.requestType === 'refund_cancel' ? <><AccountQueryState pending={refundLink.isPending} error={refundLink.error} retry={refundLink.refetch}/>{refund ? <button className="inquiry-chat__refund-action" onClick={() => setRefundOpen(true)} type="button">{refund.status === 'requested' ? '해지 신청 상세 / 철회' : '해지 신청 상세'}</button> : refundLink.data ? <p className="inquiry-chat__system">연결된 해지 신청 내역이 없습니다.</p> : null}</> : null}
          {!historyEnd && (olderMessages.length > 0 || chat.data.messages.length >= 100) ? <button className="inquiry-chat__earlier" type="button" disabled={earlier.isPending} onClick={() => earlier.mutate()}>{earlier.isPending ? '불러오는 중…' : '이전 대화 더보기'}</button> : null}
          {earlier.isError ? <p role="alert">이전 대화를 불러오지 못했습니다. 다시 시도해 주세요.</p> : null}
          {messages.map((item) => {
            const isMine = session.status === 'authenticated' && item.authorType === 'customer'
              && item.authorUserId !== null && String(item.authorUserId) === session.userId
            return <article className={isMine ? 'inquiry-chat__message is-mine' : 'inquiry-chat__message'} key={item.id}>
              {!isMine && <small>{item.authorDisplayName ?? item.authorType}</small>}
              <p>{item.content}</p>
              <time>{new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}</time>
              {item.attachments.map((attachment) => <InquiryAttachmentDownload key={attachment.id} api={api} requestId={id} attachment={attachment}/>)}
            </article>
          })}
          {!messages.length ? <p className="inquiry-chat__system">등록된 메시지가 없습니다.</p> : null}
          {readError ? <p role="alert">읽음 상태를 반영하지 못했습니다. <button type="button" onClick={() => { void api.markRead(id, lastId).then(() => { lastRead.current = lastId; setReadError(false) }).catch(() => setReadError(true)) }}>다시 시도</button></p> : null}
        </> : null}
      </div>
      {productConversation && <InquiryProductConversations key={productConversation} api={api} requestId={id} productNo={productConversation} onSelect={onSelectInquiry} onClose={() => setProductConversation(null)}/>}
      {refundOpen && refund ? <RefundDetail key={refund.id} api={api} requestId={refund.id} onClose={() => setRefundOpen(false)}/> : null}
      {chat.data && requestInfo.data ? (closed ? <footer className="inquiry-chat__closed" role="status">처리 완료된 문의에는 메시지와 파일을 추가할 수 없습니다.</footer> : <form className="inquiry-chat__composer" onSubmit={(event) => { event.preventDefault(); submit() }}>
        <div className="inquiry-chat__attachments"><InquiryAttachments api={api} requestId={id} files={files} disabled={send.isPending} onBusy={setAttachmentBusy} onChange={(next) => { setFiles(next); setMessageId(`customer-web:${crypto.randomUUID()}`); send.reset() }}/></div>
        <p className="inquiry-chat__attachment-guidance">첨부파일 ({files.length}/5) · 파일당 최대 10MB</p>
        <label><span className="sr-only">새 메시지</span><textarea aria-label="새 메시지" disabled={send.isPending || attachmentBusy} maxLength={4000} placeholder="메시지를 입력해 주세요." value={message} onChange={(event) => { setMessage(event.target.value); setMessageId(`customer-web:${crypto.randomUUID()}`); send.reset() }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }}/></label>
        <Button disabled={send.isPending || attachmentBusy || (!message.trim() && !files.length)} type="submit">{send.isPending ? '전송 중…' : send.isError ? '재전송' : '전송'}</Button>
        {send.isError ? <p role="alert">메시지를 전송하지 못했습니다.</p> : null}
      </form>) : null}
    </section>
  </DialogLayer>
}
