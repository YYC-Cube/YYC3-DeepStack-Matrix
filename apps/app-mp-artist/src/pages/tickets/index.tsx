/**
 * B7 我的台票:按规则余额卡(含有效期)+ 购买/使用流水
 * 数据走 ARTIST scope 端点 /tickets/my(强制本人);购买在门店端,销售经理端只读
 */
import { useCallback, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { myTickets, errText } from '../../lib/api'

interface BalanceRow {
  ticketRuleId: number
  name: string
  validDays: number
  balance: number
  expireAt: string | null
  expired?: boolean
}
interface TxnRow {
  id: number
  businessDate: string
  type: string
  ruleName: string
  qty: number
  amount: number
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  BUY: '购买',
  USE: '使用',
  EXPIRE: '过期',
}

function pad(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

function fmtTime(v: string): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export default function Tickets() {
  const [rows, setRows] = useState<BalanceRow[]>([])
  const [txns, setTxns] = useState<TxnRow[]>([])
  /** 流水筛选(H5 卡片化专项对齐 mine) */
  const [tab, setTab] = useState<'ALL' | 'BUY' | 'USE'>('ALL')
  const [msg, setMsg] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await myTickets({ businessDateFrom: '2020-01-01', businessDateTo: '2030-01-01' })
      setRows(res.balance.rows)
      setTxns(res.txns)
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
        <Text className="mp-title">我的台票</Text>
        {rows.length === 0 && <Text className="mp-muted">暂无台票,购买请至门店前台</Text>}
        {rows.map((r) => (
          <View key={r.ticketRuleId} className="mp-txn-row">
            <View className="mp-txn-left">
              <Text className="mp-txn-type">{r.name}</Text>
              <Text className="mp-muted">
                {r.expired === true
                  ? '已过期(' + (r.expireAt ?? '').slice(0, 10) + ')'
                  : r.validDays > 0 && r.expireAt !== null
                    ? '有效期至 ' + r.expireAt.slice(0, 10)
                    : '长期有效'}
              </Text>
            </View>
            <Text className={r.balance > 0 ? 'mp-balance' : 'mp-muted'}>{String(r.balance)} 张</Text>
          </View>
        ))}
      </View>

      <View className="mp-card">
        <Text className="mp-muted">台票流水(购买/使用)</Text>
        <View className="mp-tab-row">
          {[['ALL', '全部'], ['BUY', '购买'], ['USE', '使用']].map(([k, label]) => (
            <Text key={k} className={'mp-tab' + (tab === k ? ' mp-tab-on' : '')} onClick={() => setTab(k as typeof tab)}>
              {label}
            </Text>
          ))}
        </View>
        {(() => {
          const filtered = txns.filter((t) => tab === 'ALL' || t.type === tab)
          if (filtered.length === 0) return <Text className="mp-muted">该分类暂无流水</Text>
          return filtered.map((t) => (
            <View key={t.id} className="mp-txn-row">
              <View className="mp-txn-left">
                <View className="mp-txn-badge-wrap">
                  <Text className="mp-txn-badge" style={{ background: t.type === 'BUY' ? '#37d67a' : '#ff6b81' }}>{TYPE_LABEL[t.type] ?? t.type}</Text>
                  <Text className="mp-muted">{fmtTime(t.createdAt)}</Text>
                </View>
                <Text className="mp-muted">{t.ruleName}</Text>
              </View>
              <Text className={t.type === 'BUY' ? 'mp-txn-amt-pos' : 'mp-txn-amt-neg'}>
                {t.type === 'BUY' ? '+' : '−'}{String(t.qty)} 张
                {t.type === 'BUY' ? ' ¥' + t.amount.toFixed(2) : ''}
              </Text>
            </View>
          ))
        })()}
      </View>

      {msg !== '' && (
        <View className="mp-card">
          <Text className="mp-msg">{msg}</Text>
        </View>
      )}
    </View>
  )
}
