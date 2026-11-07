/**
 * B4 我的(台费/流水):余额卡 + 流水列表(充值/关房结算/手动扣费/冲正;类型中文标签与四端同源)
 * 台票走独立页(B7);评价为 III 期占位;数据走 ARTIST scope 端点(强制本人)
 */
import { useCallback, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import logoPng from '../../assets/yyc3-logo.png'
import { loadAuth, myTxns, errText } from '../../lib/api'

interface TxnRow {
  id: number
  type: string
  amount: string
  remark: string | null
  refType: string | null
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  RECHARGE: '充值',
  ROOM_SETTLE: '关房结算',
  MANUAL_DEDUCT: '手动扣费',
  REVERSE: '冲正',
}

function pad(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

function todayStr(): string {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function fmtTime(v: string): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export default function Mine() {
  const [balance, setBalance] = useState<number | null>(null)
  const [rows, setRows] = useState<TxnRow[]>([])
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [sum7, setSum7] = useState<{ in7: number; out7: number }>({ in7: 0, out7: 0 })
  /** 流水类型筛选(H5 卡片化专项:全部/充值/扣费/冲正 本地过滤) */
  const [tab, setTab] = useState<'ALL' | 'RECHARGE' | 'DEDUCT' | 'REVERSE'>('ALL')

  const load = useCallback(async (): Promise<void> => {
    const auth = loadAuth()
    if (auth === null) return
    setName(auth.name)
    try {
      const res = await myTxns({ businessDateFrom: '2020-01-01', businessDateTo: '2030-01-01' })
      setBalance(res.balance)
      setRows(res.rows)
      // 近 7 日收支(H5 卡片化专项摘要)
      const cut = Date.now() - 7 * 86_400_000
      let in7 = 0
      let out7 = 0
      for (const r of res.rows) {
        const t = new Date(r.createdAt).getTime()
        if (t < cut) continue
        const a = Number(r.amount)
        if (a > 0) in7 += a
        else out7 += Math.abs(a)
      }
      setSum7({ in7: Math.round(in7 * 100) / 100, out7: Math.round(out7 * 100) / 100 })
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
        <View className="flex items-center" style={{ gap: '10px' }}>
          <Image src={logoPng} style={{ width: '36px', height: '36px' }} mode='aspectFit' />
          <Text className="mp-title">{name !== '' ? name : '我的'}</Text>
        </View>
        <Text className="mp-muted">台费余额(元)</Text>
        <Text className={'mp-balance' + (balance !== null && balance < 0 ? ' mp-balance-neg' : '')}>
          {balance === null ? '…' : balance.toFixed(2)}
        </Text>
        {balance !== null && balance < 0 && <Text className="mp-warn">负余额 = 未收款,请与前台确认</Text>}
        <View className="mp-sum7">
          <View className="mp-sum7-item">
            <Text className="mp-sum7-num" style={{ color: '#37d67a' }}>{sum7.in7.toFixed(2)}</Text>
            <Text className="mp-sum7-lb">近 7 日收入</Text>
          </View>
          <View className="mp-sum7-item">
            <Text className="mp-sum7-num" style={{ color: '#ff6b81' }}>{sum7.out7.toFixed(2)}</Text>
            <Text className="mp-sum7-lb">近 7 日支出</Text>
          </View>
        </View>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">台费流水(最近 100 条)</Text>
        <View className="mp-tab-row">
          {[['ALL', '全部'], ['RECHARGE', '充值'], ['DEDUCT', '扣费'], ['REVERSE', '冲正']].map(([k, label]) => (
            <Text
              key={k}
              className={'mp-tab' + (tab === k ? ' mp-tab-on' : '')}
              onClick={() => setTab(k as typeof tab)}
            >
              {label}
            </Text>
          ))}
        </View>
        {(() => {
          const filtered = rows.filter((r) => {
            if (tab === 'ALL') return true
            if (tab === 'RECHARGE') return r.type === 'RECHARGE'
            if (tab === 'DEDUCT') return r.type === 'ROOM_SETTLE' || r.type === 'MANUAL_DEDUCT'
            return r.type === 'REVERSE'
          })
          if (filtered.length === 0) return <Text className="mp-muted">该分类暂无流水</Text>
          return filtered.map((r) => {
            const isPos = !r.amount.startsWith('-')
            const tone = r.type === 'RECHARGE' ? '#37d67a' : r.type === 'REVERSE' ? '#f5a623' : '#ff6b81'
            return (
              <View key={r.id} className="mp-txn-row">
                <View className="mp-txn-left">
                  <View className="mp-txn-badge-wrap">
                    <Text className="mp-txn-badge" style={{ background: tone }}>{TYPE_LABEL[r.type] ?? r.type}</Text>
                    <Text className="mp-muted">{fmtTime(r.createdAt)}</Text>
                  </View>
                  {r.remark !== null && <Text className="mp-muted">{r.remark}</Text>}
                </View>
                <Text className={isPos ? 'mp-txn-amt-pos' : 'mp-txn-amt-neg'}>{r.amount}</Text>
              </View>
            )
          })
        })()}
      </View>

      <View className="mp-card">
        <Text className="mp-muted">我的台票(B7)</Text>
        <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/tickets/index' })}>
          查看台票余额与流水
        </Button>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">我的任务(web/H5 双端一致)</Text>
        <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/tasks/index' })}>
          查看任务进度与达标
        </Button>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">沟通(店群/组别群)</Text>
        <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/chat/index' })}>
          进入群聊
        </Button>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">我的订单(a21:点单+上钟费)</Text>
        <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/orders/index' })}>
          查看我的订单
        </Button>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">我的分成(S2:分账计提)</Text>
        <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/earnings/index' })}>
          查看我的分成
        </Button>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">我的服务评价:III 期开通</Text>
      </View>

      {msg !== '' && (
        <View className="mp-card">
          <Text className="mp-msg">{msg}</Text>
        </View>
      )}
    </View>
  )
}
