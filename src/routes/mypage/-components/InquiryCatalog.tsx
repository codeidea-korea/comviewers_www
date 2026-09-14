import { useState, type ReactNode } from 'react'
import mypageSearch from '../../../assets/figma/mypage-search.svg'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import { Pagination } from '../../../components/ui/PaginationControl'
import { SearchField } from '../../../components/ui/SearchFieldControl'
import { NativeSelect } from '../../../components/ui/SelectControl'
import { inquiryStatusOptions,inquiryTypeOptions } from '../../../mocks/selectOptions'
import { MyPageLayout,withManagerPreview } from '../MypageComponentsView'
import { AccountQueryState } from './AccountQueryState'
import { useMyAccount } from './hooks/useMyAccount'

export function InquiryCatalogBase({ compact = false, manager = false, children }: { compact?: boolean; manager?: boolean; children?: ReactNode }) {
  const account = useMyAccount()
  const inquiryRows = (account.data?.inquiries ?? []).map((item) => ({ ...item, rcpc: item.rcpcIds.join(', '), message: item.title + '\n' + item.content, recent: item.createdAt }))
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const sourceRows = compact ? inquiryRows.slice(0, 2) : inquiryRows
  const normalizedSearch = search.trim().toLowerCase()
  const matches = sourceRows.filter((row) => (
    (!typeFilter || row.type === typeFilter)
    && (!statusFilter || row.status.replace(/\s/g, '') === statusFilter.replace(/\s/g, ''))
    && (!normalizedSearch || `${row.type} ${row.rcpc} ${row.message}`.toLowerCase().includes(normalizedSearch))
  ))
  const totalPages = Math.max(1, Math.ceil(matches.length / 10))
  const page = Math.min(currentPage, totalPages)
  const rows = matches.slice((page - 1) * 10, page * 10)
  return (
    <MyPageLayout title="문의 관리">
      <AccountQueryState pending={account.isPending} error={account.error} retry={account.refetch}/><section className={`inquiry-catalog${compact ? ' inquiry-catalog--compact' : ''}`}>
        <div className="inquiry-catalog__filters">
          <label><span className="sr-only">문의 유형</span><NativeSelect onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="">전체 문의 유형</option>{inquiryTypeOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect></label>
          <label><span className="sr-only">처리 상태</span><NativeSelect onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="">전체 처리 상태</option>{inquiryStatusOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect></label>
          <SearchField className="inquiry-catalog__search" icon={mypageSearch} iconClassName="inquiry-catalog__search-icon" label="문의 검색" onChange={(event) => setSearch(event.target.value)} placeholder="문의 제목 또는 품번을 입력해 주세요." value={search} />
          <Link state={{ inquiryState: 'select-product', publishingPopup: 'inquiry-create' }} to={withManagerPreview('/mypage/inquiries', manager)}>문의 접수</Link>
        </div>
        <div aria-label="문의 목록" className="inquiry-catalog__table" role="table">
          <div className="inquiry-catalog__head" role="row"><span role="columnheader">문의 유형</span><span role="columnheader">대상 RCPC</span><span role="columnheader">최근 메시지</span><span role="columnheader">최근 활동</span><span role="columnheader">문의 상태</span><span role="columnheader">등록일</span></div>
          {rows.map((row) => (
            <div className="inquiry-catalog__row" key={row.id} role="row">
              <span role="cell"><Link className="inquiry-catalog__row-link" to={withManagerPreview(`/mypage/inquiries/${row.inquiryId}`, manager)}>{row.type}<span className="sr-only"> 문의 상세 보기</span></Link></span>
              <span role="cell">{row.rcpc}</span><span role="cell">{row.message.split('\n').map((line) => <small key={line}>{line}</small>)}</span><span role="cell">{row.recent}</span><span role="cell">{row.status}</span><span role="cell">{row.createdAt}</span>
            </div>
          ))}
        </div>
        <Pagination currentPage={page} onPageChange={setCurrentPage} totalPages={totalPages} />
      </section>
      {children}
    </MyPageLayout>
  )
}
