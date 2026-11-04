/**
 * 收款仪表(/m/stats/collection):近 7 日台费流水聚合(充值/扣费/净额趋势)——图表化零明细
 * 数据源:/stage-fee/txns?businessDateFrom/To&pageSize=500 前端按日聚合
 */
import { useEffect, useState } from 'react'
import { Card } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { PageHeader, StatCard } from '@/components/kit'
import { MiniBars, MiniSpark } from '@/components/mini-chart'

interface TxnRow { businessDate: string; type: string; amount: number }

function dayLabel(d: Date): string {
  return String(d.getMonth() + 1) + '/' + String(d.getDate())
}

export default function MStatsCollectionPage(): React.JSX.Element {
  const [recharge, setRecharge] = useState(0)
  const [deduct, setDeduct] = useState(0)
  const [days, setDays] = useState<Array<{ label: string; recharge: number; deduct: number }>>([])

  useEffect(() => {
    const from = new Date(Date.now() - 6 * 86_400_000)
    const to = new Date()
    const fmt = (d: Date): string => d.toISOString().slice(0, 10)
    void req<{ rows: TxnRow[] }>('GET', '/stage-fee/txns?businessDateFrom=' + fmt(from) + '&businessDateTo=' + fmt(to) + '&pageSize=500')
      .then((res) => {
        const byDay = new Map<string, { recharge: number; deduct: number }>()
        for (let i = 0; i < 7; i++) {
          const d = new Date(from.getTime() + i * 86_400_000)
          byDay.set(fmt(d), { recharge: 0, deduct: 0 })
        }
        let rc = 0
        let dc = 0
        for (const t of res.rows) {
          const key = t.businessDate.slice(0, 10)
          const bucket = byDay.get(key)
          const amt = Number(t.amount)
          if (bucket === undefined) continue
          if (t.type === 'RECHARGE' && amt > 0) { bucket.recharge += amt; rc += amt }
          if (t.type === 'ROOM_SETTLE' || t.type === 'MANUAL_DEDUCT') { bucket.deduct += Math.abs(amt); dc += Math.abs(amt) }
        }
        setRecharge(Math.round(rc * 100) / 100)
        setDeduct(Math.round(dc * 100) / 100)
        setDays([...byDay.entries()].map(([k, v]) => {
          const d = new Date(k + 'T12:00:00')
          return { label: dayLabel(d), recharge: Math.round(v.recharge), deduct: Math.round(v.deduct) }
        }))
      })
      .catch((e) => toastError(e, '流水加载失败'))
  }, [])

  return (
    <div className="space-y-3">
      <PageHeader title="收款仪表" desc="近 7 日台费流水态势(明细请用 web 端流水三查)" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="7 日充值" value={'¥' + String(recharge)} tone="primary" />
        <StatCard label="7 日扣费" value={'¥' + String(deduct)} />
      </div>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">充值趋势(近 7 日)</div>
        <MiniSpark points={days.map((d) => d.recharge)} label="每日充值(元)" color="#00ff88" />
      </Card>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">扣费趋势(近 7 日)</div>
        <MiniSpark points={days.map((d) => d.deduct)} label="每日扣费(元)" color="#ff7aa8" />
      </Card>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">每日对比</div>
        <MiniBars items={days.map((d) => ({ label: d.label, value: d.recharge }))} unit=" 元" color="#00d4ff" />
      </Card>
    </div>
  )
}
