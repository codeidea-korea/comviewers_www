import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShellView'
import { CheckoutCompletePresentation } from './-components/CheckoutCompletePresentation'
import { useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import type { AccountOrderDetail, AccountOrderItem } from '@/api/myAccountOrders'
import { accountDate, accountKstDate, accountMoney } from '@/lib/accountFormat'
import { PageTitle } from './CommerceComponents'

export function CheckoutCompletePage() {
  return <CheckoutPaymentResult />
}

function CheckoutPaymentResult() {
  const { checkout, myAccount } = useServices()
  const [params, setParams] = useSearchParams()
  const client = useQueryClient()
  // Never put return credentials into query keys or persistent storage.
  const [returned] = useState(() => ({ paymentKey: params.get('paymentKey') ?? '', orderId: params.get('orderId') ?? '', amount: Number(params.get('amount')), failed: params.has('code') }))
  const [key] = useState(() => crypto.randomUUID())
  const started = useRef(false)
  const confirm = useMutation({ mutationFn: () => checkout.confirm!({ paymentKey: returned.paymentKey, orderId: returned.orderId, amount: returned.amount }, key),
    onSuccess: async value => {
      setParams({ paymentId: String(value.paymentId) }, { replace: true })
      await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }), client.invalidateQueries({ queryKey: ['cart'] })])
    }, retry: false })
  const callbackValid = Boolean(checkout.confirm) && !returned.failed && returned.paymentKey.length > 0 && returned.paymentKey.length <= 200
    && /^[A-Za-z0-9_-]{6,64}$/.test(returned.orderId) && Number.isSafeInteger(returned.amount) && returned.amount > 0
  useEffect(() => {
    if (callbackValid && !started.current) { started.current = true; confirm.mutate() }
  }, [callbackValid, confirm])
  const paymentId = confirm.data?.paymentId ?? Number(params.get('paymentId'))
  const valid = Number.isSafeInteger(paymentId) && paymentId > 0 && Boolean(checkout.payment)
  const result = useQuery({ queryKey: ['checkout', 'payment', paymentId], enabled: valid, queryFn: ({ signal }) => checkout.payment!(paymentId, signal), retry: false,
    refetchInterval: query => query.state.data && ['pending', 'ready', 'waiting_for_deposit'].includes(query.state.data.status) ? 10000 : false })
  const order = useQuery({ queryKey: ['my-account', 'read', 'order', result.data?.orderNo], enabled: Boolean(myAccount.readApi && result.data?.orderNo), queryFn: ({ signal }) => myAccount.readApi!.order(result.data!.orderNo, signal), retry: false })
  const paid = result.data?.status === 'approved'
  const virtual = result.data?.paymentMethod === 'virtual_account' && !paid
  const payment = order.data?.payments.find(item => item.paymentId === String(paymentId)) ?? order.data?.payments[0]
  return <AppShell className={`commerce-shell complete-page complete-page--api ${virtual ? 'complete-page--virtual' : 'complete-page--card'}`}>
    <div className="content-container commerce-page">
      {result.data && order.data ? <CompleteResult order={order.data} paymentMethod={result.data.paymentMethod} paymentAmount={result.data.amount} paymentStatus={result.data.status} payment={payment} virtualAccount={confirm.data?.virtualAccount ?? null} /> : <>
        <PageTitle>주문 결과</PageTitle>
        <div className="complete-result-state">
          {returned.failed && <p role="alert">결제가 완료되지 않았습니다. 주문내역에서 최신 결제 상태를 확인해 주세요.</p>}
          {confirm.isPending && <p aria-busy="true">결제 승인 결과를 확인하고 있습니다. 잠시 기다려 주세요.</p>}
          {confirm.isError && <><p role="alert">결제 승인 결과를 확인하지 못했습니다.</p><button type="button" onClick={() => confirm.mutate()} disabled={confirm.isPending}>승인 결과 다시 확인</button></>}
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
  const waitingForDeposit = paymentMethod === 'virtual_account' && paymentStatus !== 'approved'
  const bank = virtualAccount?.bankCode ?? payment?.bankName ?? '-'
  const account = virtualAccount?.accountNumber ?? payment?.accountMasked ?? '-'
  const depositor = virtualAccount?.customerName ?? payment?.depositorName ?? '-'
  const dueAt = virtualAccount?.dueDate ?? payment?.depositDueAt ?? null
  const depositRows: readonly (readonly [string, ReactNode])[] = waitingForDeposit ? [
    ['입금은행', bank], ['입금자명', <strong key="depositor">{depositor}</strong>], ['입금계좌', <strong key="account">{account}</strong>],
    ['입금기한', <span className="complete-deadline" key="deadline"><strong>{accountKstDate(dueAt)}</strong><em>* 주문 후 30분 이내 미입금 시 자동 취소됩니다.</em></span>],
  ] : []
  const paymentRows: readonly (readonly [string, ReactNode])[] = [
    ['주문번호', order.orderNo], ['주문일시', accountDate(order.orderedAt)],
    ['결제방식', paymentMethods[paymentMethod] ?? paymentMethod], ['결제금액', accountMoney(paymentAmount)],
    ...depositRows,
  ]
  const contact = order.contact
  return <CheckoutCompletePresentation
    title={waitingForDeposit ? '주문완료' : paymentStatus === 'approved' ? '결제완료' : '주문 결과'}
    products={order.items.map(item => completeProduct(item, waitingForDeposit))}
    paymentRows={paymentRows}
    contactRows={[
      ['이름', contact?.name ?? '-'], ['메신저ID', [contact?.messengerType, contact?.messengerId].filter(Boolean).join(' / ') || '-'],
      ['핸드폰', contact?.phone || '-'], ['Email', contact?.email ?? '-'],
    ]}
    showRemoteInfo={paymentStatus === 'approved'}
  />
}
