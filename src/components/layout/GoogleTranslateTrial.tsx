import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { getTranslationLocale, isTranslationLocale, setTranslationLocale, useTranslation } from '../../i18n/translation'
import './google-translate-trial.css'

type TranslateWindow = Window & {
  comviewersTranslateReady?: () => void
  google?: { translate?: { TranslateElement: new (options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean }, target: string) => unknown } }
}

const widgetId = 'comviewers-google-translate'
const scriptId = 'comviewers-google-translate-script'

function clearTranslationCookie() {
  document.cookie = 'googtrans=; Max-Age=0; Path=/'
  document.cookie = `googtrans=; Max-Age=0; Path=/; Domain=${window.location.hostname}`
}

function resetTranslation() {
  setTranslationLocale('ko')
  clearTranslationCookie()
  window.location.reload()
}

function isPublicTrialPage(pathname: string) {
  return pathname === '/' || /^\/(?:products|support)(?:\/[^/]+)?$/.test(pathname)
    || ['/company', '/terms', '/privacy'].includes(pathname)
}

/** Development-only trial. Loading requires an explicit click on a public page. */
export function GoogleTranslateTrial() {
  const { pathname } = useLocation()
  if (!import.meta.env.DEV) return null
  if (!isPublicTrialPage(pathname)) return <ManualTranslationControls />
  return <TranslateWidget />
}

export function ManualTranslationControls() {
  const { locale } = useTranslation()
  if (!import.meta.env.DEV) return null
  return <div className="google-translate-trial notranslate" translate="no">
    <select aria-label="페이지 번역 언어" value={locale} onChange={event => { clearTranslationCookie(); setTranslationLocale(event.target.value) }}>
      <option value="ko">한국어</option><option value="vi">Tiếng Việt</option>
      <option value="ja">日本語</option><option value="en">English</option>
      <option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option>
    </select>
    {locale !== 'ko' ? <button type="button" onClick={() => { clearTranslationCookie(); setTranslationLocale('ko') }}>번역 종료</button> : null}
  </div>
}

function googleLanguageCookie() {
  return document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('googtrans=')) ?? ''
}

function TranslateWidget() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const started = useRef(false)
  const mounted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const readyCallback = useRef<(() => void) | undefined>(undefined)
  const observer = useRef<MutationObserver | undefined>(undefined)
  const languageCookie = useRef('')

  useEffect(() => {
    mounted.current = true
    // Capture the language, not translated text or account data.
    const onLanguageChange = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLSelectElement && target.matches(`#${widgetId} .goog-te-combo`)) {
        setTranslationLocale(target.value)
      }
    }
    document.addEventListener('change', onLanguageChange, true)
    languageCookie.current = googleLanguageCookie()
    const languageTimer = window.setInterval(() => {
      if (!started.current) return
      const nextCookie = googleLanguageCookie()
      if (nextCookie === languageCookie.current) return
      languageCookie.current = nextCookie
      const value = nextCookie.split('/').at(-1) ?? ''
      // Google's own "Show original" control may clear the cookie without a select event.
      setTranslationLocale(isTranslationLocale(value) ? value : 'ko')
    }, 500)
    const syncToolbarOffset = () => {
      const offset = Math.max(0, Number.parseFloat(document.body.style.top) || 0)
      document.documentElement.style.setProperty('--google-trial-bar-height', `${offset}px`)
    }
    const toolbarObserver = new MutationObserver(syncToolbarOffset)
    toolbarObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    syncToolbarOffset()
    const followLink = (event: MouseEvent) => {
      if (!started.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self') || anchor.getAttribute('aria-disabled') === 'true') return
      if (anchor.getAttribute('href')?.startsWith('#')) return
      const target = new URL(anchor.href)
      if (target.origin !== window.location.origin || (target.pathname === window.location.pathname && target.search === window.location.search && target.hash)) return
      event.preventDefault()
      event.stopPropagation()
      if (!isPublicTrialPage(target.pathname)) clearTranslationCookie()
      window.location.assign(target.href)
    }
    document.addEventListener('click', followLink, true)
    return () => {
      mounted.current = false
      document.removeEventListener('change', onLanguageChange, true)
      window.clearInterval(languageTimer)
      clearTimeout(timer.current)
      observer.current?.disconnect()
      toolbarObserver.disconnect()
      document.documentElement.style.removeProperty('--google-trial-bar-height')
      document.removeEventListener('click', followLink, true)
      const host = window as TranslateWindow
      if (host.comviewersTranslateReady === readyCallback.current) delete host.comviewersTranslateReady
      // Google changes React-owned DOM and has no supported destroy API.
      // A fresh document removes the translator before a different route mounts.
      if (started.current) {
        clearTranslationCookie()
        window.location.reload()
      }
    }
  }, [])

  const start = () => {
    if (started.current) return
    clearTranslationCookie()
    languageCookie.current = googleLanguageCookie()
    started.current = true
    setStatus('loading')
    const host = window as TranslateWindow
    const fail = () => {
      clearTimeout(timer.current)
      observer.current?.disconnect()
      if (mounted.current) setStatus('error')
    }
    const initialize = () => {
      if (!mounted.current) return
      const TranslateElement = host.google?.translate?.TranslateElement
      if (!TranslateElement) { fail(); return }
      try {
        const container = document.getElementById(widgetId)
        if (!container) { fail(); return }
        observer.current = new MutationObserver(() => {
          const select = container.querySelector<HTMLSelectElement>('select.goog-te-combo')
          if (!select?.querySelector('option[value="en"]')) return
          clearTimeout(timer.current)
          observer.current?.disconnect()
          if (mounted.current) setStatus('ready')
          const locale = getTranslationLocale()
          if (locale !== 'ko' && select.value !== locale) {
            select.value = locale
            select.dispatchEvent(new Event('change', { bubbles: true }))
          }
        })
        observer.current.observe(container, { childList: true, subtree: true })
        new TranslateElement({ pageLanguage: 'ko', includedLanguages: 'en,ja,zh-CN,zh-TW,vi', autoDisplay: false }, widgetId)
      } catch { fail() }
    }
    readyCallback.current = initialize
    host.comviewersTranslateReady = initialize
    timer.current = setTimeout(fail, 15000)
    if (host.google?.translate?.TranslateElement) { initialize(); return }
    if (document.getElementById(scriptId)) return
    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://translate.google.com/translate_a/element.js?cb=comviewersTranslateReady'
    script.async = true
    script.onerror = fail
    document.head.appendChild(script)
  }

  return <div className="google-translate-trial notranslate" translate="no">
    {status === 'idle' ? <button type="button" onClick={start}>🌐 페이지 번역</button> : null}
    {status === 'loading' ? <span role="status">번역기 불러오는 중…</span> : null}
    <div id={widgetId} data-active={status !== 'idle' ? 'true' : undefined} />
    {status === 'error' ? <span className="google-translate-trial__error" role="alert">번역기를 불러오지 못했습니다.</span> : null}
    {status !== 'idle' ? <button type="button" onClick={resetTranslation}>번역 종료</button> : null}
  </div>
}
