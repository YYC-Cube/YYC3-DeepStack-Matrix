/**
 * 包厢房号管理(需求全集 §5):房号店内唯一(40907);房态流转;OCCUPIED 由上下钟驱动
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ROOM_STATUS_LABEL } from '@/lib/format'
import { ConfirmButton, DataTable, Field, PageHeader, SelectBox, StatusBadge, type Column } from '@/components/kit'

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

const STATUS_COLOR: Record<string, string> = {
  FREE: '#00ff88',
  OCCUPIED: '#ffaa00',
  MAINTENANCE: '#ff6699',
  DISABLED: '#8b9bb4',
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

export default function RoomsPage() {
  const [rows, setRows] = useState<RoomRow[]>()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [roomTypes, setRoomTypes] = useState<Option[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (status !== '') q.set('status', status)
      const res = await req<{ rows: RoomRow[]; total: number }>('GET', '/store/rooms?' + q.toString())
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      toastError(e, '房号加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, status])

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
    } catch (e) {
      toastError(e) // 40907:「房号已存在(店内唯一)」
    } finally {
      setBusy(false)
    }
  }

  async function setStatusOf(id: number, next: 'FREE' | 'MAINTENANCE' | 'DISABLED'): Promise<void> {
    try {
      await req('PUT', '/store/rooms/' + String(id) + '/status', { status: next })
      toast.success('房态已更新')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  const columns: Array<Column<RoomRow>> = [
    { key: 'roomNo', header: '房号' },
    { key: 'roomName', header: '包厢名称', render: (r) => r.roomName ?? '—' },
    { key: 'roomType', header: '包厢类型', render: (r) => r.roomType?.name ?? '—' },
    { key: 'capacity', header: '容纳人数', render: (r) => (r.capacity !== null ? String(r.capacity) : '—') },
    {
      key: 'status',
      header: '状态',
      render: (r) => <StatusBadge label={ROOM_STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? '#8b9bb4'} />,
    },
    { key: 'remark', header: '备注', render: (r) => r.remark ?? '—' },
    {
      key: 'act',
      header: '操作',
      render: (r) => (
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setForm({
                id: r.id,
                roomNo: r.roomNo,
                roomName: r.roomName ?? '',
                roomTypeId: String(r.roomTypeId),
                capacity: r.capacity !== null ? String(r.capacity) : '',
                status: r.status === 'OCCUPIED' ? '' : r.status,
                remark: r.remark ?? '',
              })
            }
          >
            编辑
          </Button>
          {r.status !== 'FREE' && r.status !== 'OCCUPIED' && (
            <Button variant="outline" size="sm" className="text-[#00ff88]" onClick={() => void setStatusOf(r.id, 'FREE')}>
              启用
            </Button>
          )}
          {r.status !== 'MAINTENANCE' && r.status !== 'OCCUPIED' && (
            <Button variant="outline" size="sm" className="text-[#ffaa00]" onClick={() => void setStatusOf(r.id, 'MAINTENANCE')}>
              维修
            </Button>
          )}
          {r.status !== 'DISABLED' && r.status !== 'OCCUPIED' && (
            <ConfirmButton
              confirmTitle="确认停用包厢"
              confirmDesc={'「' + r.roomNo + '」停用后上钟选择框不可选;已有进行中场次不受影响。'}
              onConfirm={() => {
                void setStatusOf(r.id, 'DISABLED')
              }}
            >
              停用
            </ConfirmButton>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="包厢房号管理"
        desc="房号店内唯一(40907);占用/空闲随上下钟自动流转,手工置占用将被拒绝;维修/停用上钟不可选(需求全集 §5)"
        actions={<Button onClick={() => setForm({ roomNo: '', roomName: '', roomTypeId: '', capacity: '', status: 'FREE', remark: '' })}>+ 新增包厢</Button>}
      />
      <Card className="p-4 mb-4 flex flex-row items-center gap-3">
        <SelectBox
          className="w-40"
          value={status}
          onChange={(v) => {
            setPage(1)
            setStatus(v)
          }}
          options={[
            { value: '', label: '全部状态' },
            { value: 'FREE', label: '空闲' },
            { value: 'OCCUPIED', label: '占用' },
            { value: 'MAINTENANCE', label: '维修' },
            { value: 'DISABLED', label: '停用' },
          ]}
        />
      </Card>
      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={50} onPageChange={setPage} />

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑包厢' : '新增包厢'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="房号(店内唯一)" required>
                <Input value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} placeholder="如 A01 / VIP03" />
              </Field>
              <Field label="包厢名称">
                <Input value={form.roomName} onChange={(e) => setForm({ ...form, roomName: e.target.value })} />
              </Field>
              <Field label="包厢类型" required>
                <SelectBox
                  value={form.roomTypeId}
                  onChange={(v) => setForm({ ...form, roomTypeId: v })}
                  options={[{ value: '', label: '请选择' }, ...roomTypes.map((rt) => ({ value: String(rt.id), label: rt.name }))]}
                />
              </Field>
              <Field label="容纳人数">
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </Field>
              {form.id !== undefined && (
                <Field label="房态(占用除外)">
                  <SelectBox
                    value={form.status}
                    onChange={(v) => setForm({ ...form, status: v })}
                    options={[
                      { value: 'FREE', label: '空闲' },
                      { value: 'MAINTENANCE', label: '维修' },
                      { value: 'DISABLED', label: '停用' },
                    ]}
                  />
                </Field>
              )}
              <Field label="备注">
                <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
