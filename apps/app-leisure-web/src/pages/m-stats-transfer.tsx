/**
 * 转销售统计(/m/stats/transfer):资源线转销售申请态势(申请/通过/驳回+最近 5 条)——图表化零明细
 * 数据源:/artists/transfer-stats(approval bizType=RESOURCE_TO_SELL 聚合)
 */
import { useEffect, useState } from 'react'
import { Card } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { PageHeader, StatCard, StatusBadge } from '@/components/kit'
import { MiniBars } from '@/components/mini-chart'

interface Stats {
  counts: { PENDING: number; APPROVED: number; REJECTED: number }
  recent: Array<{ id: number; name: string; badgeNo: string; status: string; at: string }>
}

const STATUS_COLOR: Record<string, string> = { PENDING: '#ffaa00', APPROVED: '#00ff88', REJECTED: '#ff5555' }
const STATUS_LABEL: Record<string, string> = { PENDING: '待审批', APPROVED: '已转线', REJECTED: '已驳回' }

export default function MStatsTransferPage(): React.JSX.Element {
  const [s, setS] = useState<Stats | null>(null)

  useEffect(() => {
    void req<Stats>('GET', '/artists/transfer-stats')
      .then((res) => setS(res))
      .catch((e) => toastError(e, '转销售统计加载失败'))
  }, [])

  const c = s?.counts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  const total = c.PENDING + c.APPROVED + c.REJECTED
  const passRate = total > 0 ? Math.round((c.APPROVED / total) * 100) : 0

  return (
    <div className="space-y-3">
      <PageHeader title="转销售统计" desc="资源经理转入销售申请态势(明细请用 web 端审批)" />
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="待审批" value={String(c.PENDING)} />
        <StatCard label="已转线" value={String(c.APPROVED)} tone="primary" />
        <StatCard label="已驳回" value={String(c.REJECTED)} />
      </div>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">状态分布</div>
        <MiniBars
          items={[
            { label: '待审批', value: c.PENDING },
            { label: '已转线', value: c.APPROVED },
            { label: '已驳回', value: c.REJECTED },
          ]}
          unit=" 单"
          color="#7b8cff"
        />
        <div className="text-[11px] text-fg-muted">通过率 {String(passRate)}%(共 {String(total)} 单)</div>
      </Card>
      <Card className="p-4 space-y-1.5">
        <div className="text-sm font-medium mb-1">最近申请</div>
        {(s?.recent ?? []).map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-xs py-1 border-b border-line/50 last:border-0">
            <span className="font-medium">{r.name}</span>
            <span className="text-fg-muted">{r.badgeNo}</span>
            <span className="ml-auto text-fg-muted">{r.at}</span>
            <StatusBadge label={STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? '#ffaa00'} />
          </div>
        ))}
        {(s?.recent ?? []).length === 0 && <div className="text-xs text-fg-muted py-3 text-center">暂无申请记录</div>}
      </Card>
    </div>
  )
}
