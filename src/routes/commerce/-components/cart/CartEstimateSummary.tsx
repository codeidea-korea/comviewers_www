import type { CartEstimate } from '@/domain/cart/cartEstimate'
import { CartMoney } from './CartMoney'

interface Props {
  estimate: { [K in keyof CartEstimate]: number | null } & { subtotalAmount?: number; setupFeeAmount?: number }
  selectedCount: number
  disabled: boolean
  onPurchase: () => void
  onPrevious: () => void
}

export function CartEstimateSummary({ estimate, selectedCount, disabled, onPurchase, onPrevious }: Props) {
  return <aside className="purchase-summary cart-summary">
    <h2>주문 예상 금액</h2>
    <div className="purchase-summary__box cart-summary__box">
      <dl>
        <div className="purchase-summary__products cart-summary__products">
          <div className="cart-summary__main"><dt>렌탈상품</dt><dd><CartMoney value={estimate.rentalTotal} /></dd></div>
          <div className="cart-summary__sub"><dt>L 세팅비</dt><dd><CartMoney value={estimate.rentalSetupTotal} /></dd></div>
          <div className="cart-summary__sub"><dt>L 렌탈금액</dt><dd><CartMoney value={estimate.rentalMonthlyTotal} /></dd></div>
          <div className="cart-summary__main"><dt>파트상품</dt><dd><CartMoney value={estimate.partTotal} /></dd></div>
        </div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__points cart-summary__points"><dt>적립 포인트</dt><dd><span>{estimate.pointTotal ?? '-'}</span>{estimate.pointTotal !== null && <span>점</span>}</dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__total cart-summary__total"><dt>예상 결제 금액</dt><dd><CartMoney value={estimate.expectedTotal} /></dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
      </dl>
      <p>쿠폰·포인트는 결제 단계에서 사용할 수 있습니다.</p>
    </div>
    <div className="purchase-summary__actions cart-summary__actions"><button disabled={disabled || !selectedCount} onClick={onPurchase} type="button"><strong>선택 상품 {selectedCount}개</strong> 구매하기</button><button onClick={onPrevious} type="button">이전 페이지</button></div>
  </aside>
}
