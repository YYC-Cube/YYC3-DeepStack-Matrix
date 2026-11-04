/**
 * S3 我的分成(销售端 H5):本人分账计提(GET /split/my;只读)
 * 汇总卡(净额)+明细列表(营业日/金额/状态/支付方式);数据随分账方案计提与结算更新
 */
import { useCallback, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { mySplit, errText } from '../../lib/api'

interface EntryRow {
  id: number
  businessDate: string
  baseAmount: number
  amount: number
  status: string
  payMethod: string | null
  remark: string | null
}

const STATUS_LABEL: Record<string, string> = {
  ACCRUED: '已计提',
  CONFIRMED: '已复核',
  PAID: '已发放',
  REVERSED: '已冲正',
  REJECTED: '已驳回',
  PENDING: '待复核',
}

function fmtDate(v: string): string {
  return v.length >= 10 ? v.slice(0, 10) : v
}

export default function Earnings() {
  const [rows, setRows] = useState<EntryRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await mySplit()
      setRows(res.rows)
      setTotal(res.total)
      setMsg('')
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
        <Text className="mp-title">我的分成</Text>
        <Text className="mp-muted">
          {total === null ? '…' : '计提净额(元):' + total.toFixed(2)}
        </Text>
        <Text className="mp-muted">分账方案由门店配置;计提随营业日生成,结算发放后状态更新为「已发放」</Text>
      </View>

      <View className="mp-card">
        <Text className="mp-muted">分成明细(最近 100 条)</Text>
        {rows.length === 0 && <Text className="mp-muted">暂无分成计提记录</Text>}
        {rows.map((r) => (
          <View key={String(r.id)} className="mp-txn-row">
            <View className="mp-txn-left">
              <View>
                <Text className="mp-txn-type">{fmtDate(r.businessDate)}</Text>
              </View>
              <View>
                <Text className="mp-muted">{(STATUS_LABEL[r.status] ?? r.status) + ' · ' + (r.payMethod ?? '—')}</Text>
              </View>
              {r.remark !== null && r.remark !== '' && (
                <View>
                  <Text className="mp-muted">{r.remark}</Text>
                </View>
              )}
            </View>
            <Text className={r.amount < 0 ? 'mp-txn-amt-neg' : 'mp-txn-amt-pos'}>{r.amount.toFixed(2)}</Text>
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
