import type { ReactNode } from 'react'
import type { CommerceItem } from '../../lib/commerceCalculations'
interface SummaryItem extends CommerceItem { label: string; product: { image: string }; displayAmount?: number; displayTermDuration?: string }
type CommerceSummary = ReturnType<typeof calculateCommerceSummary>
import { formatWon } from '../../lib/currency'
import windowsLogo from '../../assets/figma/windows-logo.svg'
import serverOnIcon from '../../assets/figma/icon-server-on.svg'
import tollIcon from '../../assets/figma/icon-toll-green.svg'
import radioOffIcon from '../../assets/figma/select-radio-off.svg'
import radioOnIcon from '../../assets/figma/select-radio-on.svg'
import mastercardIcon from '../../assets/figma/payment-mastercard.svg'
import visaIcon from '../../assets/figma/payment-visa.svg'
import wechatIcon from '../../assets/figma/payment-wechat.svg'
import jcbIcon from '../../assets/figma/payment-jcb.svg'
import { Radio } from '../../components/ui/RadioControl'
import { Button } from '../../components/ui/ButtonControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { calculateCommerceSummary, getEarnedPoints, getItemAmount, getQuantity, getRentalFee, getSetupFee, isPartProduct } from '../../lib/commerceCalculations'

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="commerce-title">{children}</h1>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="commerce-section-title">{children}</h2>
}

export function ProductSummary({ item, compact = false }: { item: SummaryItem; compact?: boolean }) {
  const partner = isPartProduct(item)
  const quantity = getQuantity(item)
  const amount = item.displayAmount ?? getItemAmount(item)
  const points = getEarnedPoints(item)
  const termDuration = item.displayTermDuration ?? `${quantity}개월`
  return (
    <article className={`commerce-product-row${compact ? ' commerce-product-row--compact' : ''}`}>
      <header className="commerce-product-row__heading"><span>{item.label}</span>{!partner && <small>IRC코리아/메가서버실</small>}</header>
      <div className="commerce-product-row__content">
        <div className="commerce-product-row__image"><img alt="Windows 11 RCPC 상품" src={item.product.image} /><img alt="" src={windowsLogo} /></div>
        <div className="commerce-product-row__body">
          <p className="commerce-product-row__status"><i><img alt="" src={serverOnIcon} /></i>구매 즉시 접속 가능합니다.</p>
          <p className="commerce-product-row__spec">Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB) </p>
        </div>
      </div>
      <div className="commerce-product-row__meta">
        <div className="commerce-product-row__terms">{partner ? <><span>상품금액 {formatWon(getRentalFee(item))}</span><b aria-hidden="true" /><span>수량 {quantity}개</span></> : <><span>세팅비 {formatWon(getSetupFee(item))}</span><b aria-hidden="true" /><span>월 렌탈료 {formatWon(getRentalFee(item))}</span><b aria-hidden="true" /><span>이용기간 {termDuration}</span></>}</div>
        <div className="commerce-product-row__amount">{!partner && <span><img alt="" src={tollIcon} /><b>{points}</b>점 적립</span>}<strong>{formatWon(amount)}</strong></div>
      </div>
    </article>
  )
}

export function OrderSummary({ buttonLabel = '주문하기', items = [], onPaymentChange, onSubmit, payment = '', summaryOverride }: { buttonLabel?: string; items?: readonly CommerceItem[]; onPaymentChange?: (payment: string) => void; onSubmit?: () => void; payment?: string; summaryOverride?: CommerceSummary }) {
  const calculated = calculateCommerceSummary(items)
  const { expectedTotal: total, partTotal: partnerTotal, pointTotal: expectedPoints, rentalMonthlyTotal: monthlyTotal, rentalSetupTotal: setupTotal, rentalTotal } = summaryOverride ?? calculated
  return (
    <aside className="order-summary">
      <div className="order-summary__box">
        <h2>결제 금액</h2>
        <dl className="order-summary__amounts">
          <div><dt>렌탈상품</dt><dd>{formatWon(rentalTotal)}</dd></div>
          <div className="sub"><dt>ㄴ 세팅비</dt><dd>{formatWon(setupTotal)}</dd></div>
          <div className="sub"><dt>ㄴ 렌탈금액</dt><dd>{formatWon(monthlyTotal)}</dd></div>
          <div><dt>파트상품</dt><dd>{formatWon(partnerTotal)}</dd></div>
          <div><dt>주문 합계</dt><dd>{formatWon(total)}</dd></div>
        </dl>
        <div aria-hidden="true" className="order-summary__rule" />
        <section className="order-summary__benefits">
          <h3>혜택 금액</h3>
          <dl><div><dt>쿠폰 할인</dt><dd>-1,000원</dd></div><div><dt>포인트 사용</dt><dd>-2,000원</dd></div></dl>
        </section>
        <div aria-hidden="true" className="order-summary__rule" />
        <section className="order-summary__final">
          <dl><div className="order-summary__total"><dt>총 합계 금액</dt><dd><strong>{total.toLocaleString('ko-KR')}</strong><span>원</span></dd></div></dl>
          <div className="order-summary__coupon"><span>적립 예정 포인트</span><strong>{expectedPoints.toLocaleString('ko-KR')}점</strong></div>
        </section>
        <div aria-hidden="true" className="order-summary__rule" />
        <fieldset className="payment-methods">
          <legend>결제수단</legend>
          <div className="payment-methods__options">
            {[
              ['virtual-account', '가상계좌'],
              ['card', '카드결제'],
              ['payco', '페이코'],
              ['global-card', ''],
            ].map(([value, label], index) => (
              <Radio checked={payment === value} iconClassName="payment-radio-icon" key={`${value}-${index}`} name="payment" offIcon={radioOffIcon} onChange={() => onPaymentChange?.(value)} onIcon={radioOnIcon} value={value}><span>{label}</span>{value === 'global-card' && <span className="payment-card-logos"><img alt="Mastercard" src={mastercardIcon} /><img alt="Visa" src={visaIcon} /><img alt="WeChat Pay" src={wechatIcon} /><img alt="JCB" src={jcbIcon} /></span>}</Radio>
            ))}
          </div>
        </fieldset>
        <div aria-hidden="true" className="order-summary__rule" />
        <div className="order-summary__agreements">
          <label className="order-summary__agreement"><Checkbox /> <span>[필수] 주문 상품, 결제 금액 및 주문 내용을 모두<br />확인했습니다.</span></label>
          <label className="order-summary__agreement"><Checkbox /> <span>[필수] 결제대행서비스 약관 동의</span></label>
        </div>
      </div>
      <Button className="commerce-primary-button" fullWidth onClick={onSubmit} size="large">{buttonLabel}</Button>
    </aside>
  )
}

export function FieldRow({ children, label, required = false }: { children: ReactNode; label: ReactNode; required?: boolean }) {
  return (
    <label className="commerce-field"><span>{required ? <em>*</em> : null}{label}</span>{children}</label>
  )
}

export function InfoTable({ className = '', rows }: { className?: string; rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className={`commerce-info-table ${className}`.trim()}>
      {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  )
}
