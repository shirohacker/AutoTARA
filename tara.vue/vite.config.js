import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
    server: {
        host: '127.0.0.1', // Forces IPv4
        port: 1234,
        proxy: {
            '/api': {
                target: 'http://localhost:4000', // 백엔드 서버 주소 (포트 확인 필수!)
                changeOrigin: true,
            },
        }
    },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
