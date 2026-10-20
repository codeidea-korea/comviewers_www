import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { nameTranslationDevPlugin } from './name-translation/dev-plugin.mjs'

export default defineConfig({
  plugins: [nameTranslationDevPlugin()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  server: {
    strictPort: true,
    allowedHosts: ['fitting-centers-leather-route.trycloudflare.com'],
    proxy: {
      '/api/': {
        target: 'http://127.0.0.1:8080',
        // Keep the public Host and forwarded HTTPS scheme for same-origin API requests.
        changeOrigin: false,
      },
    },
  },
  preview: { strictPort: true },
})
