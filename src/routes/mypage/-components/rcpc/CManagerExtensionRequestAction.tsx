import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { MyRcpcItem } from '@/api/myRcpc'
import { Button } from '@/components/ui/ButtonControl'
import { Modal } from '@/components/ui/ModalControl'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'

const billingUnitLabel: Readonly<Record<string, string>> = {
  hour: '시간',
  day: '일',
  thirty_day: '30일 단위',
}

const statusLabel: Readonly<Record<string, string>> = {
  requested: '요청됨',
  quoted: '견적 완료',
  payment_pending: '결제 대기',
  paid: '결제 완료',
  applying: '반영 중',
  applied: '반영 완료',
  failed: '처리 실패',
  cancelled: '취소',
}

const dateTime = (value: string | null) => value ? value.replace('T', ' ').slice(0, 16) : '-'

export function CManagerExtensionRequestAction({ api, item }: { api: MyRcpcReadServices; item: MyRcpcItem }) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState('1')
  const parsedUnits = Number(units)
  const validUnits = Number.isInteger(parsedUnits) && parsedUnits >= 1 && parsedUnits <= 10000
  const quote = useQuery({
    queryKey: ['c-manager-extension-quote', api.organizationId, item.rentalId, parsedUnits],
    enabled: open && validUnits,
    queryFn: () => api.extensionQuote(item.rentalId, parsedUnits),
    retry: false,
  })
  const history = useQuery({
    queryKey: ['c-manager-extension-history', api.organizationId, item.rentalId],
    enabled: open,
    queryFn: ({ signal }) => api.extensionRequests(item.rentalId, signal),
    retry: false,
  })
  const request = useMutation({
    mutationFn: () => api.requestExtension(item.rentalId, parsedUnits),
    onSuccess: () => void history.refetch(),
  })
  const current = quote.data

  return <>
    <Button size="small" onClick={() => setOpen(true)}>기간연장 요청</Button>
    <Modal
      closeLabel="닫기"
      confirmDisabled={!validUnits || !current || quote.isFetching || request.isPending}
      confirmLabel={request.isPending ? '요청 중…' : '연장 요청'}
      isOpen={open}
      onClose={() => { if (!request.isPending) setOpen(false) }}
      onConfirm={() => request.mutate()}
      title="기간연장 요청"
    >
      <p>배정된 RCPC의 기간연장 견적을 확인한 뒤 관리자에게 요청합니다. 결제와 최종 반영은 관리자 처리 대상입니다.</p>
      <label>추가 단위
        <input min={1} max={10000} step={1} type="number" value={units} onChange={event => { setUnits(event.target.value); request.reset() }}/>
      </label>
      {quote.isFetching ? <p role="status">연장 견적을 확인하고 있습니다.</p> : null}
      {quote.error ? <p role="alert">{quote.error.message}</p> : null}
      {current ? <dl>
        <dt>계산 단위</dt><dd>{billingUnitLabel[current.billingUnit] ?? current.billingUnit}</dd>
        <dt>현재 만료일</dt><dd>{dateTime(current.previousServiceEndsAt)}</dd>
        <dt>연장 만료일</dt><dd>{dateTime(current.quotedServiceEndsAt)}</dd>
        <dt>예정 금액</dt><dd>{current.quotedAmount.toLocaleString('ko-KR')}원</dd>
      </dl> : null}
      {request.data ? <p role="status">{request.data.requestNo} 요청이 접수되었습니다.</p> : null}
      {request.error ? <p role="alert">{request.error.message}</p> : null}
      <h3>기간연장 요청 내역</h3>
      {history.isPending ? <p role="status">요청 내역을 불러오고 있습니다.</p> : null}
      {history.error ? <p role="alert">{history.error.message}</p> : null}
      {history.data?.items.length ? <table>
        <thead><tr><th>요청번호</th><th>요청일</th><th>연장 만료일</th><th>예정 금액</th><th>상태</th></tr></thead>
        <tbody>{history.data.items.map(row => <tr key={row.extensionRequestId}>
          <td>{row.requestNo}</td><td>{dateTime(row.requestedAt)}</td><td>{dateTime(row.quotedServiceEndsAt)}</td>
          <td>{row.quotedAmount.toLocaleString('ko-KR')}원</td><td>{statusLabel[row.status] ?? row.status}</td>
        </tr>)}</tbody>
      </table> : history.data ? <p>기간연장 요청 내역이 없습니다.</p> : null}
    </Modal>
  </>
}
