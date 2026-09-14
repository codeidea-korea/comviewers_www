import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { ChangeOrderRefundInput } from '@/api/changeOrderRefunds'
import { Modal } from '@/components/ui/ModalControl'
import { accountMoney, useAccountRead } from './AccountReadCommon'
import { LoadingState } from '@/components/ui/LoadingStateControl'

export function HttpChangeOrderRefund({ api, orderNo }: { api: MyAccountReadServices; orderNo: string }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<'point' | 'original'>('point')
  const [reason, setReason] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [attempt, setAttempt] = useState<{ key: string; input: ChangeOrderRefundInput } | null>(null)
  const quote = useAccountRead(['change-order-refund', orderNo, method], signal => api.changeOrderRefunds.quote(orderNo, method, signal))
  const submit = useMutation({ mutationFn: () => {
    const value = attempt ?? (quote.data ? { key: crypto.randomUUID(), input: { orderNo, quote: quote.data, reason: reason.trim(), contactPhone: phone.trim() } } : null)
    if (!value || !agreed || !value.input.reason.trim() || value.input.reason.length > 2000
      || !value.input.contactPhone.trim() || value.input.contactPhone.length > 30) throw new Error('환불 신청 내용을 확인해 주세요.')
    setAttempt(value)
    return api.changeOrderRefunds.submit(value.input, value.key)
  }, onSuccess: async () => { setOpen(false); await client.invalidateQueries({ queryKey: ['my-account'] }) } })
  if (submit.isSuccess) return <p role="status">교체 추가금 환불을 신청했습니다. 최종 인정액은 관리자 확인 후 확정됩니다.</p>
  if (!quote.data && !open && !attempt) return null
  const locked = submit.isPending || attempt !== null
  return <>
    <button type="button" onClick={() => setOpen(true)}>인계 전 교체 추가금 환불 신청</button>
    <Modal isOpen={open} title="교체 추가금 환불 신청" onClose={() => { if (!submit.isPending) setOpen(false) }}
      closeLabel="닫기" confirmLabel={submit.isPending ? '신청 중…' : attempt ? '같은 신청 다시 확인' : '환불 신청'}
      confirmDisabled={submit.isPending || !agreed || (!attempt && (!quote.data || !reason.trim() || !phone.trim() || quote.data.requestCeiling <= 0))}
      onConfirm={() => submit.mutate()}>
      <p>장비 인계 전 추가금 주문에 대한 신청입니다. 기존 렌탈 이용기간과 종료 요청은 별도로 유지됩니다. 관리자 승인 후 실제 환불이 완료되면 교체 예약을 취소합니다.</p>
      <label>환불 수단 <select value={method} disabled={locked} onChange={event => setMethod(event.target.value as 'point' | 'original')}>
        <option value="point">포인트</option>{quote.data?.originalAvailable && <option value="original">원결제 수단 및 사용 포인트 복원</option>}
      </select></label>
      {quote.isPending && <LoadingState className="route-loading--compact" label="신청 한도를 확인하고 있습니다." />}
      {quote.error && <p role="alert">신청 한도를 확인할 수 없습니다. <button type="button" disabled={locked} onClick={() => { void quote.refetch() }}>다시 확인</button></p>}
      {quote.data && <><p>신청 상한 {accountMoney(quote.data.requestCeiling)} · 현금 {accountMoney(quote.data.cashAmount)} · 포인트 {accountMoney(quote.data.pointAmount)}</p><p>쿠폰 {accountMoney(quote.data.couponDeductionAmount)}과 프로모션 포인트 {accountMoney(quote.data.promotionalPointDeductionAmount)}은 복원하지 않습니다. 최종 인정액은 검토 결과에 따라 달라질 수 있습니다.</p></>}
      <label>신청 사유<textarea value={reason} maxLength={2000} disabled={locked} onChange={event => setReason(event.target.value)} /></label>
      <label>연락처<input type="tel" value={phone} maxLength={30} disabled={locked} onChange={event => setPhone(event.target.value)} /></label>
      <label><input type="checkbox" checked={agreed} disabled={locked} onChange={event => setAgreed(event.target.checked)} />환불 수단, 신청 한도와 교체 예약 취소 안내를 확인했습니다.</label>
      {submit.isError && <p role="alert">신청 결과를 확인하지 못했습니다. 입력한 내용과 요청 키를 유지하여 같은 신청을 다시 확인할 수 있습니다.</p>}
    </Modal>
  </>
}
