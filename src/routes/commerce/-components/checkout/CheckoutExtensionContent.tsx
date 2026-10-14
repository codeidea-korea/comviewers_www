import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { AppShell } from '@/components/layout/AppShellView'
import { Button } from '@/components/ui/ButtonControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { ApiClientError } from '@/api/httpClient'
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
import { directCheckoutSummary, validateDirectCheckoutQuote } from '@/domain/checkout/directCheckoutQuote'
import { isPaymentWindowCancelled, openTossPaymentWindow, paymentWindowError } from './tossPaymentWindow'

type CreatedOrder = { orderNo: string; finalAmount: number }
type Attempt = {
  body: ExtensionCheckoutInput; quote: ExtensionQuote; benefits: OrderBenefitQuote
  preparation: Omit<CheckoutPaymentPreparation, 'orderNo' | 'finalAmount'>; created?: CreatedOrder; receiptLocked?: boolean
}

export function CheckoutExtensionContent({ state }: { state: ExtensionCheckoutState }) {
  const { checkout, myAccount } = useServices()
  const api = myAccount.rcpcApi?.extensionCheckout
  const navigate = useNavigate()
  const client = useQueryClient()
  const invalidateCatalog = useInvalidateProductCatalog()
  const form = useCheckoutForm()
  const [couponId, setCouponId] = useState<number | null>(state.selection.userCouponId ?? null)
  const [points, setPoints] = useState(String(state.selection.pointAmount))
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const attemptRef = useRef<Attempt | null>(null)
  const submitting = useRef(false)
  const windowAbort = useRef<AbortController | null>(null)
  const [unresolvedOrderId, setUnresolvedOrderId] = useState<string | null>(null)
  const customerCancelled = useRef(false)
  const [paymentRetryReady, setPaymentRetryReady] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)
  useEffect(() => () => windowAbort.current?.abort(), [])
  const hasPurchase = (state.selection.cartItemIds?.length ?? 0) + (state.selection.storageItems?.length ?? 0) + (state.selection.partOffers?.length ?? 0) > 0
  const fromStorage = Boolean(state.offerIds?.length || state.selection.storageItems?.length || state.selection.partOffers?.length)
  const selection = { ...state.selection, rentalIds: [...state.selection.rentalIds],
    cartItemIds: state.selection.cartItemIds ? [...state.selection.cartItemIds] : undefined,
    userCouponId: couponId, pointAmount: Number(points) }
  const quote = useQuery({ queryKey: ['checkout', 'extension', myAccount.rcpcApi?.organizationId, selection],
    queryFn: async () => { if (!api) throw new Error('현재 주문을 진행할 수 없습니다.'); return validateDirectCheckoutQuote(await api.quote(selection), selection) },
    enabled: Boolean(api && !attempt), placeholderData: previous => previous, retry: false })
  const methods = useQuery({ queryKey: ['checkout', 'direct-easy-pay-methods'],
    queryFn: ({ signal }) => checkout.directEasyPayMethods!(signal), enabled: Boolean(checkout.directEasyPayMethods), retry: false })
  const profile = useMutation({ mutationFn: () => myAccount.readApi!.profile(),
    onSuccess: value => { if (!attemptRef.current) form.fillProfile(value) } })
  const profileLoaded = useRef(false)
  useEffect(() => {
    if (myAccount.readApi && !profileLoaded.current) { profileLoaded.current = true; profile.mutate() }
  }, [myAccount.readApi, profile])
  const benefitsMatch = Boolean(quote.data?.benefits
    && quote.data.benefits.userCouponId === couponId && quote.data.benefits.pointUsedAmount === Number(points)
    && quote.data.benefits.subtotalAmount === quote.data.extensionAmount + quote.data.purchaseSubtotalAmount
    && quote.data.benefits.setupFeeAmount === quote.data.purchaseSetupFeeAmount
    && quote.data.benefits.finalAmount === quote.data.totalAmount - quote.data.benefits.couponDiscountAmount - quote.data.benefits.pointUsedAmount)
  const quoteReady = quote.isSuccess && !quote.isFetching && !quote.isPlaceholderData && benefitsMatch
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
      await invalidate()
      const orderNo = attemptRef.current?.created?.orderNo
      if (!windowAbort.current?.signal.aborted && orderNo) navigate(`/mypage/orders/${encodeURIComponent(orderNo)}`)
      return
    }
    if (status === 'cancelled' || status === 'failed') {
      setUnresolvedOrderId(null)
      setPaymentRetryReady(false)
      customerCancelled.current = false
      const closedOrderNo = attemptRef.current?.created?.orderNo
      if (closedOrderNo) {
        await invalidate()
        if (!windowAbort.current?.signal.aborted) navigate(`/mypage/orders/${encodeURIComponent(closedOrderNo)}`)
        return
      }
      attemptRef.current = null
      setAttempt(null)
      setPaymentNotice(status === 'failed' ? '결제에 실패했습니다. 결제수단을 변경하거나 다시 주문할 수 있습니다.' : '결제를 취소했습니다. 결제수단을 변경하거나 다시 주문할 수 있습니다.')
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
      const created = await api.create(current.body, current.preparation.idempotencyKey)
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
    current = { ...current, receiptLocked: current.receiptLocked || payment.paymentMethod === 'virtual_account' }
    attemptRef.current = current
    setAttempt(current)
    if (payment.paymentStatus === 'approved') {
      await invalidate()
      if (!controller.signal.aborted) navigate(`/checkout/complete?paymentId=${payment.paymentId}`)
      return
    }
    try { await openTossPaymentWindow(payment, controller.signal) }
    catch (error) {
      if (controller.signal.aborted) return
      if (payment.provider === 'toss_payments' && payment.providerOrderId) return reconcile(payment.providerOrderId, isPaymentWindowCancelled(error))
      throw new Error(paymentWindowError(error))
    }
  } })
  async function submitOrder() {
    if (submitting.current) return
    setAvailabilityError(null)
    setPaymentNotice(null)
    let current = attemptRef.current
    if (current && paymentRetryReady) {
      const draft = form.validate()
      if (!draft || !current.created) return
      if ((draft.payment === 'naver-pay' && !methods.data?.naverPay) || (draft.payment === 'kakao-pay' && !methods.data?.kakaoPay)) {
        setAvailabilityError('선택한 간편결제 수단을 현재 이용할 수 없습니다. 다른 결제수단을 선택해 주세요.')
        return
      }
      const payment = ({ 'virtual-account': 'virtual_account', card: 'card', payco: 'payco', 'naver-pay': 'naver_pay', 'kakao-pay': 'kakao_pay', 'global-card': 'card' } as const)[draft.payment]
      current = { ...current, preparation: { payment, cashReceiptType: draft.receiptType,
        cashReceiptIdentifier: draft.receiptIdentifier, idempotencyKey: crypto.randomUUID() } }
      attemptRef.current = current
      setAttempt(current)
      setPaymentRetryReady(false)
    }
    if (!current) {
      const draft = form.validate()
      if (!draft || !quoteReady || !quote.data?.eligible || !quote.data.benefits) return
      if ((draft.payment === 'naver-pay' && !methods.data?.naverPay) || (draft.payment === 'kakao-pay' && !methods.data?.kakaoPay)) {
        setAvailabilityError('선택한 간편결제 수단을 현재 이용할 수 없습니다. 다른 결제수단을 선택해 주세요.')
        return
      }
      const payment = ({ 'virtual-account': 'virtual_account', card: 'card', payco: 'payco', 'naver-pay': 'naver_pay', 'kakao-pay': 'kakao_pay', 'global-card': 'card' } as const)[draft.payment]
      current = { body: { selection, offerIds: state.offerIds ? [...state.offerIds] : undefined, quoteHash: quote.data.quoteHash,
        contact: { ...draft.contact, messengerType: draft.contact.messengerType || null, messengerId: draft.contact.messengerId || null } },
      quote: quote.data, benefits: quote.data.benefits,
      preparation: { payment, cashReceiptType: draft.receiptType,
        cashReceiptIdentifier: draft.receiptIdentifier, idempotencyKey: crypto.randomUUID() } }
      attemptRef.current = current
      setAttempt(current)
    }
    submitting.current = true
    try { await submit.mutateAsync(current) } catch { /* Display the mutation error beside the order button. */ }
    finally { submitting.current = false }
  }
  const current = attempt?.quote ?? quote.data
  const currentSummary = current ? directCheckoutSummary(current) : undefined
  const shownBenefits = attempt?.benefits ?? current?.benefits ?? undefined
  const showReceipt = form.payment === 'virtual-account'
  const contentStatus = !api ? 'empty' : !attempt && quote.isPending ? 'loading' : !current && quote.isError ? 'error' : null
  const createRejected = submit.error instanceof ApiClientError && (
    [400, 422].includes(submit.error.status ?? 0)
    || (submit.error.status === 409 && ['OR001', 'C006'].includes(submit.error.code ?? ''))
  )
  const canRevise = Boolean(attempt && !attempt.created && (submit.error?.name === 'ZodError' || createRejected))
  return <AppShell className={`commerce-shell checkout-page checkout-page--service checkout-page--${current ? 'filled' : 'empty'}${showReceipt ? ' checkout-page--with-receipt' : ''}`} footerVariant="compact">
    <div className="content-container commerce-page"><PageTitle>주문서 작성</PageTitle>
      {contentStatus ? <CommerceCartState status={contentStatus} loadingLabel="선택 상품의 예상 금액을 불러오는 중입니다." errorMessage={quote.error?.message} onRetry={retryQuotes}>
        <p>주문할 상품을 다시 선택해 주세요.</p><Button as={RelativeLink} size="large" to={fromStorage ? '/mypage/storage' : '/mypage/rcpc'}>목록으로 이동</Button>
      </CommerceCartState> : current ? <div className="checkout-layout" aria-busy={!attempt && quote.isFetching}><div className="checkout-main">
        {hasPurchase && currentSummary && <CheckoutProducts items={currentSummary.items} benefits={shownBenefits} refreshing={!attempt && !quoteReady} />}
        {current.items.length > 0 && <CheckoutExtensionProducts quote={current} mixed={hasPurchase} />}
        {!attempt && (!quote.isFetching && current.eligible && !benefitsMatch) && <div className="checkout-product-error">
          <p role="alert">선택한 상품의 상태 또는 금액이 변경되었습니다. 다시 확인해 주세요.</p>
          <Button size="small" variant="secondary" disabled={quote.isFetching} onClick={retryQuotes}>상품 상태 다시 확인</Button>
        </div>}
        <CheckoutDiscounts quote={shownBenefits} couponId={couponId} points={points} disabled={Boolean(attempt)} pending={!attempt && quote.isFetching}
          error={attempt ? null : quote.error} onCoupon={value => { setCouponId(value); setPoints('0') }} onPoints={setPoints} onRetry={resetDiscounts} onReset={resetDiscounts} />
        {profile.isError && <p role="alert">회원 정보를 불러오지 못했습니다. 직접 입력해 주세요.</p>}
        <fieldset className="checkout-input-fields" disabled={Boolean(attempt)}><CheckoutCustomer form={form} pending={profile.isPending} /></fieldset>
        {showReceipt && <fieldset className="checkout-input-fields" disabled={Boolean(attempt) && (!paymentRetryReady || !!attempt?.receiptLocked)}><CheckoutReceipt form={form} /></fieldset>}
        {canRevise && <Button variant="secondary" onClick={() => { attemptRef.current = null; setAttempt(null); submit.reset(); retryQuotes() }}>입력 수정 후 견적 다시 확인</Button>}
      </div><CheckoutSummary variant={hasPurchase ? 'cart' : 'extension'} extensionAmount={hasPurchase && current.items.length ? current.extensionAmount : undefined} quote={currentSummary!} benefits={shownBenefits} form={form} directEasyPayMethods={methods.data}
        paymentAvailabilityError={availabilityError} paymentNotice={paymentNotice} onPaymentChange={() => { setAvailabilityError(null); setPaymentNotice(null) }}
        refreshing={!attempt && !quoteReady} locked={Boolean(attempt) && !paymentRetryReady} checkingPayment={Boolean(unresolvedOrderId)} submitting={submit.isPending} submitError={submit.error?.message} onSubmit={() => void submitOrder()} /></div> : null}
    </div>
  </AppShell>
}
