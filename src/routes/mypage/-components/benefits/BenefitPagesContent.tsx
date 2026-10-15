import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PointEntryType } from '@/api/myAccount'
import { useServices } from '@/app/ServiceProvider'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { BenefitTable } from '../../BenefitTableView'
import { MyPageLayout } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { accountDateRange } from '../shared/AccountDatePresets'
import { MyPagePeriodDialog } from '../shared/MyPagePeriodDialog'
import { ReadPages, accountDate, accountMoney, useAccountRead } from '../shared/AccountReadCommon'
import { OrderItemActions } from '../orders/OrderItemActions'
import { pendingOrders } from '../shared/pendingConfirmationOrders'
import pointOrderProduct from '@/assets/figma/window-bg-rendered-1.png'
import carouselNextIcon from '@/assets/figma/pagination-chevron-right.svg'
import periodChevronIcon from '@/assets/figma/selector-chevron-down.svg'
import subtleChevronIcon from '@/assets/figma/scrap-chevron-right.svg'
import './benefits-qa.css'

function couponExpiry(item: { expiresAt: string | null; endsAt: string | null }) {
  const values = [item.expiresAt, item.endsAt].filter((value): value is string => value !== null)
  return values.length
    ? accountDate(values.reduce((earliest, value) => value < earliest ? value : earliest)).slice(0, 10)
    : uiText('기한 없음')
}

function couponBenefit(item: { discountType: string; discountValue: number; maximumDiscountAmount?: number | null }) {
  if (item.discountType === 'percentage') {
    const cap = item.maximumDiscountAmount == null ? '' : uiText(' (최대 {amount})', { amount: accountMoney(item.maximumDiscountAmount) })
    return uiText('{value}% 할인{cap}', { value: item.discountValue, cap })
  }
  if (item.discountType === 'fixed_amount') return uiText('{amount} 할인', { amount: accountMoney(item.discountValue) })
  return `${item.discountType} ${item.discountValue}`
}

const pointReasonLabels: Readonly<Record<string, string>> = {
  purchase_confirmation: '구매확정 적립',
  qa_usage: '포인트 사용',
  order_payment: '주문 결제 사용',
  refund_restore: '환불 포인트 복원',
  expiration: '포인트 소멸',
  signup: '가입 축하 포인트',
  admin_adjustment: '포인트 조정',
}

function pointReasonLabel(reason: string | null, amount: number) {
  if (!reason) return amount >= 0 ? uiText('포인트 적립') : uiText('포인트 사용')
  if (pointReasonLabels[reason]) return uiText(pointReasonLabels[reason])
  return /^[a-z0-9_]+$/i.test(reason) ? (amount >= 0 ? uiText('포인트 적립') : uiText('포인트 사용')) : reason
}

function pointTypeLabel(pointType: string | null | undefined) {
  if (pointType === 'general') return uiText('일반')
  if (pointType === 'free') return uiText('무료')
  if (pointType === 'mixed') return uiText('일반·무료')
  return '-'
}

export function PointsPageContent({ api }: { api: MyAccountReadServices }) {
  useUiTranslation()
  const [page, setPage] = useState(0)
  const carouselViewport = useRef<HTMLDivElement>(null)
  const carouselTrack = useRef<HTMLDivElement>(null)
  const [carouselEdges, setCarouselEdges] = useState({ previous: false, next: false })
  const [carouselArrowTop, setCarouselArrowTop] = useState<number>()
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
    { retainPreviousList: { scope: api, prefix: ['points'] } },
  )
  const recent = useAccountRead(
    ['orders', 'purchase-confirmation-candidates'],
    (signal) => pendingOrders(api, signal),
  )
  const candidates = recent.data?.flatMap((order) =>
    order.items.map((item) => ({ order, item })),
  ) ?? []

  useEffect(() => {
    const viewport = carouselViewport.current
    const track = carouselTrack.current
    if (!viewport || !track) return
    const updateEdges = () => {
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      const left = Math.max(0, Math.min(viewport.scrollLeft, maximum))
      const previous = left > 1
      const next = left < maximum - 1
      setCarouselEdges(current => current.previous === previous && current.next === next
        ? current : { previous, next })
      const image = track.querySelector('article > div > img')
      const carousel = viewport.closest('.point-carousel')
      if (image && carousel) {
        const imageBounds = image.getBoundingClientRect()
        setCarouselArrowTop(imageBounds.top - carousel.getBoundingClientRect().top + imageBounds.height / 2)
      }
    }
    updateEdges()
    viewport.addEventListener('scroll', updateEdges, { passive: true })
    const observer = new ResizeObserver(updateEdges)
    observer.observe(viewport)
    observer.observe(track)
    return () => {
      viewport.removeEventListener('scroll', updateEdges)
      observer.disconnect()
    }
  }, [candidates.length])

  const scrollOrders = (direction: -1 | 1) => {
    const viewport = carouselViewport.current
    const track = carouselTrack.current
    if (!viewport || !track) return
    const card = track.firstElementChild
    const distance = card ? card.getBoundingClientRect().width + (Number.parseFloat(getComputedStyle(track).columnGap) || 0) : viewport.clientWidth
    viewport.scrollBy({ left: direction * distance, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <MyPageLayout title={uiText("포인트")}>
      <div className="points-catalog">
        <AccountQueryState pending={recent.isPending} error={recent.error} retry={recent.refetch} />
        {candidates.length > 0 ? (
          <section className="point-carousel">
            <header>
              <strong>{uiText("구매확정이 필요한 주문")} <b>{candidates.length}</b></strong>
              <RelativeLink to="/mypage/orders">{uiText("주문내역 보기")}</RelativeLink>
            </header>
            <div aria-label={uiText("구매확정이 필요한 주문 목록")} className="point-carousel__viewport" id="point-confirmation-orders" ref={carouselViewport} role="region" tabIndex={0}><div className="point-carousel__track" ref={carouselTrack}>
              {candidates.map(({ item, order }) => <article key={item.orderItemId}>
                <div>
                  <img alt={item.title} src={item.imageUrl && /^(https?:\/\/|\/[^/])/.test(item.imageUrl) ? item.imageUrl : pointOrderProduct} />
                  <span><strong>{item.productNo}</strong><small>{uiText("주문번호")} {order.orderNo}</small></span>
                </div>
                <OrderItemActions api={api} item={item} orderStatus={order.orderStatus} paymentStatus={order.paymentStatus} variant="purchase-summary" />
              </article>)}
            </div></div>
            {candidates.length > 1 && carouselEdges.previous ? <button aria-controls="point-confirmation-orders" aria-label={uiText("이전 주문 보기")} className="point-carousel__previous" style={{ top: carouselArrowTop, transform: 'translateY(-50%)' }} onClick={() => scrollOrders(-1)} type="button"><img alt="" src={carouselNextIcon} /></button> : null}
            {candidates.length > 1 && carouselEdges.next ? <button aria-controls="point-confirmation-orders" aria-label={uiText("다음 주문 보기")} className="point-carousel__next" style={{ top: carouselArrowTop, transform: 'translateY(-50%)' }} onClick={() => scrollOrders(1)} type="button"><img alt="" src={carouselNextIcon} /></button> : null}
          </section>
        ) : null}

        <section className="points-history">
          <div className="benefit-tabs-row">
            <nav aria-label={uiText("포인트 내역 구분")} className="mypage-tabs mypage-tabs--buttons">
              {([
                { value: 'all', label: uiText('전체') },
                { value: 'earned', label: uiText('적립 내역') },
                { value: 'used', label: uiText('사용 내역') },
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
            <RelativeLink className="benefit-tabs-row__policy" to="/terms?section=refund">{uiText("포인트·쿠폰 정책")}<span className="points-policy-icon" aria-hidden="true"><img alt="" src={subtleChevronIcon} /></span></RelativeLink>
          </div>
          <div className="points-history__toolbar">
            <span className="points-history__balance"><span>{uiText("사용 가능 포인트")}</span><span><strong>{result.data?.balance.toLocaleString('ko-KR') ?? 0}</strong>{uiText("점")}</span></span>
            <button aria-expanded={periodOpen} onClick={() => setPeriodOpen(true)} type="button">{dates.from.replaceAll('-', '.')} ~ {dates.to.replaceAll('-', '.')}<img alt="" src={periodChevronIcon} /></button>
          </div>
          {periodOpen ? <MyPagePeriodDialog dates={dates} onApply={nextDates => {
            setDates(nextDates)
            setPage(0)
            setPeriodOpen(false)
          }} onClose={() => setPeriodOpen(false)} /> : null}
          <AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
          {result.data ? (
            <>
              <BenefitTable
                ariaLabel={uiText("포인트 내역")}
                rowsInert={result.isPlaceholderData}
                mobileVariant="rcpc"
                columns={[
                  { key: 'occurredAt', label: uiText('일시'), sortValue: item => Date.parse(item.occurredAt), renderCell: item => accountDate(item.occurredAt).slice(0, 19) },
                  { key: 'reason', label: uiText('내용'), sortValue: item => pointReasonLabel(item.reason, item.amount), renderCell: item => pointReasonLabel(item.reason, item.amount) },
                  { key: 'type', label: uiText('구분'), sortValue: item => item.amount >= 0 ? uiText('적립') : uiText('사용'), renderCell: item => item.amount >= 0 ? uiText('적립') : uiText('사용') },
                  { key: 'pointType', label: uiText('유형'), sortValue: item => pointTypeLabel(item.pointType), renderCell: item => pointTypeLabel(item.pointType) },
                  { key: 'amount', label: uiText('포인트'), sortValue: item => item.amount, renderCell: item => `${item.amount > 0 ? '+' : ''}${item.amount.toLocaleString('ko-KR')}P` },
                  { key: 'expirationDates', label: uiText('만료일시'), renderCell: item => item.amount <= 0
                    ? '-'
                    : item.expiresAt
                    ? accountDate(item.expiresAt).slice(0, 19)
                    : item.expirationDates.length
                    ? <span className="point-expiration-dates">{item.expirationDates.map(date => <span key={date}>{date.replaceAll('-', '.')}</span>)}</span>
                    : '-' },
                ]}
                rows={result.data.items}
                rowKey={item => item.rowKey ?? item.id}
              />
              {result.data.items.length === 0 ? (
                <p className="mypage-empty">
                  {entryType === 'all'
                    ? uiText('포인트 내역이 없습니다.')
                    : entryType === 'earned'
                      ? uiText('조회된 포인트 적립 내역이 없습니다.')
                      : uiText('조회된 포인트 사용 내역이 없습니다.')}
                </p>
              ) : null}
            </>
          ) : null}
          {result.data ? <ReadPages page={result.isPlaceholderData ? page : result.data.page} totalPages={result.data.totalPages} onChange={setPage} /> : null}
        </section>
      </div>
    </MyPageLayout>
  )
}

export function CouponsPageContent({ api }: { api: MyAccountReadServices }) {
  useUiTranslation()
  const { products } = useServices()
  const downloadKeys = useRef<Record<string, string>>({})
  const client = useQueryClient()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<'held' | 'used'>('held')
  const [dates, setDates] = useState(() => accountDateRange('month'))
  const [periodOpen, setPeriodOpen] = useState(false)
  const from = status === 'used' ? dates.from : ''
  const to = status === 'used' ? dates.to : ''
  const pageSize = status === 'held' ? 4 : 20
  const result = useAccountRead(
    ['coupons', status, page, pageSize, from, to],
    (signal) => status === 'held'
      ? api.coupons({ page, size: pageSize, status: 'held' }, signal)
      : api.coupons({
        page,
        size: pageSize,
        status: 'used',
        from: from || undefined,
        to: to || undefined,
      }, signal),
    { refreshOnReturn: true, retainPreviousList: { scope: api, prefix: ['coupons', status] } },
  )
  const offers = useAccountRead(['coupon-offers'], (signal) => api.downloadableCoupons(signal), { refreshOnReturn: true })
  const download = useMutation({
    mutationFn: (couponId: string) => {
      const key = downloadKeys.current[couponId] ?? crypto.randomUUID()
      downloadKeys.current = { ...downloadKeys.current, [couponId]: key }
      return api.downloadCoupon(couponId, key)
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['my-account', 'read', 'coupons'] }),
        client.invalidateQueries({ queryKey: ['my-account', 'read', 'coupon-offers'] }),
        client.invalidateQueries({ queryKey: ['my-account', 'read', 'benefits'] }),
        client.invalidateQueries({ queryKey: ['checkout', 'benefits'] }),
        client.invalidateQueries({ queryKey: ['checkout', 'extension'] }),
      ])
    },
  })
  const productLink = (couponId: string, serverRoomId: string | null) =>
    !serverRoomId || products.capabilities?.rooms
      ? <RelativeLink to={`/products?couponId=${encodeURIComponent(couponId)}&instantOnly=false&saleAvailableOnly=true&couponProducts=true${serverRoomId ? `&room=${encodeURIComponent(serverRoomId)}` : ''}`}>{uiText("적용 상품 보러가기")}</RelativeLink>
      : <span>{uiText("서버실 상품 확인 필요")}</span>
  const listContent = <>
    <div className="benefit-tabs-row">
      <nav aria-label={uiText("쿠폰 내역 구분")} className="mypage-tabs mypage-tabs--buttons">
        {([
          { value: 'held', label: uiText('보유 쿠폰') },
          { value: 'used', label: uiText('사용 내역') },
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
      <RelativeLink className="benefit-tabs-row__policy" to="/terms?section=refund">{uiText("포인트·쿠폰 정책")}<span className="coupons-policy-icon" aria-hidden="true"><img alt="" src={subtleChevronIcon} /></span></RelativeLink>
    </div>
    {status === 'used' ? <div className="coupons-history__filter"><button aria-expanded={periodOpen} aria-haspopup="dialog" onClick={() => setPeriodOpen(true)} type="button">{uiText("조회기간")} {dates.from.replaceAll('-', '.')} ~ {dates.to.replaceAll('-', '.')}<img alt="" src={periodChevronIcon} /></button></div> : null}
    {status === 'used' && periodOpen ? <MyPagePeriodDialog dates={dates} onApply={nextDates => {
      setDates(nextDates)
      setPage(0)
      setPeriodOpen(false)
    }} onClose={() => setPeriodOpen(false)} /> : null}
    <AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data ? <>
      <BenefitTable
        rowsInert={result.isPlaceholderData}
        ariaLabel={status === 'held' ? uiText('보유 쿠폰') : uiText('쿠폰 사용 내역')}
        mobileVariant="rcpc"
        columns={status === 'held'
          ? [{ key: 'name', label: uiText('쿠폰명'), renderCell: item => item.name },
            { key: 'expiry', label: uiText('사용기한'), renderCell: couponExpiry },
            { key: 'benefit', label: uiText('혜택'), renderCell: couponBenefit },
            { key: 'product', label: uiText('적용 상품'), renderCell: item => item.status === 'unavailable' ? <span>{uiText("사용중지")}</span> : productLink(item.couponId, item.serverRoomId) }]
          : [{ key: 'usedAt', label: uiText('사용일'), sortValue: item => item.usedAt ? Date.parse(item.usedAt) : null, renderCell: item => accountDate(item.usedAt).slice(0, 10) },
            { key: 'name', label: uiText('쿠폰명'), renderCell: item => item.name },
            { key: 'amount', label: uiText('할인 금액'), renderCell: item => accountMoney(item.usedDiscountAmount) },
            { key: 'order', label: uiText('주문번호'), renderCell: item => item.usedOrderNo
              ? <RelativeLink to={`/mypage/orders/${encodeURIComponent(item.usedOrderNo)}`}>{item.usedOrderNo}</RelativeLink> : '-' }]}
        rows={result.data.items}
        rowKey={item => item.userCouponId}
      />
      {result.data.items.length === 0 ? <p className="mypage-empty">{uiText("쿠폰 내역이 없습니다.")}</p> : null}
      <ReadPages page={result.isPlaceholderData ? page : result.data.page} totalPages={result.data.totalPages} onChange={setPage} />
    </> : null}
  </>

  return (
    <MyPageLayout title={uiText("쿠폰")}>
      <div className={status === 'held' ? 'coupons-available' : 'coupons-history'}>
        {status === 'held' ? <section>{listContent}</section> : listContent}
        {status === 'held' ? (
          <section className="coupon-download">
            <header><h2>{uiText("다운로드 가능한 쿠폰")}</h2></header>
            <AccountQueryState pending={offers.isPending} error={offers.error} retry={offers.refetch} />
            {download.isError ? <p role="alert">{uiText(download.error.message)}</p> : null}
            {offers.data?.length === 0 ? <p className="mypage-empty">{uiText("다운로드 가능한 쿠폰이 없습니다.")}</p> : null}
            <div>
              {offers.data?.map((item) => (
                <article key={item.couponId}>
                  <div>
                    <strong>{couponBenefit(item)}</strong>
                    <h3>{item.name}</h3>
                    <dl>
                      <div>
                        <dt>{uiText("기간")}</dt>
                        <dd>{item.validDaysAfterDownload === null ? accountDate(item.endsAt).slice(0, 10) : uiText('다운로드 후 {days}일 이내', { days: item.validDaysAfterDownload })}</dd>
                      </div>
                      <div>
                        <dt>{uiText("적용")}</dt>
                        <dd>{item.serverRoomName ?? (item.serverRoomId ? uiText('지정 서버실') : uiText('전체 서버실'))}</dd>
                      </div>
                    </dl>
                  </div>
                  <button
                    disabled={download.isPending}
                    onClick={() => download.mutate(item.couponId)}
                    type="button"
                  >
                    {uiText("쿠폰 다운로드")}
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
