import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShellView'
import { CheckoutCompletePresentation, PaymentStatusText } from './-components/CheckoutCompletePresentation'
import { useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import type { AccountOrderDetail, AccountOrderItem } from '@/api/myAccountOrders'
import { accountDate, accountKstDate, accountMoney } from '@/lib/accountFormat'
import { PageTitle } from './CommerceComponents'
import { orderPaymentDisplay, usePaymentDisplayClock } from '@/lib/orderPaymentDisplay'
import { confirmAttemptKey } from './-components/checkout/confirmAttemptKey'

export function CheckoutCompletePage() {
  return <CheckoutPaymentResult />
}

function CheckoutPaymentResult() {
  const { checkout, myAccount } = useServices()
  const [params, setParams] = useSearchParams()
  const client = useQueryClient()
  // Keep paymentKey in memory only; the retry helper stores only the opaque orderId and UUID.
  const [returned] = useState(() => ({ paymentKey: params.get('paymentKey') ?? '', orderId: params.get('orderId') ?? '', amount: Number(params.get('amount')), failed: params.has('code') }))
  const [key] = useState(() => confirmAttemptKey(returned.orderId))
  const started = useRef(false)
  const confirmInFlight = useRef(false)
  const abandonmentStarted = useRef(false)
  const abandon = useMutation({ mutationFn: () => checkout.abandon!(returned.orderId),
    onSuccess: async () => {
      await Promise.all(['checkout', 'cart', 'my-account', 'products'].map(key => client.invalidateQueries({ queryKey: [key] })))
    }, retry: false })
  const failedCallbackValid = returned.failed && Boolean(checkout.abandon) && /^[A-Za-z0-9_-]{6,64}$/.test(returned.orderId)
  useEffect(() => {
    if (failedCallbackValid && !abandonmentStarted.current) {
      abandonmentStarted.current = true
      abandon.mutate()
    }
  }, [failedCallbackValid, abandon.mutate])
  const confirm = useMutation({ mutationFn: () => checkout.confirm!({ paymentKey: returned.paymentKey, orderId: returned.orderId, amount: returned.amount }, key),
    onSuccess: async value => {
      setParams({ paymentId: String(value.paymentId) }, { replace: true })
      await Promise.all(['my-account', 'cart', 'products'].map(key => client.invalidateQueries({ queryKey: [key] })))
    }, retry: false })
  const requestConfirmation = useCallback(() => {
    if (confirmInFlight.current) return
    confirmInFlight.current = true
    confirm.mutate(undefined, { onSettled: () => { confirmInFlight.current = false } })
  }, [confirm.mutate])
  const callbackValid = Boolean(checkout.confirm) && !returned.failed && returned.paymentKey.length > 0 && returned.paymentKey.length <= 200
    && /^[A-Za-z0-9_-]{6,64}$/.test(returned.orderId) && Number.isSafeInteger(returned.amount) && returned.amount > 0
  useEffect(() => {
    if (callbackValid && !started.current) { started.current = true; requestConfirmation() }
  }, [callbackValid, requestConfirmation])
  const paymentId = confirm.data?.paymentId ?? Number(params.get('paymentId'))
  const compensated = confirm.data?.status === 'CANCELED' && !confirm.data.approved
  const valid = Number.isSafeInteger(paymentId) && paymentId > 0 && Boolean(checkout.payment)
  const result = useQuery({ queryKey: ['checkout', 'payment', paymentId], enabled: valid && !compensated, queryFn: ({ signal }) => checkout.payment!(paymentId, signal), retry: false,
    refetchInterval: query => query.state.data && ['pending', 'ready', 'waiting_for_deposit'].includes(query.state.data.status) ? 10000 : false })
  const cancelled = compensated || result.data?.status === 'cancelled'
  const order = useQuery({ queryKey: ['my-account', 'read', 'order', result.data?.orderNo], enabled: !cancelled && Boolean(myAccount.readApi && result.data?.orderNo), queryFn: ({ signal }) => myAccount.readApi!.order(result.data!.orderNo, signal), retry: false,
    refetchInterval: query => query.state.data?.paymentStatus === 'pending' ? 10000 : false })
  const virtual = result.data?.paymentMethod === 'virtual_account'
  const payment = order.data?.payments.find(item => item.paymentId === String(paymentId))
  return <AppShell className={`commerce-shell complete-page complete-page--api ${virtual ? 'complete-page--virtual' : 'complete-page--card'}`}>
    <div className="content-container commerce-page">
      {cancelled ? <>
        <PageTitle>주문 결과</PageTitle>
        <div className="complete-result-state">
          <p role="alert">{compensated ? '상품 배정이 불가능해 결제가 취소되었습니다.' : '결제가 취소되었습니다.'}</p>
          <a href="/cart">장바구니로 이동</a>
        </div>
      </> : result.data && order.data ? <CompleteResult order={order.data} paymentMethod={result.data.paymentMethod} paymentAmount={result.data.amount} paymentStatus={result.data.status} payment={payment} virtualAccount={confirm.data?.virtualAccount ?? null} /> : <>
        <PageTitle>주문 결과</PageTitle>
        <div className="complete-result-state">
          {returned.failed && <>
            <p role="alert">{abandon.isPending ? '결제 상태를 확인하고 있습니다.'
              : abandon.data?.status === 'cancelled' ? '결제가 취소되어 재고와 혜택이 복원되었습니다.'
                : abandon.data?.status === 'approved' ? '이미 승인된 결제입니다. 주문내역에서 처리 결과를 확인해 주세요.'
                  : '결제 종료 여부를 확인하지 못했습니다. 결제 상태를 다시 확인하거나 주문내역을 확인해 주세요.'}</p>
            {failedCallbackValid && !abandon.isPending && abandon.data?.status !== 'cancelled' && <button type="button" onClick={() => abandon.mutate()}>결제 상태 다시 확인</button>}
            <a href={abandon.data?.status === 'cancelled' ? '/cart' : '/mypage/orders'}>{abandon.data?.status === 'cancelled' ? '장바구니로 이동' : '주문내역 확인'}</a>
          </>}
          {confirm.isPending && <p aria-busy="true">결제 승인 결과를 확인하고 있습니다. 잠시 기다려 주세요.</p>}
          {confirm.isError && <><p role="alert">결제 승인 결과를 확인하지 못했습니다.</p><button type="button" onClick={requestConfirmation} disabled={confirm.isPending}>승인 결과 다시 확인</button></>}
          {!valid && !callbackValid && !returned.failed && <p role="alert">결제 조회 정보를 확인할 수 없습니다.</p>}
          {valid && result.isPending && <p aria-busy="true">결제 상태를 확인하고 있습니다.</p>}
          {result.isError && <><p role="alert">결제 상태를 조회하지 못했습니다.</p><button onClick={() => void result.refetch()} type="button">다시 시도</button></>}
          {result.data && order.isPending && <LoadingState className="route-loading--compact" label="주문 상세를 불러오는 중입니다." />}
          {order.isError && <><p role="alert">주문 상세를 불러오지 못했습니다.</p><button type="button" onClick={() => void order.refetch()}>주문 상세 다시 불러오기</button></>}
        </div>
      </>}
    </div>
  </AppShell>
}

const paymentMethods: Record<string, string> = { card: '카드결제', virtual_account: '가상계좌', payco: '페이코' }

export function checkoutCompleteUsagePeriod(item: AccountOrderItem, waitingForDeposit: boolean) {
  if (item.billingUnit === 'unit') return '-'
  if (!waitingForDeposit) return `${accountDate(item.serviceStartedAt)} ~ ${accountDate(item.serviceEndsAt)}`
  const duration = Math.max(1, item.durationUnits ?? 1)
  const waitingDuration: Record<string, string> = {
    hour: `${duration}시간`,
    day: `${duration}일`,
    thirty_day: `${duration * 30}일`,
  }
  const label = waitingDuration[item.billingUnit]
  return label ? `입금 완료 즉시 ~ ${label}` : '-'
}

function completeProduct(item: AccountOrderItem, waitingForDeposit: boolean) {
  const usagePeriod = checkoutCompleteUsagePeriod(item, waitingForDeposit)
  const part = item.billingUnit === 'unit'
  return { key: item.orderItemId, title: item.title.trim() || item.productNo, productNo: item.productNo, serverRoom: item.serverRoomName ?? '-',
    spec: item.specSummary ?? '기록 없음', specLabel: part ? '기본 설명' as const : 'PC사양' as const,
    availability: part ? undefined : item.instantAvailable ? '바로 접속 가능' : '접속 준비 상태 확인 필요',
    monthlyRentalFee: item.billingUnit === 'unit' ? undefined : accountMoney(item.unitPrice), usagePeriod }
}

function CompleteResult({ order, paymentMethod, paymentAmount, paymentStatus, payment, virtualAccount }: {
  order: AccountOrderDetail
  paymentMethod: string
  paymentAmount: number
  paymentStatus: string
  payment?: AccountOrderDetail['payments'][number]
  virtualAccount: { bankCode: string; accountNumber: string; customerName: string | null; dueDate: string } | null
}) {
  const now = usePaymentDisplayClock(paymentMethod === 'virtual_account' && order.paymentStatus === 'pending')
  const currentAttempt = Boolean(payment && payment.paymentId === order.payments[0]?.paymentId)
  const display = orderPaymentDisplay({ ...order, virtualAccountStatus: currentAttempt ? order.virtualAccountStatus : null }, now, paymentStatus)
  // A historical attempt must not expose the current attempt's deposit instructions.
  const waitingForDeposit = paymentMethod === 'virtual_account' && currentAttempt && display.waitingForDeposit
  const bank = virtualAccount?.bankCode ?? payment?.bankName ?? '-'
  const account = virtualAccount?.accountNumber ?? payment?.accountMasked ?? '-'
  const depositor = virtualAccount?.customerName ?? payment?.depositorName ?? '-'
  const dueAt = virtualAccount?.dueDate ?? payment?.depositDueAt ?? null
  const depositRows: readonly (readonly [string, ReactNode])[] = waitingForDeposit ? [
    ['입금은행', bank], ['입금자명', <strong key="depositor">{depositor}</strong>], ['입금계좌', <strong key="account">{account}</strong>],
    ['입금기한', <span className="complete-deadline" key="deadline"><strong>{accountKstDate(dueAt)}</strong><em>* 입금기한 내 미입금 시 자동 취소됩니다.</em></span>],
  ] : []
  const paymentRows: readonly (readonly [string, ReactNode])[] = [
    ['주문번호', order.orderNo], ['주문일시', accountDate(order.orderedAt)],
    ['결제방식', paymentMethods[paymentMethod] ?? paymentMethod], ['결제금액', accountMoney(paymentAmount)],
    ['결제상태', <PaymentStatusText key="payment-status" label={display.label} />],
    ...depositRows,
  ]
  const contact = order.contact
  return <CheckoutCompletePresentation
    title={waitingForDeposit ? '주문완료' : display.label}
    products={order.items.map(item => completeProduct(item, waitingForDeposit))}
    paymentRows={paymentRows}
    contactRows={[
      ['이름', contact?.name ?? '-'], ['메신저ID', [contact?.messengerType, contact?.messengerId].filter(Boolean).join(' / ') || '-'],
      ['핸드폰', contact?.phone || '-'], ['Email', contact?.email ?? '-'],
    ]}
    showRemoteInfo={display.label === '결제완료'}
  />
}
