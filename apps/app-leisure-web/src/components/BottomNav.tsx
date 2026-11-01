/**
 * 移动端底部导航(阶段4;五关键入口, MORE 归设置域)
 * shell BottomNav 硬编码菜单不可注入,自建(与 Sidebar 裁决同理)
 */
import { useNavigate, useLocation } from 'react-router'
import { CreditCard, Clock, Settings, Users, Radar } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

const TABS = [
  { key: 'artists', label: '档案', path: '/artists', icon: Users, perm: 'artist:view' },
  { key: 'realtime', label: '看板', path: '/attendance/realtime', icon: Radar, perm: 'attend:summary:view' },
  { key: 'sessions', label: '上下钟', path: '/sessions', icon: Clock, perm: 'session:view' },
  { key: 'txns', label: '流水', path: '/fees/txns/RECHARGE', icon: CreditCard, perm: 'fee:ledger:view' },
  { key: 'settings', label: '设置', path: '/settings/artist', icon: Settings, perm: 'setting:manage' },
] as const

export function BottomNav(): React.JSX.Element | null {
  const navigate = useNavigate()
  const location = useLocation()
  const permCodes = useAuthStore((s) => s.permCodes)
  const tabs = TABS.filter((t) => permCodes.includes(t.perm))
  if (tabs.length === 0) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[rgba(0,212,255,0.15)] pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'rgba(6,14,31,0.95)', backdropFilter: 'blur(8px)' }}
    >
      {tabs.map((t) => {
        const active = location.pathname.startsWith(t.path.split('/').slice(0, 2).join('/'))
        return (
          <div
            key={t.key}
            onClick={() => navigate(t.path)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer"
            style={{ color: active ? '#00d4ff' : '#8b9bb4' }}
          >
            <t.icon className="w-5 h-5" />
            <span className="text-[10px]">{t.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
