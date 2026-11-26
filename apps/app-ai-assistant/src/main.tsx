/**
 * app-ai-assistant 入口(独立应用形态)
 * 装配:I18nProvider + HashRouter + 登录门 → 应用壳(模型管理/系统设置 + AI 浮窗 + 底部导航)
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './routes'
import { useI18nProvider, I18nContext } from './hooks/useI18n'
import './styles/index.css'

function I18nBridge({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useI18nProvider()
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nBridge>
      <RouterProvider router={router} />
    </I18nBridge>
  </React.StrictMode>,
)
