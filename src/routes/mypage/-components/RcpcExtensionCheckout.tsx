import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import { useServices } from '@/app/ServiceProvider'
import { extensionSelectionSchema, type ExtensionCheckoutInput, type ExtensionSelection } from '@/api/extensionCheckout'
import { RcpcExtensionSurface, type RcpcDialogTarget } from '@/components/mypage/RcpcDialogsControl'
import { ApiClientError } from '@/api/httpClient'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { OrderPaymentContinuation } from './orders/OrderPaymentContinuation'
import { extensionResultText } from './rcpcExtensionPresentation'
import { Button } from '@/components/ui/ButtonControl'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { TextField } from '@/components/ui/TextFieldControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import './rcpc/extension-checkout.css'

type ExtensionQuote = Awaited<ReturnType<MyRcpcReadServices['extensionCheckout']['quote']>>

const money = (amount: number | null | undefined) => amount == null ? '—' : `${amount.toLocaleString('ko-KR')}원`
const dateTime = (value: string | null) => value?.replace('T', ' ') ?? '—'

export function RcpcExtensionCheckout({ api, rentalIds, displayTargets, initialDays = 30, offerIds, pageMode = false, initialSelection, triggerLabel }: { api: MyRcpcReadServices; rentalIds: readonly number[]; displayTargets?: readonly RcpcDialogTarget[]; initialDays?: number; offerIds?: number[]; pageMode?: boolean; initialSelection?: ExtensionSelection; triggerLabel?: string }) {
  const session = useSession()
  const readApi = useServices().myAccount.readApi
  const owner = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
  const profile = useQuery({
    queryKey: ['my-account', 'read', 'profile'],
    enabled: pageMode && owner && !!readApi,
    queryFn: ({ signal }) => {
      if (!readApi) throw new Error('회원정보를 불러올 수 없습니다.')
      return readApi.profile(signal)
    },
    retry: false,
    refetchOnWindowFocus: false,
  })
  const [open, setOpen] = useState(pageMode)
  const [mode, setMode] = useState<'days' | 'date'>(initialSelection?.targetEndDate ? 'date' : 'days')
  const [days, setDays] = useState(String(initialSelection?.addedDays ?? initialDays))
  const [date, setDate] = useState(initialSelection?.targetEndDate ?? '')
  // Undefined means untouched; even an intentionally cleared field must stay edited.
  const [editedName, setName] = useState<string>()
  const [editedEmail, setEmail] = useState<string>()
  const [editedPhone, setPhone] = useState<string>()
  const name = editedName ?? profile.data?.name ?? ''
  const email = editedEmail ?? profile.data?.email ?? ''
  const phone = editedPhone ?? profile.data?.phone ?? ''
  const [coupon, setCoupon] = useState(initialSelection?.userCouponId ? String(initialSelection.userCouponId) : '')
  const [points, setPoints] = useState(String(initialSelection?.pointAmount ?? 0))
  const quoteScope = JSON.stringify([api.organizationId, rentalIds])
  const [lastQuote, setLastQuote] = useState<{ scope: string; value: ExtensionQuote } | null>(null)
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  const draft = useRef<{ body: ExtensionCheckoutInput; key: string } | null>(null)
  const selection = extensionSelectionSchema.safeParse({ rentalIds: [...rentalIds].sort((a, b) => a - b),
    userCouponId: coupon ? Number(coupon) : null, pointAmount: Number(points),
    ...(mode === 'days' ? { addedDays: Number(days) } : { targetEndDate: date }) })
  const fingerprint = JSON.stringify(selection.success ? selection.data : null)
  const selected = selection.success ? selection.data : null
  const quote = useQuery({
    queryKey: ['extension-checkout-quote', api.organizationId, quoteScope, fingerprint],
    enabled: open && selected !== null,
    queryFn: () => {
      if (!selected) throw new Error('1개월, 2개월, 3개월 또는 통일할 만료일을 선택해 주세요.')
      return api.extensionCheckout.quote(selected)
    },
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === quoteScope ? previous : undefined,
    retry: false,
  })
  useEffect(() => {
    if (quote.data && !quote.isPlaceholderData && !quote.isError) {
      setLastQuote({ scope: quoteScope, value: quote.data })
    }
  }, [quote.data, quote.isPlaceholderData, quote.isError, quoteScope])
  // Retain the fields during refetch/failure; only a fresh quote may create an order.
  const current = quote.data ?? (lastQuote?.scope === quoteScope ? lastQuote.value : undefined)
  const quoteReady = quote.isSuccess && !quote.isFetching && !quote.isPlaceholderData
  const maxPoints = current?.benefits ? Math.max(0, Math.min(2147483647,
    current.benefits.availablePoints,
    current.benefits.subtotalAmount + current.benefits.setupFeeAmount - current.benefits.couponDiscountAmount)) : 0
  function changePoints(value: string) {
    if (!/^\d{0,10}$/.test(value)) return
    setPoints(value === '' ? '' : String(Math.min(Number(value), maxPoints)))
  }
  function resetDiscounts() {
    setCoupon('')
    setPoints('0')
    if (!coupon && Number(points) === 0) void quote.refetch()
  }
  const create = useMutation({ mutationFn: () => {
    if (!draft.current) {
      if (!selection.success || !current?.eligible || !quoteReady || !orderConfirmed) {
        throw new Error('연장 주문 내용을 확인해 주세요.')
      }
      draft.current = { key: crypto.randomUUID(), body: { selection: selection.data, quoteHash: current.quoteHash, offerIds,
        contact: { name: name.trim(), email: email.trim(), phone: phone.trim(), messengerType: null, messengerId: null } } }
    }
    return api.extensionCheckout.create(draft.current.body, draft.current.key)
  } })
  const locked = create.isPending || create.isSuccess || create.isError
  const canRevise = create.error?.name === 'ZodError' || (create.error instanceof ApiClientError && [400, 422].includes(create.error.status ?? 0))
  if (!owner || !session.customerSession?.commerceAvailable || rentalIds.length === 0) return null
  const content = <section aria-label="연장 주문서" className="extension-checkout">
    <p className="extension-checkout__intro">선택한 RCPC의 연장 기간과 금액을 확인하고 주문자 정보를 입력해 주세요.</p>
    <form className="extension-checkout__layout" onSubmit={event => { event.preventDefault(); create.mutate() }}>
      <div className="extension-checkout__main">
        <fieldset className="extension-checkout__section" disabled={locked || quote.isFetching}>
          <legend>연장 방법</legend>
          <p className="extension-checkout__help">같은 일수만큼 연장하거나 만료일을 같은 날짜로 맞출 수 있습니다. 상품별 최대 90일까지 연장할 수 있습니다.</p>
          <div className="extension-checkout__modes">
            <label><input type="radio" name="extension-checkout-mode" disabled={!!offerIds?.length} checked={mode === 'days'} onChange={() => { setMode('days'); setPoints('0') }}/>기간 지정</label>
            <label><input type="radio" name="extension-checkout-mode" disabled={!!offerIds?.length} checked={mode === 'date'} onChange={() => { setMode('date'); setPoints('0') }}/>동일 만료일</label>
          </div>
          {mode === 'days' ? <div aria-label="연장 기간" className="extension-checkout__periods">{[['30', '1개월'], ['60', '2개월'], ['90', '3개월']].map(([value, label]) => <Button aria-pressed={days === value} variant={days === value ? 'primary' : 'secondary'} disabled={!!offerIds?.length} key={value} onClick={() => { setDays(value); setPoints('0') }}>{label}</Button>)}</div>
            : <TextField appearance="box" label="만료일 (한국 시간)" type="date" value={date} onChange={event => { setDate(event.target.value); setPoints('0') }}/>}
          {!selection.success && <p className="extension-checkout__error" role="alert">연장 기간과 쿠폰·포인트 입력값을 확인해 주세요.</p>}
        </fieldset>
        <section aria-label="연장 상품" className="extension-checkout__section" aria-busy={quote.isFetching}>
          <h3>연장 상품 <span>{rentalIds.length}대</span></h3>
          {quote.isFetching && !current && <p className="extension-checkout__notice" role="status">연장 견적을 확인하고 있습니다.</p>}
          {quote.error && <div className="extension-checkout__error" role="alert"><p>{quote.error.message}</p><Button variant="secondary" size="small" disabled={locked || quote.isFetching} onClick={resetDiscounts}>할인 초기화 후 다시 조회</Button></div>}
          <div className="extension-checkout__products">
            {current?.items.map(item => <article className="extension-checkout__product" key={item.rentalId}>
              <header><strong>품번 {item.productNo ?? '—'}</strong><span className={item.eligible ? 'extension-checkout__badge' : 'extension-checkout__error'}>{item.eligible ? '연장 가능' : '연장 불가'}</span></header>
              {item.title && item.title !== item.productNo ? <p>{item.title}</p> : null}
              <p className="extension-checkout__spec">{[item.serverRoomName, item.spec].filter(Boolean).join(' / ') || '사양 정보가 없습니다.'}</p>
              <dl className="extension-checkout__period-info">
                <div><dt>현재 만료</dt><dd>{dateTime(item.previousEnd)}</dd></div>
                <div><dt>예상 연장 종료</dt><dd>{dateTime(item.targetEnd)}</dd></div>
                <div><dt>연장 기간</dt><dd>{item.addedDays == null ? '—' : `${item.addedDays}일`}</dd></div>
                <div><dt>결제 예정금액</dt><dd><strong>{money(item.amount)}</strong></dd></div>
              </dl>
              {!item.eligible && <p className="extension-checkout__error">{extensionResultText(item)}</p>}
            </article>)}
          </div>
          <p className="extension-checkout__help">30일 상품은 (월 렌탈료 ÷ 30) × 연장 일수로 계산한 뒤, 상품별 금액의 소수점 이하를 반올림합니다.</p>
          <p className="extension-checkout__help">만료 후 결제가 승인되면 실제 연장 기간은 승인 시각부터 계산되어 예상 종료 시각과 달라질 수 있습니다.</p>
        </section>
        {current?.benefits && <fieldset className="extension-checkout__section" disabled={locked}>
          <legend>쿠폰·포인트</legend>
          <div className="extension-checkout__fields">
            <label className="extension-checkout__select-label">쿠폰<NativeSelect disabled={quote.isFetching} value={coupon} onChange={event => { setCoupon(event.target.value); setPoints('0') }}><option value="">사용 안 함</option>
              {current.benefits.coupons.map(item => <option key={item.userCouponId} value={item.userCouponId}>{item.name} · {money(item.discountAmount)} 할인</option>)}
            </NativeSelect></label>
            <TextField appearance="box" label={`포인트 (보유 ${current.benefits.availablePoints.toLocaleString('ko-KR')}P)`} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="0" value={points} onChange={event => changePoints(event.target.value)}/>
          </div>
        </fieldset>}
        <fieldset className="extension-checkout__section" disabled={locked}>
          <legend>주문자 정보</legend>
          {profile.isFetching && !profile.data && <p className="extension-checkout__help" role="status">회원정보를 불러오고 있습니다.</p>}
          {profile.isError && <div className="extension-checkout__error" role="alert"><p>회원정보를 불러오지 못했습니다. 다시 조회하거나 직접 입력해 주세요.</p><Button size="small" variant="secondary" disabled={locked || profile.isFetching} onClick={() => void profile.refetch()}>회원정보 다시 불러오기</Button></div>}
          <div className="extension-checkout__fields">
            <TextField appearance="box" label="이름" required maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)}/>
            <TextField appearance="box" label="이메일" required type="email" maxLength={255} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)}/>
            <TextField appearance="box" label="연락처" required type="tel" maxLength={30} autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)}/>
          </div>
        </fieldset>
      </div>
      <aside aria-label="결제 요약" className="extension-checkout__summary">
        <h3>결제 예정금액</h3>
        <dl>
          <div><dt>연장 상품 {rentalIds.length}대</dt><dd>{money(current?.totalAmount)}</dd></div>
          <div><dt>쿠폰 할인</dt><dd>{current ? `−${money(current.benefits?.couponDiscountAmount ?? 0)}` : '—'}</dd></div>
          <div><dt>포인트 사용</dt><dd>{current ? `−${(current.benefits?.pointUsedAmount ?? 0).toLocaleString('ko-KR')}P` : '—'}</dd></div>
          <div className="extension-checkout__total"><dt>최종 결제금액</dt><dd>{money(current?.benefits?.finalAmount ?? current?.totalAmount)}</dd></div>
        </dl>
        {current?.benefits?.finalAmount === 0 && <p className="extension-checkout__help">전액 할인되어 별도의 결제 없이 완료됩니다.</p>}
        <Checkbox className="extension-checkout__agreement" visualClassName="" checked={orderConfirmed} disabled={locked} onChange={event => setOrderConfirmed(event.target.checked)}>[필수] 주문 상품, 결제 금액 및 주문 내용을 모두 확인했습니다.</Checkbox>
        {current && !current.eligible && <p className="extension-checkout__error" role="alert">연장할 수 없는 상품이나 기간을 확인해 주세요.</p>}
        <Button fullWidth size="large" type="submit" disabled={create.isPending || create.isSuccess || !selection.success || !quoteReady || !current?.eligible || !orderConfirmed}>{create.isError ? '같은 주문 다시 확인' : create.isPending ? '주문 생성 중…' : '연장 주문 생성'}</Button>
        <p className="extension-checkout__help">주문 생성 후 결제를 진행하며, 결제 완료 후 이용 기간이 연장됩니다.</p>
      </aside>
    </form>
    {create.error && <div className="extension-checkout__feedback"><p className="extension-checkout__error" role="alert">{create.error.message}</p><Link to="/mypage/orders">주문 내역 확인</Link>
      {canRevise && <Button variant="secondary" onClick={() => { draft.current = null; create.reset(); void quote.refetch() }}>입력 수정 후 견적 다시 확인</Button>}
    </div>}
    {create.data && <section aria-label="연장 주문 완료" className="extension-checkout__feedback">
      <h3>연장 주문이 생성되었습니다.</h3><p role="status">결제 기한: {dateTime(create.data.paymentDueAt)}</p>
      <Link to={`/mypage/orders/${encodeURIComponent(create.data.orderNo)}`}>연장 주문 상세</Link>
      <OrderPaymentContinuation orderNo={create.data.orderNo} orderStatus="payment_pending" paymentStatus="pending"/>
    </section>}
    <div className="extension-checkout__back"><Button as={Link} variant="secondary" to={offerIds?.length ? '/mypage/storage' : '/mypage/rcpc'}>목록으로</Button></div>
  </section>
  return pageMode ? content : <section aria-label="RCPC 기간 연장">
    <Button size="small" onClick={() => setOpen(true)}>{triggerLabel ?? `선택 ${rentalIds.length}대 기간 연장`}</Button>
    {open ? <RcpcExtensionSurface action={quoteReady && current?.eligible && selection.success ? <Link to="/mypage/extension-checkout" state={{ selection: selection.data, offerIds }}>연장 결제하기</Link> : <button disabled type="button">연장 결제하기</button>}
      busy={quote.isFetching} dateValue={date} error={quote.error?.message} extensionMode={mode === 'days' ? 'period' : 'date'} itemCount={current?.items.length ?? rentalIds.length} onClose={() => setOpen(false)} onDateChange={setDate}
      onModeChange={(value) => setMode(value === 'date' ? 'date' : 'days')} onPeriodChange={setDays} periodValue={days}
      rcpc={displayTargets?.[0] ?? { rcpcId: rentalIds[0] }} targets={displayTargets ?? rentalIds.map((rentalId) => ({ rcpcId: rentalId }))}
      rows={current?.items.map((item) => ({ key: item.rentalId, product: item.productNo ?? '-', period: item.addedDays == null ? '-' : `${item.addedDays}일`, currentEnd: item.previousEnd?.replace('T', ' ') ?? '-', nextEnd: item.targetEnd?.replace('T', ' ') ?? '-', monthlyFee: item.monthlyFee == null ? '-' : `${item.monthlyFee.toLocaleString('ko-KR')}원`, payment: extensionResultText(item), warning: !item.eligible }))}
      totalAmount={current ? `${current.totalAmount.toLocaleString('ko-KR')}원` : '견적 미조회'} /> : null}
  </section>
}
