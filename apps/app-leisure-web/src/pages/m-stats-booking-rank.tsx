/**
 * 业绩仪表(/m/stats/booking-rank):今日轮台被派排名+越序——图表化零明细
 * 数据源:/reports/dispatch-rotation
 */
import { useEffect, useState } from 'react'
import { Card } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { PageHeader, StatCard } from '@/components/kit'
import { MiniBars } from '@/components/mini-chart'

interface RankRow { artistId: number; stageName: string | null; dispatches: number; overridden: number }

export default function MStatsBookingRankPage(): React.JSX.Element {
  const [rows, setRows] = useState<RankRow[]>([])
  const [totalDispatch, setTotalDispatch] = useState(0)
  const [totalOverride, setTotalOverride] = useState(0)

  useEffect(() => {
    const bd = new Date().toISOString().slice(0, 10)
    void req<{ data: RankRow[] }>('GET', '/reports/dispatch-rotation?businessDateFrom=' + bd + '&businessDateTo=' + bd)
      .then((res) => {
        const rows = Array.isArray(res) ? res : ((res as unknown as { data?: RankRow[] }).data ?? [])
        const sorted = [...rows].sort((a, b) => b.dispatches - a.dispatches)
        setRows(sorted.slice(0, 8))
        setTotalDispatch(sorted.reduce((s, r) => s + r.dispatches, 0))
        setTotalOverride(sorted.reduce((s, r) => s + r.overridden, 0))
      })
      .catch((e) => toastError(e, '轮台报表加载失败'))
  }, [])

  return (
    <div className="space-y-3">
      <PageHeader title="业绩仪表" desc="今日轮台被派态势(明细请用 web 端轮台报表)" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="今日总派单" value={String(totalDispatch) + ' 次'} tone="primary" />
        <StatCard label="越序次数" value={String(totalOverride)} />
      </div>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">被派排名 Top8</div>
        {rows.length === 0 && <div className="text-xs text-fg-muted py-4 text-center">今日暂无派单</div>}
        <MiniBars
          items={rows.map((r) => ({ label: r.stageName ?? String(r.artistId), value: r.dispatches }))}
          unit=" 次"
          color="#ffb84d"
        />
      </Card>
    </div>
  )
}
