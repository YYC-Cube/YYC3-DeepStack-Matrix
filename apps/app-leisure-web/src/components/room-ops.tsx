/**
 * 房账操作共享组件(桌面看板 board.tsx 与移动房态图 m-board.tsx 共用;禁复制实现)
 * RoomOpenDialog:开房弹窗(轮台队列+销售经理多选+越序原因+预约锁钟强开)
 * RoomCloseDialog:关房结算弹窗(结算单预览+现金/台费/台票/混合+台票分配,§6.6 并入结算)
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Button,
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
import { client, toastError } from '@/lib/api'
import type { BillPreview, DispatchQueue } from '@yyc3/leisure-core'
import PersonPicker from '@/components/person-picker'

export interface RoomRow {
  id: number
  roomNo: string
  roomName: string | null
  roomTypeId: number
  status: string
  roomType: { id: number; name: string }
}

export interface ArtistRow {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
}

export interface OpenSessionRow {
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
  ticketDeductAmount?: number
  feeDeductAmount?: number
}

const MODE_TEXT: Record<string, string> = { ROTATION: '轮台(须按序)', SELF_PICK: '自选', MIXED: '混合(推荐可越过)' }

/* ── 开房弹窗 ── */

export function RoomOpenDialog(props: {
  room: RoomRow | null
  artists: ArtistRow[]
  hasBooking?: boolean
  onClose: () => void
  onOpened: () => Promise<void>
}): React.JSX.Element {
  const { room, hasBooking = false, onClose, onOpened } = props
  const [busy, setBusy] = useState(false)
  const [pickedArtists, setPickedArtists] = useState<number[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [queue, setQueue] = useState<DispatchQueue | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [ignoreHold, setIgnoreHold] = useState(false)

  useEffect(() => {
    if (room === null) return
    setPickedArtists([])
    setOverrideReason('')
    setIgnoreHold(false)
    setQueue(null)
    client.dispatch
      .queue()
      .then((q) => {
        setQueue(q)
        if (q.rows.length > 0 && q.mode !== 'SELF_PICK') setPickedArtists([q.rows[0]!.artistId])
      })
      .catch(() => undefined)
  }, [room])

  const offOrder = (): number[] => {
    if (queue === null) return []
    const topK = new Set(queue.rows.slice(0, pickedArtists.length).map((r) => r.artistId))
    return pickedArtists.filter((id) => !topK.has(id))
  }

  const nameOf = (id: number): string => props.artists.find((a) => a.id === id)?.stageName ?? String(id)

  const doOpen = async (): Promise<void> => {
    if (room === null) return
    setBusy(true)
    try {
      const out = await client.roomSessions.open({
        roomId: room.id,
        artistIds: pickedArtists,
        ...(overrideReason.trim() !== '' ? { overrideReason: overrideReason.trim() } : {}),
        ...(ignoreHold ? { ignoreBookingHold: true } : {}),
      })
      toast.success(
        room.roomNo + ' 开房成功' +
          (pickedArtists.length > 0 ? '(已绑定上钟 ' + String(pickedArtists.length) + ' 人)' : '(空房;上钟请用房卡「上钟」选人)') +
          (out.overridden.length > 0 ? ' · 越过轮台推荐 ' + String(out.overridden.length) + ' 人已记录' : ''),
      )
      onClose()
      await onOpened()
    } catch (e) {
      toastError(e, '开房失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={room !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>开房 · {room?.roomNo ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {queue !== null && (
            <div className="rounded border border-line p-2 text-xs space-y-1">
              <div className="text-primary">
                上钟模式:{MODE_TEXT[queue.mode] ?? queue.mode}
                <span className="text-fg-muted ml-2">轮台队列(已签到·空闲)</span>
              </div>
              {queue.rows.length === 0 && <div className="text-fg-muted">当前无可派销售经理(需当日签到且空闲)</div>}
              <div className="flex flex-wrap gap-1">
                {queue.rows.slice(0, 8).map((q) => (
                  <span
                    key={q.artistId}
                    className="px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: q.position <= Math.max(pickedArtists.length, 1) ? 'color-mix(in srgb, var(--lm-success) 40%, transparent)' : 'color-mix(in srgb, var(--lm-primary) 20%, transparent)',
                      color: q.position <= Math.max(pickedArtists.length, 1) ? 'var(--lm-success)' : '#a8b8cc',
                    }}
                  >
                    #{String(q.position)} {q.stageName ?? String(q.artistId)}({String(q.todayDispatches)}次)
                  </span>
                ))}
              </div>
            </div>
          )}
          <Label>绑定在场销售经理(可选:立即上钟计费入本房;留空=开空房,后续用房卡「上钟」选人)</Label>
          <div className="flex flex-wrap gap-1.5 min-h-9 rounded border border-line p-1.5">
            {pickedArtists.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs">
                {nameOf(id)}
                <button
                  className="text-fg-muted hover:text-error"
                  onClick={() => { setPickedArtists(pickedArtists.filter((x) => x !== id)) }}
                >
                  ×
                </button>
              </span>
            ))}
            <Button variant="outline" size="sm" onClick={() => { setPickerOpen(true) }}>+ 选择人员</Button>
          </div>
          <PersonPicker
            open={pickerOpen}
            title="选择上钟销售经理(未上钟优先)"
            line="SELL"
            multiple
            excludeBusy={false}
            onClose={() => { setPickerOpen(false) }}
            onPick={(p) => {
              const list = Array.isArray(p) ? p : [p]
              setPickedArtists((s) => Array.from(new Set([...s, ...list.filter((x) => x !== null).map((x) => x!.id)])))
            }}
          />
          {queue !== null && queue.mode !== 'SELF_PICK' && offOrder().length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-warning">
                {queue.mode === 'ROTATION' ? '轮台模式:所选越过队列顺序,后端将拒绝(40914)' : '已越过轮台推荐位,将记入主管轮台报表;可填原因'}
              </div>
              <Input placeholder="越序原因(如:客人指名)" value={overrideReason} onChange={(e) => { setOverrideReason(e.target.value) }} />
            </div>
          )}
          {hasBooking && (
            <label className="flex items-center gap-2 text-xs text-warning">
              <Checkbox checked={ignoreHold} onCheckedChange={(c) => { setIgnoreHold(c === true) }} />
              本房有预约锁钟中:确认并非该预约到店,忽略锁钟强开(审计留痕);是预约客人请先到「预约管理」转已到店
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button disabled={busy} onClick={() => { void doOpen() }}>确认开房</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── 关房结算弹窗 ── */

/** 台票抵扣合计(元):Σ qty × 面值 */
function ticketDeductOf(p: BillPreview | null, ticketQty: Record<string, string>): number {
  if (p === null) return 0
  let sum = 0
  for (const opt of p.ticketOptions) {
    const qty = Number(ticketQty[String(opt.artistId) + ':' + String(opt.ticketRuleId)] ?? '0')
    if (Number.isFinite(qty) && qty > 0) sum += qty * opt.faceValue
  }
  return Math.round(sum * 100) / 100
}

export function RoomCloseDialog(props: {
  room: RoomRow | null
  session: OpenSessionRow | null
  onClose: () => void
  onClosed: () => Promise<void>
}): React.JSX.Element {
  const { room, session, onClose, onClosed } = props
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<BillPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [settleType, setSettleType] = useState<'CASH' | 'FEE_DEDUCT' | 'MIXED' | 'TICKET'>('CASH')
  const [deductArtistId, setDeductArtistId] = useState<number | null>(null)
  const [deductAmount, setDeductAmount] = useState<string>('0')
  const [ticketQty, setTicketQty] = useState<Record<string, string>>({})

  const ticketDeduct = useCallback((): number => ticketDeductOf(preview, ticketQty), [preview, ticketQty])

  useEffect(() => {
    if (session === null) return
    setPreview(null)
    setSettleType('CASH')
    setDeductArtistId(null)
    setDeductAmount('0')
    setTicketQty({})
    setPreviewLoading(true)
    client.roomSessions
      .billPreview(session.id)
      .then((p) => {
        setPreview(p)
        if (p.artists.length === 1) setDeductArtistId(p.artists[0]?.artistId ?? null)
      })
      .catch((e) => toastError(e, '结算单预览加载失败'))
      .finally(() => setPreviewLoading(false))
  }, [session])

  const doClose = async (): Promise<void> => {
    if (session === null) return
    const needDeduct = settleType === 'FEE_DEDUCT' || settleType === 'MIXED'
    const amount = Number(deductAmount)
    const allocs = (preview ?? { ticketOptions: [] }).ticketOptions
      .map((opt) => ({
        artistId: opt.artistId,
        ticketRuleId: opt.ticketRuleId,
        qty: Number(ticketQty[String(opt.artistId) + ':' + String(opt.ticketRuleId)] ?? '0'),
        balance: opt.balance,
      }))
      .filter((a) => Number.isFinite(a.qty) && a.qty > 0)
    if (needDeduct && deductArtistId === null) { toast.error('台费抵扣需选择销售经理'); return }
    if (needDeduct && (!Number.isFinite(amount) || amount <= 0)) { toast.error('抵扣金额必须大于 0'); return }
    if (settleType === 'TICKET' && allocs.length === 0) { toast.error('台票抵扣需至少分配一张台票'); return }
    for (const a of allocs) {
      if (!Number.isInteger(a.qty)) { toast.error('台票数量必须为整数'); return }
      if (a.qty > a.balance) { toast.error('台票数量超过余额(剩余 ' + String(a.balance) + ' 张)'); return }
    }
    const tDeduct = ticketDeduct()
    if (preview !== null && tDeduct + (needDeduct ? amount : 0) > preview.totalAmount + 0.009) {
      toast.error('抵扣合计(台票+台费)不得超过结算总额 ¥' + String(preview.totalAmount))
      return
    }
    if (needDeduct && preview !== null && amount > preview.totalAmount - tDeduct + 0.009) {
      toast.error('台费抵扣额不得超过结算总额扣除台票后的余额 ¥' + String(Math.round((preview.totalAmount - tDeduct) * 100) / 100))
      return
    }
    if (allocs.length > 0 && settleType === 'CASH') {
      toast.error('已填台票抵扣,请选择「台票」或「现金+抵扣」结算方式')
      return
    }
    if (settleType === 'FEE_DEDUCT' && preview !== null && Math.abs(amount - (preview.totalAmount - tDeduct)) > 0.009) {
      toast.error('全额台费抵扣需等于扣除台票后的总额;部分抵扣请选「现金+抵扣」')
      return
    }
    setBusy(true)
    try {
      const out: CloseResult = await client.roomSessions.close({
        roomSessionId: session.id,
        settleType,
        feeDeductAllocations: needDeduct ? [{ artistId: deductArtistId ?? 0, amount }] : [],
        ticketAllocations: allocs.map((a) => ({ artistId: a.artistId, ticketRuleId: a.ticketRuleId, qty: a.qty })),
      })
      toast.success((room?.roomNo ?? '') + ' 关房结算完成:合计 ¥' + String(out.totalAmount))
      onClose()
      await onClosed()
    } catch (e) {
      toastError(e, '关房失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={session !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>关房结算 · {room?.roomNo ?? ''}</DialogTitle>
        </DialogHeader>
        {previewLoading && <div className="py-8 text-center text-sm text-fg-muted">结算单预览加载中…</div>}
        {!previewLoading && preview !== null && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-fg-muted mb-1">
                时间费明细(进行中场次为此刻报价,关房按实际时刻重算
                {preview.billing.minCharge > 0 ? ' · 最低消费 ¥' + String(preview.billing.minCharge) : ''}
                {preview.billing.capCharge > 0 ? ' · 封顶 ¥' + String(preview.billing.capCharge) : ''})
              </div>
              <div className="border rounded border-line divide-y divide-primary/6">
                {preview.sessions.map((s) => (
                  <div key={s.sessionId} className="flex items-center gap-2 px-2 py-1.5 flex-wrap">
                    <span className="w-24 truncate">{s.stageName ?? '—'}</span>
                    <span className="text-xs text-fg-muted">{s.startAt.slice(11, 16)}~{s.endAt !== null ? s.endAt.slice(11, 16) : '进行中'}</span>
                    <span className="text-xs">{String(s.durationMinutes)} 分钟{String(s.billHours ?? 0) !== '0' ? ' → ' + String(s.billHours) + ' 小时' : ''}</span>
                    <span className="text-xs text-fg-muted">¥{String(s.unitPrice)}/时{s.priceSlotName !== null ? ' · ' + s.priceSlotName : ''}</span>
                    {s.minDurationApplied && <span className="text-[10px] text-warning">保底</span>}
                    <span className="ml-auto font-medium text-primary">¥{String(s.amount)}</span>
                  </div>
                ))}
                {preview.sessions.length === 0 && <div className="px-2 py-2 text-xs text-fg-muted">无上钟时间费</div>}
              </div>
            </div>
            <div>
              <div className="text-xs text-fg-muted mb-1">自点单明细(PLACED 视同送达一并结算)</div>
              <div className="border rounded border-line divide-y divide-primary/6">
                {preview.orders.map((o) => (
                  <div key={o.orderId} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="w-24 truncate">{o.stageName ?? '—'}</span>
                    <span className="text-xs text-fg-muted">{Array.isArray(o.items) ? String(o.items.length) + ' 项' : ''} · {o.status === 'PLACED' ? '未送达' : '已送达'}</span>
                    <span className="ml-auto font-medium">¥{String(o.totalAmount)}</span>
                  </div>
                ))}
                {preview.orders.length === 0 && <div className="px-2 py-2 text-xs text-fg-muted">无点单</div>}
              </div>
            </div>
            <div className="flex gap-4 justify-end text-sm">
              <span>时间费 <b className="text-primary">¥{String(preview.roomFee)}</b></span>
              <span>点单 <b className="text-primary">¥{String(preview.orderTotal)}</b></span>
              <span>合计 <b className="text-success text-base">¥{String(preview.totalAmount)}</b></span>
            </div>
            <div>
              <Label>结算方式</Label>
              <RadioGroup value={settleType} onValueChange={(v) => { setSettleType(v as 'CASH' | 'FEE_DEDUCT' | 'MIXED' | 'TICKET') }} className="flex gap-4 pt-1 flex-wrap">
                <div className="flex items-center gap-1"><RadioGroupItem value="CASH" id="op-cash" /><label htmlFor="op-cash">现金</label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="FEE_DEDUCT" id="op-fee" /><label htmlFor="op-fee">台费抵扣(全额)</label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="TICKET" id="op-ticket" /><label htmlFor="op-ticket">台票抵扣</label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="MIXED" id="op-mixed" /><label htmlFor="op-mixed">现金+抵扣</label></div>
              </RadioGroup>
            </div>
            {preview.ticketOptions.length > 0 && (settleType === 'TICKET' || settleType === 'MIXED') && (
              <div className="space-y-1">
                <Label>台票抵扣分配(余额 × 面值;核销入销售经理台票使用记录)</Label>
                <div className="border rounded border-line divide-y divide-primary/6">
                  {preview.ticketOptions.map((opt) => {
                    const key = String(opt.artistId) + ':' + String(opt.ticketRuleId)
                    return (
                      <div key={key} className="flex items-center gap-2 px-2 py-1.5">
                        <span className="w-20 truncate text-xs">{opt.stageName ?? '—'}</span>
                        <span className="text-xs text-fg-muted">{opt.ruleName} · 余 {String(opt.balance)} 张 × ¥{String(opt.faceValue)}</span>
                        <Input
                          className="ml-auto w-20 h-7 text-xs"
                          inputMode="numeric"
                          placeholder="张数"
                          value={ticketQty[key] ?? ''}
                          onChange={(e) => { setTicketQty({ ...ticketQty, [key]: e.target.value }) }}
                        />
                      </div>
                    )
                  })}
                </div>
                {ticketDeduct() > 0 && <div className="text-xs text-primary">台票抵扣合计 ¥{String(ticketDeduct())}</div>}
              </div>
            )}
            {(settleType === 'FEE_DEDUCT' || settleType === 'MIXED') && (
              <div className="space-y-1">
                <Label>抵扣销售经理(在房:{preview.artists.map((a) => (a.stageName ?? '—') + ' 余额¥' + String(a.feeBalance)).join(' · ')})</Label>
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
                  placeholder={settleType === 'FEE_DEDUCT' ? '抵扣金额(须=扣除台票后 ¥' + String(Math.round((preview.totalAmount - ticketDeduct()) * 100) / 100) + ')' : '抵扣金额(元;剩余按现金收款)'}
                  inputMode="decimal"
                  value={deductAmount}
                  onChange={(e) => { setDeductAmount(e.target.value) }}
                />
                {settleType === 'MIXED' && Number(deductAmount) > 0 && (
                  <div className="text-xs text-fg-muted">现金应收 ¥{String(Math.max(0, Math.round((preview.totalAmount - ticketDeduct() - Number(deductAmount)) * 100) / 100))}</div>
                )}
              </div>
            )}
            <div className="text-xs opacity-70">
              关房后包厢进入「清扫中」;台费抵扣逐销售经理生成 ROOM_SETTLE 流水(不可变),台票抵扣逐张写 USE 使用记录(refSessionId=本场首场次)。
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button disabled={busy || previewLoading || preview === null} onClick={() => { void doClose() }}>确认结算</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
