/**
 * 工作通告(/notices;设置域):发布/删除(管理端)→ 工作台通知铃+公告条实时拉取
 * 发布走 setting:manage;查看任意登录者(销售端/管理端全可见)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
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
}

export default function NoticesPage(): React.JSX.Element {
  const [rows, setRows] = useState<NoticeRow[]>([])
  const [form, setForm] = useState<{ title: string; body: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: NoticeRow[] }>('GET', '/notices')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '通告加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function publish(): Promise<void> {
    if (form === null || form.title.trim() === '' || form.body.trim() === '') {
      toast.error('标题与内容必填')
      return
    }
    setBusy(true)
    try {
      await req('POST', '/notices', { title: form.title.trim(), body: form.body.trim() })
      toast.success('通告已发布,工作台公告条/通知即时可见')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="工作通告"
        desc="发布制度/工作通知:工作台公告条(横向滚动)+通知铃即时展示;全员可见,仅管理端可发布/删除"
        actions={<Button onClick={() => setForm({ title: '', body: '' })}>+ 发布通告</Button>}
      />
      <div className="space-y-3 max-w-3xl">
        {rows.length === 0 && (
          <Card className="p-6 text-center text-sm text-fg-muted">暂无通告</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--lm-fg)]">{r.title}</span>
              <span className="text-xs text-fg-muted ml-auto">
                {r.publisherName ?? String(r.publishedBy)} · {r.createdAt.slice(0, 16).replace('T', ' ')}
              </span>
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
          </Card>
        ))}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发布工作通告</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <Field label="标题" required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如:营业流程更新通知" />
              </Field>
              <Field label="内容" required>
                <Label className="sr-only">内容</Label>
                <textarea
                  className="w-full min-h-24 rounded-md border px-3 py-2 text-sm"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="通告正文(将横向滚动展示于移动工作台)"
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void publish() }}>发布</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
