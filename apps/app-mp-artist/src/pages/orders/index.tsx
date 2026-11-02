/**
 * a21 我的订单:房账 + 自点单归一视图(数据走 ARTIST scope 端点 /me/orders,强制本人)
 * - SELF_ORDER:本人在房间自点的酒水/礼品单(状态:已下单/已送达/已结算/已取消)
 * - ROOM_FEE:本人上场次时间费(随房账关房统一结算;方案甲)
 */
import { useCallback, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { myOrders, errText } from '../../lib/api'

interface OrderRow {
  id: number
  kind: 'SELF_ORDER' | 'ROOM_FEE'
  businessDate: string
  roomNo: string
  amount: number
  status: string
  placedAt: string | null
  settledAt: string | null
  items: Array<{ goodsId: number; name: string; qty: number; unitPrice: number }> | null
}

interface OrdersResult {
  orders: OrderRow[]
  summary: { orderTotal: number; feeTotal: number; count: number }
}

const STATUS_LABEL: Record<string, string> = {
  PLACED: '已下单',
  DELIVERED: '已送达',
  SETTLED: '已结算',
  CANCELLED: '已取消',
}

function pad(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

function fmtTime(v: string | null): string {
  if (v === null) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export default function Orders() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [summary, setSummary] = useState<OrdersResult['summary'] | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await myOrders()
      setRows(res.orders)
      setSummary(res.summary)
    } catch (e) {
      setMsg(errText(e))
    }
  }, [])

  useDidShow(() => {
    void load()
  })

  return (
    <View className="mp-page">
      <View className="mp-card">
        <Text className="mp-title">我的订单</Text>
        {summary !== null && (
          <Text className="mp-muted">
            点单合计 ¥{summary.orderTotal.toFixed(2)} · 上钟费合计 ¥{summary.feeTotal.toFixed(2)} · 共 {String(summary.count)} 笔
          </Text>
        )}
      </View>

      <View className="mp-card">
        <Text className="mp-muted">订单明细(最近 100 笔)</Text>
        {rows.length === 0 && <Text className="mp-muted">暂无订单:上钟与点单随房账关房结算后在此可见</Text>}
        {rows.map((r) => (
          <View key={r.kind + ':' + String(r.id)} className="mp-txn-row">
            <View className="mp-txn-left">
              <Text className="mp-txn-type">
                {r.kind === 'SELF_ORDER' ? '点单 · ' + String(r.items?.length ?? 0) + ' 项' : '上钟费'}
                {' · ' + (r.roomNo !== '' ? r.roomNo + ' 包厢' : '包厢')}
              </Text>
              <Text className="mp-muted">
                {(STATUS_LABEL[r.status] ?? r.status) + ' · ' + fmtTime(r.kind === 'SELF_ORDER' ? r.placedAt : r.settledAt)}
              </Text>
              {r.items !== null && r.items.length > 0 && (
                <Text className="mp-muted">
                  {r.items.map((i) => i.name + '×' + String(i.qty)).join(' · ')}
                </Text>
              )}
            </View>
            <Text className={r.status === 'CANCELLED' ? 'mp-muted' : r.amount < 0 ? 'mp-txn-amt-neg' : 'mp-txn-amt-pos'}>
              ¥{r.amount.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {msg !== '' && (
        <View className="mp-card">
          <Text className="mp-msg">{msg}</Text>
        </View>
      )}
    </View>
  )
}
