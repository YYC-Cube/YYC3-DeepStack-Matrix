/**
 * 移动端底部导航(2026-11-07 五 Tab:房态 / 沟通 / 工作台(中央凸起) / 客户(客资) / 我的)
 * 工作台为移动端主入口(概况+宫格,页面内按功能码过滤);桌面端不渲染(<768px 由 AppLayout 控制)
 * 2026-11-16 移动原生化批:①我的→/m/profile(移动身份卡)②Tab 角标(沟通未读+客资超期;零 API:
 * 群消息 after=已读水位游标取增量条数 + daily-summary.overdue;60s 轻轮询,>99 显示 99+)
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { LayoutGrid, UserRound, MessagesSquare, Users } from 'lucide-react'
import { req } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

/** 本地已读水位(与 m-chat.tsx 同键同义:群 id → 最后已读消息 id) */
function readMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('yyc3-chat-read') ?? '{}') as Record<string, number> } catch { return {} }
}

export function BottomNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const name = useAuthStore((s) => s.name)
  const [chatUnread, setChatUnread] = useState(0)
  const [custOverdue, setCustOverdue] = useState(0)

  const on = (path: string): boolean => location.pathname.startsWith(path)
  const activeColor = '#00d4ff'
  const idleColor = '#8b9bb4'

  /** 沟通未读:各群 after=水位 取增量条数求和(群数少;空增量=空 payload,60s 轮询可负担) */
  const loadChatUnread = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: Array<{ id: number; msgCount: number }> }>('GET', '/chat/groups')
      const rm = readMap()
      let total = 0
      for (const g of res.rows) {
        const wm = rm[String(g.id)] ?? 0
        if (wm === 0) continue // 从未打开过的群不计入(避免存量历史消息全算未读)
        const delta = await req<{ rows: unknown[] }>('GET', '/chat/groups/' + String(g.id) + '/messages?after=' + String(wm))
        total += delta.rows.length
      }
      setChatUnread(total)
    } catch { /* 静默(角标不可用不碍导航) */ }
  }, [])

  /** 客资超期:日报三数单源端点(overdue=当前超期时点数) */
  const loadCustOverdue = useCallback(async (): Promise<void> => {
    try {
      const r = await req<{ overdue: number }>('GET', '/customers/daily-summary')
      setCustOverdue(r.overdue)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => {
    void loadChatUnread()
    void loadCustOverdue()
    const timer = setInterval(() => {
      void loadChatUnread()
      void loadCustOverdue()
    }, 60_000)
    return () => { clearInterval(timer) }
  }, [loadChatUnread, loadCustOverdue])

  // 路由变化即刷新角标(离开沟通/客资页后角标立即归零/更新;增量拉取为空 payload,开销可忽略)
  useEffect(() => {
    void loadChatUnread()
    void loadCustOverdue()
  }, [location.pathname, loadChatUnread, loadCustOverdue])

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
        {/* 房态 */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/m/board') }}
          style={{ color: on('/m/board') ? activeColor : idleColor }}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px]">房态</span>
        </div>

        {/* 沟通(群聊;角标=未读总数) */}
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

        {/* 我的(2026-11-16 → 移动身份卡;桌面 /profile 保留,MobileGate 改道) */}
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
