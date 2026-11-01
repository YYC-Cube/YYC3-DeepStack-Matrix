/**
 * A29 双轨对账(P0 试点):四指标导入即比对 + 差异矩阵 + 14 天门禁面板
 * 试点门禁:连续 14 个完整营业日全 MATCHED(见《双轨对账试点-操作手册》);
 * 自算指标由日切 job 自动快照(PENDING_LEGACY 待录对侧),也可手工触发
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, toastError } from '@/lib/api'
import { PageHeader, StatusBadge } from '@/components/kit'
import type { ReconHistory, ReconListResult } from '@yyc3/leisure-core'

const METRIC_LABEL: Record<string, string> = {
  openCount: '开房数',
  roomFee: '时间费',
  orderTotal: '点单额',
  checkedIn: '签到人数',
}
const OVERALL_TEXT: Record<string, string> = {
  NO_DATA: '无数据', PENDING_LEGACY: '待录对侧', MATCHED: '一致', EXPLAINED: '已解释', OPEN: '有差异',
}
const OVERALL_COLOR: Record<string, string> = {
  NO_DATA: '#555', PENDING_LEGACY: '#ffaa00', MATCHED: '#00ff88', EXPLAINED: '#00d4ff', OPEN: '#ff3366',
}

export default function ReconPage(): React.JSX.Element {
  const [bd, setBd] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<ReconListResult['rows']>([])
  const [overall, setOverall] = useState('NO_DATA')
  const [selfMetrics, setSelfMetrics] = useState<ReconListResult['selfMetrics'] | null>(null)
  const [legacyText, setLegacyText] = useState('')
  const [history, setHistory] = useState<ReconHistory | null>(null)

  const load = useCallback(async (date: string): Promise<void> => {
    try {
      const out = await client.recon.list(date)
      setRows(out.rows)
      setOverall(out.overall)
      setSelfMetrics(out.selfMetrics)
    } catch (e) { toastError(e, '查询失败') }
  }, [])

  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setHistory(await client.recon.history(14))
    } catch (e) { toastError(e, '门禁视图加载失败') }
  }, [])

  useEffect(() => { void load(bd) }, [bd, load])
  useEffect(() => { void loadHistory() }, [loadHistory])

  const importLegacy = async (): Promise<void> => {
    let metrics: Record<string, number>
    try {
      metrics = JSON.parse(legacyText) as Record<string, number>
    } catch {
      toast.error('JSON 格式错误')
      return
    }
    try {
      await client.recon.importLegacy({ businessDate: bd, metrics })
      toast.success('已导入并比对')
      await load(bd)
      await loadHistory()
    } catch (e) { toastError(e, '导入失败') }
  }

  const snapshot = async (): Promise<void> => {
    try {
      await client.recon.snapshot(bd)
      toast.success('已快照自算指标(待录对侧)')
      await load(bd)
      await loadHistory()
    } catch (e) { toastError(e, '快照失败') }
  }

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="双轨对账试点(P0 门禁工具)" desc="连续 14 个完整营业日全 MATCHED 才满足切换;自算指标日切自动快照,对侧日报人工录入即比对" />

      {/* 14 天门禁面板 */}
      {history !== null && (
        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">14 天门禁</span>
            <StatusBadge
              label={history.gatePassed ? '已达标' : '连续一致 ' + String(history.streak) + '/' + String(history.gateDays) + ' 天'}
              color={history.gatePassed ? '#00ff88' : '#ffaa00'}
            />
            <span className="text-xs text-[#8b9bb4]">当前营业日 {history.currentBusinessDate}(进行中不计)</span>
            <Button variant="outline" className="ml-auto" onClick={() => { void loadHistory() }}>刷新</Button>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
            {history.days.map((d) => (
              <div
                key={d.businessDate}
                className="rounded px-1 py-1.5 text-center cursor-pointer"
                style={{ background: (OVERALL_COLOR[d.overall] ?? '#555') + '22', border: '1px solid ' + (OVERALL_COLOR[d.overall] ?? '#555') + '66' }}
                title={d.businessDate + ' · ' + (OVERALL_TEXT[d.overall] ?? d.overall) + (d.total > 0 ? ' · ' + String(d.matched) + '/' + String(d.total) : '')}
                onClick={() => { setBd(d.businessDate) }}
              >
                <div className="text-[10px] text-[#8b9bb4]">{d.businessDate.slice(5)}</div>
                <div className="text-[10px]" style={{ color: OVERALL_COLOR[d.overall] ?? '#8b9bb4' }}>
                  {d.complete ? (OVERALL_TEXT[d.overall] ?? d.overall) : '进行中'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <Input className="w-40" value={bd} onChange={(e) => { setBd(e.target.value) }} />
        <Button variant="outline" onClick={() => { void load(bd) }}>查询</Button>
        <Button variant="outline" onClick={() => { void snapshot() }}>快照自算指标</Button>
        <StatusBadge label={OVERALL_TEXT[overall] ?? overall} color={OVERALL_COLOR[overall] ?? '#8b9bb4'} />
        {selfMetrics !== null && (
          <span className="text-xs text-[#8b9bb4]">
            自算:开房 {String(selfMetrics.openCount)} · 时间费 {String(selfMetrics.roomFee)} · 点单 {String(selfMetrics.orderTotal)} · 签到 {String(selfMetrics.checkedIn)}
          </span>
        )}
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
          const pending = r.status === 'PENDING_LEGACY'
          const matched = r.status === 'MATCHED'
          return (
            <Card key={r.metric} className="p-3 flex items-center gap-3 text-sm">
              <div className="w-24 font-medium">{METRIC_LABEL[r.metric] ?? r.metric}</div>
              <div>本系统 {r.selfValue}</div>
              <div className={pending ? 'text-[#ffaa00]' : matched ? 'text-[#00ff88]' : 'text-[#ff6666]'}>
                {pending ? '对侧待录' : '对侧 ' + String(r.legacyValue)}
              </div>
              <div className={matched || pending ? '' : 'text-[#ff6666] font-semibold'}>
                {pending ? '—' : matched ? '✓ MATCHED' : r.status === 'EXPLAINED' ? '已解释 ' + String(r.diff) : '差异 ' + String(r.diff)}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
