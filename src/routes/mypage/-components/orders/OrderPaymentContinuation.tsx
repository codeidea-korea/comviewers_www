import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Modal } from '@/components/ui/ModalControl'
import { CheckoutPaymentWidget } from '@/routes/commerce/-components/checkout/CheckoutPaymentWidget'
import type { PreparedPayment } from '@/api/ordersPayments'

export function OrderPaymentContinuation({ orderNo, orderStatus, paymentStatus }: { orderNo: string; orderStatus: string; paymentStatus: string }) {
  const { checkout } = useServices()
  const navigate = useNavigate()
  const key = useRef(crypto.randomUUID())
  const [open, setOpen] = useState(false)
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null)
  const resume = useMutation({ mutationFn: () => checkout.resume!(orderNo, key.current), onSuccess: value => {
    setOpen(false)
    if (value.paymentStatus === 'approved') navigate(`/checkout/complete?paymentId=${value.paymentId}`)
    else setPrepared(value)
  } })
  if (!checkout.resume || paymentStatus !== 'pending' || !['created', 'payment_pending'].includes(orderStatus)) return null
  return <section>{prepared ? <CheckoutPaymentWidget payment={prepared} /> : <button type="button" onClick={() => setOpen(true)}>결제 이어가기</button>}
    <Modal isOpen={open} title="결제 이어가기" closeLabel="닫기" confirmLabel={resume.isPending ? '준비 중…' : '결제 준비'} confirmDisabled={resume.isPending} onClose={() => { if (!resume.isPending) setOpen(false) }} onConfirm={() => resume.mutate()}>
      <p>기존 주문의 결제를 이어갑니다. 결제수단을 아직 준비하지 않은 주문은 카드로 시작합니다.</p>
      {resume.isError && <p role="alert">결제를 준비하지 못했습니다. 결제 기한과 주문 상태를 확인해 주세요.</p>}
    </Modal>
  </section>
}
