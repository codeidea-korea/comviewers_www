import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Modal } from '@/components/ui/ModalControl'
import { openTossPaymentWindow, paymentWindowError } from '@/routes/commerce/-components/checkout/tossPaymentWindow'

export function OrderPaymentContinuation({ orderNo, orderStatus, paymentStatus }: { orderNo: string; orderStatus: string; paymentStatus: string }) {
  const { checkout } = useServices()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [unresolvedOrderId, setUnresolvedOrderId] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const key = useRef(crypto.randomUUID())
  const [open, setOpen] = useState(false)
  const busy = useRef(false)
  const windowAbort = useRef<AbortController | null>(null)
  useEffect(() => () => windowAbort.current?.abort(), [])
  async function checkAbandonedPayment(providerOrderId: string) {
    setOpen(false)
    setUnresolvedOrderId(providerOrderId)
    if (!checkout.abandon) throw new Error('결제 상태를 확인할 수 없습니다. 주문내역을 확인해 주세요.')
    let status: string
    try { status = (await checkout.abandon(providerOrderId)).status }
    catch { throw new Error('결제 상태를 확인하지 못했습니다. 결제 상태를 다시 확인해 주세요.') }
    if (status === 'cancelled') setCancelled(true)
    await Promise.all(['checkout', 'cart', 'my-account', 'products'].map(query => client.invalidateQueries({ queryKey: [query] })))
    throw new Error(status === 'cancelled'
      ? '결제가 취소되어 재고와 혜택이 복원되었습니다. 장바구니에서 다시 주문해 주세요.'
      : status === 'approved' ? '이미 승인된 결제입니다. 주문내역에서 처리 결과를 확인해 주세요.'
        : '결제 상태를 확인 중입니다. 결제 상태를 다시 확인하거나 주문내역을 확인해 주세요.')
  }
  const resume = useMutation({ mutationFn: async () => {
    if (unresolvedOrderId) return checkAbandonedPayment(unresolvedOrderId)
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
      catch (error) {
        if (controller.signal.aborted) return
        if (value.provider === 'toss_payments' && value.providerOrderId) {
          await checkAbandonedPayment(value.providerOrderId)
        }
        throw new Error(paymentWindowError(error))
      }
    }
  } })
  async function continuePayment() {
    if (busy.current || cancelled) return
    busy.current = true
    try { await resume.mutateAsync() } catch { /* Display the mutation error at the initiating control. */ }
    finally { busy.current = false }
  }
  if (!checkout.resume || paymentStatus !== 'pending' || !['created', 'payment_pending'].includes(orderStatus)) return null
  return <section><button type="button" disabled={resume.isPending || cancelled} onClick={() => { if (unresolvedOrderId) void continuePayment(); else setOpen(true) }}>{resume.isPending ? '결제 진행 중…' : cancelled ? '결제 취소됨' : unresolvedOrderId ? '결제 상태 다시 확인' : '결제 이어가기'}</button>
    {!open && resume.isError && <p className="checkout-submit-error" role="alert">{resume.error.message}</p>}
    <Modal isOpen={open} title="결제 이어가기" closeLabel="닫기" confirmLabel={resume.isPending ? '준비 중…' : '결제 준비'} confirmDisabled={resume.isPending} onClose={() => { if (!resume.isPending) setOpen(false) }} onConfirm={() => void continuePayment()}>
      <p>기존 주문의 결제를 이어갑니다. 결제수단을 아직 준비하지 않은 주문은 카드로 시작합니다.</p>
      {resume.isError && <p className="checkout-submit-error" role="alert">{resume.error.message}</p>}
    </Modal>
  </section>
}
