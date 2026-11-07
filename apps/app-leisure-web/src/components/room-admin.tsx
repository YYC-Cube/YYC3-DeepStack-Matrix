/**
 * 房号管理精简面板(2026-11-07 P2:房态看盘内直接增/删/改;看板页弹窗挂载)
 * 与 pages/rooms.tsx 同源端点(/store/rooms CRUD);本面板为看盘内嵌精简版(列表+编辑弹窗+启停/维修/停用)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, StatusBadge } from '@/components/kit'

interface RoomRow {
  id: number
  roomNo: string
  roomName: string | null
  roomTypeId: number
  capacity: number | null
  status: string
  remark: string | null
  roomType: { id: number; name: string }
}
interface Option {
  id: number
  name: string
}
interface FormState {
  id?: number
  roomNo: string
  roomName: string
  roomTypeId: string
  capacity: string
  status: string
  remark: string
}

const STATUS_COLOR: Record<string, string> = {
  FREE: '#00ff88',
  OCCUPIED: '#ffaa00',
  MAINTENANCE: '#ff6699',
  DISABLED: '#8b9bb4',
}

export function RoomAdminPanel({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged?: () => void }): React.JSX.Element {
  const [rows, setRows] = useState<RoomRow[]>([])
  const [roomTypes, setRoomTypes] = useState<Option[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    if (!open) return
    try {
      const res = await req<{ rows: RoomRow[]; total: number }>('GET', '/store/rooms?page=1&pageSize=100')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '房号加载失败')
    }
  }, [open])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void req<Option[]>('GET', '/store/room-types')
      .then(setRoomTypes)
      .catch(() => undefined)
  }, [])

  async function save(): Promise<void> {
    if (form === null) return
    if (form.roomNo.trim() === '' || form.roomTypeId === '') {
      toast.error('房号与包厢类型必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        roomNo: form.roomNo,
        roomName: form.roomName === '' ? undefined : form.roomName,
        roomTypeId: Number(form.roomTypeId),
        capacity: form.capacity === '' ? undefined : Number(form.capacity),
        status: form.status === '' ? undefined : (form.status as 'FREE' | 'MAINTENANCE' | 'DISABLED'),
        remark: form.remark === '' ? undefined : form.remark,
      }
      if (form.id !== undefined) {
        await req('PUT', '/store/rooms/' + String(form.id), body)
        toast.success('包厢已更新')
      } else {
        await req('POST', '/store/rooms', body)
        toast.success('包厢已创建(默认空闲)')
      }
      setForm(null)
      await load()
      onChanged?.()
    } catch (e) {
      toastError(e) // 40907 房号店内唯一
    } finally {
      setBusy(false)
    }
  }

  async function setStatusOf(id: number, next: 'FREE' | 'MAINTENANCE' | 'DISABLED'): Promise<void> {
    try {
      await req('PUT', '/store/rooms/' + String(id) + '/status', { status: next })
      toast.success('房态已更新')
      await load()
      onChanged?.()
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>房间设置(看盘内管理;增/改/维修/停用)</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end pb-2">
          <Button size="sm" onClick={() => setForm({ roomNo: '', roomName: '', roomTypeId: '', capacity: '', status: 'FREE', remark: '' })}>+ 新增包厢</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-muted border-b border-line">
                <th className="py-1.5 pr-3">房号</th>
                <th className="py-1.5 pr-3">名称</th>
                <th className="py-1.5 pr-3">类型</th>
                <th className="py-1.5 pr-3">人数</th>
                <th className="py-1.5 pr-3">状态</th>
                <th className="py-1.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 font-medium">{r.roomNo}</td>
                  <td className="py-1.5 pr-3">{r.roomName ?? '—'}</td>
                  <td className="py-1.5 pr-3">{r.roomType?.name ?? '—'}</td>
                  <td className="py-1.5 pr-3">{r.capacity !== null ? String(r.capacity) : '—'}</td>
                  <td className="py-1.5 pr-3">
                    <StatusBadge label={r.status} color={STATUS_COLOR[r.status] ?? '#8b9bb4'} />
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm({
                        id: r.id,
                        roomNo: r.roomNo,
                        roomName: r.roomName ?? '',
                        roomTypeId: String(r.roomTypeId),
                        capacity: r.capacity !== null ? String(r.capacity) : '',
                        status: r.status === 'OCCUPIED' ? '' : r.status,
                        remark: r.remark ?? '',
                      })}>编辑</Button>
                      {r.status !== 'FREE' && r.status !== 'OCCUPIED' && (
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-success" onClick={() => { void setStatusOf(r.id, 'FREE') }}>启用</Button>
                      )}
                      {r.status !== 'MAINTENANCE' && r.status !== 'OCCUPIED' && (
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-warning" onClick={() => { void setStatusOf(r.id, 'MAINTENANCE') }}>维修</Button>
                      )}
                      {r.status !== 'DISABLED' && r.status !== 'OCCUPIED' && (
                        <ConfirmButton
                          confirmTitle="确认停用包厢"
                          confirmDesc={'「' + r.roomNo + '」停用后上钟选择框不可选;已有进行中场次不受影响。'}
                          onConfirm={() => { void setStatusOf(r.id, 'DISABLED') }}
                        >
                          <span className="text-xs">停用</span>
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{form?.id !== undefined ? '编辑包厢' : '新增包厢'}</DialogTitle>
            </DialogHeader>
            {form !== null && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">房号(店内唯一)</Label>
                  <Input value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} placeholder="如 A01 / VIP03" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">包厢名称</Label>
                  <Input value={form.roomName} onChange={(e) => setForm({ ...form, roomName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">包厢类型</Label>
                  <select
                    className="w-full h-9 rounded border border-line bg-transparent px-2 text-sm"
                    value={form.roomTypeId}
                    onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
                  >
                    <option value="">请选择</option>
                    {roomTypes.map((rt) => <option key={rt.id} value={String(rt.id)}>{rt.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">容纳人数</Label>
                  <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                {form.id !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs text-fg-muted">房态(占用除外)</Label>
                    <select
                      className="w-full h-9 rounded border border-line bg-transparent px-2 text-sm"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="FREE">空闲</option>
                      <option value="MAINTENANCE">维修</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">备注</Label>
                  <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
              <Button disabled={busy} onClick={() => { void save() }}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
      </Dialog>
  )
}
