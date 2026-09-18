import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import { extensionSelectionSchema, type ExtensionCheckoutInput, type ExtensionSelection } from '@/api/extensionCheckout'
import { RcpcExtensionSurface, type RcpcDialogTarget } from '@/components/mypage/RcpcDialogsControl'
import { ApiClientError } from '@/api/httpClient'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { OrderPaymentContinuation } from './orders/OrderPaymentContinuation'
import { extensionResultText } from './rcpcExtensionPresentation'
import { Button } from '@/components/ui/ButtonControl'

export function RcpcExtensionCheckout({ api, rentalIds, displayTargets, initialDays = 30, offerIds, pageMode = false, initialSelection, triggerLabel }: { api: MyRcpcReadServices; rentalIds: readonly number[]; displayTargets?: readonly RcpcDialogTarget[]; initialDays?: number; offerIds?: number[]; pageMode?: boolean; initialSelection?: ExtensionSelection; triggerLabel?: string }) {
  const session = useSession()
  const [open, setOpen] = useState(pageMode)
  const [mode, setMode] = useState<'days' | 'date'>(initialSelection?.targetEndDate ? 'date' : 'days')
  const [days, setDays] = useState(String(initialSelection?.addedDays ?? initialDays))
  const [date, setDate] = useState(initialSelection?.targetEndDate ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coupon, setCoupon] = useState(initialSelection?.userCouponId ? String(initialSelection.userCouponId) : '')
  const [points, setPoints] = useState(String(initialSelection?.pointAmount ?? 0))
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  const draft = useRef<{ body: ExtensionCheckoutInput; key: string } | null>(null)
  const selection = extensionSelectionSchema.safeParse({ rentalIds: [...rentalIds].sort((a, b) => a - b),
    userCouponId: coupon ? Number(coupon) : null, pointAmount: Number(points),
    ...(mode === 'days' ? { addedDays: Number(days) } : { targetEndDate: date }) })
  const fingerprint = JSON.stringify(selection.success ? selection.data : null)
  const selected = selection.success ? selection.data : null
  const quote = useQuery({
    queryKey: ['extension-checkout-quote', api.organizationId, fingerprint],
    enabled: open && selected !== null,
    queryFn: () => {
      if (!selected) throw new Error('1개월, 2개월, 3개월 또는 통일할 만료일을 선택해 주세요.')
      return api.extensionCheckout.quote(selected)
    },
    retry: false,
  })
  const current = quote.data
  const create = useMutation({ mutationFn: () => {
    if (!draft.current) {
      if (!selection.success || !current?.eligible || !orderConfirmed) {
        throw new Error('연장 주문 내용을 확인해 주세요.')
      }
      draft.current = { key: crypto.randomUUID(), body: { selection: selection.data, quoteHash: current.quoteHash, offerIds,
        contact: { name: name.trim(), email: email.trim(), phone: phone.trim(), messengerType: null, messengerId: null } } }
    }
    return api.extensionCheckout.create(draft.current.body, draft.current.key)
  } })
  const locked = create.isPending || create.isSuccess || create.isError
  const canRevise = create.error?.name === 'ZodError' || (create.error instanceof ApiClientError && [400, 422].includes(create.error.status ?? 0))
  const owner = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
  if (!owner || !session.customerSession?.commerceAvailable || rentalIds.length === 0) return null
  const content = <>
      <h3>기간 연장 · {rentalIds.length}대</h3>
      <p>같은 일수만큼 연장하거나 만료일을 같은 날짜로 맞출 수 있습니다. 각 상품은 최대 90일까지 연장할 수 있으며 종료 시각은 유지됩니다.</p>
      <fieldset disabled={locked || quote.isFetching}><legend>연장 방법</legend>
        <label><input type="radio" disabled={!!offerIds?.length} checked={mode === 'days'} onChange={() => setMode('days')}/>기간 지정</label>
        <label><input type="radio" disabled={!!offerIds?.length} checked={mode === 'date'} onChange={() => setMode('date')}/>동일 만료일</label>
        {mode === 'days' ? <div aria-label="연장 기간">{[['30', '1개월'], ['60', '2개월'], ['90', '3개월']].map(([value, label]) => <button aria-pressed={days === value} disabled={!!offerIds?.length} key={value} onClick={() => setDays(value)} type="button">{label}</button>)}</div>
          : <label>만료일 (한국 시간)<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label>}
      </fieldset>
      {quote.data?.benefits && <fieldset disabled={locked || quote.isFetching}><legend>쿠폰·포인트</legend>
        <label>쿠폰<select value={coupon} onChange={event => setCoupon(event.target.value)}><option value="">사용 안 함</option>
          {quote.data.benefits.coupons.map(item => <option key={item.userCouponId} value={item.userCouponId}>{item.name} · {item.discountAmount.toLocaleString('ko-KR')}원 할인</option>)}
        </select></label>
        <label>포인트 (보유 {quote.data.benefits.availablePoints.toLocaleString('ko-KR')}P)<input type="number" min={0} max={quote.data.benefits.availablePoints} step={1} value={points} onChange={event => setPoints(event.target.value)}/></label>
      </fieldset>}
      {quote.isFetching && <p role="status">연장 견적을 확인하고 있습니다.</p>}
      {quote.error && <p role="alert">{quote.error.message}</p>}
      {current && <><div style={{ maxHeight: '45vh', overflow: 'auto' }}><table><thead><tr><th>상품 / 서버실 / 사양</th><th>현재 만료</th><th>연장 일수</th><th>변경 만료</th><th>금액</th><th>확인</th></tr></thead><tbody>
        {current.items.map(item => <tr key={item.rentalId}><td>{item.productNo} {item.title}<br/>{item.serverRoomName} / {item.spec}</td>
          <td>{item.previousEnd?.replace('T', ' ') ?? '-'}</td><td>{item.addedDays ?? '-'}일</td><td>{item.targetEnd?.replace('T', ' ') ?? '-'}</td>
          <td>{item.amount?.toLocaleString('ko-KR') ?? '-'}원</td><td>{item.eligible ? '연장 가능' : extensionResultText(item)}</td></tr>)}
      </tbody></table></div><p>합계 {current.totalAmount.toLocaleString('ko-KR')}원</p>
      {current.benefits && <p>쿠폰 −{current.benefits.couponDiscountAmount.toLocaleString('ko-KR')}원 · 포인트 −{current.benefits.pointUsedAmount.toLocaleString('ko-KR')}P · 최종 결제 {current.benefits.finalAmount.toLocaleString('ko-KR')}원{current.benefits.finalAmount === 0 ? ' (외부 결제 없이 내부 승인)' : ''}</p>}
      <p>30일 상품은 월 렌탈료 ÷ 30 × 연장 일수로 계산합니다. 원 미만 금액의 처리 정책이 미설정된 기간은 결제할 수 없습니다.</p>
      {!current.eligible && <p role="alert">연장할 수 없는 행을 확인하고 선택 대상 또는 기간을 수정해 주세요.</p>}
      {!pageMode && current.eligible && selection.success ? <Link to="/mypage/extension-checkout" state={{ selection: selection.data, offerIds }}>연장 결제하기 · 주문서 작성</Link> : null}
      {!pageMode && !current.eligible ? <button type="button" disabled>연장 결제하기</button> : null}
      {pageMode ? <form onSubmit={event => { event.preventDefault(); create.mutate() }}>
        <fieldset disabled={locked}><legend>주문자 정보</legend>
          <label>이름<input required maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)}/></label>
          <label>이메일<input required type="email" maxLength={255} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)}/></label>
          <label>연락처<input required type="tel" maxLength={30} autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)}/></label>
          <label><input type="checkbox" checked={orderConfirmed} onChange={event => setOrderConfirmed(event.target.checked)}/>[필수] 주문 상품, 결제 금액 및 주문 내용을 모두 확인했습니다.</label>
        </fieldset>
        <p>확인한 금액으로 연장 주문을 만든 뒤 결제를 진행합니다. 결제 완료 후 기간이 반영됩니다.</p>
        <button type="submit" disabled={create.isPending || create.isSuccess || !current.eligible || !orderConfirmed}>{create.isError ? '같은 주문 다시 확인' : create.isPending ? '주문 생성 중…' : '연장 주문 생성'}</button>
      </form> : null}</>}
      {create.error && <p role="alert">{create.error.message} <Link to="/mypage/orders">주문 내역 확인</Link></p>}
      {canRevise && <button type="button" onClick={() => { draft.current = null; create.reset(); void quote.refetch() }}>입력 수정 후 견적 다시 확인</button>}
      {create.data && <div role="status"><p>연장 주문이 생성되었습니다. 결제 기한: {create.data.paymentDueAt.replace('T', ' ')}</p>
        <Link to={`/mypage/orders/${encodeURIComponent(create.data.orderNo)}`}>연장 주문 상세</Link>
        <OrderPaymentContinuation orderNo={create.data.orderNo} orderStatus="payment_pending" paymentStatus="pending"/>
      </div>}
    </>
  return pageMode ? <section aria-label="연장 주문서">{content}<Link to={offerIds?.length ? '/mypage/storage' : '/mypage/rcpc'}>목록으로</Link></section> : <section aria-label="RCPC 기간 연장">
    <Button size="small" onClick={() => setOpen(true)}>{triggerLabel ?? `선택 ${rentalIds.length}대 기간 연장`}</Button>
    {open ? <RcpcExtensionSurface action={!quote.isFetching && !quote.error && current?.eligible && selection.success ? <Link to="/mypage/extension-checkout" state={{ selection: selection.data, offerIds }}>연장 결제하기</Link> : <button disabled type="button">연장 결제하기</button>}
      busy={quote.isFetching} dateValue={date} error={quote.error?.message} extensionMode={mode === 'days' ? 'period' : 'date'} itemCount={current?.items.length ?? rentalIds.length} onClose={() => setOpen(false)} onDateChange={setDate}
      onModeChange={(value) => setMode(value === 'date' ? 'date' : 'days')} onPeriodChange={setDays} periodValue={days}
      rcpc={displayTargets?.[0] ?? { rcpcId: rentalIds[0] }} targets={displayTargets ?? rentalIds.map((rentalId) => ({ rcpcId: rentalId }))}
      rows={current?.items.map((item) => ({ key: item.rentalId, product: item.productNo ?? '-', period: item.addedDays == null ? '-' : `${item.addedDays}일`, currentEnd: item.previousEnd?.replace('T', ' ') ?? '-', nextEnd: item.targetEnd?.replace('T', ' ') ?? '-', monthlyFee: item.monthlyFee == null ? '-' : `${item.monthlyFee.toLocaleString('ko-KR')}원`, payment: extensionResultText(item), warning: !item.eligible }))}
      totalAmount={current ? `${current.totalAmount.toLocaleString('ko-KR')}원` : '견적 미조회'} /> : null}
  </section>
}
