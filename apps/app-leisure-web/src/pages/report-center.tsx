/**
 * A25 报表中心(阶段6):7 张 MVP 报表(10-后端 §七)+ CSV 导出
 * 4 张含包厢房号/类型维度(需求全集 §8.3);导出走 report:export(CSV+UTF-8 BOM,Excel 直开)
 */
import { useCallback, useState } from 'react'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { PageHeader } from '@/components/kit'

interface ReportDef {
  key: string
  path: string
  title: string
  perm: string
  roomDims: boolean
  desc: string
}

const REPORTS: ReportDef[] = [
  { key: 'deduct', path: '/reports/stage-fee/deduct-detail', title: '台费扣款明细', perm: 'fee:ledger:view', roomDims: true, desc: '单条扣费记录 · 含包厢房号/类型(§8.3)' },
  { key: 'recharge', path: '/reports/stage-fee/recharge', title: '台费充值', perm: 'fee:ledger:view', roomDims: false, desc: '充值台账 · 渠道/时间' },
  { key: 'feesum', path: '/reports/stage-fee/summary', title: '台费流水汇总', perm: 'fee:ledger:view', roomDims: true, desc: '按艺人充扣冲净额 · 涉及包厢(§8.3)' },
  { key: 'adetail', path: '/reports/attendance/detail', title: '报备明细', perm: 'attend:ledger:view', roomDims: false, desc: '逐笔原始报备' },
  { key: 'asum', path: '/reports/attendance/summary', title: '报备汇总', perm: 'attend:summary:view', roomDims: false, desc: '组别×主管矩阵(单营业日)' },
  { key: 'sdetail', path: '/reports/session/detail', title: '上下钟明细', perm: 'session:view', roomDims: true, desc: '房号/类型/计费小时/单价(§8.3)' },
  { key: 'ssum', path: '/reports/session/summary', title: '上下钟汇总', perm: 'session:view', roomDims: true, desc: '按艺人次数/时长/台费 · 涉及包厢(§8.3)' },
]

interface Preview {
  title: string
  rows: string[][]
}

export default function ReportCenterPage() {
  const permCodes = useAuthStore((s) => s.permCodes)
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [summaryDay, setSummaryDay] = useState(today())
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState('')

  /** JSON 预览:取前 5 行全部列 */
  const openPreview = useCallback(async (r: ReportDef): Promise<void> => {
    setBusy(r.key)
    try {
      const isDaily = r.key === 'asum'
      const q = new URLSearchParams(
        isDaily
          ? { businessDate: summaryDay }
          : { businessDateFrom: from, businessDateTo: to },
      )
      const data = await req<unknown>('GET', r.path + '?' + q.toString())
      const rows = flatten(data)
      setPreview({ title: r.title, rows: rows.slice(0, 6) })
    } catch (e) {
      toastError(e, '报表查询失败')
    } finally {
      setBusy('')
    }
  }, [from, to, summaryDay])

  /** CSV 下载:blob + a[download](带 Authorization) */
  const download = useCallback(async (r: ReportDef): Promise<void> => {
    setBusy(r.key + '-dl')
    try {
      const isDaily = r.key === 'asum'
      const q = new URLSearchParams(
        isDaily
          ? { businessDate: summaryDay, format: 'csv' }
          : { businessDateFrom: from, businessDateTo: to, format: 'csv' },
      )
      const token = useAuthStore.getState().token ?? ''
      const res = await fetch('/api/v1' + r.path + '?' + q.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) {
        toast.error('导出失败(HTTP ' + String(res.status) + ')')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = r.key + '.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success(r.title + ' 已导出(CSV,Excel 可直开)')
    } catch {
      toast.error('导出失败')
    } finally {
      setBusy('')
    }
  }, [from, to, summaryDay])

  return (
    <div>
      <PageHeader
        title="报表中心(7 张 MVP)"
        desc="4 张含包厢房号/类型维度(需求全集 §8.3);CSV 导出带 BOM,Excel 直开;xlsx 真格式 II 期"
      />
      <Card className="p-4 mb-4 flex flex-row flex-wrap items-center gap-3">
        <span className="text-xs text-[#8b9bb4] w-16">区间</span>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-[#8b9bb4]">至</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <span className="text-xs text-[#8b9bb4] w-16 ml-4">汇总日</span>
        <Input type="date" className="w-40" value={summaryDay} onChange={(e) => setSummaryDay(e.target.value)} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {REPORTS.filter((r) => permCodes.includes(r.perm) || permCodes.includes('report:export')).map((r) => (
          <Card key={r.key} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-[#e0f0ff]">{r.title}</p>
              {r.roomDims && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#00ff8833] text-[#00ff88]">包厢维度</span>
              )}
            </div>
            <p className="text-xs text-[#8b9bb4] mb-3">{r.desc}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy !== ''} onClick={() => void openPreview(r)}>
                {busy === r.key ? '查询中…' : '预览'}
              </Button>
              <Button variant="outline" size="sm" className="text-[#00d4ff]" disabled={busy !== ''} onClick={() => void download(r)}>
                {busy === r.key + '-dl' ? '导出中…' : '导出 CSV'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {preview !== null && (
        <Card className="p-4 mt-4 overflow-x-auto">
          <p className="text-sm text-[#00d4ff] mb-2">{preview.title} · 前 {String(preview.rows.length - 1)} 行</p>
          <table className="w-full text-xs">
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className={i === 0 ? 'text-[#8b9bb4] border-b border-[rgba(0,212,255,0.2)]' : 'border-b border-[rgba(0,212,255,0.06)]'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 text-[#e0f0ff] whitespace-nowrap max-w-[240px] truncate">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/** 任意报表 JSON → 二维字符串数组(首行=列头) */
function flatten(data: unknown): string[][] {
  if (data === null || data === undefined) return [['(空)']]
  if (Array.isArray(data)) {
    if (data.length === 0) return [['(空)']]
    const headers = Object.keys(data[0] as object)
    return [headers, ...data.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h] ?? '—')))]
  }
  const rec = data as Record<string, unknown>
  if (Array.isArray(rec.rows)) return flatten(rec.rows)
  return Object.entries(rec).map(([k, v]) => [k, String(v)])
}

function today(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
