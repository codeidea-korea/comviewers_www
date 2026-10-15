(() => {
  'use strict'

  const prefix = 'comviewers:name-translation:'
  const parameters = new URLSearchParams(window.location.hash.slice(1))
  const requestId = parameters.get('request')
  if (window.parent === window || parameters.size !== 1 || !requestId || !/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) return

  const configuredOrigins = document.querySelector('meta[name="comviewers-name-parent-origins"]')?.content ?? ''
  const parentOrigins = configuredOrigins.split(',').map(value => value.trim()).filter(value => {
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value && url.hostname !== location.hostname
    } catch { return false }
  })
  if (!parentOrigins.length) return

  const locales = ['en', 'ja', 'zh-CN', 'zh-TW']
  const widget = document.getElementById('name-translation-widget')
  const list = document.getElementById('catalog-names')
  let accepted = false
  let finished = false
  let selected = false
  let recipient
  let originals = []
  let rows = []
  let deadline
  let settleTimer
  let namesObserver
  let widgetObserver
  let selectedAt = 0
  let lastProgressValues = []

  const post = (type, extra = {}) => {
    if (recipient) parent.postMessage({ type: prefix + type, requestId, ...extra }, recipient)
  }

  function cleanup() {
    clearTimeout(deadline)
    clearTimeout(settleTimer)
    namesObserver?.disconnect()
    widgetObserver?.disconnect()
    window.removeEventListener('message', receive)
    delete window.comviewersNameTranslationReady
  }

  function fail() {
    if (finished) return
    finished = true
    cleanup()
    post('error')
  }

  function translatedValues() {
    return rows.map((row, index) => {
      const value = row.textContent?.trim() ?? ''
      return value && value.length <= 600 && value !== originals[index]
        && !/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u.test(value)
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ? value : null
    })
  }

  function complete() {
    if (finished) return
    const values = selected ? translatedValues() : originals.map(() => null)
    finished = true
    cleanup()
    post('result', { values })
  }

  function scheduleResult() {
    if (!selected || finished) return
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      if (Date.now() - selectedAt < 300) { scheduleResult(); return }
      const values = translatedValues()
      if (values.some(value => value !== null) && values.some((value, index) => value !== lastProgressValues[index])) {
        lastProgressValues = [...values]
        post('progress', { values })
      }
      if (values.every(value => value !== null)) complete()
    }, 150)
  }

  function selectLocale(locale) {
    if (selected || finished) return
    const select = widget.querySelector('select.goog-te-combo')
    if (!(select instanceof HTMLSelectElement) || !Array.from(select.options).some(option => option.value === locale)) return
    selected = true
    selectedAt = Date.now()
    select.value = locale
    select.dispatchEvent(new Event('change', { bubbles: true }))
    widgetObserver.disconnect()
    scheduleResult()
  }

  function validName(name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 120 && name === name.trim()
      && !/[\u0000-\u001f\u007f@]/.test(name)
      && !/(?:https?:\/\/|www\.|bearer\s|\d[\d\s()+.-]{7,}\d)/i.test(name)
      && !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(name)
  }

  function start(locale, names) {
    try {
      // The frame has its own cookie host. Remove the previous widget's language.
      document.cookie = 'googtrans=; Max-Age=0; Path=/'
      if (!location.hostname.includes(':')) document.cookie = `googtrans=; Max-Age=0; Path=/; Domain=${location.hostname}`
      originals = [...names]
      rows = names.map(name => {
        const row = document.createElement('li')
        row.textContent = name
        return row
      })
      list.replaceChildren(...rows)
      namesObserver = new MutationObserver(scheduleResult)
      namesObserver.observe(list, { childList: true, subtree: true, characterData: true })
      widgetObserver = new MutationObserver(() => selectLocale(locale))
      widgetObserver.observe(widget, { childList: true, subtree: true })
      deadline = setTimeout(complete, 20000)
      window.comviewersNameTranslationReady = () => {
        if (finished) return
        try {
          const TranslateElement = window.google?.translate?.TranslateElement
          if (!TranslateElement) { fail(); return }
          new TranslateElement({ pageLanguage: 'ko', includedLanguages: locales.join(','), autoDisplay: false }, widget.id)
          selectLocale(locale)
        } catch { fail() }
      }
      const script = document.createElement('script')
      script.src = 'https://translate.google.com/translate_a/element.js?cb=comviewersNameTranslationReady'
      script.async = true
      script.onerror = fail
      document.head.append(script)
    } catch { fail() }
  }

  function receive(event) {
    if (accepted || event.source !== parent || !parentOrigins.includes(event.origin)) return
    const data = event.data
    if (!data || data.type !== prefix + 'start' || data.requestId !== requestId) return
    recipient = event.origin
    if (!locales.includes(data.locale) || !Array.isArray(data.names) || data.names.length < 1
      || data.names.length > 20 || !data.names.every(validName)) { fail(); return }
    accepted = true
    start(data.locale, data.names)
  }

  window.addEventListener('message', receive)
  for (const origin of parentOrigins) parent.postMessage({ type: prefix + 'ready', requestId }, origin)
})()
