import { useNavigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShellView'
import { SelectionToolbar } from '@/components/ui/SelectionToolbarControl'
import { checkoutUrl } from '@/domain/checkout/checkoutRepository'
import { CartProductRow } from './-components/cart/CartProductRow'
import { CartEstimateSummary } from './-components/cart/CartEstimateSummary'
import { useCart } from './-components/cart/hooks/useCart'
import { CommerceCartState } from './-components/CommerceCartState'

export function CartPage() {
  const navigate = useNavigate()
  const cart = useCart()
  const empty = !cart.isPending && !cart.isError && cart.items.length === 0
  const status = cart.isPending ? 'loading' : cart.isError ? 'error' : empty ? 'empty' : null
  const browse = () => { void navigate('/products') }
  return <AppShell className={`commerce-shell cart-page${empty ? ' cart-page--empty' : ''}`}>
    <div className="content-container commerce-page">
      <h1 className="commerce-title">장바구니</h1>
      
      {cart.notice && <p role="status">{cart.notice}</p>}
      {cart.quoteError && <p role="alert">주문 금액을 확인하지 못했습니다. <button onClick={() => { void cart.retryQuote() }} type="button">다시 시도</button></p>}
      {status ? <CommerceCartState status={status} loadingLabel="장바구니를 불러오는 중입니다." errorMessage="장바구니를 불러오지 못했습니다." onRetry={() => { void cart.refetch() }}><p>장바구니에 담긴 상품이 없습니다.</p><button onClick={browse} type="button">상품 둘러보기</button></CommerceCartState> : <div className="cart-layout">
        <section className="cart-items" aria-busy={cart.isChanging && cart.updatingQuantityIds.size === 0}>
          <SelectionToolbar checked={cart.allSelected} indeterminate={cart.selectedIds.length > 0 && !cart.allSelected} className="cart-selection-bar" onChange={cart.toggleAll} onRemove={() => cart.remove(cart.selectedIds)} removeDisabled={cart.isChanging || !cart.selectedIds.length} />
          {cart.items.map((item) => <CartProductRow item={item} key={item.id} selected={cart.selectedIds.includes(item.id)} disabled={cart.isChanging} quantityUpdating={cart.updatingQuantityIds.has(item.id)} onToggle={() => cart.toggle(item.id)} onRemove={() => cart.remove([item.id])} onQuantityChange={(quantity) => cart.changeQuantity(item.id, quantity)} />)}
        </section>
        <CartEstimateSummary estimate={cart.estimate} selectedCount={cart.selectedIds.length} disabled={cart.isChanging || cart.checkoutBlocked || cart.selectedIds.length > 100} onPrevious={() => navigate(-1)} onPurchase={() => { void navigate(checkoutUrl(cart.selectedIds)) }} />
      </div>}
    </div>
  </AppShell>
}
