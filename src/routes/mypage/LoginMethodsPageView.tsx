import { useEffect, useState } from 'react'
import { useAuthentication, type SocialAuthProvider } from '@/app/session/AuthProvider'
import { MyPageLayout } from './MypageComponentsView'
import { useSearchParams } from 'react-router'
import { clearSocialLink, socialLinkProvider } from '@/routes/auth/socialLinkIntent'

const methods: readonly { provider: SocialAuthProvider; label: string }[] = [
  { provider: 'google', label: 'Google' },
  { provider: 'kakao', label: 'Kakao' },
  { provider: 'naver', label: 'Naver' },
]

export function LoginMethodsPage() {
  const auth = useAuthentication()
  const [params] = useSearchParams()
  const connecting = socialLinkProvider(params.get('connect'))
  const connectingLabel = methods.find((method) => method.provider === connecting)?.label
  const [linked, setLinked] = useState<SocialAuthProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<SocialAuthProvider | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (connecting) clearSocialLink()
  }, [connecting])

  useEffect(() => {
    let active = true
    void auth.linkedSocialProviders()
      .then((providers) => { if (active) setLinked(providers) })
      .catch(() => { if (active) setMessage('연결된 로그인 수단을 불러오지 못했습니다. 다시 시도해 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [auth])

  async function connect(provider: SocialAuthProvider) {
    if (!confirmed || pending) return
    setPending(provider)
    setMessage('')
    try {
      await auth.startSocialLink(provider)
    } catch {
      setMessage('계정을 연결하지 못했습니다. 기존 계정으로 다시 로그인한 뒤 5분 이내에 시도해 주세요.')
      setPending(null)
    }
  }

  return <MyPageLayout title="로그인 수단 관리">
    <section style={{ maxWidth: 720, paddingBlock: 24 }}>
      <h2>연결된 로그인 수단</h2>
      {connectingLabel ? <p role="status">기존 계정으로 로그인했습니다. {connectingLabel} 계정을 이 회원 계정에 연결하려면 아래에서 동의하고 연결해 주세요.</p> : null}
      <p>기존 계정에 다른 간편 로그인을 연결하면, 어느 수단으로 로그인해도 같은 회원 정보를 사용합니다.</p>
      {loading ? <p role="status">로그인 수단을 확인하고 있습니다.</p> : <ul style={{ listStyle: 'none', padding: 0 }}>
        {methods.filter(({ provider }) => !connecting || provider === connecting).map(({ provider, label }) => <li key={provider} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBlock: 16, borderBottom: '1px solid #e6e6e6' }}>
          <span>{label}</span>
          {linked.includes(provider) ? <span>연결됨</span> : <button className="button button--primary" disabled={!confirmed || pending !== null} onClick={() => void connect(provider)} type="button">연결하기</button>}
        </li>)}
      </ul>}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
        <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
        <span>선택한 간편 로그인 계정을 현재 회원에 연결하는 데 동의합니다.</span>
      </label>
      <p>보안을 위해 기존 계정으로 로그인한 지 5분 이내에만 연결할 수 있습니다.</p>
      {message ? <p role="alert" style={{ color: '#d32f2f' }}>{message}</p> : null}
    </section>
  </MyPageLayout>
}
