/**
 * 移动端底部导航(五 Tab:房态 / 沟通 / 工作台(中央凸起) / 客户(客资) / 我的)
 * 工作台为移动端主入口(概况+宫格,页面内按功能码过滤);桌面端不渲染(<768px 由 AppLayout 控制)
 * 2026-11-16 移动原生化批:我的→/m/profile;Tab 角标(沟通未读+客资超期;零 API;60s 轮询)
 * 2026-11-17 角标深化批:①沟通角标 WS 化(chat:ping 全店广播→秒级刷新;60s 轮询兜底+5s 重连)
 * ②房态角标细粒度双点(橙=待到店 BOOKED / 蓝=待清扫 CLEANING)③角标计算抽 lib/nav-badges 单源(与工作台同步行共用)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { LayoutGrid, UserRound, MessagesSquare, Users } from 'lucide-react'
import { loadAllBadges, loadBadgeCache, loadChatUnread, saveBadgeCache, type NavBadges } from '@/lib/nav-badges'
import { useAuthStore } from '@/stores/auth'

export function BottomNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const name = useAuthStore((s) => s.name)
  const token = useAuthStore((s) => s.token)
  const cached = useRef<Partial<NavBadges>>(loadBadgeCache())
  const [badges, setBadges] = useState<NavBadges>({
    chat: cached.current.chat ?? 0,
    cust: cached.current.cust ?? 0,
    booked: cached.current.booked ?? 0,
    cleaning: cached.current.cleaning ?? 0,
  })
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const on = (path: string): boolean => location.pathname.startsWith(path)
  const activeColor = '#00d4ff'
  const idleColor = '#8b9bb4'

  const refresh = useCallback(async (): Promise<void> => {
    const b = await loadAllBadges()
    setBadges(b)
  }, [])

  const refreshChat = useCallback(async (): Promise<void> => {
    try {
      const chat = await loadChatUnread()
      setBadges((prev) => {
        const next = { ...prev, chat }
        saveBadgeCache(next)
        return next
      })
    } catch { /* 静默 */ }
  }, [])

  // 路由变化即刷新角标(离开沟通/客资/房态页后角标立即归零/更新)
  useEffect(() => {
    void refresh()
  }, [location.pathname, refresh])

  // 60s 轮询兜底(WS 断连期间保底;连接正常时 ping 事件秒级驱动)
  useEffect(() => {
    const timer = setInterval(() => { void refresh() }, 60_000)
    return () => { clearInterval(timer) }
  }, [refresh])

  // 沟通角标 WS 化:常驻监听 chat:ping 全店广播(免 join)→防抖刷新;断线 5s 重连
  useEffect(() => {
    if (token === null || token === '') return
    let ws: WebSocket | null = null
    let closed = false
    let retry: ReturnType<typeof setTimeout> | null = null
    const connect = (): void => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        ws = new WebSocket(proto + '://' + window.location.host + '/api/v1/ws/chat?token=' + encodeURIComponent(token))
      } catch { return }
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(String(ev.data)) as { event?: string }
          if (payload.event === 'chat:ping') {
            if (pingTimer.current !== null) clearTimeout(pingTimer.current)
            pingTimer.current = setTimeout(() => { void refreshChat() }, 300)
          }
        } catch { /* 非 JSON 静默 */ }
      }
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 5000)
      }
    }
    connect()
    return () => {
      closed = true
      if (retry !== null) clearTimeout(retry)
      if (pingTimer.current !== null) clearTimeout(pingTimer.current)
      try { ws?.close() } catch { /* 静默 */ }
    }
  }, [token, refreshChat])

  const badge = (n: number, bg = '#ff5555'): React.JSX.Element | null =>
    n > 0
      ? (
        <span
          className="absolute min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{ background: bg, color: '#fff', boxShadow: '0 0 6px ' + bg + '66' }}
        >
          {n > 99 ? '99+' : String(n)}
        </span>
      )
      : null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'rgba(6,14,31,0.96)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(0,212,255,0.12)' }}
    >
      <div className="flex items-end h-14">
        {/* 房态(角标细粒度双点:橙=待到店 右上 / 蓝=待清扫 右下) */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/m/board') }}
          style={{ color: on('/m/board') ? activeColor : idleColor }}
        >
          <span className="relative">
            <LayoutGrid className="w-5 h-5" />
            {badges.booked > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                style={{ background: '#ffaa00', color: '#060e1f', boxShadow: '0 0 5px rgba(255,170,0,0.5)' }}>
                {badges.booked > 99 ? '99+' : String(badges.booked)}
              </span>
            )}
            {badges.cleaning > 0 && (
              <span className="absolute -bottom-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                style={{ background: '#3aa0d8', color: '#060e1f', boxShadow: '0 0 5px rgba(58,160,216,0.5)' }}>
                {badges.cleaning > 99 ? '99+' : String(badges.cleaning)}
              </span>
            )}
          </span>
          <span className="text-[10px]">房态</span>
        </div>

        {/* 沟通(群聊;角标=未读总数;WS chat:ping 秒级驱动) */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/m/chat') }}
          style={{ color: on('/m/chat') ? activeColor : idleColor }}
        >
          <span className="relative">
            <MessagesSquare className="w-5 h-5" />
            {badge(badges.chat)}
          </span>
          <span className="text-[10px]">沟通</span>
        </div>

        {/* 工作台(中央凸起大钮) */}
        <div className="flex-1 flex flex-col items-center relative">
          <button
            onClick={() => { navigate('/m/workbench') }}
            className="w-14 h-14 rounded-full flex items-center justify-center -translate-y-4"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #0088ff)',
              boxShadow: '0 6px 18px rgba(0, 180, 255, 0.35)',
              border: '3px solid rgba(6,14,31,0.9)',
            }}
            aria-label="工作台"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#060e1f" aria-hidden>
              <rect x="4" y="4" width="7" height="7" rx="2" />
              <rect x="13" y="4" width="7" height="7" rx="3.5" />
              <rect x="4" y="13" width="7" height="7" rx="3.5" />
              <rect x="13" y="13" width="7" height="7" rx="2" />
            </svg>
          </button>
          <span
            className="text-[10px] -mt-3"
            style={{ color: on('/m/workbench') ? activeColor : idleColor, fontWeight: on('/m/workbench') ? 600 : 400 }}
          >
            工作台
          </span>
        </div>

        {/* 客户(客资体系;角标=超期待办数) */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/m/customers') }}
          style={{ color: on('/m/customers') ? activeColor : idleColor }}
        >
          <span className="relative">
            <Users className="w-5 h-5" />
            {badge(badges.cust)}
          </span>
          <span className="text-[10px]">客户</span>
        </div>

        {/* 我的(移动身份卡;桌面 /profile 保留,MobileGate 改道) */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/m/profile') }}
          style={{ color: on('/m/profile') || on('/profile') ? activeColor : idleColor }}
        >
          <UserRound className="w-5 h-5" />
          <span className="text-[10px]">我的</span>
        </div>
      </div>
    </nav>
  )
}
