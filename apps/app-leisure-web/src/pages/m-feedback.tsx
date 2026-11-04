/**
 * 功能定制回馈(/m/feedback;Owner 指令 2026-11-04):与我们当前无关的模块收进定制申请
 * 提交→Owner 收 notice 回馈→回复拟定(状态 OPEN/PLANNED/DONE/REJECTED);产品需求收集通道
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { PageHeader, StatusBadge } from '@/components/kit'

interface FeedbackRow {
  id: number
  module: string
  title: string
  detail: string
  photos: string[]
  status: string
  reply: string | null
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = { OPEN: '#ffaa00', PLANNED: '#00d4ff', DONE: '#00ff88', REJECTED: '#ff5555' }
const STATUS_LABEL: Record<string, string> = { OPEN: '待受理', PLANNED: '已纳入拟定', DONE: '已落地', REJECTED: '已驳回' }

/** 预置候选模块(竞品对标中与我们当前无关/规划域的项;亦可自定义填写) */
const CANDIDATE_MODULES = ['优惠券', '营销助手', '素材中心', '后厨订单', '柜子管理', '任务中心', '一键免退', '代理购票', '客资列表', '后付管理', '合单统计', '打赏统计', '签到费', '历史房态']

export default function MFeedbackPage(): React.JSX.Element {
  const [rows, setRows] = useState<FeedbackRow[]>()
  const [form, setForm] = useState<{ module: string; title: string; detail: string; photos: string[] } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: FeedbackRow[] }>('GET', '/feedback/my')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '回馈加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(): Promise<void> {
    if (form === null || form.module.trim() === '' || form.title.trim() === '' || form.detail.trim() === '') {
      toast.error('模块/标题/说明 必填')
      return
    }
    setBusy(true)
    try {
      await req('POST', '/feedback', {
        module: form.module.trim(),
        title: form.title.trim(),
        detail: form.detail.trim(),
        photos: form.photos,
      })
      toast.success('定制申请已提交,管理员将收到回馈通知')
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
        title="功能定制"
        desc="把与当前业务无关或想要新增的模块提交定制申请;管理员收到回馈后拟定排期并回复"
        actions={<Button onClick={() => setForm({ module: '', title: '', detail: '', photos: [] })}>+ 发起定制</Button>}
      />

      {(rows ?? []).map((r) => (
        <Card key={r.id} className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-line text-fg-muted">{r.module}</span>
            <span className="text-sm font-medium flex-1 break-all">{r.title}</span>
            <StatusBadge label={STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? '#ffaa00'} />
          </div>
          <p className="text-xs text-fg-muted break-all">{r.detail}</p>
          {r.photos.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {r.photos.map((p, i) => <img key={i} src={p} alt="" className="w-16 h-16 rounded object-cover" />)}
            </div>
          )}
          {r.reply !== null && <p className="text-xs text-success break-all">回复:{r.reply}</p>}
          <div className="text-[10px] text-fg-muted text-right">{r.createdAt.slice(0, 16).replace('T', ' ')}</div>
        </Card>
      ))}
      {rows !== undefined && rows.length === 0 && (
        <Card className="p-6 text-center text-sm text-fg-muted">暂无定制申请;点击右上角「+ 发起定制」</Card>
      )}

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发起功能定制</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-fg-muted">候选模块(点击填入;亦可自填)</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {CANDIDATE_MODULES.map((m) => (
                    <button
                      key={m}
                      className={'px-2 py-0.5 rounded-full border text-xs ' + (form.module === m ? 'border-primary text-primary bg-primary/10' : 'border-line text-fg-muted')}
                      onClick={() => setForm({ ...form, module: m })}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">模块名称</Label>
                <Input value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} placeholder="如:优惠券" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">标题</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="一句话说明想要的什么" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">详细说明</Label>
                <Input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="场景/期望/参考" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">截图(可选,≤4 张,每张≤300KB)</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="text-xs"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])]
                    if (files.length === 0) return
                    void Promise.all(
                      files.slice(0, 4).map(async (f) => {
                        const dataUrl = await new Promise<string>((resolve) => {
                          const reader = new FileReader()
                          reader.onload = () => resolve(String(reader.result))
                          reader.readAsDataURL(f)
                        })
                        const img = new Image()
                        await new Promise((resolve) => { img.onload = resolve; img.src = dataUrl })
                        const scale = Math.min(1, 480 / Math.max(img.width, img.height))
                        const canvas = document.createElement('canvas')
                        canvas.width = Math.round(img.width * scale)
                        canvas.height = Math.round(img.height * scale)
                        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
                        return canvas.toDataURL('image/jpeg', 0.75)
                      }),
                    ).then((photos) => setForm({ ...form, photos }))
                  }}
                />
                {form.photos.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5">
                    {form.photos.map((p, i) => <img key={i} src={p} alt="" className="w-14 h-14 rounded object-cover" />)}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void submit() }}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
