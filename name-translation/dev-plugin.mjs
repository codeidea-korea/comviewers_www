import { loadEnv } from 'vite'
import { startNameTranslationServer } from './serve.mjs'

const defaultFrameUrl = 'http://127.0.0.2:5317/frame.html'

/** The regular local app owns its sidecar; builds and previews never start one. */
export function nameTranslationDevPlugin() {
  return {
    name: 'comviewers-local-name-translation',
    apply: 'serve',
    configureServer(vite) {
      if (!['127.0.0.1', 'localhost'].includes(vite.config.server.host) || vite.config.server.port !== 5301 || !vite.httpServer) return
      const fromFiles = loadEnv(vite.config.mode, vite.config.envDir, '')
      const setting = key => process.env[key] ?? fromFiles[key]
      const warn = message => vite.config.logger.warn(`[catalog-name translation] ${message}`)
      let frameUrl
      try { frameUrl = new URL(setting('VITE_NAME_TRANSLATION_FRAME_URL') || defaultFrameUrl) }
      catch { warn('Invalid frame URL; automatic local startup was skipped. Original names remain available.'); return }
      // A remote/HTTPS opt-in belongs to its separately deployed static host.
      const loopback = /^127(?:\.\d{1,3}){3}$/.test(frameUrl.hostname) || ['localhost', '[::1]'].includes(frameUrl.hostname)
      if (frameUrl.protocol !== 'http:' || !loopback) return
      if (frameUrl.pathname !== '/frame.html' || frameUrl.search || frameUrl.hash || frameUrl.username || frameUrl.password) {
        warn('Local frame URL must point directly to /frame.html; automatic startup was skipped.'); return
      }
      const host = setting('NAME_TRANSLATION_HOST') ?? frameUrl.hostname
      const port = setting('NAME_TRANSLATION_PORT') ?? (frameUrl.port || '80')
      const normaliseHost = value => (value === 'localhost' ? '127.0.0.1' : value).replace(/^\[|\]$/g, '')
      if (normaliseHost(host) !== normaliseHost(frameUrl.hostname) || Number(port) !== Number(frameUrl.port || '80')) {
        warn('Local frame URL and NAME_TRANSLATION_HOST/PORT disagree; automatic startup was skipped.'); return
      }
      // Matching cookies by hostname is independent of TCP ports.
      if (['127.0.0.1', 'localhost'].includes(host)) {
        warn('The name frame must use a separate loopback host; automatic startup was skipped.'); return
      }

      let ownedServer
      let stopping = false
      const closeOwnedServer = () => {
        stopping = true
        if (ownedServer) {
          const server = ownedServer
          ownedServer = undefined
          server.close()
          server.closeIdleConnections()
        }
      }
      const start = async () => {
        if (stopping) return
        try {
          const result = await startNameTranslationServer({ host, port, parentOrigins: setting('NAME_TRANSLATION_PARENT_ORIGINS') })
          ownedServer = result.server
          if (stopping) { closeOwnedServer(); return }
          ownedServer.on('error', () => warn('The owned name-frame server reported an error; original names remain available.'))
          vite.config.logger.info(`[catalog-name translation] Local isolated frame ready: ${result.url}`)
        } catch (error) {
          if (stopping) return
          warn(error?.code === 'EADDRINUSE'
            ? 'The name-frame port is already in use. Its existing process was preserved; verify that it serves the configured translation frame.'
            : 'The local name-frame server could not start. Check NAME_TRANSLATION_* settings; original names remain available.')
        }
      }
      vite.httpServer.once('close', closeOwnedServer)
      if (vite.httpServer.listening) void start()
      else vite.httpServer.once('listening', () => { void start() })
    },
  }
}
