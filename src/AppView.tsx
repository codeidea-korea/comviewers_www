import { CustomerCapabilityGate, SessionRouteGate } from './app/session/SessionControls'
import { Route, Routes, useLocation } from 'react-router'
import { RouteErrorBoundary } from './app/RouteErrorBoundary'
import { lazy, Suspense, useLayoutEffect } from 'react'
const LoginPage = lazy(() => import('./routes/auth/LoginPageView').then(module => ({ default: module.LoginPage })))
const RecoveryPages = lazy(() => import('./routes/auth/RecoveryPagesView').then(module => ({ default: module.RecoveryPages })))
const EmailVerificationPage = lazy(() => import('./routes/auth/EmailVerificationPage').then(module => ({ default: module.EmailVerificationPage })))
const SocialLoginCallbackPage = lazy(() => import('./routes/auth/SocialLoginCallbackPage').then(module => ({ default: module.SocialLoginCallbackPage })))
const SignupPages = lazy(() => import('./routes/auth/SignupPagesView').then(module => ({ default: module.SignupPages })))
const HomePage = lazy(() => import('./routes/home/HomePageView').then(module => ({ default: module.HomePage })))
const NotReadyPage = lazy(() => import('./routes/NotReadyPageView').then(module => ({ default: module.NotReadyPage })))
const LegalPage = lazy(() => import('./routes/legal/LegalPage').then(module => ({ default: module.LegalPage })))
const CartPage = lazy(() => import('./routes/commerce/CartPageView').then(module => ({ default: module.CartPage })))
const CheckoutCompletePage = lazy(() => import('./routes/commerce/CheckoutCompleteView').then(module => ({ default: module.CheckoutCompletePage })))
const CheckoutPage = lazy(() => import('./routes/commerce/CheckoutPageView').then(module => ({ default: module.CheckoutPage })))
const ProductDetailPage = lazy(() => import('./routes/commerce/ProductDetailView').then(module => ({ default: module.ProductDetailPage })))
const ProductListPage = lazy(() => import('./routes/commerce/ProductListView').then(module => ({ default: module.ProductListPage })))
const CouponsPage = lazy(() => import('./routes/mypage/CouponsPageView').then(module => ({ default: module.CouponsPage })))
const PointsPage = lazy(() => import('./routes/mypage/PointsPageView').then(module => ({ default: module.PointsPage })))
const StoragePage = lazy(() => import('./routes/mypage/StoragePageView').then(module => ({ default: module.StoragePage })))
const FavoritesPage = lazy(() => import('./routes/mypage/FavoritesPagesView').then(module => ({ default: module.FavoritesPage })))
const InquiryDetailPage = lazy(() => import('./routes/mypage/InquiryPagesView').then(module => ({ default: module.InquiryDetailPage })))
const InquiryListPage = lazy(() => import('./routes/mypage/InquiryPagesView').then(module => ({ default: module.InquiryListPage })))
const ManagersPage = lazy(() => import('./routes/mypage/ManagerPagesView').then(module => ({ default: module.ManagersPage })))
const MypageHomePage = lazy(() => import('./routes/mypage/MypageHomePageView').then(module => ({ default: module.MypageHomePage })))
const OrderDetailPage = lazy(() => import('./routes/mypage/OrderDetailPageView').then(module => ({ default: module.OrderDetailPage })))
const OrdersPage = lazy(() => import('./routes/mypage/OrderPagesView').then(module => ({ default: module.OrdersPage })))
const ProfilePage = lazy(() => import('./routes/mypage/ProfilePageView').then(module => ({ default: module.ProfilePage })))
const RcpcDetailPage = lazy(() => import('./routes/mypage/RcpcPagesView').then(module => ({ default: module.RcpcDetailPage })))
const RcpcListPage = lazy(() => import('./routes/mypage/RcpcPagesView').then(module => ({ default: module.RcpcListPage })))
const ExtensionCheckoutPage = lazy(() => import('./routes/mypage/ExtensionCheckoutPage').then(module => ({ default: module.ExtensionCheckoutPage })))
const ReplacementCheckoutPage = lazy(() => import('./routes/mypage/ReplacementCheckoutPage').then(module => ({ default: module.ReplacementCheckoutPage })))
const CommunityPostDetailPage = lazy(() => import('./routes/community/CommunityPostDetailPageView').then(module => ({ default: module.CommunityPostDetailPage })))
const CommunityPostListPage = lazy(() => import('./routes/community/CommunityPostListPageView').then(module => ({ default: module.CommunityPostListPage })))
const RentalReviewListPage = lazy(() => import('./routes/community/RentalReviewPagesView').then(module => ({ default: module.RentalReviewListPage })))
const ColocationApplyPage = lazy(() => import('./routes/company/ColocationApplyPageView').then(module => ({ default: module.ColocationApplyPage })))
const CompanyAboutPage = lazy(() => import('./routes/company/CompanyAboutPageView').then(module => ({ default: module.CompanyAboutPage })))
const SupportDetailPage = lazy(() => import('./routes/support/SupportPagesView').then(module => ({ default: module.SupportDetailPage })))
const SupportListPage = lazy(() => import('./routes/support/SupportPagesView').then(module => ({ default: module.SupportListPage })))

const CommunityPostCreatePage = lazy(() => import('./routes/community/CommunityPostCreatePageView')
  .then((module) => ({ default: module.CommunityPostCreatePage })))

function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export function App() {
  return (
    <>
    <ScrollToTop />
    <Suspense fallback={<div aria-live="polite" className="route-loading" role="status"><span aria-hidden="true" className="route-loading__indicator" /><span className="sr-only">화면을 불러오는 중입니다.</span></div>}>
      <RouteErrorBoundary><CustomerCapabilityGate><Routes>
      <Route index element={<HomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="email-verification" element={<EmailVerificationPage />} />
      <Route path="auth/social/callback" element={<SocialLoginCallbackPage />} />
      <Route path="signup/terms" element={<SignupPages page="terms" />} />
      <Route path="signup/profile" element={<SignupPages page="profile" />} />
      <Route path="signup/complete" element={<SignupPages page="complete" />} />
      <Route path="account/find-id" element={<RecoveryPages page="find-id" />} />
      <Route path="account/find-id/complete" element={<RecoveryPages page="find-id-complete" />} />
      <Route path="account/find-password" element={<RecoveryPages page="find-password" />} />
      <Route path="account/find-password/sent" element={<RecoveryPages page="password-sent" />} />
      <Route path="account/reset-password" element={<RecoveryPages page="reset-password" />} />
      <Route path="products" element={<ProductListPage />} />
      <Route path="products/:productId" element={<ProductDetailPage />} />
      <Route path="cart" element={<SessionRouteGate requireOrganization><CartPage /></SessionRouteGate>} />
      <Route path="checkout" element={<SessionRouteGate requireOrganization><CheckoutPage /></SessionRouteGate>} />
      <Route path="checkout/complete" element={<SessionRouteGate requireOrganization><CheckoutCompletePage /></SessionRouteGate>} />
      <Route path="community/posts" element={<CommunityPostListPage />} />
      <Route path="community/posts/new" element={<SessionRouteGate><CommunityPostCreatePage /></SessionRouteGate>} />
      <Route path="community/posts/:postId/edit" element={<SessionRouteGate><CommunityPostCreatePage mode="edit" /></SessionRouteGate>} />
      <Route path="community/posts/:postId" element={<CommunityPostDetailPage />} />
      <Route path="community/reviews" element={<RentalReviewListPage />} />
      <Route path="support" element={<SupportListPage />} />
      <Route path="support/:articleId" element={<SupportDetailPage />} />
      <Route path="mypage" element={<SessionRouteGate requireOrganization><MypageHomePage /></SessionRouteGate>} />
      <Route path="mypage/rcpc" element={<SessionRouteGate requireOrganization><RcpcListPage /></SessionRouteGate>} />
      <Route path="mypage/extension-checkout" element={<SessionRouteGate requireOrganization><ExtensionCheckoutPage /></SessionRouteGate>} />
      <Route path="mypage/replacement-checkout/:changeId" element={<SessionRouteGate requireOrganization><ReplacementCheckoutPage /></SessionRouteGate>} />
      <Route path="mypage/rcpc/:rcpcId" element={<SessionRouteGate requireOrganization><RcpcDetailPage /></SessionRouteGate>} />
      <Route path="mypage/favorites" element={<SessionRouteGate requireOrganization><FavoritesPage /></SessionRouteGate>} />
      <Route path="mypage/favorites/settings" element={<SessionRouteGate requireOrganization><FavoritesPage settings /></SessionRouteGate>} />
      <Route path="mypage/orders" element={<SessionRouteGate requireOrganization><OrdersPage /></SessionRouteGate>} />
      <Route path="mypage/orders/:orderId" element={<SessionRouteGate requireOrganization><OrderDetailPage /></SessionRouteGate>} />
      <Route path="mypage/storage" element={<SessionRouteGate requireOrganization><StoragePage /></SessionRouteGate>} />
      <Route path="mypage/points" element={<SessionRouteGate requireOrganization><PointsPage /></SessionRouteGate>} />
      <Route path="mypage/coupons" element={<SessionRouteGate requireOrganization><CouponsPage /></SessionRouteGate>} />
      <Route path="mypage/inquiries" element={<SessionRouteGate requireOrganization><InquiryListPage /></SessionRouteGate>} />
      <Route path="mypage/inquiries/:inquiryId" element={<SessionRouteGate requireOrganization><InquiryDetailPage /></SessionRouteGate>} />
      <Route path="mypage/managers" element={<SessionRouteGate requireOrganization><ManagersPage /></SessionRouteGate>} />
      <Route path="mypage/profile" element={<SessionRouteGate requireOrganization><ProfilePage /></SessionRouteGate>} />
      <Route path="company" element={<CompanyAboutPage />} />
      <Route path="colocation/apply" element={<ColocationApplyPage />} />
      <Route path="terms" element={<LegalPage />} />
      <Route path="privacy" element={<LegalPage privacy />} />
      <Route path="*" element={<NotReadyPage title="페이지를 찾을 수 없습니다" />} />
      </Routes></CustomerCapabilityGate></RouteErrorBoundary>
    </Suspense>
    </>
  )
}


