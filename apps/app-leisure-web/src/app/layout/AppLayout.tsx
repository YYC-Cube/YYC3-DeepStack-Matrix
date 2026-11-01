/**
 * 应用布局:Sidebar + 顶栏(用户/安装/登出)+ Outlet + Toaster + 移动断点 BottomNav
 * <768px:@yyc3/ui useIsMobile → 隐藏 Sidebar,底部五 Tab(阶段4)
 */
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Download, LogOut } from 'lucide-react'
import { Button, Toaster } from '@yyc3/ui'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useIsMobile, usePWAInstall } from '@/lib/pwa'
import { Sidebar } from './Sidebar'
import { BottomNav } from '@/components/BottomNav'

/** 安装按钮(可用=一键装;iOS=指引;桌面已装=隐藏) */
function InstallButton(): React.JSX.Element | null {
  const { canInstall, isStandalone, isIOS, install } = usePWAInstall()
  if (isStandalone) return null
  if (!canInstall && !isIOS) return null
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (canInstall) {
          void install().then((outcome) => {
            if (outcome === 'accepted') toast.success('安装成功,可从主屏幕进入')
          })
        } else if (isIOS) {
          toast.info('iOS 安装: Safari 分享按钮 →「添加到主屏幕」', { duration: 6000 })
        }
      }}
    >
      <Download className="w-4 h-4 mr-1" />
      安装
    </Button>
  )
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const name = useAuthStore((s) => s.name)
  const logout = useAuthStore((s) => s.logout)
  const isMobile = useIsMobile()

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)' }}
    >
      {!isMobile && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center px-5 border-b border-[rgba(0,212,255,0.12)]">
          {!isMobile && <span className="text-sm text-[#8b9bb4]">Web 管理端</span>}
          {isMobile && <span className="text-sm font-semibold text-[#00d4ff]">LeisureManage</span>}
          <div className="ml-auto flex items-center gap-3">
            <InstallButton />
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
        <main className="flex-1 overflow-y-auto p-5 pb-20 md:pb-5">
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <Toaster position="top-center" theme="dark" />
    </div>
  )
}
