/**
 * A28 时段差异化定价管理(P0-2):槽位 CRUD
 * 覆盖「等级×房型」基础单价;命中规则:房型+星期+日期段+时刻窗(支持跨零点);同命中取优先级最高
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, PageHeader } from '@/components/kit'

interface SlotRow {
  id: number
  roomTypeId: number
  name: string
  daysOfWeek: number[] | null
  dateFrom: string | null
  dateTo: string | null
  startClock: string
  endClock: string
  unitPrice: number
  priority: number
  status: number
}
interface RoomTypeRow { id: number; name: string }

const DOW = [
  { v: 0, label: '周日' }, { v: 1, label: '周一' }, { v: 2, label: '周二' }, { v: 3, label: '周三' },
  { v: 4, label: '周四' }, { v: 5, label: '周五' }, { v: 6, label: '周六' },
]

interface SlotForm {
  id?: number
  roomTypeId: string
  name: string
  daysOfWeek: number[]
  dateFrom: string
  dateTo: string
  startClock: string
  endClock: string
  unitPrice: string
  priority: string
}

const EMPTY: SlotForm = {
  id: undefined, roomTypeId: '', name: '', daysOfWeek: [],
  dateFrom: '', dateTo: '', startClock: '00:00', endClock: '23:59',
  unitPrice: '', priority: '0',
}

export default function PricingPage(): React.JSX.Element {
  const [rows, setRows] = useState<SlotRow[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([])
  const [form, setForm] = useState<SlotForm | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const out = await req<{ rows: SlotRow[] }>('GET', '/stage-fee/pricing-slots')
      setRows(out.rows as unknown as SlotRow[])
      const rooms = await (await import('@/lib/api')).req<{ rows: RoomTypeRow[] }>('GET', '/store/room-types')
      setRoomTypes(rooms.rows)
    } catch (e) { toastError(e, '加载失败') }
  }, [])

  useEffect(() => { void load() }, [load])

  const save = async (): Promise<void> => {
    const f = form
    if (f === null) return
    if (f.roomTypeId === '' || f.name === '' || f.unitPrice === '') {
      toast.error('房型/名称/单价必填')
      return
    }
    try {
      await req<{ id: number }>('POST', '/stage-fee/pricing-slots', {
        id: f.id,
        roomTypeId: Number(f.roomTypeId),
        name: f.name,
        daysOfWeek: f.daysOfWeek.length > 0 ? f.daysOfWeek : null,
        dateFrom: f.dateFrom === '' ? null : f.dateFrom,
        dateTo: f.dateTo === '' ? null : f.dateTo,
        startClock: f.startClock,
        endClock: f.endClock,
        unitPrice: Number(f.unitPrice),
        priority: Number(f.priority),
      })
      toast.success('已保存(进行中场次按起表快照计,不受影响)')
      setForm(null)
      await load()
    } catch (e) { toastError(e, '保存失败') }
  }

  const remove = async (id: number): Promise<void> => {
    try {
      await req('DELETE', '/stage-fee/pricing-slots/' + String(id))
      toast.success('已删除(进行中场次按快照计不受影响)')
      await load()
    } catch (e) { toastError(e, '删除失败') }
  }

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="时段差异化定价(P0-2)" desc="覆盖「等级×房型」基础单价;命中:房型+星期+日期段+时刻窗(支持跨零点);同命中取优先级最高" />
      <Button onClick={() => { setForm({ ...EMPTY, id: undefined }) }}>新建时段价</Button>
      <div className="grid gap-2">
        {rows.map((r) => (
          <Card key={r.id} className="p-3 flex items-center gap-3 text-sm">
            <div className="w-40 font-medium">{r.name}</div>
            <div className="opacity-70">房型 {r.roomTypeId}</div>
            <div className="font-semibold text-primary">¥{r.unitPrice}/时</div>
            {r.daysOfWeek !== null && r.daysOfWeek.length > 0 && (
              <div className="text-xs opacity-70">
                星期:{r.daysOfWeek.map((d) => DOW.find((x) => x.v === d)?.label ?? d).join('/')}
              </div>
            )}
            {r.dateFrom !== null && <div className="text-xs opacity-70">{r.dateFrom} ~ {r.dateTo ?? ''}</div>}
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="outline" onClick={() => { setForm({ ...r, roomTypeId: String(r.roomTypeId), unitPrice: String(r.unitPrice), priority: String(r.priority), daysOfWeek: r.daysOfWeek ?? [], dateFrom: r.dateFrom ?? '', dateTo: r.dateTo ?? '' }) }}>编辑</Button>
              <ConfirmButton
                confirmTitle="确认删除该时段价?"
                confirmDesc="进行中场次按起表快照计,不受影响"
                onConfirm={async () => { await req('DELETE', '/stage-fee/pricing-slots/' + String(r.id)); await load() }}
              >
                删除
              </ConfirmButton>
            </div>
          </Card>
        ))}
      </div>

      {form !== null && (
        <Card className="p-4 space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Label className="w-20">房型</Label>
            <select
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={form.roomTypeId}
              onChange={(e) => { setForm({ ...form, roomTypeId: e.target.value }) }}
            >
              <option value="">请选择</option>
              {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20">名称</Label>
            <Input className="flex-1" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }) }} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20">单价(元/时)</Label>
            <Input className="flex-1" inputMode="decimal" value={form.unitPrice} onChange={(e) => { setForm({ ...form, unitPrice: e.target.value }) }} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20">优先级</Label>
            <Input className="flex-1" inputMode="numeric" value={form.priority} onChange={(e) => { setForm({ ...form, priority: e.target.value }) }} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setForm(null) }}>取消</Button>
            <Button onClick={() => { void save() }}>保存</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
