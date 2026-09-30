import { useEffect, useState } from 'react'
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
import { useSession } from '@/app/session/SessionProvider'
import { clearUnreadableGuestCart, pendingGuestCartSelections, removePendingGuestCartSelection } from '@/domain/cart/guestCartRepository'

export function CartPage() {
  const navigate = useNavigate()
  const session = useSession()
  const cart = useCart()
  const [blockedProducts, setBlockedProducts] = useState<{ id: string; label: string }[] | null>(null)
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false)
  const [pendingGuestItems, setPendingGuestItems] = useState<readonly { productNo: string; rentalPeriods: number }[]>([])
  const [pendingGuestError, setPendingGuestError] = useState('')
  useEffect(() => {
    if (session.status !== 'authenticated' || cart.isPending) return
    try { setPendingGuestItems(pendingGuestCartSelections()); setPendingGuestError('') }
    catch { setPendingGuestItems([]); setPendingGuestError('저장된 비로그인 장바구니를 읽지 못했습니다.') }
  }, [session.status, cart.isPending, cart.dataUpdatedAt])
  function discardPending(productNo: string) {
    try { removePendingGuestCartSelection(productNo); setPendingGuestItems(pendingGuestCartSelections()); setPendingGuestError('') }
    catch { setPendingGuestError('보관 상품을 삭제하지 못했습니다. 다시 시도해 주세요.') }
  }
  const empty = !cart.isPending && !cart.isError && cart.items.length === 0
  const status = cart.isPending ? 'loading' : cart.isError ? 'error' : empty ? 'empty' : null
  const browse = () => { void navigate('/products') }
  function purchase() {
    if (cart.isChanging || cart.checkoutChecking || !cart.selectedIds.length || cart.selectedIds.length > 100) return
    if (session.status === 'anonymous') { setLoginRequiredOpen(true); return }
    if (cart.checkoutBlocked) {
      setBlockedProducts(cart.unavailableItems.map(({ id, label }) => ({ id, label })))
      return
    }
    void navigate(checkoutUrl(cart.selectedIds))
  }
  return <AppShell className={`commerce-shell cart-page${empty ? ' cart-page--empty' : ''}`}>
    <div className="content-container commerce-page">
      <h1 className="commerce-title">장바구니</h1>
      {pendingGuestError ? <div role="alert"><p>{pendingGuestError}</p><button onClick={() => {
        try { clearUnreadableGuestCart(); setPendingGuestError(''); setPendingGuestItems([]); void cart.refetch() }
        catch { setPendingGuestError('저장된 장바구니를 초기화하지 못했습니다.') }
      }} type="button">비로그인 장바구니 초기화</button></div> : null}
      {pendingGuestItems.length > 0 ? <div role="alert">
        <p>비로그인 장바구니 상품 {pendingGuestItems.length}개를 회원 장바구니로 옮기지 못했습니다.</p>
        <button onClick={() => { void cart.refetch() }} type="button">다시 시도</button>
        <ul>{pendingGuestItems.map((item) => <li key={item.productNo}>{item.productNo} · 선택 수량/기간 {item.rentalPeriods}
          <button onClick={() => discardPending(item.productNo)} type="button">보관 목록에서 삭제</button>
        </li>)}</ul>
      </div> : null}
      
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
    <Modal isOpen={loginRequiredOpen} title="로그인이 필요합니다." closeLabel="취소" confirmLabel="로그인하기" onClose={() => setLoginRequiredOpen(false)} onConfirm={() => navigate('/login?returnTo=%2Fcart')}>
      <p>주문하려면 로그인해 주세요. 담은 상품은 로그인 후 장바구니로 옮겨집니다.</p>
    </Modal>
  </AppShell>
}
