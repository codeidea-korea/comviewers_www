import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function isLoopback(hostname) {
  if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') return true
  const pieces = hostname.split('.')
  return pieces.length === 4 && pieces[0] === '127' && pieces.every(piece => /^\d{1,3}$/.test(piece) && Number(piece) <= 255)
}

const escapeAttribute = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
// Legacy widget domains are confined to this unauthenticated document, never the app.
const googleSources = 'https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com'

/** Starts only this unauthenticated static server; importing the module has no effects. */
export async function startNameTranslationServer(options = {}) {
  const requestedHost = options.host ?? process.env.NAME_TRANSLATION_HOST ?? '127.0.0.2'
  if (!isLoopback(requestedHost)) throw new Error('The catalog-name static server must bind only to a loopback address.')
  const host = requestedHost === 'localhost' ? '127.0.0.1' : requestedHost.replace(/^\[|\]$/g, '')
  const portText = String(options.port ?? process.env.NAME_TRANSLATION_PORT ?? '5317')
  const port = Number(portText)
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid catalog-name static server port.')

  const originSetting = options.parentOrigins ?? process.env.NAME_TRANSLATION_PARENT_ORIGINS ?? 'http://127.0.0.1:5301,http://localhost:5301'
  if (/[\r\n]/.test(originSetting)) throw new Error('Invalid catalog-name parent origins.')
  const parentOrigins = [...new Set(originSetting.split(',').map(value => {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/'
      || url.search || url.hash || (url.protocol === 'http:' && !isLoopback(url.hostname))
      || url.hostname.replace(/^\[|\]$/g, '') === host) throw new Error('Catalog-name parent origins must be separate, explicit HTTP(S) origins.')
    return url.origin
  }))]
  if (!parentOrigins.length) throw new Error('At least one catalog-name parent origin is required.')

  const assets = new Map([
    ['/frame.html', { file: new URL('./frame.html', import.meta.url), type: 'text/html; charset=utf-8', injectOrigins: true }],
    ['/frame.js', { file: new URL('./frame.js', import.meta.url), type: 'text/javascript; charset=utf-8' }],
    ['/frame.css', { file: new URL('./frame.css', import.meta.url), type: 'text/css; charset=utf-8' }],
  ])
  const contentSecurityPolicy = [
    "default-src 'none'", `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${googleSources}`,
    `style-src 'self' 'unsafe-inline' ${googleSources}`, `img-src data: ${googleSources}`,
    `connect-src ${googleSources}`, `frame-src ${googleSources}`, `font-src data: ${googleSources}`,
    "base-uri 'none'", "object-src 'none'", "form-action 'none'", `frame-ancestors ${parentOrigins.join(' ')}`,
  ].join('; ')

  const authority = `${host.includes(':') ? `[${host}]` : host}:${port}`
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Security-Policy', contentSecurityPolicy)
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    if (request.headers.host !== authority) { response.writeHead(403).end(); return }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return }
    let url
    try { url = new URL(request.url, `http://${authority}`) } catch { response.writeHead(400).end(); return }
    const asset = !url.search && assets.get(url.pathname)
    if (!asset) { response.writeHead(404).end(); return }
    try {
      const source = await readFile(asset.file, 'utf8')
      const body = asset.injectOrigins ? source.replace('__PARENT_ORIGINS__', escapeAttribute(parentOrigins.join(','))) : source
      if (response.destroyed) return
      response.writeHead(200, { 'Content-Type': asset.type })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch {
      // Do not include paths, request details, or catalog values in responses/logs.
      if (!response.destroyed) {
        if (response.headersSent) response.destroy()
        else response.writeHead(500).end()
      }
    }
  })
  await new Promise((resolveListening, rejectListening) => {
    const onError = error => { server.removeListener('listening', onListening); rejectListening(error) }
    const onListening = () => { server.removeListener('error', onError); resolveListening() }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
  return { server, url: `http://${authority}/frame.html` }
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) {
  try {
    const { server, url } = await startNameTranslationServer()
    server.on('error', () => { console.error('Catalog-name static server failed.'); process.exitCode = 1 })
    console.info(`Catalog-name static frame: ${url}`)
  } catch (error) {
    console.error(error?.code === 'EADDRINUSE' ? 'Catalog-name static server port is already in use; the existing process was preserved.' : 'Catalog-name static server could not start; check its host, port, and parent-origin settings.')
    process.exitCode = 1
  }
}
