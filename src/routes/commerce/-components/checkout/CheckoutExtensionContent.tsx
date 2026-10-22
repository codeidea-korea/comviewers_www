import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { AppShell } from '@/components/layout/AppShellView'
import { Button } from '@/components/ui/ButtonControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { ExtensionCheckoutInput } from '@/api/extensionCheckout'
import type { OrderBenefitQuote } from '@/api/ordersPayments'
import type { CheckoutPaymentPreparation } from '@/domain/checkout/checkoutRepository'
import type { ExtensionCheckoutState } from '@/domain/checkout/extensionCheckoutState'
import { PageTitle } from '../../CommerceComponents'
import { CommerceCartState } from '../CommerceCartState'
import { useInvalidateProductCatalog } from '../hooks/useInvalidateProductCatalog'
import { CheckoutCustomer } from './CheckoutCustomer'
import { CheckoutProducts } from './CheckoutProducts'
import { CheckoutDiscounts } from './CheckoutDiscounts'
import { CheckoutReceipt } from './CheckoutReceipt'
import { CheckoutSummary } from './CheckoutSummary'
import { CheckoutExtensionProducts, type ExtensionQuote } from './CheckoutExtensionProducts'
import { useCheckoutForm } from './hooks/useCheckoutForm'
import { useForeignPaymentQuote } from './hooks/useForeignPaymentQuote'
import { directCheckoutSummary, validateDirectCheckoutQuote } from '@/domain/checkout/directCheckoutQuote'
import { isPaymentWindowCancelled, openTossPaymentWindow, paymentWindowError } from './tossPaymentWindow'
import { CheckoutCancellation } from './CheckoutCancellation'
import { checkoutReturnTo } from '@/domain/checkout/checkoutReturnTo'
import { useCheckoutRecovery } from './hooks/useCheckoutRecovery'
import { checkoutPaymentInput } from '@/domain/checkout/checkoutDraft'

type CreatedOrder = { orderNo: string; finalAmount: number }
type Attempt = {
  body: ExtensionCheckoutInput; quote: ExtensionQuote; benefits: OrderBenefitQuote; creationKey: string
  preparation: Omit<CheckoutPaymentPreparation, 'orderNo' | 'finalAmount'>; created?: CreatedOrder
}

export function CheckoutExtensionContent({ state }: { state: ExtensionCheckoutState }) {
  const { uiText } = useUiTranslation()
  const { checkout, myAccount } = useServices()
  const api = myAccount.rcpcApi?.extensionCheckout
  const navigate = useNavigate()
  const client = useQueryClient()
  const invalidateCatalog = useInvalidateProductCatalog()
  const [couponId, setCouponId] = useState<number | null>(state.selection.userCouponId ?? null)
  const [points, setPoints] = useState(String(state.selection.pointAmount))
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [cancellationStarted, setCancellationStarted] = useState(false)
  const attemptRef = useRef<Attempt | null>(null)
  const submitting = useRef(false)
  const windowAbort = useRef<AbortController | null>(null)
  const [unresolvedOrderId, setUnresolvedOrderId] = useState<string | null>(null)
  const customerCancelled = useRef(false)
  const [paymentRetryReady, setPaymentRetryReady] = useState(false)
  const [paymentClosed, setPaymentClosed] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)
  useEffect(() => () => windowAbort.current?.abort(), [])
  const hasPurchase = (state.selection.cartItemIds?.length ?? 0) + (state.selection.storageItems?.length ?? 0) + (state.selection.partOffers?.length ?? 0) > 0
  const fromStorage = Boolean(state.offerIds?.length || state.selection.storageItems?.length || state.selection.partOffers?.length)
  const returnTo = checkoutReturnTo(state.returnTo, fromStorage ? '/mypage/storage' : '/mypage/rcpc')
  const recovery = useCheckoutRecovery(`extension:${JSON.stringify(state.selection)}`, returnTo)
  const recovering = !attempt && Boolean(recovery.record)
  const recoveredDisplay = recovering && recovery.record?.display?.source === 'extension' ? recovery.record.display : null
  const selection = { ...state.selection, rentalIds: [...state.selection.rentalIds],
    cartItemIds: state.selection.cartItemIds ? [...state.selection.cartItemIds] : undefined,
    userCouponId: couponId, pointAmount: Number(points) }
  const quote = useQuery({ queryKey: ['checkout', 'extension', myAccount.rcpcApi?.organizationId, selection],
    queryFn: async () => { if (!api) throw new Error('현재 주문을 진행할 수 없습니다.'); return validateDirectCheckoutQuote(await api.quote(selection), selection) },
    enabled: Boolean(api && !attempt && !recoveredDisplay), placeholderData: previous => previous, retry: false,
    staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true })
  const methods = useQuery({ queryKey: ['checkout', 'direct-easy-pay-methods'],
    queryFn: ({ signal }) => checkout.directEasyPayMethods!(signal), enabled: Boolean(checkout.directEasyPayMethods), retry: false })
  const benefitsMatch = Boolean(quote.data?.benefits
    && quote.data.benefits.userCouponId === couponId && quote.data.benefits.pointUsedAmount === Number(points)
    && quote.data.benefits.subtotalAmount === quote.data.extensionAmount + quote.data.purchaseSubtotalAmount
    && quote.data.benefits.setupFeeAmount === quote.data.purchaseSetupFeeAmount
    && quote.data.benefits.finalAmount === quote.data.totalAmount - quote.data.benefits.couponDiscountAmount - quote.data.benefits.pointUsedAmount)
  const quoteReady = quote.isSuccess && !quote.isFetching && !quote.isPlaceholderData && benefitsMatch
  const finalAmount = attempt?.created?.finalAmount ?? attempt?.benefits.finalAmount
    ?? (!recovering && quoteReady && quote.data?.eligible ? quote.data.benefits?.finalAmount ?? null : null)
  const form = useCheckoutForm(finalAmount, recovering ? recovery.record : null)
  const foreign = useForeignPaymentQuote(form.payment === 'global-card', finalAmount)
  useEffect(() => {
    if (finalAmount === 0) setAvailabilityError(null)
  }, [finalAmount])
  const profile = useMutation({ mutationFn: () => myAccount.readApi!.profile(),
    onSuccess: value => { if (!attemptRef.current && !recovery.record) form.fillProfile(value) } })
  const profileLoaded = useRef(false)
  useEffect(() => {
    if (!recovering && myAccount.readApi && !profileLoaded.current) { profileLoaded.current = true; profile.mutate() }
  }, [myAccount.readApi, profile, recovering])
  function retryQuotes() {
    void quote.refetch()
  }
  function resetDiscounts() {
    setCouponId(null)
    setPoints('0')
    if (couponId === null && Number(points) === 0) void quote.refetch()
  }
  async function invalidate() {
    await Promise.all([invalidateCatalog(), ...['checkout', 'cart', 'my-account', 'my-rcpcs'].map(key => client.invalidateQueries({ queryKey: [key] }))])
  }
  async function reconcile(providerOrderId: string, cancelled = false) {
    setUnresolvedOrderId(providerOrderId)
    customerCancelled.current ||= cancelled
    if (!checkout.abandon) throw new Error('결제 상태를 확인할 수 없습니다. 주문내역을 확인해 주세요.')
    let status: string
    try { status = (await checkout.abandon(providerOrderId, customerCancelled.current, true)).status }
    catch { throw new Error('결제 상태를 확인하지 못했습니다. 결제 상태를 다시 확인해 주세요.') }
    if (windowAbort.current?.signal.aborted) return
    if (status === 'retryable') {
      setUnresolvedOrderId(null)
      customerCancelled.current = false
      setPaymentRetryReady(true)
      setPaymentNotice(null)
      return
    }
    if (status === 'approved') {
      recovery.clear()
      await invalidate()
      const orderNo = attemptRef.current?.created?.orderNo
      if (!windowAbort.current?.signal.aborted && orderNo) navigate(`/mypage/orders/${encodeURIComponent(orderNo)}`)
      return
    }
    if (status === 'cancelled' || status === 'failed') {
      setPaymentClosed(true)
      setUnresolvedOrderId(null)
      setPaymentRetryReady(false)
      customerCancelled.current = false
      setPaymentNotice('결제가 종료되었습니다. 주문내역에서 처리 결과를 확인해 주세요.')
      await invalidate()
      return
    }
    throw new Error('결제 상태를 확인 중입니다. 결제 상태를 다시 확인하거나 주문내역을 확인해 주세요.')
  }
  const submit = useMutation({ mutationFn: async (snapshot: Attempt) => {
    if (unresolvedOrderId) return reconcile(unresolvedOrderId)
    if (!api || !checkout.preparePayment) throw new Error('현재 주문을 진행할 수 없습니다.')
    const controller = new AbortController()
    windowAbort.current = controller
    // An uncertain create response is replayed with the original body/key. A known order is never recreated.
    let current = snapshot
    if (!current.created) {
      const created = await api.create(current.body, current.creationKey)
      recovery.bindOrder(created.orderNo)
      current = { ...current, created: { orderNo: created.orderNo, finalAmount: created.finalAmount } }
      attemptRef.current = current
      if (controller.signal.aborted) return
      setAttempt(current)
      await Promise.all(['my-account', 'my-rcpcs'].map(key => client.invalidateQueries({ queryKey: [key] })))
    }
    if (controller.signal.aborted) return
    const created = current.created
    if (!created || created.finalAmount !== current.benefits.finalAmount) throw new Error('주문 금액을 확인할 수 없습니다. 주문내역을 확인해 주세요.')
    const payment = await checkout.preparePayment({ ...current.preparation, ...created })
    if (controller.signal.aborted) return
    if (payment.orderNo !== created.orderNo || payment.amount !== created.finalAmount)
      throw new Error('주문 금액을 확인할 수 없습니다. 주문내역을 확인해 주세요.')
    attemptRef.current = current
    setAttempt(current)
    if (payment.paymentStatus === 'approved') {
      recovery.clear()
      await invalidate()
      if (!controller.signal.aborted) navigate(`/checkout/complete?paymentId=${payment.paymentId}`)
      return
    }
    try {
      foreign.bindPrepared(payment, current.preparation.payment === 'foreign_card')
      await openTossPaymentWindow(payment, controller.signal)
    }
    catch (error) {
      if (controller.signal.aborted) return
      if (payment.provider === 'toss_payments' && payment.providerOrderId) return reconcile(payment.providerOrderId, isPaymentWindowCancelled(error))
      throw new Error(paymentWindowError(error))
    }
  } })
  async function submitOrder() {
    if (submitting.current || cancellationStarted || paymentClosed || (!attemptRef.current && recovery.record)) return
    setAvailabilityError(null)
    setPaymentNotice(null)
    let current = attemptRef.current
    if (!unresolvedOrderId) {
      const controller = new AbortController()
      windowAbort.current = controller
      submitting.current = true
      try {
        await foreign.verify(current && !paymentRetryReady ? current.preparation.payment === 'foreign_card' : form.payment === 'global-card', finalAmount ?? 0, controller.signal)
        controller.signal.throwIfAborted()
      }
      catch (error) { if (!controller.signal.aborted) setAvailabilityError(error instanceof Error ? error.message : 'USD 결제금액을 확인하지 못했습니다.'); return }
      finally { submitting.current = false }
    }
    if (current && paymentRetryReady) {
      const draft = form.validate()
      if (!draft || !current.created) return
      if (draft.finalAmount > 0 && ((draft.payment === 'naver-pay' && !methods.data?.naverPay) || (draft.payment === 'kakao-pay' && !methods.data?.kakaoPay))) {
        setAvailabilityError('선택한 간편결제 수단을 현재 이용할 수 없습니다. 다른 결제수단을 선택해 주세요.')
        return
      }
      current = { ...current, preparation: { ...checkoutPaymentInput(draft), idempotencyKey: crypto.randomUUID() } }
      attemptRef.current = current
      setAttempt(current)
      setPaymentRetryReady(false)
    }
    if (!current) {
      if (!quoteReady || !quote.data?.eligible || !quote.data.benefits) return
      const draft = form.validate()
      if (!draft) return
      if (draft.finalAmount > 0 && ((draft.payment === 'naver-pay' && !methods.data?.naverPay) || (draft.payment === 'kakao-pay' && !methods.data?.kakaoPay))) {
        setAvailabilityError('선택한 간편결제 수단을 현재 이용할 수 없습니다. 다른 결제수단을 선택해 주세요.')
        return
      }
      current = { body: { selection, offerIds: state.offerIds ? [...state.offerIds] : undefined, quoteHash: quote.data.quoteHash,
        contact: { ...draft.contact, messengerType: draft.contact.messengerType || null, messengerId: draft.contact.messengerId || null } },
      quote: quote.data, benefits: quote.data.benefits, creationKey: crypto.randomUUID(),
      preparation: { ...checkoutPaymentInput(draft), idempotencyKey: crypto.randomUUID() } }
      try { recovery.persist({ creationKey: current.creationKey, source: 'extension', originalRequest: current.body },
        { source: 'extension', quote: current.quote, payment: draft.payment }) }
      catch (error) { setAvailabilityError(error instanceof Error ? error.message : '주문서 복구 정보를 보관하지 못했습니다.'); return }
      attemptRef.current = current
      setAttempt(current)
    }
    submitting.current = true
    try { await submit.mutateAsync(current) } catch { /* Display the mutation error beside the order button. */ }
    finally { submitting.current = false }
  }
  const current = attempt?.quote ?? recoveredDisplay?.quote ?? quote.data
  const currentSummary = current ? directCheckoutSummary(current) : undefined
  const shownBenefits = attempt?.benefits ?? current?.benefits ?? undefined
  const refreshing = recovering ? !recoveredDisplay : !attempt && !quoteReady
  const showReceipt = form.payment === 'virtual-account'
  const contentStatus = !api ? 'empty' : !attempt && quote.isPending ? 'loading' : !current && quote.isError ? 'error' : null
  return <AppShell className={`commerce-shell checkout-page checkout-page--service checkout-page--${current || recovering ? 'filled' : 'empty'}${showReceipt ? ' checkout-page--with-receipt' : ''}`} footerVariant="compact">
    <div className="content-container commerce-page"><PageTitle>{uiText("주문서 작성")}</PageTitle>
      {contentStatus && !recovering ? <CommerceCartState status={contentStatus} loadingLabel={uiText("선택 상품의 예상 금액을 불러오는 중입니다.")} errorMessage={uiText(quote.error?.message)} onRetry={retryQuotes}>
        <p>{uiText("주문할 상품을 다시 선택해 주세요.")}</p><Button as={RelativeLink} size="large" to={fromStorage ? '/mypage/storage' : '/mypage/rcpc'}>{uiText("목록으로 이동")}</Button>
      </CommerceCartState> : current || recovering ? <div className="checkout-layout" aria-busy={!attempt && !recoveredDisplay && quote.isFetching}><div className="checkout-main">
        {!current && <CommerceCartState status={quote.isFetching ? 'loading' : 'error'} loadingLabel={uiText("선택 상품의 예상 금액을 불러오는 중입니다.")} errorMessage={uiText(quote.error?.message ?? '선택한 상품을 조회하지 못했습니다. 상품이 삭제되었거나 장바구니 상태가 변경되었을 수 있습니다.')} onRetry={retryQuotes} />}
        {hasPurchase && currentSummary && <CheckoutProducts items={currentSummary.items} benefits={shownBenefits} refreshing={refreshing} />}
        {current && current.items.length > 0 && <CheckoutExtensionProducts quote={current} mixed={hasPurchase} />}
        {!attempt && !recovering && current && (!quote.isFetching && current.eligible && !benefitsMatch) && <div className="checkout-product-error">
          <p role="alert">{uiText("선택한 상품의 상태 또는 금액이 변경되었습니다. 다시 확인해 주세요.")}</p>
          <Button size="small" variant="secondary" disabled={quote.isFetching} onClick={retryQuotes}>{uiText("상품 상태 다시 확인")}</Button>
        </div>}
        <CheckoutDiscounts quote={recovering && !recoveredDisplay ? undefined : shownBenefits} couponId={recovering ? shownBenefits?.userCouponId ?? null : couponId} points={recovering ? String(shownBenefits?.pointUsedAmount ?? 0) : points} disabled={recovering || foreign.verifying || Boolean(attempt)} pending={!recovering && !attempt && quote.isFetching}
          error={attempt || recovering ? null : quote.error} onCoupon={value => { setCouponId(value); setPoints('0') }} onPoints={setPoints} onRetry={resetDiscounts} onReset={resetDiscounts} />
        {profile.isError && !recovering && <p role="alert">{uiText("회원 정보를 불러오지 못했습니다. 직접 입력해 주세요.")}</p>}
        <fieldset className="checkout-input-fields" disabled={recovering || foreign.verifying || Boolean(attempt)}><CheckoutCustomer form={form} pending={profile.isPending} /></fieldset>
        {showReceipt && <fieldset className="checkout-input-fields" disabled={recovering || foreign.verifying || cancellationStarted || (Boolean(attempt) && !paymentRetryReady)}><CheckoutReceipt form={form} /></fieldset>}
      </div><CheckoutSummary variant={hasPurchase ? 'cart' : 'extension'} extensionAmount={hasPurchase && current?.items.length ? current.extensionAmount : undefined} quote={currentSummary} benefits={shownBenefits} form={form} foreignQuote={foreign.quote} directEasyPayMethods={methods.data}
        paymentAvailabilityError={availabilityError ?? foreign.error} paymentNotice={paymentNotice} onPaymentChange={() => { foreign.clearPrepared(); setAvailabilityError(null); setPaymentNotice(null) }}
        refreshing={refreshing} locked={recovering || cancellationStarted || foreign.verifying || (Boolean(attempt) && !paymentRetryReady)} checkingPayment={Boolean(unresolvedOrderId)} submitting={submit.isPending || foreign.verifying} submitDisabled={recovering || cancellationStarted || paymentClosed || (foreign.blocked && !unresolvedOrderId)} submitError={submit.error?.message} onSubmit={() => void submitOrder()}
        cancellation={<CheckoutCancellation disabled={submit.isPending || foreign.verifying} returnTo={recovery.record?.returnTo ?? returnTo} onReturn={recovery.clear} onLock={() => setCancellationStarted(true)} request={() => {
          const current = attemptRef.current
          return recovery.record?.request ?? (current ? { creationKey: current.creationKey, source: 'extension', originalRequest: current.body } : null)
        }}/>} /></div> : null}
      {contentStatus && !recovering && <CheckoutCancellation disabled={false} returnTo={returnTo} request={() => null} onLock={() => setCancellationStarted(true)}/>}
    </div>
  </AppShell>
}
