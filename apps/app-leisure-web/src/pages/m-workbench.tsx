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
  Bell,
  CalendarClock,
  ClipboardList,
  Gauge,
  HandCoins,
  LayoutGrid,
  Monitor,
  PieChart,
  Radar,
  Receipt,
  ReceiptText,
  Settings,
  Sparkles,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@yyc3/ui'
import { client, req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { MENU } from '@/app/layout/Sidebar'
import { YYC3LogoSvg } from '@/components/ai-assistant/YYC3LogoSvg'
import type { ReconListResult } from '@yyc3/leisure-core'

/** 工作通告兜底占位(/notices 无数据时显示) */
const FALLBACK_announcements: Array<{ id?: number; remind?: boolean; date: string; text: string }> = [
  { date: '系统', text: '欢迎使用 YYC³ LeisureManage 移动工作台 · 工作通告由管理端「工作通告」页发布' },
]

/** 分组项图标(按菜单 key 语义映射;未命中回退 Gauge) */
const ITEM_ICON: Record<string, typeof Gauge> = {
  a1: Users, a3: Gauge, a4: Users,
  a19: Radar, a20: ClipboardList, board: LayoutGrid, clock: Monitor, a16: ClipboardList, a17: PieChart, a18: ClipboardList, a15: Monitor,
  a5: Gauge, pricing: Gauge, a7: BadgeJapaneseYen, a8: BadgeJapaneseYen, a9: Receipt, a10: Receipt, a11: Receipt,
  split: HandCoins, handover: ReceiptText,
  tickets: Ticket,
  a25: BarChart3, recon: PieChart,
  a21: Receipt, a22: Monitor, a23: PieChart, a24: CalendarClock,
  a26: Settings, theme: PieChart, rooms: LayoutGrid, profile: UserRound,
}

/** 常用宫格(高频入口;perm 过滤) */
const QUICK = [
  { key: 'mboard', label: '房态图', path: '/m/board', perm: 'session:view', icon: LayoutGrid },
  { key: 'sessions', label: '轮房', path: '/sessions', perm: 'session:view', icon: ClipboardList },
  { key: 'bookings', label: '预约管理', path: '/bookings', perm: 'booking:view', icon: CalendarClock },
  { key: 'realtime', label: '实时状态', path: '/attendance/realtime', perm: 'attend:summary:view', icon: Radar },
  { key: 'recharge', label: '台费充值', path: '/fees/recharge', perm: 'fee:recharge', icon: BadgeJapaneseYen },
  { key: 'tickets', label: '台票体系', path: '/tickets', perm: 'ticket:ledger:view', icon: Ticket },
  { key: 'clock', label: '钟房大屏', path: '/clock-screen', perm: 'session:view', icon: Monitor },
  { key: 'reports', label: '报表中心', path: '/reports', perm: 'fee:ledger:view', icon: BarChart3 },
] as const

/** 分组 Tab:MENU 域 → 移动四分组(键=域 label;禁双处维护) */
const TAB_GROUPS: Array<{ key: string; label: string; domains: string[] }> = [
  { key: 'manage', label: '管理', domains: ['销售经理档案', '考勤上钟', '扩展域'] },
  { key: 'fund', label: '资金', domains: ['台费资金', '台票体系'] },
  { key: 'stats', label: '统计', domains: ['报表'] },
  { key: 'more', label: '更多', domains: ['设置'] },
]

/** 更多组补充项(个人域;不在 MENU) */
const MORE_EXTRAS = [
  { key: 'profile', label: '个人信息', path: '/profile', perm: '*', icon: UserRound },
  { key: 'theme', label: '主题定制', path: '/settings/theme', perm: 'setting:manage', icon: PieChart },
] as const

/** 移动专属仪表/功能项(2026-11-04 精致化批:图表化零明细;按组挂载) */
const GROUP_EXTRAS: Record<string, Array<{ key: string; label: string; path: string; perm: string; icon: typeof Gauge }>> = {
  manage: [
    { key: 'tasks', label: '任务中心', path: '/m/tasks', perm: '*', icon: ClipboardList },
  ],
  stats: [
    { key: 'st-att', label: '出勤仪表', path: '/m/stats/attendance', perm: 'attend:summary:view', icon: Radar },
    { key: 'st-col', label: '收款仪表', path: '/m/stats/collection', perm: 'fee:ledger:view', icon: BadgeJapaneseYen },
    { key: 'st-rank', label: '业绩仪表', path: '/m/stats/booking-rank', perm: 'session:view', icon: BarChart3 },
    { key: 'st-rev', label: '评价仪表', path: '/m/stats/reviews', perm: 'review:view', icon: Sparkles },
    { key: 'st-tra', label: '转销售统计', path: '/m/stats/transfer', perm: 'resource:view', icon: Users },
  ],
  fund: [
    { key: 'chat', label: '沟通', path: '/m/chat', perm: '*', icon: Receipt },
    { key: 'fb', label: '功能定制', path: '/m/feedback', perm: '*', icon: Settings },
  ],
}

export default function MWorkbenchPage(): React.JSX.Element {
  const navigate = useNavigate()
  const permCodes = useAuthStore((s) => s.permCodes)
  const [metrics, setMetrics] = useState<ReconListResult['selfMetrics'] | null>(null)
  const [liveRooms, setLiveRooms] = useState<number>(0)
  /** 分账月报卡(S4-3:三向对账三数;仅 setting:manage 拉取) */
  const [splitCard, setSplitCard] = useState<{ entryNet: number; settledSum: number; balanced: boolean; byStatus: Record<string, number> } | null>(null)
  const [tab, setTab] = useState('manage')
  const [showNotices, setShowNotices] = useState(false)
  /** 工作通告(/notices 真数据;含播放配置;空时回退占位) */
  const [announcements, setAnnouncements] = useState(FALLBACK_announcements)
  /** 公告条速度(秒/轮)与播放次数(0=无限;播完隐藏)——取最新通告配置 */
  const [marqueeSpeed, setMarqueeSpeed] = useState(22)
  const [marqueeTimes, setMarqueeTimes] = useState(0)
  const [marqueeVisible, setMarqueeVisible] = useState(true)
  /** 提醒效果:新通告(24h 内 remind)首次进入自动弹层一次 */
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem('yyc3-notice-seen') ?? '[]') as number[]
      const fresh = announcements.find(
        (a) => (a as { id?: number; remind?: boolean }).remind === true &&
          (a as { id?: number }).id !== undefined &&
          !seen.includes((a as { id: number }).id),
      )
      if (fresh !== undefined) {
        const id = (fresh as { id: number }).id
        setShowNotices(true)
        localStorage.setItem('yyc3-notice-seen', JSON.stringify([...seen, id]))
      }
    } catch {
      /* localStorage 不可用时静默 */
    }
  }, [announcements])

  // 分账月报(S4-3):setting:manage 权限才拉;失败静默(卡片不渲染)
  useEffect(() => {
    if (!permCodes.includes('setting:manage')) return
    void req<{ entryNet: number; settledSum: number; balanced: boolean; byStatus: Record<string, number> }>('GET', '/split/balance')
      .then((r) => setSplitCard(r))
      .catch(() => undefined)
  }, [permCodes])

  useEffect(() => {
    const bd = client.businessDateOf()
    Promise.all([
      client.recon.list(bd).catch(() => null),
      req<{ rows: unknown[] }>('GET', '/room-sessions?status=OPEN').catch(() => null),
      req<{
        rows: Array<{
          id: number
          title: string
          body: string
          createdAt: string
          playTimes: number
          playStart: string | null
          playEnd: string | null
          playSpeed: number
          remind: boolean
        }>
      }>('GET', '/notices').catch(() => null),
    ])
      .then(([recon, open, notices]) => {
        if (recon !== null) setMetrics(recon.selfMetrics)
        if (open !== null) setLiveRooms(open.rows.length)
        if (notices !== null && notices.rows.length > 0) {
          const now = Date.now()
          // 展示时段窗口过滤(空=立即+永久)
          const inWindow = notices.rows.filter((n) => {
            if (n.playStart !== null && now < new Date(n.playStart).getTime()) return false
            if (n.playEnd !== null && now > new Date(n.playEnd).getTime()) return false
            return true
          })
          if (inWindow.length > 0) {
            setAnnouncements(
              inWindow.map((n) => ({
                id: n.id,
                remind: n.remind,
                date: n.createdAt.slice(5, 10),
                text: n.title !== '' ? n.title + ':' + n.body : n.body,
              })),
            )
            setMarqueeSpeed(inWindow[0]?.playSpeed ?? 22)
            setMarqueeTimes(inWindow[0]?.playTimes ?? 0)
            setMarqueeVisible(true)
          } else {
            setAnnouncements([])
          }
        }
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
          ...(GROUP_EXTRAS[g.key] ?? [])
            .filter((x) => x.perm === '*' || permCodes.includes(x.perm))
            .map((x) => ({ key: x.key, label: x.label, path: x.path, badge: undefined })),
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
      {/* 顶部:logo + 品牌 + AI 入口 + 通知(AppLayout 顶栏已有操作者/退出,不重复) */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-2">
        <YYC3LogoSvg size={22} className="rounded-md" />
        <span className="text-[var(--lm-fg)] font-semibold tracking-wide text-base">YYC³ 工作台</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="AI 助手"
            title="AI 助手"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--lm-primary) 14%, transparent)' }}
            onClick={() => { window.dispatchEvent(new Event('yyc3-ai-toggle')) }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </button>
          <button
            aria-label="工作通告"
            title="工作通告"
            className="w-8 h-8 rounded-full flex items-center justify-center relative"
            style={{ background: 'color-mix(in srgb, var(--lm-primary) 14%, transparent)' }}
            onClick={() => {
              setShowNotices(true)
              // 触达上报:可见通告逐条 POST read(幂等;fire-and-forget)
              const token = useAuthStore.getState().token ?? ''
              for (const a of announcements) {
                if (a.id !== undefined) {
                  void fetch('/api/v1/notices/' + String(a.id) + '/read', {
                    method: 'POST',
                    headers: { Authorization: 'Bearer ' + token },
                  }).catch(() => undefined)
                }
              }
            }}
          >
            <Bell className="w-4 h-4 text-primary" />
            {announcements.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--lm-warning, #ffaa00)' }} />
            )}
          </button>
          <span className="text-xs text-fg-muted">{client.businessDateOf()}</span>
        </div>
      </div>

      {/* 横向滚动公告条(工作通告;速度/次数由最新通告配置;播完隐藏) */}
      {announcements.length > 0 && marqueeVisible && (
        <div
          className="mx-3 rounded-full overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--lm-primary) 10%, var(--lm-card))', border: '1px solid color-mix(in srgb, var(--lm-primary) 20%, transparent)' }}
        >
          <style>{`@keyframes yyc3-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
          <div className="flex items-center h-8">
            <span
              className="px-2 text-[11px] shrink-0 flex items-center gap-1"
              style={{ color: 'var(--lm-primary)', borderRight: '1px solid color-mix(in srgb, var(--lm-primary) 25%, transparent)' }}
            >
              <Bell className="w-3 h-3" /> 通告
            </span>
            <div className="overflow-hidden flex-1">
              <div
                className="flex whitespace-nowrap text-[11px] text-[var(--lm-fg)] items-center h-8"
                style={{
                  animation: `yyc3-marquee ${String(marqueeSpeed)}s linear ${marqueeTimes === 0 ? 'infinite' : String(marqueeTimes)}`,
                  width: 'max-content',
                }}
                onAnimationEnd={() => { if (marqueeTimes > 0) setMarqueeVisible(false) }}
              >
                {[...announcements, ...announcements].map((a, i) => (
                  <span key={i} className="px-6">{a.date !== '系统' ? `[${a.date}] ` : ''}{a.text}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* 分账月报(S4-3:本月计提净额/结算中/已付+平衡徽标;点击进 /split) */}
      {splitCard !== null && (
        <div
          className="mx-3 mt-3 rounded-2xl p-3 cursor-pointer"
          style={{ background: 'var(--lm-card)', border: '1px solid color-mix(in srgb, var(--lm-primary) 14%, transparent)' }}
          onClick={() => { navigate('/split') }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--lm-fg)]">分账月报</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                color: splitCard.balanced ? '#00cc88' : '#ff5555',
                background: splitCard.balanced ? 'rgba(0,204,136,0.12)' : 'rgba(255,85,85,0.12)',
              }}
            >
              {splitCard.balanced ? '三向平衡' : '存在差异'}
            </span>
          </div>
          <div className="grid grid-cols-3 rounded-xl py-2.5" style={{ background: 'var(--lm-bg)' }}>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-bold tabular-nums text-[var(--lm-fg)]">¥{String(Math.round(splitCard.entryNet * 100) / 100)}</span>
              <span className="text-[11px] text-fg-muted">计提净额</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-bold tabular-nums text-[var(--lm-fg)]">¥{String(Math.round((splitCard.byStatus?.ACCRUED ?? 0) * 100) / 100)}</span>
              <span className="text-[11px] text-fg-muted">待结算</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-bold tabular-nums text-[var(--lm-fg)]">¥{String(Math.round(splitCard.settledSum * 100) / 100)}</span>
              <span className="text-[11px] text-fg-muted">已入结算</span>
            </div>
          </div>
        </div>
      )}

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

      {/* 工作通告弹层(预留:后期接后端制度/工作通告) */}
      <Dialog open={showNotices} onOpenChange={(o) => { setShowNotices(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>工作通告</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {announcements.length === 0 && (
              <div className="text-sm text-fg-muted py-6 text-center">暂无通告;制度与工作通知发布后在此显示</div>
            )}
            {announcements.map((a, i) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="text-xs text-fg-muted mb-1">{a.date}</div>
                <div className="text-sm text-[var(--lm-fg)]">{a.text}</div>
              </div>
            ))}
            <div className="text-[10px] text-fg-muted pt-1">制度/工作通告内容管理即将上线(后台发布 → 全端推送此处)</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
