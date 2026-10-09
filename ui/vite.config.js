import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Load UI env from config/ui first (enterprise shared templates), then ui/
  const fromConfig = loadEnv(mode, path.resolve(__dirname, '../config/ui'), 'VITE_')
  const fromUi = loadEnv(mode, __dirname, 'VITE_')
  const env = { ...fromConfig, ...fromUi }

  const uiPort = Number(env.VITE_UI_PORT || process.env.UI_PORT || 15173)
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:18080'

  return {
    plugins: [react(), tailwindcss()],
    envDir: path.resolve(__dirname, '../config/ui'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // 0.0.0.0 so Cursor cloud / remote browser previews can reach the UI
      host: '0.0.0.0',
      port: uiPort,
      strictPort: true,
      allowedHosts: true,
      // Same-origin /api proxy avoids browser CORS during local/preview development
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: uiPort,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
