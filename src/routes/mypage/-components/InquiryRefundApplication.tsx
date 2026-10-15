import { translateUiText, useUiTranslation } from '@/i18n/uiTranslation'
import { LocalizedServiceName } from '@/components/common/LocalizedServiceName'
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/api/httpClient'
import type { RefundApplicationQuote, RefundDirectApplicationInput, RefundDirectQuoteRequest } from '@/api/operationRequests'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { Modal } from '@/components/ui/ModalControl'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { AccountQueryState } from './AccountQueryState'
import { RefundContactPhone } from './RefundContactPhone'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import backIcon from '@/assets/figma/mypage-mobile-back.png'
import './inquiry-flow-qa.css'

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
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits })}${translateUiText('원')}`
}

function CandidateSummary({ item }: { item: RefundCandidate }) {
  const { uiText } = useUiTranslation()
  return <span className="refund-application__candidate-copy">
    <strong>{item.alias ? `${item.alias}·` : ''}{item.productNo}</strong>
    <span>{item.title} · <LocalizedServiceName kind="serverRoom" name={item.serverRoomName} /></span>
    <small>{item.spec ?? '-'}</small>
    <small>{uiText("주문일")} {displayDate(item.orderedAt)}　{uiText("이용기간")} {displayDate(item.serviceStartedAt)}~{displayDate(item.serviceEndsAt)}</small>
  </span>
}

export function InquiryRefundApplication({ api, initialRentalIds = [], triggerLabel = '환불·중도해지 신청하기', triggerEnabled = true }: Props) {
  const { uiText } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  if (!triggerEnabled && !open) return null
  return <section className="refund-application-trigger">
    {triggerEnabled ? <button className="button button--small button--secondary" ref={triggerRef} type="button" onClick={() => setOpen(true)}>{uiText(triggerLabel)}</button> : null}
    {open ? <InquiryRefundApplicationDialog api={api} initialRentalIds={initialRentalIds} onClose={() => setOpen(false)} returnFocusRef={triggerRef}/> : null}
  </section>
}

export function InquiryRefundApplicationDialog({ api, initialRentalIds, onClose, onComplete, returnFocusRef, standalone = false }: {
  api: InquiryReadServices
  initialRentalIds: readonly number[]
  onClose: () => void
  onComplete?: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
  standalone?: boolean
}) {
  const { uiText, t } = useUiTranslation()
  const client = useQueryClient()
  const formId = useId()
  const [selected, setSelected] = useState<number[]>([])
  const [method, setMethod] = useState<RefundDirectQuoteRequest['method']>('original')
  const [reason, setReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)
  const [phone, setPhone] = useState<string | null>(null)
  const [bank, setBank] = useState({ code: '', name: '', accountNumber: '', holder: '' })
  const [agreed, setAgreed] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [lastQuote, setLastQuote] = useState<{ data: RefundApplicationQuote; input: RefundDirectQuoteRequest } | null>(null)
  const attempt = useRef<SubmitAttempt | null>(null)
  const initializedRentalKey = useRef('')
  const initialRentalKey = useMemo(() => [...new Set(initialRentalIds)].sort((a, b) => a - b).join(','), [initialRentalIds])
  const selectFromCandidates = !initialRentalKey
  const targets = useQuery({ queryKey: ['refund-application-candidates', api.organizationId], queryFn: ({ signal }) => api.refundApplicationCandidates(signal), refetchOnMount: 'always' })
  const targetsReady = targets.isSuccess && !targets.isFetching

  useEffect(() => {
    if (!targetsReady || !targets.data?.length || !initialRentalKey || initializedRentalKey.current === initialRentalKey) return
    const initial = new Set(initialRentalKey.split(',').filter(Boolean).map(Number))
    const values = targets.data.filter(item => initial.has(item.rentalId)).map(item => item.orderItemId).slice(0, 20)
    if (values.length) {
      initializedRentalKey.current = initialRentalKey
      setSelected(values)
    }
  }, [initialRentalKey, targets.data, targetsReady])

  const selectedTargets = (targets.data ?? []).filter(item => selected.includes(item.orderItemId))
  const hasAvailableTargets = (targets.data ?? []).some(item => selectFromCandidates || initialRentalIds.includes(item.rentalId))
  const unavailableSelectionCount = targetsReady && initialRentalKey
    ? [...new Set(initialRentalIds)].filter(id => !(targets.data ?? []).some(item => item.rentalId === id)).length
    : 0
  const contactPhone = phone ?? selectedTargets[0]?.contactPhone ?? ''
  const quoteInput: RefundDirectQuoteRequest = {
    method,
    selections: selectedTargets.map(item => ({ orderItemId: item.orderItemId, rentalId: item.rentalId })),
  }
  const quote = useMutation({ mutationFn: (input: RefundDirectQuoteRequest) => api.refundDirectApplicationQuote(input) })
  const quoteCurrent = quote.data && JSON.stringify(quote.variables) === JSON.stringify(quoteInput) && !quote.isPending && !quote.isError
  useEffect(() => {
    if (quoteCurrent && quote.data && quote.variables) setLastQuote({ data: quote.data, input: quote.variables })
  }, [quoteCurrent, quote.data, quote.variables])
  const previousQuote = lastQuote && JSON.stringify(lastQuote.input.selections) === JSON.stringify(quoteInput.selections) ? lastQuote : null
  const displayedQuote = quoteCurrent ? quote.data : previousQuote?.data
  const displayedMethod = quoteCurrent ? method : previousQuote?.input.method ?? method
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
        client.invalidateQueries({ queryKey: ['my-rcpcs', api.organizationId] }),
      ])
    },
  })
  const locked = submit.isPending || (submit.isError && !finalInputError(submit.error) && attempt.current !== null)
  const ambiguousFailure = submit.isError && !finalInputError(submit.error) && attempt.current !== null

  function buildAttempt(): SubmitAttempt {
    if (!quoteCurrent || !quote.data || !agreed || !reason) throw new Error("환불 신청 내용을 다시 확인해 주세요.")
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
    if (nextMethod === method) return
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

  if (submit.isSuccess) return <Modal className="modal--refund-complete" isOpen title={uiText("해지 신청이 완료되었습니다.")} closeLabel={uiText("확인")} closeVariant="primary" onClose={onComplete ?? onClose} returnFocusRef={returnFocusRef}>
    <p>{uiText("접수, 처리 중 상태에서는 해지 요청을 철회할 수 있으며, 철회 시 RCPC를 그대로 이용하실 수 있습니다.")}</p>
  </Modal>

  const close = () => { if (!locked) onClose() }
  const dailyQuantity = Math.max(0, ...(displayedQuote?.items.map(item => item.dailyQuantity) ?? []))
  const dailyRate = Math.max(0, ...(displayedQuote?.items.map(item => item.dailyQuantityRateBasisPoints) ?? [])) / 100
  const dailyDeduction = displayedQuote?.items.reduce((total, item) => total + item.dailyQuantityDeduction, 0) ?? 0
  const beforeBulkRefundTotal = displayedQuote?.items.reduce((total, item) => total + (displayedMethod === 'point' ? item.pointAmount : item.cashAmount) + item.dailyQuantityDeduction, 0) ?? 0
  const selectedCount = selectedTargets.length
  const methodChoices = <fieldset className="refund-application__method" disabled={locked}><legend>{uiText("환불 방법 선택")}</legend><div>
    <label><input type="radio" name="refund-method" checked={method === 'point'} onChange={() => changeMethod('point')}/><span><strong>{uiText("포인트 적립")}</strong><small>{uiText("최종 환불금이 포인트로 즉시 적립되며, 상품 구매에 이용하실 수 있습니다.")}</small></span></label>
    <label><input type="radio" name="refund-method" checked={method === 'original'} onChange={() => changeMethod('original')}/><span><strong>{uiText("결제수단 환불")}</strong><small>{uiText("기존 결제수단으로 환불되며 영업일 기준 3~7일 소요될 수 있습니다.")}</small></span></label>
  </div></fieldset>

  const back = () => { if (locked) return; if (step === 1) close(); else { attempt.current = null; submit.reset(); setAgreed(false); setStep(1) } }
  const content = <section aria-label={uiText("중도해지 및 환불 신청")} aria-modal={standalone ? undefined : true} className={`modal modal--refund-application modal--refund-step-${step}${standalone ? ' refund-application-page' : ''}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
    <header className="refund-application-page__header"><button aria-label={uiText("이전 화면으로")} disabled={locked} onClick={back} type="button"><img alt="" src={backIcon}/></button><h2>{uiText("중도해지 및 환불 신청")}</h2></header><div className="modal__content">
    {step === 1 ? <form id={formId} className="refund-application refund-application--select" onSubmit={(event) => {
      event.preventDefault()
      if (!targetsReady || !selectedCount || !reason) return
      setStep(2)
      requestQuote()
    }}>
      <p className="refund-application__count">{uiText("신청 품목")} <strong>{selectedCount}{uiText("개")}</strong></p>
      {unavailableSelectionCount > 0 && hasAvailableTargets ? <p className="refund-application__count" role="status">{t("mypageSupport.excludedCount", { count: unavailableSelectionCount })}</p> : null}
      <AccountQueryState pending={targets.isPending || targets.isFetching} error={targets.error} retry={targets.refetch}/>
      <fieldset className="refund-application__candidates" disabled={locked || !targetsReady}>
        <legend className="sr-only">{uiText("해지 신청 상품")}</legend>
        {selectFromCandidates ? (targets.data ?? []).map(item => {
          const checked = selected.includes(item.orderItemId)
          return <article key={`${item.operationRequestTargetId}:${item.orderItemId}`}><label>
            <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 20} onChange={() => toggleCandidate(item.orderItemId)}/>
            <CandidateSummary item={item}/>
          </label></article>
        }) : selectedTargets.map(item => <article key={`${item.operationRequestTargetId}:${item.orderItemId}`}><CandidateSummary item={item}/></article>)}
        {targetsReady && !hasAvailableTargets ? <p className="refund-application__empty">{uiText("선택한 상품 중 해지 신청 가능한 이용 중 상품이 없습니다.")}</p> : null}
      </fieldset>
      <label className="refund-application__reason"><span><b>*</b> {uiText("환불 사유")}</span><select required value={reason} onBlur={() => setReasonTouched(true)} onChange={(event) => { setReasonTouched(true); setReason(event.target.value) }}>
        <option value="">{uiText("환불 사유를 선택해 주세요.")}</option>
        {reasonOptions.map(value => <option key={value} value={value}>{uiText(value)}</option>)}
      </select>{reasonTouched && !reason ? <small role="alert">{uiText("환불 사유를 선택해 주세요.")}</small> : null}</label>
    </form> : <form id={formId} className="refund-application refund-application--quote" onSubmit={(event) => {
      event.preventDefault()
      if (!submit.isPending && (attempt.current || quoteCurrent)) submit.mutate()
    }}>
      <div className="refund-application__quote-details" aria-busy={quote.isPending}>
      {!quoteCurrent ? <div className={displayedQuote ? 'refund-application__quote-status' : undefined}>
        {quote.isPending ? <LoadingState className="refund-application__loading" label={uiText("환불 예상 금액을 계산하고 있습니다.")} /> : null}
        {quote.isError ? <p role="alert">{uiText(quote.error instanceof Error ? quote.error.message : uiText("환불 예상 금액을 확인하지 못했습니다."))} <button type="button" onClick={() => requestQuote()}>{uiText("다시 시도")}</button></p> : null}
      </div> : null}
      {displayedQuote ? <div aria-hidden={!quoteCurrent}>
        <section className="refund-application__summary" aria-label={uiText("최종 환불 예상 금액 요약")}>
          <p><span>{uiText("신청 품목")} <strong>{selectedCount}{uiText("개")}</strong></span></p>
          <p><span>{uiText("건별 환불 예상금액 합계")}</span><strong>{displayMoney(beforeBulkRefundTotal)}</strong></p>
          <p><span>{uiText("다량 중도해지 공제금")}</span><strong>{dailyDeduction > 0 ? `-${displayMoney(dailyDeduction)}` : displayMoney(0)}</strong></p>
          <p><span>{uiText("최종 환불 예상 금액")}</span><strong>{displayMoney(displayedMethod === 'point' ? displayedQuote.pointTotal : displayedQuote.cashTotal)}</strong></p>
        </section>
        <section className="refund-application__breakdown" aria-label={uiText("환불 예상금액 상세보기")}>
          <h3>{uiText("환불 예상금액 상세보기")}</h3>
          <div className="refund-application__table-scroll"><table><thead><tr><th>RCPC</th><th>{uiText("남은기간 / 정산금")}</th><th>{uiText("이용기간 공제율 / 공제금")}</th><th>{uiText("세팅비")}</th><th>{uiText("조기종료 포맷비")}</th><th>{uiText("적립금 사용금액")}</th><th>{uiText("만료 포인트 제외")}</th><th>{uiText("쿠폰 사용금액")}</th><th>{uiText("공제금액 합계")}</th><th>{uiText("환불 금액")}</th><th>{uiText("적립금 복원금액")}</th></tr></thead><tbody>{displayedQuote.items.map(item => {
            const target = selectedTargets.find(candidate => candidate.orderItemId === item.orderItemId)
            const expiredPointDeduction = item.pointRestorationAllocation?.plan.expiredAmount ?? 0
            const restoredPointAmount = item.pointRestorationAllocation?.plan.restoredAmount ?? (displayedMethod === 'point' ? 0 : item.pointAmount)
            const deductionTotal = item.usedDaysDeduction + item.dailyQuantityDeduction + item.setupFee + item.formatFee + item.promotionalPointDeduction + item.purchaseConfirmationPointReversal + item.couponDeduction + expiredPointDeduction
            return <tr key={item.orderItemId}><td>{target?.alias || item.productNo}</td><td>{item.remainingDays}{uiText("일 /")} {displayMoney(item.remainingSettlement, 8)}</td><td>{item.usedDays}{uiText("일")} {item.usedDaysRateBasisPoints / 100}% / {displayMoney(item.usedDaysDeduction, 8)}</td><td>{displayMoney(item.setupFee)}</td><td>{displayMoney(item.formatFee)}</td><td>{displayMoney(item.promotionalPointDeduction)}</td><td>{expiredPointDeduction.toLocaleString('ko-KR')}P</td><td>{displayMoney(item.couponDeduction)}</td><td>{displayMoney(deductionTotal, 8)}</td><td>{displayMoney(displayedMethod === 'point' ? item.pointAmount : item.cashAmount)}</td><td>{restoredPointAmount.toLocaleString('ko-KR')}P</td></tr>
          })}</tbody></table></div>
        </section>
        <section className="refund-application__bulk"><h3>{uiText("다량 중도해지 공제")}</h3><dl><div><dt>{uiText("해지 요청 건 수")}</dt><dd>{dailyQuantity}{uiText("건")}</dd></div><div><dt>{uiText("공제율")}</dt><dd>{dailyRate}%</dd></div><div><dt>{uiText("공제금")}</dt><dd>{dailyDeduction > 0 ? `-${displayMoney(dailyDeduction)}` : displayMoney(0)}</dd></div></dl></section>
        <ul className="refund-application__notice"><li>{uiText("표시 금액은 해지 신청 기준 예상 금액입니다.")}</li><li>{uiText("이미 사용한 쿠폰은 복원되지 않습니다.")}</li><li>{uiText("구매확정으로 지급받은 포인트는 전액 회수되며, 결제 시 사용한 포인트는 환불 산정 비율에 따라 기존 유형으로 복원됩니다.")}</li><li>{uiText("환불 처리 시점에 유효한 포인트만 기존 유형·만료일을 유지해 복원됩니다. 만료된 포인트는 자동 복원되지 않으며, 별도 지급이 필요한 경우 관리자 확인 후 수기로 처리합니다.")}</li></ul>
      </div> : null}
      </div>
      {methodChoices}
        {displayedQuote?.bankRequired ? <fieldset className="refund-application__bank" disabled={!quoteCurrent || locked}><legend>{uiText("환불 계좌정보")}</legend><select required aria-label={uiText("은행명")} value={bank.code} onChange={(event) => {
          const selectedBank = bankOptions.find(([code]) => code === event.target.value)
          setBank(current => ({ ...current, code: selectedBank?.[0] ?? '', name: selectedBank?.[1] ?? '' })); attempt.current = null
        }}><option value="">{uiText("은행명")}</option>{bankOptions.map(([code, name]) => <option key={code} value={code}>{uiText(name)}</option>)}</select><input required aria-label={uiText("계좌번호")} inputMode="numeric" pattern="[0-9 -]{8,40}" placeholder={uiText("계좌번호 숫자만 입력")} value={bank.accountNumber} onChange={(event) => { setBank(current => ({ ...current, accountNumber: event.target.value })); attempt.current = null }}/><input required aria-label={uiText("예금주")} placeholder={uiText("예금주")} value={bank.holder} onChange={(event) => { setBank(current => ({ ...current, holder: event.target.value })); attempt.current = null }}/></fieldset> : null}
        <RefundContactPhone disabled={!quoteCurrent || locked} value={contactPhone} onChange={value => { setPhone(value); attempt.current = null }}/>
        <section className="refund-application__terms"><h3>{uiText("약관동의")}</h3><div className="refund-application__agreement-row"><label className="refund-application__agreement"><Checkbox disabled={!quoteCurrent || locked} checked={agreed} onChange={(event) => { setAgreed(event.target.checked); attempt.current = null }}/><span>{uiText("[필수] 환불 안내 및 정책을 모두 확인했으며, 이에 동의합니다.")}</span></label><RelativeLink to="/terms?section=refund" target="_blank" rel="noopener noreferrer">{uiText("환불 정책을 확인해주세요.")}</RelativeLink></div></section>
      {submit.isError ? <p role="alert">{uiText(ambiguousFailure ? uiText("접수 결과를 확인하지 못했습니다. 같은 요청으로 다시 접수해 중복 여부를 확인해 주세요.") : submit.error instanceof Error ? submit.error.message : uiText("신청을 접수하지 못했습니다."))}</p> : null}
    </form>}
  </div><footer className="refund-application__actions"><button type="button" disabled={locked} onClick={close}>{uiText("취소")}</button>{step === 1 ? <button type="submit" form={formId} disabled={!targetsReady || !selectedCount || !reason || locked}>{uiText("다음")}</button> : <button type="submit" form={formId} disabled={!quoteCurrent || !agreed || submit.isPending}>{submit.isPending ? uiText("접수 중…") : ambiguousFailure ? uiText("같은 요청으로 다시 접수") : uiText("환불 신청하기")}</button>}</footer></section>
  return standalone ? <main className="inquiry-mobile-page inquiry-flow-page">{content}</main> : <DialogLayer asChild backdropClassName="modal-backdrop" isOpen onClose={close} returnFocusRef={returnFocusRef} showTitle={false} title={uiText("중도해지 및 환불 신청")}>{content}</DialogLayer>
}
