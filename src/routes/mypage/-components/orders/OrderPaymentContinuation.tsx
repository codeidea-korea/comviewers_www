import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Modal } from '@/components/ui/ModalControl'
import { openTossPaymentWindow, paymentWindowError } from '@/routes/commerce/-components/checkout/tossPaymentWindow'

export function OrderPaymentContinuation({ orderNo, orderStatus, paymentStatus }: { orderNo: string; orderStatus: string; paymentStatus: string }) {
  const { checkout } = useServices()
  const navigate = useNavigate()
  const key = useRef(crypto.randomUUID())
  const [open, setOpen] = useState(false)
  const busy = useRef(false)
  const windowAbort = useRef<AbortController | null>(null)
  useEffect(() => () => windowAbort.current?.abort(), [])
  const resume = useMutation({ mutationFn: async () => {
    const controller = new AbortController()
    windowAbort.current = controller
    let value
    try { value = await checkout.resume!(orderNo, key.current) }
    catch { throw new Error('결제를 준비하지 못했습니다. 결제 기한과 주문 상태를 확인해 주세요.') }
    if (controller.signal.aborted) return
    setOpen(false)
    if (value.paymentStatus === 'approved') navigate(`/checkout/complete?paymentId=${value.paymentId}`)
    else {
      try { await openTossPaymentWindow(value, controller.signal) }
      catch (error) { throw new Error(paymentWindowError(error)) }
    }
  } })
  async function continuePayment() {
    if (busy.current) return
    busy.current = true
    try { await resume.mutateAsync() } catch { /* Display the mutation error at the initiating control. */ }
    finally { busy.current = false }
  }
  if (!checkout.resume || paymentStatus !== 'pending' || !['created', 'payment_pending'].includes(orderStatus)) return null
  return <section><button type="button" disabled={resume.isPending} onClick={() => setOpen(true)}>{resume.isPending ? '결제 진행 중…' : '결제 이어가기'}</button>
    {!open && resume.isError && <p className="checkout-submit-error" role="alert">{resume.error.message}</p>}
    <Modal isOpen={open} title="결제 이어가기" closeLabel="닫기" confirmLabel={resume.isPending ? '준비 중…' : '결제 준비'} confirmDisabled={resume.isPending} onClose={() => { if (!resume.isPending) setOpen(false) }} onConfirm={() => void continuePayment()}>
      <p>기존 주문의 결제를 이어갑니다. 결제수단을 아직 준비하지 않은 주문은 카드로 시작합니다.</p>
      {resume.isError && <p className="checkout-submit-error" role="alert">{resume.error.message}</p>}
    </Modal>
  </section>
}
