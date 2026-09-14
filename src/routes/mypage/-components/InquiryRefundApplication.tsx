import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/api/httpClient'
import type { RefundDirectApplicationInput, RefundDirectQuoteRequest } from '@/api/operationRequests'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { Modal } from '@/components/ui/ModalControl'
import { AccountQueryState } from './AccountQueryState'

type RefundCandidate = Awaited<ReturnType<InquiryReadServices['refundApplicationCandidates']>>[number]
type SubmitAttempt = { input: RefundDirectApplicationInput; key: string }
type Props = { api: InquiryReadServices; initialRentalIds?: readonly number[]; triggerLabel?: string; triggerEnabled?: boolean }

const reasonOptions = ['이용 중 장애 또는 오류', '상품 성능 불만족', '다른 상품으로 변경', '더 이상 이용하지 않음', '기타'] as const
const bankOptions = [
  ['004', '국민은행'], ['088', '신한은행'], ['020', '우리은행'], ['081', '하나은행'],
  ['003', '기업은행'], ['011', '농협은행'], ['023', 'SC제일은행'], ['027', '한국씨티은행'],
  ['090', '카카오뱅크'], ['089', '케이뱅크'], ['092', '토스뱅크'], ['007', '수협은행'],
] as const

function finalInputError(error: unknown) {
  return error instanceof ApiClientError && (error.status === 400 || error.status === 422)
}

function displayDate(value: string | null) {
  return value ? value.slice(0, 10).replaceAll('-', '.') : '-'
}

function displayMoney(value: number, maximumFractionDigits = 0) {
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits })}원`
}

function CandidateSummary({ item }: { item: RefundCandidate }) {
  return <span className="refund-application__candidate-copy">
    <strong>{item.alias ? `${item.alias}·` : ''}{item.productNo}</strong>
    <span>{item.title} · {item.serverRoomName ?? '-'}</span>
    <small>{item.spec ?? '-'}</small>
    <small>주문일 {displayDate(item.orderedAt)}　이용기간 {displayDate(item.serviceStartedAt)}~{displayDate(item.serviceEndsAt)}</small>
  </span>
}

export function InquiryRefundApplication({ api, initialRentalIds = [], triggerLabel = '환불·중도해지 신청하기', triggerEnabled = true }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  if (!triggerEnabled && !open) return null
  return <section className="refund-application-trigger">
    {triggerEnabled ? <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>{triggerLabel}</button> : null}
    {open ? <ApplicationDialog api={api} initialRentalIds={initialRentalIds} onClose={() => setOpen(false)} returnFocusRef={triggerRef}/> : null}
  </section>
}

function ApplicationDialog({ api, initialRentalIds, onClose, returnFocusRef }: {
  api: InquiryReadServices
  initialRentalIds: readonly number[]
  onClose: () => void
  returnFocusRef: RefObject<HTMLElement | null>
}) {
  const client = useQueryClient()
  const [selected, setSelected] = useState<number[]>([])
  const [method, setMethod] = useState<RefundDirectQuoteRequest['method']>('original')
  const [reason, setReason] = useState('')
  const [phone, setPhone] = useState<string | null>(null)
  const [bank, setBank] = useState({ code: '', name: '', accountNumber: '', holder: '' })
  const [agreed, setAgreed] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const attempt = useRef<SubmitAttempt | null>(null)
  const initializedRentalKey = useRef('')
  const initialRentalKey = useMemo(() => [...new Set(initialRentalIds)].sort((a, b) => a - b).join(','), [initialRentalIds])
  const selectFromCandidates = !initialRentalKey
  const targets = useQuery({ queryKey: ['refund-application-candidates', api.organizationId], queryFn: ({ signal }) => api.refundApplicationCandidates(signal) })

  useEffect(() => {
    if (!targets.data?.length || !initialRentalKey || initializedRentalKey.current === initialRentalKey) return
    const initial = new Set(initialRentalKey.split(',').filter(Boolean).map(Number))
    const values = targets.data.filter(item => initial.has(item.rentalId)).map(item => item.orderItemId).slice(0, 20)
    initializedRentalKey.current = initialRentalKey
    if (values.length) setSelected(values)
  }, [initialRentalKey, targets.data])

  const selectedTargets = (targets.data ?? []).filter(item => selected.includes(item.orderItemId))
  const contactPhone = phone ?? selectedTargets[0]?.contactPhone ?? ''
  const quoteInput: RefundDirectQuoteRequest = {
    method,
    selections: selectedTargets.map(item => ({ orderItemId: item.orderItemId, rentalId: item.rentalId })),
  }
  const quote = useMutation({ mutationFn: (input: RefundDirectQuoteRequest) => api.refundDirectApplicationQuote(input) })
  const quoteCurrent = quote.data && JSON.stringify(quote.variables) === JSON.stringify(quoteInput) && !quote.isPending && !quote.isError
  const submit = useMutation({
    mutationFn: async () => {
      const currentAttempt = attempt.current ?? buildAttempt()
      attempt.current = currentAttempt
      return api.submitDirectRefundApplication(currentAttempt.input, currentAttempt.key)
    },
    onError: (error) => { if (finalInputError(error)) attempt.current = null },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['my-refund-requests', api.organizationId] }),
        client.invalidateQueries({ queryKey: ['refund-application-candidates', api.organizationId] }),
        client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] }),
        client.invalidateQueries({ queryKey: ['my-account'] }),
      ])
    },
  })
  const locked = submit.isPending || (submit.isError && !finalInputError(submit.error) && attempt.current !== null)
  const ambiguousFailure = submit.isError && !finalInputError(submit.error) && attempt.current !== null

  function buildAttempt(): SubmitAttempt {
    if (!quoteCurrent || !quote.data || !agreed || !reason) throw new Error('환불 신청 내용을 다시 확인해 주세요.')
    const input: RefundDirectApplicationInput = {
      quote: quoteInput,
      expectedFingerprint: quote.data.fingerprint,
      reason,
      contactPhone,
      refundPolicyAgreed: true,
      terminationAgreed: true,
      bank: quote.data.bankRequired ? bank : null,
    }
    return { input, key: crypto.randomUUID() }
  }

  function requestQuote(nextMethod = method) {
    attempt.current = null
    setAgreed(false)
    quote.mutate({ ...quoteInput, method: nextMethod })
  }

  function changeMethod(nextMethod: RefundDirectQuoteRequest['method']) {
    setMethod(nextMethod)
    setBank({ code: '', name: '', accountNumber: '', holder: '' })
    requestQuote(nextMethod)
  }

  function toggleCandidate(orderItemId: number) {
    attempt.current = null
    setSelected(current => current.includes(orderItemId)
      ? current.filter(value => value !== orderItemId)
      : current.length < 20 ? [...current, orderItemId] : current)
  }

  if (submit.isSuccess) return <Modal className="modal--refund-complete" isOpen title="해지 신청이 완료되었습니다." closeLabel="확인" onClose={onClose} returnFocusRef={returnFocusRef}>
    <p>접수, 처리 중 상태에서는 해지 요청을 철회할 수 있으며, 철회 시 RCPC를 그대로 이용하실 수 있습니다.</p>
  </Modal>

  const close = () => { if (!locked) onClose() }
  const dailyQuantity = Math.max(0, ...(quote.data?.items.map(item => item.dailyQuantity) ?? []))
  const dailyRate = Math.max(0, ...(quote.data?.items.map(item => item.dailyQuantityRateBasisPoints) ?? [])) / 100
  const dailyDeduction = quote.data?.items.reduce((total, item) => total + item.dailyQuantityDeduction, 0) ?? 0
  const beforeBulkRefundTotal = quote.data?.items.reduce((total, item) => total + (method === 'point' ? item.pointAmount : item.cashAmount) + item.dailyQuantityDeduction, 0) ?? 0
  const selectedCount = selected.length

  return <Modal className={`modal--refund-application modal--refund-step-${step}`} isOpen title="중도해지 및 환불 신청" closeLabel="취소" onClose={close} returnFocusRef={returnFocusRef} showClose={false}>
    {step === 1 ? <form className="refund-application refund-application--select" onSubmit={(event) => {
      event.preventDefault()
      if (!selectedCount || !reason) return
      setStep(2)
      requestQuote()
    }}>
      <p className="refund-application__count">신청 품목 <strong>{selectedCount}개</strong></p>
      <AccountQueryState pending={targets.isPending} error={targets.error} retry={targets.refetch}/>
      <fieldset className="refund-application__candidates" disabled={locked}>
        <legend className="sr-only">해지 신청 상품</legend>
        {selectFromCandidates ? (targets.data ?? []).map(item => {
          const checked = selected.includes(item.orderItemId)
          return <article key={`${item.operationRequestTargetId}:${item.orderItemId}`}><label>
            <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 20} onChange={() => toggleCandidate(item.orderItemId)}/>
            <CandidateSummary item={item}/>
          </label></article>
        }) : selectedTargets.map(item => <article key={`${item.operationRequestTargetId}:${item.orderItemId}`}><CandidateSummary item={item}/></article>)}
        {targets.data && (selectFromCandidates ? targets.data.length === 0 : selectedTargets.length === 0) ? <p className="refund-application__empty">선택한 상품 중 해지 신청 가능한 이용 중 상품이 없습니다.</p> : null}
      </fieldset>
      <label className="refund-application__reason"><span><b>*</b> 환불 사유</span><select required value={reason} onChange={(event) => setReason(event.target.value)}>
        <option value="">환불 사유를 선택해 주세요.</option>
        {reasonOptions.map(value => <option key={value} value={value}>{value}</option>)}
      </select>{!reason ? <small>환불 사유를 선택해 주세요.</small> : null}</label>
      <footer><button type="button" onClick={close}>취소</button><button type="submit" disabled={!selectedCount || !reason || locked}>다음</button></footer>
    </form> : <form className="refund-application refund-application--quote" onSubmit={(event) => {
      event.preventDefault()
      if (!submit.isPending && (attempt.current || quoteCurrent)) submit.mutate()
    }}>
      {quote.isPending ? <LoadingState className="refund-application__loading" label="환불 예상 금액을 계산하고 있습니다." /> : null}
      {quote.isError ? <p role="alert">{quote.error instanceof Error ? quote.error.message : '환불 예상 금액을 확인하지 못했습니다.'} <button type="button" onClick={() => requestQuote()}>다시 시도</button></p> : null}
      {quoteCurrent && quote.data ? <>
        <section className="refund-application__summary" aria-label="최종 환불 예상 금액 요약">
          <p><span>신청 품목 <strong>{selectedCount}개</strong></span></p>
          <p><span>건별 환불 예상금액 합계</span><strong>{displayMoney(beforeBulkRefundTotal)}</strong></p>
          <p><span>다량 중도해지 공제금</span><strong>{dailyDeduction > 0 ? `-${displayMoney(dailyDeduction)}` : displayMoney(0)}</strong></p>
          <p><span>최종 환불 예상 금액</span><strong>{displayMoney(method === 'point' ? quote.data.pointTotal : quote.data.cashTotal)}</strong></p>
        </section>
        <details className="refund-application__breakdown">
          <summary>환불 예상금액 상세보기</summary>
          <div className="refund-application__table-scroll"><table><thead><tr><th>RCPC</th><th>남은기간 / 정산금</th><th>이용기간 공제율 / 공제금</th><th>세팅비</th><th>조기종료 포맷비</th><th>프로모션 포인트 공제</th><th>구매확정 적립금 회수</th><th>쿠폰 사용금액</th><th>공제금액 합계</th><th>환불 금액</th><th>적립금 복원금액</th></tr></thead><tbody>{quote.data.items.map(item => {
            const target = selectedTargets.find(candidate => candidate.orderItemId === item.orderItemId)
            const deductionTotal = item.usedDaysDeduction + item.dailyQuantityDeduction + item.setupFee + item.formatFee + item.promotionalPointDeduction + item.purchaseConfirmationPointReversal + item.couponDeduction
            return <tr key={item.orderItemId}><td>{target?.alias || item.productNo}</td><td>{item.remainingDays}일 / {displayMoney(item.remainingSettlement, 8)}</td><td>{item.usedDays}일 {item.usedDaysRateBasisPoints / 100}% / {displayMoney(item.usedDaysDeduction, 8)}</td><td>{displayMoney(item.setupFee)}</td><td>{displayMoney(item.formatFee)}</td><td>{displayMoney(item.promotionalPointDeduction)}</td><td>{displayMoney(item.purchaseConfirmationPointReversal)}</td><td>{displayMoney(item.couponDeduction)}</td><td>{displayMoney(deductionTotal, 8)}</td><td>{displayMoney(method === 'point' ? item.pointAmount : item.cashAmount)}</td><td>{method === 'point' ? '0P' : `${item.pointAmount.toLocaleString('ko-KR')}P`}</td></tr>
          })}</tbody></table></div>
        </details>
        <section className="refund-application__bulk"><h3>다량 중도해지 공제</h3><dl><div><dt>해지 요청 건 수</dt><dd>{dailyQuantity}건</dd></div><div><dt>공제율</dt><dd>{dailyRate}%</dd></div><div><dt>공제금</dt><dd>{dailyDeduction > 0 ? `-${displayMoney(dailyDeduction)}` : displayMoney(0)}</dd></div></dl></section>
        <ul className="refund-application__notice"><li>표시 금액은 해지 신청 기준 예상 금액입니다.</li><li>이미 사용한 쿠폰은 복원되지 않습니다.</li><li>구매확정으로 지급받은 포인트는 전액 회수되며, 결제 시 사용한 포인트는 부분적으로 복원됩니다.</li></ul>
        <fieldset className="refund-application__method"><legend>환불 방법 선택</legend><div>
          <label><input type="radio" name="refund-method" checked={method === 'point'} onChange={() => changeMethod('point')}/><span><strong>포인트 적립</strong><small>최종 환불금이 포인트로 즉시 적립되며, 상품 구매에 이용하실 수 있습니다.</small></span></label>
          <label><input type="radio" name="refund-method" checked={method === 'original'} onChange={() => changeMethod('original')}/><span><strong>결제수단 환불</strong><small>기존 결제수단으로 환불되며 영업일 기준 3~7일 소요될 수 있습니다.</small></span></label>
        </div></fieldset>
        {quote.data.bankRequired ? <fieldset className="refund-application__bank"><legend>환불 계좌정보</legend><select required aria-label="은행명" value={bank.code} onChange={(event) => {
          const selectedBank = bankOptions.find(([code]) => code === event.target.value)
          setBank(current => ({ ...current, code: selectedBank?.[0] ?? '', name: selectedBank?.[1] ?? '' })); attempt.current = null
        }}><option value="">은행명</option>{bankOptions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select><input required aria-label="계좌번호" inputMode="numeric" pattern="[0-9 -]{8,40}" placeholder="계좌번호 숫자만 입력" value={bank.accountNumber} onChange={(event) => { setBank(current => ({ ...current, accountNumber: event.target.value })); attempt.current = null }}/><input required aria-label="예금주" placeholder="예금주" value={bank.holder} onChange={(event) => { setBank(current => ({ ...current, holder: event.target.value })); attempt.current = null }}/></fieldset> : null}
        <label className="refund-application__phone"><span>연락처</span><input required maxLength={30} value={contactPhone} pattern="[0-9+() -]{8,30}" inputMode="tel" placeholder="연락처 숫자만 입력" onChange={(event) => { setPhone(event.target.value); attempt.current = null }}/></label>
        <label className="refund-application__agreement"><input type="checkbox" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); attempt.current = null }}/><span><strong>[필수] 환불 안내 및 정책을 모두 확인했으며, 이에 동의합니다.</strong><RelativeLink to="/terms?section=refund">환불 정책을 확인해주세요.</RelativeLink></span></label>
      </> : null}
      {submit.isError ? <p role="alert">{ambiguousFailure ? '접수 결과를 확인하지 못했습니다. 같은 요청으로 다시 접수해 중복 여부를 확인해 주세요.' : submit.error instanceof Error ? submit.error.message : '신청을 접수하지 못했습니다.'}</p> : null}
        <footer><button type="button" disabled={locked} onClick={close}>취소</button><button type="button" disabled={locked} onClick={() => { attempt.current = null; submit.reset(); setAgreed(false); setStep(1) }}>이전</button><button type="submit" disabled={!quoteCurrent || !agreed || !contactPhone.trim() || submit.isPending}>{submit.isPending ? '접수 중…' : ambiguousFailure ? '같은 요청으로 다시 접수' : '환불 신청하기'}</button></footer>
    </form>}
  </Modal>
}
