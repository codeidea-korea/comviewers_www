import { useState } from 'react'
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail } from '@/api/myAccountOrders'
import { useServices } from '@/app/ServiceProvider'
import { Modal } from '@/components/ui/ModalControl'
import { Button } from '@/components/ui/ButtonControl'

export function RefundWithdrawalAction({ order, itemId }: { order: UseQueryResult<AccountOrderDetail, Error>; itemId: string }) {
  const { myAccount } = useServices()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const refund = order.data?.refunds.find(entry => entry.orderItemId === itemId)
    ?? order.data?.refunds.find(entry => entry.orderItemId === null)
  const requestId = Number(refund?.requestId)
  const canWithdraw = refund?.status === 'requested' && Number.isSafeInteger(requestId) && requestId > 0
  const cancel = useMutation({ mutationFn: async () => {
    if (!myAccount.inquiryApi || !canWithdraw) throw new Error('철회할 수 있는 해지 신청이 없습니다.')
    return myAccount.inquiryApi.cancelRefund(requestId)
  }, onSuccess: async () => {
    setOpen(false)
    await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }), client.invalidateQueries({ queryKey: ['my-refund-requests'] }), client.invalidateQueries({ queryKey: ['my-rcpcs'] })])
  } })
  return <><Button size="small" variant="secondary" disabled={!myAccount.inquiryApi || !canWithdraw} onClick={() => setOpen(true)}>해지신청 철회</Button><Modal isOpen={open} title="해지신청 철회" closeLabel="취소" confirmLabel="철회하기" confirmDisabled={cancel.isPending} onClose={() => { if (!cancel.isPending) setOpen(false) }} onConfirm={() => cancel.mutate()}>
    <p>해지 신청을 철회하시겠습니까?</p>{cancel.error && <p role="alert">{cancel.error.message}</p>}
  </Modal></>
}
