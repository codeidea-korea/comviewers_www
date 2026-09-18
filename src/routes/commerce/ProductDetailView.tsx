import { ProductRefundSection } from './-components/ProductRefundSection'
import { ProductDetailHero } from './-components/ProductDetailHero'
import { ProductReviewSection } from './-components/ProductReviewSection'
import { ProductReviewDialogs } from './-components/ProductReviewDialogs'
import { useProductReviews } from './-components/hooks/useProductReviews'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { AppShell } from '../../components/layout/AppShellView'
import { Modal } from '../../components/ui/ModalControl'
import { Button } from '../../components/ui/ButtonControl'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import productDetailBannerBase from '../../assets/figma/product-detail-banner-base.png'
import productDetailBannerOverlay from '../../assets/figma/product-detail-banner-overlay.png'
import chevronRightIcon from '../../assets/figma/chevron-right.svg'
import { useProductDetail } from './-components/hooks/useProductDetail'
import { useAddToCart } from './-components/hooks/useAddToCart'
import type { Product } from '../../domain/products/types'
import { useSession } from '@/app/session/SessionProvider'
import { useServices } from '@/app/ServiceProvider'
import { cartQueryKeys } from '@/domain/cart/cartRepository'
import { checkoutUrl, checkoutQueryKeys } from '@/domain/checkout/checkoutRepository'
import { LoadingState } from '@/components/ui/LoadingStateControl'

function specRows(product: Product) {
  return [
    ['OS', product.os],
    ['CPU', product.cpu],
    ['RAM', product.ram],
    ['DISK', product.disk],
    ['GPU', product.gpu],
    ['IP', product.ip],
    ['서버실', product.serverRoom],
    ['마우스', product.mouseIncluded === null ? null : product.mouseIncluded ? '제공' : '미제공'],
    ['키보드', product.keyboardIncluded === null ? null : product.keyboardIncluded ? '제공' : '미제공'],
  ] as const
}

export function ProductDetailPage() {
  const { productId } = useParams()
  return <ProductDetailContent key={productId} />
}

function ProductDetailContent() {
  const navigate = useNavigate()
  const cartAddition = useAddToCart()
  const { cart } = useServices()
  const session = useSession()
  const queryClient = useQueryClient()
  const { productId } = useParams()
  const location = useLocation()
  const { data: product, isPending, isError, refetch } = useProductDetail(productId)
  const [message, setMessage] = useState('')
  const reviews = useProductReviews({ productId, onMessage: setMessage })
  const [cartPopupOpen, setCartPopupOpen] = useState(false)
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'guide' | 'reviews' | 'refund'>('guide')
  const directPurchase = useMutation({
    mutationFn: async (rentalPeriods: number) => {
      const items = await cart.add({ productNo: String(product?.productId ?? ''), rentalPeriods })
      const part = product?.pricingType === 'one_time' && product.billingUnit === 'unit'
      const item = items.find((candidate) => candidate.productId === product?.productId && (part
        ? candidate.billingUnit === 'unit' && candidate.durationUnits === null && candidate.quantity === rentalPeriods
        : candidate.durationUnits === rentalPeriods))
      if (!item) throw new Error('주문할 상품을 장바구니에서 확인하지 못했습니다.')
      return item.id
    },
    onSuccess: async (cartItemId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all }),
      ])
      navigate(checkoutUrl([cartItemId]))
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : '바로구매를 시작하지 못했습니다.'),
  })
  useEffect(() => {
    if (!message) return undefined
    const timeoutId = window.setTimeout(() => setMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [message])
  useEffect(() => {
    if (cartAddition.isSuccess || cartAddition.isError) setCartPopupOpen(true)
  }, [cartAddition.isError, cartAddition.isSuccess])

  if (isPending || isError) {
    return <AppShell><section className="not-ready-page product-detail-not-found"><div className="auth-panel auth-panel--result">{isPending ? <LoadingState label="상품을 불러오고 있습니다." /> : <div role="alert"><p>상품 정보를 불러오지 못했습니다.</p><Button onClick={() => refetch()}>다시 시도</Button></div>}</div></section></AppShell>
  }
  if (!product) {
    return (
      <AppShell>
        <section className="not-ready-page product-detail-not-found">
          <div className="auth-panel auth-panel--result">
            <p className="eyebrow">PRODUCT NOT FOUND</p>
            <h1>상품을 찾을 수 없습니다</h1>
            <p>요청하신 상품이 없거나 더 이상 판매되지 않습니다.</p>
            <Button as={Link} size="large" to="/products">상품 목록으로</Button>
          </div>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell className="commerce-shell product-detail-page">
      <div className="content-container product-breadcrumb"><span>HOME</span><img alt="" src={chevronRightIcon} /><span>{product.pricingType === 'one_time' ? '파트 상품' : 'RCPC 상품'}</span></div>
      <ProductDetailHero key={product.id} product={product} message={message} cartPending={cartAddition.isPending} buyPending={directPurchase.isPending} onCart={(rentalPeriods) => {
        if (session.status !== 'authenticated') { setLoginRequiredOpen(true); return }
        cartAddition.add(String(product.productId), rentalPeriods)
      }} onBuy={(rentalPeriods) => {
        if (session.status !== 'authenticated') {
          void navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`)
          return
        }
        directPurchase.mutate(rentalPeriods)
      }} />
      <section className="content-container product-detail-content">
        <nav className="product-tabs"><a aria-current={activeTab === 'guide' ? 'location' : undefined} className={activeTab === 'guide' ? 'is-active' : ''} href="#guide" onClick={() => setActiveTab('guide')}>상품 안내</a><a aria-current={activeTab === 'reviews' ? 'location' : undefined} className={activeTab === 'reviews' ? 'is-active' : ''} href="#reviews" onClick={() => setActiveTab('reviews')}>후기 <b>{reviews.reviewCount}</b></a><a aria-current={activeTab === 'refund' ? 'location' : undefined} className={activeTab === 'refund' ? 'is-active' : ''} href="#refund" onClick={() => setActiveTab('refund')}>환불 규정</a></nav>
        <section id="guide">
          <h2>상품 안내</h2>
          <p>
            품번 : {product.productId}<br />
            품명 : {product.title ?? product.productId}<br />
            내용 : <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{product.description?.trim() || '등록된 상품 설명이 없습니다.'}</span><br />
            {product.detailInformation?.trim() ? <>상세 정보 : <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{product.detailInformation}</span><br /></> : null}
            {product.pricingType !== 'one_time' ? <>추천용도에 따른 제품 사양<br />{specRows(product).map(([label, value]) => <span key={label}>{label} : {value ?? '정보 없음'}<br /></span>)}</> : null}
            유지보수 (AS안내) : 서버실 담당자 문의 기준에 따릅니다.<br />
            {product.pricingType !== 'one_time' ? <>소유권 이전 : 렌탈 상품은 이용기간 동안 접속 권한을 제공하며 소유권 이전은 별도 계약이 없는 한 제공하지 않습니다.<br /></> : null}
            상품의 고장,분실,훼손시 소비자책임 : 상품 이용 중 고객 귀책으로 발생한 고장·분실·훼손은 발행 약관과 서버실 정책에 따릅니다.<br />
            중도해약시 환불기준 : {product.refundPolicy ? `${product.refundPolicy.policyName} ${product.refundPolicy.version}` : '적용 가능한 발행 환불 정책이 없습니다.'}<br />
            소비자상담 연락처 : 고객센터 또는 해당 서버실 담당자에게 문의해 주세요.
          </p>
        </section>
        <ProductReviewSection reviews={reviews} />
        <ProductRefundSection product={product} />
      </section>
      <section className="detail-bottom-banner">
        <img alt="" src={productDetailBannerBase} />
        <img alt="" src={productDetailBannerOverlay} />
        <div className="content-container"><p>지금 필요한 PC 환경을&nbsp; ComViewers에서 바로 이용해보세요.</p></div>
      </section>
      <ProductReviewDialogs product={product} reviews={reviews} />
      <Modal closeLabel="계속 쇼핑하기" confirmLabel="장바구니 이동" onConfirm={cartAddition.isSuccess ? () => navigate('/cart') : undefined} isOpen={cartPopupOpen} onClose={() => setCartPopupOpen(false)} title={cartAddition.isError ? '장바구니 담기 실패' : '장바구니 담기 완료'}>
        {cartAddition.isError ? <p role="alert">{cartAddition.message}</p> : <p role="status">상품을 장바구니에 담았습니다.<br />장바구니로 이동하시겠습니까?</p>}
      </Modal>
      <Modal closeLabel="취소" confirmLabel="로그인하기" isOpen={loginRequiredOpen} onClose={() => setLoginRequiredOpen(false)} onConfirm={() => navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`)} title="로그인이 필요합니다.">
        <p>상품을 구매하려면 로그인해 주세요.<br />로그인 후 구매를 계속할 수 있습니다.</p>
      </Modal>
    </AppShell>
  )
}

