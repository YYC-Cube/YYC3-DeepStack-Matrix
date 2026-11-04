/**
 * 出勤仪表(/m/stats/attendance;移动端精致化:图表化零明细——Owner 理念 2026-11-04)
 * 数据源:/attendance/realtime(实时态)+/artists(在册数)
 */
import { useEffect, useState } from 'react'
import { Card } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { PageHeader, StatCard } from '@/components/kit'
import { MiniBars, MiniDonut } from '@/components/mini-chart'

interface RealtimeRes {
  counts: Record<string, number>
  artists: Array<{ artistId: number; status: string }>
}

export default function MStatsAttendancePage(): React.JSX.Element {
  const [rt, setRt] = useState<RealtimeRes | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    void Promise.all([
      req<RealtimeRes>('GET', '/attendance/realtime'),
      req<{ total: number }>('GET', '/artists?pageSize=1'),
    ])
      .then(([r, a]) => { setRt(r); setTotal(a.total) })
      .catch((e) => toastError(e, '出勤数据加载失败'))
  }, [])

  const counts = rt?.counts ?? {}
  const checked = (counts.CHECKED_IN ?? 0) + (counts.ON_STAGE ?? 0) + (counts.CROSS ?? 0)
  const rate = total > 0 ? Math.round((checked / total) * 100) : 0
  const STATUS_LABEL: Record<string, string> = { ON_STAGE: '上钟中', CHECKED_IN: '已签到', CROSS: '串台', IDLE: '空闲' }

  return (
    <div className="space-y-3">
      <PageHeader title="出勤仪表" desc="实时在册与签到态势(明细请用 web 端报备汇总)" />
      <Card className="p-4 flex items-center justify-around gap-2">
        <MiniDonut percent={rate} label="出勤率" sub={'在册 ' + String(total) + ' 人'} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="已签到" value={String(counts.CHECKED_IN ?? 0)} />
          <StatCard label="上钟中" value={String(counts.ON_STAGE ?? 0)} tone="primary" />
          <StatCard label="串台" value={String(counts.CROSS ?? 0)} />
          <StatCard label="空闲" value={String(counts.IDLE ?? 0)} />
        </div>
      </Card>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">实时分布</div>
        <MiniBars
          items={Object.entries(STATUS_LABEL).map(([k, label]) => ({ label, value: counts[k] ?? 0 }))}
          unit=" 人"
          color="#00d4ff"
        />
      </Card>
    </div>
  )
}
