import { useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import type { AccountOrderItem, AccountOrderPage, AccountOrderQuery } from '@/api/myAccountOrders'
import { useServices } from '@/app/ServiceProvider'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { MyPageLayout } from '../../MypageComponentsView'
import { AppShell } from '@/components/layout/AppShellView'
import { AccountQueryState } from '../AccountQueryState'
import { InquiryCreateDialog } from '../InquiryCreateDialog'
import { InquiryRefundApplication } from '../InquiryRefundApplication'
import { accountDateRange } from '../shared/AccountDatePresets'
import { AccountInfo, ReadPages, accountDate, accountMoney, accountStatus, useAccountRead } from '../shared/AccountReadCommon'
import { OrderItemActions } from './OrderItemActions'
import { OrderProductDescription } from './OrderProductDescription'
import { OrderRefundSummary } from './OrderRefundSummary'
import { MyPagePeriodDialog } from '../shared/MyPagePeriodDialog'
import windowsCard from '@/assets/figma/cart-product-waiting.png'
import windowsLogo from '@/assets/figma/windows-logo.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import dateRangeIcon from '@/assets/figma/icon-date-range.svg'

const rentalStatusLabels: Record<string, string> = {
  awaiting: '이용 대기',
  using: '이용 중',
  replacement_using: '교체 이용',
  extension_waiting: '연장 대기',
  server_ended: '서버 종료',
  replacement_completed: '교체 완료',
  needs_attention: '종료 처리 확인 필요',
}

const orderTabs = [
  { value: 'all', label: '전체' },
  { value: 'completed', label: '주문완료' },
  { value: 'cancelled_or_refunded', label: '취소/환불완료' },
] as const

const refundStatusLabels: Record<string, string> = {
  requested: '환불 접수',
  approved: '환불 승인',
  processing: '환불 처리 중',
  paid: '환불 완료',
  failed: '환불 실패',
  rejected: '환불 반려',
  cancelled: '환불 철회',
}

const canApplyDirectRefund = (item: AccountOrderItem, paymentStatus: string, orderStatus: string) =>
  Boolean(item.rentalId)
  && !item.purchaseConfirmedAt
  && !item.refundPending
  && paymentStatus === 'approved'
  && ['paid', 'completed'].includes(orderStatus)
  && ['using', 'replacement_using'].includes(item.customerRentalStatus)
  && ['active', 'expiring'].includes(item.rentalStatus ?? '')
  && ['paid', 'active', 'completed'].includes(item.itemStatus)

const rowStatus = (item: AccountOrderItem, order: AccountOrderPage['items'][number]) => {
  const { orderStatus, paymentStatus } = order
  if (item.refundPending) return '환불 접수'
  if (item.itemStatus === 'refunded' || orderStatus === 'refunded' || paymentStatus === 'refunded') return '환불완료'
  if (item.itemStatus === 'cancelled' || orderStatus === 'cancelled' || paymentStatus === 'cancelled') {
    if (order.paymentTerminationReason === 'pg_aborted') return '결제실패'
    if (['pg_expired', 'payment_deadline_expired'].includes(order.paymentTerminationReason ?? '')) return '결제기한 만료'
    return '취소완료'
  }
  if (paymentStatus === 'approved' && ['paid', 'completed'].includes(orderStatus)) return '결제완료'
  if (paymentStatus === 'pending' && ['created', 'payment_pending'].includes(orderStatus)) {
    if (order.paymentMethod === 'virtual_account' && order.paymentRecordStatus === 'pending' && ['issued', 'partially_paid'].includes(order.virtualAccountStatus ?? '')) {
      const dueAt = order.virtualAccountDepositDueAt ? Date.parse(`${order.virtualAccountDepositDueAt}+09:00`) : NaN
      return Number.isFinite(dueAt) && dueAt > Date.now() ? '입금대기' : '입금기한 확인 중'
    }
    return '결제 결과 확인 중'
  }
  return accountStatus(orderStatus)
}

const rentalStatusIcons: Record<string, string> = {
  awaiting: serverWaitingIcon,
  using: serverOnIcon,
  replacement_using: serverOnIcon,
  extension_waiting: serverWaitingIcon,
  server_ended: serverDisabledIcon,
  replacement_completed: serverDisabledIcon,
  needs_attention: serverOffIcon,
}

const displayOrderDate = (value: string | null) => {
  const date = accountDate(value).slice(0, 10)
  return date === '-' ? date : date.replaceAll('-', '.')
}

export function OrdersPageContent({ api }: { api: MyAccountReadServices }) {
  const { myAccount } = useServices()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [initialDates] = useState(() => accountDateRange('month'))
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<readonly string[]>([])
  const [category, setCategory] = useState<AccountOrderQuery['category']>('all')
  const [dates, setDates] = useState(initialDates)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [rentalStatus, setRentalStatus] = useState<AccountOrderQuery['rentalStatus']>()
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const result = useAccountRead(
    ['orders', category ?? 'all', page, rentalStatus ?? '', dates.from, dates.to],
    (signal) => api.orders({
      page,
      size: 20,
      category,
      rentalStatus,
      from: dates.from || undefined,
      to: dates.to || undefined,
    }, signal),
  )

  const orders = result.data?.items ?? []
  const orderDetails = useQueries({
    queries: orders.map((order) => ({
      queryKey: ['my-account', 'read', 'order', order.orderNo],
      queryFn: ({ signal }: { signal: AbortSignal }) => api.order(order.orderNo, signal),
      enabled: order.items.some((item) => item.refundPending
        || ['환불완료', '취소완료', '결제실패', '결제기한 만료'].includes(rowStatus(item, order))),
      retry: false,
    })),
  })
  const orderDetailByNo = new Map(orders.map((order, index) => [order.orderNo, orderDetails[index]]))
  const visibleItems = orders.flatMap((order) =>
    order.items
      .filter((item) => !rentalStatus || item.customerRentalStatus === rentalStatus)
      .map((item) => ({ item, order })),
  )
  const selectableIds = visibleItems
    .map(({ item }) => item.pcAssetId)
    .filter((id): id is string => Boolean(id))
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id))
  const selectedInquiryIds = [...new Set(selected.map(Number).filter(Number.isSafeInteger))].slice(0, 20)
  const selectedRefundRentalIds = visibleItems
    .filter(({ item, order }) => item.pcAssetId
      && selected.includes(item.pcAssetId)
      && canApplyDirectRefund(item, order.paymentStatus, order.orderStatus))
    .map(({ item }) => Number(item.rentalId))
  const visibleGroups = Array.from(visibleItems.reduce((groups, row) => {
    const date = displayOrderDate(row.order.orderedAt)
    groups.set(date, [...(groups.get(date) ?? []), row])
    return groups
  }, new Map<string, typeof visibleItems>()).entries())

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected((current) => checked
      ? [...new Set([...current, id])].slice(0, 20)
      : current.filter((value) => value !== id))
  }

  return (
    <MyPageLayout title="주문내역">
      <div className="orders-catalog-list">
        <nav aria-label="주문 상태" className="mypage-tabs mypage-tabs--buttons">
          {orderTabs.map((tab) => {
            const count = !result.data
              ? '-'
              : tab.value === 'all'
                ? result.data.allCount
                : tab.value === 'completed'
                  ? result.data.completedCount
                  : result.data.cancelledOrRefundedCount
            return (
              <button
                aria-pressed={category === tab.value}
                key={tab.value}
                onClick={() => {
                  setCategory(tab.value)
                  setPage(0)
                  setSelected([])
                }}
                type="button"
              >
                {tab.label} {count}
              </button>
            )
          })}
        </nav>

        <div className="orders-list-toolbar">
          <strong>총 {result.data?.totalElements ?? 0}개 상품</strong>
          <span><label>
            <select
              aria-label="렌탈 상태"
              onChange={(event) => {
                setRentalStatus((event.target.value || undefined) as AccountOrderQuery['rentalStatus'])
                setPage(0)
                setSelected([])
              }}
              value={rentalStatus ?? ''}
            >
              <option value="">렌탈 상태</option>
              {Object.entries(rentalStatusLabels)
                .filter(([value]) => value !== 'needs_attention')
                .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button aria-expanded={periodOpen} onClick={() => setPeriodOpen(true)} type="button">기간 선택　⌄</button></span>
        </div>

        <AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
        {result.data ? (
          <>
            <div className="orders-select-all">
                <label>
                  <input
                    checked={allSelected}
                    onChange={(event) => setSelected(event.target.checked ? selectableIds.slice(0, 20) : [])}
                    type="checkbox"
                  />
                  모두선택
                </label>
                <span>
                  <button disabled={selected.length === 0} onClick={() => setInquiryOpen(true)} type="button">문의</button>
                  {myAccount.inquiryApi ? <InquiryRefundApplication api={myAccount.inquiryApi} initialRentalIds={selectedRefundRentalIds} triggerEnabled={selectedRefundRentalIds.length > 0} triggerLabel="해지신청" /> : null}
                  {selectedRefundRentalIds.length === 0 || !myAccount.inquiryApi ? <button disabled type="button">해지신청</button> : null}
                </span>
              </div>
            {visibleGroups.map(([date, rows]) => <section className="orders-by-date" key={date}>
              <h2>{date}</h2>
              {rows.map(({ item, order }) => {
                const selectedId = item.pcAssetId
                const discountAmount = item.couponDiscountAmount + item.pointUsedAmount
                const finalItemAmount = Math.max(0, item.amount - discountAmount)
                const status = rowStatus(item, order)
                const terminal = ['환불완료', '취소완료', '결제실패', '결제기한 만료'].includes(status)
                const orderDetail = orderDetailByNo.get(order.orderNo)
                return (
                  <article className={`order-catalog-item${terminal ? ' order-catalog-item--compact' : ''}`} key={item.orderItemId}>
                    <header>
                      <label>
                        {selectedId ? (
                          <input
                            aria-label={`${item.productNo} 문의 선택`}
                            checked={selected.includes(selectedId)}
                            disabled={!selected.includes(selectedId) && selected.length >= 20}
                            onChange={(event) => toggleSelected(selectedId, event.target.checked)}
                            type="checkbox"
                          />
                        ) : null}
                        <strong className={/환불|취소/.test(status) ? 'is-red' : ''}>{status}</strong>
                      </label>
                      <span>{order.orderNo}</span>
                      <RelativeLink to={`/mypage/orders/${encodeURIComponent(order.orderNo)}`}>주문상세</RelativeLink>
                    </header>
                    <div className="order-catalog-item__product">
                      <div className="order-catalog-item__image">
                        <img src={item.imageUrl && /^(https?:\/\/|\/[^/])/.test(item.imageUrl) ? item.imageUrl : windowsCard} alt={item.title} />
                        {!item.imageUrl || !/^(https?:\/\/|\/[^/])/.test(item.imageUrl) ? <img src={windowsLogo} alt="" aria-hidden="true" /> : null}
                      </div>
                      <div>
                        <div className="order-catalog-item__heading"><strong><span>품번</span> {item.productNo}</strong><small>{item.serverRoomName ?? '-'}</small>{item.rentalId ? <em className="order-catalog-item__state"><img src={rentalStatusIcons[item.customerRentalStatus] ?? serverOffIcon} alt="" />{rentalStatusLabels[item.customerRentalStatus] ?? accountStatus(item.customerRentalStatus)}</em> : null}</div>
                        <OrderProductDescription item={item} />
                        {item.billingUnit !== 'unit' ? (
                          <span className="order-catalog-item__period"><img src={dateRangeIcon} alt="" />{displayOrderDate(item.serviceStartedAt)}~{displayOrderDate(item.serviceEndsAt)}</span>
                        ) : <span className="order-catalog-item__period">수량 {item.quantity}개</span>}
                        {!terminal ? <p className="order-catalog-item__totals">
                          <span>최종 결제금액 <b>{accountMoney(finalItemAmount)}</b></span>
                          <span><i aria-hidden="true" />할인금액 <b>{accountMoney(discountAmount)}</b></span>
                          <span><i aria-hidden="true" />포인트 적립 <b>{(item.accruedPoints ?? 0).toLocaleString('ko-KR')}점</b></span>
                        </p> : null}
                      </div>
                    </div>
                    <OrderItemActions
                      api={api}
                      item={item}
                      orderNo={order.orderNo}
                      orderDetail={orderDetail}
                      paymentStatus={order.paymentStatus}
                      orderStatus={order.orderStatus}
                    />
                    {terminal && orderDetail
                      ? <OrderRefundSummary result={orderDetail} itemId={item.orderItemId} originalAmount={finalItemAmount} />
                      : null}
                  </article>
                )
              })}
            </section>)}
            {visibleItems.length === 0 ? <section className="orders-by-date"><p className="mypage-empty" role="status">{category === 'all' && !rentalStatus ? '조회된 주문 내역이 없습니다.' : '해당 조건의 주문 내역이 없습니다.'}</p></section> : null}
            <ReadPages page={result.data.page} totalPages={result.data.totalPages} onChange={setPage} />
          </>
        ) : null}
        {inquiryOpen && myAccount.inquiryApi && myAccount.rcpcApi ? (
          <InquiryCreateDialog
            api={myAccount.inquiryApi}
            initialIds={selectedInquiryIds}
            initialProductNo=""
            onClose={() => setInquiryOpen(false)}
            onCreated={async (id) => {
              setInquiryOpen(false)
              setSelected([])
              await client.invalidateQueries({ queryKey: ['operation-requests', myAccount.inquiryApi?.organizationId] })
              navigate(`/mypage/inquiries/${id}`)
            }}
            rcpcApi={myAccount.rcpcApi}
          />
        ) : null}
        {periodOpen ? <MyPagePeriodDialog dates={dates} onApply={nextDates => {
          setDates(nextDates)
          setPage(0)
          setSelected([])
          setPeriodOpen(false)
        }} onClose={() => setPeriodOpen(false)} /> : null}
      </div>
    </MyPageLayout>
  )
}

export function OrderDetailPageContent({ api }: { api: MyAccountReadServices }) {
  const { orderId, id } = useParams()
  const number = orderId ?? id ?? ''
  const result = useAccountRead(['order', number], (signal) => api.order(number, signal))
  const order = result.data
  const payment = order?.payments[0]
  const paymentMethods: Record<string, string> = { card: '카드결제', virtual_account: '가상계좌', payco: '페이코', kakao_pay: '카카오페이', naver_pay: '네이버페이', bank_transfer: '계좌이체', internal_zero: '0원 내부 정산' }
  const paymentRows: readonly (readonly [string, string])[] = order ? [
    ['주문번호', order.orderNo],
    ['주문일시', accountDate(order.orderedAt).slice(0, 19)],
    ['결제방식', payment ? paymentMethods[payment.method] ?? payment.method : '-'],
    ['결제금액', accountMoney(order.finalAmount)],
    ['결제상태', accountStatus(order.paymentStatus)],
    ...(payment?.method === 'virtual_account' ? [
      ['입금은행', payment.bankName ?? '-'],
      ['입금자명', payment.depositorName ?? '-'],
      ['입금계좌', payment.accountMasked ?? '-'],
      ['입금기한', accountDate(payment.depositDueAt).slice(0, 19)],
    ] as const : []),
  ] : []
  return <AppShell className="order-full-shell"><main className="order-full-detail content-container"><h1>주문 상세보기</h1><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>{order && <div className="order-full-detail__body">
    <section className="order-full-products"><h2>주문정보</h2>{order.items.map(item => <article key={item.orderItemId}><header><span className="order-full-product-number"><span>품번</span><b>{item.productNo}</b></span><span className="order-full-product-location">{item.serverRoomName ?? '-'}</span></header><AccountInfo rows={item.billingUnit === 'unit' ? [['상품', item.title], ['수량', `${item.quantity}개`]] : [['PC사양', item.specSummary ?? '기록 없음'], ['이용기간', `${accountDate(item.serviceStartedAt).slice(0, 19)} ~ ${accountDate(item.serviceEndsAt).slice(0, 19)}`]]}/></article>)}</section>
    <section className="order-full-section"><h2>결제정보</h2><AccountInfo rows={paymentRows}/></section>
    {order.refunds.length > 0 ? <section className="order-full-section order-full-section--refund"><h2>환불정보</h2>{order.refunds.map(refund => {
      const refundedItem = order.items.find(item => item.orderItemId === refund.orderItemId)
      const refundProduct = refundedItem ? [refundedItem.productNo, refundedItem.serverRoomName].filter(Boolean).join(' · ') : '주문 전체'
      const pointRefund = refund.method === 'point'
      const refundAmount = pointRefund
        ? refund.approvedPointAmount ?? refund.requestedPointAmount
        : refund.approvedAmount ?? refund.requestedAmount
      return <AccountInfo key={refund.requestId} rows={[
        ['환불상품', refundProduct],
        ['환불신청일자', accountDate(refund.requestedAt).slice(0, 19)],
        ['환불방식', refund.method === 'point' ? '포인트' : refund.method === 'cash' ? '원결제 수단 환불' : refund.method],
        ['예상 환불금액', pointRefund ? `${refundAmount.toLocaleString('ko-KR')}점` : accountMoney(refundAmount)],
        ['환불상태', refundStatusLabels[refund.status] ?? refund.status],
        ['적립금 복원금액', `${(refund.restoredPoints ?? 0).toLocaleString('ko-KR')}점`],
      ]}/>
    })}</section> : null}
    <section className="order-full-section"><h2>주문자 정보</h2><AccountInfo rows={[
      ['이름', order.contact?.name],
      ['메신저ID', [order.contact?.messengerType, order.contact?.messengerId].filter(Boolean).join(' / ') || '-'],
      ['핸드폰', order.contact?.phone || '-'],
      ['E-mail', order.contact?.email],
    ]}/></section>
  </div>}</main></AppShell>
}
