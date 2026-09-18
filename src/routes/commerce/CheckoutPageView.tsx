import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { Button } from '@/components/ui/ButtonControl'
import { useCheckoutQuote } from './-components/checkout/hooks/useCheckoutQuote'
import { useCheckoutForm } from './-components/checkout/hooks/useCheckoutForm'
import { CheckoutProducts } from './-components/checkout/CheckoutProducts'
import { CheckoutDiscounts } from './-components/checkout/CheckoutDiscounts'
import { CheckoutCustomer } from './-components/checkout/CheckoutCustomer'
import { CheckoutReceipt } from './-components/checkout/CheckoutReceipt'
import { CheckoutSummary } from './-components/checkout/CheckoutSummary'
import { openTossPaymentWindow, paymentWindowError } from './-components/checkout/tossPaymentWindow'
import type { OrderBenefitQuote } from '@/api/ordersPayments'
import { ApiClientError } from '@/api/httpClient'
import type { CheckoutQuote, CheckoutSubmission } from '@/domain/checkout/checkoutRepository'
import { CommerceCartState } from './-components/CommerceCartState'
import { PageTitle } from './CommerceComponents'

type CheckoutAttempt = { input: CheckoutSubmission; quote: CheckoutQuote; benefits: OrderBenefitQuote }

function CheckoutContent({ ids }: { ids: readonly string[] }) {
  const { checkout, myAccount } = useServices()
  const navigate = useNavigate()
  const [couponId, setCouponId] = useState<number | null>(null)
  const [points, setPoints] = useState('0')
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(null)
  const attemptRef = useRef<CheckoutAttempt | null>(null)
  const submitting = useRef(false)
  const windowAbort = useRef<AbortController | null>(null)
  useEffect(() => () => windowAbort.current?.abort(), [])
  const result = useCheckoutQuote(ids, !attempt)
  const benefits = useQuery({ queryKey: ['checkout', 'benefits', ids, couponId, Number(points)],
    queryFn: ({ signal }) => checkout.benefitQuote!(ids, couponId, Number(points), signal),
    enabled: Boolean(checkout.benefitQuote && result.data?.checkoutEligible && !attempt), retry: false })
  const benefitReady = !checkout.benefitQuote || Boolean(benefits.data && !benefits.isFetching && !benefits.isError)
  const productUnavailable = !attempt && benefits.error instanceof ApiClientError && benefits.error.code === 'OR001'
  const form = useCheckoutForm()
  const profile = useMutation({ mutationFn: async (force: boolean) => ({ value: await myAccount.readApi!.profile(), force }), onSuccess: ({ value, force }) => { if (!attemptRef.current) form.fillProfile(value, force) } })
  const profileLoaded = useRef(false)
  useEffect(() => {
    if (myAccount.readApi && !profileLoaded.current) { profileLoaded.current = true; profile.mutate(false) }
  }, [myAccount.readApi, profile])
  const showReceipt = form.payment === 'virtual-account'
  const submit = useMutation({ mutationFn: async (current: CheckoutAttempt) => {
    if (!checkout.start) throw new Error('현재 주문을 진행할 수 없습니다.')
    const controller = new AbortController()
    windowAbort.current = controller
    let payment
    try { payment = await checkout.start(current.input) }
    catch { throw new Error('주문 또는 결제 준비를 완료하지 못했습니다. 다시 시도하거나 주문내역을 확인해 주세요.') }
    if (controller.signal.aborted) return
    if (payment.paymentStatus === 'approved') { navigate(`/checkout/complete?paymentId=${payment.paymentId}`); return }
    try { await openTossPaymentWindow(payment, controller.signal) }
    catch (error) { throw new Error(paymentWindowError(error)) }
  } })
  async function submitOrder() {
    if (submitting.current) return
    let current = attemptRef.current
    if (!current) {
      const draft = form.validate()
      if (!draft || !result.data?.checkoutEligible || !benefits.data || !benefitReady || result.isFetching) return
      const payment = ({ 'virtual-account': 'virtual_account', card: 'card', payco: 'payco', 'global-card': 'card' } as const)[draft.payment]
      current = { quote: result.data, benefits: benefits.data, input: { cartItemIds: ids, contact: draft.contact, payment,
        cashReceiptType: draft.receiptType, cashReceiptIdentifier: draft.receiptIdentifier, userCouponId: couponId,
        pointAmount: Number(points), expectedFinalAmount: benefits.data.finalAmount, idempotencyKey: crypto.randomUUID() } }
      attemptRef.current = current
      setAttempt(current)
    }
    submitting.current = true
    try { await submit.mutateAsync(current) } catch { /* The mutation error is displayed beside the order button. */ }
    finally { submitting.current = false }
  }
  const quote = attempt?.quote ?? result.data
  const shownBenefits = attempt?.benefits ?? benefits.data
  const refreshing = !attempt && (result.isFetching || !benefitReady)
  const pageState = quote ? 'filled' : 'empty'
  const contentStatus = attempt ? null : !result.validSelection ? 'empty' : result.isPending ? 'loading' : result.isError ? 'error' : null
  return <AppShell className={`commerce-shell checkout-page checkout-page--service checkout-page--${pageState}${showReceipt ? ' checkout-page--with-receipt' : ''}`}>
    <div className="content-container commerce-page"><PageTitle>주문서 작성</PageTitle>
      
      {contentStatus ? <CommerceCartState status={contentStatus} loadingLabel="선택 상품의 예상 금액을 불러오는 중입니다." errorMessage="선택한 상품을 조회하지 못했습니다. 상품이 삭제되었거나 장바구니 상태가 변경되었을 수 있습니다." onRetry={() => { void result.refetch() }} errorAction={<Button as={RelativeLink} className="checkout-return-cart-button" size="large" to="/cart" variant="secondary">장바구니로 이동</Button>}><p>장바구니에서 주문할 상품을 다시 선택해 주세요. 한 번에 최대 100개 항목을 확인할 수 있습니다.</p><Button as={RelativeLink} className="checkout-return-cart-button" size="large" to="/cart">장바구니로 이동</Button></CommerceCartState>
            : quote ? <div className="checkout-layout" aria-busy={refreshing}><div className="checkout-main">
              <CheckoutProducts items={quote.items} />
              {productUnavailable ? <div className="checkout-product-error">
                <p role="alert">선택한 상품 중 현재 주문할 수 없는 상품이 있습니다. 장바구니에서 상품 상태를 다시 확인해 주세요.</p>
                <div><Button as={RelativeLink} size="small" variant="secondary" to="/cart">장바구니로 이동</Button><Button size="small" variant="secondary" disabled={benefits.isFetching} onClick={() => void benefits.refetch()}>{benefits.isFetching ? '확인 중…' : '상품 상태 다시 확인'}</Button></div>
              </div> : <CheckoutDiscounts quote={shownBenefits} couponId={couponId} points={points} disabled={!checkout.benefitQuote || !!attempt} pending={!attempt && benefits.isFetching} error={attempt ? null : benefits.error} onCoupon={value => { setCouponId(value); setPoints('0') }} onPoints={setPoints} onRetry={() => void benefits.refetch()} onReset={() => { setCouponId(null); setPoints('0') }} />}
              {profile.isError && <p role="alert">회원 정보를 불러오지 못했습니다. 직접 입력해 주세요.</p>}
              <fieldset className="checkout-input-fields" disabled={!!attempt}><CheckoutCustomer form={form} pending={profile.isPending} />{showReceipt && <CheckoutReceipt form={form} />}</fieldset>
            </div><CheckoutSummary quote={quote} benefits={shownBenefits} form={form} refreshing={refreshing} locked={!!attempt} submitting={submit.isPending} submitError={submit.error?.message} onSubmit={() => void submitOrder()} /></div> : null}
    </div>
  </AppShell>
}
export function CheckoutPage() {
  const [params] = useSearchParams()
  const ids = params.getAll('cartItemId')
  return <CheckoutContent ids={ids} key={JSON.stringify(ids)} />
}
