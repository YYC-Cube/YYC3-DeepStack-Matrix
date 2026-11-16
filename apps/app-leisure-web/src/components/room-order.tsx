/**
 * 通用点单弹窗(共享组件;2026-11-17 移动点单批从 board.tsx 内联抽出)
 * 背景:13 号《包厢操作与销售经理自点单》移动端缺口——桌面 board 有点单,m-board 无
 * 红线:禁双实现——桌面 board 与移动 m-board 房卡「点单」共用本组件
 * 流程:在售商品数量步进 → 选本房进行中上钟人员 → selfOrders.place+deliver → 入房账
 * 附:本房已点明细聚合(P5)+导出 xlsx
 */
import { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { SelfOrder } from '@yyc3/leisure-core'
import type { OpenSessionRow, RoomRow } from '@/components/room-ops'
import PersonPicker from '@/components/person-picker'

interface GoodsLite {
  id: number
  name: string
  salePrice: string | number
  unit: string | null
}

export function RoomOrderDialog({ room, openSessions, onClose, onPlaced }: {
  room: RoomRow | null
  openSessions: OpenSessionRow[]
  onClose: () => void
  onPlaced: () => void
}): React.JSX.Element {
  const [goods, setGoods] = useState<GoodsLite[]>([])
  const [items, setItems] = useState<Record<number, number>>({})
  const [history, setHistory] = useState<SelfOrder[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // 打开时拉在售商品+本房已点明细
  useEffect(() => {
    if (room === null) return
    setItems({})
    void client.goods.list({ onSale: true }).then((res) => {
      setGoods(res.rows.map((g) => ({ id: g.id, name: g.name, salePrice: g.salePrice, unit: g.unit ?? null })))
    }).catch(() => undefined)
    const os = openSessions.find((s) => s.roomId === room.id)
    if (os !== undefined) {
      void client.selfOrders.list({ sessionId: os.id }).then((res) => {
        setHistory(res.rows.filter((x) => x.status !== 'CANCELLED'))
      }).catch(() => undefined)
    } else {
      setHistory([])
    }
  }, [room, openSessions])

  const submit = async (artistId: number): Promise<void> => {
    if (room === null) return
    const list = Object.entries(items).filter(([, q]) => q > 0).map(([gid, q]) => ({ goodsId: Number(gid), qty: q }))
    if (list.length === 0) { toast.error('请至少选择一件商品数量'); return }
    setBusy(true)
    try {
      const os = openSessions.find((s) => s.roomId === room.id)
      if (os === undefined) {
        toast.error('本房无进行中房账')
        onClose()
        return
      }
      // 2026-11-17 履约态分离:提交即 PLACED(待吧台送达);不再即时 deliver——履约队列页统一送达/取消
      await client.selfOrders.place({ sessionId: os.id, artistId, items: list })
      const goodsRes = await client.goods.list({})
      const total = list.reduce((sum, it) => {
        const g = goodsRes.rows.find((x) => x.id === it.goodsId)
        return sum + (g !== undefined ? Number(g.salePrice) * it.qty : 0)
      }, 0)
      toast.success('已下单 ¥' + String(total) + ' · 待送达(计入 ' + room.roomNo + ' 房账)')
      onClose()
      onPlaced()
    } catch (e) {
      toastError(e, '点单失败')
    } finally {
      setBusy(false)
    }
  }

  const exportHistory = (): void => {
    if (room === null) return
    const os = openSessions.find((s) => s.roomId === room.id)
    if (os === undefined) return
    void fetch('/api/v1/self-orders/export?sessionId=' + String(os.id) + '&fmt=xlsx', {
      headers: { Authorization: 'Bearer ' + (useAuthStore.getState().token ?? '') },
    }).then(async (res) => {
      if (!res.ok) { toast.error('导出失败'); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = '点单明细-会话' + String(os.id) + '.xlsx'
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('已导出 xlsx')
    }).catch(() => toast.error('导出失败'))
  }

  const total = goods.reduce((sum, g) => sum + (items[g.id] ?? 0) * Number(g.salePrice), 0)

  return (
    <>
      <Dialog open={room !== null} onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>点单 · {room?.roomNo ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {/* 本房已点明细(P5:点单前先看本房已点) */}
            {history.length > 0 && (
              <div className="border border-line rounded-lg px-2.5 py-1.5 mb-2">
                <div className="text-[10px] text-fg-muted mb-1 flex items-center justify-between">
                  <span>本房已点({String(history.length)} 单)</span>
                  <button className="text-primary hover:underline" onClick={exportHistory}>
                    导出明细 xlsx ↓
                  </button>
                </div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {(() => {
                    const agg = new Map<string, number>()
                    for (const o of history) {
                      for (const it of o.items) {
                        agg.set(it.name, (agg.get(it.name) ?? 0) + it.qty)
                      }
                    }
                    if (agg.size === 0) return <div className="text-xs text-fg-muted">无明细</div>
                    return [...agg.entries()].map(([name, qty]) => (
                      <div key={name} className="flex justify-between text-xs">
                        <span>{name}</span>
                        <span className="text-fg-muted">× {String(qty)}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            {goods.length === 0 && <div className="text-xs text-fg-muted py-3 text-center">暂无在售商品;请先在「商品管理」上架</div>}
            {goods.map((g) => {
              const q = items[g.id] ?? 0
              return (
                <div key={g.id} className="flex items-center gap-2 border border-line rounded-lg px-2 py-1.5">
                  <span className="text-sm flex-1 min-w-0 truncate">{g.name}<span className="text-fg-muted text-xs"> ¥{String(g.salePrice)}{g.unit !== null ? '/' + g.unit : ''}</span></span>
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => { if (q > 0) setItems({ ...items, [g.id]: q - 1 }) }}>−</Button>
                  <input
                    className="w-10 h-6 text-center text-sm border border-line rounded bg-transparent"
                    value={String(q)}
                    onChange={(e) => setItems({ ...items, [g.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  />
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => setItems({ ...items, [g.id]: q + 1 })}>+</Button>
                </div>
              )
            })}
            <div className="text-right text-sm pt-1">
              合计 <span className="text-primary font-semibold">¥{String(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button disabled={busy || goods.every((g) => (items[g.id] ?? 0) === 0)} onClick={() => { setPickerOpen(true) }}>选人下单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PersonPicker
        open={pickerOpen}
        title={'点单选人 · ' + (room?.roomNo ?? '') + '(进行中上钟人员)'}
        line="SELL"
        busyOnly
        onClose={() => { setPickerOpen(false) }}
        onPick={(p) => {
          setPickerOpen(false)
          if (p !== null && !Array.isArray(p)) void submit(p.id)
        }}
      />
    </>
  )
}
