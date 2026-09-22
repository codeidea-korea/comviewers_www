import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import { managerScopedPath } from '../managerPortalPath'
import { useQuery } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import type { OperationRequestQuery } from '@/api/operationRequests'
import { Pagination } from '@/components/ui/PaginationControl'
import { SearchField } from '@/components/ui/SearchFieldControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import mypageSearch from '@/assets/figma/mypage-search.svg'

import { MyPageLayout } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { isAccountReadDenied } from '../accountReadAccess'
import { AccountReadDeniedDialog } from '../modals/AccountReadDeniedDialog'
import { InquiryDialog } from './InquiryDialog'
import { InquiryConversationDialog } from './InquiryConversationDialog'
import { InquiryAction } from './InquiryAction'
import { inquiryTypes, inquiryTypeLabel } from '../InquiryPresentation'

const statuses = [
  { label: '접수', value: '접수' },
  { label: '확인 중', value: '확인 중' },
  { label: '비용처리', value: '비용처리' },
  { label: '처리 중', value: '처리 중' },
  { label: '처리완료', value: '처리 완료' },
] as const

const customerStatusLabel = (value: string) => value === '처리 완료' ? '처리완료' : value

function activityLabel(value: string | null): string {
  if (!value) return '-'
  const elapsed = Date.now() - Date.parse(value)
  if (elapsed < 0 || elapsed >= 7 * 86_400_000) return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  if (elapsed < 60_000) return '방금 전'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}분 전`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}시간 전`
  return `${Math.floor(elapsed / 86_400_000)}일 전`
}

export function InquiryListContent({ api, rcpcApi, detailId, onCloseDetail }: { api: InquiryReadServices; rcpcApi: MyRcpcReadServices; detailId?: number; onCloseDetail?: () => void }) {

  const [params] = useSearchParams()
  const [query, setQuery] = useState<OperationRequestQuery>({ page: 0, size: 20 })
  const [productSearch, setProductSearch] = useState('')
  const initialIds = [...new Set((params.get('pcAssetIds') ?? '').split(',').filter(value => /^[1-9]\d*$/.test(value)).map(Number).filter(Number.isSafeInteger))].slice(0, 20)
  const initialProductNo = (params.get('productNo') ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16)
  const [createOpen, setCreateOpen] = useState(initialIds.length > 0 || !!initialProductNo)
  const rows = useQuery({ queryKey: ['operation-requests', api.organizationId, query], queryFn: ({ signal }) => api.list(query, signal) })
  const accessDenied = isAccountReadDenied(rows.error)
  const data = accessDenied ? { items: [], page: 0, size: 20, total: 0 } : rows.data
  return <MyPageLayout title="문의 관리"><section className="inquiry-catalog">
    {!accessDenied && !rows.isPending && detailId && onCloseDetail ? <InquiryConversationDialog key={`${api.organizationId}:${detailId}`} api={api} id={detailId} onClose={onCloseDetail}/> : null}
    {!accessDenied && !rows.isPending && createOpen && <InquiryDialog api={api} rcpcApi={rcpcApi} initialIds={initialIds} initialProductNo={initialProductNo} onClose={() => setCreateOpen(false)}/>}
    <div className="inquiry-catalog__filters">
      <label><span className="sr-only">문의 유형</span><NativeSelect disabled={accessDenied} value={query.requestType ?? ''} onChange={event => setQuery(current => ({ ...current, page: 0, requestType: (event.target.value || undefined) as OperationRequestQuery['requestType'] }))}><option value="">전체 문의 유형</option>{Object.entries(inquiryTypes).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></label>
      <label><span className="sr-only">처리 상태</span><NativeSelect disabled={accessDenied} value={query.customerVisibleStatus ?? ''} onChange={event => setQuery(current => ({ ...current, page: 0, customerVisibleStatus: (event.target.value || undefined) as OperationRequestQuery['customerVisibleStatus'] }))}><option value="">전체 처리 상태</option>{statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</NativeSelect></label>
      <form className="inquiry-catalog__search-form" onSubmit={event => { event.preventDefault(); if (accessDenied) return; setQuery(current => ({ ...current, page: 0, productNo: productSearch.trim() || undefined })) }}><SearchField disabled={accessDenied} className="inquiry-catalog__search" icon={mypageSearch} iconClassName="inquiry-catalog__search-icon" label="품번 검색" maxLength={16} placeholder="품번을 입력해 주세요." value={productSearch} onChange={event => setProductSearch(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16))}/><button className="sr-only" disabled={accessDenied} type="submit">검색</button></form>
      <button className="inquiry-catalog__create" disabled={accessDenied || rows.isPending} type="button" onClick={() => setCreateOpen(true)}>문의 접수</button>
    </div>
    {!accessDenied ? <AccountQueryState pending={rows.isPending} error={rows.error} retry={rows.refetch}/> : null}
    {data ? <><div aria-label="문의 목록" className="inquiry-catalog__table" role="table"><div className="inquiry-catalog__head" role="row"><span role="columnheader">문의 유형</span><span role="columnheader">대상 RCPC</span><span role="columnheader">최근 메시지</span><span role="columnheader">최근 활동</span><span role="columnheader">문의 상태</span><span role="columnheader">등록일</span></div>{data.items.map(item => <div className="inquiry-catalog__row" key={item.operationRequestId} role="row">
      <span role="cell"><InquiryAction appearance="text" className="inquiry-catalog__row-link" requestId={item.operationRequestId}>{inquiryTypeLabel(item.requestType)}<span className="sr-only"> 문의 상세 보기</span></InquiryAction></span><span role="cell">{item.targetProductNos || '선택안함'}</span><span role="cell"><small>{item.lastMessage ? '최근 메시지' : ''}</small><small>{item.lastMessage ?? '등록된 메시지가 없습니다.'}</small></span><span role="cell">{activityLabel(item.lastActivityAt)}</span><span role="cell">{customerStatusLabel(item.customerVisibleStatus)}</span><span role="cell">{new Date(item.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
    </div>)}{!data.items.length ? <p className="mypage-empty">{query.requestType || query.customerVisibleStatus || query.productNo ? '검색 조건에 해당하는 문의가 없습니다.' : '등록된 문의 내역이 없습니다.'}</p> : null}</div><div aria-label="모바일 문의 목록" className="mobile-inquiry-list">{data.items.map(item => <article className="mobile-inquiry-card" key={item.operationRequestId}>
      <h2><InquiryAction appearance="text" requestId={item.operationRequestId}>{inquiryTypeLabel(item.requestType)}</InquiryAction></h2>
      <dl>
        <div><dt>대상 RCPC</dt><dd>{item.targetProductNos || '선택안함'}</dd></div>
        <div><dt>최근 메시지</dt><dd>{item.lastMessage ?? '등록된 메시지가 없습니다.'}</dd></div>
        <div><dt>최근 활동</dt><dd>{activityLabel(item.lastActivityAt)}</dd></div>
        <div><dt>문의 상태</dt><dd>{customerStatusLabel(item.customerVisibleStatus)}</dd></div>
        <div><dt>등록일</dt><dd>{new Date(item.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</dd></div>
      </dl>
    </article>)}{!data.items.length ? <p className="mypage-empty">{query.requestType || query.customerVisibleStatus || query.productNo ? '검색 조건에 해당하는 문의가 없습니다.' : '등록된 문의 내역이 없습니다.'}</p> : null}</div>{Math.ceil(data.total / data.size) > 1 ? <Pagination currentPage={data.page + 1} totalPages={Math.ceil(data.total / data.size)} onPageChange={page => setQuery(previous => ({ ...previous, page: page - 1 }))}/> : null}</> : null}
    {accessDenied ? <AccountReadDeniedDialog key={api.organizationId} resource="문의"/> : null}
  </section></MyPageLayout>
}
export function InquiryDetailContent({ api, rcpcApi }: { api: InquiryReadServices; rcpcApi: MyRcpcReadServices }) {
  const { inquiryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const id = Number(inquiryId)
  const valid = /^[1-9]\d*$/.test(inquiryId ?? '') && Number.isSafeInteger(id)
  if (!valid) return <MyPageLayout title="문의 상세"><p>올바른 문의 주소가 아닙니다.</p></MyPageLayout>
  return <InquiryListContent api={api} rcpcApi={rcpcApi} detailId={id} onCloseDetail={() => { void navigate(managerScopedPath('/mypage/inquiries', location.pathname)) }}/>
}
