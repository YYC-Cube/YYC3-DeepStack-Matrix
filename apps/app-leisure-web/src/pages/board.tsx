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
import type { BillPreview, DispatchQueue } from '@yyc3/leisure-core'

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

  // 开房弹窗(含轮台推荐位,艺人设置⑧)
  const [openFor, setOpenFor] = useState<RoomRow | null>(null)
  const [pickedArtists, setPickedArtists] = useState<number[]>([])
  const [queue, setQueue] = useState<DispatchQueue | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const MODE_TEXT: Record<string, string> = { ROTATION: '轮台(须按序)', SELF_PICK: '自选', MIXED: '混合(推荐可越过)' }

  const openRoomDialog = async (room: RoomRow): Promise<void> => {
    setOpenFor(room)
    setPickedArtists([])
    setOverrideReason('')
    setQueue(null)
    try {
      const q = await client.dispatch.queue()
      setQueue(q)
      // 轮台/混合模式默认预选队列第一位
      if (q.rows.length > 0 && q.mode !== 'SELF_PICK') setPickedArtists([q.rows[0]!.artistId])
    } catch (e) {
      toastError(e, '轮台队列加载失败')
    }
  }

  /** 所选是否越过推荐位(前 k 位,k=所选人数) */
  const offOrder = (): number[] => {
    if (queue === null) return []
    const topK = new Set(queue.rows.slice(0, pickedArtists.length).map((r) => r.artistId))
    return pickedArtists.filter((id) => !topK.has(id))
  }

  // 关房结算单(接真后端明细预览)
  const [closeFor, setCloseFor] = useState<RoomRow | null>(null)
  const [closeSession, setCloseSession] = useState<OpenSessionRow | null>(null)
  const [preview, setPreview] = useState<BillPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [settleType, setSettleType] = useState<'CASH' | 'FEE_DEDUCT' | 'MIXED'>('CASH')
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
      const out = await client.roomSessions.open({
        roomId: room.id,
        artistIds: ids,
        ...(overrideReason.trim() !== '' ? { overrideReason: overrideReason.trim() } : {}),
      })
      toast.success(
        room.roomNo + ' 开房成功(进房即上钟)' +
          (out.overridden.length > 0 ? ' · 越过轮台推荐 ' + String(out.overridden.length) + ' 人已记录' : ''),
      )
      setOpenFor(null)
      setPickedArtists([])
      setOverrideReason('')
      await load()
    } catch (e) { toastError(e, '开房失败') } finally { setBusy(false) }
  }

  /** 打开关房弹窗:拉取真后端结算单预览(明细 + 此刻报价) */
  const openClose = async (room: RoomRow, session: OpenSessionRow): Promise<void> => {
    setCloseFor(room)
    setCloseSession(session)
    setPreview(null)
    setResult(null)
    setSettleType('CASH')
    setDeductArtistId(null)
    setDeductAmount('0')
    setPreviewLoading(true)
    try {
      const p = await client.roomSessions.billPreview(session.id)
      setPreview(p)
      if (p.artists.length === 1) setDeductArtistId(p.artists[0]?.artistId ?? null)
    } catch (e) {
      toastError(e, '结算单预览加载失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  const doClose = async (session: OpenSessionRow): Promise<void> => {
    const needDeduct = settleType === 'FEE_DEDUCT' || settleType === 'MIXED'
    const amount = Number(deductAmount)
    if (needDeduct && deductArtistId === null) {
      toast.error('台费抵扣需选择艺人')
      return
    }
    if (needDeduct && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error('抵扣金额必须大于 0')
      return
    }
    if (needDeduct && preview !== null && amount > preview.totalAmount + 0.009) {
      toast.error('抵扣额不得超过结算总额 ¥' + String(preview.totalAmount))
      return
    }
    if (settleType === 'FEE_DEDUCT' && preview !== null && Math.abs(amount - preview.totalAmount) > 0.009) {
      toast.error('全额台费抵扣需等于结算总额;部分抵扣请选「现金+抵扣」')
      return
    }
    setBusy(true)
    try {
      const out = await client.roomSessions.close({
        roomSessionId: session.id,
        settleType,
        feeDeductAllocations: needDeduct ? [{ artistId: deductArtistId ?? 0, amount }] : [],
      })
      setResult(out)
      toast.success(session.roomNo + ' 关房结算完成:合计 ¥' + String(out.totalAmount))
      setCloseFor(null)
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
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { void openRoomDialog(r) }}>开房</Button>
                )}
                {canClose && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { void openClose(r, open) }}>关房</Button>
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
            {queue !== null && (
              <div className="rounded border border-[rgba(0,212,255,0.2)] p-2 text-xs space-y-1">
                <div className="text-[#00d4ff]">
                  上钟模式:{MODE_TEXT[queue.mode] ?? queue.mode}
                  <span className="text-[#8b9bb4] ml-2">轮台队列(已签到·空闲)</span>
                </div>
                {queue.rows.length === 0 && <div className="text-[#8b9bb4]">当前无可派艺人(需当日签到且空闲)</div>}
                <div className="flex flex-wrap gap-1">
                  {queue.rows.slice(0, 8).map((q) => (
                    <span
                      key={q.artistId}
                      className="px-1.5 py-0.5 rounded border"
                      style={{
                        borderColor: q.position <= Math.max(pickedArtists.length, 1) ? '#00ff8866' : 'rgba(0,212,255,0.2)',
                        color: q.position <= Math.max(pickedArtists.length, 1) ? '#00ff88' : '#a8b8cc',
                      }}
                    >
                      #{String(q.position)} {q.stageName ?? String(q.artistId)}({String(q.todayDispatches)}次)
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Label>绑定在场艺人(进房即上钟,计费入本房账)</Label>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {artists.filter((a) => a.badgeNo !== null).map((a) => {
                const pos = queue?.rows.find((q) => q.artistId === a.id)?.position
                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={pickedArtists.includes(a.id)}
                      onCheckedChange={(c) => {
                        setPickedArtists(c === true ? [...pickedArtists, a.id] : pickedArtists.filter((x) => x !== a.id))
                      }}
                    />
                    {a.stageName ?? a.realName}({a.badgeNo})
                    {pos !== undefined && <span className="text-[10px] text-[#00d4ff]">轮台#{String(pos)}</span>}
                  </label>
                )
              })}
            </div>
            {queue !== null && queue.mode !== 'SELF_PICK' && offOrder().length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-[#ffaa00]">
                  {queue.mode === 'ROTATION' ? '轮台模式:所选越过队列顺序,后端将拒绝(40914)' : '已越过轮台推荐位,将记入主管轮台报表;可填原因'}
                </div>
                <Input
                  placeholder="越序原因(如:客人指名)"
                  value={overrideReason}
                  onChange={(e) => { setOverrideReason(e.target.value) }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenFor(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { if (openFor !== null) void doOpen(openFor, pickedArtists) }}>确认开房</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关房结算单(方案甲;明细为后端实时预览) */}
      <Dialog open={closeFor !== null} onOpenChange={(o) => { if (!o) setCloseFor(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>关房结算 · {closeFor?.roomNo ?? ''}</DialogTitle>
          </DialogHeader>
          {previewLoading && <div className="py-8 text-center text-sm text-[#8b9bb4]">结算单预览加载中…</div>}
          {!previewLoading && preview !== null && (
            <div className="space-y-3 text-sm">
              {/* 明细:时间费 */}
              <div>
                <div className="text-xs text-[#8b9bb4] mb-1">
                  时间费明细(进行中场次为此刻报价,关房按实际时刻重算
                  {preview.billing.minCharge > 0 ? ' · 最低消费 ¥' + String(preview.billing.minCharge) : ''}
                  {preview.billing.capCharge > 0 ? ' · 封顶 ¥' + String(preview.billing.capCharge) : ''})
                </div>
                <div className="border rounded border-[rgba(0,212,255,0.12)] divide-y divide-[rgba(0,212,255,0.06)]">
                  {preview.sessions.map((s) => (
                    <div key={s.sessionId} className="flex items-center gap-2 px-2 py-1.5 flex-wrap">
                      <span className="w-24 truncate">{s.stageName ?? '—'}</span>
                      <span className="text-xs text-[#8b9bb4]">{s.startAt.slice(11, 16)}~{s.endAt !== null ? s.endAt.slice(11, 16) : '进行中'}</span>
                      <span className="text-xs">{String(s.durationMinutes)} 分钟{String(s.billHours ?? 0) !== '0' ? ' → ' + String(s.billHours) + ' 小时' : ''}</span>
                      <span className="text-xs text-[#8b9bb4]">¥{String(s.unitPrice)}/时{s.priceSlotName !== null ? ' · ' + s.priceSlotName : ''}</span>
                      {s.minDurationApplied && <span className="text-[10px] text-[#ffaa00]">保底</span>}
                      <span className="ml-auto font-medium text-[#00d4ff]">¥{String(s.amount)}</span>
                    </div>
                  ))}
                  {preview.sessions.length === 0 && <div className="px-2 py-2 text-xs text-[#8b9bb4]">无上钟时间费</div>}
                </div>
              </div>
              {/* 明细:自点单 */}
              <div>
                <div className="text-xs text-[#8b9bb4] mb-1">自点单明细(PLACED 视同送达一并结算)</div>
                <div className="border rounded border-[rgba(0,212,255,0.12)] divide-y divide-[rgba(0,212,255,0.06)]">
                  {preview.orders.map((o) => (
                    <div key={o.orderId} className="flex items-center gap-2 px-2 py-1.5">
                      <span className="w-24 truncate">{o.stageName ?? '—'}</span>
                      <span className="text-xs text-[#8b9bb4]">{Array.isArray(o.items) ? String(o.items.length) + ' 项' : ''} · {o.status === 'PLACED' ? '未送达' : '已送达'}</span>
                      <span className="ml-auto font-medium">¥{String(o.totalAmount)}</span>
                    </div>
                  ))}
                  {preview.orders.length === 0 && <div className="px-2 py-2 text-xs text-[#8b9bb4]">无点单</div>}
                </div>
              </div>
              {/* 合计 */}
              <div className="flex gap-4 justify-end text-sm">
                <span>时间费 <b className="text-[#00d4ff]">¥{String(preview.roomFee)}</b></span>
                <span>点单 <b className="text-[#00d4ff]">¥{String(preview.orderTotal)}</b></span>
                <span>合计 <b className="text-[#00ff88] text-base">¥{String(preview.totalAmount)}</b></span>
              </div>
              {/* 结算方式 */}
              <div>
                <Label>结算方式</Label>
                <RadioGroup value={settleType} onValueChange={(v) => { setSettleType(v as 'CASH' | 'FEE_DEDUCT' | 'MIXED') }} className="flex gap-4 pt-1">
                  <div className="flex items-center gap-1"><RadioGroupItem value="CASH" id="cash" /><label htmlFor="cash">现金</label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="FEE_DEDUCT" id="fee" /><label htmlFor="fee">台费抵扣(全额)</label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="MIXED" id="mixed" /><label htmlFor="mixed">现金+抵扣</label></div>
                </RadioGroup>
              </div>
              {(settleType === 'FEE_DEDUCT' || settleType === 'MIXED') && (
                <div className="space-y-1">
                  <Label>抵扣艺人(在房:{preview.artists.map((a) => (a.stageName ?? '—') + ' 余额¥' + String(a.feeBalance)).join(' · ')})</Label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={deductArtistId ?? ''}
                    onChange={(e) => { setDeductArtistId(e.target.value === '' ? null : Number(e.target.value)) }}
                  >
                    <option value="">请选择</option>
                    {preview.artists.map((a) => (
                      <option key={a.artistId} value={a.artistId}>{a.stageName ?? '—'}({a.badgeNo ?? '无腰牌'}) 余额 ¥{String(a.feeBalance)}</option>
                    ))}
                  </select>
                  <Input
                    placeholder={settleType === 'FEE_DEDUCT' ? '抵扣金额(须=合计 ¥' + String(preview.totalAmount) + ')' : '抵扣金额(元;剩余按现金收款)'}
                    inputMode="decimal"
                    value={deductAmount}
                    onChange={(e) => { setDeductAmount(e.target.value) }}
                  />
                  {settleType === 'MIXED' && Number(deductAmount) > 0 && (
                    <div className="text-xs text-[#8b9bb4]">现金应收 ¥{String(Math.max(0, Math.round((preview.totalAmount - Number(deductAmount)) * 100) / 100))}</div>
                  )}
                </div>
              )}
              <div className="text-xs opacity-70">
                关房后包厢进入「清扫中」;抵扣部分逐艺人生成 ROOM_SETTLE 流水(不可变)。
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseFor(null)}>取消</Button>
            <Button disabled={busy || previewLoading || preview === null} onClick={() => { if (closeSession !== null) void doClose(closeSession) }}>确认结算</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
