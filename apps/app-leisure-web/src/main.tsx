/**
 * YYC³ LeisureManage Web · 应用入口
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'
import { registerServiceWorker } from '@/lib/pwa'
import { ensureThemeApplied } from '@/pages/theme/applier'

// 首帧前应用已存主题(localStorage --lm-* 变量;未存过=tokens.css 默认,无操作)
ensureThemeApplied()
// SW 注册(仅生产;离线壳+运行时缓存+自动更新流)
registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
