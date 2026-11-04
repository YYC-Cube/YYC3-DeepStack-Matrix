/**
 * 工作通告(/notices;设置域):发布/编辑/删除(管理端)→ 工作台通知铃+公告条实时拉取
 * 编辑增强(2026-11-04):播放次数/展示时段窗口/滚动速度/可看职级/提醒效果
 * 发布+编辑走 setting:manage;查看任意登录者(销售端/管理端全可见,按职级白名单过滤)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Checkbox, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, Field, PageHeader } from '@/components/kit'

interface NoticeRow {
  id: number
  title: string
  body: string
  publishedBy: number
  publisherName: string | null
  createdAt: string
  playTimes: number
  playSpeed: number
  remind: boolean
  /** 触达统计(S2;GET /notices/:id/stats) */
  reachRate: number | null
  readCount: number | null
}

interface FormState {
  id?: number
  title: string
  body: string
  playTimes: string
  playStart: string
  playEnd: string
  playSpeed: string
  visibleTitles: string[]
  remind: boolean
}

const TITLE_OPTIONS = [
  { value: 'VP', label: '销售副总' },
  { value: 'MANAGER_DIRECTOR', label: '销售总监' },
  { value: 'MANAGER', label: '销售经理' },
  { value: 'CASHIER', label: '收银员' },
  { value: 'FINANCE', label: '财务' },
]
const SPEED_OPTIONS = [
  { value: '40', label: '慢(40 秒/轮)' },
  { value: '22', label: '中(22 秒/轮)' },
  { value: '10', label: '快(10 秒/轮)' },
]

function emptyForm(): FormState {
  return { title: '', body: '', playTimes: '3', playStart: '', playEnd: '', playSpeed: '22', visibleTitles: [], remind: true }
}

export default function NoticesPage(): React.JSX.Element {
  const [rows, setRows] = useState<NoticeRow[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: NoticeRow[] }>('GET', '/notices')
      // 触达统计(S2):逐条拉取已读数/触达率(数据端点已就绪;行内徽标展示)
      const withStats = await Promise.all(
        res.rows.map(async (r) => {
          try {
            const s = await req<{ readCount: number; byTitle: Array<{ read: number; total: number }> }>(
              'GET',
              '/notices/' + String(r.id) + '/stats',
            )
            const denom = s.byTitle.reduce((a, b) => a + b.total, 0)
            const read = s.byTitle.reduce((a, b) => a + b.read, 0)
            return {
              ...r,
              readCount: s.readCount,
              reachRate: denom > 0 ? Math.round((read / denom) * 100) : null,
            }
          } catch {
            return { ...r, readCount: null, reachRate: null }
          }
        }),
      )
      setRows(withStats)
    } catch (e) {
      toastError(e, '通告加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openEdit(r?: NoticeRow): void {
    if (r === undefined) setForm(emptyForm())
    else {
      // 既有通告回填:编辑既有字段;时段/职级等为增强字段(旧数据可能为空)
      setForm({
        id: r.id,
        title: r.title,
        body: r.body,
        playTimes: String(r.playTimes ?? 3),
        playStart: '',
        playEnd: '',
        playSpeed: String(r.playSpeed ?? 22),
        visibleTitles: [],
        remind: r.remind ?? true,
      })
    }
  }

  async function save(): Promise<void> {
    if (form === null || form.title.trim() === '' || form.body.trim() === '') {
      toast.error('标题与内容必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        title: form.title.trim(),
        body: form.body.trim(),
        playTimes: Number(form.playTimes) || 0,
        ...(form.playStart !== '' ? { playStart: new Date(form.playStart).toISOString() } : {}),
        ...(form.playEnd !== '' ? { playEnd: new Date(form.playEnd).toISOString() } : {}),
        playSpeed: Number(form.playSpeed) || 22,
        visibleTitles: form.visibleTitles.join(','),
        remind: form.remind,
      }
      if (form.id !== undefined) {
        await req('PUT', '/notices/' + String(form.id), body)
        toast.success('通告已更新,工作台即时生效')
      } else {
        await req('POST', '/notices', body)
        toast.success('通告已发布,工作台公告条/通知即时可见')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const configSummary = (r: NoticeRow): string => {
    const parts: string[] = [`滚动 ${String(r.playTimes)} 次`, `${String(r.playSpeed)} 秒/轮`]
    if (r.remind) parts.push('新通告提醒')
    return parts.join(' · ')
  }

  return (
    <div>
      <PageHeader
        title="工作通告"
        desc="发布制度/工作通知:工作台公告条(横向滚动,可配播放次数/速度/时段/可看职级/提醒)+通知铃即时展示;全员可见,管理端可发布/编辑/删除"
        actions={<Button onClick={() => openEdit()}>+ 发布通告</Button>}
      />
      <div className="space-y-3 max-w-3xl">
        {rows.length === 0 && (
          <Card className="p-6 text-center text-sm text-fg-muted">暂无通告</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--lm-fg)]">{r.title}</span>
              {r.reachRate !== null && r.reachRate !== undefined && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full border"
                  style={{
                    color: r.reachRate >= 80 ? '#00ff88' : r.reachRate >= 40 ? '#ffaa00' : '#ff6699',
                    borderColor: 'currentColor',
                  }}
                  title={'触达率 ' + String(r.reachRate) + '% · 已读 ' + String(r.readCount ?? 0) + ' 人'}
                >
                  触达 {String(r.reachRate)}%
                </span>
              )}
              <span className="text-xs text-fg-muted ml-auto">
                {r.publisherName ?? String(r.publishedBy)} · {r.createdAt.slice(0, 16).replace('T', ' ')}
              </span>
              <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                编辑
              </Button>
              <ConfirmButton
                confirmTitle="删除通告"
                confirmDesc={'删除「' + r.title + '」?工作台将不再展示。'}
                onConfirm={() => {
                  void req('DELETE', '/notices/' + String(r.id))
                    .then(() => { toast.success('已删除'); return load() })
                    .catch((e) => toastError(e))
                }}
              >
                删除
              </ConfirmButton>
            </div>
            <p className="text-sm text-[var(--lm-fg)] whitespace-pre-wrap">{r.body}</p>
            <p className="text-[11px] text-fg-muted mt-1.5">{configSummary(r)}</p>
          </Card>
        ))}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑通告' : '发布工作通告'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <Field label="标题" required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如:营业流程更新通知" />
              </Field>
              <Field label="内容" required>
                <Label className="sr-only">内容</Label>
                <textarea
                  className="w-full min-h-20 rounded-md border px-3 py-2 text-sm"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="通告正文(将横向滚动展示于移动工作台)"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="播放次数(0=常驻循环)">
                  <Input inputMode="numeric" value={form.playTimes} onChange={(e) => setForm({ ...form, playTimes: e.target.value })} />
                </Field>
                <Field label="滚动速度">
                  <select
                    className="w-full h-9 rounded-md border px-2 text-sm"
                    value={form.playSpeed}
                    onChange={(e) => setForm({ ...form, playSpeed: e.target.value })}
                  >
                    {SPEED_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="展示开始(空=立即)">
                  <Input type="datetime-local" value={form.playStart} onChange={(e) => setForm({ ...form, playStart: e.target.value })} />
                </Field>
                <Field label="展示结束(空=永久)">
                  <Input type="datetime-local" value={form.playEnd} onChange={(e) => setForm({ ...form, playEnd: e.target.value })} />
                </Field>
              </div>
              <Field label="可看人员(不选=全员可见)">
                <div className="flex flex-wrap gap-3 pt-1">
                  {TITLE_OPTIONS.map((t) => (
                    <label key={t.value} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={form.visibleTitles.includes(t.value)}
                        onCheckedChange={(c) => {
                          const has = form.visibleTitles.includes(t.value)
                          setForm({
                            ...form,
                            visibleTitles: c === true && !has ? [...form.visibleTitles, t.value] : has && c !== true ? form.visibleTitles.filter((x) => x !== t.value) : form.visibleTitles,
                          })
                        }}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.remind} onCheckedChange={(c) => { setForm({ ...form, remind: c === true }) }} />
                提醒效果:新通告在工作台显示红点并首次自动弹出
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void save() }}>{form?.id !== undefined ? '保存修改' : '发布'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
