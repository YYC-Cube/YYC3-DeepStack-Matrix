/**
 * 包厢房态看板(方案甲):四色卡片看板 + 开房(绑在场销售经理) + 关房统一结算单
 * 依据:《12-包厢房态模块-构建指导》§5;时间费即台费,关房统一结算(ROOM_SETTLE 逐销售经理流水)
 * 开房/关房弹窗为共享组件 room-ops(与移动房态图 m-board 共用;禁复制实现)
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, req, toastError } from '@/lib/api'
import { PageHeader } from '@/components/kit'
import { RoomAdminPanel } from '@/components/room-admin'
import { RoomCloseDialog, RoomOpenDialog, type OpenSessionRow, type RoomRow, type ArtistRow } from '@/components/room-ops'
import PersonPicker from '@/components/person-picker'

interface CloseResult {
  roomFee: number
  orderTotal: number
  totalAmount: number
  settledSessions: number
}

const STATUS_TEXT: Record<string, string> = {
  FREE: '空闲', OCCUPIED: '消费中', CLEANING: '清扫中', MAINTENANCE: '维修中', DISABLED: '停用', BOOKED: '已预定',
}
/** 状态色语义(对齐智慧商家:绿=空房 红=开房 橙=预定 蓝=清扫 灰=维修) */
const STATUS_COLOR: Record<string, string> = {
  FREE: '#22b573', OCCUPIED: '#e85d6f', CLEANING: '#3aa0d8', MAINTENANCE: '#9aa0a6', DISABLED: '#6b7280', BOOKED: '#f59e0b',
}

/** 计时时长格式化:X小时Y分 */
function elapsedLabel(startAt: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${String(m)} 分钟`
  return `${String(h)} 小时 ${String(m)} 分`
}

export default function BoardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [openSessions, setOpenSessions] = useState<OpenSessionRow[]>([])
  const [busy, setBusy] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  /** 今日已预定包厢(预约未到店) */
  const [bookedRoomIds, setBookedRoomIds] = useState<Set<number>>(new Set())
  /** 房账当前消费(点单聚合,sessionId → 金额) */
  const [consumptionMap, setConsumptionMap] = useState<Map<number, number>>(new Map())

  // 预定弹窗(房间卡快捷预定:直接建 BOOKED 预约;2026-11-08 挂客资)
  const [reserveFor, setReserveFor] = useState<RoomRow | null>(null)
  const [reserveTime, setReserveTime] = useState('')
  const [reserveArtist, setReserveArtist] = useState('')
  const [reserveCustomer, setReserveCustomer] = useState('')
  const [reserveLeads, setReserveLeads] = useState<Array<{ id: number; name: string; phone: string | null }>>([])

  // 开房/关房(共享组件 room-ops)
  const [openRoom, setOpenRoom] = useState<RoomRow | null>(null)
  const [closeRoom, setCloseRoom] = useState<RoomRow | null>(null)
  const [closeSession, setCloseSession] = useState<OpenSessionRow | null>(null)
  // 上钟/送花(2026-11-04 房态重构:开房与上钟解耦;统一选人器)
  const [staffRoom, setStaffRoom] = useState<RoomRow | null>(null)
  const [flowerRoom, setFlowerRoom] = useState<RoomRow | null>(null)
  // 通用点单(P3 2026-11-07):多商品数量→入房账;选人=本房进行中上钟人员
  const [orderRoom, setOrderRoom] = useState<RoomRow | null>(null)
  const [orderGoods, setOrderGoods] = useState<Array<{ id: number; name: string; salePrice: string | number; unit: string | null }>>([])
  const [orderItems, setOrderItems] = useState<Record<number, number>>({})
  const [orderPickerOpen, setOrderPickerOpen] = useState(false)

  const startStage = async (artistId: number): Promise<void> => {
    if (staffRoom === null) return
    setBusy(true)
    try {
      const out = await client.sessions.start({ artistId, roomId: staffRoom.id })
      toast.success(staffRoom.roomNo + ' 上钟成功 · 营业日 ' + out.businessDate)
      setStaffRoom(null)
      await load()
    } catch (e) {
      toastError(e, '上钟失败')
    } finally {
      setBusy(false)
    }
  }

  const sendFlower = async (artistId: number): Promise<void> => {
    if (flowerRoom === null) return
    setBusy(true)
    try {
      // 送花=礼品入房账(008 #2):从在售商品取「花」类,无则提示上架;下单即计费入本房账
      const goodsRes = await client.goods.list({ onSale: true })
      const flower = goodsRes.rows.find((g) => (g.category ?? '').includes('花') || g.name.includes('花'))
      if (flower === undefined) {
        toast.error('请先在商品管理上架「花」类礼品(分类含「花」或名称含「花」),再使用送花')
        setFlowerRoom(null)
        return
      }
      const openSession = openSessions.find((s) => s.roomId === flowerRoom.id)
      if (openSession === undefined) {
        toast.error('本房无进行中房账')
        setFlowerRoom(null)
        return
      }
      const order = await client.selfOrders.place({ sessionId: openSession.id, artistId, items: [{ goodsId: flower.id, qty: 1 }] })
      await client.selfOrders.deliver(order.orderId)
      toast.success('送花成功 · ' + flower.name + ' ¥' + String(order.totalAmount) + ' 已计入 ' + flowerRoom.roomNo + ' 房账')
      setFlowerRoom(null)
      await load()
    } catch (e) {
      toastError(e, '送花失败')
    } finally {
      setBusy(false)
    }
  }

  /** 通用点单提交(P3):多商品数量→selfOrders.place+deliver→入本房账;artistId=本房进行中上钟人员 */
  const submitOrder = async (artistId: number): Promise<void> => {
    if (orderRoom === null) return
    const items = Object.entries(orderItems)
      .filter(([, q]) => q > 0)
      .map(([gid, q]) => ({ goodsId: Number(gid), qty: q }))
    if (items.length === 0) {
      toast.error('请至少选择一件商品数量')
      return
    }
    setBusy(true)
    try {
      const openSession = openSessions.find((s) => s.roomId === orderRoom.id)
      if (openSession === undefined) {
        toast.error('本房无进行中房账')
        setOrderRoom(null)
        return
      }
      const order = await client.selfOrders.place({ sessionId: openSession.id, artistId, items })
      await client.selfOrders.deliver(order.orderId)
      const goodsRes = await client.goods.list({})
      const total = items.reduce((sum, it) => {
        const g = goodsRes.rows.find((x) => x.id === it.goodsId)
        return sum + (g !== undefined ? Number(g.salePrice) * it.qty : 0)
      }, 0)
      toast.success('点单成功 · 共 ¥' + String(total) + ' 已计入 ' + orderRoom.roomNo + ' 房账')
      setOrderRoom(null)
      setOrderItems({})
      await load()
    } catch (e) {
      toastError(e, '点单失败')
    } finally {
      setBusy(false)
    }
  }

  const createReserve = async (): Promise<void> => {
    if (reserveFor === null) return    setBusy(true)
    try {
      await client.bookings.create({
        roomId: reserveFor.id,
        artistId: reserveArtist === '' ? undefined : Number(reserveArtist),
        customerId: reserveCustomer === '' ? undefined : Number(reserveCustomer),
        bookingTime: reserveTime === '' ? undefined : new Date(reserveTime).toISOString(),
      })
      toast.success(reserveFor.roomNo + ' 预定成功(BOOKED,到店后转 ARRIVED)')
      setReserveFor(null)
      setReserveCustomer('')
      await load()
    } catch (e) {
      toastError(e, '预定失败')
    } finally {
      setBusy(false)
    }
  }

  const load = useCallback(async (): Promise<void> => {
    try {
      const bd = client.businessDateOf()
      const [roomsRes, sessionsRes, artistsRes, bookedRes, placedRes, deliveredRes] = await Promise.all([
        req<{ rows: RoomRow[] }>('GET', '/store/rooms?pageSize=100'),
        req<{ rows: OpenSessionRow[] }>('GET', '/room-sessions?status=OPEN'),
        req<{ rows: ArtistRow[] }>('GET', '/artists?pageSize=100'),
        client.bookings.list({ businessDate: bd, status: 'BOOKED', pageSize: 100 }),
        req<{ rows: Array<{ sessionId: number; totalAmount: number }> }>('GET', '/self-orders?businessDate=' + bd + '&status=PLACED&pageSize=200'),
        req<{ rows: Array<{ sessionId: number; totalAmount: number }> }>('GET', '/self-orders?businessDate=' + bd + '&status=DELIVERED&pageSize=200'),
      ])
      setRooms(roomsRes.rows)
      setOpenSessions(sessionsRes.rows)
      setArtists(artistsRes.rows)
      // 已预定包厢(预约未到店)
      const bookedSet = new Set<number>()
      for (const b of bookedRes.rows) {
        if (b.roomId !== null) bookedSet.add(b.roomId)
      }
      setBookedRoomIds(bookedSet)
      // 房账当前消费(按房账聚合点单)
      const consumption = new Map<number, number>()
      for (const row of [...placedRes.rows, ...deliveredRes.rows]) {
        consumption.set(row.sessionId, (consumption.get(row.sessionId) ?? 0) + Number(row.totalAmount))
      }
      setConsumptionMap(consumption)
    } catch (e) {
      toastError(e, '加载失败')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const roomStatus = (room: RoomRow): string => {
    if (openSessions.some((s) => s.roomId === room.id)) return 'OCCUPIED'
    if (room.status === 'FREE' && bookedRoomIds.has(room.id)) return 'BOOKED'
    return room.status
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
      <PageHeader title="包厢房态看板(方案甲)" desc="开房绑定在场销售经理 · 关房统一结算(时间费即台费 + 点单);移动端请用「工作台 → 房态图」" />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { void load() }}>刷新</Button>
        <Button variant="outline" disabled={busy} onClick={() => { void bulkCleaning() }}>一键清扫完成</Button>
        <Button variant="outline" onClick={() => setAdminOpen(true)}>房间设置(增/改/停用)</Button>
      </div>
      <RoomAdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onChanged={() => { void load() }} />
      {/* 按类型分区(2026-11-08:31 间新布局;固定序:小包/中包/大包/VIP包/西亳厅/外卖房) */}
      {(() => {
        const TYPE_ORDER = ['小包', '中包', '大包', 'VIP包', '西亳厅', '外卖房']
        const m = new Map<string, RoomRow[]>()
        for (const r of rooms) {
          const t = r.roomType?.name ?? '未分类'
          const arr = m.get(t) ?? []
          arr.push(r)
          m.set(t, arr)
        }
        const groups = TYPE_ORDER.filter((t) => m.has(t)).map((t) => ({ type: t, list: m.get(t) ?? [] }))
        for (const [t, list] of m.entries()) {
          if (!TYPE_ORDER.includes(t)) groups.push({ type: t, list })
        }
        return groups.map((g) => (
          <div key={g.type} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--lm-fg)]">{g.type}</span>
              <span className="text-xs text-fg-muted">{String(g.list.length)} 间 · 空闲 {String(g.list.filter((r) => roomStatus(r) === 'FREE').length)}</span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
              {g.list.map((r) => {
                const st = roomStatus(r)
                const open = openSessions.find((s) => s.roomId === r.id)
                const color = STATUS_COLOR[st] ?? '#44546e'
                const canOpen = st === 'FREE' || st === 'BOOKED'
                const canClose = st === 'OCCUPIED' && open !== undefined
                const canClean = st === 'CLEANING'
                const consumption = open !== undefined ? (consumptionMap.get(open.id) ?? 0) : 0
                return (
            <Card
              key={r.id}
              className="p-3 space-y-1.5"
              style={{
                background: `color-mix(in srgb, ${color} 12%, var(--lm-card))`,
                border: 'none',
                borderLeft: `3px solid ${color}`,
                minHeight: 128,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--lm-fg)]">{r.roomNo}</span>
                <span className="text-xs text-fg-muted">{r.roomType?.name ?? ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {STATUS_TEXT[st] ?? st}
              </div>

              {st === 'OCCUPIED' && open !== undefined && (
                <div className="text-xs text-fg-muted space-y-0.5">
                  <div>计时消费中 {elapsedLabel(open.startAt)}</div>
                  <div>
                    当前消费 <span className="text-[var(--lm-fg)] font-medium">¥{String(consumption)}</span>
                  </div>
                </div>
              )}
              {st === 'BOOKED' && (
                <div className="text-xs text-fg-muted">今日有客预约 · 可提前开房备房</div>
              )}

              <div className="flex gap-1 pt-1 flex-wrap">
                {canOpen && (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { setOpenRoom(r) }}>
                    开房
                  </Button>
                )}
                {canClose && (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { setCloseRoom(r); setCloseSession(open ?? null) }}>
                    关房
                  </Button>
                )}
                {(st === 'FREE' || st === 'BOOKED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => { setReserveFor(r); setReserveTime('') ; setReserveArtist('') }}
                  >
                    预定
                  </Button>
                )}
                {st === 'OCCUPIED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => { setStaffRoom(r) }}
                    title="为该房上钟:选人器(分组/首字母搜索/未上钟/头像)"
                  >
                    上钟
                  </Button>
                )}
                {st === 'OCCUPIED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => { navigate('/sessions') }}
                    title="查看/管理本房在场销售经理上下钟"
                  >
                    销售经理
                  </Button>
                )}
                {st === 'OCCUPIED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setOrderRoom(r)
                      setOrderItems({})
                      void client.goods.list({ onSale: true }).then((res) => setOrderGoods(res.rows.map((g) => ({ id: g.id, name: g.name, salePrice: g.salePrice, unit: g.unit ?? null }))))
                    }}
                    title="为本房点单:多商品入房账"
                  >
                    点单
                  </Button>
                )}
                {st === 'OCCUPIED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => { setFlowerRoom(r) }}
                    title="给本房在场上钟销售经理送花入房账"
                  >
                    送花
                  </Button>
                )}
                {canClean && (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { void cleaningDone(r.id) }}>
                    清扫完成
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  ))
})()}

      {/* 预定弹窗:房间快捷预约(BOOKED) */}
      <Dialog open={reserveFor !== null} onOpenChange={(o) => { if (!o) setReserveFor(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>预定包厢 · {reserveFor?.roomNo ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>到店时间(空=今晚) </Label>
              <Input type="datetime-local" value={reserveTime} onChange={(e) => { setReserveTime(e.target.value) }} />
            </div>
            <div className="space-y-1">
              <Label>指名销售经理(可选)</Label>
              <select
                className="w-full h-9 rounded-md bg-[rgba(0,40,80,0.3)] border border-[rgba(0,212,255,0.2)] px-2 text-sm text-[var(--lm-fg)] outline-none focus:border-primary"
                value={reserveArtist}
                onChange={(e) => { setReserveArtist(e.target.value) }}
              >
                <option value="">不指名</option>
                {artists.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.stageName ?? a.realName}
                    {a.badgeNo !== null ? `(${a.badgeNo})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>关联客资(可选;客资体系衔接)</Label>
              <select
                className="w-full h-9 rounded-md bg-[rgba(0,40,80,0.3)] border border-[rgba(0,212,255,0.2)] px-2 text-sm text-[var(--lm-fg)] outline-none focus:border-primary"
                value={reserveCustomer}
                onChange={(e) => { setReserveCustomer(e.target.value) }}
                onFocus={() => {
                  void req<{ rows: Array<{ id: number; name: string; phone: string | null }> }>('GET', '/customers').then((r) => setReserveLeads(r.rows)).catch(() => undefined)
                }}
              >
                <option value="">不关联</option>
                {reserveLeads.map((l) => (
                  <option key={l.id} value={String(l.id)}>{l.name}{l.phone !== null ? ' · ' + l.phone : ''}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-fg-muted">
              创建后包厢显示「已预定」色;客到店在「预约管理」转 ARRIVED,开房即正常计费。预订记录将挂客资+指名销售经理,可在预约管理追溯。
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReserveFor(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void createReserve() }}>确认预定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 开房/关房共享弹窗(room-ops;桌面与移动共用) */}
      <RoomOpenDialog
        room={openRoom}
        artists={artists}
        hasBooking={openRoom !== null && bookedRoomIds.has(openRoom.id)}
        onClose={() => { setOpenRoom(null) }}
        onOpened={load}
      />
      <RoomCloseDialog
        room={closeRoom}
        session={closeSession}
        onClose={() => { setCloseRoom(null); setCloseSession(null) }}
        onClosed={load}
      />
      <PersonPicker
        open={staffRoom !== null}
        title={'上钟 · ' + (staffRoom?.roomNo ?? '') + '(仅未上钟人员)'}
        line="SELL"
        excludeBusy
        onClose={() => { setStaffRoom(null) }}
        onPick={(p) => {
          if (p !== null && !Array.isArray(p)) void startStage(p.id)
        }}
      />
      <PersonPicker
        open={flowerRoom !== null}
        title={'送花 · ' + (flowerRoom?.roomNo ?? '') + '(进行中上钟人员)'}
        line="SELL"
        busyOnly
        onClose={() => { setFlowerRoom(null) }}
        onPick={(p) => {
          if (p !== null && !Array.isArray(p)) void sendFlower(p.id)
        }}
      />

      {/* 通用点单弹窗(P3):商品数量 + 选进行中上钟人员 */}
      <Dialog open={orderRoom !== null} onOpenChange={(o) => { if (!o) { setOrderRoom(null); setOrderItems({}) } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>点单 · {orderRoom?.roomNo ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {orderGoods.length === 0 && <div className="text-xs text-fg-muted py-3 text-center">暂无在售商品;请先在「商品管理」上架</div>}
            {orderGoods.map((g) => {
              const q = orderItems[g.id] ?? 0
              return (
                <div key={g.id} className="flex items-center gap-2 border border-line rounded-lg px-2 py-1.5">
                  <span className="text-sm flex-1 min-w-0 truncate">{g.name}<span className="text-fg-muted text-xs"> ¥{String(g.salePrice)}{g.unit !== null ? '/' + g.unit : ''}</span></span>
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => { if (q > 0) setOrderItems({ ...orderItems, [g.id]: q - 1 }) }}>−</Button>
                  <input
                    className="w-10 h-6 text-center text-sm border border-line rounded bg-transparent"
                    value={String(q)}
                    onChange={(e) => setOrderItems({ ...orderItems, [g.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  />
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => setOrderItems({ ...orderItems, [g.id]: q + 1 })}>+</Button>
                </div>
              )
            })}
            <div className="text-right text-sm pt-1">
              合计 <span className="text-primary font-semibold">¥{String(orderGoods.reduce((sum, g) => sum + (orderItems[g.id] ?? 0) * Number(g.salePrice), 0))}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOrderRoom(null); setOrderItems({}) }}>取消</Button>
            <Button disabled={busy || orderGoods.every((g) => (orderItems[g.id] ?? 0) === 0)} onClick={() => { setOrderPickerOpen(true) }}>选人下单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PersonPicker
        open={orderPickerOpen}
        title={'点单选人 · ' + (orderRoom?.roomNo ?? '') + '(进行中上钟人员)'}
        line="SELL"
        busyOnly
        onClose={() => { setOrderPickerOpen(false) }}
        onPick={(p) => {
          setOrderPickerOpen(false)
          if (p !== null && !Array.isArray(p)) void submitOrder(p.id)
        }}
      />
    </div>
  )
}
