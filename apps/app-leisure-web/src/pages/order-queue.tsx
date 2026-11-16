/**
 * 点单履约队列(/orders/queue;2026-11-17 履约态分离批;13 号完整形态:PLACED→吧台/厨房履约→DELIVERED)
 * 背景:此前点单 place+deliver 立即入账;本批分离——RoomOrderDialog 提交即 PLACED,本页统一送达/取消
 * 视图:今日 PLACED 队列(单号/房/点单人/明细/金额/等待时长)+ 送达/取消操作;今日已送达折叠段
 * 口径:送达/取消端点现成(POST /self-orders/:id/deliver|cancel);房账消费聚合已含 PLACED(两态同算)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { client } from '@/lib/api'
import { PageHeader, StatusBadge } from '@/components/kit'

interface QueueRow {
  id: number
  sessionId: number
  roomId: number
  artistId: number
  items: Array<{ goodsId: number; name: string; qty: number; unitPrice: number }> | null
  totalAmount: string | number
  status: string
  placedAt: string | null
}

function waitLabel(placedAt: string | null): string {
  if (placedAt === null) return '—'
  const mins = Math.max(0, Math.floor((Date.now() - new Date(placedAt).getTime()) / 60_000))
  return mins >= 60 ? String(Math.floor(mins / 60)) + ' 小时 ' + String(mins % 60) + ' 分' : String(mins) + ' 分钟'
}

export default function OrderQueuePage(): React.JSX.Element {
  const [rows, setRows] = useState<QueueRow[]>([])
  const [roomNoById, setRoomNoById] = useState<Map<number, string>>(new Map())
  const [artistNameById, setArtistNameById] = useState<Map<number, string>>(new Map())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const bd = client.businessDateOf()
      const res = await req<{ rows: QueueRow[] }>('GET', '/self-orders?businessDate=' + bd + '&pageSize=200')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '队列加载失败')
    }
  }, [])

  // 房号/点单人名映射(裸行无名称;rooms+artists 一次拉取,零 API 改动)
  useEffect(() => {
    void Promise.all([
      req<{ rows: Array<{ id: number; roomNo: string }> }>('GET', '/store/rooms?pageSize=100'),
      req<{ rows: Array<{ id: number; stageName: string | null; realName: string | null }> }>('GET', '/artists?pageSize=100'),
    ])
      .then(([roomsRes, artistsRes]) => {
        setRoomNoById(new Map(roomsRes.rows.map((r) => [r.id, r.roomNo])))
        setArtistNameById(new Map(artistsRes.rows.map((a) => [a.id, a.stageName ?? a.realName ?? String(a.id)])))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 30_000) // 履约页轻轮询 30s
    return () => { clearInterval(timer) }
  }, [load])

  async function act(id: number, action: 'deliver' | 'cancel'): Promise<void> {
    if (action === 'cancel') {
      const ok = window.confirm('确认取消该点单?(已计入房账的金额将随之移除)')
      if (!ok) return
    }
    setBusy(true)
    try {
      await req('POST', '/self-orders/' + String(id) + '/' + action, {})
      toast.success(action === 'deliver' ? '已送达' : '已取消')
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const pending = rows.filter((r) => r.status === 'PLACED')
  const delivered = rows.filter((r) => r.status === 'DELIVERED')

  return (
    <div className="space-y-3">
      <PageHeader
        title="点单履约"
        desc="吧台/厨房履约视图:点单提交即入队(PLACED 待送达);送达后房账明细转 DELIVERED;房账消费两种状态同算,关房一并结算"
      />

      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-[#e0f0ff]">待送达</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,170,0,0.15)] text-[#ffaa00]">{String(pending.length)} 单</span>
          <span className="ml-auto text-[10px] text-[#8b9bb4]">30s 自动刷新</span>
        </div>
        <div className="space-y-2">
          {pending.map((r) => (
            <div key={r.id} className="border border-[rgba(255,170,0,0.25)] rounded-lg px-2.5 py-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#e0f0ff]">#{String(r.id)}</span>
                <span className="text-[#00d4ff]">{roomNoById.get(r.roomId) ?? '房 ' + String(r.roomId)}</span>
                <span className="text-[#8b9bb4]">{artistNameById.get(r.artistId) ?? '—'}</span>
                <span className="ml-auto" style={{ color: Number(r.totalAmount) > 0 ? '#ffaa00' : '#8b9bb4' }}>
                  ¥{String(r.totalAmount)}
                </span>
              </div>
              <div className="text-[11px] text-[#8b9bb4] break-all">
                {(r.items ?? []).map((it) => it.name + '×' + String(it.qty)).join(' · ') || '无明细'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8b9bb4]">已等待 {waitLabel(r.placedAt)}</span>
                <span className="flex-1" />
                <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" disabled={busy} onClick={() => { void act(r.id, 'cancel') }}>
                  取消
                </Button>
                <Button size="sm" className="h-6 px-2.5 text-[11px]" disabled={busy} onClick={() => { void act(r.id, 'deliver') }}>
                  ✓ 送达
                </Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <div className="text-center text-sm text-[#8b9bb4] py-6">队列空;新点单提交后在此出现</div>}
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-[#e0f0ff]">今日已送达</span>
          <StatusBadge label={String(delivered.length) + ' 单'} color="#00ff88" />
        </div>
        <div className="space-y-1">
          {delivered.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs border-b border-[rgba(0,212,255,0.05)] pb-1">
              <span className="text-[#8b9bb4]">#{String(r.id)}</span>
              <span className="text-[#00d4ff]">{roomNoById.get(r.roomId) ?? String(r.roomId)}</span>
              <span className="text-[#8b9bb4] truncate flex-1">{(r.items ?? []).map((it) => it.name + '×' + String(it.qty)).join(' · ')}</span>
              <span className="text-[#8b9bb4]">¥{String(r.totalAmount)}</span>
            </div>
          ))}
          {delivered.length === 0 && <div className="text-center text-xs text-[#8b9bb4] py-3">今日暂无已送达单</div>}
        </div>
      </Card>
    </div>
  )
}
