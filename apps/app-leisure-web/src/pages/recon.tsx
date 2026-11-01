/**
 * A29 双轨对账(P0 试点):四指标导入即比对 + 差异矩阵
 * 试点门禁:连续 14 天全 MATCHED(见《双轨对账试点-操作手册》)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { PageHeader } from '@/components/kit'

interface ReconRow {
  metric: string
  selfValue: number
  legacyValue: number
  diff: number
  status: string
}
interface ReconResponse {
  rows: ReconRow[]
  overall: string
  selfMetrics: Record<string, number>
}

const METRIC_LABEL: Record<string, string> = {
  openCount: '开房数',
  roomFee: '时间费',
  orderTotal: '点单额',
  checkedIn: '签到人数',
}

export default function ReconPage(): React.JSX.Element {
  const [bd, setBd] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<ReconRow[]>([])
  const [overall, setOverall] = useState('NO_DATA')
  const [legacyText, setLegacyText] = useState('')

  const load = useCallback(async (date: string): Promise<void> => {
    try {
      const out = await req<ReconResponse>('GET', '/reports/recon?businessDate=' + date)
      setRows(out.rows)
      setOverall(out.overall)
    } catch (e) { toastError(e, '查询失败') }
  }, [])

  useEffect(() => { void load(bd) }, [bd, load])

  const importLegacy = async (): Promise<void> => {
    let metrics: Record<string, number>
    try {
      metrics = JSON.parse(legacyText) as Record<string, number>
    } catch {
      toast.error('JSON 格式错误')
      return
    }
    try {
      await req('POST', '/reports/recon/legacy', { businessDate: bd, metrics })
      toast.success('已导入并比对')
      await load(bd)
    } catch (e) { toastError(e, '导入失败') }
  }

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="双轨对账试点(P0 门禁工具)" desc="连续 14 天全 MATCHED 才满足切换;差异行红显并写台账" />
      <div className="flex gap-2 items-center">
        <Input className="w-40" value={bd} onChange={(e) => { setBd(e.target.value) }} />
        <Button variant="outline" onClick={() => { void load(bd) }}>查询</Button>
        <span className="text-sm opacity-70">总体:{overall}</span>
      </div>
      <Card className="p-3 space-y-2">
        <div className="text-sm font-medium">导入对侧(智慧商家)日报 JSON</div>
        <textarea
          className="w-full h-24 border rounded p-2 text-sm bg-transparent"
          placeholder='{"openCount":12,"roomFee":3000,"orderTotal":1500,"checkedIn":9}'
          value={legacyText}
          onChange={(e) => { setLegacyText(e.target.value) }}
        />
        <Button onClick={() => { void importLegacy() }}>导入并比对</Button>
      </Card>
      <div className="grid gap-2">
        {rows.map((r) => {
          const matched = Math.abs(r.diff) < 0.01
          return (
            <Card key={r.metric} className="p-3 flex items-center gap-3 text-sm">
              <div className="w-24 font-medium">{METRIC_LABEL[r.metric] ?? r.metric}</div>
              <div>本系统 {r.selfValue}</div>
              <div className={matched ? 'text-[#00ff88]' : 'text-[#ff6666]'}>对侧 {r.legacyValue}</div>
              <div className={matched ? '' : 'text-[#ff6666] font-semibold'}>
                {matched ? '✓ MATCHED' : '差异 ' + String(r.diff)}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
