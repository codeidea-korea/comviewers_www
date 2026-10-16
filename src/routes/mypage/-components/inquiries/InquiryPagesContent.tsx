import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import { managerScopedPath } from '../managerPortalPath'
import { useQuery } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import type { OperationRequestQuery } from '@/api/operationRequests'
import { Pagination } from '@/components/ui/PaginationControl'
import { SearchField } from '@/components/ui/SearchFieldControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import { RcpcFilterSelect } from '../RcpcFilterSelect'
import { accountKstDate } from '@/lib/accountFormat'
import mypageSearch from '@/assets/figma/mypage-search.svg'

import { MobileBottomSheet, MyPageLayout } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { isAccountReadDenied } from '../accountReadAccess'
import { AccountReadDeniedDialog } from '../modals/AccountReadDeniedDialog'
import { InquiryDialog } from './InquiryDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'
import { InquiryAction } from './InquiryAction'
import { useMobileInquiryViewport } from './inquiryViewport'
import { inquiryTypes, inquiryTypeLabel } from '../InquiryPresentation'
import './inquiry-list-qa.css'

const statuses = [
  { label: '접수', value: '접수' },
  { label: '확인 중', value: '확인 중' },
  { label: '비용처리', value: '비용처리' },
  { label: '처리 중', value: '처리 중' },
  { label: '처리완료', value: '처리 완료' },
] as const

const customerStatusLabel = (value: string) => value === '처리 완료' ? '처리완료' : value

const registrationDate = (value: string) => accountKstDate(value).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$1.$2.$3')

const messageAuthorLabel = (value: string | null | undefined) => {
  if (value === 'customer') return '내 답변'
  if (value === 'server_room') return '서버실 답변'
  if (value === 'headquarters') return '본사 답변'
  return '최근 메시지'
}

function activityLabel(value: string | null, locale: string, t: ReturnType<typeof useUiTranslation>['t'], uiText: ReturnType<typeof useUiTranslation>['uiText']): string {
  if (!value) return '-'
  const elapsed = Date.now() - Date.parse(value)
  if (elapsed < 0 || elapsed >= 7 * 86_400_000) return new Date(value).toLocaleString(locale, { timeZone: 'Asia/Seoul' })
  if (elapsed < 60_000) return uiText("방금 전")
  if (elapsed < 3_600_000) return t("mypageSupport.minutesAgo", { count: Math.floor(elapsed / 60_000) })
  if (elapsed < 86_400_000) return t("mypageSupport.hoursAgo", { count: Math.floor(elapsed / 3_600_000) })
  return t("mypageSupport.daysAgo", { count: Math.floor(elapsed / 86_400_000) })
}

export function InquiryListContent({ api, rcpcApi, detailId, onCloseDetail }: { api: InquiryReadServices; rcpcApi: MyRcpcReadServices; detailId?: number; onCloseDetail?: () => void }) {
  const { uiText, t, locale } = useUiTranslation()

  const [params] = useSearchParams()
  const initialProductNo = (params.get('productNo') ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16)
  const [query, setQuery] = useState<OperationRequestQuery>({ page: 0, size: 20, productNo: initialProductNo || undefined })
  const [productSearch, setProductSearch] = useState(initialProductNo)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobile = useMobileInquiryViewport()
  const FilterSelect = mobile ? RcpcFilterSelect : NativeSelect
  const initialIds = [...new Set((params.get('pcAssetIds') ?? '').split(',').filter(value => /^[1-9]\d*$/.test(value)).map(Number).filter(Number.isSafeInteger))].slice(0, 20)
  const createProductNo = params.get('compose') === '1' ? initialProductNo : ''
  const [createOpen, setCreateOpen] = useState(initialIds.length > 0 || params.get('compose') === '1')
  useEffect(() => {
    setProductSearch(initialProductNo)
    setQuery(current => ({ ...current, page: 0, productNo: initialProductNo || undefined }))
    setCreateOpen(initialIds.length > 0 || params.get('compose') === '1')
  }, [initialProductNo, params])
  const [canRetainRows, setCanRetainRows] = useState(true)
  const rows = useQuery({
    queryKey: ['operation-requests', api.organizationId, query],
    queryFn: ({ signal }) => api.list(query, signal),
    meta: { inquiryListScope: api },
    placeholderData: (previous, previousQuery) => canRetainRows && previousQuery?.state.status === 'success'
      && previousQuery.meta?.inquiryListScope === api
      && previousQuery.queryKey[0] === 'operation-requests'
      && previousQuery.queryKey[1] === api.organizationId
      && typeof previousQuery.queryKey[2] === 'object' ? previous : undefined,
  })
  // A forbidden/error read without data must break the observer's carryover chain.
  if (rows.isError && canRetainRows) setCanRetainRows(false)
  if (rows.isSuccess && !rows.isPlaceholderData && !canRetainRows) setCanRetainRows(true)
  const accessDenied = isAccountReadDenied(rows.error)
  const waitingForRows = rows.isPending || rows.isPlaceholderData
  const data = accessDenied ? { items: [], page: 0, size: 20, total: 0 } : rows.data
  const search = () => {
    if (accessDenied) return
    setQuery(current => ({ ...current, page: 0, productNo: productSearch.trim() || undefined }))
    setMobileSearchOpen(false)
  }
  return <MyPageLayout title={uiText("문의 관리")}><section className="inquiry-catalog">
    {!accessDenied && !waitingForRows && detailId && onCloseDetail ? <InquiryConversationDialog key={`${api.organizationId}:${detailId}`} api={api} id={detailId} onClose={onCloseDetail}/> : null}
    {!accessDenied && !waitingForRows && createOpen && <InquiryDialog api={api} rcpcApi={rcpcApi} initialIds={initialIds} initialProductNo={createProductNo} onClose={() => setCreateOpen(false)}/>}
    <div className="inquiry-catalog__filters">
      <button aria-expanded={mobileSearchOpen} aria-label={uiText("품번 검색 열기")} className="inquiry-catalog__search-toggle" disabled={accessDenied} onClick={() => setMobileSearchOpen(open => !open)} type="button"><img alt="" src={mypageSearch}/></button>
      <label><span className="sr-only">{uiText("문의 유형")}</span><FilterSelect disabled={accessDenied} value={query.requestType ?? ''} onChange={event => setQuery(current => ({ ...current, page: 0, requestType: (event.target.value || undefined) as OperationRequestQuery['requestType'] }))}><option value="">{uiText("전체 문의 유형")}</option>{Object.entries(inquiryTypes).map(([code, label]) => <option key={code} value={code}>{uiText(label)}</option>)}</FilterSelect></label>
      <label><span className="sr-only">{uiText("처리 상태")}</span><FilterSelect disabled={accessDenied} value={query.customerVisibleStatus ?? ''} onChange={event => setQuery(current => ({ ...current, page: 0, customerVisibleStatus: (event.target.value || undefined) as OperationRequestQuery['customerVisibleStatus'] }))}><option value="">{uiText("전체 처리 상태")}</option>{statuses.map(status => <option key={status.value} value={status.value}>{uiText(status.label)}</option>)}</FilterSelect></label>
      <form className="inquiry-catalog__search-form" onSubmit={event => { event.preventDefault(); search() }}><SearchField disabled={accessDenied} className="inquiry-catalog__search" icon={mypageSearch} iconClassName="inquiry-catalog__search-icon" label={uiText("품번 검색")} maxLength={16} placeholder={uiText("품번을 입력해 주세요.")} value={productSearch} onChange={event => setProductSearch(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16))}/><button className="sr-only" disabled={accessDenied} type="submit">{uiText("검색")}</button></form>
      <button className="inquiry-catalog__create" disabled={accessDenied || waitingForRows} type="button" onClick={() => setCreateOpen(true)}>{uiText("문의 접수")}</button>
    </div>
    <MobileBottomSheet id="inquiry-product-search" label={uiText("검색")} onClose={() => setMobileSearchOpen(false)} open={mobile && mobileSearchOpen && !accessDenied}>
      <form onSubmit={event => { event.preventDefault(); search() }}><SearchField autoFocus className="mypage-mobile-search" controlClassName="mypage-mobile-search__control" label={uiText("품번 검색")} maxLength={16} placeholder={uiText("품번 검색")} value={productSearch} onChange={event => setProductSearch(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16))}/><button className="mypage-mobile-search__submit" type="submit">{uiText("조회")}</button></form>
    </MobileBottomSheet>
    {query.productNo ? <div className="inquiry-catalog__mobile-search-tag"><span>{uiText("품번:")} {query.productNo}</span><button aria-label={uiText("품번 검색 조건 해제")} disabled={accessDenied} onClick={() => { setProductSearch(''); setQuery(current => ({ ...current, page: 0, productNo: undefined })) }} type="button">×</button></div> : null}
    {!accessDenied ? <AccountQueryState pending={rows.isPending} error={rows.error} retry={rows.refetch}/> : null}
    {data ? <><div aria-busy={rows.isPlaceholderData} aria-label={uiText("문의 목록")} className="inquiry-catalog__table" inert={rows.isPlaceholderData} role="table"><div className="inquiry-catalog__head" role="row"><span role="columnheader">{uiText("문의 유형")}</span><span role="columnheader">{uiText("대상 RCPC")}</span><span role="columnheader">{uiText("최근 메시지")}</span><span role="columnheader">{uiText("최근 활동")}</span><span role="columnheader">{uiText("문의 상태")}</span><span role="columnheader">{uiText("등록일")}</span><span role="columnheader">{uiText("보기")}</span></div>{data.items.map(item => <div className="inquiry-catalog__row" key={item.operationRequestId} role="row">
      <span role="cell">{uiText(inquiryTypeLabel(item.requestType))}</span><span role="cell">{item.targetProductNos || uiText("선택안함")}</span><span role="cell"><small>{item.lastMessage ? uiText(messageAuthorLabel(item.lastMessageAuthorType)) : ''}</small><small>{item.lastMessage ?? uiText("등록된 메시지가 없습니다.")}</small></span><span role="cell">{activityLabel(item.lastActivityAt, locale, t, uiText)}</span><span role="cell">{uiText(customerStatusLabel(item.customerVisibleStatus))}</span><span role="cell">{registrationDate(item.createdAt)}</span><span role="cell"><InquiryAction requestId={item.operationRequestId}>{uiText("보기")}</InquiryAction></span>
    </div>)}{!data.items.length ? <p className="mypage-empty">{query.requestType || query.customerVisibleStatus || query.productNo ? uiText("검색 조건에 해당하는 문의가 없습니다.") : uiText("등록된 문의 내역이 없습니다.")}</p> : null}</div><div aria-busy={rows.isPlaceholderData} aria-label={uiText("모바일 문의 목록")} className="mobile-inquiry-list" inert={rows.isPlaceholderData}>{data.items.map(item => <article className="mobile-inquiry-card" key={item.operationRequestId}>
      <h2>{uiText(inquiryTypeLabel(item.requestType))}</h2>
      <dl>
        <div><dt>{uiText("대상 RCPC")}</dt><dd>{item.targetProductNos || uiText("선택안함")}</dd></div>
        <div><dt>{item.lastMessage ? uiText(messageAuthorLabel(item.lastMessageAuthorType)) : uiText("최근 메시지")}</dt><dd>{item.lastMessage ?? uiText("등록된 메시지가 없습니다.")}</dd></div>
        <div><dt>{uiText("최근 활동")}</dt><dd>{activityLabel(item.lastActivityAt, locale, t, uiText)}</dd></div>
        <div><dt>{uiText("문의 상태")}</dt><dd>{uiText(customerStatusLabel(item.customerVisibleStatus))}</dd></div>
        <div><dt>{uiText("등록일")}</dt><dd>{registrationDate(item.createdAt)}</dd></div>
      </dl><InquiryAction requestId={item.operationRequestId}>{uiText("보기")}</InquiryAction>
    </article>)}{!data.items.length ? <p className="mypage-empty">{query.requestType || query.customerVisibleStatus || query.productNo ? uiText("검색 조건에 해당하는 문의가 없습니다.") : uiText("등록된 문의 내역이 없습니다.")}</p> : null}</div>{Math.ceil(data.total / data.size) > 1 ? <Pagination currentPage={(rows.isPlaceholderData ? query.page ?? 0 : data.page) + 1} totalPages={Math.ceil(data.total / data.size)} onPageChange={page => setQuery(previous => ({ ...previous, page: page - 1 }))}/> : null}</> : null}
    {accessDenied ? <AccountReadDeniedDialog key={api.organizationId} resource={uiText("문의")}/> : null}
  </section></MyPageLayout>
}
export function InquiryDetailContent({ api, rcpcApi }: { api: InquiryReadServices; rcpcApi: MyRcpcReadServices }) {
  const { uiText } = useUiTranslation()
  const { inquiryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const mobile = useMobileInquiryViewport()
  const id = Number(inquiryId)
  const valid = /^[1-9]\d*$/.test(inquiryId ?? '') && Number.isSafeInteger(id)
  if (!valid) return <MyPageLayout title={uiText("문의 상세")}><p>{uiText("올바른 문의 주소가 아닙니다.")}</p></MyPageLayout>
  if (mobile) return <main className="inquiry-mobile-page"><InquiryConversationDialog api={api} id={id} standalone onClose={() => { void navigate(managerScopedPath('/mypage/inquiries', location.pathname)) }}/></main>
  return <InquiryListContent api={api} rcpcApi={rcpcApi} detailId={id} onCloseDetail={() => { void navigate(managerScopedPath('/mypage/inquiries', location.pathname)) }}/>
}
