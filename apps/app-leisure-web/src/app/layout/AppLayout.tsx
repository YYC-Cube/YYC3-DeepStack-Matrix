/**
 * 应用布局:Sidebar + 顶栏(用户/登出)+ Outlet + Toaster
 * 自建轻量版(shell Layout 深耦合 WebSocket/AI 终端,不适配本项目;通用导出按需引用)
 */
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { Button, Toaster } from '@yyc3/ui'
import { useAuthStore } from '@/stores/auth'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const name = useAuthStore((s) => s.name)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)' }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center px-5 border-b border-[rgba(0,212,255,0.12)]">
          <span className="text-sm text-[#8b9bb4]">Web 管理端</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-[#e0f0ff]">{name !== '' ? name : '管理员'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="w-4 h-4 mr-1" />
              退出
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-center" theme="dark" />
    </div>
  )
}
