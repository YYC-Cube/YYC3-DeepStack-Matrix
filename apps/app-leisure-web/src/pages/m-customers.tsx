/**
 * 移动客资页(/m/customers;2026-11-16 全局移动视觉批):BottomNav「客户」Tab 落点
 * 背景:此前 Tab 直跳桌面 /customers(DataTable),真机横向溢出截断(Owner 截图实锤)
 * 设计:移动原生单列卡列表(搜索/状态 chips/超期过滤)+ 点卡展开跟进时间线 + 快捷跟进/待办
 * 口径:与桌面 customers.tsx 同源 API(/customers 列表分页+followups+done cycle);明细管理仍留 web
 */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react'

interface LeadRow {
  id: number
  name: string
  phone: string | null
  status: string
  ownerName: string | null
  tags: string
  lastFollowAt: string | null
  lastFollowContent: string | null
  followupCount: number
  todoOverdue: boolean
  todoDueAt: string | null
  todoContent: string | null
  createdAt: string
}
interface FollowupRow {
  id: number
  content: string
  kind: string
  dueAt: string | null
  isDone: boolean
  creatorName: string
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = { FOLLOW: '#ffaa00', DEAL: '#00ff88', LOST: '#8b9bb4' }
const STATUS_LABEL: Record<string, string> = { FOLLOW: '跟进中', DEAL: '已成交', LOST: '已流失' }
const KIND_LABEL: Record<string, string> = { MANUAL: '跟进', ARRIVED: '到店', CONSUME: '消费', SYSTEM: '系统', TODO: '待办' }

/** 未跟进天数(与桌面页同口径:最近跟进/录入较晚者起算) */
function daysSinceFollow(r: LeadRow): number {
  const base = r.lastFollowAt ?? r.createdAt
  return Math.floor((Date.now() - new Date(base).getTime()) / 86_400_000)
}

/** 状态 chips(value=''=全部;overdue=超期待办) */
const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: '全部' },
  { key: 'FOLLOW', label: '跟进中' },
  { key: 'DEAL', label: '已成交' },
  { key: 'LOST', label: '已流失' },
  { key: 'overdue', label: '超期待办' },
]

export default function MCustomersPage(): React.JSX.Element {
  const [sp, setSp] = useSearchParams()
  const [rows, setRows] = useState<LeadRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [status, setStatus] = useState(() => (sp.get('overdue') === '1' ? 'overdue' : (sp.get('status') ?? '')))
  const [ownerFilter] = useState(sp.get('ownerArtistId') ?? '')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [fuRows, setFuRows] = useState<FollowupRow[]>([])
  const [fuText, setFuText] = useState('')
  const [todoMode, setTodoMode] = useState(false)
  /** 快录轻表单(2026-11-16 移动原生化批:客名+电话两字段,录入即全闭环) */
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<{ name: string; phone: string }>({ name: '', phone: '' })
  const [addBusy, setAddBusy] = useState(false)

  async function submitAdd(): Promise<void> {
    if (addForm.name.trim() === '') { toast.error('客名必填'); return }
    setAddBusy(true)
    try {
      await req('POST', '/customers', { name: addForm.name.trim(), phone: addForm.phone.trim() })
      toast.success('客资已建档(默认跟进中)')
      setAddOpen(false)
      setAddForm({ name: '', phone: '' })
      await load(1, false)
    } catch (e) {
      toastError(e)
    } finally {
      setAddBusy(false)
    }
  }

  const load = useCallback(async (nextPage: number, append: boolean): Promise<void> => {
    try {
      const params = new URLSearchParams({ page: String(nextPage), pageSize: '20' })
      if (q.trim() !== '') params.set('q', q.trim())
      if (status !== '' && status !== 'overdue') params.set('status', status)
      if (ownerFilter !== '') params.set('ownerArtistId', ownerFilter)
      const res = await req<{ rows: LeadRow[]; total: number }>('GET', '/customers?' + params.toString())
      let list = res.rows
      if (status === 'overdue') list = list.filter((r) => r.todoOverdue) // 轻量超期过滤(桌面 overdue 口径同源)
      setRows((prev) => (append ? [...prev, ...list] : list))
      setTotal(res.total)
      setPage(nextPage)
    } catch (e) {
      toastError(e, '客资加载失败')
    }
  }, [q, status, ownerFilter])

  useEffect(() => {
    void load(1, false)
  }, [load])

  // URL 参数回写(工作台跳转带参;筛选变化同步)
  useEffect(() => {
    const next = new URLSearchParams()
    if (q.trim() !== '') next.set('q', q.trim())
    if (status === 'overdue') next.set('overdue', '1')
    else if (status !== '') next.set('status', status)
    if (ownerFilter !== '') next.set('ownerArtistId', ownerFilter)
    setSp(next, { replace: true })
  }, [q, status, ownerFilter, setSp])

  const openDetail = async (r: LeadRow): Promise<void> => {
    if (expanded === r.id) { setExpanded(null); return }
    setExpanded(r.id)
    setFuText('')
    setTodoMode(false)
    try {
      const res = await req<{ rows: FollowupRow[] }>('GET', '/customers/' + String(r.id) + '/followups')
      setFuRows(res.rows)
    } catch (e) {
      toastError(e, '跟进加载失败')
    }
  }

  const reloadDetail = async (leadId: number): Promise<void> => {
    try {
      const res = await req<{ rows: FollowupRow[] }>('GET', '/customers/' + String(leadId) + '/followups')
      setFuRows(res.rows)
    } catch { /* 静默 */ }
  }

  async function addFollowup(r: LeadRow): Promise<void> {
    if (fuText.trim() === '') { toast.error('请填写内容'); return }
    try {
      await req('POST', '/customers/' + String(r.id) + '/followups', todoMode
        ? { content: fuText.trim(), kind: 'TODO', dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }
        : { content: fuText.trim() })
      toast.success(todoMode ? '待办已登记(+7 天)' : '跟进已登记')
      setFuText('')
      await reloadDetail(r.id)
      await load(1, false)
    } catch (e) {
      toastError(e)
    }
  }

  async function doneTodo(r: LeadRow, f: FollowupRow, cycle: boolean): Promise<void> {
    try {
      await req('POST', '/customers/' + String(r.id) + '/followups/' + String(f.id) + '/done', { cycle })
      toast.success(cycle ? '已完成,下期(+7 天)已自动生成' : '待办已完成')
      await reloadDetail(r.id)
      await load(1, false)
    } catch (e) {
      toastError(e)
    }
  }

  // overdue=前端过滤(服务端不分 overdue),分页计数失真→不展示「加载更多」;空态下同样隐藏
  const hasMore = status !== 'overdue' && rows.length > 0 && rows.length < total

  return (
    <div className="space-y-3">
      {/* 搜索+筛选(吸顶;chips 单行横滑)+快录入口 */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 space-y-2" style={{ background: 'linear-gradient(180deg, rgba(6,18,38,0.96) 70%, transparent)' }}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜客名 / 电话"
            className="pl-8 pr-20"
          />
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[11px] bg-primary/15 text-primary whitespace-nowrap"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3 h-3 inline mr-0.5" />快录
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={'px-2.5 py-1 rounded-full border text-xs whitespace-nowrap shrink-0 ' +
                (status === f.key ? 'border-primary text-primary bg-primary/10 font-medium' : 'border-line text-fg-muted')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表卡(单列;点卡展开跟进) */}
      {rows.map((r) => {
        const dOver = daysSinceFollow(r)
        const isOpen = expanded === r.id
        return (
          <div key={r.id} className="rounded-2xl border border-line overflow-hidden" style={{ background: 'var(--lm-card)' }}>
            <div className="p-3 cursor-pointer active:opacity-80" onClick={() => { void openDetail(r) }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--lm-fg)] truncate flex-1">{r.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color: STATUS_COLOR[r.status] ?? '#8b9bb4', background: 'color-mix(in srgb, ' + (STATUS_COLOR[r.status] ?? '#8b9bb4') + ' 14%, transparent)' }}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <ChevronUp className={'w-4 h-4 text-fg-muted shrink-0 transition-transform ' + (isOpen ? '' : 'rotate-180')} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
                <span>{r.phone ?? '无电话'}</span>
                <span className="truncate">· {r.ownerName ?? '未归属'}</span>
                <span className="ml-auto shrink-0" style={{ color: dOver >= 3 ? '#ffaa00' : undefined }}>
                  {r.lastFollowAt !== null ? dOver + ' 天前跟进' : '未跟进'}
                </span>
              </div>
              {(r.tags !== '') && (
                <div className="mt-1.5 flex gap-1 flex-wrap">
                  {r.tags.split(',').filter((t) => t !== '').slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-line text-fg-muted">{t}</span>
                  ))}
                </div>
              )}
              {r.todoOverdue && (
                <div className="mt-1.5 text-[11px] text-[#ff5555]">⚠ 待办超期:{r.todoContent ?? ''}</div>
              )}
            </div>

            {/* 展开区:跟进时间线+快捷录入 */}
            {isOpen && (
              <div className="border-t border-line px-3 py-2.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-fg-muted">
                  <span>跟进 {String(r.followupCount)} 条</span>
                  <span className="flex-1" />
                  <span>最近:{r.lastFollowAt !== null ? r.lastFollowAt.slice(0, 16).replace('T', ' ') : '—'}</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {fuRows.slice(0, 10).map((f) => (
                    <div key={f.id} className="rounded-lg bg-[rgba(0,212,255,0.04)] px-2 py-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-fg-muted">
                        <span className="px-1 rounded bg-[rgba(0,212,255,0.1)] text-primary">{KIND_LABEL[f.kind] ?? f.kind}</span>
                        <span>{f.creatorName}</span>
                        <span className="flex-1" />
                        <span>{f.createdAt.slice(5, 16).replace('T', ' ')}</span>
                      </div>
                      <div className="text-xs text-[var(--lm-fg)] mt-0.5 break-all">{f.content}</div>
                      {f.kind === 'TODO' && !f.isDone && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-fg-muted">到期:{f.dueAt !== null ? f.dueAt.slice(0, 10) : '—'}</span>
                          <span className="flex-1" />
                          <button
                            className="px-2 py-0.5 rounded text-[10px] border border-line text-fg-muted"
                            onClick={() => { void doneTodo(r, f, false) }}
                          >
                            完成
                          </button>
                          <button
                            className="px-2 py-0.5 rounded text-[10px] bg-primary/15 text-primary"
                            onClick={() => { void doneTodo(r, f, true) }}
                          >
                            循环+7 天
                          </button>
                        </div>
                      )}
                      {f.kind === 'TODO' && f.isDone && (
                        <div className="text-[10px] text-[#00ff88] mt-0.5">✓ 已完成{f.dueAt !== null ? '(原到期 ' + f.dueAt.slice(0, 10) + ')' : ''}</div>
                      )}
                    </div>
                  ))}
                  {fuRows.length === 0 && <div className="text-xs text-fg-muted py-3 text-center">暂无跟进记录</div>}
                </div>
                {/* 快捷跟进/待办 */}
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <button
                      className={'px-2 py-1 rounded text-[11px] border ' + (!todoMode ? 'border-primary text-primary bg-primary/10' : 'border-line text-fg-muted')}
                      onClick={() => setTodoMode(false)}
                    >
                      记跟进
                    </button>
                    <button
                      className={'px-2 py-1 rounded text-[11px] border ' + (todoMode ? 'border-primary text-primary bg-primary/10' : 'border-line text-fg-muted')}
                      onClick={() => setTodoMode(true)}
                    >
                      记待办(+7 天)
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      value={fuText}
                      onChange={(e) => setFuText(e.target.value)}
                      placeholder={todoMode ? '待办内容(到期=+7 天)' : '跟进内容'}
                      className="flex-1"
                    />
                    <Button size="sm" className="shrink-0" onClick={() => { void addFollowup(r) }}>提交</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-line p-8 text-center text-sm text-fg-muted" style={{ background: 'var(--lm-card)' }}>
          暂无客资;换筛选条件或到 web 端「+ 录入客资」
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => { void load(page + 1, true) }}
        >
          加载更多(已 {String(rows.length)}/{String(total)})
        </Button>
      )}
      <div className="text-center text-[10px] text-fg-muted pt-2 pb-2">
        <ChevronDown className="w-3 h-3 inline" /> 完整管理(编辑/标签池/批量/导出)请用 web 端客资页
      </div>

      {/* 快录轻表单(客名+电话;建档默认「跟进中」) */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>快录客资</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-fg-muted">客名 *</label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="客户姓名" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg-muted">电话(可留空)</label>
              <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="手机号" inputMode="tel" />
            </div>
            <div className="text-[10px] text-fg-muted">建档后默认「跟进中」;标签/来源/归属可在 web 端补全</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button disabled={addBusy} onClick={() => { void submitAdd() }}>建档</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
