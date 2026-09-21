import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppShell } from '../../components/layout/AppShellView'
import { DialogLayer } from '../../components/ui/DialogLayerControl'
import { Modal } from '../../components/ui/ModalControl'
import { Pagination } from '../../components/ui/PaginationControl'
import type { Product, DetailSelections } from '../../domain/products/types'
import { ProductResults } from './-components/ProductResults'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { useProductList } from './-components/hooks/useProductList'
import { useAddToCart } from './-components/hooks/useAddToCart'
import { ProductFilter } from './-components/ProductFiltersView'
import { ProductCatalogFilterControls } from './-components/ProductCatalogFilterControls'
export { ProductFilter } from './-components/ProductFiltersView'
import filterChevronBackwardIcon from '../../assets/figma/filter-chevron-backward.svg'
import filterTuneIcon from '../../assets/figma/filter-tune.svg'
import viewGridIcon from '../../assets/figma/view-grid.svg'
import viewListIcon from '../../assets/figma/view-list.svg'
import { useSession } from '@/app/session/SessionProvider'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { TranslatedText, useTranslation } from '@/i18n/translation'

function matchesMedia(query: string) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

export function ProductListPage() {
  const { locale, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const cartAddition = useAddToCart()
  const productList = useProductList()
  const {
    visibleProducts, resultTotal, totalPages, currentPage, setCurrentPage,
    instantOnly, setInstantOnly, detailSelections, setDetailSelections,
    facets, capabilities, isPending, isError, errorMessage, refetch,
  } = productList
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterDrawer, setFilterDrawer] = useState(() => matchesMedia('(max-width: 1799px)'))
  const [mobileViewport, setMobileViewport] = useState(() => matchesMedia('(max-width: 767px)'))
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [cartPopupOpen, setCartPopupOpen] = useState(false)
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false)
  const hasAdjustableFilters = productList.catalogSelections.rooms.length > 0
    || productList.catalogSelections.line !== '전체'
    || productList.catalogSelections.ip !== '전체'
    || productList.catalogSelections.purpose !== '전체'
    || Object.values(productList.catalogSelections.details).some((values) => values && values.length > 0)
    || (productList.catalogSelections.filterOptionIds?.length ?? 0) > 0
    || productList.catalogSelections.minPrice !== undefined
    || productList.catalogSelections.maxPrice !== undefined
    || productList.catalogSelections.keyboardConnectionStatus !== undefined
    || productList.catalogSelections.mouseConnectionStatus !== undefined
    || productList.catalogSelections.saleAvailableOnly
    || productList.catalogSelections.instantOnly
  const catalogIsEmpty = !isPending && !isError && resultTotal === 0 && !hasAdjustableFilters
  const showCatalogControls = !isError
  const addToCart = (product: Product) => {
    if (session.status !== 'authenticated') {
      setLoginRequiredOpen(true)
      return
    }
    cartAddition.add(String(product.productId), 1)
  }
  const resultsToolbarRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLElement>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(max-width: 1799px)')
    const updateFilterMode = (event: MediaQueryListEvent) => setFilterDrawer(event.matches)
    setFilterDrawer(media.matches)
    media.addEventListener('change', updateFilterMode)
    return () => media.removeEventListener('change', updateFilterMode)
  }, [])
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(max-width: 767px)')
    const updateMobileViewport = (event: MediaQueryListEvent) => setMobileViewport(event.matches)
    setMobileViewport(media.matches)
    media.addEventListener('change', updateMobileViewport)
    return () => media.removeEventListener('change', updateMobileViewport)
  }, [])
  useEffect(() => {
    if (cartAddition.isSuccess || cartAddition.isError) setCartPopupOpen(true)
  }, [cartAddition.isError, cartAddition.isSuccess])
  const closeFilter = useCallback(() => {
    setFilterOpen(false)
    requestAnimationFrame(() => filterTriggerRef.current?.focus({ preventScroll: true }))
  }, [])
  const categoryTitle = {
    rcpc_room: t('nav.rcpcRoom'),
    zen_server: t('nav.zenServer'),
    parts: t('nav.parts'),
  }[productList.catalogSelections.categoryCode ?? ''] ?? (locale === 'ko' ? 'RCPC 상품' : t('nav.rcpcProducts'))

  const setDetailSelection = (id: keyof DetailSelections, values: string[]) => {
    setDetailSelections((current) => ({ ...current, [id]: values }))
  }
  const changePage = (page: number) => {
    setCurrentPage(page)
    requestAnimationFrame(() => resultsToolbarRef.current?.scrollIntoView({ block: 'start' }))
  }
  return (
    <AppShell className="commerce-shell">
      <section aria-label={categoryTitle} className={`products-hero${filterOpen && !filterDrawer ? ' products-hero--filter-open' : ''}`}>
        <h1 className={['products-hero__title', import.meta.env.DEV ? 'notranslate' : ''].filter(Boolean).join(' ')} translate={import.meta.env.DEV ? 'no' : undefined}>{categoryTitle}</h1>
      </section>
      <div className={`products-body${filterOpen && !filterDrawer ? ' products-body--filter-open' : ''}${catalogIsEmpty ? ' products-body--empty' : ''}${isError ? ' products-body--error' : ''}`}>
        {showCatalogControls && !filterOpen && !mobileViewport ? <button disabled={productList.filterMetadataPending} className={import.meta.env.DEV ? 'notranslate product-filter-trigger product-filter-trigger--desktop' : 'product-filter-trigger product-filter-trigger--desktop'} translate={import.meta.env.DEV ? 'no' : undefined} aria-label={t('filter.open')} onClick={() => setFilterOpen(true)} ref={filterTriggerRef} type="button"><img alt="" src={filterChevronBackwardIcon} /></button> : null}
        {filterOpen && filterDrawer ? (
          <DialogLayer
            asChild
            backdropClassName="product-filter-backdrop product-filter-drawer-layer"
            initialFocus="dialog"
            isOpen
            onClose={closeFilter}
            returnFocusRef={filterTriggerRef}
            showTitle={false}
            title="상세 상품 필터"
          >
            <ProductFilter controls={productList} detailSelections={detailSelections} drawer facets={facets} filterRef={filterRef} mobile={mobileViewport} onClose={closeFilter} onDetailSelectionChange={setDetailSelection} />
          </DialogLayer>
        ) : null}
        <div className={`products-layout${filterOpen && !filterDrawer ? ' products-layout--filter-open' : ''}`}>
          {filterOpen && !filterDrawer ? <div className="product-filter-rail"><ProductFilter controls={productList} detailSelections={detailSelections} facets={facets} filterRef={filterRef} onClose={closeFilter} onDetailSelectionChange={setDetailSelection} /></div> : null}
          <section className="products-content">
          {showCatalogControls ? <ProductCatalogFilterControls controls={productList} mobileFilterTrigger={!filterOpen && mobileViewport ? <button disabled={productList.filterMetadataPending} aria-label="모바일 상세 필터 열기" className="product-filter-trigger product-filter-trigger--mobile" onClick={() => setFilterOpen(true)} ref={filterTriggerRef} type="button"><img alt="" src={filterTuneIcon} /></button> : null} /> : null}
          {showCatalogControls ? <div className="product-results-toolbar" ref={resultsToolbarRef}>
            <div><span className={['product-result-count', import.meta.env.DEV ? 'notranslate' : ''].filter(Boolean).join(' ')} translate={import.meta.env.DEV ? 'no' : undefined}>{locale === 'ko' ? <><span>총</span><span><strong>{resultTotal}</strong>개</span><span>상품</span></> : <TranslatedText id="product.totalCount" values={{ count: resultTotal }} />}</span><span className="product-results-toolbar__divider" /><label className="product-availability-switch"><Checkbox disabled={capabilities?.instantOnly === false} aria-label={t('product.instantOnly')} checked={instantOnly} onChange={(event) => setInstantOnly(event.target.checked)} role="switch" variant="switch" /><span className="product-availability-switch__track" aria-hidden="true" /><TranslatedText id="product.instantOnly" /></label></div>
            <div className={['product-view-toggle', import.meta.env.DEV ? 'notranslate' : ''].filter(Boolean).join(' ')} translate={import.meta.env.DEV ? 'no' : undefined}><button aria-label={t('product.cardView')} aria-pressed={view === 'cards'} onClick={() => setView('cards')} type="button"><img alt="" src={viewGridIcon} /></button><button aria-label={t('product.listView')} aria-pressed={view === 'list'} onClick={() => setView('list')} type="button"><img alt="" src={viewListIcon} /></button></div>
          </div> : null}
          {isPending ? <LoadingState label={t('product.loading')} /> : isError ? <div className="product-results-state product-results-state--error" role="alert"><p>{errorMessage}</p><button className="product-results-state__retry" onClick={() => refetch()} type="button"><TranslatedText id="common.retry" /></button></div> : visibleProducts.length === 0 ? <div className="product-list-empty" role="status"><TranslatedText id="product.comingSoon" /></div> : <ProductResults products={visibleProducts} view={view} onAddToCart={addToCart} />}
          {!isPending && !isError && totalPages > 0 ? <Pagination currentPage={currentPage} onPageChange={changePage} totalPages={totalPages} /> : null}
          </section>
        </div>
      </div>
      <Modal closeTranslationKey="cart.continueShopping" confirmTranslationKey="cart.goToCart" titleTranslationKey={cartAddition.isError ? 'cart.addFailureTitle' : 'cart.addSuccessTitle'} onConfirm={cartAddition.isSuccess ? () => navigate('/cart') : undefined} isOpen={cartPopupOpen} onClose={() => setCartPopupOpen(false)}>
        {cartAddition.isError ? <p role="alert">{cartAddition.message}</p> : <p role="status"><TranslatedText id="cart.addedPrompt" /></p>}
      </Modal>
      <Modal closeTranslationKey="common.cancel" confirmTranslationKey="auth.loginAction" titleTranslationKey="auth.loginRequired" isOpen={loginRequiredOpen} onClose={() => setLoginRequiredOpen(false)} onConfirm={() => navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`)}>
        <p><TranslatedText id="auth.loginToPurchase" /></p>
      </Modal>
    </AppShell>
  )
}
