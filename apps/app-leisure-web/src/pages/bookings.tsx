/**
 * 预约管理(实测 PC 列名:预约号/预约时间/包厢/组别/艺人/状态;需求全集 §9)
 * 状态机:BOOKED→ARRIVED(到店)/CANCELLED(取消)/NO_SHOW(未到),终态锁定(40913)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, req, toastError } from '@/lib/api'
import { DataTable, PageHeader, StatusBadge } from '@/components/kit'
import type { Column } from '@/components/kit'
import type { BookingRow } from '@yyc3/leisure-core'

const STATUS_TEXT: Record<string, string> = {
  BOOKED: '已预约', ARRIVED: '已到店', CANCELLED: '已取消', NO_SHOW: '未到店',
}
const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#ffaa00', ARRIVED: '#00ff88', CANCELLED: '#8b9bb4', NO_SHOW: '#ff6699',
}

interface RoomLite { id: number; roomNo: string; roomName: string | null }
interface ArtistLite { id: number; realName: string; stageName: string | null; badgeNo: string | null }

export default function BookingsPage(): React.JSX.Element {
  const [bd, setBd] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<BookingRow[]>()
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // 新建表单
  const [formOpen, setFormOpen] = useState(false)
  const [rooms, setRooms] = useState<RoomLite[]>([])
  const [artists, setArtists] = useState<ArtistLite[]>([])
  const [bookingTime, setBookingTime] = useState('')
  const [roomId, setRoomId] = useState('')
  const [artistId, setArtistId] = useState('')
  const [artistName, setArtistName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (p: number): Promise<void> => {
    setLoading(true)
    try {
      const res = await client.bookings.list({
        businessDate: bd,
        ...(status !== '' ? { status: status as 'BOOKED' | 'ARRIVED' | 'CANCELLED' | 'NO_SHOW' } : {}),
        page: p,
        pageSize: 20,
      })
      setRows(res.rows)
      setTotal(res.total)
      setPage(p)
    } catch (e) {
      toastError(e, '预约加载失败')
    } finally {
      setLoading(false)
    }
  }, [bd, status])

  useEffect(() => {
    void load(1)
  }, [load])

  useEffect(() => {
    void Promise.all([
      req<{ rows: RoomLite[] }>('GET', '/store/rooms?pageSize=100'),
      client.artists.list({ page: 1, pageSize: 100 }),
    ])
      .then(([roomRes, artistRes]) => {
        setRooms(roomRes.rows)
        setArtists(artistRes.rows as ArtistLite[])
      })
      .catch(() => {})
  }, [])

  const create = async (): Promise<void> => {
    if (artistId === '' && artistName.trim() === '') {
      toast.error('请选择艺人或填写指名人')
      return
    }
    setBusy(true)
    try {
      const res = await client.bookings.create({
        ...(bookingTime !== '' ? { bookingTime: new Date(bookingTime).toISOString() } : {}),
        ...(roomId !== '' ? { roomId: Number(roomId) } : {}),
        ...(artistId !== '' ? { artistId: Number(artistId) } : {}),
        ...(artistId === '' && artistName.trim() !== '' ? { artistName: artistName.trim() } : {}),
      })
      toast.success('预约已创建:' + res.bookingNo)
      setFormOpen(false)
      setBookingTime('')
      setRoomId('')
      setArtistId('')
      setArtistName('')
      await load(1)
    } catch (e) {
      toastError(e, '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const move = async (id: number, next: 'ARRIVED' | 'CANCELLED' | 'NO_SHOW'): Promise<void> => {
    try {
      await client.bookings.setStatus(id, next)
      toast.success('状态已更新:' + STATUS_TEXT[next])
      await load(page)
    } catch (e) {
      toastError(e, '状态流转失败')
    }
  }

  const columns: Array<Column<BookingRow>> = [
    { key: 'bookingNo', header: '预约号' },
    { key: 'bookingTime', header: '预约时间', render: (r) => (r.bookingTime !== null ? r.bookingTime.slice(5, 16).replace('T', ' ') : '—') },
    { key: 'roomName', header: '包厢', render: (r) => r.roomName ?? '—' },
    { key: 'artistName', header: '艺人', render: (r) => (r.artistName ?? '—') + (r.badgeNo !== null ? '(' + r.badgeNo + ')' : '') },
    {
      key: 'status',
      header: '状态',
      render: (r) => <StatusBadge label={STATUS_TEXT[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? '#8b9bb4'} />,
    },
    {
      key: 'actions',
      header: '操作',
      render: (r) =>
        r.status === 'BOOKED' ? (
          <span className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => void move(r.id, 'ARRIVED')}>到店</Button>
            <Button size="sm" variant="ghost" onClick={() => void move(r.id, 'NO_SHOW')}>未到</Button>
            <Button size="sm" variant="ghost" onClick={() => void move(r.id, 'CANCELLED')}>取消</Button>
          </span>
        ) : (
          <span className="text-xs text-[#8b9bb4]">终态</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="预约管理" desc="预约号自动生成(BK+营业日+序号);BOOKED→到店/取消/未到,终态锁定" />
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <Input type="date" className="w-40" value={bd} onChange={(e) => setBd(e.target.value)} />
        <select
          className="border rounded px-2 py-1.5 text-sm bg-transparent"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="BOOKED">已预约</option>
          <option value="ARRIVED">已到店</option>
          <option value="CANCELLED">已取消</option>
          <option value="NO_SHOW">未到店</option>
        </select>
        <Button variant="outline" onClick={() => void load(1)}>查询</Button>
        <Button className="ml-auto" onClick={() => setFormOpen(!formOpen)}>{formOpen ? '收起' : '+ 新建预约'}</Button>
      </div>

      {formOpen && (
        <Card className="p-4 space-y-3 max-w-xl mb-3">
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8b9bb4]">预约到店时间</Label>
              <Input type="datetime-local" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8b9bb4]">包厢</Label>
              <select
                className="border rounded px-2 py-1.5 text-sm bg-transparent w-40"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">不指定</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNo}
                    {r.roomName !== null ? ' · ' + r.roomName : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8b9bb4]">指名艺人(档案)</Label>
              <select
                className="border rounded px-2 py-1.5 text-sm bg-transparent w-44"
                value={artistId}
                onChange={(e) => { setArtistId(e.target.value); if (e.target.value !== '') setArtistName('') }}
              >
                <option value="">不指名</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.stageName ?? a.realName}({a.badgeNo ?? '无腰牌'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8b9bb4]">或口头指名(未建档)</Label>
              <Input
                className="w-44"
                value={artistName}
                onChange={(e) => { setArtistName(e.target.value); if (e.target.value !== '') setArtistId('') }}
                placeholder="客人指定的名字"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={busy} onClick={() => void create()}>创建预约</Button>
          </div>
        </Card>
      )}

      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={20} onPageChange={(p) => void load(p)} />
    </div>
  )
}
