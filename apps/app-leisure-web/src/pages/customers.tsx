/**
 * 客资体系(2026-11-07 P5):客户线索最小闭环——名录/电话/来源/状态/跟进;增改删
 * ADMIN 全量,ARTIST(销售端)仅本人归属;DataTable 移动端自动卡片化
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
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
  createdAt: string
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

  const columns: Array<Column<LeadRow>> = [
    { key: 'name', header: '客户' },
    { key: 'phone', header: '电话', render: (r) => r.phone ?? '—' },
    { key: 'source', header: '来源', render: (r) => r.source ?? '—' },
    { key: 'status', header: '状态', render: (r) => <StatusBadge label={STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? '#ffaa00'} /> },
    { key: 'ownerName', header: '归属销售经理', render: (r) => r.ownerName ?? '—' },
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
        actions={<Button onClick={() => setForm({ name: '', phone: '', source: '', status: 'FOLLOW', note: '', ownerArtistId: '' })}>+ 录入客资</Button>}
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
      <DataTable columns={columns} rows={rows} loading={rows === undefined} />

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
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
