import type { SocialAuthProvider } from '@/app/session/AuthProvider'

const storageKey = 'comviewers.auth.pending-social-link'
const lifetimeMs = 10 * 60 * 1000

export function socialLinkProvider(value: string | null): SocialAuthProvider | null {
  return value === 'google' || value === 'kakao' || value === 'naver' ? value : null
}

export function socialLinkDestination(provider: SocialAuthProvider): string {
  return `/mypage/login-methods?connect=${provider}`
}

export function rememberSocialLink(provider: SocialAuthProvider): void {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ provider, expiresAt: Date.now() + lifetimeMs })) }
  catch { /* A blocked storage API must not prevent ordinary login. */ }
}

export function pendingSocialLink(): SocialAuthProvider | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return null
    const candidate: unknown = JSON.parse(raw)
    if (typeof candidate !== 'object' || candidate === null) return null
    const { provider, expiresAt } = candidate as Record<string, unknown>
    const validProvider = typeof provider === 'string' ? socialLinkProvider(provider) : null
    return validProvider && typeof expiresAt === 'number' && expiresAt > Date.now() ? validProvider : null
  } catch { return null }
}

export function clearSocialLink(): void {
  try { sessionStorage.removeItem(storageKey) }
  catch { /* Storage may be unavailable in a restricted browser. */ }
}
