import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { Button } from '@/components/ui/ButtonControl'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { useSession } from '@/app/session/SessionProvider'
import { InquiryChatMenu, InquiryChatHeader } from '@/components/mypage/InquiryChatMenu'
import { InquiryChatProductCard } from '@/components/mypage/InquiryChatProductCard'
import { AccountQueryState } from '../AccountQueryState'
import { InquiryProductConversations } from '../InquiryProductConversations'
import { customerStatusLabel, inquiryTypeLabel } from '../InquiryPresentation'
import { InquiryTargetAddition } from '../InquiryTargetAddition'
import { InquiryAttachments, InquiryAttachmentDownload, type InquiryDraftAttachment } from '../InquiryAttachments'
import { RefundDetail } from '../InquiryRefundRequests'
import { managerScopedPath } from '../managerPortalPath'
import { InquiryChatProducts } from './InquiryChatProducts'
import { useServices } from '@/app/ServiceProvider'
import { loadAuthorizedRcpcs } from '../rcpcPresentation'
import { serverPresenceQueryOptions } from '@/lib/serverPresenceQueryOptions'
import { clearDeniedInquirySummaries, invalidateInquiryQueries } from '@/lib/inquiryQueryCache'
import { ApiClientError } from '@/api/httpClient'

type Chat = Awaited<ReturnType<InquiryReadServices['chat']>>
type ChatTarget = Chat['operationRequest']['targets'][number]
type TimelineEntry = { kind: 'message'; time: number; message: Chat['messages'][number] }
  | { kind: 'product'; time: number; target: ChatTarget; index: number }

function InquiryChatProduct({ target, onSelect }: { target: ChatTarget; onSelect: (productNo: string) => void }) {
  return <InquiryChatProductCard productNo={target.productNo} alias={target.alias} serverRoomName={target.serverRoomName} onSelect={() => { if (target.productNo) onSelect(target.productNo) }}/>
}

export function InquiryConversationDialog({ api, id, onClose, standalone = false }: { api: InquiryReadServices; id: number; onClose: () => void; standalone?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeId, setActiveId] = useState(id)
  const selectInquiry = (nextId: number) => {
    if (standalone) navigate(managerScopedPath(`/mypage/inquiries/${nextId}`, location.pathname), { replace: true })
    else setActiveId(nextId)
  }
  return <InquiryChat key={`${api.organizationId}:${standalone ? id : activeId}`} api={api} id={standalone ? id : activeId} onClose={onClose} onSelectInquiry={selectInquiry} standalone={standalone} />
}
function InquiryChat({ api, id, onClose, onSelectInquiry, standalone }: { api: InquiryReadServices; id: number; onClose: () => void; onSelectInquiry: (id: number) => void; standalone: boolean }) {
  const { uiText, locale } = useUiTranslation()
  const session = useSession()
  const isManager = session.status === 'authenticated' && session.role === 'C_MANAGER'
  const client = useQueryClient()

  const [message, setMessage] = useState('')
  const [messageId, setMessageId] = useState(() => `customer-web:${crypto.randomUUID()}`)
  const [readError, setReadError] = useState(false)
  const [accessError, setAccessError] = useState<Error | null>(null)
  const [files, setFiles] = useState<readonly InquiryDraftAttachment[]>([])
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  const [olderMessages, setOlderMessages] = useState<Awaited<ReturnType<InquiryReadServices['chat']>>['messages']>([])
  const [historyEnd, setHistoryEnd] = useState(false)
  const [productConversation, setProductConversation] = useState<string | null>(null)
  const [productMenuOpen, setProductMenuOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [addingProducts, setAddingProducts] = useState(false)
  const additionCloseRef = useRef<(() => void) | null>(null)
  const { message: outcome, setMessage: setOutcome, toastKey } = useToastMessage()
  const [outcomeValues, setOutcomeValues] = useState<Readonly<Record<string, string | number>>>({})
  const { myAccount } = useServices()
  const rcpcDetails = useQuery({ ...serverPresenceQueryOptions, queryKey: ['my-rcpcs', myAccount.rcpcApi?.organizationId, 'authorized-options'], enabled: productsOpen && Boolean(myAccount.rcpcApi), queryFn: ({ signal }) => loadAuthorizedRcpcs(myAccount.rcpcApi!, signal) })
  const [refundOpen, setRefundOpen] = useState(false)
  const lastRead = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const restoreComposerFocus = useRef(false)
  const chatKey = useMemo(() => ['operation-requests', api.organizationId, 'chat', id] as const, [api.organizationId, id])
  // The stream only wakes the cached REST query. A minute fallback covers intermediaries that
  // silently drop long-lived SSE connections without exposing chat content in the stream itself.
  const chat = useQuery({ queryKey: chatKey, queryFn: ({ signal }) => api.chat(id, 100, signal), refetchInterval: 60_000, refetchIntervalInBackground: false })
  const requestInfo = useQuery({ queryKey: ['operation-requests', api.organizationId, 'info', id], queryFn: ({ signal }) => api.list({ requestId: id, size: 1 }, signal) })
  const accessDenied = [chat.error, requestInfo.error, accessError].some(error => error instanceof ApiClientError && [401, 403].includes(error.status ?? 0))
  const chatData = accessDenied ? undefined : chat.data
  const requestInfoData = accessDenied ? undefined : requestInfo.data
  const refundLink = useQuery({ queryKey: ['my-refund-requests', api.organizationId, 'operation-request', id], queryFn: ({ signal }) => api.refundsForOperationRequest(id, signal), enabled: !isManager && requestInfoData?.items[0]?.requestType === 'refund_cancel' })
  const refund = refundLink.data?.items.find((item) => item.operationRequestId === id)
  const closed = chatData?.operationRequest.customerVisibleStatus === '처리 완료' || ['completed', 'cancelled'].includes(chatData?.operationRequest.status ?? '')
  const messages = [...new Map([...olderMessages, ...(chatData?.messages ?? [])].map((item) => [item.id, item])).values()]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id - right.id)
  const hasEarlierMessages = !historyEnd && (olderMessages.length > 0 || (chatData?.messages.length ?? 0) >= 100)
  const timeline: TimelineEntry[] = messages.map(message => ({ kind: 'message', time: Date.parse(message.createdAt), message }))
  chatData?.operationRequest.targets.forEach((target, index) => {
    if (!target.addedAt) return
    const time = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(target.addedAt) ? target.addedAt : `${target.addedAt}+09:00`)
    if (hasEarlierMessages && messages.length && time < Date.parse(messages[0]!.createdAt)) return
    timeline.push({ kind: 'product', time, target, index })
  })
  timeline.sort((left, right) => left.time - right.time
    || (left.kind === 'message' && right.kind === 'message' ? left.message.id - right.message.id
      : left.kind === 'product' && right.kind === 'product' ? left.index - right.index
        : left.kind === 'message' ? -1 : 1))
  const targetCount = chatData?.operationRequest.targets.length ?? 0
  const earlier = useMutation({ mutationKey: ['operation-requests', api.organizationId, 'history', id], mutationFn: () => api.chat(id, 100, undefined, messages[0]?.id), onError: error => {
    if (error instanceof ApiClientError && [401, 403].includes(error.status ?? 0)) setAccessError(error)
  }, onSuccess: (response) => {
    setOlderMessages((previous) => [...new Map([...response.messages, ...previous, ...(chatData?.messages ?? [])].map((item) => [item.id, item])).values()])
    setHistoryEnd(response.messages.length < 100)
  } })
  const lastId = Math.max(0, ...(chatData?.messages.map((item) => item.id) ?? []))
  const conversationReady = Boolean(chatData && requestInfoData)
  useLayoutEffect(() => {
    if (!conversationReady || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [conversationReady, lastId, targetCount])
  useEffect(() => api.subscribeChatEvents(id, () => {
    void invalidateInquiryQueries(client, api.organizationId)
  }, error => {
    setAccessError(error)
    clearDeniedInquirySummaries(client, error, chatKey, api.organizationId)
  }), [api, api.organizationId, chatKey, client, id])
  useEffect(() => {
    if (!lastId || lastId <= lastRead.current) return
    const controller = new AbortController()
    void api.markRead(id, lastId, controller.signal).then(() => { lastRead.current = lastId; setReadError(false) }).catch(error => {
      if (controller.signal.aborted) return
      setReadError(true)
      if (error instanceof ApiClientError && [401, 403].includes(error.status ?? 0)) {
        setAccessError(error)
        clearDeniedInquirySummaries(client, error, chatKey, api.organizationId)
      }
    })
    return () => controller.abort()
  }, [api, chatKey, client, id, lastId])
  const send = useMutation({ mutationKey: ['operation-requests', api.organizationId, 'send', id], mutationFn: () => api.sendMessage(id, message, messageId, files.map((file) => file.attachmentId)), onError: error => {
    if (error instanceof ApiClientError && [401, 403].includes(error.status ?? 0)) setAccessError(error)
  }, onSuccess: async (response) => {
    setAccessError(null); setMessage(''); setFiles([]); setMessageId(`customer-web:${crypto.randomUUID()}`)
    client.setQueryData(chatKey, response)
    await invalidateInquiryQueries(client, api.organizationId)
  } })
  useLayoutEffect(() => {
    if (!restoreComposerFocus.current || send.isPending || (!send.isSuccess && !send.isError)) return
    restoreComposerFocus.current = false
    if (!closed && !productConversation && !refundOpen) composerRef.current?.focus({ preventScroll: true })
  }, [send.isPending, send.isSuccess, send.isError, closed, productConversation, refundOpen])
  const submit = () => {
    if ((message.trim() || files.length) && !accessDenied && !closed && !send.isPending && !attachmentBusy) {
      restoreComposerFocus.current = true
      composerRef.current?.focus({ preventScroll: true })
      send.mutate()
    }
  }
  const close = onClose
  const type = requestInfoData?.items[0] ? inquiryTypeLabel(requestInfoData.items[0].requestType) : uiText("문의")
  const selectProductMenu = (action: 'products' | 'add') => {
    setProductMenuOpen(false)
    if (action === 'add' && (closed || !myAccount.rcpcApi)) return
    setProductsOpen(action === 'products')
    setAddingProducts(action === 'add')
  }
  const conversation = <section aria-label={standalone ? uiText("문의 상세") : undefined} aria-modal={standalone ? undefined : true} className={`inquiry-preview-dialog inquiry-chat${closed ? ' inquiry-chat--complete' : ''}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
      <InquiryChatHeader title={`[${chatData ? uiText(customerStatusLabel(chatData.operationRequest.customerVisibleStatus)) : uiText("조회 중")}] ${uiText(type)}`} standalone={standalone} disabled={!chatData} open={productMenuOpen} onToggle={() => setProductMenuOpen(open => !open)} addDisabled={closed || !myAccount.rcpcApi} onSelect={selectProductMenu} onClose={close}/>
      <InquiryChatMenu open={productMenuOpen && Boolean(chatData)} onClose={() => setProductMenuOpen(false)} addDisabled={closed || !myAccount.rcpcApi} onSelect={selectProductMenu}/>
      <div className="inquiry-chat__scroll" ref={scrollRef}>
        <AccountQueryState pending={chat.isPending || requestInfo.isPending} error={chat.error ?? requestInfo.error ?? accessError} retry={async () => {
          const deniedBeforeRetry = accessError
          const [chatResult, infoResult] = await Promise.all([chat.refetch(), requestInfo.refetch()])
          if (chatResult.isSuccess && infoResult.isSuccess) {
            setOlderMessages([])
            setHistoryEnd(false)
            setAccessError(current => current === deniedBeforeRetry ? null : current)
          }
        }}/>
        {chatData && requestInfoData ? <>
          {requestInfoData?.items[0] ? <time>{new Date(requestInfoData.items[0].createdAt).toLocaleDateString(locale, { timeZone: 'Asia/Seoul' })}</time> : null}
          {chatData.operationRequest.targets.filter(target => !target.addedAt).map((target, index) => <InquiryChatProduct key={`${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`} target={target} onSelect={setProductConversation} />)}
          {!isManager && requestInfoData?.items[0]?.requestType === 'refund_cancel' ? <><AccountQueryState pending={refundLink.isPending} error={refundLink.error} retry={refundLink.refetch}/>{refund ? <button className="inquiry-chat__refund-action" onClick={() => setRefundOpen(true)} type="button">{refund.status === 'requested' ? uiText("해지 신청 상세 / 철회") : uiText("해지 신청 상세")}</button> : refundLink.data ? <p className="inquiry-chat__system">{uiText("연결된 해지 신청 내역이 없습니다.")}</p> : null}</> : null}
          {hasEarlierMessages ? <button className="inquiry-chat__earlier" type="button" disabled={earlier.isPending} onClick={() => earlier.mutate()}>{earlier.isPending ? uiText("불러오는 중…") : uiText("이전 대화 더보기")}</button> : null}
          {earlier.isError ? <p role="alert">{uiText(earlier.error.message)}</p> : null}
          {timeline.map(entry => {
            if (entry.kind === 'product') return <InquiryChatProduct key={`added-product:${entry.index}`} target={entry.target} onSelect={setProductConversation} />
            const item = entry.message
            const fromComBar = item.authorType === 'device'
            const isMine = fromComBar || session.status === 'authenticated' && item.authorType === 'customer'
              && item.authorUserId !== null && String(item.authorUserId) === session.userId
            return <article className={isMine ? 'inquiry-chat__message is-mine' : 'inquiry-chat__message'} key={item.id}>
              {!isMine && <small>{item.authorDisplayName ?? item.authorType}</small>}
              <div className="inquiry-chat__message-row">
                <p>{item.content}</p>
                <div className="inquiry-chat__message-meta">
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}</time>
                </div>
              </div>
              {item.attachments.map((attachment) => <InquiryAttachmentDownload key={attachment.id} api={api} requestId={id} attachment={attachment}/>)}
            </article>
          })}
          {!messages.length ? <p className="inquiry-chat__system">{uiText("등록된 메시지가 없습니다.")}</p> : null}
          {readError ? <p role="alert">{uiText("읽음 상태를 반영하지 못했습니다.")} <button type="button" onClick={() => { void api.markRead(id, lastId).then(() => { lastRead.current = lastId; setReadError(false) }).catch(() => setReadError(true)) }}>{uiText("다시 시도")}</button></p> : null}
        </> : null}
      </div>
      {!accessDenied && productConversation && <InquiryProductConversations key={productConversation} api={api} requestId={id} productNo={productConversation} onSelect={onSelectInquiry} onClose={() => setProductConversation(null)}/>}
      {!accessDenied && refundOpen && refund ? <RefundDetail key={refund.id} api={api} requestId={refund.id} onClose={() => setRefundOpen(false)}/> : null}
      {chatData && requestInfoData ? (closed ? <footer className="inquiry-chat__closed" role="status">{uiText("처리 완료된 문의에는 메시지와 파일을 추가할 수 없습니다.")}</footer> : <form className="inquiry-chat__composer" onSubmit={(event) => { event.preventDefault(); submit() }}>
        <div className="inquiry-chat__attachments"><InquiryAttachments api={api} requestId={id} files={files} disabled={send.isPending} onBusy={setAttachmentBusy} onChange={(next) => { setFiles(next); setMessageId(`customer-web:${crypto.randomUUID()}`); send.reset() }}/></div>
        <label><span className="sr-only">{uiText("새 메시지")}</span><textarea aria-label={uiText("새 메시지")} ref={composerRef} readOnly={send.isPending || attachmentBusy} maxLength={4000} placeholder={uiText("메시지를 입력해 주세요.")} value={message} onChange={(event) => { setMessage(event.target.value); setMessageId(`customer-web:${crypto.randomUUID()}`); send.reset() }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }}/></label>
        <Button disabled={send.isPending || attachmentBusy || (!message.trim() && !files.length)} type="submit">{send.isPending ? uiText("전송 중…") : send.isError ? uiText("재전송") : uiText("전송")}</Button>
        {send.isError ? <p role="alert">{uiText(send.error.message)}</p> : null}
      </form>) : null}
    </section>
  const content = addingProducts && !closed && chatData ? <InquiryTargetAddition api={api} requestId={id} existingIds={chatData.operationRequest.targets.flatMap(target => target.pcAssetId === null ? [] : [target.pcAssetId])} total={targetCount} closed={closed} embedded pickerOpen closeRequestRef={additionCloseRef} onOutcome={(message, values) => { setOutcomeValues(values); setOutcome(message) }} onClosePicker={() => setAddingProducts(false)} showTrigger={false}/> : productsOpen && chatData ? <InquiryChatProducts targets={chatData.operationRequest.targets} status={customerStatusLabel(chatData.operationRequest.customerVisibleStatus)} rcpcItems={rcpcDetails.data} standalone={standalone} onBack={() => setProductsOpen(false)} onClose={close} onSelect={setProductConversation}>
    <AccountQueryState pending={rcpcDetails.isPending && rcpcDetails.fetchStatus !== 'idle'} error={rcpcDetails.error} retry={rcpcDetails.refetch}/>
    {productConversation ? <InquiryProductConversations key={productConversation} api={api} requestId={id} productNo={productConversation} onSelect={onSelectInquiry} onClose={() => setProductConversation(null)}/> : null}
  </InquiryChatProducts> : conversation
  return <><Toast message={uiText(outcome, outcomeValues)} toastKey={toastKey}/>{standalone ? content : <DialogLayer asChild backdropClassName="inquiry-preview-layer inquiry-detail-preview" focusKey={addingProducts ? 'add-products' : productsOpen ? 'products' : 'chat'} isOpen onClose={addingProducts && !closed ? () => additionCloseRef.current?.() : close} showTitle={false} title={addingProducts ? uiText("문의 상품 추가") : productsOpen ? uiText("문의 상품") : uiText("문의 상세")}>{content}</DialogLayer>}</>
}
