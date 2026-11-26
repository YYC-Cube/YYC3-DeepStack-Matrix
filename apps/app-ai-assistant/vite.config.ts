import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3120 },
  // vite 8(rolldown)不支持 manualChunks 对象形态;家族组件本就经路由懒加载,无需手动分包
})
