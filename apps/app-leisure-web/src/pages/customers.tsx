/**
 * 客资体系(2026-11-07 P5):客户线索最小闭环——名录/电话/来源/状态/跟进;增改删
 * ADMIN 全量,ARTIST(销售端)仅本人归属;DataTable 移动端自动卡片化
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ConfirmButton, DataTable, PageHeader, StatusBadge, type Column } from '@/components/kit'

interface LeadRow {
  id: number
  name: string
  phone: string | null
  source: string | null
  status: string
  note: string | null
  ownerArtistId: number | null
  ownerName: string | null
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
interface BookingLite {
  id: number
  bookingNo: string
  status: string
  roomName: string | null
  artistName: string | null
  bookingTime: string | null
}
interface TodoBoardRow {
  id: number
  leadId: number
  leadName: string
  leadPhone: string | null
  content: string
  dueAt: string | null
  overdue: boolean
}
const KIND_LABEL: Record<string, string> = { MANUAL: '跟进', ARRIVED: '到店', CONSUME: '消费', SYSTEM: '系统', TODO: '待办' }
/** 跟进提醒阈值(天):超过即置顶+角标 */
const FOLLOW_REMIND_DAYS = 3

/** 未跟进天数(以最近跟进/录入时间较晚者起算) */
function daysSinceFollow(r: LeadRow): number {
  const base = r.lastFollowAt ?? r.createdAt
  return Math.floor((Date.now() - new Date(base).getTime()) / 86_400_000)
}
interface ArtistOption {
  id: number
  stageName: string | null
  realName: string | null
  badgeNo: string | null
}

const STATUS_COLOR: Record<string, string> = { FOLLOW: '#ffaa00', DEAL: '#00ff88', LOST: '#8b9bb4' }
const STATUS_LABEL: Record<string, string> = { FOLLOW: '跟进中', DEAL: '已成交', LOST: '已流失' }

interface FormState {
  id?: number
  name: string
  phone: string
  source: string
  status: string
  note: string
  ownerArtistId: string
}

export default function CustomersPage(): React.JSX.Element {
  const [rows, setRows] = useState<LeadRow[]>()
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [artists, setArtists] = useState<ArtistOption[]>([])
  /** 跟进时间线弹窗 */
  const [fuFor, setFuFor] = useState<LeadRow | null>(null)
  const [fuRows, setFuRows] = useState<FollowupRow[]>([])
  const [fuInput, setFuInput] = useState('')
  const [fuTodo, setFuTodo] = useState(false)
  const [fuDue, setFuDue] = useState('')
  /** 客资详情页化(档案卡:基本信息+时间线+关联预订一屏) */
  const [detailFor, setDetailFor] = useState<LeadRow | null>(null)
  const [detailFu, setDetailFu] = useState<FollowupRow[]>([])
  const [detailBooks, setDetailBooks] = useState<BookingLite[]>([])
  /** 视图切换:列表 / 待办日历(按到期日排布) */
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [todoRows, setTodoRows] = useState<TodoBoardRow[]>([])

  const openFollowups = (r: LeadRow): void => {
    setFuFor(r)
    setFuInput('')
    setFuTodo(false)
    setFuDue('')
    void req<{ rows: FollowupRow[] }>('GET', '/customers/' + String(r.id) + '/followups').then((res) => setFuRows(res.rows)).catch((e) => toastError(e))
  }

  const openDetail = (r: LeadRow): void => {
    setDetailFor(r)
    void req<{ rows: FollowupRow[] }>('GET', '/customers/' + String(r.id) + '/followups').then((res) => setDetailFu(res.rows)).catch(() => undefined)
    void req<{ rows: BookingLite[] }>('GET', '/bookings?customerId=' + String(r.id) + '&pageSize=20').then((res) => setDetailBooks(res.rows)).catch(() => undefined)
  }

  const addFollowup = (): void => {
    const r = fuFor
    if (r === null || fuInput.trim() === '') return
    void req('POST', '/customers/' + String(r.id) + '/followups', {
      content: fuInput.trim(),
      ...(fuTodo ? { kind: 'TODO', dueAt: fuDue !== '' ? new Date(fuDue).toISOString() : undefined } : {}),
    }).then(async () => {
      toast.success(fuTodo ? '待办已创建' : '跟进已记录')
      setFuInput('')
      setFuTodo(false)
      setFuDue('')
      const res = await req<{ rows: FollowupRow[] }>('GET', '/customers/' + String(r.id) + '/followups')
      setFuRows(res.rows)
      await load()
    }).catch((e) => toastError(e))
  }

  const doneTodo = (r: LeadRow, fid: number): void => {
    void req('POST', '/customers/' + String(r.id) + '/followups/' + String(fid) + '/done', {}).then(async () => {
      toast.success('待办已完成')
      const res = await req<{ rows: FollowupRow[] }>('GET', '/customers/' + String(r.id) + '/followups')
      setFuRows(res.rows)
      await load()
    }).catch((e) => toastError(e))
  }

  /** 来源转化统计(按当前筛选聚合;来源缺省归「未填」) */
  const sourceStats = (() => {
    const m = new Map<string, { total: number; deal: number }>()
    for (const r of rows ?? []) {
      const src = r.source !== null && r.source !== '' ? r.source : '未填'
      const e = m.get(src) ?? { total: 0, deal: 0 }
      e.total += 1
      if (r.status === 'DEAL') e.deal += 1
      m.set(src, e)
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total)
  })()

  /** 转化率排行(按销售经理;衔接员工绩效) */
  const ownerRank = (() => {
    const m = new Map<string, { total: number; deal: number }>()
    for (const r of rows ?? []) {
      const o = r.ownerName ?? '未归属'
      const e = m.get(o) ?? { total: 0, deal: 0 }
      e.total += 1
      if (r.status === 'DEAL') e.deal += 1
      m.set(o, e)
    }
    return [...m.entries()]
      .map(([name, st]) => ({ name, ...st, rate: st.total > 0 ? Math.round((st.deal / st.total) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total)
      .slice(0, 8)
  })()

  const load = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams()
      if (q.trim() !== '') params.set('q', q.trim())
      if (status !== '') params.set('status', status)
      const res = await req<{ rows: LeadRow[] }>('GET', '/customers' + (params.toString() !== '' ? '?' + params.toString() : ''))
      setRows(res.rows)
    } catch (e) {
      toastError(e, '客资加载失败')
    }
  }, [q, status])

  const loadTodos = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: TodoBoardRow[] }>('GET', '/customers/todo-board')
      setTodoRows(res.rows)
    } catch (e) {
      toastError(e, '待办加载失败')
    }
  }, [])

  useEffect(() => {
    if (view === 'calendar') void loadTodos()
  }, [view, loadTodos])

  /** 导出(当前筛选;fetch blob 带 Authorization,对齐报表中心) */
  const exportCustomers = async (fmt: 'xlsx' | 'csv'): Promise<void> => {
    const params = new URLSearchParams({ fmt })
    if (q.trim() !== '') params.set('q', q.trim())
    if (status !== '') params.set('status', status)
    const res = await fetch('/api/v1/customers/export?' + params.toString(), {
      headers: { Authorization: 'Bearer ' + (useAuthStore.getState().token ?? '') },
    })
    if (!res.ok) {
      toast.error('导出失败(HTTP ' + String(res.status) + ')')
      return
    }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '客资列表-' + new Date().toISOString().slice(0, 10) + '.' + fmt
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('已导出 ' + fmt.toUpperCase())
  }

  /** 客资重复检测(录手机号失焦时):命中非本人客资 → 提示 */
  const checkDup = async (phone: string): Promise<void> => {
    if (phone.trim().length < 4) return
    try {
      const res = await req<{ rows: LeadRow[] }>('GET', '/customers?q=' + encodeURIComponent(phone.trim()))
      const hit = res.rows.find((x) => x.phone === phone.trim() && x.id !== form?.id)
      if (hit !== undefined) {
        toast.warning('提示:该电话已存在客资「' + hit.name + '」(' + (STATUS_LABEL[hit.status] ?? hit.status) + '),请确认是否重复录入')
      }
    } catch { /* 静默 */ }
  }

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    void req<{ rows: ArtistOption[] }>('GET', '/artists?line=SELL&status=1&pageSize=200').then((r) => setArtists(r.rows)).catch(() => undefined)
  }, [])

  async function save(): Promise<void> {
    if (form === null) return
    if (form.name.trim() === '') {
      toast.error('姓名必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone === '' ? undefined : form.phone.trim(),
        source: form.source === '' ? undefined : form.source.trim(),
        status: form.status,
        note: form.note === '' ? undefined : form.note.trim(),
        ownerArtistId: form.ownerArtistId === '' ? undefined : Number(form.ownerArtistId),
      }
      if (form.id !== undefined) {
        await req('PUT', '/customers/' + String(form.id), body)
        toast.success('客资已更新')
      } else {
        await req('POST', '/customers', body)
        toast.success('客资已录入')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const sortedRows = (() => {
    const list = [...(rows ?? [])]
    // 跟进提醒:待办到期/超 N 天未跟进 → 置顶;其余按录入时间倒序
    list.sort((a, b) => {
      const aHot = a.todoOverdue || daysSinceFollow(a) >= FOLLOW_REMIND_DAYS ? 1 : 0
      const bHot = b.todoOverdue || daysSinceFollow(b) >= FOLLOW_REMIND_DAYS ? 1 : 0
      if (aHot !== bHot) return bHot - aHot
      return b.id - a.id
    })
    return list
  })()

  const columns: Array<Column<LeadRow>> = [
    { key: 'name', header: '客户', render: (r) => {
      const days = daysSinceFollow(r)
      const hot = r.todoOverdue || days >= FOLLOW_REMIND_DAYS
      return (
        <button className="text-left hover:underline" title="查看客资档案" onClick={() => { openDetail(r) }}>
          <span className="font-medium">{r.name}</span>
          {r.todoOverdue && <span className="ml-1 text-[10px] px-1 rounded bg-error/15 text-error">待办到期</span>}
          {!r.todoOverdue && days >= FOLLOW_REMIND_DAYS && <span className="ml-1 text-[10px] px-1 rounded bg-warning/15 text-warning">{String(days)} 天未跟进</span>}
        </button>
      )
    } },
    { key: 'phone', header: '电话', render: (r) => r.phone ?? '—' },
    { key: 'source', header: '来源', render: (r) => r.source ?? '—' },
    { key: 'status', header: '状态', render: (r) => <StatusBadge label={STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? '#ffaa00'} /> },
    { key: 'ownerName', header: '归属销售经理', render: (r) => r.ownerName ?? '—' },
    { key: 'lastFollow', header: '最近跟进', render: (r) => r.lastFollowContent !== null ? (
      <span className="text-xs" title={r.lastFollowAt !== null ? r.lastFollowAt.slice(0, 16).replace('T', ' ') : ''}>
        {r.lastFollowContent.slice(0, 18) + (r.lastFollowContent.length > 18 ? '…' : '')}
        <span className="text-fg-muted">({String(r.followupCount)})</span>
      </span>
    ) : <span className="text-xs text-fg-muted">—</span> },
    { key: 'note', header: '跟进备注', render: (r) => r.note ?? '—' },
    { key: 'createdAt', header: '录入时间', render: (r) => r.createdAt.slice(0, 16).replace('T', ' ') },
    {
      key: 'act',
      header: '操作',
      render: (r) => (
        <div className="flex gap-1 flex-wrap">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm({
            id: r.id,
            name: r.name,
            phone: r.phone ?? '',
            source: r.source ?? '',
            status: r.status,
            note: r.note ?? '',
            ownerArtistId: r.ownerArtistId !== null ? String(r.ownerArtistId) : '',
          })}>编辑</Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { openFollowups(r) }}>跟进</Button>
          <ConfirmButton
            confirmTitle="确认删除客资"
            confirmDesc={'「' + r.name + '」删除后不可恢复。'}
            onConfirm={() => {
              void req('POST', '/customers/' + String(r.id) + '/delete', {}).then(async () => {
                toast.success('客资已删除')
                await load()
              }).catch((e) => toastError(e))
            }}
          >
            <span className="text-xs">删除</span>
          </ConfirmButton>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="客户(客资体系)"
        desc="客户线索名录:来源/状态(跟进中·已成交·已流失)/跟进备注;管理端全量,销售端仅本人归属;员工录入客资归属个人"
        actions={
          <div className="flex gap-2">
            <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => { setView('list') }}>列表</Button>
            <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => { setView('calendar') }}>待办日历</Button>
            <Button variant="outline" size="sm" onClick={() => { void exportCustomers('xlsx') }}>导出 xlsx</Button>
            <Button variant="outline" size="sm" onClick={() => { void exportCustomers('csv') }}>CSV</Button>
            <Button onClick={() => setForm({ name: '', phone: '', source: '', status: 'FOLLOW', note: '', ownerArtistId: '' })}>+ 录入客资</Button>
          </div>
        }
      />
      <Card className="p-4 mb-3 flex flex-row flex-wrap items-center gap-3">
        <Input className="w-52" placeholder="搜索:姓名/电话/备注" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="h-9 rounded border border-line bg-transparent px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="FOLLOW">跟进中</option>
          <option value="DEAL">已成交</option>
          <option value="LOST">已流失</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => { void load() }}>查询</Button>
      </Card>
      {/* list 视图:统计条+表格(calendar 视图显示待办日历) */}
      {view === 'list' && (
      <>
      {/* 来源转化统计条(按当前筛选聚合) */}
      {sourceStats.length > 0 && (
        <Card className="p-3 flex flex-row flex-wrap items-center gap-4">
          <span className="text-xs text-fg-muted shrink-0">来源转化:</span>
          {sourceStats.map(([src, st]) => (
            <span key={src} className="text-xs">
              <span className="font-medium">{src}</span>
              <span className="text-fg-muted"> · 总 {String(st.total)} · 成交 {String(st.deal)} · 转化率 </span>
              <span className={st.total > 0 && st.deal / st.total >= 0.3 ? 'text-success font-medium' : 'text-fg-muted'}>{st.total > 0 ? String(Math.round((st.deal / st.total) * 100)) + '%' : '—'}</span>
            </span>
          ))}
        </Card>
      )}
      {/* 转化率排行(按销售经理;衔接员工绩效) */}
      {ownerRank.length > 0 && (
        <Card className="p-3 flex flex-row flex-wrap items-center gap-4">
          <span className="text-xs text-fg-muted shrink-0">转化排行:</span>
          {ownerRank.map((o, i) => (
            <span key={o.name} className="text-xs">
              <span className="text-fg-muted">{String(i + 1)}.</span>
              <span className="font-medium"> {o.name}</span>
              <span className="text-fg-muted"> · 客资 {String(o.total)} · 成交 {String(o.deal)} · </span>
              <span className={o.rate >= 30 ? 'text-success font-medium' : ''}>{String(o.rate)}%</span>
            </span>
          ))}
        </Card>
      )}
      <DataTable columns={columns} rows={sortedRows} loading={rows === undefined} />
      </>
      )}

      {/* calendar 视图:待办日历(按到期日排布) */}
      {view === 'calendar' && (
        <Card className="p-4 space-y-4">
          <div className="text-xs text-fg-muted">跟进待办日历(按到期日排布;点击「完成」核销;过期置顶红显)</div>
          {todoRows.length === 0 && <div className="text-sm text-fg-muted py-4 text-center">暂无未完成待办;在「列表」视图点客资「跟进」可创建</div>}
          {(() => {
            const byDay = new Map<string, TodoBoardRow[]>()
            for (const t of todoRows) {
              const day = t.dueAt !== null ? t.dueAt.slice(0, 10) : '未设到期'
              const arr = byDay.get(day) ?? []
              arr.push(t)
              byDay.set(day, arr)
            }
            return [...byDay.entries()].map(([day, items]) => (
              <div key={day} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={'text-sm font-semibold ' + (day !== '未设到期' && day < new Date().toISOString().slice(0, 10) ? 'text-error' : 'text-[var(--lm-fg)]')}>{day}</span>
                  <span className="text-xs text-fg-muted">{String(items.length)} 项{day !== '未设到期' && day < new Date().toISOString().slice(0, 10) ? ' · 已过期' : ''}</span>
                </div>
                {items.map((t) => (
                  <div key={t.id} className={'border rounded-lg px-2.5 py-1.5 text-sm ' + (t.overdue ? 'border-error/50 bg-error/5' : 'border-line')}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.leadName}</span>
                      {t.leadPhone !== null && <span className="text-xs text-fg-muted">{t.leadPhone}</span>}
                      <button className="ml-auto text-xs text-primary hover:underline" onClick={() => {
                        const r = (rows ?? []).find((x) => x.id === t.leadId)
                        if (r !== undefined) openFollowups(r)
                      }}>跟进 →</button>
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5 break-all">{t.content}</p>
                  </div>
                ))}
              </div>
            ))
          })()}
        </Card>
      )}

      {/* 跟进时间线弹窗(一客多条) */}
      <Dialog open={fuFor !== null} onOpenChange={(o) => { if (!o) setFuFor(null) }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>跟进时间线 · {fuFor?.name ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {fuRows.length === 0 && <div className="text-xs text-fg-muted py-2">暂无跟进记录;下方输入第一条</div>}
            {fuRows.map((f) => (
              <div key={f.id} className={'border rounded-lg px-2.5 py-1.5 ' + (f.kind === 'TODO' && !f.isDone ? 'border-warning/50 bg-warning/5' : 'border-line')}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-line text-fg-muted">{KIND_LABEL[f.kind] ?? f.kind}</span>
                  {f.kind === 'TODO' && !f.isDone && f.dueAt !== null && (
                    <span className={'text-[10px] ' + (new Date(f.dueAt).getTime() < Date.now() ? 'text-error font-medium' : 'text-fg-muted')}>到期 {f.dueAt.slice(5, 16).replace('T', ' ')}</span>
                  )}
                  <span className="text-[10px] text-fg-muted ml-auto">{f.createdAt.slice(5, 16).replace('T', ' ')} · {f.creatorName}</span>
                </div>
                <p className={'text-xs mt-1 break-all ' + (f.kind === 'TODO' && f.isDone ? 'line-through text-fg-muted' : '')}>{f.content}</p>
                {f.kind === 'TODO' && !f.isDone && (
                  <button className="text-[10px] text-success hover:underline mt-1" onClick={() => { if (fuFor !== null) doneTodo(fuFor, f.id) }}>✓ 完成待办</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-line">
            <label className="flex items-center gap-1 text-xs text-fg-muted cursor-pointer select-none shrink-0">
              <input type="checkbox" checked={fuTodo} onChange={(e) => { setFuTodo(e.target.checked); if (!e.target.checked) setFuDue('') }} />
              待办
            </label>
            {fuTodo && <input type="datetime-local" className="h-8 rounded border border-line bg-transparent px-1 text-xs" value={fuDue} onChange={(e) => setFuDue(e.target.value)} />}
            <Input value={fuInput} onChange={(e) => setFuInput(e.target.value)} placeholder={fuTodo ? '待办事项(须带到期时间)' : '记录本次跟进(沟通/意向/预算)'} onKeyDown={(e) => { if (e.key === 'Enter' && !fuTodo) addFollowup() }} />
            <Button disabled={fuInput.trim() === '' || (fuTodo && fuDue === '')} onClick={() => { addFollowup() }}>记录</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuFor(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 客资详情档案卡(基本信息+时间线+关联预订一屏;点客资名进入) */}
      <Dialog open={detailFor !== null} onOpenChange={(o) => { if (!o) setDetailFor(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>客资档案 · {detailFor?.name ?? ''}</DialogTitle>
          </DialogHeader>
          {detailFor !== null && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-xs text-fg-muted">电话:</span>{detailFor.phone ?? '—'}</div>
                <div><span className="text-xs text-fg-muted">来源:</span>{detailFor.source ?? '—'}</div>
                <div><span className="text-xs text-fg-muted">状态:</span><StatusBadge label={STATUS_LABEL[detailFor.status] ?? detailFor.status} color={STATUS_COLOR[detailFor.status] ?? '#ffaa00'} /></div>
                <div><span className="text-xs text-fg-muted">归属:</span>{detailFor.ownerName ?? '—'}</div>
                <div className="col-span-2"><span className="text-xs text-fg-muted">备注:</span>{detailFor.note ?? '—'}</div>
                {detailFor.todoOverdue && (
                  <div className="col-span-2 text-xs text-error">⚠ 待办到期:{detailFor.todoContent ?? ''}(到期 {detailFor.todoDueAt !== null ? detailFor.todoDueAt.slice(5, 16).replace('T', ' ') : ''})</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-fg-muted mb-1.5">关联预订历史</div>
                {detailBooks.length === 0 && <div className="text-xs text-fg-muted">暂无预订记录</div>}
                <div className="space-y-1">
                  {detailBooks.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 text-xs border border-line rounded px-2 py-1">
                      <span className="font-medium">{b.bookingNo}</span>
                      <span className="text-fg-muted">{b.status}</span>
                      <span>{b.roomName ?? '无房'}</span>
                      <span className="text-fg-muted">{b.artistName ?? ''}</span>
                      <span className="text-fg-muted ml-auto">{b.bookingTime !== null ? b.bookingTime.slice(5, 16).replace('T', ' ') : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-fg-muted mb-1.5">跟进时间线({String(detailFu.length)} 条)</div>
                <div className="space-y-1.5">
                  {detailFu.length === 0 && <div className="text-xs text-fg-muted">暂无跟进记录</div>}
                  {detailFu.map((f) => (
                    <div key={f.id} className="flex items-start gap-2 text-xs border-b border-line/60 pb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-line text-fg-muted shrink-0">{KIND_LABEL[f.kind] ?? f.kind}</span>
                      <span className="flex-1 break-all">{f.content}</span>
                      <span className="text-fg-muted shrink-0">{f.createdAt.slice(5, 16).replace('T', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailFor(null)}>关闭</Button>
            {detailFor !== null && <Button onClick={() => { const r = detailFor; setDetailFor(null); openFollowups(r) }}>记跟进</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑客资' : '录入客资'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">姓名(必填)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">电话</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onBlur={(e) => { void checkDup(e.target.value) }} placeholder="失焦自动查重" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">来源(抖音/朋友介绍/路过…)</Label>
                  <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">状态</Label>
                  <select
                    className="w-full h-9 rounded border border-line bg-transparent px-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="FOLLOW">跟进中</option>
                    <option value="DEAL">已成交</option>
                    <option value="LOST">已流失</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">跟进备注</Label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="最近沟通/意向/预算" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">归属销售经理(衔接员工体系;空=录入人)</Label>
                <select
                  className="w-full h-9 rounded border border-line bg-transparent px-2 text-sm"
                  value={form.ownerArtistId}
                  onChange={(e) => setForm({ ...form, ownerArtistId: e.target.value })}
                >
                  <option value="">默认(录入人本人)</option>
                  {artists.map((a) => (
                    <option key={a.id} value={String(a.id)}>{a.stageName ?? a.realName}{a.badgeNo !== null ? '(' + a.badgeNo + ')' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void save() }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
