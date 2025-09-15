// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080'
  const devJwt = env.VITE_DEV_JWT || ''

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080', changeOrigin: true,
          changeOrigin: true,
          secure: false,

          configure: (proxy) => {

            proxy.on('proxyReq', (proxyReq) => {
              if (devJwt) proxyReq.setHeader('Authorization', `Bearer ${devJwt}`)
            })
            proxy.on('error', (err) => {
              console.error('[proxy error]', err?.code || err?.message || err)
            })
          },
        },
      },
    },
  }
})
