import { useNavigate, useSearchParams } from 'react-router'
import { AppShell } from '@/components/layout/AppShellView'
import { SelectionToolbar } from '@/components/ui/SelectionToolbarControl'
import { checkoutPreviewUrl } from '@/domain/checkout/checkoutRepository'
import { CartProductRow } from './-components/cart/CartProductRow'
import { CartEstimateSummary } from './-components/cart/CartEstimateSummary'
import { useCart } from './-components/cart/hooks/useCart'
import { LoadingState } from '@/components/ui/LoadingStateControl'

export function CartPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const cart = useCart()
  const previewEmpty = import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true' && params.get('publishingState') === 'empty'
  const empty = previewEmpty || (!cart.isPending && !cart.isError && cart.items.length === 0)
  const browse = () => { void navigate('/products') }
  return <AppShell className={`commerce-shell cart-page${empty ? ' cart-page--empty' : ''}`}>
    <div className="content-container commerce-page">
      <h1 className="commerce-title">장바구니</h1>
      
      {cart.notice && <p role="status">{cart.notice}</p>}
      {cart.quoteError && <p role="alert">주문 금액을 확인하지 못했습니다. <button onClick={() => { void cart.retryQuote() }} type="button">다시 시도</button></p>}
      {cart.isPending && !previewEmpty ? <section className="cart-empty" aria-busy="true"><LoadingState label="장바구니를 불러오는 중입니다." /></section> : cart.isError && !previewEmpty ? <section className="cart-empty"><p role="alert">장바구니를 불러오지 못했습니다.</p><button onClick={() => { void cart.refetch() }} type="button">다시 시도</button></section> : empty ? <section className="cart-empty"><p>장바구니에 담긴 상품이 없습니다.</p><button onClick={browse} type="button">상품 둘러보기</button></section> : <div className="cart-layout">
        <section className="cart-items" aria-busy={cart.isChanging}>
          <SelectionToolbar checked={cart.allSelected} indeterminate={cart.selectedIds.length > 0 && !cart.allSelected} className="cart-selection-bar" onChange={cart.toggleAll} onRemove={() => cart.remove(cart.selectedIds)} removeDisabled={cart.isChanging || !cart.selectedIds.length} />
          {cart.items.map((item) => <CartProductRow item={item} key={item.id} selected={cart.selectedIds.includes(item.id)} disabled={cart.isChanging} onToggle={() => cart.toggle(item.id)} onRemove={() => cart.remove([item.id])} onQuantityChange={(quantity) => cart.changeQuantity(item.id, quantity)} />)}
        </section>
        <CartEstimateSummary estimate={cart.estimate} selectedCount={cart.selectedIds.length} disabled={cart.isChanging || cart.checkoutBlocked || cart.selectedIds.length > 100} onBrowse={browse} onPurchase={() => { void navigate(checkoutPreviewUrl(cart.selectedIds)) }} />
      </div>}
    </div>
  </AppShell>
}
