/**
 * 移动房态图(m-board):移动端包厢房态(对齐移动工作台范式的房卡网格)
 * - 状态筛选 Tab(数量徽标)+ 双列房卡:空闲=房型首字水印;消费中=实时计时/消费;
 *   已预定=橙调;清扫=一键完成
 * - 开房/关房为共享组件 room-ops(与桌面看板共用;禁复制实现)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card } from '@yyc3/ui'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { client, req, toastError } from '@/lib/api'
import { RoomCloseDialog, RoomOpenDialog, type OpenSessionRow, type RoomRow, type ArtistRow } from '@/components/room-ops'
import PersonPicker from '@/components/person-picker'

const STATUS_TEXT: Record<string, string> = {
  FREE: '空闲', OCCUPIED: '消费中', CLEANING: '清扫中', MAINTENANCE: '维修中', DISABLED: '停用', BOOKED: '已预定',
}
const STATUS_COLOR: Record<string, string> = {
  FREE: '#22b573', OCCUPIED: '#e85d6f', CLEANING: '#3aa0d8', MAINTENANCE: '#9aa0a6', DISABLED: '#6b7280', BOOKED: '#f59e0b',
}
/** 筛选 Tab(顺序即展示序;count 动态) */
const FILTERS = ['全部', '消费中', '空闲', '已预定', '清扫中', '维修中'] as const

function elapsedLabel(startAt: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h === 0 ? `${String(m)} 分钟` : `${String(h)} 小时 ${String(m)} 分`
}

export default function MBoardPage(): React.JSX.Element {
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [openSessions, setOpenSessions] = useState<OpenSessionRow[]>([])
  const [bookedRoomIds, setBookedRoomIds] = useState<Set<number>>(new Set())
  const [consumptionMap, setConsumptionMap] = useState<Map<number, number>>(new Map())
  const [filter, setFilter] = useState<string>('全部')
  const [openRoom, setOpenRoom] = useState<RoomRow | null>(null)
  const [closeRoom, setCloseRoom] = useState<RoomRow | null>(null)
  // 上钟选人器(2026-11-04 房态重构:开房与上钟解耦)
  const [staffRoom, setStaffRoom] = useState<RoomRow | null>(null)
  const [closeSession, setCloseSession] = useState<OpenSessionRow | null>(null)
  const [busy, setBusy] = useState(false)

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
      const bookedSet = new Set<number>()
      for (const b of bookedRes.rows) {
        if (b.roomId !== null) bookedSet.add(b.roomId)
      }
      setBookedRoomIds(bookedSet)
      const consumption = new Map<number, number>()
      for (const row of [...placedRes.rows, ...deliveredRes.rows]) {
        consumption.set(row.sessionId, (consumption.get(row.sessionId) ?? 0) + Number(row.totalAmount))
      }
      setConsumptionMap(consumption)
    } catch (e) {
      toastError(e, '加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => { void load() }, 30_000) // 移动端轻轮询:30s 房态自新
    return () => { clearInterval(t) }
  }, [load])

  const roomStatus = (room: RoomRow): string => {
    if (openSessions.some((s) => s.roomId === room.id)) return 'OCCUPIED'
    if (room.status === 'FREE' && bookedRoomIds.has(room.id)) return 'BOOKED'
    return room.status
  }

  const statusOf = (r: RoomRow): string => STATUS_TEXT[roomStatus(r)] ?? roomStatus(r)
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rooms) {
      const st = statusOf(r)
      map.set(st, (map.get(st) ?? 0) + 1)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, openSessions, bookedRoomIds])

  const shown = rooms.filter((r) => filter === '全部' || statusOf(r) === filter)

  const cleaningDone = async (roomId: number): Promise<void> => {
    setBusy(true)
    try {
      await req('POST', '/rooms/' + String(roomId) + '/cleaning-done')
      await load()
    } catch (e) { toastError(e, '操作失败') } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--lm-bg, #060e1f)' }}>
      {/* 顶栏:标题 + 刷新 */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-2">
        <span className="text-[var(--lm-fg)] font-semibold text-base">房态图</span>
        <span className="text-xs text-fg-muted">{String(rooms.length)} 间</span>
        <button
          className="ml-auto w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--lm-primary) 12%, transparent)' }}
          onClick={() => { void load() }}
        >
          <RefreshCw className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* 状态筛选 Tab */}
      <div className="px-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => {
          const count = f === '全部' ? rooms.length : counts.get(f) ?? 0
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => { setFilter(f) }}
              className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
              style={{
                background: active ? 'var(--lm-primary)' : 'var(--lm-card)',
                color: active ? '#060e1f' : 'var(--lm-fg-muted)',
                fontWeight: active ? 600 : 400,
                border: '1px solid color-mix(in srgb, var(--lm-primary) 18%, transparent)',
              }}
            >
              {f} {String(count)}
            </button>
          )
        })}
      </div>

      {/* 房卡网格(双列;按类型分区 2026-11-08:31 间新布局) */}
      {(() => {
        const TYPE_ORDER = ['小包', '中包', '大包', 'VIP包', '西亳厅', '外卖房']
        const m = new Map<string, RoomRow[]>()
        for (const r of shown) {
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
          <div key={g.type} className="px-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[var(--lm-fg)]">{g.type}</span>
              <span className="text-[10px] text-fg-muted">{String(g.list.length)} 间 · 空闲 {String(g.list.filter((r) => statusOf(r) === '空闲').length)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {g.list.map((r) => {
          const st = roomStatus(r)
          const open = openSessions.find((s) => s.roomId === r.id)
          const color = STATUS_COLOR[st] ?? '#44546e'
          const consumption = open !== undefined ? (consumptionMap.get(open.id) ?? 0) : 0
          const watermark = (r.roomType?.name ?? r.roomNo).slice(0, 1)
          return (
            <Card
              key={r.id}
              className="p-2.5 relative overflow-hidden"
              style={{
                background:
                  st === 'OCCUPIED'
                    ? 'color-mix(in srgb, ' + color + ' 18%, var(--lm-card))'
                    : st === 'BOOKED'
                      ? 'color-mix(in srgb, ' + color + ' 14%, var(--lm-card))'
                      : 'var(--lm-card)',
                border: '1px solid color-mix(in srgb, ' + color + ' 35%, transparent)',
                minHeight: 116,
              }}
            >
              {/* 房型首字水印 */}
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none font-bold"
                style={{ fontSize: 64, color: 'color-mix(in srgb, var(--lm-fg) 8%, transparent)' }}
              >
                {st === 'FREE' || st === 'BOOKED' ? watermark : ''}
              </span>
              <div className="relative flex items-center gap-1.5">
                <span className="font-bold text-[var(--lm-fg)]">{r.roomNo}</span>
                <span
                  className="px-1.5 rounded-full text-[10px]"
                  style={{ background: 'color-mix(in srgb, ' + color + ' 20%, transparent)', color }}
                >
                  {STATUS_TEXT[st] ?? st}
                </span>
                {st === 'OCCUPIED' && open !== undefined && (
                  <span className="ml-auto text-[10px] text-fg-muted tabular-nums">{elapsedLabel(open.startAt)}</span>
                )}
              </div>

              {st === 'OCCUPIED' && open !== undefined && (
                <div className="relative mt-1 text-xs text-fg-muted">
                  当前消费 <span className="text-[var(--lm-fg)] font-semibold">¥{String(consumption)}</span>
                </div>
              )}
              {st === 'BOOKED' && <div className="relative mt-1 text-[11px]" style={{ color: STATUS_COLOR.BOOKED }}>今日有客预约</div>}

              <div className="relative flex gap-1.5 mt-2.5">
                {(st === 'FREE' || st === 'BOOKED') && (
                  <>
                    <Button size="sm" className="h-7 px-2.5 text-xs flex-1" onClick={() => { setOpenRoom(r) }}>开房</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => {
                        client.bookings
                          .create({ roomId: r.id })
                          .then(() => { toast.success(r.roomNo + ' 已预定'); void load() })
                          .catch((e) => toastError(e, '预定失败'))
                      }}
                    >
                      预定
                    </Button>
                  </>
                )}
                {st === 'OCCUPIED' && open !== undefined && (
                  <>
                    <Button size="sm" className="h-7 px-2.5 text-xs flex-1" onClick={() => { setStaffRoom(r) }}>
                      上钟
                    </Button>
                    <Button size="sm" className="h-7 px-2.5 text-xs flex-1" onClick={() => { setCloseRoom(r); setCloseSession(open) }}>
                      关房结算
                    </Button>
                  </>
                )}
                {st === 'CLEANING' && (
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs flex-1" disabled={busy} onClick={() => { void cleaningDone(r.id) }}>
                    清扫完成
                  </Button>
                )}
              </div>
            </Card>
          )
            })}
          </div>
        </div>
      ))})()}
      {shown.length === 0 && (
        <div className="text-center text-sm text-fg-muted py-10">该状态下暂无包厢</div>
      )}

      {/* 开房/关房共享弹窗 */}
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
          if (p !== null && !Array.isArray(p) && staffRoom !== null) {
            setBusy(true)
            client.sessions
              .start({ artistId: p.id, roomId: staffRoom.id })
              .then((out) => { toast.success(staffRoom.roomNo + ' 上钟成功 · ' + out.businessDate); setStaffRoom(null); return load() })
              .catch((e) => toastError(e, '上钟失败'))
              .finally(() => setBusy(false))
          }
        }}
      />
    </div>
  )
}
