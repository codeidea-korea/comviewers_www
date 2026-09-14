import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Modal } from '@/components/ui/ModalControl'
import { Pagination } from '@/components/ui/PaginationControl'
import { AccountQueryState } from './AccountQueryState'
import { inquiryTypeLabel } from './InquiryPresentation'

export function InquiryProductConversations({ api, productNo, requestId, onClose }: { api: InquiryReadServices; productNo: string; requestId: number; onClose: () => void }) {
  const [page, setPage] = useState(0)
  const result = useQuery({ queryKey: ['operation-requests', api.organizationId, 'product-conversations', productNo, page],
    queryFn: ({ signal }) => api.list({ productNo, exactProductNo: true, openOnly: true, page, size: 20 }, signal) })
  return <Modal isOpen title={`${productNo} · 진행 중인 문의`} onClose={onClose}>
    <AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>
    {result.data?.items.map(item => <article key={item.operationRequestId}><Link onClick={onClose} to={`/mypage/inquiries/${item.operationRequestId}`}>{item.title || item.requestNo}</Link>
      <p>{inquiryTypeLabel(item.requestType)} · {item.customerVisibleStatus}{item.operationRequestId === requestId ? ' · 현재 문의' : ''}</p><p>{item.lastMessage ?? '등록된 메시지가 없습니다.'}</p></article>)}
    {result.data && !result.data.total && <p>진행 중인 문의가 없습니다.</p>}
    {result.data && Math.ceil(result.data.total / result.data.size) > 1 ? <Pagination currentPage={result.data.page + 1} totalPages={Math.ceil(result.data.total / result.data.size)} onPageChange={value => setPage(value - 1)}/> : null}
  </Modal>
}
