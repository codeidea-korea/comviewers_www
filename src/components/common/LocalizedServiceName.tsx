import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useSession, useSessionStore } from '@/app/session/SessionProvider'
import { subscribeServiceName, watchServiceNameSession } from '@/i18n/service-name-client'
import { canTranslateServiceName, isServiceNameLocale, type ServiceNameKind } from '@/i18n/service-name-policy'
import { useTranslation } from '@/i18n/translation'
import { translateUiText } from '@/i18n/uiTranslation'

/** Only explicit coupon, server-room and region name fields belong here. Never pass an account, alias, or joined record. */
export function useLocalizedServiceName(kind: ServiceNameKind, name: string | null | undefined, fallback = '-') {
  const { locale } = useTranslation()
  const { pathname } = useLocation()
  const session = useSession()
  const sessionStore = useSessionStore()
  const source = name || ''
  const registered = translateUiText(source)
  const scope = `${session.status}:${session.scopeRevision}`
  const key = `${scope}:${locale}:${kind}:${source}`
  const [result, setResult] = useState({ key: '', text: '' })
  useEffect(() => {
    watchServiceNameSession(sessionStore)
    const allowedPage = /^\/mypage(?:\/|$)/u.test(pathname) || (kind === 'coupon' && /^\/checkout\/?$/u.test(pathname))
    if (session.status !== 'authenticated' || !allowedPage || !isServiceNameLocale(locale)
      || registered !== source || !canTranslateServiceName(kind, source)) return
    return subscribeServiceName(scope, locale, source, text => setResult({ key, text }))
  }, [key, kind, locale, pathname, registered, scope, session.status, sessionStore, source])
  return !source ? fallback : registered !== source ? registered : result.key === key ? result.text : source
}

export function LocalizedServiceName({ kind, name, fallback = '-' }: {
  kind: ServiceNameKind; name: string | null | undefined; fallback?: ReactNode
}) {
  const text = useLocalizedServiceName(kind, name, '')
  // Preserve the original DOM shape so existing descendant selectors cannot restyle the name.
  return <>{text || fallback}</>
}
