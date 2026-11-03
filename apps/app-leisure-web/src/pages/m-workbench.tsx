/**
 * 移动工作台(m-workbench):移动端首页(店长/管理员手机操作主入口)
 * 版式对齐移动工作台范式(示例参考:今日概况四指标 + 常用宫格 + 分组 Tab 宫格)
 * - 概况:双轨对账 selfMetrics(今日开房/上钟人数/时间费/点单额)+ 实时在房数
 * - 常用:高频 8 宫格;分组 Tab:复用 Sidebar MENU 单源(按功能码过滤,禁双处维护)
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  BadgeJapaneseYen,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Gauge,
  LayoutGrid,
  Monitor,
  PieChart,
  Radar,
  Receipt,
  Settings,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import { client, req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { MENU } from '@/app/layout/Sidebar'
import type { ReconListResult } from '@yyc3/leisure-core'

/** 分组项图标(按菜单 key 语义映射;未命中回退 Gauge) */
const ITEM_ICON: Record<string, typeof Gauge> = {
  a1: Users, a3: Gauge, a4: Users,
  a19: Radar, a20: ClipboardList, board: LayoutGrid, clock: Monitor, a16: ClipboardList, a17: PieChart, a18: ClipboardList, a15: Monitor,
  a5: Gauge, pricing: Gauge, a7: BadgeJapaneseYen, a8: BadgeJapaneseYen, a9: Receipt, a10: Receipt, a11: Receipt,
  tickets: Ticket,
  a25: BarChart3, recon: PieChart,
  a21: Receipt, a22: Monitor, a23: PieChart, a24: CalendarClock,
  a26: Settings, theme: PieChart, rooms: LayoutGrid, profile: UserRound,
}

/** 常用宫格(高频入口;perm 过滤) */
const QUICK = [
  { key: 'mboard', label: '房态图', path: '/m/board', perm: 'session:view', icon: LayoutGrid },
  { key: 'sessions', label: '上下钟', path: '/sessions', perm: 'session:view', icon: ClipboardList },
  { key: 'bookings', label: '预约管理', path: '/bookings', perm: 'booking:view', icon: CalendarClock },
  { key: 'realtime', label: '实时状态', path: '/attendance/realtime', perm: 'attend:summary:view', icon: Radar },
  { key: 'recharge', label: '台费充值', path: '/fees/recharge', perm: 'fee:recharge', icon: BadgeJapaneseYen },
  { key: 'tickets', label: '台票体系', path: '/tickets', perm: 'ticket:ledger:view', icon: Ticket },
  { key: 'clock', label: '钟房大屏', path: '/clock-screen', perm: 'session:view', icon: Monitor },
  { key: 'reports', label: '报表中心', path: '/reports', perm: 'fee:ledger:view', icon: BarChart3 },
] as const

/** 分组 Tab:MENU 域 → 移动四分组(键=域 label;禁双处维护) */
const TAB_GROUPS: Array<{ key: string; label: string; domains: string[] }> = [
  { key: 'manage', label: '管理', domains: ['艺人档案', '考勤上钟', '扩展域'] },
  { key: 'fund', label: '资金', domains: ['台费资金', '台票体系'] },
  { key: 'stats', label: '统计', domains: ['报表'] },
  { key: 'more', label: '更多', domains: ['设置'] },
]

/** 更多组补充项(个人域;不在 MENU) */
const MORE_EXTRAS = [
  { key: 'profile', label: '个人信息', path: '/profile', perm: '*', icon: UserRound },
  { key: 'theme', label: '主题定制', path: '/settings/theme', perm: 'setting:manage', icon: PieChart },
] as const

export default function MWorkbenchPage(): React.JSX.Element {
  const navigate = useNavigate()
  const permCodes = useAuthStore((s) => s.permCodes)
  const [metrics, setMetrics] = useState<ReconListResult['selfMetrics'] | null>(null)
  const [liveRooms, setLiveRooms] = useState<number>(0)
  const [tab, setTab] = useState('manage')

  useEffect(() => {
    const bd = client.businessDateOf()
    Promise.all([
      client.recon.list(bd).catch(() => null),
      req<{ rows: unknown[] }>('GET', '/room-sessions?status=OPEN').catch(() => null),
    ])
      .then(([recon, open]) => {
        if (recon !== null) setMetrics(recon.selfMetrics)
        if (open !== null) setLiveRooms(open.rows.length)
      })
      .catch((e) => toastError(e, '概况加载失败'))
  }, [])

  const quick = useMemo(() => QUICK.filter((q) => permCodes.includes(q.perm)), [permCodes])
  const groups = useMemo(
    () =>
      TAB_GROUPS.map((g) => ({
        ...g,
        items: [
          ...MENU.filter((m) => g.domains.includes(m.label)).flatMap((m) =>
            m.items.filter((it) => permCodes.includes(it.perm)).map((it) => ({ key: it.key, label: it.label, path: it.path, badge: it.badge })),
          ),
          ...(g.key === 'more'
            ? MORE_EXTRAS.filter((x) => x.perm === '*' || permCodes.includes(x.perm)).map((x) => ({ key: x.key, label: x.label, path: x.path, badge: undefined }))
            : []),
        ],
      })).filter((g) => g.items.length > 0),
    [permCodes],
  )
  const activeGroup = groups.find((g) => g.key === tab) ?? groups[0]

  const cards: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: '在房包厢', value: String(liveRooms), accent: true },
    { label: '今日开房', value: metrics !== null ? String(metrics.openCount) : '—' },
    { label: '时间费', value: metrics !== null ? '¥' + String(metrics.roomFee) : '—' },
    { label: '点单额', value: metrics !== null ? '¥' + String(metrics.orderTotal) : '—' },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--lm-bg, #060e1f)' }}>
      {/* 顶部:品牌 + 营业日(AppLayout 顶栏已有操作者/退出,不重复) */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-2">
        <span className="text-[var(--lm-fg)] font-semibold tracking-wide text-base">YYC³ 工作台</span>
        <span className="ml-auto text-xs text-fg-muted">{client.businessDateOf()}</span>
      </div>

      {/* 今日概况(点击进报表中心) */}
      <div
        className="mx-3 mt-1 rounded-2xl p-3 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--lm-primary) 16%, var(--lm-card)), var(--lm-card))',
          border: '1px solid color-mix(in srgb, var(--lm-primary) 22%, transparent)',
        }}
        onClick={() => { navigate('/reports') }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--lm-fg)]">今日概况</span>
          <span className="text-xs text-primary">更多统计 ›</span>
        </div>
        <div className="grid grid-cols-4 rounded-xl py-3" style={{ background: 'var(--lm-card)' }}>
          {cards.map((c) => (
            <div key={c.label} className="flex flex-col items-center gap-1">
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: c.accent === true ? 'var(--lm-primary)' : 'var(--lm-fg)' }}
              >
                {c.value}
              </span>
              <span className="text-[11px] text-fg-muted">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 常用宫格 */}
      <div className="mx-3 mt-3 rounded-2xl p-3" style={{ background: 'var(--lm-card)' }}>
        <div className="text-sm font-semibold text-[var(--lm-fg)] mb-1">常用</div>
        <div className="grid grid-cols-4 gap-y-4 pt-2">
          {quick.map((q) => (
            <div key={q.key} className="flex flex-col items-center gap-1.5 cursor-pointer active:opacity-70" onClick={() => { navigate(q.path) }}>
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--lm-primary) 12%, transparent)' }}
              >
                <q.icon className="w-5 h-5 text-primary" />
              </span>
              <span className="text-[11px] text-[var(--lm-fg)]">{q.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 分组 Tab 宫格(菜单单源 MENU) */}
      <div className="mx-3 mt-3 rounded-2xl p-3" style={{ background: 'var(--lm-card)' }}>
        <div className="flex gap-5 border-b border-line mb-3">
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => { setTab(g.key) }}
              className="pb-2 text-sm relative"
              style={{
                color: (activeGroup?.key ?? '') === g.key ? 'var(--lm-primary)' : 'var(--lm-fg-muted)',
                fontWeight: (activeGroup?.key ?? '') === g.key ? 600 : 400,
              }}
            >
              {g.label}
              {(activeGroup?.key ?? '') === g.key && (
                <span className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full" style={{ background: 'var(--lm-primary)' }} />
              )}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-y-4 pt-1">
          {(activeGroup?.items ?? []).map((it) => {
            const Icon = ITEM_ICON[it.key] ?? Gauge
            return (
              <div key={it.key} className="flex flex-col items-center gap-1.5 cursor-pointer active:opacity-70" onClick={() => { navigate(it.path) }}>
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center relative"
                  style={{ background: 'color-mix(in srgb, var(--lm-primary) 10%, transparent)' }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                  {it.badge !== undefined && (
                    <span
                      className="absolute -top-1 -right-1 px-1 rounded text-[9px]"
                      style={{ background: 'color-mix(in srgb, var(--lm-warning) 85%, transparent)', color: '#060e1f' }}
                    >
                      {it.badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-[var(--lm-fg)] text-center leading-tight">{it.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 底部留白由 BottomNav 补;页脚品牌 */}
      <div className="text-center text-[10px] text-fg-muted pt-6 pb-2">YYC³ LeisureManage · 移动工作台</div>
    </div>
  )
}
