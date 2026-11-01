/**
 * A16 报备明细 / A17 报备汇总矩阵 / A18 补打卡(同一组件三视图)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { REPORT_TYPES } from '@yyc3/leisure-core'
import { client, toastError } from '@/lib/api'
import { fmtTime, today } from '@/lib/format'
import { DataTable, Field, PageHeader, SelectBox, type Column } from '@/components/kit'

interface ReportRow {
  id: number
  businessDate: string
  stageName?: string | null
  badgeNo?: string | null
  groupId: number | null
  supervisorName: string | null
  type: string
  reportTime: string
  checkoutTime: string | null
  checkinGeoOk: boolean
  checkinLat: string | null
  checkinLng: string | null
  source: number
  remark: string | null
}
interface SummaryRow {
  groupId: number
  groupName: string
  supervisorName: string
  peiban: number
  checkin: number
  sishi: number
  zaotui: number
  chidao: number
  lijia: number
  qita: number
  weibao: number
  checkedOut: number
  total: number
}

const TYPE_LABEL: Record<string, string> = Object.fromEntries(REPORT_TYPES.map((t) => [t.code, t.label]))

export default function AttendancePage({ view }: { view: 'reports' | 'summary' | 'manual' }) {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState<unknown[]>()
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [keyword, setKeyword] = useState('')
  // A18 表单
  const [form, setForm] = useState<{ artistId: string; type: string; reason: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      if (view === 'summary') {
        const res = await client.attendance.summary({ businessDate: date })
        setRows(res.rows)
      } else {
        const res = await client.attendance.reports({
          businessDate: date,
          type: type === '' ? undefined : (type as never),
          keyword: keyword === '' ? undefined : keyword,
        })
        setRows(res.rows)
      }
    } catch (e) {
      toastError(e, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [view, date, type, keyword])

  useEffect(() => {
    void load()
  }, [load])

  async function submitManual(): Promise<void> {
    if (form === null || form.artistId === '' || form.reason.trim() === '') {
      toast.error('艺人与补卡原因必填')
      return
    }
    setBusy(true)
    try {
      await client.attendance.manual({
        artistId: Number(form.artistId),
        type: form.type as never,
        businessDate: date,
        reason: form.reason,
      })
      toast.success('补打卡已记录(审计留痕)')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  /* ── A17 汇总矩阵 ── */
  if (view === 'summary') {
    const cols: Array<keyof SummaryRow> = ['peiban', 'checkin', 'sishi', 'zaotui', 'chidao', 'lijia', 'qita', 'weibao', 'checkedOut', 'total']
    const colLabels: Record<string, string> = {
      peiban: '陪宴', checkin: '签到', sishi: '私事', zaotui: '早退', chidao: '迟到',
      lijia: '例假', qita: '其他', weibao: '未报备', checkedOut: '签退', total: '汇总',
    }
    return (
      <div>
        <PageHeader title="报备汇总" desc="组别×主管矩阵(10 列);口径:按营业日" />
        <Card className="p-4 mb-4 flex items-center gap-3">
          <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        </Card>
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#8b9bb4] border-b border-[rgba(0,212,255,0.12)]">
                <th className="text-left px-4 py-2">组别</th>
                <th className="text-left px-4 py-2">主管</th>
                {cols.map((c) => (
                  <th key={String(c)} className="text-right px-4 py-2">
                    {colLabels[String(c)]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows as SummaryRow[] | undefined ?? []).map((r, i) => (
                <tr key={i} className="border-b border-[rgba(0,212,255,0.06)]">
                  <td className="px-4 py-2 text-[#e0f0ff]">{r.groupName}</td>
                  <td className="px-4 py-2 text-[#a8b8cc]">{r.supervisorName || '—'}</td>
                  {cols.map((c) => (
                    <td key={String(c)} className={'px-4 py-2 text-right ' + (c === 'total' ? 'text-[#00d4ff] font-medium' : 'text-[#e0f0ff]')}>
                      {String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
              {(rows as SummaryRow[] | undefined ?? []).length === 0 && !loading && (
                <tr>
                  <td colSpan={12} className="text-center text-[#8b9bb4] py-10">
                    该营业日暂无报备数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    )
  }

  /* ── A16 明细 / A18 补打卡 ── */
  const columns: Array<Column<ReportRow>> = [
    { key: 'artist', header: '艺人', render: (r) => (r.stageName ?? '—') },
    { key: 'badge', header: '腰牌号', render: (r) => r.badgeNo ?? '—' },
    { key: 'type', header: '报备类型', render: (r) => TYPE_LABEL[r.type] ?? r.type },
    { key: 'reportTime', header: '报备时间', render: (r) => fmtTime(r.reportTime) },
    { key: 'checkoutTime', header: '签退时间', render: (r) => fmtTime(r.checkoutTime) },
    {
      key: 'geo',
      header: '定位',
      render: (r) =>
        !r.checkinGeoOk ? (
          <span className="text-[#ffaa00] text-xs">定位不可用</span>
        ) : r.checkinLat !== null ? (
          <span className="text-xs text-[#8b9bb4]">
            {Number(r.checkinLat).toFixed(4)}, {Number(r.checkinLng).toFixed(4)}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'source', header: '来源', render: (r) => (r.source === 1 ? '补打卡' : '自助') },
    { key: 'remark', header: '备注', render: (r) => r.remark ?? '—' },
  ]

  return (
    <div>
      <PageHeader
        title={view === 'reports' ? '报备明细' : '补打卡'}
        desc={view === 'reports' ? '逐笔原始报备记录;定位仅存签到/签退点位' : '漏签/漏打卡补录;source=补打卡,操作留审计'}
        actions={
          view === 'manual' && (
            <Button onClick={() => setForm({ artistId: '', type: 'CHECKIN', reason: '' })}>+ 补打卡</Button>
          )
        }
      />
      <Card className="p-4 mb-4 flex items-center gap-3 flex-wrap">
        <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        {view === 'reports' && (
          <>
            <SelectBox
              className="w-36"
              value={type}
              onChange={(v) => setType(v)}
              options={[{ value: '', label: '全部状态' }, ...REPORT_TYPES.map((t) => ({ value: t.code, label: t.label }))]}
            />
            <Input className="w-44" placeholder="艺名" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </>
        )}
        {view === 'manual' && <p className="text-xs text-[#8b9bb4]">下方列表含全部报备记录(source 列区分补打卡)</p>}
      </Card>
      <DataTable columns={columns} rows={rows as ReportRow[] | undefined} loading={loading} emptyText="该营业日暂无报备" />

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>补打卡({date})</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="flex flex-col gap-3">
              <Field label="艺人 ID(阶段6 接选择器)" required>
                <Input type="number" value={form.artistId} onChange={(e) => setForm({ ...form, artistId: e.target.value })} placeholder="艺人 ID" />
              </Field>
              <Field label="报备类型" required>
                <SelectBox value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={REPORT_TYPES.map((t) => ({ value: t.code, label: t.label }))} />
              </Field>
              <Field label="补卡原因(必填,审计留痕)" required>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="如:设备故障漏签" />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button disabled={busy} onClick={() => void submitManual()}>
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
