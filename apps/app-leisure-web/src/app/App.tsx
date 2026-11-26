/**
 * 应用根:挂载 hash router + 全局 Toaster
 * 2026-11-18 事故修复:Toaster 原挂 AppLayout 内——login/change-password 等顶层路由
 * (不在 AppLayout)所有 toast 全部静默丢弃=新员工首登改密「点击提交无反应」根因。移至全局单实例。
 */
import { RouterProvider } from 'react-router'
import { Toaster } from '@yyc3-deepstack/ui'
import { router } from './routes'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" theme="dark" />
    </>
  )
}
