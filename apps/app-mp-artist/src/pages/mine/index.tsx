/**
 * B4 我的(台费/流水):余额卡 + 流水列表(充值/扣费/冲正;类型中文标签与四端同源)
 * 台票/评价区块为 II 期占位;数据走 ARTIST scope 端点(强制本人)
 */
import { useCallback, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
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
  SESSION_DEDUCT: '上钟扣费',
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

  const load = useCallback(async (): Promise<void> => {
    const auth = loadAuth()
    if (auth === null) return
    setName(auth.name)
    try {
      const res = await myTxns({ businessDateFrom: '2020-01-01', businessDateTo: '2030-01-01' })
      setBalance(res.balance)
      setRows(res.rows)
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
        <Text className="mp-title">{name !== '' ? name : '我的'}</Text>
        <Text className="mp-muted">台费余额(元)</Text>
        <Text className={'mp-balance' + (balance !== null && balance < 0 ? ' mp-balance-neg' : '')}>
          {balance === null ? '…' : balance.toFixed(2)}
        </Text>
        {balance !== null && balance < 0 && <Text className="mp-warn">负余额 = 未收款,请与前台确认</Text>}
      </View>

      <View className="mp-card">
        <Text className="mp-muted">台费流水(最近 100 条)</Text>
        {rows.length === 0 && <Text className="mp-muted">暂无流水记录</Text>}
        {rows.map((r) => (
          <View key={r.id} className="mp-txn-row">
            <View className="mp-txn-left">
              <Text className="mp-txn-type">{TYPE_LABEL[r.type] ?? r.type}</Text>
              <Text className="mp-muted">{fmtTime(r.createdAt)}{r.remark !== null ? ' · ' + r.remark : ''}</Text>
            </View>
            <Text className={r.amount.startsWith('-') ? 'mp-txn-amt-neg' : 'mp-txn-amt-pos'}>{r.amount}</Text>
          </View>
        ))}
      </View>

      <View className="mp-card">
        <Text className="mp-muted">台票 / 我的服务评价:II 期开通</Text>
      </View>

      {msg !== '' && (
        <View className="mp-card">
          <Text className="mp-msg">{msg}</Text>
        </View>
      )}
    </View>
  )
}
