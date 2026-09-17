import { z } from 'zod'
import { productNoResponseSchema, productNoSearchSchema } from './productNo'
import { ApiClientError, type ApiClient, type ApiServerSentEvent } from './httpClient'

const id = z.number().int().positive().safe()
const count = z.number().int().nonnegative().safe()
const instant = z.iso.datetime({ offset: true })
const status = z.enum(['접수', '확인 중', '비용처리', '처리 중', '처리 완료'])
const requestType = z.enum(['inquiry', 'as_request', 'setup_change', 'refund_cancel'])
export const operationRequestItemSchema = z.object({
  operationRequestId: id, requestNo: z.string(), requestType: z.string(),
  customerVisibleStatus: status, title: z.string(), lastMessage: z.string().nullable(), targetCount: count, targetProductNos: z.string().nullable(),
  createdAt: instant, lastActivityAt: instant.nullable(),
})
export const operationRequestPageSchema = z.object({ items: z.array(operationRequestItemSchema), page: count, size: z.number().int().min(1).max(100), total: count })
export const operationRequestSummarySchema = z.object({ total: count, statusCounts: z.array(z.object({ status, count })) })
export const operationRequestChatSchema = z.object({
  operationRequest: z.object({ id, requestNo: z.string(), status: z.string(), customerVisibleStatus: status,
    targets: z.array(z.object({ targetType: z.string().optional(), pcAssetId: id.nullable(), productId: id.nullable().optional(), productNo: productNoResponseSchema.nullable(), managementNo: z.string().nullable(), serverRoomId: id.nullable(), serverRoomName: z.string().nullable(), alias: z.string().nullable().optional() })),
  }),
  messages: z.array(z.object({
    id, clientMessageId: z.string().nullable(), sourceChannel: z.string(), authorType: z.string(), authorUserId: id.nullable(),
    authorDisplayName: z.string().nullable(), content: z.string(), messageType: z.string(), createdAt: instant, unreadCount: count,
    attachments: z.array(z.object({ id, fileName: z.string(), mimeType: z.string(), fileSize: count, downloadUrl: z.string().nullable() })),
  })),
})
export const operationRequestQuerySchema = z.object({
  requestType: requestType.optional(), customerVisibleStatus: status.optional(),
  productNo: productNoSearchSchema.optional(), exactProductNo: z.boolean().optional(), openOnly: z.boolean().optional(), requestId: id.optional(),
  page: z.number().int().nonnegative().max(2147483647).default(0), size: z.number().int().min(1).max(100).default(20),
}).refine(({ page, size }) => page * size <= 2147483647)
export type OperationRequestQuery = z.input<typeof operationRequestQuerySchema>
const createdSchema = z.object({ operationRequestId: id, requestNo: z.string() })
const refundSummary = z.object({ id, operationRequestId: id.nullable(), operationRequestTargetId: id.nullable(), orderNo: z.string(), orderItemId: id.nullable(), rentalId: id.nullable(), serverRoomName: z.string().nullable(),
  refundType: z.string(), refundMethod: z.string(), reason: z.string(), requestedAmount: count, requestedPointAmount: count,
  approvedAmount: count.nullable(), approvedPointAmount: count.nullable(), status: z.string(), requestedAt: z.iso.datetime({ local: true }), processedAt: z.iso.datetime({ local: true }).nullable() })
const refundDetail = z.object({ request: refundSummary, decisions: z.array(z.object({ id, revisionNo: count, decisionType: z.string(), cashAmount: count, pointAmount: count, reason: z.string(), decidedAt: z.iso.datetime({ local: true }) })),
  payouts: z.array(z.object({ id, payoutNo: count, payoutMethod: z.string(), status: z.string(), amount: count, currency: z.string(), requestedAt: z.iso.datetime({ local: true }) })) })
const refundPage = z.object({ items: z.array(refundSummary), page: count, size: count, totalElements: count, totalPages: count })
const refundTarget = z.object({ operationRequestTargetId: id, orderItemId: id, orderNo: z.string(), rentalId: id, productNo: productNoResponseSchema, title: z.string(),
  serverRoomName: z.string().nullable(), billingUnit: z.string(), serviceStartedAt: z.string().nullable(), serviceEndsAt: z.string().nullable(), paymentApprovedAt: z.string().nullable(), paymentMethod: z.string(),
  alias: z.string().nullable(), spec: z.string().nullable(), orderedAt: z.string(), contactPhone: z.string().nullable() })
const refundQuoteRequest = z.object({ operationRequestId: id, selections: z.array(z.object({ operationRequestTargetId: id, orderItemId: id })).min(1).max(20), method: z.enum(['point', 'original']) })
const refundDirectQuoteRequest = z.object({ selections: z.array(z.object({ orderItemId: id, rentalId: id })).min(1).max(20), method: z.enum(['point', 'original']) })
const refundQuote = z.object({ items: z.array(z.object({ operationRequestTargetId: id, orderItemId: id, orderNo: z.string(), productNo: productNoResponseSchema, title: z.string(), rentalId: id,
  policyVersionId: id, cashAmount: count, pointAmount: count, couponDeduction: count, usedDays: count, remainingDays: count, bankRequired: z.boolean(), refundMethod: z.string(),
    dailyQuantity: count, usedDaysRateBasisPoints: count, dailyQuantityRateBasisPoints: count, remainingSettlement: z.number().nonnegative(),
    usedDaysDeduction: z.number().nonnegative(), dailyQuantityDeduction: z.number().nonnegative(), setupFee: count, formatFee: count,
    promotionalPointDeduction: count, purchaseConfirmationPointReversal: count })),
  cashTotal: count, pointTotal: count, bankRequired: z.boolean(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), quotedAt: z.string(), policyExplanation: z.string() })
const refundSubmission = z.object({ quote: refundQuoteRequest, expectedFingerprint: z.string().regex(/^[a-f0-9]{64}$/), reason: z.string().trim().min(1).max(2000),
  contactPhone: z.string().trim().regex(/^[0-9+() -]{8,30}$/), refundPolicyAgreed: z.literal(true), terminationAgreed: z.literal(true),
  bank: z.object({ code: z.string().regex(/^[0-9]{2,3}$/), name: z.string().trim().min(1).max(100), accountNumber: z.string().regex(/^[0-9 -]{8,40}$/), holder: z.string().trim().min(1).max(100) }).nullable() })
const refundDirectSubmission = refundSubmission.extend({ quote: refundDirectQuoteRequest })
export type RefundQuoteRequest = z.infer<typeof refundQuoteRequest>
export type RefundDirectQuoteRequest = z.infer<typeof refundDirectQuoteRequest>
export type RefundApplicationQuote = z.infer<typeof refundQuote>
export type RefundApplicationInput = z.infer<typeof refundSubmission>
export type RefundDirectApplicationInput = z.infer<typeof refundDirectSubmission>
export type OperationRequestChatEvent = ApiServerSentEvent

const chatWakeUpPayload = z.object({ type: z.enum(['chatMessageCreated', 'chatRead']), operationRequestId: id })

function isChatWakeUpEvent(event: OperationRequestChatEvent, operationRequestId: number): boolean {
  try {
    const parsed = chatWakeUpPayload.safeParse(JSON.parse(event.data))
    return parsed.success && parsed.data.operationRequestId === operationRequestId
  } catch { return false }
}

function shouldReconnectChatStream(error?: ApiClientError): boolean {
  return error === undefined || error.kind === 'network' || (error.kind === 'http' && (error.status ?? 0) >= 500)
}

export function createOperationRequestsApi(client: ApiClient, organizationId: string) {
  const customerOrganizationId = z.string().regex(/^[1-9]\d{0,18}$/).refine((value) => BigInt(value) <= 9223372036854775807n).parse(organizationId)
  const context = { authenticated: true, customerOrganizationId } as const
  const chatSubscriptions = new Map<number, { listeners: Set<(event: OperationRequestChatEvent) => void>; stop: () => void }>()
  const subscribeChatEvents = (operationRequestId: number, listener: (event: OperationRequestChatEvent) => void): (() => void) => {
    const parsedRequestId = id.parse(operationRequestId)
    let subscription = chatSubscriptions.get(parsedRequestId)
    if (!subscription) {
      const listeners = new Set<(event: OperationRequestChatEvent) => void>()
      let stopped = false
      let attempt = 0
      let closeStream: (() => void) | undefined
      let reconnectTimer: ReturnType<typeof setTimeout> | undefined
      const stop = () => {
        stopped = true
        if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
        closeStream?.()
      }
      const drop = () => {
        stop()
        if (chatSubscriptions.get(parsedRequestId) === subscription) chatSubscriptions.delete(parsedRequestId)
      }
      const scheduleReconnect = () => {
        if (stopped) return
        closeStream = undefined
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt++, 5))
        reconnectTimer = setTimeout(connect, delay)
      }
      const connect = () => {
        if (stopped) return
        closeStream = client.eventStream(`/api/v1/operation-requests/${parsedRequestId}/chat/events`, {
          ...context,
          onEvent: (event) => {
            if (!isChatWakeUpEvent(event, parsedRequestId)) return
            attempt = 0
            listeners.forEach((registered) => registered(event))
          },
          onDisconnect: (error) => {
            if (stopped) return
            if (error?.kind === 'http' && error.status === 401) {
              // An SSE-only async-dispatch failure must not invalidate a working REST session.
              // A real bearer failure on this request still invokes the API client's logout hook.
              void client.request(`/api/v1/operation-requests/${parsedRequestId}/chat`, operationRequestChatSchema,
                { ...context, query: { limit: 1 } }).then(scheduleReconnect, (failure: unknown) => {
                if (failure instanceof ApiClientError && shouldReconnectChatStream(failure)) scheduleReconnect()
                else drop()
              })
              return
            }
            if (!shouldReconnectChatStream(error)) {
              drop()
              return
            }
            scheduleReconnect()
          },
        })
      }
      subscription = { listeners, stop }
      chatSubscriptions.set(parsedRequestId, subscription)
      connect()
    }
    subscription.listeners.add(listener)
    return () => {
      subscription?.listeners.delete(listener)
      if (subscription && subscription.listeners.size === 0) {
        subscription.stop()
        if (chatSubscriptions.get(parsedRequestId) === subscription) chatSubscriptions.delete(parsedRequestId)
      }
    }
  }
  return {
    organizationId: customerOrganizationId,
    targetPurchaseDetail: (rentalId: number, signal?: AbortSignal) => client.request(`/api/v1/operation-requests/target-purchases/${id.parse(rentalId)}`,
      z.object({ rentalId: id, title: z.string().nullable(), orderedAt: z.iso.datetime({ local: true }).nullable() }), { ...context, signal }),
    list: (query: OperationRequestQuery = {}, signal?: AbortSignal) => client.request('/api/v1/operation-requests', operationRequestPageSchema, { ...context, query: operationRequestQuerySchema.parse(query), signal }),
    summary: (signal?: AbortSignal) => client.request('/api/v1/operation-requests/summary', operationRequestSummarySchema, { ...context, signal }),
    create: (input: { requestType: z.infer<typeof requestType>; title: string; content: string; targetPcAssetIds: number[] }) => client.request('/api/v1/operation-requests', createdSchema, {
      ...context, method: 'POST', body: z.object({ requestType, title: z.string().trim().max(300),
        content: z.string().trim().min(1).max(4000), targetPcAssetIds: z.array(id).max(20).refine((ids) => new Set(ids).size === ids.length), targetProductIds: z.array(id).max(20) })
        .parse({ ...input, targetProductIds: [] }),
    }),
    // The backend exposes chat (including request targets), not a standalone detail endpoint.
    addTargets: (operationRequestId: number, pcAssetIds: readonly number[], idempotencyKey: string) => client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/targets`,
      z.object({ operationRequestId: id, eventId: id, addedPcAssetIds: z.array(id), totalTargetCount: count, replayed: z.boolean() }),
      { ...context, method: 'POST', idempotencyKey, body: { pcAssetIds: z.array(id).min(1).max(20).refine((ids) => new Set(ids).size === ids.length).parse(pcAssetIds) } }),
    chat: (operationRequestId: number, limit = 50, signal?: AbortSignal, beforeCommentId?: number) => client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat`, operationRequestChatSchema, { ...context, query: { limit: z.number().int().min(1).max(100).parse(limit), beforeCommentId: beforeCommentId === undefined ? undefined : id.parse(beforeCommentId) }, signal }),
    subscribeChatEvents,
    sendMessage: (operationRequestId: number, content: string, clientMessageId = `customer-web:${crypto.randomUUID()}`, attachmentIds: readonly number[] = []) => client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat/messages`, operationRequestChatSchema, {
      ...context, method: 'POST', body: z.object({ content: z.string().trim().max(4000), clientMessageId: z.string().min(1).max(100).regex(/^[A-Za-z0-9._:-]+$/), sourceChannel: z.literal('customer_web'), attachmentIds: z.array(id).max(5).refine((ids) => new Set(ids).size === ids.length) }).refine((value) => value.content.length > 0 || value.attachmentIds.length > 0).parse({ content, clientMessageId, sourceChannel: 'customer_web', attachmentIds }),
    }),
    uploadAttachment: (operationRequestId: number, file: File) => {
      if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('첨부파일은 10MB 이하로 선택해 주세요.')
      const body = new FormData(); body.append('file', file)
      return client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat/attachments`,
        z.object({ attachmentId: id, fileName: z.string(), mimeType: z.string(), fileSize: count, malwareScanStatus: z.literal('clean') }),
        { ...context, method: 'POST', body })
    },
    pendingAttachments: (operationRequestId: number, signal?: AbortSignal) => client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat/attachments`,
      z.array(z.object({ attachmentId: id, fileName: z.string(), mimeType: z.string(), fileSize: count, malwareScanStatus: z.literal('clean') })), { ...context, signal }),
    discardAttachment: (operationRequestId: number, attachmentId: number) => client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat/attachments/${id.parse(attachmentId)}`, z.undefined(), { ...context, method: 'DELETE' }),
    downloadAttachment: (operationRequestId: number, attachmentId: number, signal?: AbortSignal) => client.download(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat/attachments/${id.parse(attachmentId)}/download`, { ...context, signal }),
    markRead: (operationRequestId: number, lastCommentId: number, signal?: AbortSignal) => client.request(`/api/v1/operation-requests/${id.parse(operationRequestId)}/chat/read`,
      z.object({ status: z.string(), serverTime: instant, readStates: z.array(z.object({ messageId: id, unreadCount: count })) }),
      { ...context, method: 'POST', body: { lastCommentId: id.parse(lastCommentId) }, signal }),
    refunds: (page = 0, signal?: AbortSignal) => client.request('/api/v1/my/refunds', refundPage, { ...context, query: { page: count.parse(page), size: 20 }, signal }),
    refundsForOperationRequest: (operationRequestId: number, signal?: AbortSignal) => client.request('/api/v1/my/refunds', refundPage, { ...context, query: { operationRequestId: id.parse(operationRequestId), page: 0, size: 20 }, signal }),
    refundApplicationCandidates: (signal?: AbortSignal) => client.request('/api/v1/my/refunds/application-candidates', refundTarget.array(), { ...context, signal }),
    refundApplicationTargets: (operationRequestId: number, signal?: AbortSignal) => client.request('/api/v1/my/refunds/application-targets', refundTarget.array(), { ...context, query: { operationRequestId: id.parse(operationRequestId) }, signal }),
    refundApplicationQuote: (input: RefundQuoteRequest) => client.request('/api/v1/my/refunds/application-quote', refundQuote, { ...context, method: 'POST', body: refundQuoteRequest.parse(input) }),
    refundDirectApplicationQuote: (input: RefundDirectQuoteRequest) => client.request('/api/v1/my/refunds/direct-application-quote', refundQuote, { ...context, method: 'POST', body: refundDirectQuoteRequest.parse(input) }),
    submitRefundApplication: (input: RefundApplicationInput, key: string) => client.request('/api/v1/my/refunds/applications', refundDetail.array(), { ...context, method: 'POST', body: refundSubmission.parse(input), idempotencyKey: z.uuidv4().parse(key) }),
    submitDirectRefundApplication: (input: RefundDirectApplicationInput, key: string) => client.request('/api/v1/my/refunds/direct-applications', refundDetail.array(), { ...context, method: 'POST', body: refundDirectSubmission.parse(input), idempotencyKey: z.uuidv4().parse(key) }),
    refundDetail: (requestId: number, signal?: AbortSignal) => client.request(`/api/v1/my/refunds/${id.parse(requestId)}`, refundDetail, { ...context, signal }),
    cancelRefund: (requestId: number) => client.request(`/api/v1/my/refunds/${id.parse(requestId)}/cancel`, refundDetail, { ...context, method: 'POST' }),
  }
}
