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
  { key: 'feesum', path: '/reports/stage-fee/summary', title: '台费流水汇总', perm: 'fee:ledger:view', roomDims: true, desc: '按销售经理充扣冲净额 · 涉及包厢(§8.3)' },
  { key: 'adetail', path: '/reports/attendance/detail', title: '报备明细', perm: 'attend:ledger:view', roomDims: false, desc: '逐笔原始报备' },
  { key: 'asum', path: '/reports/attendance/summary', title: '报备汇总', perm: 'attend:summary:view', roomDims: false, desc: '组别×主管矩阵(单营业日)' },
  { key: 'sdetail', path: '/reports/session/detail', title: '上下钟明细', perm: 'session:view', roomDims: true, desc: '房号/类型/计费小时/单价(§8.3)' },
  { key: 'ssum', path: '/reports/session/summary', title: '上下钟汇总', perm: 'session:view', roomDims: true, desc: '按销售经理次数/时长/台费 · 涉及包厢(§8.3)' },
  { key: 'rotation', path: '/reports/dispatch-rotation', title: '主管轮台报表', perm: 'session:view', roomDims: false, desc: '主管/组别/销售经理被派次数 · 按序/越序(销售经理设置⑧ 公平性考核)' },
  { key: 'ticket-purchase', path: '/reports/tickets/purchase', title: '台票购买明细', perm: 'ticket:ledger:view', roomDims: false, desc: '票种/数量/金额/收费通道(§8.2 补齐)' },
  { key: 'ticket-use', path: '/reports/tickets/use', title: '台票使用明细', perm: 'ticket:ledger:view', roomDims: false, desc: '票种/数量/关联场次(§8.2 补齐)' },
  { key: 'split-entries', path: '/split/report/entries', title: '分账计提明细', perm: 'setting:manage', roomDims: false, desc: '分账对象/方案/类目/金额/状态(17 号 S2)' },
  { key: 'split-settlements', path: '/split/report/settlements', title: '分账结算汇总', perm: 'setting:manage', roomDims: false, desc: '结算单/对象/周期/支付方式/状态(17 号 S2)' },
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

  /** 报表下载:blob + a[download](带 Authorization;xlsx 真格式/CSV 双通道) */
  const download = useCallback(async (r: ReportDef, fmt: 'csv' | 'xlsx'): Promise<void> => {
    setBusy(r.key + '-dl')
    try {
      const isDaily = r.key === 'asum'
      const q = new URLSearchParams(
        isDaily
          ? { businessDate: summaryDay, format: fmt }
          : { businessDateFrom: from, businessDateTo: to, format: fmt },
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
      a.download = r.key + '.' + fmt
      a.click()
      URL.revokeObjectURL(url)
      toast.success(r.title + ' 已导出(' + fmt.toUpperCase() + ')')
    } catch {
      toast.error('导出失败')
    } finally {
      setBusy('')
    }
  }, [from, to, summaryDay])

  return (
    <div>
      <PageHeader
        title="报表中心"
        desc="12 张(§8.2/§8.3 全量:台费 4+报备 2+上下钟 2+轮台 1+台票 2+分账 2);导出 xlsx 真格式 + CSV 双通道,Excel 直开"
      />
      <Card className="p-4 mb-4 flex flex-row flex-wrap items-center gap-3">
        <span className="text-xs text-fg-muted w-16">区间</span>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-fg-muted">至</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <span className="text-xs text-fg-muted w-16 ml-4">汇总日</span>
        <Input type="date" className="w-40" value={summaryDay} onChange={(e) => setSummaryDay(e.target.value)} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {REPORTS.filter((r) => permCodes.includes(r.perm) || permCodes.includes('report:export')).map((r) => (
          <Card key={r.key} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-[var(--lm-fg)]">{r.title}</p>
              {r.roomDims && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-success/20 text-success">包厢维度</span>
              )}
            </div>
            <p className="text-xs text-fg-muted mb-3">{r.desc}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy !== ''} onClick={() => void openPreview(r)}>
                {busy === r.key ? '查询中…' : '预览'}
              </Button>
              <Button size="sm" className="bg-primary text-[#06122a] font-medium" disabled={busy !== ''} onClick={() => void download(r, 'xlsx')}>
                {busy === r.key + '-dl' ? '导出中…' : '导出 xlsx'}
              </Button>
              <Button variant="outline" size="sm" disabled={busy !== ''} onClick={() => void download(r, 'csv')}>
                CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {preview !== null && (
        <Card className="p-4 mt-4 overflow-x-auto">
          <p className="text-sm text-primary mb-2">{preview.title} · 前 {String(preview.rows.length - 1)} 行</p>
          <table className="w-full text-xs">
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className={i === 0 ? 'text-fg-muted border-b border-line' : 'border-b border-primary/6'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 text-[var(--lm-fg)] whitespace-nowrap max-w-[240px] truncate">{cell}</td>
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
