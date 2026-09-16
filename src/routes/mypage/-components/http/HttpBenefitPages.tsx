import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PointEntryType } from '@/api/myAccount'
import { useServices } from '@/app/ServiceProvider'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { BenefitTable } from '../../BenefitTableView'
import { MyPageLayout, PeriodFilter } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { accountDateRange } from './AccountDatePresets'
import { ReadPages, accountDate, accountMoney, useAccountRead } from './AccountReadCommon'
import { HttpOrderItemActions } from './HttpOrderItemActions'
import { pendingOrders } from './pendingConfirmationOrders'
import pointOrderProduct from '@/assets/figma/window-bg-rendered-1.png'
import carouselNextIcon from '@/assets/figma/pagination-chevron-right.svg'
import periodChevronIcon from '@/assets/figma/selector-chevron-down.svg'
import subtleChevronIcon from '@/assets/figma/scrap-chevron-right.svg'

function couponExpiry(item: { expiresAt: string | null; endsAt: string | null }) {
  const values = [item.expiresAt, item.endsAt].filter((value): value is string => value !== null)
  return values.length
    ? accountDate(values.reduce((earliest, value) => value < earliest ? value : earliest)).slice(0, 10)
    : '기한 없음'
}

function couponBenefit(item: { discountType: string; discountValue: number }) {
  if (item.discountType === 'percentage') return `${item.discountValue}% 할인`
  if (item.discountType === 'fixed_amount') return `${accountMoney(item.discountValue)} 할인`
  return `${item.discountType} ${item.discountValue}`
}

const pointReasonLabels: Readonly<Record<string, string>> = {
  purchase_confirmation: '구매확정 적립',
  qa_usage: '포인트 사용',
  order_payment: '주문 결제 사용',
  refund_restore: '환불 포인트 복원',
  expiration: '포인트 소멸',
  signup: '회원가입 적립',
  admin_adjustment: '포인트 조정',
}

function pointReasonLabel(reason: string | null, amount: number) {
  if (!reason) return amount >= 0 ? '포인트 적립' : '포인트 사용'
  if (pointReasonLabels[reason]) return pointReasonLabels[reason]
  return /^[a-z0-9_]+$/i.test(reason) ? (amount >= 0 ? '포인트 적립' : '포인트 사용') : reason
}

export function PointsPageContent({ api }: { api: MyAccountReadServices }) {
  const [page, setPage] = useState(0)
  const [carouselPage, setCarouselPage] = useState(0)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [entryType, setEntryType] = useState<PointEntryType>('all')
  const [dates, setDates] = useState(() => accountDateRange('month'))
  const result = useAccountRead(
    ['points', page, entryType, dates.from, dates.to],
    (signal) => api.points({
      page,
      size: 20,
      entryType,
      from: dates.from || undefined,
      to: dates.to || undefined,
    }, signal),
  )
  const recent = useAccountRead(
    ['orders', 'purchase-confirmation-candidates'],
    (signal) => pendingOrders(api, signal),
  )
  const candidates = recent.data?.flatMap((order) =>
    order.items.map((item) => ({ order, item })),
  ) ?? []

  return (
    <MyPageLayout title="포인트">
      <div className="points-catalog">
        <AccountQueryState pending={recent.isPending} error={recent.error} retry={recent.refetch} />
        {candidates.length > 0 ? (
          <section className="point-carousel">
            <header>
              <strong>구매확정이 필요한 주문 <b>{candidates.length}</b></strong>
              <RelativeLink to="/mypage/orders">주문내역 보기</RelativeLink>
            </header>
            <div className="point-carousel__viewport"><div className="point-carousel__track" style={{ transform: `translateX(-${carouselPage * 440}px)` }}>
              {candidates.map(({ item, order }) => <article key={item.orderItemId}>
                <div>
                  <img alt={item.title} src={item.imageUrl && /^(https?:\/\/|\/[^/])/.test(item.imageUrl) ? item.imageUrl : pointOrderProduct} />
                  <span><strong>{item.productNo}</strong><small>주문번호 {order.orderNo}</small></span>
                </div>
                <HttpOrderItemActions api={api} item={item} orderStatus={order.orderStatus} paymentStatus={order.paymentStatus} variant="purchase-summary" />
              </article>)}
            </div></div>
            {candidates.length > 2 ? <button aria-label="다음 주문 보기" className="point-carousel__next" onClick={() => setCarouselPage((current) => (current + 1) % (candidates.length - 1))} type="button"><img alt="" src={carouselNextIcon} /></button> : null}
          </section>
        ) : null}

        <section className="points-history">
          <nav aria-label="포인트 내역 구분" className="mypage-tabs mypage-tabs--buttons">
            {([
              { value: 'all', label: '전체' },
              { value: 'earned', label: '적립 내역' },
              { value: 'used', label: '사용 내역' },
            ] as const).map((item) => (
              <button
                aria-pressed={entryType === item.value}
                key={item.value}
                onClick={() => {
                  setEntryType(item.value)
                  setPage(0)
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="points-history__toolbar">
            <span>사용 가능 포인트 <strong>{result.data?.balance.toLocaleString('ko-KR') ?? 0}</strong>점</span>
            <button aria-expanded={periodOpen} onClick={() => setPeriodOpen((current) => !current)} type="button">기간 선택<img alt="" src={periodChevronIcon} /></button>
          </div>
          <div hidden={!periodOpen}><PeriodFilter open={periodOpen} onApply={(from, to) => {
            setDates({ from, to })
            setPage(0)
          }} /></div>
          <AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
          {result.data ? (
            <>
              <BenefitTable
                ariaLabel="포인트 내역"
                headers={[
                  { label: '일자', sortable: true },
                  { label: '내용', sortable: true },
                  { label: '구분', sortable: true },
                  { label: '포인트', sortable: true },
                ]}
                rows={result.data.items.map((item) => [
                  accountDate(item.occurredAt).slice(0, 10),
                  pointReasonLabel(item.reason, item.amount),
                  item.amount >= 0 ? '적립' : '사용',
                  `${item.amount > 0 ? '+' : ''}${item.amount.toLocaleString('ko-KR')}P`,
                ])}
              />
              {result.data.items.length === 0 ? (
                <p className="mypage-empty">
                  {entryType === 'all'
                    ? '포인트 내역이 없습니다.'
                    : entryType === 'earned'
                      ? '조회된 포인트 적립 내역이 없습니다.'
                      : '조회된 포인트 사용 내역이 없습니다.'}
                </p>
              ) : null}
              <ReadPages page={result.data.page} totalPages={result.data.totalPages} onChange={setPage} />
            </>
          ) : null}
          <RelativeLink className="points-policy" to="/terms?section=point">포인트·쿠폰 정책 〉</RelativeLink>
        </section>
      </div>
    </MyPageLayout>
  )
}

export function CouponsPageContent({ api }: { api: MyAccountReadServices }) {
  const { products } = useServices()
  const downloadKeys = useRef<Record<string, string>>({})
  const client = useQueryClient()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<'held' | 'used'>('held')
  const [dates, setDates] = useState(() => accountDateRange('month'))
  const [periodOpen, setPeriodOpen] = useState(false)
  const from = status === 'used' ? dates.from : ''
  const to = status === 'used' ? dates.to : ''
  const result = useAccountRead(
    ['coupons', status, page, from, to],
    (signal) => status === 'held'
      ? api.coupons({ page, size: 20, status: 'held' }, signal)
      : api.coupons({
        page,
        size: 20,
        status: 'used',
        from: from || undefined,
        to: to || undefined,
      }, signal),
  )
  const offers = useAccountRead(['coupon-offers'], (signal) => api.downloadableCoupons(signal))
  const download = useMutation({
    mutationFn: (couponId: string) => {
      const key = downloadKeys.current[couponId] ?? crypto.randomUUID()
      downloadKeys.current = { ...downloadKeys.current, [couponId]: key }
      return api.downloadCoupon(couponId, key)
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['my-account', 'http', 'coupons'] }),
        client.invalidateQueries({ queryKey: ['my-account', 'http', 'coupon-offers'] }),
        client.invalidateQueries({ queryKey: ['my-account', 'http', 'benefits'] }),
      ])
    },
  })
  const productLink = (serverRoomId: string | null) =>
    !serverRoomId || products.capabilities?.rooms
      ? <RelativeLink to={serverRoomId ? `/products?room=${encodeURIComponent(serverRoomId)}&instantOnly=false` : '/products'}>적용 상품 보러가기</RelativeLink>
      : <span>서버실 상품 확인 필요</span>
  const listContent = <>
    <nav aria-label="쿠폰 내역 구분" className="mypage-tabs mypage-tabs--buttons">
      {([
        { value: 'held', label: '보유 쿠폰' },
        { value: 'used', label: '사용 내역' },
      ] as const).map((item) => (
        <button
          aria-pressed={item.value === status}
          key={item.value}
          onClick={() => {
            setStatus(item.value)
            setPage(0)
            setPeriodOpen(false)
          }}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </nav>
    {status === 'used' ? <div className="coupons-history__filter"><button aria-expanded={periodOpen} onClick={() => setPeriodOpen((current) => !current)} type="button">기간 선택<img alt="" src={periodChevronIcon} /></button></div> : null}
    {status === 'used' ? <div hidden={!periodOpen}><PeriodFilter open={periodOpen} onApply={(from, to) => {
      setDates({ from, to })
      setPage(0)
    }} /></div> : null}
    <AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data ? <>
      <BenefitTable
        ariaLabel={status === 'held' ? '보유 쿠폰' : '쿠폰 사용 내역'}
        headers={status === 'held'
          ? [{ label: '쿠폰명' }, { label: '사용기한' }, { label: '혜택' }, { label: '적용 상품' }]
          : [{ label: '사용일', sortable: true }, { label: '쿠폰명' }, { label: '할인 금액' }, { label: '주문번호' }]}
        rows={result.data.items.map((item) => status === 'held'
          ? [item.name, couponExpiry(item), couponBenefit(item), productLink(item.serverRoomId)]
          : [accountDate(item.usedAt).slice(0, 10), item.name, accountMoney(item.usedDiscountAmount), item.usedOrderNo
            ? <RelativeLink to={`/mypage/orders/${encodeURIComponent(item.usedOrderNo)}`}>{item.usedOrderNo}</RelativeLink>
            : '-'])}
      />
      {result.data.items.length === 0 ? <p className="mypage-empty">쿠폰 내역이 없습니다.</p> : null}
      <ReadPages page={result.data.page} totalPages={result.data.totalPages} onChange={setPage} />
    </> : null}
  </>

  return (
    <MyPageLayout title="쿠폰">
      <div className={status === 'held' ? 'coupons-available' : 'coupons-history'}>
        {status === 'held' ? <section>{listContent}</section> : listContent}
        {status === 'held' ? (
          <section className="coupon-download">
            <header><h2>다운로드 가능한 쿠폰</h2><RelativeLink to="/terms?section=point">포인트·쿠폰 정책<img alt="" src={subtleChevronIcon} /></RelativeLink></header>
            <AccountQueryState pending={offers.isPending} error={offers.error} retry={offers.refetch} />
            {download.isError ? <p role="alert">쿠폰을 다운로드하지 못했습니다.</p> : null}
            {offers.data?.length === 0 ? <p className="mypage-empty">다운로드 가능한 쿠폰이 없습니다.</p> : null}
            <div>
              {offers.data?.map((item) => (
                <article key={item.couponId}>
                  <div>
                    <strong>{couponBenefit(item)}</strong>
                    <h3>{item.name}</h3>
                    <dl>
                      <div>
                        <dt>기간</dt>
                        <dd>{item.validDaysAfterDownload === null ? accountDate(item.endsAt).slice(0, 10) : `다운로드 후 ${item.validDaysAfterDownload}일 이내`}</dd>
                      </div>
                      <div>
                        <dt>적용</dt>
                        <dd>{item.serverRoomName ?? (item.serverRoomId ? '지정 서버실' : '전체 서버실')}</dd>
                      </div>
                    </dl>
                  </div>
                  <button
                    disabled={download.isPending}
                    onClick={() => download.mutate(item.couponId)}
                    type="button"
                  >
                    쿠폰 다운로드
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </MyPageLayout>
  )
}
