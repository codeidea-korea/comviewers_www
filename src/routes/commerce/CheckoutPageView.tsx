import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { useCheckoutQuote } from './-components/checkout/hooks/useCheckoutQuote'
import { useCheckoutForm } from './-components/checkout/hooks/useCheckoutForm'
import { CheckoutProducts } from './-components/checkout/CheckoutProducts'
import { CheckoutDiscounts } from './-components/checkout/CheckoutDiscounts'
import { CheckoutCustomer } from './-components/checkout/CheckoutCustomer'
import { CheckoutReceipt } from './-components/checkout/CheckoutReceipt'
import { CheckoutSummary } from './-components/checkout/CheckoutSummary'
import { CheckoutPaymentWidget } from './-components/checkout/CheckoutPaymentWidget'
import type { PreparedPayment } from '@/api/ordersPayments'
import type { CheckoutValidatedDraft } from './-components/checkout/hooks/useCheckoutForm'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { PageTitle } from './CommerceComponents'

function CheckoutContent({ ids }: { ids: readonly string[] }) {
  const { checkout, myAccount } = useServices()
  const navigate = useNavigate()
  const [couponId, setCouponId] = useState<number | null>(null)
  const [points, setPoints] = useState('0')
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null)
  const submissionKey = useRef<{ signature: string; key: string } | null>(null)
  const result = useCheckoutQuote(ids)
  const benefits = useQuery({ queryKey: ['checkout', 'benefits', ids, couponId, Number(points)],
    queryFn: ({ signal }) => checkout.benefitQuote!(ids, couponId, Number(points), signal),
    enabled: Boolean(checkout.benefitQuote && result.data?.checkoutEligible && !prepared), retry: false })
  const benefitReady = !checkout.benefitQuote || Boolean(benefits.data && !benefits.isFetching && !benefits.isError)
  const form = useCheckoutForm()
  const terms = useQuery({ queryKey: ['checkout', 'terms'], enabled: Boolean(checkout.terms), queryFn: () => checkout.terms!(), staleTime: Infinity, retry: false })
  const profile = useMutation({ mutationFn: async (force: boolean) => ({ value: await myAccount.readApi!.profile(), force }), onSuccess: ({ value, force }) => form.fillProfile(value, force) })
  const profileLoaded = useRef(false)
  useEffect(() => {
    if (myAccount.readApi && !profileLoaded.current) { profileLoaded.current = true; profile.mutate(false) }
  }, [myAccount.readApi, profile])
  const showReceipt = form.payment === 'virtual-account'
  const submit = useMutation({ mutationFn: async (draft: CheckoutValidatedDraft) => {
    if (!checkout.start) throw new Error('현재 주문을 진행할 수 없습니다.')
    const payment = ({ 'virtual-account': 'virtual_account', card: 'card', payco: 'payco', 'global-card': 'card' } as const)[draft.payment]
    if (!terms.data?.length) throw new Error('현재 주문 약관을 확인해 주세요.')
    if (!benefits.data || !benefitReady) throw new Error('할인 금액을 다시 확인해 주세요.')
    const input = { cartItemIds: ids, contact: draft.contact, payment, cashReceiptType: draft.receiptType, cashReceiptIdentifier: draft.receiptIdentifier, terms: terms.data,
      userCouponId: couponId, pointAmount: Number(points), expectedFinalAmount: benefits.data.finalAmount }
    const signature = JSON.stringify(input)
    if (submissionKey.current?.signature !== signature) submissionKey.current = { signature, key: crypto.randomUUID() }
    return checkout.start({ ...input, idempotencyKey: submissionKey.current.key })
  }, onSuccess: value => { if (value.paymentStatus === 'approved') navigate(`/checkout/complete?paymentId=${value.paymentId}`); else setPrepared(value) } })
  function submitOrder() {
    const draft = form.validate()
    if (draft) submit.mutate(draft)
  }
  const pageState = result.data ? 'filled' : 'empty'
  return <AppShell className={`commerce-shell checkout-page checkout-page--${pageState}${showReceipt ? ' checkout-page--with-receipt' : ''}`}>
    <div className="content-container commerce-page"><PageTitle>주문서 작성</PageTitle>
      
      {prepared ? <CheckoutPaymentWidget payment={prepared} /> : !result.validSelection ? <section className="cart-empty"><p>장바구니에서 주문할 상품을 다시 선택해 주세요. 한 번에 최대 100개 항목을 확인할 수 있습니다.</p><RelativeLink to="/cart">장바구니로 이동</RelativeLink></section>
        : result.isPending ? <section className="cart-empty" aria-busy="true"><LoadingState label="선택 상품의 예상 금액을 불러오는 중입니다." /></section>
          : result.isError ? <section className="cart-empty"><p role="alert">선택한 상품을 조회하지 못했습니다. 상품이 삭제되었거나 장바구니 상태가 변경되었을 수 있습니다.</p><button onClick={() => { void result.refetch() }} type="button">다시 시도</button><RelativeLink to="/cart">장바구니로 이동</RelativeLink></section>
            : result.data ? <div className="checkout-layout" aria-busy={result.isFetching}><div className="checkout-main">
              <CheckoutProducts items={result.data.items} /><CheckoutDiscounts quote={benefits.data} couponId={couponId} points={points} disabled={!checkout.benefitQuote || submit.isPending} pending={benefits.isFetching} error={benefits.isError} onCoupon={value => { setCouponId(value); setPoints('0') }} onPoints={setPoints} onRetry={() => void benefits.refetch()} />
              {profile.isError && <p role="alert">회원 정보를 불러오지 못했습니다. 직접 입력해 주세요.</p>}
              <CheckoutCustomer form={form} pending={profile.isPending} />{showReceipt && <CheckoutReceipt form={form} />}
              {checkout.terms && terms.isError ? <p role="alert">주문 약관을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : null}
            </div><CheckoutSummary quote={result.data} benefits={benefits.data} form={form} refreshing={result.isFetching || !benefitReady} submissionBlocked={terms.isPending || !terms.data?.length} submitting={submit.isPending} submitError={submit.isError} terms={terms.data ?? []} onSubmit={submitOrder} /></div> : null}
    </div>
  </AppShell>
}
export function CheckoutPage() {
  const [params] = useSearchParams()
  const ids = params.getAll('cartItemId')
  return <CheckoutContent ids={ids} key={JSON.stringify(ids)} />
}
