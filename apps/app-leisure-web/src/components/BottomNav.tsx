/**
 * 移动端底部导航(五 Tab:房态 / 沟通 / 工作台(中央凸起) / 客户(客资) / 我的)
 * 工作台为移动端主入口(概况+宫格,页面内按功能码过滤);桌面端不渲染(<768px 由 AppLayout 控制)
 * 2026-11-16 移动原生化批:我的→/m/profile;Tab 角标(沟通未读+客资超期;零 API;60s 轮询)
 * 2026-11-17 角标深化批:①沟通角标 WS 化(chat:ping 全店广播→秒级刷新;60s 轮询兜底+5s 重连)
 * ②房态角标(待到店预定 BOOKED+待清扫确认 CLEANING)③角标持久化(localStorage 先显后校准,弱网体验)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { LayoutGrid, UserRound, MessagesSquare, Users } from 'lucide-react'
import { req, client } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

/** 本地已读水位(与 m-chat.tsx 同键同义:群 id → 最后已读消息 id) */
function readMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('yyc3-chat-read') ?? '{}') as Record<string, number> } catch { return {} }
}

/** 角标持久化(2026-11-17:冷启动先显上次值再校准;弱网不白屏) */
interface BadgeCache { chat: number; cust: number; board: number }
const BADGE_KEY = 'yyc3-nav-badges'
function loadBadgeCache(): BadgeCache {
  try { return JSON.parse(localStorage.getItem(BADGE_KEY) ?? '{}') as Partial<BadgeCache> as BadgeCache } catch { return {} as BadgeCache }
}
function saveBadgeCache(b: BadgeCache): void {
  try { localStorage.setItem(BADGE_KEY, JSON.stringify(b)) } catch { /* 静默 */ }
}

export function BottomNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const name = useAuthStore((s) => s.name)
  const token = useAuthStore((s) => s.token)
  const cached = useRef<BadgeCache>(loadBadgeCache())
  const [chatUnread, setChatUnread] = useState(cached.current.chat ?? 0)
  const [custOverdue, setCustOverdue] = useState(cached.current.cust ?? 0)
  const [boardAlert, setBoardAlert] = useState(cached.current.board ?? 0)
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const on = (path: string): boolean => location.pathname.startsWith(path)
  const activeColor = '#00d4ff'
  const idleColor = '#8b9bb4'

  const persist = (patch: Partial<BadgeCache>): void => {
    cached.current = { ...cached.current, ...patch }
    saveBadgeCache(cached.current)
  }

  /** 沟通未读:各群 after=水位 取增量条数求和(从未打开过的群不计,避免存量历史全算未读) */
  const loadChatUnread = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: Array<{ id: number; msgCount: number }> }>('GET', '/chat/groups')
      const rm = readMap()
      let total = 0
      for (const g of res.rows) {
        const wm = rm[String(g.id)] ?? 0
        if (wm === 0) continue
        const delta = await req<{ rows: unknown[] }>('GET', '/chat/groups/' + String(g.id) + '/messages?after=' + String(wm))
        total += delta.rows.length
      }
      setChatUnread(total)
      persist({ chat: total })
    } catch { /* 静默(角标不可用不碍导航;持久值兜底显示) */ }
  }, [])

  /** 客资超期:日报三数单源端点(overdue=当前超期时点数) */
  const loadCustOverdue = useCallback(async (): Promise<void> => {
    try {
      const r = await req<{ overdue: number }>('GET', '/customers/daily-summary')
      setCustOverdue(r.overdue)
      persist({ cust: r.overdue })
    } catch { /* 静默 */ }
  }, [])

  /** 房态待办:待到店预定(BOOKED)+待清扫确认(CLEANING)(2026-11-17;端点现成零 API) */
  const loadBoardAlert = useCallback(async (): Promise<void> => {
    try {
      const bd = client.businessDateOf()
      const [rooms, bookings] = await Promise.all([
        req<{ rows: Array<{ status: string }> }>('GET', '/store/rooms?pageSize=100'),
        client.bookings.list({ businessDate: bd, status: 'BOOKED', pageSize: 100 }),
      ])
      const cleaning = (rooms.rows ?? []).filter((r) => r.status === 'CLEANING').length
      const booked = (bookings.rows ?? []).length
      const total = cleaning + booked
      setBoardAlert(total)
      persist({ board: total })
    } catch { /* 静默 */ }
  }, [])

  // 路由变化即刷新角标(离开沟通/客资/房态页后角标立即归零/更新)
  useEffect(() => {
    void loadChatUnread()
    void loadCustOverdue()
    void loadBoardAlert()
  }, [location.pathname, loadChatUnread, loadCustOverdue, loadBoardAlert])

  // 60s 轮询兜底(WS 断连期间保底;连接正常时 ping 事件秒级驱动)
  useEffect(() => {
    const timer = setInterval(() => {
      void loadChatUnread()
      void loadCustOverdue()
      void loadBoardAlert()
    }, 60_000)
    return () => { clearInterval(timer) }
  }, [loadChatUnread, loadCustOverdue, loadBoardAlert])

  // 沟通角标 WS 化(2026-11-17):常驻监听 chat:ping 全店广播(免 join)→防抖刷新;断线 5s 重连
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
            pingTimer.current = setTimeout(() => { void loadChatUnread() }, 300)
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
  }, [token, loadChatUnread])

  const badge = (n: number): React.JSX.Element | null =>
    n > 0
      ? (
        <span
          className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{ background: '#ff5555', color: '#fff', boxShadow: '0 0 6px rgba(255,85,85,0.5)' }}
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
        {/* 房态(角标=待到店预定+待清扫确认) */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/m/board') }}
          style={{ color: on('/m/board') ? activeColor : idleColor }}
        >
          <span className="relative">
            <LayoutGrid className="w-5 h-5" />
            {badge(boardAlert)}
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
            {badge(chatUnread)}
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
            {badge(custOverdue)}
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
