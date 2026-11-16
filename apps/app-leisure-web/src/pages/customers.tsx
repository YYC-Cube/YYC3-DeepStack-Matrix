/**
 * 客资体系(2026-11-07 P5):客户线索最小闭环——名录/电话/来源/状态/跟进;增改删
 * ADMIN 全量,ARTIST(销售端)仅本人归属;DataTable 移动端自动卡片化
 */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
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
  tags: string
}

/** 标签色板(按标签名稳定取色;10 预设) */
const TAG_PALETTE = ['#00d4ff', '#00cc88', '#ffaa00', '#ff6699', '#7b8cff', '#c084fc', '#38bdf8', '#f97316', '#22d3ee', '#a3e635']
function tagColor(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % 997
  return TAG_PALETTE[h % TAG_PALETTE.length]
}

export default function CustomersPage(): React.JSX.Element {
  const [rows, setRows] = useState<LeadRow[]>()
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [artists, setArtists] = useState<ArtistOption[]>([])
  /** 归属过滤(排行卡跳转 ?ownerArtistId=;可清除) */
  const [searchParams, setSearchParams] = useSearchParams()
  const ownerFilter = searchParams.get('ownerArtistId') ?? ''
  /** 分页 */
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  /** 跟进时间线弹窗 */
  const [fuFor, setFuFor] = useState<LeadRow | null>(null)
  const [fuRows, setFuRows] = useState<FollowupRow[]>([])
  const [fuInput, setFuInput] = useState('')
  const [fuTodo, setFuTodo] = useState(false)
  const [fuDue, setFuDue] = useState('')
  /** 月视图选中日(明细面板) */
  const [detailDay, setDetailDay] = useState('')
  /** 时间线已展开历史月(点组头开/关;最近月恒开) */
  const [openedMonths, setOpenedMonths] = useState<Set<string>>(new Set())
  /** 标签池管理弹窗 */
  const [tagPoolOpen, setTagPoolOpen] = useState(false)
  const [tagPool, setTagPool] = useState<Array<{ tag: string; count: number; lastUsedAt: string | null }>>([])
  const [renameFrom, setRenameFrom] = useState('')
  const [renameTo, setRenameTo] = useState('')
  /** 标签合并(A+B → A) */
  const [mergeA, setMergeA] = useState('')
  const [mergeB, setMergeB] = useState('')
  const [mergeTo, setMergeTo] = useState('')
  /** 批量跟进多选(id 集合)+批量内容弹窗 */
  const [selIds, setSelIds] = useState<Set<number>>(new Set())
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchContent, setBatchContent] = useState('')
  /** 粘贴解析模式(Excel 两列:客名+内容) */
  const [pasteText, setPasteText] = useState('')
  const [pasteReport, setPasteReport] = useState('')
  /** 拖拽落点格(高亮) */
  const [dropTargetDay, setDropTargetDay] = useState('')

  const loadTagPool = (): void => {
    void req<{ rows: Array<{ tag: string; count: number; lastUsedAt: string | null }> }>('GET', '/customers/tags').then((r) => setTagPool(r.rows)).catch(() => undefined)
  }

  const renameTag = (): void => {
    if (renameFrom.trim() === '' || renameTo.trim() === '') return
    void req('POST', '/customers/tags/rename', { from: renameFrom.trim(), to: renameTo.trim() }).then(async (r) => {
      toast.success('已重命名(更新 ' + String((r as { updated: number }).updated) + ' 条客资)')
      setRenameFrom('')
      setRenameTo('')
      loadTagPool()
      await load()
    }).catch((e) => toastError(e))
  }

  /** 批量跟进(多客资同内容;逐条 POST followups) */
  const submitBatch = async (): Promise<void> => {
    if (batchContent.trim() === '') return
    let ok = 0
    for (const leadId of selIds) {
      const lead = (rows ?? []).find((x) => x.id === leadId)
      if (lead === undefined) continue
      try {
        await req('POST', '/customers/' + String(leadId) + '/followups', { content: batchContent.trim() })
        ok += 1
      } catch { /* 单条失败跳过 */ }
    }
    toast.success('批量跟进完成(' + String(ok) + '/' + String(selIds.size) + ')')
    setBatchOpen(false)
    setBatchContent('')
    setSelIds(new Set())
    await load()
  }

  /** 粘贴解析逐条提交(Excel 两列:客名+内容;客名按当前列表匹配) */
  const submitPaste = async (): Promise<void> => {
    const lines = pasteText.split('\n').map((l) => l.trim()).filter((l) => l !== '')
    if (lines.length === 0) return
    let ok = 0
    const fail: string[] = []
    for (const line of lines) {
      const sep = line.includes('\t') ? '\t' : (line.includes(',') ? ',' : (line.includes(';') ? ';' : ''))
      if (sep === '') { fail.push('格式跳过:' + line.slice(0, 20)); continue }
      const parts = line.split(sep)
      const lname = parts[0].trim()
      const content = parts.slice(1).join(' ').trim()
      if (lname === '' || content === '') { fail.push('缺内容:' + lname); continue }
      const lead = (rows ?? []).find((x) => x.name === lname)
      if (lead === undefined) { fail.push('未找到客资:' + lname); continue }
      try {
        await req('POST', '/customers/' + String(lead.id) + '/followups', { content })
        ok += 1
      } catch { fail.push('失败:' + lname) }
    }
    setPasteReport('成功 ' + String(ok) + ' / 共 ' + String(lines.length) + (fail.length > 0 ? ';失败:' + fail.join(';') : ''))
    if (ok > 0) await load()
  }
  const toggleSel = (id: number): void => {
    setSelIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const removeTagPool = (tag: string): void => {
    void req('POST', '/customers/tags/remove', { tag }).then(async () => {
      toast.success('标签已移除')
      loadTagPool()
      await load()
    }).catch((e) => toastError(e))
  }
  /** 客资详情页化(档案卡:基本信息+时间线+关联预订一屏) */
  const [detailFor, setDetailFor] = useState<LeadRow | null>(null)
  const [detailFu, setDetailFu] = useState<FollowupRow[]>([])
  const [detailBooks, setDetailBooks] = useState<BookingLite[]>([])
  /** 房账消费历史(360°:直读列) */
  const [detailRooms, setDetailRooms] = useState<Array<{ id: number; roomNo: string; startAt: string; endAt: string | null; status: string; orderTotal: number }>>([])
  /** 视图切换:列表 / 待办日历(按到期日排布) */
  const [view, setView] = useState<'list' | 'calendar' | 'month'>('list')
  /** 月视图当前月(YYYY-MM) */
  const [monthCursor, setMonthCursor] = useState(() => new Date().toISOString().slice(0, 7))
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
    void req<{ rows: Array<{ id: number; roomNo: string; startAt: string; endAt: string | null; status: string; orderTotal: number }> }>('GET', '/customers/' + String(r.id) + '/room-history').then((res) => setDetailRooms(res.rows)).catch(() => undefined)
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
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (q.trim() !== '') params.set('q', q.trim())
      if (status !== '') params.set('status', status)
      if (ownerFilter !== '') params.set('ownerArtistId', ownerFilter)
      const res = await req<{ rows: LeadRow[]; total: number }>('GET', '/customers' + (params.toString() !== '' ? '?' + params.toString() : ''))
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      toastError(e, '客资加载失败')
    }
  }, [q, status, ownerFilter, page])

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
  const checkDup = async (phone: string, name?: string): Promise<void> => {
    if (phone.trim().length < 4 && (name === undefined || name.trim() === '')) return
    try {
      const res = await req<{ rows: LeadRow[] }>('GET', '/customers?q=' + encodeURIComponent(phone.trim() !== '' ? phone.trim() : (name ?? '')))
      const others = res.rows.filter((x) => x.id !== form?.id)
      const samePhone = others.find((x) => x.phone === phone.trim() && phone.trim() !== '')
      if (samePhone !== undefined) {
        toast.warning('查重:该电话已存在客资「' + samePhone.name + '」(' + (STATUS_LABEL[samePhone.status] ?? samePhone.status) + '),请确认是否重复录入')
        return
      }
      // 模糊命中:姓名相同且电话后四位一致
      if (name !== undefined && name.trim() !== '' && phone.trim().length >= 4) {
        const fuzzy = others.find((x) => x.name === name.trim() && x.phone !== null && x.phone.slice(-4) === phone.trim().slice(-4))
        if (fuzzy !== undefined) {
          toast.warning('查重:疑似同客「' + fuzzy.name + '」(姓名一致+电话后四位 ' + fuzzy.phone!.slice(-4) + '),请确认')
        }
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
        tags: form.tags === '' ? undefined : form.tags.trim(),
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
    // overdue=1(动态卡超期数字跳转):仅显带超期未办 TODO 的客资
    const f = searchParams.get('overdue')
    return f === '1' ? list.filter((x) => x.todoOverdue) : list
  })()

  const columns: Array<Column<LeadRow>> = [
    { key: 'sel', header: '选', render: (r) => (
      <input
        type="checkbox"
        checked={selIds.has(r.id)}
        onChange={() => { toggleSel(r.id) }}
        className="cursor-pointer"
        title="勾选=批量跟进目标"
      />
    ) },
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
    { key: 'tags', header: '标签', render: (r) => r.tags !== '' && r.tags !== null ? (
      <span className="flex gap-1 flex-wrap">
        {r.tags.split(',').filter((t) => t.trim() !== '').map((t) => {
          const c = tagColor(t.trim())
          const active = q.trim() === t.trim()
          return (
            <button
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={active ? { background: c, color: '#06122a' } : { border: '1px solid ' + c, color: c }}
              title="点击按该标签筛选"
              onClick={() => { const nv = active ? '' : t.trim(); setQ(nv); setPage(1); void load() }}
            >
              {t.trim()}
            </button>
          )
        })}
      </span>
    ) : '—' },
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
            tags: r.tags ?? '',
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
            <Button variant={view === 'month' ? 'default' : 'outline'} size="sm" onClick={() => { setView('month') }}>月视图</Button>
            <Button variant="outline" size="sm" onClick={() => { void exportCustomers('xlsx') }}>导出 xlsx</Button>
            <Button variant="outline" size="sm" onClick={() => { void exportCustomers('csv') }}>CSV</Button>
            <Button variant="outline" size="sm" onClick={() => { loadTagPool(); setTagPoolOpen(true) }}>标签池</Button>
            <Button variant="outline" size="sm" disabled={selIds.size === 0} onClick={() => { setBatchOpen(true) }}>批量跟进({String(selIds.size)})</Button>
            <Button onClick={() => setForm({ name: '', phone: '', source: '', status: 'FOLLOW', note: '', ownerArtistId: '', tags: '' })}>+ 录入客资</Button>
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
        <Button variant="outline" size="sm" onClick={() => { setPage(1); void load() }}>查询</Button>
      </Card>
      {/* list 视图:统计条+表格(calendar 视图显示待办日历) */}
      {view === 'list' && (
      <>
      {ownerFilter !== '' && (
        <Card className="p-2.5 flex items-center gap-2">
          <span className="text-xs">过滤中:归属销售经理 #{ownerFilter}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSearchParams({}); setPage(1) }}>清除过滤</Button>
        </Card>
      )}
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
      <DataTable columns={columns} rows={sortedRows} loading={rows === undefined} total={total} page={page} pageSize={20} onPageChange={setPage} />
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
                    <div className="flex gap-1 mt-1">
                      <button className="text-[10px] text-primary hover:underline" onClick={() => {
                        void req('POST', '/customers/' + String(t.leadId) + '/followups/' + String(t.id) + '/reschedule', { dueAt: new Date(Date.now() + 86_400_000).toISOString() }).then(async () => {
                          toast.success('已改期至明天')
                          await loadTodos()
                        }).catch((e) => toastError(e))
                      }}>改期+1 天</button>
                      <button className="text-[10px] text-success hover:underline" onClick={() => {
                        const r = (rows ?? []).find((x) => x.id === t.leadId)
                        if (r !== undefined) openFollowups(r)
                      }}>跟进 →</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          })()}
        </Card>
      )}

      {/* month 视图:整月网格(每日格=待办条数+预览;点格显当日明细) */}
      {view === 'month' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { const [y, mo] = monthCursor.split('-').map(Number); setMonthCursor(mo === 1 ? String(y - 1) + '-12' : y + '-' + String(mo - 1).padStart(2, '0')) }}>← 上月</Button>
            <span className="text-sm font-semibold">{monthCursor}</span>
            <Button variant="outline" size="sm" onClick={() => { const [y, mo] = monthCursor.split('-').map(Number); setMonthCursor(mo === 12 ? String(y + 1) + '-01' : y + '-' + String(mo + 1).padStart(2, '0')) }}>下月 →</Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setMonthCursor(new Date().toISOString().slice(0, 7)) }}>回到本月</Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-fg-muted">
            {['一', '二', '三', '四', '五', '六', '日'].map((d) => <span key={d}>{d}</span>)}
          </div>
          {(() => {
            const [y, mo] = monthCursor.split('-').map(Number)
            const first = new Date(y, mo - 1, 1)
            const lead = (first.getDay() + 6) % 7 // 周一为一周首
            const days = new Date(y, mo, 0).getDate()
            const cells: Array<{ day: number | null; items: TodoBoardRow[] }> = []
            for (let i = 0; i < lead; i++) cells.push({ day: null, items: [] })
            for (let d = 1; d <= days; d++) {
              const dayStr = monthCursor + '-' + String(d).padStart(2, '0')
              cells.push({ day: d, items: todoRows.filter((t) => (t.dueAt ?? '').slice(0, 10) === dayStr) })
            }
            return (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((c, ci) => (
                  <div
                    key={ci}
                    className={'min-h-16 rounded border p-1 text-xs ' + (c.day === null ? 'border-transparent' : c.items.length > 0 ? 'border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10' : 'border-line') + (dropTargetDay === String(c.day ?? '') ? ' ring-2 ring-primary' : '')}
                    onDragOver={(e) => {
                      if (c.day === null) return
                      e.preventDefault()
                      setDropTargetDay(String(c.day))
                    }}
                    onDragLeave={() => { if (dropTargetDay === String(c.day ?? '')) setDropTargetDay('') }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDropTargetDay('')
                      if (c.day === null) return
                      try {
                        const d = JSON.parse(e.dataTransfer.getData('text/plain')) as { leadId: number; fid: number }
                        const dueAt = monthCursor + '-' + String(c.day).padStart(2, '0') + 'T00:00:00.000Z'
                        void req('POST', '/customers/' + String(d.leadId) + '/followups/' + String(d.fid) + '/reschedule', { dueAt }).then(async () => {
                          toast.success('已改期至 ' + monthCursor + '-' + String(c.day).padStart(2, '0'))
                          await loadTodos()
                        }).catch((err) => toastError(err))
                      } catch { /* 非 JSON 静默 */ }
                    }}
                    onClick={() => {
                      if (c.items.length === 0) return
                      if (c.items.length === 1) {
                        // 单客资格:直开该客时间线弹窗
                        const t = c.items[0]
                        const r = (rows ?? []).find((x) => x.id === t.leadId)
                        openFollowups(r ?? { id: t.leadId, name: t.leadName, phone: t.leadPhone, source: null, status: 'FOLLOW', note: t.content, ownerArtistId: null, ownerName: null, tags: '', lastFollowAt: null, lastFollowContent: null, followupCount: 0, todoOverdue: t.overdue, todoDueAt: t.dueAt, todoContent: t.content, createdAt: t.dueAt ?? '' })
                        return
                      }
                      setDetailDay(String(c.day ?? ''))
                    }}
                  >
                    {c.day !== null && <div className="font-medium mb-0.5">{String(c.day)}</div>}
                    {c.items.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ leadId: t.leadId, fid: t.id }))
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        className={'truncate rounded px-0.5 mb-0.5 cursor-move ' + (t.overdue ? 'bg-error/15 text-error' : 'bg-primary/10 text-primary')}
                        title={t.leadName + ':' + t.content + '(拖到其他日期=改期)'}
                      >
                        {t.leadName}
                      </div>
                    ))}
                    {c.items.length > 2 && <div className="text-[10px] text-fg-muted">+{String(c.items.length - 2)}</div>}
                  </div>
                ))}
              </div>
            )
          })()}
          {detailDay !== '' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{monthCursor}-{detailDay.padStart(2, '0')} 明细</span>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDetailDay('')}>收起</Button>
              </div>
              {todoRows.filter((t) => (t.dueAt ?? '').slice(0, 10) === monthCursor + '-' + detailDay.padStart(2, '0')).map((t) => (
                <div key={t.id} className={'border rounded-lg px-2.5 py-1.5 text-sm ' + (t.overdue ? 'border-error/50' : 'border-line')}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.leadName}</span>
                    {t.leadPhone !== null && <span className="text-xs text-fg-muted">{t.leadPhone}</span>}
                    <span className="text-[10px] text-fg-muted ml-auto">{t.content}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-fg-muted">改期:</span>
                    <input
                      type="date"
                      className="h-6 rounded border border-line bg-transparent px-1 text-xs"
                      value={(t.dueAt ?? '').slice(0, 10)}
                      onChange={(e) => {
                        const nv = e.target.value
                        if (nv === '' || t.id === null) return
                        void req('POST', '/customers/' + String(t.leadId) + '/followups/' + String(t.id) + '/reschedule', { dueAt: nv + 'T00:00:00.000Z' }).then(async () => {
                          toast.success('已改期至 ' + nv)
                          await loadTodos()
                        }).catch((err) => toastError(err))
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {/* 按月折叠分组(最近月默认展开,历史月默认收起;点组头开/关) */}
            {(() => {
              const byMonth = new Map<string, FollowupRow[]>()
              for (const f of fuRows) {
                const mkey = f.createdAt.slice(0, 7)
                const arr = byMonth.get(mkey) ?? []
                arr.push(f)
                byMonth.set(mkey, arr)
              }
              const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a))
              return months.map((mkey, mi) => {
                const list = byMonth.get(mkey) ?? []
                const open = mi === 0 || openedMonths.has(mkey) // 最近月默认展开;历史月默认收起,点组头开/关
                const label = mkey === new Date().toISOString().slice(0, 7) ? '本月' : mkey
                return (
                  <div key={mkey} className="border border-line rounded-lg">
                    <button
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:text-[var(--lm-fg)]"
                      onClick={() => { setOpenedMonths((s) => { const n = new Set(s); if (open) n.delete(mkey); else n.add(mkey); return n }) }}
                    >
                      <span>{open ? '▾' : '▸'}</span>
                      <span>{label}</span>
                      <span className="text-fg-muted font-normal">({String(list.length)} 条)</span>
                      <span className="ml-auto font-normal">{open ? '收起' : '展开'}</span>
                    </button>
                    {open && (
                      <div className="space-y-1.5 px-1 pb-1.5">
                        {list.map((f) => (
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
                    )}
                  </div>
                )
              })
            })()}
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
          <div className="flex gap-1 flex-wrap pt-1">
            <span className="text-[10px] text-fg-muted shrink-0">快捷:</span>
            {['电话回访', '微信问候', '邀约到店', '生日祝福'].map((tpl) => (
              <button key={tpl} className="text-[10px] px-1.5 py-0.5 rounded-full border border-line text-fg-muted hover:border-primary hover:text-primary" onClick={() => { setFuInput(tpl + ':') }}>
                {tpl}
              </button>
            ))}
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
                <div className="text-xs font-semibold text-fg-muted mb-1.5">房账消费历史(直读;含点单合计)</div>
                {detailRooms.length === 0 && <div className="text-xs text-fg-muted">暂无房账记录</div>}
                <div className="space-y-1">
                  {detailRooms.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs border border-line rounded px-2 py-1">
                      <span className="font-medium">{s.roomNo}</span>
                      <span className={s.status === 'OPEN' ? 'text-warning' : 'text-fg-muted'}>{s.status === 'OPEN' ? '消费中' : s.status === 'CLEANING' ? '清扫中' : '已结'}</span>
                      <span className="text-fg-muted">{s.startAt.slice(5, 16).replace('T', ' ')}{s.endAt !== null ? ' → ' + s.endAt.slice(11, 16) : ''}</span>
                      <span className="ml-auto">点单 ¥{String(s.orderTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-fg-muted mb-1.5">未完成 TODO({String(detailFu.filter((f) => f.kind === 'TODO' && !f.isDone).length)} 项)</div>
                {detailFu.filter((f) => f.kind === 'TODO' && !f.isDone).length === 0 && <div className="text-xs text-fg-muted">无未完成待办 ✓</div>}
                <div className="space-y-1">
                  {detailFu.filter((f) => f.kind === 'TODO' && !f.isDone).map((f) => (
                    <div key={f.id} className={'flex items-center gap-2 text-xs border rounded px-2 py-1 ' + (f.dueAt !== null && new Date(f.dueAt).getTime() < Date.now() ? 'border-error/50 bg-error/5' : 'border-warning/40')}>
                      <span className={'shrink-0 ' + (f.dueAt !== null && new Date(f.dueAt).getTime() < Date.now() ? 'text-error font-medium' : 'text-warning')}>待办</span>
                      <span className="flex-1 break-all">{f.content}</span>
                      {f.dueAt !== null && <span className="text-fg-muted shrink-0">到期 {f.dueAt.slice(5, 16).replace('T', ' ')}</span>}
                    </div>
                  ))}
                </div>
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
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={(e) => { void checkDup(form.phone, e.target.value) }} />
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
                <Label className="text-xs text-fg-muted">标签(逗号分隔;如:抖音,高意向,生日月)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="抖音,高意向" />
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

      {/* 批量跟进弹窗(同内容多选 / 粘贴解析逐条两模式) */}
      <Dialog open={batchOpen} onOpenChange={(o) => { if (!o) setBatchOpen(false) }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量跟进(已选 {String(selIds.size)} 条客资)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={batchContent} onChange={(e) => setBatchContent(e.target.value)} placeholder="模式①:同内容(写入所有勾选客资)" />
            <p className="text-xs text-fg-muted">勾选客资 + 上方同内容 → 批量提交。</p>
            <div className="border-t border-line pt-2 space-y-1.5">
              <Label className="text-xs text-fg-muted">模式②:粘贴解析(Excel 两列:客资名[TAB/逗号]内容;每行一条)</Label>
              <textarea
                className="w-full h-24 rounded border border-line bg-transparent p-2 text-xs font-mono"
                placeholder={'客资名\t跟进内容'}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <Button size="sm" variant="outline" disabled={pasteText.trim() === ''} onClick={() => { void submitPaste() }}>
                解析并逐条提交
              </Button>
              {pasteReport !== '' && <p className="text-xs text-fg-muted">{pasteReport}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBatchOpen(false); setPasteText(''); setPasteReport('') }}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 标签池管理弹窗(聚合+重命名+移除;零迁移) */}
      <Dialog open={tagPoolOpen} onOpenChange={(o) => { if (!o) setTagPoolOpen(false) }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>标签池({String(tagPool.length)} 个标签)</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {tagPool.length === 0 && <div className="text-sm text-fg-muted py-3 text-center">标签池为空;在录入/编辑客资时填写标签</div>}
            {tagPool.map((t) => (
              <div key={t.tag} className="flex items-center gap-2 border border-line rounded-lg px-2.5 py-1.5 text-sm">
                <span className="font-medium" style={{ color: tagColor(t.tag) }}>{t.tag}</span>
                <span className="text-xs text-fg-muted flex-1">× {String(t.count)}</span>
                <button className="text-xs text-primary hover:underline" onClick={() => { setRenameFrom(t.tag); setRenameTo(t.tag) }}>重命名</button>
                <button className="text-xs text-error hover:underline" onClick={() => { removeTagPool(t.tag) }}>移除</button>
              </div>
            ))}
          </div>
          {renameFrom !== '' && (
            <div className="flex items-center gap-2 border-t border-line pt-3">
              <span className="text-xs text-fg-muted shrink-0">「{renameFrom}」→</span>
              <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} className="h-8" />
              <Button size="sm" disabled={renameTo.trim() === ''} onClick={() => { renameTag() }}>确认</Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setRenameFrom(''); setRenameTo('') }}>取消</Button>
            </div>
          )}
          {/* 合并(两标签合一) */}
          <div className="border-t border-line pt-3 space-y-1.5">
            <div className="text-xs font-semibold text-fg-muted">合并标签(A+B → A)</div>
            {tagPool.length < 2 ? (
              <div className="text-xs text-fg-muted">标签不足两个,无可合并项</div>
            ) : (
              <div className="flex items-center gap-2">
                <select className="h-8 rounded border border-line bg-transparent px-1 text-xs" value={mergeA} onChange={(e) => setMergeA(e.target.value)}>
                  <option value="">标签 A</option>
                  {tagPool.map((t) => <option key={t.tag} value={t.tag}>{t.tag}({String(t.count)})</option>)}
                </select>
                <span className="text-xs text-fg-muted">+</span>
                <select className="h-8 rounded border border-line bg-transparent px-1 text-xs" value={mergeB} onChange={(e) => setMergeB(e.target.value)}>
                  <option value="">标签 B</option>
                  {tagPool.map((t) => <option key={t.tag} value={t.tag}>{t.tag}({String(t.count)})</option>)}
                </select>
                <span className="text-xs text-fg-muted">→</span>
                <select className="h-8 rounded border border-line bg-transparent px-1 text-xs" value={mergeTo} onChange={(e) => setMergeTo(e.target.value)}>
                  <option value="">目标标签</option>
                  {tagPool.map((t) => <option key={t.tag} value={t.tag}>{t.tag}</option>)}
                </select>
                <Button size="sm" disabled={mergeA === '' || mergeB === '' || mergeA === mergeB} onClick={() => {
                  void req('POST', '/customers/tags/merge', { fromA: mergeA, fromB: mergeB, to: mergeTo }).then(async (r) => {
                    toast.success('已合并(更新 ' + String((r as { updated: number }).updated) + ' 条客资)')
                    setMergeA(''); setMergeB(''); setMergeTo('')
                    loadTagPool()
                    await load()
                  }).catch((e) => toastError(e))
                }}>合并</Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagPoolOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
