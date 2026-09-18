import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
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
  if (!import.meta.env.DEV || !isPublicTrialPage(pathname)) return null
  return <TranslateWidget />
}

function TranslateWidget() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const started = useRef(false)
  const mounted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const readyCallback = useRef<(() => void) | undefined>(undefined)
  const observer = useRef<MutationObserver | undefined>(undefined)

  useEffect(() => {
    mounted.current = true
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
          if (!container.querySelector('select option[value="en"]')) return
          clearTimeout(timer.current)
          observer.current?.disconnect()
          if (mounted.current) setStatus('ready')
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
    <div id={widgetId} />
    {status === 'error' ? <span className="google-translate-trial__error" role="alert">번역기를 불러오지 못했습니다.</span> : null}
    {status !== 'idle' ? <button type="button" onClick={resetTranslation}>번역 종료</button> : null}
  </div>
}
