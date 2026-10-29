import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAuthentication } from '../../app/session/AuthProvider'
import { getTranslationLocale, isTranslationLocale, setTranslationLocale, useTranslation } from '../../i18n/translation'
import { LanguageMenu, type LanguageChoice } from './LanguageMenu'
import { trackTranslationToolbarOffset } from './translationToolbarOffset'
import './google-translate-trial.css'

type TranslateWindow = Window & {
  comviewersTranslateReady?: () => void
  google?: { translate?: { TranslateElement: new (options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean }, target: string) => unknown } }
}

const widgetId = 'comviewers-google-translate'
const scriptId = 'comviewers-google-translate-script'
const languageRequestEvent = 'comviewers:translate-language'

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
  pathname = pathname.replace(/\/+$/, '') || '/'
  return pathname === '/' || /^\/(?:products|support)(?:\/[^/]+)?$/.test(pathname)
    || ['/company', '/terms', '/privacy', '/license-notices', '/signup/terms', '/colocation/apply'].includes(pathname)
    || pathname === '/community/posts' || pathname === '/community/reviews'
    || /^\/community\/posts\/(?!new$)[^/]+$/.test(pathname)
}

/** Google translation loads after a language choice on public pages. */
export function GoogleTranslateTrial() {
  const { pathname } = useLocation()
  const { restoring } = useAuthentication()
  // Session restoration can replace the service scope and its header.
  // Start Google only after that replacement, or cleanup can reload every visit.
  if (!isPublicTrialPage(pathname) || restoring) return <ManualTranslationControls />
  return <TranslateWidget />
}

export function ManualTranslationControls({ compact = false }: { compact?: boolean } = {}) {
  const { locale } = useTranslation()
  const { pathname } = useLocation()
  const selectLanguage = (value: LanguageChoice) => {
    // The public widget stays mounted in the desktop utility bar on mobile too.
    if (isPublicTrialPage(pathname) && document.getElementById(widgetId)) {
      document.dispatchEvent(new CustomEvent(languageRequestEvent, { detail: value }))
      return
    }
    clearTranslationCookie()
    setTranslationLocale(value)
  }
  return <div className="google-translate-trial notranslate" translate="no">
    <LanguageMenu locale={locale} triggerLabel={compact ? ({ ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', vi: 'Tiếng Việt' }[locale]) : undefined} onSelect={selectLanguage} />
  </div>
}

function TranslateWidget() {
  const { locale } = useTranslation()
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const started = useRef(false)
  const mounted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const readyCallback = useRef<(() => void) | undefined>(undefined)
  const observer = useRef<MutationObserver | undefined>(undefined)
  const contentObserver = useRef<MutationObserver | undefined>(undefined)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const start = useCallback(() => {
    if (started.current) return
    clearTranslationCookie()
    started.current = true
    setStatus('loading')
    const host = window as TranslateWindow
    let scriptAttempts = 0
    const fail = (reason: 'timeout' | 'script' | 'api' | 'container' | 'widget') => {
      if (!mounted.current) return
      console.warn(`Google translation unavailable: ${reason}`)
      clearTimeout(timer.current)
      observer.current?.disconnect()
      contentObserver.current?.disconnect()
      document.getElementById(scriptId)?.remove()
      document.getElementById(widgetId)?.replaceChildren()
      if (reason === 'script' && scriptAttempts < 2) {
        retryTimer.current = setTimeout(loadScript, 600)
        return
      }
      if (host.comviewersTranslateReady === readyCallback.current) delete host.comviewersTranslateReady
      started.current = false
      if (mounted.current) {
        setStatus('error')
      }
    }
    const initialize = () => {
      if (!mounted.current) return
      // Public policy bodies arrive asynchronously; application inputs stay excluded.
      const path = window.location.pathname.replace(/\/+$/, '')
      if (path === '/signup/terms' || path === '/colocation/apply') {
        const copies = document.querySelectorAll<HTMLElement>(path === '/signup/terms' ? '.auth-page--terms .terms-copy' : '.colocation-terms-box')
        if (!copies.length || Array.from(copies).some(copy => copy.dataset.translationContentReady !== 'true')) {
          contentObserver.current?.disconnect()
          contentObserver.current = new MutationObserver(initialize)
          contentObserver.current.observe(document.getElementById('main-content') ?? document.body, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['data-translation-content-ready'],
          })
          return
        }
      }
      contentObserver.current?.disconnect()
      const TranslateElement = host.google?.translate?.TranslateElement
      if (!TranslateElement) { fail('api'); return }
      try {
        const container = document.getElementById(widgetId)
        if (!container) { fail('container'); return }
        observer.current = new MutationObserver(() => {
          const select = container.querySelector<HTMLSelectElement>('select.goog-te-combo')
          if (!select?.querySelector('option[value="en"]')) return
          clearTimeout(timer.current)
          observer.current?.disconnect()
          if (mounted.current) setStatus('ready')
          const locale = getTranslationLocale()
          if (locale !== 'ko') {
            select.value = locale
            select.dispatchEvent(new Event('change', { bubbles: true }))
          }
        })
        observer.current.observe(container, { childList: true, subtree: true })
        new TranslateElement({ pageLanguage: 'ko', includedLanguages: 'en,ja,zh-CN,zh-TW', autoDisplay: false }, widgetId)
      } catch { fail('widget') }
    }
    readyCallback.current = initialize
    host.comviewersTranslateReady = initialize
    function loadScript() {
      if (!mounted.current) return
      timer.current = setTimeout(() => fail('timeout'), 15000)
      if (host.google?.translate?.TranslateElement) { initialize(); return }
      if (document.getElementById(scriptId)) return
      scriptAttempts += 1
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://translate.google.com/translate_a/element.js?cb=comviewersTranslateReady'
      script.async = true
      script.onerror = () => fail('script')
      document.head.appendChild(script)
    }
    loadScript()
  }, [])

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
    let translatedDocument = false
    const languageTimer = window.setInterval(() => {
      if (!started.current) return
      // Cookies are shared across tabs. Only this document's widget owns its language.
      const value = document.getElementById(widgetId)?.querySelector<HTMLSelectElement>('select.goog-te-combo')?.value
      const translated = document.documentElement.classList.contains('translated-ltr') || document.documentElement.classList.contains('translated-rtl')
      if (translatedDocument && !translated && value === '') setTranslationLocale('ko')
      translatedDocument = translated
      if (value && isTranslationLocale(value)) setTranslationLocale(value)
    }, 500)
    const stopTrackingToolbar = trackTranslationToolbarOffset()
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
    const resumeTimer = window.setTimeout(() => {
      const savedLocale = getTranslationLocale()
      if (savedLocale !== 'ko' && savedLocale !== 'vi') start()
    }, 0)
    return () => {
      mounted.current = false
      window.clearTimeout(resumeTimer)
      document.removeEventListener('change', onLanguageChange, true)
      window.clearInterval(languageTimer)
      clearTimeout(timer.current)
      clearTimeout(retryTimer.current)
      observer.current?.disconnect()
      contentObserver.current?.disconnect()
      stopTrackingToolbar()
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
  }, [start])

  const selectLanguage = useCallback((value: LanguageChoice) => {
    if (value === 'ko') {
      // Restoring a form must not reload and discard unsent fields or attachments.
      if (window.location.pathname.replace(/\/+$/, '') === '/colocation/apply' && started.current) {
        const select = document.getElementById(widgetId)?.querySelector<HTMLSelectElement>('select.goog-te-combo')
        if (select) {
          if (!select.querySelector('option[value="ko"]')) select.add(new Option('한국어', 'ko'))
          select.value = 'ko'
          select.dispatchEvent(new Event('change', { bubbles: true }))
        }
        clearTranslationCookie()
        setTranslationLocale('ko')
        return
      }
      if (started.current) resetTranslation()
      else { clearTranslationCookie(); setTranslationLocale('ko') }
      return
    }
    setTranslationLocale(value)
    if (status === 'ready') {
      const select = document.getElementById(widgetId)?.querySelector<HTMLSelectElement>('select.goog-te-combo')
      if (select) {
        select.value = value
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }
      return
    }
    if (status !== 'loading') start()
  }, [start, status])

  useEffect(() => {
    const onLanguageRequest = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const value: unknown = event.detail
      if (value === 'ko' || value === 'en' || value === 'ja' || value === 'zh-CN' || value === 'zh-TW') selectLanguage(value)
    }
    document.addEventListener(languageRequestEvent, onLanguageRequest)
    return () => document.removeEventListener(languageRequestEvent, onLanguageRequest)
  }, [selectLanguage])

  return <div className="google-translate-trial notranslate" translate="no">
    <LanguageMenu locale={locale} onSelect={selectLanguage} status={status} />
    <div id={widgetId} data-active={status === 'loading' || status === 'ready' ? 'true' : undefined} />
  </div>
}
