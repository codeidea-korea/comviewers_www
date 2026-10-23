import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { Button } from '@/components/ui/ButtonControl'
import { useCheckoutQuote } from './-components/checkout/hooks/useCheckoutQuote'
import { useCheckoutForm } from './-components/checkout/hooks/useCheckoutForm'
import { useForeignPaymentQuote } from './-components/checkout/hooks/useForeignPaymentQuote'
import { useCheckoutPaymentModes } from './-components/checkout/hooks/useCheckoutPaymentModes'
import { CheckoutProducts } from './-components/checkout/CheckoutProducts'
import { CheckoutDiscounts } from './-components/checkout/CheckoutDiscounts'
import { CheckoutCustomer } from './-components/checkout/CheckoutCustomer'
import { CheckoutReceipt } from './-components/checkout/CheckoutReceipt'
import { CheckoutSummary } from './-components/checkout/CheckoutSummary'
import { isPaymentWindowCancelled, openTossPaymentWindow, paymentWindowError } from './-components/checkout/tossPaymentWindow'
import type { OrderBenefitQuote } from '@/api/ordersPayments'
import { ApiClientError } from '@/api/httpClient'
import type { CheckoutQuote, CheckoutSubmission } from '@/domain/checkout/checkoutRepository'
import { CommerceCartState } from './-components/CommerceCartState'
import { PageTitle } from './CommerceComponents'
import { useInvalidateProductCatalog } from './-components/hooks/useInvalidateProductCatalog'
import './checkout-mobile.css'
import { extensionCheckoutStateSchema } from '@/domain/checkout/extensionCheckoutState'
import { CheckoutExtensionContent } from './-components/checkout/CheckoutExtensionContent'
import { CheckoutCancellation } from './-components/checkout/CheckoutCancellation'
import { checkoutCreationBody } from '@/domain/checkout/httpCheckoutRepository'
import { checkoutReturnTo } from '@/domain/checkout/checkoutReturnTo'
import { useCheckoutRecovery } from './-components/checkout/hooks/useCheckoutRecovery'
import { checkoutPaymentInput, checkoutPaymentMethodsUnavailable, verifyCheckoutPaymentMode, type GlobalCardPayment } from '@/domain/checkout/checkoutDraft'

type CheckoutAttempt = { input: CheckoutSubmission; quote: CheckoutQuote; benefits: OrderBenefitQuote;
  globalCardPayment: GlobalCardPayment; paymentPrepared?: boolean; created?: { orderNo: string; finalAmount: number } }

function CheckoutContent({ ids, returnTo }: { ids: readonly string[]; returnTo: string }) {
  const { uiText } = useUiTranslation()
  const { checkout, myAccount } = useServices()
  const navigate = useNavigate()
  const recovery = useCheckoutRecovery(`cart:${JSON.stringify(ids)}`, returnTo)
  const client = useQueryClient()
  const invalidateCatalog = useInvalidateProductCatalog()
  const [unresolvedOrderId, setUnresolvedOrderId] = useState<string | null>(null)
  const unresolvedCustomerCancellation = useRef(false)
  const [paymentRetryReady, setPaymentRetryReady] = useState(false)
  const [paymentClosed, setPaymentClosed] = useState(false)
  const [couponId, setCouponId] = useState<number | null>(null)
  const [points, setPoints] = useState('0')
  const [paymentAvailabilityError, setPaymentAvailabilityError] = useState<string | null>(null)
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(null)
  const recovering = !attempt && Boolean(recovery.record)
  const recoveredDisplay = recovering && recovery.record?.display?.source === 'cart' ? recovery.record.display : null
  const [cancellationStarted, setCancellationStarted] = useState(false)
  const attemptRef = useRef<CheckoutAttempt | null>(null)
  const submitting = useRef(false)
  const windowAbort = useRef<AbortController | null>(null)
  useEffect(() => () => windowAbort.current?.abort(), [])
  const result = useCheckoutQuote(ids, !attempt && !recoveredDisplay)
  const benefits = useQuery({ queryKey: ['checkout', 'benefits', ids, couponId, Number(points)],
    queryFn: ({ signal }) => checkout.benefitQuote!(ids, couponId, Number(points), signal),
    // Preserve point limits while typing, but never reuse a different coupon's quote.
    placeholderData: previous => previous?.userCouponId === couponId ? previous : undefined,
    enabled: Boolean(checkout.benefitQuote && result.data?.checkoutEligible && !attempt && !recovery.record), retry: false,
    staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true })
  const invalidDiscountSelection = benefits.error instanceof ApiClientError && benefits.error.code === 'C001'
  function retryBenefitQuote() {
    if (invalidDiscountSelection && (couponId !== null || Number(points) > 0)) {
      // A new query key requests a fresh quote without resending the rejected discount values.
      setCouponId(null)
      setPoints('0')
      return
    }
    void benefits.refetch()
  }
  const benefitReady = !checkout.benefitQuote || Boolean(benefits.data && !benefits.isFetching && !benefits.isError
    && !benefits.isPlaceholderData && benefits.data.pointUsedAmount === Number(points) && benefits.data.userCouponId === couponId)
  const productUnavailable = !attempt && benefits.error instanceof ApiClientError && benefits.error.code === 'OR001'
  // Only the current, fully resolved server quote can make payment selection optional.
  const finalAmount = attempt?.created?.finalAmount ?? attempt?.benefits.finalAmount
    ?? (!recovering && result.isSuccess && !result.isFetching && result.data.checkoutEligible && benefitReady ? benefits.data?.finalAmount ?? null : null)
  const form = useCheckoutForm(finalAmount, recovering ? recovery.record : null)
  const paymentModes = useCheckoutPaymentModes(attempt?.globalCardPayment, recovering,
    form.payment === 'global-card' && finalAmount !== 0)
  const availableDirectEasyPay = paymentModes.methods
  const foreignUsdSelected = !recovering && form.payment === 'global-card' && paymentModes.globalCardPayment === 'foreign_card'
  const foreign = useForeignPaymentQuote(foreignUsdSelected, finalAmount)
  const verifying = paymentModes.verifying || foreign.verifying
  useEffect(() => {
    if (finalAmount === 0) setPaymentAvailabilityError(null)
  }, [finalAmount])
  const profile = useMutation({ mutationFn: async (force: boolean) => ({ value: await myAccount.readApi!.profile(), force }), onSuccess: ({ value, force }) => { if (!attemptRef.current && !recovery.record) form.fillProfile(value, force) } })
  const profileLoaded = useRef(false)
  useEffect(() => {
    if (!recovering && myAccount.readApi && !profileLoaded.current) { profileLoaded.current = true; profile.mutate(false) }
  }, [myAccount.readApi, profile, recovering])
  const showReceipt = form.payment === 'virtual-account'
  async function checkAbandonedPayment(providerOrderId: string, customerCancelled = false) {
    setUnresolvedOrderId(providerOrderId)
    unresolvedCustomerCancellation.current ||= customerCancelled
    if (!checkout.abandon) throw new Error('결제 상태를 확인할 수 없습니다. 주문내역을 확인해 주세요.')
    let status: string
    try { status = (await checkout.abandon(providerOrderId, unresolvedCustomerCancellation.current, true)).status }
    catch { throw new Error('결제 상태를 확인하지 못했습니다. 결제 상태를 다시 확인해 주세요.') }
    if (windowAbort.current?.signal.aborted) return
    if (status === 'retryable') {
      foreign.clearPrepared()
      setUnresolvedOrderId(null)
      unresolvedCustomerCancellation.current = false
      setPaymentRetryReady(true)
      setPaymentNotice(null)
      return
    }
    if (status === 'cancelled' || status === 'failed') {
      setPaymentClosed(true)
      setUnresolvedOrderId(null)
      setPaymentRetryReady(false)
      unresolvedCustomerCancellation.current = false
      setPaymentNotice('결제가 종료되었습니다. 주문내역에서 처리 결과를 확인해 주세요.')
      await Promise.all([invalidateCatalog(), ...['checkout', 'cart', 'my-account'].map(key => client.invalidateQueries({ queryKey: [key] }))])
      return
    }
    if (status === 'approved') recovery.clear()
    throw new Error(status === 'approved'
      ? '이미 승인된 결제입니다. 주문내역에서 처리 결과를 확인해 주세요.'
      : '결제 상태를 확인 중입니다. 결제 상태를 다시 확인하거나 주문내역을 확인해 주세요.')
  }
  const submit = useMutation({ mutationFn: async (current: CheckoutAttempt) => {
    if (unresolvedOrderId) return checkAbandonedPayment(unresolvedOrderId)
    if (!checkout.start || (current.created && !checkout.preparePayment)) throw new Error('현재 주문을 진행할 수 없습니다.')
    const controller = new AbortController()
    windowAbort.current = controller
    let payment
    try { payment = current.created
      ? await checkout.preparePayment!({ ...current.input, ...current.created })
      : await checkout.start(current.input) }
    catch { throw new Error('주문 또는 결제 준비를 완료하지 못했습니다. 다시 시도하거나 주문내역을 확인해 주세요.') }
    if (controller.signal.aborted) return
    if (payment.amount !== current.benefits.finalAmount
      || (current.created && payment.orderNo !== current.created.orderNo))
      throw new Error('주문 금액을 확인할 수 없습니다. 주문내역을 확인해 주세요.')
    const preparedAttempt = { ...current, created: { orderNo: payment.orderNo, finalAmount: payment.amount } }
    recovery.bindOrder(payment.orderNo)
    attemptRef.current = preparedAttempt
    setAttempt(preparedAttempt)
    if (payment.paymentStatus === 'approved') {
      recovery.clear()
      await Promise.all([invalidateCatalog(), ...['checkout', 'cart', 'my-account'].map(key => client.invalidateQueries({ queryKey: [key] }))])
      if (!controller.signal.aborted) navigate(`/checkout/complete?paymentId=${payment.paymentId}`)
      return
    }
    try {
      foreign.bindPrepared(payment, current.input.payment === 'foreign_card')
      const prepared = { ...preparedAttempt, paymentPrepared: true }
      attemptRef.current = prepared
      setAttempt(prepared)
      await openTossPaymentWindow(payment, controller.signal)
    }
    catch (error) {
      // Navigation/unmount is not evidence of a cancelled payment.
      if (controller.signal.aborted) return
      // The SDK cancellation is a signal to reconcile, not proof that the PG payment ended.
      if (payment.provider === 'toss_payments' && payment.providerOrderId) {
        return checkAbandonedPayment(payment.providerOrderId, isPaymentWindowCancelled(error))
      }
      throw new Error(paymentWindowError(error))
    }
  } })
  async function submitOrder() {
    if (submitting.current || cancellationStarted || paymentClosed || (!attemptRef.current && recovery.record)) return
    setPaymentAvailabilityError(null)
    setPaymentNotice(null)
    let current = attemptRef.current
    let globalCardPayment = current?.globalCardPayment
    if (!unresolvedOrderId) {
      const controller = new AbortController()
      windowAbort.current = controller
      submitting.current = true
      try {
        globalCardPayment = await verifyCheckoutPaymentMode({ amountKrw: finalAmount ?? 0,
          globalCardSelected: form.payment === 'global-card', retrying: paymentRetryReady,
          frozenGlobalCardPayment: current?.globalCardPayment, frozenPaymentMethod: current?.input.payment,
          paymentPrepared: current?.paymentPrepared }, paymentModes.verify,
          (amount, signal) => foreign.verify(true, amount, signal), controller.signal)
        controller.signal.throwIfAborted()
      }
      catch (error) { if (!controller.signal.aborted) setPaymentAvailabilityError(error instanceof Error ? error.message : 'USD 결제금액을 확인하지 못했습니다.'); return }
      finally { submitting.current = false }
    }
    if (current && paymentRetryReady) {
      const draft = form.validate()
      if (!draft || !current.created) return
      if (draft.finalAmount > 0 && ((draft.payment === 'naver-pay' && !availableDirectEasyPay?.naverPay)
        || (draft.payment === 'kakao-pay' && !availableDirectEasyPay?.kakaoPay))) {
        setPaymentAvailabilityError('선택한 간편결제 수단을 현재 이용할 수 없습니다. 다른 결제수단을 선택해 주세요.')
        return
      }
      current = { ...current, paymentPrepared: false,
        input: { ...current.input, ...checkoutPaymentInput(draft, false, current.globalCardPayment), idempotencyKey: crypto.randomUUID() } }
      attemptRef.current = current
      setAttempt(current)
      setPaymentRetryReady(false)
    }
    if (!current) {
      if (!globalCardPayment) { setPaymentAvailabilityError(checkoutPaymentMethodsUnavailable); return }
      if (!result.isSuccess || !result.data.checkoutEligible || !benefits.data || !benefitReady || result.isFetching) return
      const draft = form.validate()
      if (!draft) return
      if (draft.finalAmount > 0 && ((draft.payment === 'naver-pay' && !availableDirectEasyPay?.naverPay)
        || (draft.payment === 'kakao-pay' && !availableDirectEasyPay?.kakaoPay))) {
        setPaymentAvailabilityError('선택한 간편결제 수단을 현재 이용할 수 없습니다. 다른 결제수단을 선택해 주세요.')
        return
      }
      current = { quote: result.data, benefits: benefits.data, globalCardPayment,
        input: { cartItemIds: ids, contact: draft.contact, ...checkoutPaymentInput(draft, false, globalCardPayment), userCouponId: couponId,
        pointAmount: Number(points), expectedFinalAmount: benefits.data.finalAmount, creationKey: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() } }
      try { recovery.persist({ creationKey: current.input.creationKey, source: 'cart', originalRequest: checkoutCreationBody(current.input) },
        { source: 'cart', quote: current.quote, benefits: current.benefits, payment: draft.payment, globalCardPayment }) }
      catch (error) { setPaymentAvailabilityError(error instanceof Error ? error.message : '주문서 복구 정보를 보관하지 못했습니다.'); return }
      attemptRef.current = current
      setAttempt(current)
    }
    submitting.current = true
    try { await submit.mutateAsync(current) } catch { /* The mutation error is displayed beside the order button. */ }
    finally { submitting.current = false }
  }
  const quote = attempt?.quote ?? recoveredDisplay?.quote ?? result.data
  const shownBenefits = attempt?.benefits ?? recoveredDisplay?.benefits ?? (recovering ? undefined : benefits.data)
  const refreshing = recovering ? !recoveredDisplay : !attempt && (result.isFetching || !benefitReady)
  const pageState = quote || recovering ? 'filled' : 'empty'
  const contentStatus = attempt ? null : !result.validSelection ? 'empty' : result.isPending ? 'loading' : result.isError ? 'error' : null
  return <AppShell className={`commerce-shell checkout-page checkout-page--service checkout-page--${pageState}${showReceipt ? ' checkout-page--with-receipt' : ''}`} footerVariant="compact">
    <div className="content-container commerce-page"><PageTitle>{uiText("주문서 작성")}</PageTitle>
      
      {contentStatus && !recovering ? <CommerceCartState status={contentStatus} loadingLabel={uiText("선택 상품의 예상 금액을 불러오는 중입니다.")} errorMessage={uiText("선택한 상품을 조회하지 못했습니다. 상품이 삭제되었거나 장바구니 상태가 변경되었을 수 있습니다.")} onRetry={() => { void result.refetch() }} errorAction={<Button as={RelativeLink} className="checkout-return-cart-button" size="large" to="/cart" variant="secondary">{uiText("장바구니로 이동")}</Button>}><p>{uiText("장바구니에서 주문할 상품을 다시 선택해 주세요. 한 번에 최대 100개 항목을 확인할 수 있습니다.")}</p><Button as={RelativeLink} className="checkout-return-cart-button" size="large" to="/cart">{uiText("장바구니로 이동")}</Button></CommerceCartState>
            : quote || recovering ? <div className="checkout-layout" aria-busy={recovering ? !quote && result.isFetching : refreshing}><div className="checkout-main">
              {quote ? <CheckoutProducts items={quote.items} benefits={shownBenefits} refreshing={refreshing} /> : <CommerceCartState status={result.isFetching ? 'loading' : 'error'} loadingLabel={uiText("선택 상품의 예상 금액을 불러오는 중입니다.")} errorMessage={uiText("선택한 상품을 조회하지 못했습니다. 상품이 삭제되었거나 장바구니 상태가 변경되었을 수 있습니다.")} onRetry={() => { void result.refetch() }} />}
              {productUnavailable && !recovering ? <div className="checkout-product-error">
                <p role="alert">{uiText("선택한 상품 중 현재 주문할 수 없는 상품이 있습니다. 장바구니에서 상품 상태를 다시 확인해 주세요.")}</p>
                <div><Button as={RelativeLink} size="small" variant="secondary" to="/cart">{uiText("장바구니로 이동")}</Button><Button size="small" variant="secondary" disabled={benefits.isFetching} onClick={() => void benefits.refetch()}>{uiText(benefits.isFetching ? '확인 중…' : '상품 상태 다시 확인')}</Button></div>
              </div> : <CheckoutDiscounts quote={shownBenefits} couponId={recovering ? shownBenefits?.userCouponId ?? null : couponId} points={recovering ? String(shownBenefits?.pointUsedAmount ?? 0) : points} disabled={recovering || verifying || !checkout.benefitQuote || !!attempt} pending={!recovering && !attempt && benefits.isFetching} error={attempt || recovering ? null : benefits.error} onCoupon={value => { setCouponId(value); setPoints('0') }} onPoints={setPoints} onRetry={retryBenefitQuote} onReset={() => { setCouponId(null); setPoints('0') }} />}
              {profile.isError && !recovering && <p role="alert">{uiText("회원 정보를 불러오지 못했습니다. 직접 입력해 주세요.")}</p>}
              <fieldset className="checkout-input-fields" disabled={recovering || verifying || !!attempt}><CheckoutCustomer form={form} pending={profile.isPending} /></fieldset>
              {showReceipt && <fieldset className="checkout-input-fields" disabled={recovering || verifying || cancellationStarted || (!!attempt && !paymentRetryReady)}><CheckoutReceipt form={form} /></fieldset>}
            </div><CheckoutSummary quote={quote} benefits={shownBenefits} form={form} foreignQuote={foreign.quote} foreignUsdSelected={foreignUsdSelected} directEasyPayMethods={availableDirectEasyPay} paymentAvailabilityError={paymentAvailabilityError ?? paymentModes.error ?? foreign.error} paymentNotice={paymentNotice} onPaymentChange={() => { foreign.clearPrepared(); setPaymentAvailabilityError(null); setPaymentNotice(null) }} refreshing={refreshing} locked={recovering || cancellationStarted || verifying || (!!attempt && !paymentRetryReady)} checkingPayment={!!unresolvedOrderId} submitting={submit.isPending || verifying} submitDisabled={recovering || cancellationStarted || paymentClosed || (foreign.blocked && !unresolvedOrderId) || (!attempt && finalAmount !== 0 && paymentModes.pending)} submitError={submit.error?.message} onSubmit={() => void submitOrder()}
              cancellation={<CheckoutCancellation disabled={submit.isPending || verifying} returnTo={recovery.record?.returnTo ?? returnTo} onReturn={recovery.clear} onLock={() => setCancellationStarted(true)} request={() => {
                const current = attemptRef.current
                return recovery.record?.request ?? (current ? { creationKey: current.input.creationKey, source: 'cart', originalRequest: checkoutCreationBody(current.input) } : null)
              }}/>} /></div> : null}
      {contentStatus && !recovering && <CheckoutCancellation disabled={false} returnTo={returnTo} request={() => null} onLock={() => setCancellationStarted(true)}/>}
    </div>
  </AppShell>
}
export function CheckoutPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const extension = extensionCheckoutStateSchema.safeParse(location.state)
  if (extension.success) return <CheckoutExtensionContent state={extension.data} key={JSON.stringify(extension.data)} />
  const ids = params.getAll('cartItemId')
  return <CheckoutContent ids={ids} returnTo={checkoutReturnTo(params.get('returnTo'))} key={JSON.stringify(ids)} />
}
