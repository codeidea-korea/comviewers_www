import { useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useSession, useSessionStore } from './SessionProvider'
import { useAuthentication } from './AuthProvider'
import type { SessionRole } from './sessionStore'
import { Modal } from '../../components/ui/ModalControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import userIcon from '../../assets/figma/icon-user.png'
import { isMyPageOnlyPathAllowed, loginPathWithReturnTo } from './sessionRouteNavigation'
import './session.css'

export function OrganizationSelector() {
  const session = useSession()
  const store = useSessionStore()
  const [error, setError] = useState('')
  if (session.status !== 'authenticated') return null
  if (!session.organizationIds.length) return <span>이용 가능한 조직이 없습니다.</span>
  if (session.organizationIds.length === 1) return null
  return <label className="session-organization">이용 조직
    <select value={session.organizationId ?? ''} onChange={event => {
      try { store.selectOrganization(event.target.value || null); setError('') }
      catch { setError('조직을 선택할 수 없습니다. 다시 로그인해 주세요.') }
    }}>
      <option value="">조직 선택</option>
      {session.organizationIds.map(id => {
        const organization = session.organizations.find(item => item.id === id)
        return <option key={id} value={id}>{organization ? `${organization.name} · ${organization.role === 'owner' ? '대표 관리자' : '담당자'}` : `조직 ${id}`}</option>
      })}
    </select>
    {error && <span role="alert">{error}</span>}
  </label>
}
export function SessionControls({ loginLabel = '로그인' }: { loginLabel?: string } = {}) {
  const session = useSession()
  const auth = useAuthentication()
  const [error, setError] = useState('')
  if (auth.restoring) return <span className="session-controls" role="status"><span aria-hidden="true" className="route-loading__indicator" /><span className="sr-only">로그인 상태를 확인하고 있습니다.</span></span>
  if (session.status === 'anonymous') return <span className="session-controls"><Link to="/login">{loginLabel}</Link>{auth.logoutNotice && <span role="status">{auth.logoutNotice}</span>}</span>
  if (session.status === 'password-change-required') return <span className="session-controls"><span>비밀번호 변경 필요</span><button type="button" onClick={() => { void auth.logout().catch(() => setError('로그아웃 상태를 다시 확인해 주세요.')) }}>로그아웃</button>{error && <span role="alert">{error}</span>}</span>
  const displayName = session.customerSession?.displayName?.trim() || '회원'
  return <span className="session-controls">
    <details className="session-user-menu">
      <summary><img alt="" aria-hidden="true" src={userIcon} /><span>{displayName}</span></summary>
      <div>
        <OrganizationSelector />
        <Link to="/mypage">마이페이지</Link>
        <button type="button" onClick={() => { void auth.logout().catch(() => setError('로그아웃 상태를 다시 확인해 주세요.')) }}>로그아웃</button>
      </div>
    </details>
    {error && <span role="alert">{error}</span>}
  </span>
}
export function SessionNotice({ recoveryPath }: { recoveryPath?: string }) {
  const session = useSession()
  return session.status === 'password-change-required' ? <div className="session-notice" role="status">
    <p>비밀번호를 변경한 후 다시 로그인해 주세요.</p>
    {recoveryPath ? <Link to={recoveryPath}>비밀번호 찾기</Link> : <p>계정 관리자에게 비밀번호 변경을 요청해 주세요.</p>}
    <SessionControls />
  </div> : null
}

function LoginRequiredModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const goToLogin = () => navigate(loginPathWithReturnTo(location), { replace: true })

  return <Modal
    confirmLabel="로그인하기"
    isOpen
    onClose={goToLogin}
    onConfirm={goToLogin}
    showClose={false}
    title="로그인이 필요합니다."
  >
    <p>로그인 후 이용할 수 있는 페이지입니다.</p>
  </Modal>
}

export function SessionRouteGate({ children, roles, requireOrganization = false, recoveryPath }: {
  children: ReactNode; roles?: readonly SessionRole[]; requireOrganization?: boolean; recoveryPath?: string
}) {
  const session = useSession()
  const { accessMode, restoring } = useAuthentication()
  if (accessMode === 'preview') return children
  if (restoring) return <main className="session-notice"><LoadingState label="로그인 상태를 확인하고 있습니다." /></main>
  if (session.status === 'password-change-required') return <SessionNotice recoveryPath={recoveryPath} />
  if (session.status === 'anonymous' || Date.now() >= session.expiresAt) return <LoginRequiredModal />
  if (roles && !roles.includes(session.role)) return <main className="session-notice"><p>이 페이지를 이용할 권한이 없습니다.</p><SessionControls /></main>
  if (requireOrganization && session.organizationId === null) return <main className="session-notice"><p>이용할 조직을 선택해 주세요.</p><SessionControls /></main>
  if (requireOrganization && (session.capabilityStatus !== 'ready' || !session.customerSession)) return <main className="session-notice"><LoadingState label="이용 권한을 확인하고 있습니다." /></main>
  return children
}


/** Selected-organization capabilities are required before rendering authenticated customer screens. */
export function CustomerCapabilityGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const store = useSessionStore()
  const { accessMode, restoring } = useAuthentication()
  const { pathname } = useLocation()
  if (accessMode === 'preview' || session.status !== 'authenticated') return children
  const communityWriteRoute = /^\/community\/posts\/(?:new|[^/]+\/edit)(?:\/|$)/.test(pathname)
  const protectedCustomerRoute = /^\/(cart|checkout)(?:\/|$)/.test(pathname) || /^\/mypage(?:\/|$)/.test(pathname) || communityWriteRoute
  if (!protectedCustomerRoute) return children
  if (restoring || (session.organizationId && session.capabilityStatus === 'pending')) return <main className="session-notice"><LoadingState label="이용 권한을 확인하고 있습니다." /></main>
  if (!session.organizationId) return <main className="session-notice"><p>이용할 조직을 선택해 주세요.</p><SessionControls /></main>
  if (session.capabilityStatus !== 'ready' || !session.customerSession) return <main className="session-notice"><p role="alert">이용 권한을 확인하지 못했습니다.</p><button type="button" onClick={() => store.retryCustomerSession()}>다시 시도</button><SessionControls /></main>
  const capability = session.customerSession
  if (capability.myPageOnly && communityWriteRoute) return <Navigate to="/community/posts" replace />
  if (capability.myPageOnly && !isMyPageOnlyPathAllowed(pathname)) return <Navigate to="/mypage/rcpc" replace />
  const commerceRoute = /^\/(cart|checkout)(?:\/|$)/.test(pathname) || /^\/mypage\/(orders|storage|points|coupons|extension-checkout|replacement-checkout)(?:\/|$)/.test(pathname)
  const managersRoute = /^\/mypage\/managers(?:\/|$)/.test(pathname)
  if ((commerceRoute && !capability.commerceAvailable) || (managersRoute && !capability.cManagerManagementAvailable)) return <main className="session-notice"><p>이 페이지를 이용할 권한이 없습니다.</p><Link to="/mypage/rcpc">이용 RCPC로 이동</Link><SessionControls /></main>
  return children
}
