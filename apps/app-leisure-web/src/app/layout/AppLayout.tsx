/**
 * 应用布局:Sidebar + 顶栏(用户/安装/登出)+ Outlet + Toaster + 移动断点 BottomNav + ⌘K 命令面板 + AI 助手浮窗
 * <768px:@yyc3/ui useIsMobile → 隐藏 Sidebar,底部五 Tab(阶段4)
 */
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Download, LogOut } from 'lucide-react'
import { Button, Toaster } from '@yyc3/ui'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useIsMobile, usePWAInstall, useOnlineStatus } from '@/lib/pwa'
import { useLocation } from 'react-router'
import { Sidebar, MENU } from './Sidebar'
import { BottomNav } from '@/components/BottomNav'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { AIAssistant } from '@/components/ai-assistant/AIAssistant'
import { YYC3LogoSvg } from '@/components/ai-assistant/YYC3LogoSvg'

/** 横向子菜单条(2026-11-04 导航优化):当前路由所在域的子项横向平铺;按功能码过滤,与 Sidebar 同源 MENU */
function HorizontalSubNav(): React.JSX.Element | null {
  const location = useLocation()
  const navigate = useNavigate()
  const permCodes = useAuthStore((s) => s.permCodes)
  const group = MENU.find((g) => g.items.some((it) => location.pathname.startsWith(it.path.split('?')[0] ?? it.path)))
  if (group === undefined) return null
  const items = group.items.filter((it) => it.perm === '*' || permCodes.includes(it.perm))
  if (items.length === 0) return null
  return (
    <div className="h-9 shrink-0 flex items-center gap-1 px-5 border-b border-[rgba(0,212,255,0.08)] overflow-x-auto">
      <span className="text-[11px] text-[#8b9bb4] mr-2 shrink-0">{group.label} ·</span>
      {items.map((it) => {
        const active = location.pathname.startsWith(it.path.split('?')[0] ?? it.path)
        return (
          <button
            key={it.key}
            onClick={() => { navigate(it.path) }}
            className={
              'px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ' +
              (active ? 'bg-[rgba(0,212,255,0.14)] text-[#00d4ff]' : 'text-[#8b9bb4] hover:text-[#c0d8f0] hover:bg-[rgba(0,212,255,0.06)]')
            }
          >
            {it.label}
            {it.badge !== undefined && <span className="ml-1 text-[9px] text-[#ffaa00]">{it.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}

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
  // 侧栏折叠(localStorage 记忆;折叠态 hover 感应自动展开=左侧折叠感应)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('yyc3-sidebar-collapsed') === '1')
  const setCollapsedPersist = (v: boolean): void => {
    setCollapsed(v)
    try { localStorage.setItem('yyc3-sidebar-collapsed', v ? '1' : '0') } catch { /* 静默 */ }
  }
  const navigate = useNavigate()
  const name = useAuthStore((s) => s.name)
  const logout = useAuthStore((s) => s.logout)
  const isMobile = useIsMobile()
  const online = useOnlineStatus()

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)' }}
    >
      {!online && (
        <div
          className="fixed bottom-4 left-4 z-[70] flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,170,0,0.4)] bg-[rgba(20,12,4,0.9)] text-xs text-[#ffaa00]"
          role="status"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] animate-pulse" />
          离线模式 · 展示缓存数据,操作将在联网后可用
        </div>
      )}
      {!isMobile && (
        <div
          onMouseEnter={() => { if (collapsed) setCollapsedPersist(false) }}
          className="h-full shrink-0"
        >
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsedPersist(!collapsed)} />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center px-5 border-b border-[rgba(0,212,255,0.12)]">
          {!isMobile && <span className="text-sm text-[#8b9bb4]">Web 管理端</span>}
          {isMobile && (
            <button
              onClick={() => { navigate('/profile') }}
              className="flex items-center gap-2"
              title="个人信息"
            >
              <YYC3LogoSvg size={28} className="rounded-full" />
              <span className="text-sm font-semibold text-[#00d4ff]">LeisureManage</span>
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <InstallButton />
            {/* 头像+姓名 → 个人信息页(桌面);移动端头像/退出迁「我的」页(BottomNav) */}
            {!isMobile && (
              <>
                <button
                  onClick={() => { navigate('/profile') }}
                  className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-[rgba(0,212,255,0.08)] transition-colors"
                  title="个人信息"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(0,180,255,0.3)]">
                    <YYC3LogoSvg size={30} />
                  </span>
                  <span className="text-sm text-[#e0f0ff] max-w-[8rem] truncate">{name !== '' ? name : '管理员'}</span>
                </button>
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
              </>
            )}
          </div>
        </header>
        {/* 横向子菜单条(2026-11-04 导航优化:当前域的子菜单横向平铺,长侧栏一屏可达) */}
        {!isMobile && <HorizontalSubNav />}
        <main className="flex-1 overflow-y-auto p-5 pb-20 md:pb-5">
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <CommandPalette />
      {/* AI 助手浮窗(可拖拽/可缩放;mock 应答,III 期接推理服务) */}
      <AIAssistant isMobile={isMobile} />
      <Toaster position="top-center" theme="dark" />
    </div>
  )
}
