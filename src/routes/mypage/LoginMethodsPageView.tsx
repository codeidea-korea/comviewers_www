import { useEffect, useState } from 'react'
import { useAuthentication, type SocialAuthProvider } from '@/app/session/AuthProvider'
import { Navigate, useLocation } from 'react-router'
import { clearSocialLink } from '@/routes/auth/socialLinkIntent'

const methods: readonly { provider: SocialAuthProvider; label: string }[] = [
  { provider: 'google', label: '구글' },
  { provider: 'kakao', label: '카카오' },
  { provider: 'naver', label: '네이버' },
]

export function LoginMethodsPage() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  params.set('section', 'login-methods')
  return <Navigate replace to={`/mypage/profile?${params.toString()}`}/>
}

export function LoginMethodsSection() {
  const auth = useAuthentication()
  const [linked, setLinked] = useState<SocialAuthProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => { clearSocialLink() }, [])

  useEffect(() => {
    let active = true
    void auth.linkedSocialProviders()
      .then((providers) => { if (active) setLinked(providers) })
      .catch(() => { if (active) setMessage('연결된 로그인 수단을 불러오지 못했습니다. 다시 시도해 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [auth])

  return <section className="login-methods-panel">
      <header className="login-methods-panel__header">
        <h2>로그인 및 보안</h2>
        <p>가입한 간편 로그인 수단을 확인할 수 있습니다. 기존 계정에 다른 로그인 수단을 추가하는 기능은 지원하지 않습니다.</p>
      </header>
      {loading ? <p role="status">로그인 수단을 확인하고 있습니다.</p> : <ul className="login-methods-panel__list">
        {methods.map(({ provider, label }) => <li key={provider}>
          <span><strong>{label}</strong><small>간편 로그인</small></span>
          <span className="login-methods-panel__status">{linked.includes(provider) ? '사용 중' : '미사용'}</span>
        </li>)}
      </ul>}
      {message ? <p className="login-methods-panel__error" role="alert">{message}</p> : null}
    </section>
}
