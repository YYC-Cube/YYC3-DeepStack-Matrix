/**
 * YYC³ LeisureManage Web · Vite 配置
 * dev 端口 3040;/api/v1 代理至 leisure-api(3001),开发期免 CORS 直连
 */
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3040,
    host: true,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // WS 升级透传(2026-11-07:缺此 dev 环境 WS 握手必败静默走轮询;生产边缘已配 Upgrade 无此问题)
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
})
