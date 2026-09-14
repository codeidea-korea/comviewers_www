import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountOrderDetail } from '@/api/myAccountOrders'
import { useServices } from '@/app/ServiceProvider'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { Modal } from '@/components/ui/ModalControl'
import { AccountInfo, accountDate, accountMoney, accountStatus } from './AccountReadCommon'

const methods: Record<string, string> = { card: '카드', virtual_account: '가상계좌', payco: '페이코', kakao_pay: '카카오페이', naver_pay: '네이버페이', bank_transfer: '계좌이체', internal_zero: '0원 내부 정산', cash: '원결제 수단', point: '포인트', mixed: '원결제·포인트' }
const refundStatuses: Record<string, string> = { requested: '환불 접수', approved: '승인', rejected: '반려', cancelled: '철회', processing: '처리 중', paid: '지급 완료', failed: '실패' }

export function HttpOrderFinance({ order }: { order: AccountOrderDetail }) {
  return <><section><h2>실제 결제 내역</h2>{order.payments.map(payment => <OrderPayment key={payment.paymentId} payment={payment}/>)}{!order.payments.length && <p>결제 내역이 없습니다.</p>}</section>
    {order.refunds.length > 0 && <section><h2>환불 정보</h2>{order.refunds.map(refund => <article key={refund.requestId}>
      <h3>{order.items.find(item => item.orderItemId === refund.orderItemId)?.title ?? '연결된 주문 상품'} · {refundStatuses[refund.status] ?? refund.status}</h3>
      <AccountInfo rows={[["신청일", accountDate(refund.requestedAt)], ["환불 방식", methods[refund.method] ?? refund.method], ["신청 전체 예상 금액", `${accountMoney(refund.requestedAmount)} / ${refund.requestedPointAmount.toLocaleString()}포인트`], ["신청 전체 승인 금액", `${accountMoney(refund.approvedAmount)} / ${refund.approvedPointAmount?.toLocaleString() ?? '-'}포인트`], ["사용 포인트 복원액", refund.restoredPoints === null ? '-' : `${refund.restoredPoints.toLocaleString()}포인트`], ["이용일 공제율", refund.usedDaysDeductionRateBasisPoints === null ? '-' : `${refund.usedDaysDeductionRateBasisPoints / 100}%`], ["이 주문에 배분된 실제 지급액", `${accountMoney(refund.paidCash)} / ${refund.paidPoints.toLocaleString()}포인트`], ["처리일", accountDate(refund.processedAt)]]}/>
      {refund.status === 'requested' && <WithdrawRefund requestId={Number(refund.requestId)}/>}
      <RelativeLink to="/mypage/inquiries">환불 처리 이력 보기</RelativeLink>
    </article>)}</section>}</>
}

function OrderPayment({ payment }: { payment: AccountOrderDetail['payments'][number] }) {
  const { checkout } = useServices()
  const key = useRef(crypto.randomUUID())
  const refresh = useMutation({ mutationFn: async () => {
    if (!checkout.refresh || !payment.providerOrderId) throw new Error('결제 상태를 확인할 수 없습니다.')
    const response = await checkout.refresh(payment.providerOrderId, key.current)
    // Keep only display information; provider credentials never enter a query cache.
    return { approved: response.approved, status: response.status, account: response.virtualAccount }
  } })
  return <article><AccountInfo rows={[["결제 방식", methods[payment.method] ?? payment.method], ["결제금액", accountMoney(payment.amount)], ["결제상태", accountStatus(payment.status)], ["승인일", accountDate(payment.approvedAt)]]}/>
    {payment.accountMasked && <AccountInfo rows={[["은행", payment.bankName], ["입금자명", payment.depositorName], ["입금계좌", payment.accountMasked], ["입금기한", accountDate(payment.depositDueAt)]]}/>}
    {payment.method === 'virtual_account' && payment.providerOrderId && checkout.refresh && <button type="button" disabled={refresh.isPending} onClick={() => refresh.mutate()}>입금계좌·최신 상태 확인</button>}
    {refresh.error && <p role="alert">{refresh.error.message}</p>}
    {refresh.data && <p>최신 결제 상태: {refresh.data.approved ? '결제 완료' : refresh.data.status}</p>}
    {refresh.data?.account && <p>은행 {refresh.data.account.bankCode} · {refresh.data.account.accountNumber} · 입금자 {refresh.data.account.customerName ?? '-'} · 기한 {refresh.data.account.dueDate}</p>}
  </article>
}

export function WithdrawRefund({ requestId }: { requestId: number }) {
  const { myAccount } = useServices()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const cancel = useMutation({ mutationFn: async () => {
    if (!myAccount.inquiryApi) throw new Error('철회 API를 사용할 수 없습니다.')
    return myAccount.inquiryApi.cancelRefund(requestId)
  }, onSuccess: async () => {
    setOpen(false)
    await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }), client.invalidateQueries({ queryKey: ['my-refund-requests'] }), client.invalidateQueries({ queryKey: ['my-rcpcs'] })])
  } })
  if (!myAccount.inquiryApi) return null
  return <><button type="button" onClick={() => setOpen(true)}>해지 신청 철회</button><Modal isOpen={open} title="해지 신청 철회" closeLabel="취소" confirmLabel="철회하기" confirmDisabled={cancel.isPending} onClose={() => { if (!cancel.isPending) setOpen(false) }} onConfirm={() => cancel.mutate()}>
    <p>해지 신청을 철회하시겠습니까?</p>{cancel.error && <p role="alert">{cancel.error.message}</p>}
  </Modal></>
}
