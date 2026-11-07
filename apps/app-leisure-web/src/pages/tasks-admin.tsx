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
const TASK_TEMPLATES = [
  { id: 'new-m', name: '新人月度·订房 20 间', type: 'BOOKING', title: '新人月度订房指标', count: 20, days: 30, recurrence: 'WEEKLY' },
  { id: 'wk-b10', name: '周冲刺·订房 10 间', type: 'BOOKING', title: '本周订房冲刺', count: 10, days: 7, recurrence: 'NONE' },
  { id: 'wk-b5', name: '周冲刺·订房 5 间(新人)', type: 'BOOKING', title: '新人周订房指标', count: 5, days: 7, recurrence: 'NONE' },
  { id: 'd-o5', name: '每日·点单 5 单', type: 'ORDER', title: '每日点单指标', count: 5, days: 1, recurrence: 'DAILY' },
  { id: 'wk-o20', name: '周指标·点单 20 单', type: 'ORDER', title: '本周点单指标', count: 20, days: 7, recurrence: 'NONE' },
]

export default function TasksAdminPage(): React.JSX.Element {
  const permCodes = useAuthStore((s) => s.permCodes)
  const canManage = permCodes.includes('setting:manage')
  const [rows, setRows] = useState<TaskRow[]>()
  const [form, setForm] = useState<{ type: string; title: string; artistId: string; artistName: string; targetCount: string; startAt: string; endAt: string; recurrence: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: TaskRow[] }>('GET', '/tasks')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '任务加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
                    const tpl = TASK_TEMPLATES.find((t) => t.id === v)
                    if (tpl === undefined) return
                    const from = new Date()
                    const to = new Date(from.getTime() + tpl.days * 86_400_000)
                    const fmt = (d: Date): string => d.toISOString().slice(0, 10)
                    setForm({ ...form, title: tpl.title, type: tpl.type, targetCount: String(tpl.count), startAt: fmt(from), endAt: fmt(to), recurrence: tpl.recurrence })
                    toast.success('模板已套用:' + tpl.name)
                  }}
                  options={[{ value: '', label: '选择模板…' }, ...TASK_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))]}
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
