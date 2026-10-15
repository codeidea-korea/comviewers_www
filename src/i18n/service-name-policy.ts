export type ServiceNameKind = 'coupon' | 'serverRoom' | 'serverRoomRegion'
export type ServiceNameLocale = 'en' | 'ja' | 'zh-CN' | 'zh-TW'

export function isServiceNameLocale(locale: string): locale is ServiceNameLocale {
  return ['en', 'ja', 'zh-CN', 'zh-TW'].includes(locale)
}

/** A supplementary filter, not a guarantee that an arbitrary name contains no personal data. */
export function canTranslateServiceName(kind: ServiceNameKind, name: string) {
  if (!['coupon', 'serverRoom', 'serverRoomRegion'].includes(kind) || !name.trim() || name !== name.trim() || name.length > 120 || !/[가-힣]/u.test(name)) return false
  if (/[\u0000-\u001f\u007f<>@]/u.test(name)) return false
  if (/(?:https?:\/\/|www\.|\b\d{1,3}(?:\.\d{1,3}){3}\b|\b[a-z0-9-]+\.(?:com|net|org|kr|io)\b)/iu.test(name)) return false
  if (/(?:\d[\s().-]*){7,}/u.test(name)) return false
  if (/(?:bearer\s|\d[\d\s()+.-]{7,}\d|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/iu.test(name)) return false
  return !/(?:password|passwd|token|secret|비밀번호|개인정보|비공개|내부전용|기밀|접속정보|인증키)/iu.test(name)
}

function loopback(host: string) {
  return host === 'localhost' || /^127\.\d+\.\d+\.\d+$/.test(host)
}

// Conservatively reject sibling domains, including multi-label public suffixes.
// A false rejection is preferable to enabling a cookie-sharing translation host.
function cookieSite(host: string) {
  return loopback(host) ? host : host.split('.').slice(-2).join('.')
}

export function serviceNameFrameUrl(): URL | null {
  if (typeof window === 'undefined') return null
  const parent = new URL(window.location.origin)
  const configured = import.meta.env.VITE_NAME_TRANSLATION_FRAME_URL as string | undefined
  const localDefault = import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(parent.hostname)
    ? 'http://127.0.0.2:5317/frame.html' : ''
  try {
    const frame = new URL(configured || localDefault)
    if (frame.username || frame.password || frame.search || frame.hash || frame.pathname !== '/frame.html') return null
    if (frame.origin === parent.origin || cookieSite(frame.hostname) === cookieSite(parent.hostname)) return null
    if (frame.protocol !== 'https:' && !(frame.protocol === 'http:' && loopback(frame.hostname) && loopback(parent.hostname))) return null
    // Never send production names to a developer's loopback service.
    if (!loopback(parent.hostname) && loopback(frame.hostname)) return null
    return frame
  } catch {
    return null
  }
}
