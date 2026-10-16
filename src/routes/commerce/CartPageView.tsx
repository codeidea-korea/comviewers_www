import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShellView'
import { PageBackButton } from '@/components/common/PageBackButton'
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
import { TranslatedText, useTranslation, type TranslationKey } from '@/i18n/translation'
import './cart-mobile.css'

const cartNoticeKeys: Readonly<Record<string, TranslationKey>> = {
  '선택한 상품을 삭제했습니다.': 'cart.removed',
  '일부 변경을 처리하지 못했습니다. 장바구니를 다시 확인해 주세요.': 'cart.changeFailed',
}

export function CartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const cart = useCart()
  const noticeKey = cartNoticeKeys[cart.notice]
  const [blockedProducts, setBlockedProducts] = useState<{ id: string; label: string }[] | null>(null)
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false)
  const [pendingGuestItems, setPendingGuestItems] = useState<readonly { productNo: string; rentalPeriods: number }[]>([])
  const [pendingGuestError, setPendingGuestError] = useState<TranslationKey | ''>('')
  useEffect(() => {
    if (session.status !== 'authenticated' || cart.isPending) return
    try { setPendingGuestItems(pendingGuestCartSelections()); setPendingGuestError('') }
    catch { setPendingGuestItems([]); setPendingGuestError('cart.guestReadFailed') }
  }, [session.status, cart.isPending, cart.dataUpdatedAt])
  function discardPending(productNo: string) {
    try { removePendingGuestCartSelection(productNo); setPendingGuestItems(pendingGuestCartSelections()); setPendingGuestError('') }
    catch { setPendingGuestError('cart.pendingRemoveFailed') }
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
    void navigate(checkoutUrl(cart.selectedIds, `${location.pathname}${location.search}${location.hash}`))
  }
  return <AppShell className={`commerce-shell cart-page${empty ? ' cart-page--empty' : ''}`} footerVariant="compact">
    <div className="content-container commerce-page">
      <div className="cart-page-heading"><PageBackButton fallbackTo="/products" label={t('cart.back')}/><h1 className="commerce-title"><TranslatedText id="nav.cart" /></h1></div>
      {pendingGuestError ? <div role="alert"><p>{t(pendingGuestError)}</p><button onClick={() => {
        try { clearUnreadableGuestCart(); setPendingGuestError(''); setPendingGuestItems([]); void cart.refetch() }
        catch { setPendingGuestError('cart.resetFailed') }
      }} type="button"><TranslatedText id="cart.resetGuest" /></button></div> : null}
      {pendingGuestItems.length > 0 ? <div role="alert">
        <p><TranslatedText id="cart.mergeFailed" values={{ count: pendingGuestItems.length }} /></p>
        <button onClick={() => { void cart.refetch() }} type="button"><TranslatedText id="common.retry" /></button>
        <ul>{pendingGuestItems.map((item) => <li key={item.productNo}>{item.productNo} · <TranslatedText id="cart.selectionUnits" values={{ count: item.rentalPeriods }} />
          <button onClick={() => discardPending(item.productNo)} type="button"><TranslatedText id="cart.removePending" /></button>
        </li>)}</ul>
      </div> : null}
      
      <Toast message={noticeKey ? t(noticeKey) : cart.notice} toastKey={cart.toastKey} />
      {status ? <CommerceCartState status={status} loadingLabel={t('cart.loading')} errorMessage={t('cart.loadFailed')} onRetry={() => { void cart.refetch() }}><p><TranslatedText id="cart.empty" /></p><button onClick={browse} type="button"><TranslatedText id="cart.browse" /></button></CommerceCartState> : <div className="cart-layout">
        <section className="cart-items" aria-busy={cart.isChanging && cart.updatingQuantityIds.size === 0}>
          <SelectionToolbar checked={cart.allSelected} indeterminate={cart.selectedIds.length > 0 && !cart.allSelected} className="cart-selection-bar" onChange={cart.toggleAll} onRemove={() => cart.remove(cart.selectedIds)} removeDisabled={cart.isChanging || !cart.selectedIds.length} />
          {cart.items.map((item) => <CartProductRow item={item} key={item.id} selected={cart.selectedIds.includes(item.id)} disabled={cart.isChanging} quantityUpdating={cart.updatingQuantityIds.has(item.id)} onToggle={() => cart.toggle(item.id)} onRemove={() => cart.remove([item.id])} onQuantityChange={(quantity) => cart.changeQuantity(item.id, quantity)} />)}
        </section>
        <CartEstimateSummary estimate={cart.estimate} selectedCount={cart.selectedIds.length} disabled={cart.isChanging || cart.checkoutChecking || cart.selectedIds.length > 100} quoteError={cart.quoteError} onRetryQuote={() => { void cart.retryQuote() }} onPrevious={() => navigate(-1)} onPurchase={purchase} />
      </div>}
    </div>
    <Modal className="modal--cart-unavailable" isOpen={blockedProducts !== null} title="주문 불가 상품 안내" titleTranslationKey="cart.blockedTitle" closeLabel="확인" closeVariant="primary" onClose={() => setBlockedProducts(null)}>
      {blockedProducts?.length ? <>
        <p><TranslatedText id="cart.blockedCount" values={{ count: blockedProducts.length }} /></p>
        <ul>{blockedProducts.map(product => <li key={product.id}>{product.label}</li>)}</ul>
        <p><TranslatedText id="cart.deselectBeforeOrder" /></p>
      </> : <p><TranslatedText id="cart.eligibilityUnknown" /></p>}
    </Modal>
    <Modal isOpen={loginRequiredOpen} title="로그인이 필요합니다." titleTranslationKey="auth.loginRequired" closeLabel="취소" confirmLabel="로그인하기" onClose={() => setLoginRequiredOpen(false)} onConfirm={() => navigate('/login?returnTo=%2Fcart')}>
      <p><TranslatedText id="cart.loginToOrder" /></p>
    </Modal>
  </AppShell>
}
