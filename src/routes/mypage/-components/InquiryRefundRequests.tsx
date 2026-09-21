import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Pagination } from '@/components/ui/PaginationControl'
import { AccountQueryState } from './AccountQueryState'
import { InquiryRefundApplication } from './InquiryRefundApplication'
import { Modal } from '@/components/ui/ModalControl'

const refundStatuses: Record<string, string> = { requested: '접수', approved: '승인', rejected: '반려', cancelled: '철회', processing: '처리 중', completed: '처리 완료', paid: '지급 완료', failed: '실패' }

export function InquiryRefundRequests({ api }: { api: InquiryReadServices }) {
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const rows = useQuery({ queryKey: ['my-refund-requests', api.organizationId, page], queryFn: ({ signal }) => api.refunds(page, signal) })
  return <section><h2>환불·중도해지 신청 내역</h2><InquiryRefundApplication api={api} /><AccountQueryState pending={rows.isPending} error={rows.error} retry={rows.refetch}/>
    {rows.data ? <><p>전체 {rows.data.totalElements}건</p><table><thead><tr><th>주문번호</th><th>서버실</th><th>신청일</th><th>신청 사유</th><th>처리 상태</th><th>상세</th></tr></thead><tbody>{rows.data.items.map((item) => <tr key={item.id}><td>{item.orderNo}</td><td>{item.serverRoomName ?? '-'}</td><td>{item.requestedAt.replace('T', ' ')}</td><td>{item.reason}</td><td>{refundStatuses[item.status] ?? item.status}</td><td><button onClick={() => setSelectedId(item.id)} type="button">상세 / 철회</button></td></tr>)}</tbody></table>
      {!rows.data.items.length ? <p>환불·중도해지 신청 내역이 없습니다.</p> : null}<Pagination currentPage={rows.data.page + 1} totalPages={rows.data.totalPages} onPageChange={(value) => setPage(value - 1)}/></> : null}
    {selectedId !== null ? <RefundDetail key={selectedId} api={api} requestId={selectedId} onClose={() => setSelectedId(null)}/> : null}
  </section>
}

export function RefundDetail({ api, requestId, onClose }: { api: InquiryReadServices; requestId: number; onClose: () => void }) {
  const client = useQueryClient()
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const detail = useQuery({ queryKey: ['my-refund-requests', api.organizationId, 'detail', requestId], queryFn: ({ signal }) => api.refundDetail(requestId, signal) })
  const cancel = useMutation({ mutationFn: () => api.cancelRefund(requestId), onSuccess: async (response) => {
    client.setQueryData(['my-refund-requests', api.organizationId, 'detail', requestId], response)
    await client.invalidateQueries({ queryKey: ['my-refund-requests', api.organizationId] })
  } })
  return <Modal className="modal--refund-detail" isOpen title="환불 신청 상세" onClose={() => { if (!cancel.isPending) onClose() }} closeLabel="닫기"><AccountQueryState pending={detail.isPending} error={detail.error} retry={detail.refetch}/>
    {detail.data ? <><p>{detail.data.request.orderNo} · {refundStatuses[detail.data.request.status] ?? detail.data.request.status}</p>
      <p>신청 금액: {detail.data.request.requestedAmount.toLocaleString('ko-KR')}원 / {detail.data.request.requestedPointAmount.toLocaleString('ko-KR')}포인트</p>
      <p>승인 금액: {detail.data.request.approvedAmount?.toLocaleString('ko-KR') ?? '-'}원 / {detail.data.request.approvedPointAmount?.toLocaleString('ko-KR') ?? '-'}포인트</p>
      <details><summary>처리·지급 이력</summary>{detail.data.decisions.map((item) => <p key={item.id}>{item.decidedAt.replace('T', ' ')} · {item.decisionType} · {item.cashAmount.toLocaleString('ko-KR')}원 / {item.pointAmount.toLocaleString('ko-KR')}포인트 · {item.reason}</p>)}{detail.data.payouts.map((item) => <p key={item.id}>지급 {item.payoutNo}: {refundStatuses[item.status] ?? item.status} · {item.amount.toLocaleString('ko-KR')} {item.currency}</p>)}</details>
      {detail.data.request.status === 'requested' ? <button disabled={cancel.isPending} onClick={() => setCancelConfirmOpen(true)} type="button">{cancel.isPending ? '철회 중…' : '신청 철회'}</button> : <p>처리가 확정되었거나 철회된 신청은 다시 철회할 수 없습니다.</p>}
      {cancel.isError ? <p role="alert">{cancel.error.message}</p> : null}{cancel.isSuccess ? <p role="status">신청이 철회되었습니다.</p> : null}
    </> : null}
    <Modal className="modal--refund-withdraw-confirm" isOpen={cancelConfirmOpen} title="환불·중도해지 신청을 철회하시겠습니까?" closeLabel="취소" confirmLabel={cancel.isPending ? '철회 중…' : '철회하기'} confirmDisabled={cancel.isPending} onClose={() => { if (!cancel.isPending) setCancelConfirmOpen(false) }} onConfirm={() => { setCancelConfirmOpen(false); cancel.mutate() }}><p>관리자 처리 전 신청만 철회할 수 있습니다.</p></Modal>
  </Modal>
}
