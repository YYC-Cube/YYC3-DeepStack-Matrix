/**
 * 任务中心(桌面 /tasks;2026-11-07 管理员界面化):下发(选人器/类型/目标/周期)/取消/进度
 * 与 /m/tasks 同逻辑;查看=全员,下发/取消=setting:manage
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ConfirmButton, DataTable, Field, PageHeader, SelectBox, type Column } from '@/components/kit'
import PersonPicker from '@/components/person-picker'

interface TaskRow {
  id: number
  type: string
  title: string
  targetName: string
  targetCount: number
  progress: number
  rawProgress: number
  recurrence?: string
  startAt: string
  endAt: string
}

const TYPE_LABEL: Record<string, string> = { BOOKING: '订房任务', ORDER: '点餐任务' }

/** 任务模板库(常用指标一键套用;2026-11-07) */
/** 模板库(持久化 task_template;GET /tasks/templates 数据源,管理员可增改删) */
interface TplRow {
  id: number
  name: string
  type: string
  title: string
  targetCount: number
  days: number
  recurrence: string
  applyCount: number
}

export default function TasksAdminPage(): React.JSX.Element {
  const permCodes = useAuthStore((s) => s.permCodes)
  const canManage = permCodes.includes('setting:manage')
  const [rows, setRows] = useState<TaskRow[]>()
  const [templates, setTemplates] = useState<TplRow[]>([])
  const [tplForm, setTplForm] = useState<{ id?: number; name: string; type: string; title: string; targetCount: string; days: string; recurrence: string; sort: number } | null>(null)
  const [form, setForm] = useState<{ type: string; title: string; artistId: string; artistName: string; targetCount: string; startAt: string; endAt: string; recurrence: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: TaskRow[] }>('GET', '/tasks')
      setRows(res.rows)
      void req<{ rows: TplRow[] }>('GET', '/tasks/templates').then((r) => setTemplates(r.rows)).catch(() => undefined)
    } catch (e) {
      toastError(e, '任务加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // WS 实时(2026-11-07):task:changed(下发/取消/达标/超期/周期重建)→即时刷新;断线静默(下发/取消本页操作已本地刷新)
  const token = useAuthStore((s) => s.token)
  useEffect(() => {
    if (token === null || token === '') return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    let ws: WebSocket
    try {
      ws = new WebSocket(proto + '://' + location.host + '/api/v1/ws/chat?token=' + encodeURIComponent(token))
    } catch {
      return
    }
    ws.onmessage = (ev) => {
      try {
        const p = JSON.parse(String(ev.data)) as { event?: string }
        if (p.event === 'task:changed') void load()
      } catch { /* 非 JSON 静默 */ }
    }
    return () => { try { ws.close() } catch { /* 静默 */ } }
  }, [token, load])

  async function create(): Promise<void> {
    if (form === null || form.title.trim() === '' || form.artistId === '' || form.targetCount === '') {
      toast.error('人员/任务名称/目标数量 必填')
      return
    }
    setBusy(true)
    try {
      await req('POST', '/tasks', {
        type: form.type,
        title: form.title.trim(),
        targetArtistId: Number(form.artistId),
        targetCount: Number(form.targetCount),
        startAt: new Date(form.startAt + 'T00:00:00').toISOString(),
        endAt: new Date(form.endAt + 'T23:59:59').toISOString(),
        recurrence: form.recurrence,
      })
      toast.success('任务已下发(达标/超期将自动通知)')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const columns: Array<Column<TaskRow>> = [
    { key: 'type', header: '类型', render: (r) => <span className="text-xs px-1.5 py-0.5 rounded border border-line">{TYPE_LABEL[r.type] ?? r.type}</span> },
    { key: 'title', header: '任务名称' },
    { key: 'targetName', header: '对象' },
    { key: 'period', header: '周期', render: (r) => `${r.startAt.slice(0, 10)} ~ ${r.endAt.slice(0, 10)}` },
    { key: 'recurrence', header: '重复', render: (r) => r.recurrence === 'DAILY' ? '每日' : r.recurrence === 'WEEKLY' ? '每周' : '单次' },
    {
      key: 'progress',
      header: '完成度',
      render: (r) => {
        const pct = r.targetCount > 0 ? Math.min(100, Math.round((r.rawProgress / r.targetCount) * 100)) : 0
        const ok = r.rawProgress >= r.targetCount
        return (
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="flex-1 h-2 rounded bg-fg-muted/10 overflow-hidden">
              <div className={'h-full ' + (ok ? 'bg-success' : 'bg-primary')} style={{ width: String(pct) + '%' }} />
            </div>
            <span className={'text-xs tabular-nums ' + (ok ? 'text-success' : '')}>{String(r.rawProgress)}/{String(r.targetCount)}{ok ? ' ✅' : ''}</span>
          </div>
        )
      },
    },
    {
      key: 'act',
      header: '操作',
      render: (r) => canManage ? (
        <ConfirmButton
          confirmTitle="取消任务"
          confirmDesc="取消后该任务不再展示(不删记录)。"
          onConfirm={() => {
            void req('POST', '/tasks/' + String(r.id) + '/cancel', {})
              .then(() => { toast.success('已取消'); return load() })
              .catch((e) => toastError(e))
          }}
        >
          取消
        </ConfirmButton>
      ) : (
        <span className="text-xs text-fg-muted">—</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="任务中心"
        desc="给销售经理下发订房/点餐指标;完成度实时聚合(数据与轮房/点单同源);达标/超期自动通知下发人"
        actions={canManage ? (
          <Button onClick={() => {
            const from = new Date()
            const to = new Date(Date.now() + 7 * 86_400_000)
            const fmt = (d: Date): string => d.toISOString().slice(0, 10)
            setForm({ type: 'BOOKING', title: '', artistId: '', artistName: '', targetCount: '', startAt: fmt(from), endAt: fmt(to), recurrence: 'NONE' })
          }}>+ 下发任务</Button>
        ) : undefined}
      />
      <DataTable columns={columns} rows={rows} loading={rows === undefined} total={rows?.length ?? 0} page={1} pageSize={50} />

      {/* 模板库管理(canManage) */}
      {canManage && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">任务模板库</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTplForm({ id: undefined, name: '', type: 'BOOKING', title: '', targetCount: '', days: '7', recurrence: 'NONE', sort: 0 })}
            >
              + 新增模板
            </Button>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: '模板名' },
              { key: 'type', header: '类型', render: (r) => TYPE_LABEL[r.type] ?? r.type },
              { key: 'title', header: '任务标题' },
              { key: 'targetCount', header: '目标数', render: (r) => String(r.targetCount) },
              { key: 'days', header: '期长(天)', render: (r) => String(r.days) },
              { key: 'recurrence', header: '周期', render: (r) => r.recurrence === 'DAILY' ? '每日' : r.recurrence === 'WEEKLY' ? '每周' : '单次' },
              {
                key: 'act',
                header: '操作',
                render: (r) => (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setTplForm({ id: r.id, name: r.name, type: r.type, title: r.title, targetCount: String(r.targetCount), days: String(r.days), recurrence: r.recurrence, sort: 0 })}>编辑</Button>
                    <ConfirmButton
                      confirmTitle="删除模板"
                      confirmDesc="删除后一键套用不再显示该模板。"
                      onConfirm={() => {
                        void req('POST', '/tasks/templates/' + String(r.id) + '/delete', {})
                          .then(() => { toast.success('已删除'); return load() })
                          .catch((e) => toastError(e))
                      }}
                    >
                      删除
                    </ConfirmButton>
                  </div>
                ),
              },
            ] as Array<Column<TplRow>>}
            rows={templates}
            loading={templates === undefined}
            total={templates?.length ?? 0}
            page={1}
            pageSize={50}
          />
          <Dialog open={tplForm !== null} onOpenChange={(o) => { if (!o) setTplForm(null) }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{tplForm?.id !== undefined ? '编辑模板' : '新增模板'}</DialogTitle>
              </DialogHeader>
              {tplForm !== null && (
                <div className="space-y-3">
                  <Field label="模板名" required>
                    <Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="类型">
                      <SelectBox value={tplForm.type} onChange={(v) => setTplForm({ ...tplForm, type: v })} options={[{ value: 'BOOKING', label: '订房' }, { value: 'ORDER', label: '点餐' }]} />
                    </Field>
                    <Field label="任务标题">
                      <Input value={tplForm.title} onChange={(e) => setTplForm({ ...tplForm, title: e.target.value })} />
                    </Field>
                    <Field label="目标数">
                      <Input inputMode="numeric" value={tplForm.targetCount} onChange={(e) => setTplForm({ ...tplForm, targetCount: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    <Field label="期长(天)">
                      <Input inputMode="numeric" value={tplForm.days} onChange={(e) => setTplForm({ ...tplForm, days: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    <Field label="周期">
                      <SelectBox value={tplForm.recurrence} onChange={(v) => setTplForm({ ...tplForm, recurrence: v })} options={[{ value: 'NONE', label: '单次' }, { value: 'DAILY', label: '每日' }, { value: 'WEEKLY', label: '每周' }]} />
                    </Field>
                    <Field label="排序">
                      <Input inputMode="numeric" value={String(tplForm.sort)} onChange={(e) => setTplForm({ ...tplForm, sort: Number(e.target.value) || 0 })} />
                    </Field>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setTplForm(null)}>取消</Button>
                <Button
                  disabled={busy || tplForm?.name.trim() === '' || tplForm?.title.trim() === '' || tplForm?.targetCount === ''}
                  onClick={() => {
                    if (tplForm === null) return
                    const body = {
                      name: tplForm.name.trim(),
                      type: tplForm.type,
                      title: tplForm.title.trim(),
                      targetCount: Number(tplForm.targetCount) || 1,
                      days: Number(tplForm.days) || 7,
                      recurrence: tplForm.recurrence,
                      sort: tplForm.sort,
                    }
                    setBusy(true)
                    const call = tplForm.id !== undefined
                      ? req('POST', '/tasks/templates/' + String(tplForm.id), body)
                      : req('POST', '/tasks/templates', body)
                    void call
                      .then(() => { toast.success('模板已保存'); setTplForm(null); return load() })
                      .catch((e) => toastError(e))
                      .finally(() => setBusy(false))
                  }}
                >
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      <PersonPicker
        open={pickerOpen}
        title="选择任务对象(销售经理)"
        line="SELL"
        excludeBusy={false}
        onClose={() => { setPickerOpen(false) }}
        onPick={(p) => {
          if (p !== null && !Array.isArray(p) && form !== null) {
            setForm({ ...form, artistId: String(p.id), artistName: p.realName })
          }
        }}
      />

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>下发任务</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant={form.type === 'BOOKING' ? 'default' : 'outline'} onClick={() => setForm({ ...form, type: 'BOOKING' })}>订房任务</Button>
                <Button variant={form.type === 'ORDER' ? 'default' : 'outline'} onClick={() => setForm({ ...form, type: 'ORDER' })}>点餐任务</Button>
              </div>
              <Field label="人员(选人器)">
                <Button variant="outline" className="w-full justify-start" onClick={() => { setPickerOpen(true) }}>
                  {form.artistName !== '' ? `已选:${form.artistName}#${form.artistId}` : '+ 选择人员'}
                </Button>
              </Field>
              <Field label="模板一键套用(常用指标)">
                <SelectBox
                  value=""
                  onChange={(v) => {
                    const tpl = templates.find((t) => String(t.id) === v)
                    if (tpl === undefined) return
                    const from = new Date()
                    const to = new Date(from.getTime() + tpl.days * 86_400_000)
                    const fmt = (d: Date): string => d.toISOString().slice(0, 10)
                    setForm({ ...form, title: tpl.title, type: tpl.type, targetCount: String(tpl.targetCount), startAt: fmt(from), endAt: fmt(to), recurrence: tpl.recurrence })
                    void req('POST', '/tasks/templates/' + String(tpl.id) + '/apply', {}).catch(() => undefined)
                    toast.success('模板已套用:' + tpl.name)
                  }}
                  options={[{ value: '', label: '选择模板…' }, ...[...templates].sort((a, b) => b.applyCount - a.applyCount).map((t) => ({ value: String(t.id), label: t.name + (t.applyCount > 0 ? ' (用过' + String(t.applyCount) + '次)' : '') }))]}
                />
              </Field>
              <Field label="任务名称" required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如:本周订房冲刺 10 间" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="目标数">
                  <Input inputMode="numeric" value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: e.target.value.replace(/\D/g, '') })} />
                </Field>
                <Field label="开始">
                  <Input type="date" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
                </Field>
                <Field label="结束">
                  <Input type="date" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                </Field>
              </div>
              <Field label="周期(到期自动重建下一周期)">
                <SelectBox
                  value={form.recurrence}
                  onChange={(v) => setForm({ ...form, recurrence: v })}
                  options={[{ value: 'NONE', label: '单次' }, { value: 'DAILY', label: '每日重建' }, { value: 'WEEKLY', label: '每周重建' }]}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void create() }}>确定下发</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
