import { serviceNameFrameUrl, type ServiceNameLocale } from './service-name-policy'
import { getTranslationLocale, subscribeTranslation } from './translation-core'

type Listener = (value: string) => void
type Entry = { key: string; source: string; locale: ServiceNameLocale; listeners: Set<Listener>; attempts: number }
type Cached = { value: string; expiresAt: number }
type NameSessionStore = {
  getSnapshot(): { readonly status: string; readonly scopeRevision: number }
  subscribe(listener: () => void): () => void
}
const entries = new Map<string, Entry>()
const cache = new Map<string, Cached>()
const failedUntil = new Map<string, number>()
let queued = new Set<string>()
let timer: ReturnType<typeof setTimeout> | undefined
let cancelActive: (() => void) | undefined
let activeEntries: readonly Entry[] = []
let context = ''
let idleTimer: ReturnType<typeof setTimeout> | undefined
let observedStore: NameSessionStore | undefined
let stopSession: (() => void) | undefined
let stopLocale: (() => void) | undefined
const timeoutMs = 30_000

function releaseIdleCache() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    idleTimer = undefined
    if (entries.size) return
    cache.clear()
    failedUntil.clear()
    stopSession?.()
    stopLocale?.()
    stopSession = undefined
    stopLocale = undefined
    observedStore = undefined
  }, 3_000)
}

function clearWhenUnused() {
  if (entries.size) return
  cancelActive?.()
  clearTimeout(timer)
  timer = undefined
  queued = new Set()
  // Keep only completed text across a short route transition, never an active frame.
  releaseIdleCache()
}

/** Session/language changes cannot display or accept an older batch. No data is persisted. */
function ensureContext(next: string) {
  if (context === next) return
  cancelActive?.()
  clearTimeout(timer)
  timer = undefined
  entries.clear()
  cache.clear()
  failedUntil.clear()
  queued = new Set()
  context = next
  releaseIdleCache()
}

/** Observe logout/language changes even when no new eligible name subscribes. */
export function watchServiceNameSession(store: NameSessionStore) {
  if (observedStore === store) return
  stopSession?.()
  stopLocale?.()
  observedStore = store
  ensureContext('')
  const update = () => {
    const session = store.getSnapshot()
    ensureContext(`${session.status}:${session.scopeRevision}:${getTranslationLocale()}`)
  }
  stopSession = store.subscribe(update)
  stopLocale = subscribeTranslation(update)
  update()
}

function schedule(delay = 60) {
  if (timer || cancelActive || !queued.size) return
  timer = setTimeout(() => { timer = undefined; flush() }, delay)
}

function store(key: string, value: string) {
  cache.delete(key)
  cache.set(key, { value, expiresAt: Date.now() + 5 * 60_000 })
  if (cache.size > 200) cache.delete(cache.keys().next().value as string)
  entries.get(key)?.listeners.forEach(listener => listener(value))
}

function retryOrRetainOriginal(entry: Entry) {
  const current = entries.get(entry.key)
  if (!current || current !== entry || !current.listeners.size) return
  if (entry.attempts < 2) {
    queued.add(entry.key)
    return
  }
  failedUntil.set(entry.key, Date.now() + 60_000)
  if (failedUntil.size > 200) failedUntil.delete(failedUntil.keys().next().value as string)
}

function flush() {
  const url = serviceNameFrameUrl()
  if (!url) { queued = new Set(); return }
  const first = Array.from(queued).map(key => entries.get(key)).find(entry => entry?.listeners.size)
  if (!first) { queued = new Set(); return }
  const batch = Array.from(queued).map(key => entries.get(key))
    .filter((entry): entry is Entry => Boolean(entry?.listeners.size && entry.locale === first.locale)).slice(0, 20)
  batch.forEach(entry => { queued.delete(entry.key); entry.attempts += 1 })
  startFrame(url, batch)
}

function startFrame(url: URL, batch: readonly Entry[]) {
  const requestId = crypto.randomUUID()
  url.hash = new URLSearchParams({ request: requestId }).toString()
  const frame = document.createElement('iframe')
  frame.title = 'Google Translate — service names only'
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'")
  frame.referrerPolicy = 'no-referrer'
  frame.tabIndex = -1
  // An offscreen/display:none document did not translate in the widget experiment.
  // Keep the isolated translation layout in the viewport without affecting the app layout.
  Object.assign(frame.style, { position: 'fixed', left: '0', top: '0', width: '600px', height: '350px', opacity: '0', pointerEvents: 'none', border: '0' })
  let finished = false
  let started = false
  let timeout: ReturnType<typeof setTimeout>
  const completed = new Set<Entry>()
  const publish = (values: readonly unknown[]) => batch.forEach((entry, index) => {
    const value = values[index]
    if (typeof value !== 'string' || !value.trim() || value.length > 600 || value === entry.source
      || /[\u0000-\u001f\u007f<>가-힣]/u.test(value) || entries.get(entry.key) !== entry) return
    completed.add(entry)
    if (cache.get(entry.key)?.value !== value) store(entry.key, value)
  })
  const finish = (values?: readonly unknown[], cancelled = false) => {
    if (finished) return
    finished = true
    clearTimeout(timeout)
    window.removeEventListener('message', receive)
    frame.remove()
    cancelActive = undefined
    activeEntries = []
    if (!cancelled) {
      if (values) publish(values)
      batch.forEach(entry => { if (!completed.has(entry)) retryOrRetainOriginal(entry) })
    }
    schedule(100)
  }
  const receive = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || event.origin !== url.origin) return
    const data: unknown = event.data
    if (!data || typeof data !== 'object') return
    const message = data as { requestId?: unknown; type?: unknown; values?: unknown }
    if (message.requestId !== requestId) return
    if (message.type === 'comviewers:name-translation:ready' && !started) {
      started = true
      frame.contentWindow?.postMessage({ type: 'comviewers:name-translation:start', requestId, locale: batch[0].locale, names: batch.map(entry => entry.source) }, url.origin)
    } else if (started && (message.type === 'comviewers:name-translation:progress' || message.type === 'comviewers:name-translation:result')
      && Array.isArray(message.values) && message.values.length === batch.length) {
      if (message.type === 'comviewers:name-translation:progress') publish(message.values)
      else finish(message.values)
    } else if (message.type === 'comviewers:name-translation:error') finish()
  }
  cancelActive = () => finish(undefined, true)
  activeEntries = batch
  window.addEventListener('message', receive)
  timeout = setTimeout(() => finish(), timeoutMs)
  frame.src = url.href
  document.body.append(frame)
}

export function subscribeServiceName(scope: string, locale: ServiceNameLocale, source: string, listener: Listener) {
  ensureContext(`${scope}:${locale}`)
  if (!serviceNameFrameUrl()) return () => {}
  clearTimeout(idleTimer)
  idleTimer = undefined
  const key = `${locale}:${source}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) listener(cached.value)
  else cache.delete(key)
  const entry = entries.get(key) ?? { key, source, locale, listeners: new Set<Listener>(), attempts: 0 }
  entry.listeners.add(listener)
  entries.set(key, entry)
  // A remounted name is a new subscription entry, even if an older frame still has that text.
  // Existing queued/active entries retain their retry budget when another subscriber joins.
  if (!cache.has(key) && !activeEntries.includes(entry) && !queued.has(key)
    && (failedUntil.get(key) ?? 0) <= Date.now() && queued.size < 100) {
    entry.attempts = 0
    queued.add(key)
    schedule()
  }
  return () => {
    entry.listeners.delete(listener)
    if (!entry.listeners.size && entries.get(key) === entry) {
      entries.delete(key)
      queued.delete(key)
    }
    if (cancelActive && activeEntries.every(active => entries.get(active.key) !== active || !active.listeners.size)) cancelActive()
    clearWhenUnused()
  }
}
