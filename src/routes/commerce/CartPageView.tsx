import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShellView'
import { SelectionToolbar } from '@/components/ui/SelectionToolbarControl'
import { Modal } from '@/components/ui/ModalControl'
import { Toast } from '@/components/ui/ToastControl'
import { checkoutUrl } from '@/domain/checkout/checkoutRepository'
import { CartProductRow } from './-components/cart/CartProductRow'
import { CartEstimateSummary } from './-components/cart/CartEstimateSummary'
import { useCart } from './-components/cart/hooks/useCart'
import { CommerceCartState } from './-components/CommerceCartState'

export function CartPage() {
  const navigate = useNavigate()
  const cart = useCart()
  const [blockedProducts, setBlockedProducts] = useState<{ id: string; label: string }[] | null>(null)
  const empty = !cart.isPending && !cart.isError && cart.items.length === 0
  const status = cart.isPending ? 'loading' : cart.isError ? 'error' : empty ? 'empty' : null
  const browse = () => { void navigate('/products') }
  function purchase() {
    if (cart.isChanging || cart.checkoutChecking || !cart.selectedIds.length || cart.selectedIds.length > 100) return
    if (cart.checkoutBlocked) {
      setBlockedProducts(cart.unavailableItems.map(({ id, label }) => ({ id, label })))
      return
    }
    void navigate(checkoutUrl(cart.selectedIds))
  }
  return <AppShell className={`commerce-shell cart-page${empty ? ' cart-page--empty' : ''}`}>
    <div className="content-container commerce-page">
      <h1 className="commerce-title">장바구니</h1>
      
      <Toast message={cart.notice} toastKey={cart.toastKey} />
      {status ? <CommerceCartState status={status} loadingLabel="장바구니를 불러오는 중입니다." errorMessage="장바구니를 불러오지 못했습니다." onRetry={() => { void cart.refetch() }}><p>장바구니에 담긴 상품이 없습니다.</p><button onClick={browse} type="button">상품 둘러보기</button></CommerceCartState> : <div className="cart-layout">
        <section className="cart-items" aria-busy={cart.isChanging && cart.updatingQuantityIds.size === 0}>
          <SelectionToolbar checked={cart.allSelected} indeterminate={cart.selectedIds.length > 0 && !cart.allSelected} className="cart-selection-bar" onChange={cart.toggleAll} onRemove={() => cart.remove(cart.selectedIds)} removeDisabled={cart.isChanging || !cart.selectedIds.length} />
          {cart.items.map((item) => <CartProductRow item={item} key={item.id} selected={cart.selectedIds.includes(item.id)} disabled={cart.isChanging} quantityUpdating={cart.updatingQuantityIds.has(item.id)} onToggle={() => cart.toggle(item.id)} onRemove={() => cart.remove([item.id])} onQuantityChange={(quantity) => cart.changeQuantity(item.id, quantity)} />)}
        </section>
        <CartEstimateSummary estimate={cart.estimate} selectedCount={cart.selectedIds.length} disabled={cart.isChanging || cart.checkoutChecking || cart.selectedIds.length > 100} quoteError={cart.quoteError} onRetryQuote={() => { void cart.retryQuote() }} onPrevious={() => navigate(-1)} onPurchase={purchase} />
      </div>}
    </div>
    <Modal className="modal--cart-unavailable" isOpen={blockedProducts !== null} title="주문 불가 상품 안내" closeLabel="확인" closeVariant="primary" onClose={() => setBlockedProducts(null)}>
      {blockedProducts?.length ? <>
        <p>선택한 상품 중 주문할 수 없는 상품이 {blockedProducts.length}개 있습니다.</p>
        <ul>{blockedProducts.map(product => <li key={product.id}>{product.label}</li>)}</ul>
        <p>해당 상품의 선택을 해제한 후 주문해 주세요.</p>
      </> : <p>현재 주문 가능 여부를 확인할 수 없습니다. 장바구니의 상품 상태와 주문 금액을 다시 확인해 주세요.</p>}
    </Modal>
  </AppShell>
}
