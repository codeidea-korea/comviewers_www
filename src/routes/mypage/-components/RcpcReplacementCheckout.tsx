import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import { ApiClientError } from '@/api/httpClient'
import type { RentalChangeCheckoutInput } from '@/api/rentalChangeCheckout'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { AccountQueryState } from './AccountQueryState'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { OrderPaymentContinuation } from './orders/OrderPaymentContinuation'

const statusLabels: Record<string, string> = {
  quoted: '견적 보관 / 결제 대기',
  payment_pending: '결제 진행 중',
  paid: '결제 승인 / 인계 대기',
  completed: '교체 완료',
  cancelled: '취소',
  expired: '만료',
  failed: '실패',
}
const typeLabels: Record<string, string> = { device_replacement: '디바이스 교체', parts_replacement: '부품 교체' }
const itemLabels: Record<string, string> = { cpu: 'CPU', ram: 'RAM', storage: '저장장치', gpu: 'GPU', network: '네트워크', software: '소프트웨어', service: '작업비', other: '기타' }

function money(value: number | null | undefined) {
  return `${(value ?? 0).toLocaleString('ko-KR')}원`
}
function date(value: string | null | undefined) {
  return value ? value.replace('T', ' ') : '-'
}
function payable(status: string, amount: number) {
  return status === 'quoted' && amount > 0
}

export function RcpcReplacementCheckoutEntry({ api, rentalId }: { api: MyRcpcReadServices; rentalId: number }) {
  const session = useSession()
  const list = useQuery({ queryKey: ['rental-changes', api.organizationId, rentalId], enabled: session.status === 'authenticated' && !!session.customerSession?.commerceAvailable,
    queryFn: ({ signal }) => api.changeCheckout.list(rentalId, signal) })
  if (session.status !== 'authenticated' || !session.customerSession?.commerceAvailable) return null
  const cases = list.data ?? []
  if (list.isPending) return <LoadingState className="route-loading--compact" label="교체 견적을 확인하고 있습니다." />
  if (list.error) return <p role="alert">교체 견적을 불러오지 못했습니다. <button type="button" onClick={() => void list.refetch()}>다시 시도</button></p>
  if (!cases.length) return null
  return <section aria-label="RCPC 교체 결제"><h3>교체 견적·처리 내역</h3>
    {cases.map(item => <article key={item.id}><p>{typeLabels[item.changeType] ?? item.changeType} · {item.refundRecoveryAvailable ? '환불 완료 · 관리자 교체 취소 대기' : statusLabels[item.status] ?? item.status}</p>
      <p>{item.sourceProductNo ?? '현재 장비'} → {item.targetProductNo ?? '교체 장비'} · {item.targetServerRoomName ?? '서버실 미등록'}</p>
      <p>추가 결제액 {money(item.additionalPaymentAmount)} · 차액 적립 {item.pointCreditAmount.toLocaleString('ko-KR')}P · 이용 종료일 {date(item.serviceEndsAtSnapshot)}</p>
      <Link to={`/mypage/replacement-checkout/${item.id}`}>{payable(item.status, item.additionalPaymentAmount) ? '교체 결제하기 · 주문서 작성' : '교체 명세·처리 상태 보기'}</Link></article>)}
  </section>
}

export function RcpcReplacementCheckout({ api }: { api: MyRcpcReadServices }) {
  const session = useSession()
  const { changeId } = useParams()
  const id = Number(changeId)
  const valid = /^[1-9]\d*$/.test(changeId ?? '') && Number.isSafeInteger(id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coupon, setCoupon] = useState('')
  const [points, setPoints] = useState('0')
  const [agreed, setAgreed] = useState<readonly number[]>([])
  const draft = useRef<{ body: RentalChangeCheckoutInput; key: string } | null>(null)
  const authorized = session.status === 'authenticated' && !!session.customerSession?.commerceAvailable
  const detail = useQuery({ queryKey: ['rental-change', api.organizationId, changeId], enabled: valid && authorized, queryFn: ({ signal }) => api.changeCheckout.detail(id, signal) })
  const terms = useQuery({ queryKey: ['rental-change-terms', api.organizationId], enabled: valid && authorized, queryFn: () => api.changeCheckout.terms() })
  const selection = { userCouponId: coupon ? Number(coupon) : null, pointAmount: Number(points) }
  const fingerprint = JSON.stringify(selection)
  const quote = useMutation({ mutationFn: async () => {
    if (!valid) throw new Error('올바른 교체 결제 주소가 아닙니다.')
    return { fingerprint, value: await api.changeCheckout.quote(id, selection) }
  } })
  const current = quote.data?.fingerprint === fingerprint ? quote.data.value : undefined
  const create = useMutation({ mutationFn: () => {
    if (!valid) throw new Error('올바른 교체 결제 주소가 아닙니다.')
    if (!draft.current) {
      if (!current || !terms.data?.length || terms.data.some(term => !agreed.includes(term.termsPolicyVersionId))) {
        throw new Error('교체 견적과 필수 약관을 확인해 주세요.')
      }
      draft.current = { key: crypto.randomUUID(), body: {
        selection,
        quoteHash: current.quoteHash,
        contact: { name: name.trim(), email: email.trim(), phone: phone.trim(), messengerType: null, messengerId: null },
        agreements: terms.data.map(term => ({ agreementType: term.agreementType, termsPolicyVersionId: term.termsPolicyVersionId })),
      } }
    }
    return api.changeCheckout.create(id, draft.current.body, draft.current.key)
  } })
  const locked = create.isPending || create.isSuccess || create.isError
  const canRevise = create.error?.name === 'ZodError' || (create.error instanceof ApiClientError && [400, 422].includes(create.error.status ?? 0))
  if (session.status !== 'authenticated' || !session.customerSession?.commerceAvailable) return <section aria-label="교체 주문서"><p>교체 결제는 대표 고객 계정으로 이용할 수 있습니다.</p><Link to="/mypage/rcpc">이용 RCPC로 이동</Link></section>
  if (!valid) return <section aria-label="교체 주문서"><p>올바른 교체 결제 주소가 아닙니다.</p><Link to="/mypage/rcpc">이용 RCPC로 이동</Link></section>
  const row = detail.data?.change
  const canPay = row ? payable(row.status, row.additionalPaymentAmount) : false
  return <section aria-label="교체 주문서">
    <h2>교체 추가금 주문서</h2>
    <AccountQueryState pending={detail.isPending} error={detail.error} retry={detail.refetch} />
    {row ? <><dl>
      <dt>교체 번호</dt><dd>{row.changeNo}</dd>
      <dt>교체 유형</dt><dd>{typeLabels[row.changeType] ?? row.changeType}</dd>
      <dt>상태</dt><dd>{row.refundRecoveryAvailable ? '환불 완료 · 관리자 교체 취소 대기' : statusLabels[row.status] ?? row.status}</dd>
      <dt>현재 품번</dt><dd>{row.sourceProductNo ?? '-'}</dd>
      <dt>교체 품번</dt><dd>{row.targetProductNo ?? '-'}</dd>
      <dt>교체 상품</dt><dd>{row.targetProductTitle ?? '-'}</dd>
      <dt>서버실</dt><dd>{row.targetServerRoomName ?? '-'}</dd>
      {row.changeType === 'device_replacement' ? <><dt>현재 월 렌탈료</dt><dd>{money(row.previousAmount)}</dd><dt>교체 월 렌탈료</dt><dd>{money(row.replacementAmount)}</dd></> : null}
      <dt>추가 결제액</dt><dd>{money(row.additionalPaymentAmount)}</dd>
      <dt>교체 완료 시 차액 적립</dt><dd>{row.pointCreditAmount.toLocaleString('ko-KR')}P</dd>
      <dt>이용 종료일</dt><dd>{date(row.serviceEndsAtSnapshot)}</dd>
      <dt>사유</dt><dd>{row.reason ?? '-'}</dd>
    </dl>
      {detail.data?.items.length ? <table><thead><tr><th>항목</th><th>교체 전</th><th>교체 후</th><th>차액</th></tr></thead><tbody>{detail.data.items.map(item => <tr key={item.lineNo}><td>{itemLabels[item.itemType] ?? item.itemType}</td><td>{item.previousValue ?? '-'}</td><td>{item.replacementValue ?? '-'}</td><td>{money(item.differenceAmount)}</td></tr>)}</tbody></table> : null}
      {!canPay ? <p role="status">{row.refundRecoveryAvailable ? '추가금 환불이 완료되었습니다. 관리자의 교체 취소와 보류 재고 해제를 기다리고 있습니다.' : row.status === 'completed' ? '교체가 완료되었습니다.' : row.status === 'paid' ? '결제가 승인되었습니다. 관리자의 실제 인계 완료를 기다리고 있습니다.' : row.status === 'quoted' && row.additionalPaymentAmount === 0 ? `추가 결제 없이 인계 대기 중입니다. ${row.pointCreditAmount > 0 ? `실제 교체 완료 시 차액 ${row.pointCreditAmount.toLocaleString('ko-KR')}P가 적립됩니다.` : ''}` : row.status === 'payment_pending' ? <>주문이 생성되었습니다. <Link to="/mypage/orders">주문 내역에서 결제 이어가기</Link></> : '현재 결제할 수 없는 교체 건입니다. 처리 이력을 확인해 주세요.'}</p> : <><fieldset disabled={locked || quote.isPending}><legend>쿠폰·포인트</legend>
        <button type="button" onClick={() => quote.mutate()}>교체 견적 확인</button>
        {quote.error ? <p role="alert">{quote.error.message}</p> : null}
        {current?.benefits ? <><label>쿠폰<select value={coupon} onChange={event => setCoupon(event.target.value)}><option value="">사용 안 함</option>{current.benefits.coupons.map(item => <option key={item.userCouponId} value={item.userCouponId}>{item.name} · {item.discountAmount.toLocaleString('ko-KR')}원 할인</option>)}</select></label>
          <label>포인트 (보유 {current.benefits.availablePoints.toLocaleString('ko-KR')}P)<input type="number" min={0} max={current.benefits.availablePoints} step={1} value={points} onChange={event => setPoints(event.target.value)} /></label>
          <p>쿠폰 또는 포인트를 변경하면 교체 견적을 다시 확인해 주세요.</p>
          <p>교체 추가금 {money(current.amount)} · 쿠폰 −{current.benefits.couponDiscountAmount.toLocaleString('ko-KR')}원 · 포인트 −{current.benefits.pointUsedAmount.toLocaleString('ko-KR')}P · 최종 결제 {money(current.benefits.finalAmount)}</p></> : null}
      </fieldset>
      {current ? <form onSubmit={event => { event.preventDefault(); create.mutate() }}>
        <fieldset disabled={locked}><legend>주문자 정보</legend>
          <label>이름<input required maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>
          <label>이메일<input required type="email" maxLength={255} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>연락처<input required type="tel" maxLength={30} autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></label>
          {terms.data?.map(term => <div key={term.termsPolicyVersionId}><label><input type="checkbox" checked={agreed.includes(term.termsPolicyVersionId)} onChange={event => setAgreed(previous => event.target.checked ? [...previous, term.termsPolicyVersionId] : previous.filter(value => value !== term.termsPolicyVersionId))} />{term.title} (필수)</label><details><summary>약관 보기</summary><p style={{ whiteSpace: 'pre-wrap' }}>{term.content}</p></details></div>)}
        </fieldset>
        {terms.isError ? <p role="alert">주문 약관을 불러오지 못했습니다. <button type="button" onClick={() => void terms.refetch()}>다시 시도</button></p> : null}
        <p>결제 완료 후 관리자가 실제 장비 인계를 완료하면 RCPC 자산과 원격 접속 정보가 교체됩니다.</p>
        <button type="submit" disabled={create.isPending || create.isSuccess || !terms.data?.length || terms.data.some(term => !agreed.includes(term.termsPolicyVersionId))}>{create.isError ? '같은 주문 다시 확인' : create.isPending ? '주문 생성 중…' : '교체 주문 생성'}</button>
      </form> : null}</>}
      {detail.data?.events.length ? <details><summary>교체 처리 이력</summary>{detail.data.events.map(event => <p key={event.id}>{date(event.createdAt)} · {event.eventType} · {event.reason ?? ''}</p>)}</details> : null}</> : null}
    {create.error ? <p role="alert">{create.error.message} <Link to="/mypage/orders">주문 내역 확인</Link></p> : null}
    {canRevise ? <button type="button" onClick={() => { draft.current = null; create.reset(); quote.reset() }}>입력 수정 후 견적 다시 확인</button> : null}
    {create.data ? <div role="status"><p>교체 주문이 생성되었습니다. 결제 기한: {date(create.data.paymentDueAt)}</p><Link to={`/mypage/orders/${encodeURIComponent(create.data.orderNo)}`}>교체 주문 상세</Link><OrderPaymentContinuation orderNo={create.data.orderNo} orderStatus="payment_pending" paymentStatus="pending" /></div> : null}
    <Link to={row ? `/mypage/rcpc/${row.rentalId}` : '/mypage/rcpc'}>RCPC 상세로 돌아가기</Link>
  </section>
}
