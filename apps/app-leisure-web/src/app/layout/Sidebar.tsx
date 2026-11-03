/**
 * 侧边栏:域分组菜单(需求全集 §3.2 八域)+ 功能码过滤
 * 菜单 → 页面编号(05 文档);II 期项渲染占位角标
 * 折叠态分组 hover 弹出层:进入 120ms 延迟显示,离开 180ms 防抖收起
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import { Button } from '@yyc3/ui'
import { useAuthStore } from '@/stores/auth'
import { YYC3LogoSvg } from '@/components/ai-assistant/YYC3LogoSvg'

interface MenuItem {
  key: string
  label: string
  path: string
  perm: string
  badge?: string // 'II' = II 期占位
}

interface MenuGroup {
  label: string
  icon: typeof Users
  items: MenuItem[]
}

export const MENU: MenuGroup[] = [
  {
    label: '艺人档案',
    icon: Users,
    items: [
      { key: 'a1', label: '艺人资料管理', path: '/artists', perm: 'artist:view' },
      { key: 'a3', label: '艺人等级', path: '/artists/levels', perm: 'artist:view' },
      { key: 'a4', label: '艺人组别', path: '/artists/groups', perm: 'artist:view' },
    ],
  },
  {
    label: '考勤上钟',
    icon: Clock,
    items: [
      { key: 'a19', label: '实时状态看板', path: '/attendance/realtime', perm: 'attend:summary:view' },
      { key: 'a20', label: '艺人上下钟', path: '/sessions', perm: 'session:view' },
      { key: 'board', label: '房态看板(方案甲)', path: '/rooms/board', perm: 'session:view' },
      { key: 'clock', label: '钟房大屏(语音叫钟)', path: '/clock-screen', perm: 'session:view' },
      { key: 'a16', label: '报备明细', path: '/attendance/reports', perm: 'attend:ledger:view' },
      { key: 'a17', label: '报备汇总', path: '/attendance/summary', perm: 'attend:summary:view' },
      { key: 'a18', label: '补打卡', path: '/attendance/manual', perm: 'attend:manual' },
      { key: 'a15', label: '报备现场屏', path: '/attendance/screen', perm: 'attend:qrcode' },
    ],
  },
  {
    label: '台费资金',
    icon: CreditCard,
    items: [
      { key: 'a5', label: '台费规则', path: '/fees/rules', perm: 'feerule:manage' },
      { key: 'pricing', label: '时段差异化定价', path: '/fees/pricing', perm: 'feerule:manage' },
      { key: 'a7', label: '台费充值', path: '/fees/recharge', perm: 'fee:recharge' },
      { key: 'a8', label: '手动扣费', path: '/fees/deduct', perm: 'fee:manual' },
      { key: 'a9', label: '充值记录', path: '/fees/txns/RECHARGE', perm: 'fee:ledger:view' },
      { key: 'a10', label: '扣费记录', path: '/fees/txns/ROOM_SETTLE', perm: 'fee:ledger:view' },
      { key: 'a11', label: '手动扣费记录', path: '/fees/txns/MANUAL_DEDUCT', perm: 'fee:ledger:view' },
    ],
  },
  {
    label: '台票体系',
    icon: Receipt,
    items: [
      // 四视图(设置/购买/购买记录/使用记录)收在一页,由页内 Tabs 切换;?tab= 深链
      { key: 'tickets', label: '台票体系', path: '/tickets', perm: 'ticket:ledger:view' },
    ],
  },
  {
    label: '报表',
    icon: BarChart3,
    items: [
      { key: 'a25', label: '报表中心', path: '/reports', perm: 'fee:ledger:view' },
      { key: 'recon', label: '双轨对账(P0 门禁)', path: '/reports/recon', perm: 'report:export' },
    ],
  },
  {
    label: '扩展域',
    icon: LayoutDashboard,
    items: [
      { key: 'a21', label: '艺人订单(艺人端 H5 已上线)', path: '/todo/a21', perm: 'order:view', badge: 'II' },
      { key: 'a22', label: '展示控制台', path: '/showcase', perm: 'showcase:view' },
      { key: 'a23', label: '服务评价', path: '/reviews', perm: 'review:view' },
      { key: 'a24', label: '预约管理', path: '/bookings', perm: 'booking:view' },
    ],
  },
  {
    label: '设置',
    icon: Settings,
    items: [
      { key: 'a26', label: '门店参数(艺人设置)', path: '/settings/artist', perm: 'setting:manage' },
      { key: 'theme', label: '主题定制', path: '/settings/theme', perm: 'setting:manage' },
      { key: 'rooms', label: '包厢房号管理', path: '/store/rooms', perm: 'setting:manage' },
    ],
  },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const permCodes = useAuthStore((s) => s.permCodes)
  const [hoverCat, setHoverCat] = useState<string | null>(null)
  // 弹出层防抖计时器(参照 Cloud-Matrix Sidebar 范式)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const groups = MENU.filter((g) => g.items.some((i) => permCodes.includes(i.perm)))

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }
  // 进入分组:清除收起计时,折叠态延迟 120ms 再显示弹出层(滑过不闪)
  const handleCatEnter = (label: string) => {
    clearHoverTimer()
    if (collapsed) {
      hoverTimerRef.current = setTimeout(() => setHoverCat(label), 120)
    } else {
      setHoverCat(label)
    }
  }
  // 离开分组:180ms 防抖后收起(给移入弹出层留缓冲)
  const handleCatLeave = () => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => setHoverCat(null), 180)
  }
  // 悬停移入弹出层本身:取消收起计时,保持可交互
  const handleFlyoutEnter = () => {
    clearHoverTimer()
  }
  // 路由跳转后收起弹出层
  useEffect(() => {
    setHoverCat(null)
  }, [location.pathname])
  // 卸载时清理计时器
  useEffect(() => clearHoverTimer, [])

  return (
    <aside
      className="h-full flex flex-col border-r border-[rgba(0,212,255,0.12)] shrink-0 transition-[width] duration-200"
      style={{ width: collapsed ? 56 : 216, background: 'rgba(6,14,31,0.7)' }}
    >
      <div className="h-14 flex items-center px-3 border-b border-[rgba(0,212,255,0.12)] gap-2">
        <YYC3LogoSvg size={collapsed ? 28 : 26} className={collapsed ? 'mx-auto' : ''} />
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-[#00d4ff] whitespace-nowrap">YYC³ LeisureManage</span>
            <span className="text-[10px] text-[#8b9bb4] whitespace-nowrap">艺人管理系统</span>
          </div>
        )}
        <Button variant="ghost" size="icon" className="ml-auto w-8 h-8" onClick={onToggle}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => {
          const items = g.items.filter((i) => permCodes.includes(i.perm))
          return (
            <div
              key={g.label}
              onMouseEnter={() => handleCatEnter(g.label)}
              onMouseLeave={handleCatLeave}
              className="relative"
            >
              <div className="px-3 py-1.5 flex items-center gap-2 text-[#8b9bb4] rounded-md transition-colors cursor-default hover:bg-[rgba(0,212,255,0.05)] hover:text-[#e0f0ff]">
                <g.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-xs truncate">{g.label}</span>}
              </div>
              {collapsed && hoverCat === g.label && (
                <div
                  onMouseEnter={handleFlyoutEnter}
                  onMouseLeave={handleCatLeave}
                  className="absolute left-full top-0 z-50 ml-1 py-1 px-1 rounded-lg border border-[rgba(0,212,255,0.2)] bg-[#0a1628] shadow-[0_10px_50px_rgba(0,0,0,0.5)] min-w-[160px]"
                >
                  {items.map((i) => (
                    <div
                      key={i.key}
                      onClick={() => navigate(i.path)}
                      className="px-3 py-1.5 text-xs rounded cursor-pointer text-[#e0f0ff] hover:bg-[rgba(0,212,255,0.08)] whitespace-nowrap"
                    >
                      {i.label}
                      {i.badge !== undefined && <span className="ml-1 text-[9px] text-[#ffaa00]">{i.badge}期</span>}
                    </div>
                  ))}
                </div>
              )}
              {!collapsed &&
                items.map((i) => {
                  const active = location.pathname === i.path
                  return (
                    <div
                      key={i.key}
                      onClick={() => navigate(i.path)}
                      className={`mx-1 mb-0.5 rounded pr-3 py-1.5 text-xs cursor-pointer truncate transition-colors ${
                        active ? 'pl-8 border-l-2' : 'pl-10 border-l-2 border-transparent'
                      }`}
                      style={{
                        color: active ? '#00d4ff' : '#a8b8cc',
                        background: active ? 'rgba(0,212,255,0.08)' : undefined,
                        ...(active ? { borderColor: '#00d4ff' } : {}),
                      }}
                    >
                      {i.label}
                      {i.badge !== undefined && <span className="ml-1 text-[9px] text-[#ffaa00]">{i.badge}期</span>}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
