/**
 * 交接班对账(/handover;008 #3):当班金额四合计快照(充值/扣费/结算/点单)+未结订单 → 接班确认
 * 生成冻结金额(不随后续流水变化);确认后归档
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, DataTable, Field, PageHeader, StatusBadge, type Column } from '@/components/kit'

interface HandoverRow {
  id: number
  businessDate: string
  shiftName: string
  rechargeTotal: number
  deductTotal: number
  settleTotal: number
  orderTotal: number
  openOrders: number
  status: string
  takenBy: number | null
  confirmedAt: string | null
  remark: string | null
}

interface FormState {
  shiftName: string
  businessDate: string
  remark: string
}

export default function HandoverPage(): React.JSX.Element {
  const [rows, setRows] = useState<HandoverRow[]>()
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: HandoverRow[] }>('GET', '/handover')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '交接班加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function create(): Promise<void> {
    if (form === null || form.shiftName.trim() === '') {
      toast.error('班次名称必填')
      return
    }
    setBusy(true)
    try {
      await req('POST', '/handover', {
        shiftName: form.shiftName.trim(),
        ...(form.businessDate !== '' ? { businessDate: form.businessDate } : {}),
        remark: form.remark === '' ? undefined : form.remark,
      })
      toast.success('交接班快照已生成')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  async function confirm(id: number): Promise<void> {
    try {
      await req('POST', '/handover/' + String(id) + '/confirm')
      toast.success('已确认交接')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  const columns: Array<Column<HandoverRow>> = [
    { key: 'businessDate', header: '营业日' },
    { key: 'shiftName', header: '班次' },
    { key: 'rechargeTotal', header: '充值', render: (r) => '¥' + String(r.rechargeTotal) },
    { key: 'deductTotal', header: '扣费', render: (r) => '¥' + String(r.deductTotal) },
    { key: 'settleTotal', header: '关房结算', render: (r) => '¥' + String(r.settleTotal) },
    { key: 'orderTotal', header: '点单', render: (r) => '¥' + String(r.orderTotal) },
    { key: 'openOrders', header: '未结订单', render: (r) => String(r.openOrders) },
    { key: 'status', header: '状态', render: (r) => <StatusBadge label={r.status} color={r.status === 'CONFIRMED' ? '#00ff88' : '#ffaa00'} /> },
    {
      key: 'act',
      header: '操作',
      render: (r) =>
        r.status === 'OPEN' ? (
          <ConfirmButton
            confirmTitle="确认交接"
            confirmDesc="确认后本班次快照冻结归档,金额以快照为准。"
            onConfirm={() => { void confirm(r.id) }}
          >
            接班确认
          </ConfirmButton>
        ) : (
          <span className="text-xs text-fg-muted">已确认</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="交接班对账"
        desc="当班金额四合计快照(充值/扣费/关房结算/点单)+未结订单数;生成时冻结,接班确认后归档;支持跨日班次归属与导出打印(008 #3)"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setForm({ shiftName: '', businessDate: '', remark: '' })}>+ 生成交接班单</Button>
            <Button variant="outline" onClick={() => { window.open('/api/v1/handover/export?format=csv', '_blank') }}>导出 CSV</Button>
          </div>
        }
      />
      <DataTable columns={columns} rows={rows} loading={rows === undefined} total={rows?.length ?? 0} page={1} pageSize={100} />

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>生成交接班单</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <Field label="班次名称" required>
                <Input value={form.shiftName} onChange={(e) => setForm({ ...form, shiftName: e.target.value })} placeholder="如:晚班 A 组" />
              </Field>
              <Field label="归属营业日(跨日班次可选;空=当日口径)">
                <Input type="date" value={form.businessDate} onChange={(e) => setForm({ ...form, businessDate: e.target.value })} />
              </Field>
              <Field label="备注">
                <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
              </Field>
              <p className="text-xs text-fg-muted">
                生成时冻结归属营业日四项金额合计与未结订单数;后续流水不影响本单。跨零点晚班请显式选归属营业日。
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void create() }}>生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
