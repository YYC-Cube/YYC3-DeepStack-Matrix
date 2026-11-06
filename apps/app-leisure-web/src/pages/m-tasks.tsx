/**
 * 任务中心(/m/tasks;对标竞品图 9「设置订房任务」;2026-11-05 最小闭环)
 * 管理端下发指标(订房/点餐×人员×目标数×起止)→完成度实时聚合;ARTIST 仅看本人任务
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ConfirmButton, Field, PageHeader, SelectBox } from '@/components/kit'
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

export default function MTasksPage(): React.JSX.Element {
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
      toast.success('任务已下发')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="任务中心"
        desc="给销售经理下发订房/点餐指标;完成度实时聚合(数据与轮房/点单同源)"
        actions={canManage ? <Button onClick={() => {
          const from = new Date()
          const to = new Date(Date.now() + 7 * 86_400_000)
          const fmt = (d: Date): string => d.toISOString().slice(0, 10)
          setForm({ type: 'BOOKING', title: '', artistId: '', artistName: '', targetCount: '', startAt: fmt(from), endAt: fmt(to), recurrence: 'NONE' })
        }}>+ 下发任务</Button> : undefined}
      />

      {(rows ?? []).map((t) => {
        const pct = t.targetCount > 0 ? Math.min(100, Math.round((t.progress / t.targetCount) * 100)) : 0
        const done = t.progress >= t.targetCount
        return (
          <Card key={t.id} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-line text-fg-muted">{TYPE_LABEL[t.type] ?? t.type}</span>
              {t.recurrence === 'DAILY' && <span className="text-[10px] text-primary">每日</span>}
              {t.recurrence === 'WEEKLY' && <span className="text-[10px] text-primary">每周</span>}
              <span className="text-sm font-medium flex-1 break-all">{t.title}</span>
              {canManage && (
                <ConfirmButton
                  confirmTitle="取消任务"
                  confirmDesc="取消后该任务不再展示(不删记录)。"
                  onConfirm={() => {
                    void req('POST', '/tasks/' + String(t.id) + '/cancel', {})
                      .then(() => { toast.success('已取消'); return load() })
                      .catch((e) => toastError(e))
                  }}
                >
                  取消
                </ConfirmButton>
              )}
            </div>
            <div className="text-xs text-fg-muted">对象:{t.targetName} · {t.startAt.slice(0, 10)} ~ {t.endAt.slice(0, 10)}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded bg-fg-muted/10 overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: String(pct) + '%',
                    background: done ? '#00ff88' : 'linear-gradient(90deg,#00d4ff,#7b8cff)',
                    transition: 'width .4s ease',
                  }}
                />
              </div>
              <span className={'text-xs tabular-nums ' + (done ? 'text-success' : 'text-[#e0f0ff]')}>
                {String(t.rawProgress)}/{String(t.targetCount)}
                {done ? ' ✅' : ''}
              </span>
            </div>
          </Card>
        )
      })}
      {rows !== undefined && rows.length === 0 && (
        <Card className="p-6 text-center text-sm text-fg-muted">
          {canManage ? '暂无任务,点击「+ 下发任务」给销售经理定指标' : '暂无进行中的任务'}
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
            <DialogTitle>下发任务(对标设置订房任务)</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant={form.type === 'BOOKING' ? 'default' : 'outline'} onClick={() => setForm({ ...form, type: 'BOOKING' })}>订房任务</Button>
                <Button variant={form.type === 'ORDER' ? 'default' : 'outline'} onClick={() => setForm({ ...form, type: 'ORDER' })}>点餐任务</Button>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-fg-muted">人员(选人器)</label>
                <Button variant="outline" className="w-full justify-start" onClick={() => { setPickerOpen(true) }}>
                  {form.artistName !== '' ? `已选:${form.artistName}#${form.artistId}` : '+ 选择人员'}
                </Button>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-fg-muted">任务名称</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如:本周订房冲刺 10 间" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-fg-muted">目标数</label>
                  <Input inputMode="numeric" value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-fg-muted">开始</label>
                  <Input type="date" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-fg-muted">结束</label>
                  <Input type="date" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                </div>
              </div>
              <Field label="周期(到期自动重建下一周期,完成度归零)">
                <SelectBox
                  value={form.recurrence}
                  onChange={(v) => setForm({ ...form, recurrence: v })}
                  options={[{ value: 'NONE', label: '单次' }, { value: 'DAILY', label: '每日重建' }, { value: 'WEEKLY', label: '每周重建' }]}
                />
              </Field>
              <p className="text-[11px] text-fg-muted">完成度实时聚合:订房任务=期内作为在场销售经理的房账数;点餐任务=期内本人有效点单数。达标自动通知下发人。</p>
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
