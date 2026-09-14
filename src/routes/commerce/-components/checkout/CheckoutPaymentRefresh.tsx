import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { PreparedPayment } from '@/api/ordersPayments'

export function CheckoutPaymentRefresh({ payment }: { payment: PreparedPayment }) {
  const { checkout } = useServices()
  const key = useRef(crypto.randomUUID())
  const refresh = useMutation({ mutationFn: () => checkout.refresh!(payment.providerOrderId!, key.current) })
  if (!checkout.refresh || !payment.providerOrderId) return null
  const account = refresh.data?.virtualAccount
  return <section><button type="button" disabled={refresh.isPending} onClick={() => refresh.mutate()}>입금계좌·최신 결제 상태 확인</button>
    {refresh.isPending && <p aria-busy="true">결제기관에서 확인하고 있습니다.</p>}
    {refresh.isError && <p role="alert">기존 결제를 확인하지 못했습니다. 아직 결제 또는 계좌 발급 전이라면 결제하기를 진행해 주세요.</p>}
    {refresh.data?.approved && <p>결제가 확인되었습니다. <RelativeLink to={`/checkout/complete?paymentId=${payment.paymentId}`}>결제 결과 확인</RelativeLink></p>}
    {refresh.data && !refresh.data.approved && <p>결제기관 상태: {refresh.data.status}</p>}
    {account && refresh.data?.status === 'WAITING_FOR_DEPOSIT' && <div><h3>가상계좌 입금 안내</h3><p>은행 코드 {account.bankCode} · 계좌 {account.accountNumber}</p><p>입금자명 {account.customerName ?? '-'} · 입금기한 {account.dueDate}</p><p>발급된 계좌로 입금하면 확인 후 이용이 시작됩니다.</p></div>}
  </section>
}
