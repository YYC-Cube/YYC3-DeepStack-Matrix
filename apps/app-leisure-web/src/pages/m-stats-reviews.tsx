/**
 * 评价仪表(/m/stats/reviews):近 30 日评分均分环形+分布柱——图表化零明细
 * 数据源:/reviews summary
 */
import { useEffect, useState } from 'react'
import { Card } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { PageHeader, StatCard } from '@/components/kit'
import { MiniBars, MiniDonut } from '@/components/mini-chart'

interface Summary { count: number; avgScore: number; dist: Record<string, number> }

export default function MStatsReviewsPage(): React.JSX.Element {
  const [s, setS] = useState<Summary | null>(null)

  useEffect(() => {
    const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    const to = new Date().toISOString().slice(0, 10)
    void req<{ summary: Summary }>('GET', '/reviews?businessDateFrom=' + from + '&businessDateTo=' + to)
      .then((res) => setS(res.summary))
      .catch((e) => toastError(e, '评价加载失败'))
  }, [])

  const dist = s?.dist ?? {}
  const DIST_LABEL: Record<string, string> = { '5': '5星', '4': '4星', '3': '3星', '2': '2星', '1': '1星' }

  return (
    <div className="space-y-3">
      <PageHeader title="评价仪表" desc="近 30 日服务评价态势(明细请用 web 端服务评价)" />
      <Card className="p-4 flex items-center justify-around gap-2">
        <MiniDonut
          percent={s !== null ? Math.round((s.avgScore / 5) * 100) : 0}
          label="均分"
          color="#ffb84d"
          size={110}
          sub={s !== null ? '均分 ' + String(Math.round(s.avgScore * 10) / 10) + ' / 5' : undefined}
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="评价数" value={String(s?.count ?? 0)} tone="primary" />
          <StatCard label="好评率" value={(() => {
            const good = (dist['4'] ?? 0) + (dist['5'] ?? 0)
            return s !== null && s.count > 0 ? String(Math.round((good / s.count) * 100)) + '%' : '—'
          })()} />
        </div>
      </Card>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">星级分布(近 30 日)</div>
        <MiniBars
          items={Object.keys(DIST_LABEL).map((k) => ({ label: DIST_LABEL[k] ?? k, value: dist[k] ?? 0 }))}
          unit=" 条"
          color="#ffb84d"
        />
      </Card>
    </div>
  )
}
