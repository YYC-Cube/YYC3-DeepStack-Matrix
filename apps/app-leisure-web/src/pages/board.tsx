/**
 * 包厢房态看板(方案甲):四色卡片看板 + 开房(绑在场艺人) + 关房统一结算单
 * 依据:《12-包厢房态模块-构建指导》§5;时间费即台费,关房统一结算(ROOM_SETTLE 逐艺人流水)
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@yyc3/ui'
import { toast } from 'sonner'
import { client, req, toastError } from '@/lib/api'
import { PageHeader } from '@/components/kit'

interface RoomRow {
  id: number
  roomNo: string
  roomName: string | null
  roomTypeId: number
  status: string
  roomType: { id: number; name: string }
}
interface ArtistRow {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
}
interface OpenSessionRow {
  id: number
  roomId: number
  roomNo: string
  startAt: string
}
interface CloseResult {
  roomFee: number
  orderTotal: number
  totalAmount: number
  settledSessions: number
}

const STATUS_TEXT: Record<string, string> = {
  FREE: '空闲', OCCUPIED: '消费中', CLEANING: '清扫中', MAINTENANCE: '维修中', DISABLED: '停用',
}
const STATUS_BG: Record<string, string> = {
  FREE: '#1f7a4d', OCCUPIED: '#c0392b', CLEANING: '#2478a8', MAINTENANCE: '#7a7a7a', DISABLED: '#555555',
}

export default function BoardPage(): React.JSX.Element {
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [openSessions, setOpenSessions] = useState<OpenSessionRow[]>([])
  const [busy, setBusy] = useState(false)

  // 开房弹窗
  const [openFor, setOpenFor] = useState<RoomRow | null>(null)
  const [pickedArtists, setPickedArtists] = useState<number[]>([])

  // 关房结算单
  const [closeFor, setCloseFor] = useState<RoomRow | null>(null)
  const [closeSession, setCloseSession] = useState<OpenSessionRow | null>(null)
  const [settleType, setSettleType] = useState<'CASH' | 'FEE_DEDUCT'>('CASH')
  const [deductArtistId, setDeductArtistId] = useState<number | null>(null)
  const [deductAmount, setDeductAmount] = useState<string>('0')
  const [result, setResult] = useState<CloseResult | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const [roomsRes, sessionsRes, artistsRes] = await Promise.all([
        req<{ rows: RoomRow[] }>('GET', '/store/rooms?pageSize=100'),
        req<{ rows: OpenSessionRow[] }>('GET', '/room-sessions?status=OPEN'),
        req<{ rows: ArtistRow[] }>('GET', '/artists?pageSize=100'),
      ])
      setRooms(roomsRes.rows)
      setOpenSessions(sessionsRes.rows)
      setArtists(artistsRes.rows)
    } catch (e) {
      toastError(e, '加载失败')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const roomStatus = (room: RoomRow): string =>
    openSessions.some((s) => s.roomId === room.id) ? 'OCCUPIED' : room.status

  const doOpen = async (room: RoomRow, ids: number[]): Promise<void> => {
    if (ids.length === 0) { toast.error('至少绑定一名在场艺人'); return }
    setBusy(true)
    try {
      await client.roomSessions.open({ roomId: room.id, artistIds: ids })
      toast.success(room.roomNo + ' 开房成功(进房即上钟)')
      setOpenFor(null)
      setPickedArtists([])
      await load()
    } catch (e) { toastError(e, '开房失败') } finally { setBusy(false) }
  }

  const doClose = async (session: OpenSessionRow): Promise<void> => {
    if (settleType === 'FEE_DEDUCT' && deductArtistId === null) {
      toast.error('台费抵扣需选择艺人')
      return
    }
    const amount = Number(deductAmount)
    if (settleType === 'FEE_DEDUCT' && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error('抵扣金额必须大于 0')
      return
    }
    setBusy(true)
    try {
      const out = await client.roomSessions.close({
        roomSessionId: session.id,
        settleType,
        feeDeductAllocations:
          settleType === 'CASH' ? [] : [{ artistId: deductArtistId ?? 0, amount }],
      })
      setResult(out)
      toast.success(session.roomNo + ' 关房结算完成:合计 ¥' + String(out.totalAmount))
      await load()
    } catch (e) { toastError(e, '关房失败') } finally { setBusy(false) }
  }

  const cleaningDone = async (roomId: number): Promise<void> => {
    setBusy(true)
    try {
      await req('POST', '/rooms/' + String(roomId) + '/cleaning-done')
      toast.success('清扫完成')
      await load()
    } catch (e) { toastError(e, '操作失败') } finally { setBusy(false) }
  }

  const bulkCleaning = async (): Promise<void> => {
    setBusy(true)
    try {
      const out = await req<{ updated: number }>('POST', '/rooms/bulk-cleaning-done')
      toast.success('清扫完成 ' + String(out.updated) + ' 间')
      await load()
    } catch (e) { toastError(e, '操作失败') } finally { setBusy(false) }
  }

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="包厢房态看板(方案甲)" desc="开房绑定在场艺人 · 关房统一结算(时间费即台费 + 点单)" />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { void load() }}>刷新</Button>
        <Button variant="outline" disabled={busy} onClick={() => { void bulkCleaning() }}>一键清扫完成</Button>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
        {rooms.map((r) => {
          const st = roomStatus(r)
          const open = openSessions.find((s) => s.roomId === r.id)
          const canOpen = st === 'FREE'
          const canClose = st === 'OCCUPIED' && open !== undefined
          const canClean = st === 'CLEANING'
          return (
            <Card
              key={r.id}
              className="p-3 space-y-1"
              style={{ background: STATUS_BG[st] ?? '#333', color: '#fff', border: 'none', minHeight: 96 }}
            >
              <div className="font-semibold">{r.roomNo}</div>
              <div className="text-xs opacity-80">{r.roomType?.name ?? ''}</div>
              <div className="text-sm">{st === 'OCCUPIED' ? '消费中' : STATUS_TEXT[st] ?? st}</div>
              <div className="flex gap-1 pt-1 flex-wrap">
                {canOpen && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { setOpenFor(r) }}>开房</Button>
                )}
                {canClose && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { setCloseFor(r); setCloseSession(open) }}>关房</Button>
                )}
                {canClean && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { void cleaningDone(r.id) }}>清扫完成</Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* 开房弹窗:绑定在场艺人 */}
      <Dialog open={openFor !== null} onOpenChange={(o) => { if (!o) setOpenFor(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>开房 · {openFor?.roomNo ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>绑定在场艺人(进房即上钟,计费入本房账)</Label>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {artists.filter((a) => a.badgeNo !== null).map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={pickedArtists.includes(a.id)}
                    onCheckedChange={(c) => {
                      setPickedArtists(c === true ? [...pickedArtists, a.id] : pickedArtists.filter((x) => x !== a.id))
                    }}
                  />
                  {a.stageName ?? a.realName}({a.badgeNo})
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenFor(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { if (openFor !== null) void doOpen(openFor, pickedArtists) }}>确认开房</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关房结算单(方案甲) */}
      <Dialog open={closeFor !== null} onOpenChange={(o) => { if (!o) setCloseFor(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>关房结算 · {closeFor?.roomNo ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>结算方式</Label>
              <RadioGroup value={settleType} onValueChange={(v) => { setSettleType(v as 'CASH' | 'FEE_DEDUCT') }} className="flex gap-4 pt-1">
                <div className="flex items-center gap-1"><RadioGroupItem value="CASH" id="cash" /><label htmlFor="cash">现金</label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="FEE_DEDUCT" id="fee" /><label htmlFor="fee">台费抵扣</label></div>
              </RadioGroup>
            </div>
            {settleType === 'FEE_DEDUCT' && (
              <div className="space-y-1">
                <Label>抵扣艺人</Label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={deductArtistId ?? ''}
                  onChange={(e) => { setDeductArtistId(e.target.value === '' ? null : Number(e.target.value)) }}
                >
                  <option value="">请选择</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.stageName ?? a.realName}({a.badgeNo})</option>
                  ))}
                </select>
                <Input
                  placeholder="抵扣金额(元)"
                  inputMode="decimal"
                  value={deductAmount}
                  onChange={(e) => { setDeductAmount(e.target.value) }}
                />
              </div>
            )}
            <div className="text-xs opacity-70">
              关房后包厢进入「清扫中」;时间费与点单计入本结算单,台费抵扣按艺人生成 ROOM_SETTLE 流水(不可变)。
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseFor(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { if (closeSession !== null) void doClose(closeSession) }}>确认结算</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
