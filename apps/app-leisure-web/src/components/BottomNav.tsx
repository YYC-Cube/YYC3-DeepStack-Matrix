/**
 * 移动端底部导航(移动工作台批次重设计):房态 / 工作台(中央凸起) / 我的
 * 工作台为移动端主入口(概况+宫格,页面内按功能码过滤);桌面端不渲染(<768px 由 AppLayout 控制)
 */
import { useNavigate, useLocation } from 'react-router'
import { LayoutGrid, UserRound } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

export function BottomNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const name = useAuthStore((s) => s.name)

  const on = (path: string): boolean => location.pathname.startsWith(path)
  const activeColor = '#00d4ff'
  const idleColor = '#8b9bb4'

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

        {/* 我的 */}
        <div
          className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
          onClick={() => { navigate('/profile') }}
          style={{ color: on('/profile') ? activeColor : idleColor }}
        >
          <UserRound className="w-5 h-5" />
          <span className="text-[10px]">{name !== '' ? '我的' : '我的'}</span>
        </div>
      </div>
    </nav>
  )
}
