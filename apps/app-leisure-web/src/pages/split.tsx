/**
 * 财务分账(/split;17 号闭环规划 S1 前端):方案(激活/归档/计提)+计提流水(手动奖惩/冲正)+结算单(支付)
 * 与 008/17 号规划对齐:类目=上钟业绩起步;全部 setting:manage;Entry 只增(冲正=反向条目)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, DataTable, Field, PageHeader, SelectBox, type Column } from '@/components/kit'

interface PlanRow {
  id: number
  name: string
  category: string
  periodType: string
  status: string
  entryCount: number
  rules: Array<{ id: number; calcType: string; percent: number | null; fixedAmount: number | null; payMethod: string; rewardType: string }>
}
interface EntryRow {
  id: number
  planId: number
  businessDate: string
  targetScope: string
  targetId: number
  targetName: string
  baseAmount: number
  amount: number
  status: string
  payMethod: string | null
  remark: string | null
}

export default function SplitPage(): React.JSX.Element {
  const [plans, setPlans] = useState<PlanRow[]>()
  const [entries, setEntries] = useState<EntryRow[]>()
  const [form, setForm] = useState<{ name: string; category: string; percent: string } | null>(null)
  const [manual, setManual] = useState<{ targetScope: string; targetId: string; targetName: string; baseAmount: string; amount: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const [plansRes, entriesRes] = await Promise.all([
        req<{ rows: PlanRow[] }>('GET', '/split/plans'),
        req<{ rows: EntryRow[] }>('GET', '/split/entries'),
      ])
      setPlans(plansRes.rows)
      setEntries(entriesRes.rows)
    } catch (e) {
      toastError(e, '分账加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function savePlan(): Promise<void> {
    if (form === null || form.name.trim() === '') {
      toast.error('方案名称必填')
      return
    }
    setBusy(true)
    try {
      await req('POST', '/split/plans', {
        name: form.name.trim(),
        category: form.category,
        rules: [{ calcType: 'PERCENT', percent: Number(form.percent) || 0, payMethod: 'CASH', rewardType: 'REWARD' }],
      })
      toast.success('方案已创建(DRAFT,激活后可计提)')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const accrue = async (planId: number): Promise<void> => {
    setBusy(true)
    try {
      const out = await req<{ created: number; totalAmount: number }>(
        'POST',
        '/split/plans/' + String(planId) + '/accrue',
        { businessDate: new Date().toISOString().slice(0, 10) },
      )
      toast.success('计提完成:' + String(out.created) + ' 条,合计 ¥' + String(out.totalAmount))
      await load()
    } catch (e) {
      toastError(e, '计提失败')
    } finally {
      setBusy(false)
    }
  }

  const entryColumns: Array<Column<EntryRow>> = [
    { key: 'businessDate', header: '营业日' },
    { key: 'targetName', header: '分账对象' },
    { key: 'baseAmount', header: '基数', render: (r) => '¥' + String(r.baseAmount) },
    { key: 'amount', header: '计提额', render: (r) => <span className={r.amount < 0 ? 'text-error' : 'text-success'}>¥{String(r.amount)}</span> },
    { key: 'status', header: '状态', render: (r) => r.status },
    {
      key: 'act',
      header: '操作',
      render: (r) =>
        r.status === 'ACCRUED' && r.targetScope === 'ARTIST' ? (
          <ConfirmButton
            confirmTitle="冲正计提"
            confirmDesc="冲正将生成一条反向条目(只增纪律)。"
            onConfirm={() => {
              void req('POST', '/split/entries/' + String(r.id) + '/reverse', { remark: '管理端冲正' })
                .then(() => { toast.success('已冲正'); return load() })
                .catch((e) => toastError(e))
            }}
          >
            冲正
          </ConfirmButton>
        ) : (
          <span className="text-xs text-fg-muted">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="财务分账"
        desc="17 号闭环规划 S1:方案(类目×周期×规则)→ 计提(只增,基数快照)→ 结算单(复核→支付);冲正=反向条目"
        actions={
          <Button onClick={() => setForm({ name: '', category: 'SESSION', percent: '20' })}>+ 新建方案(上钟业绩·比例)</Button>
        }
      />

      {/* 方案 */}
      <Card className="p-4">
        <div className="text-sm font-medium mb-2">分账方案</div>
        <div className="flex flex-wrap gap-2">
          {(plans ?? []).map((p) => (
            <div key={p.id} className="rounded border border-line p-3 space-y-1 min-w-[240px]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-[10px] px-1 rounded border border-line">{p.status}</span>
              </div>
              <div className="text-xs text-fg-muted">
                类目 {p.category} · {String(p.rules.length)} 规则 · {String(p.entryCount)} 计提
                {p.rules[0]?.percent !== null && p.rules[0]?.percent !== undefined ? ` · ${String(p.rules[0].percent)}%` : ''}
              </div>
              <div className="flex gap-1.5 pt-1">
                {p.status === 'DRAFT' && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { void accrue(p.id).then(() => { void req('POST', '/split/plans/' + String(p.id) + '/activate', {}).then(() => load()) }).catch((e) => toastError(e)) }}>
                    计提并激活
                  </Button>
                )}
                {p.status === 'ACTIVE' && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { void accrue(p.id) }}>
                    按今日计提
                  </Button>
                )}
                {p.status === 'ACTIVE' && (
                  <Button size="sm" variant="ghost" onClick={() => { void req('POST', '/split/plans/' + String(p.id) + '/archive', {}).then(() => load()).catch((e) => toastError(e)) }}>
                    归档
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 手动奖惩 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">手动奖惩</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setManual({ targetScope: 'ARTIST', targetId: '', targetName: '', baseAmount: '', amount: '' })}>
            + 手动计提
          </Button>
        </div>
        {manual !== null && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <Field label="对象类型">
              <SelectBox
                value={manual.targetScope}
                onChange={(v) => setManual({ ...manual, targetScope: v })}
                options={[{ value: 'ARTIST', label: '销售经理' }, { value: 'ADMIN', label: '岗位' }]}
              />
            </Field>
            <Field label="对象 ID">
              <Input inputMode="numeric" value={manual.targetId} onChange={(e) => setManual({ ...manual, targetId: e.target.value })} />
            </Field>
            <Field label="对象名称">
              <Input value={manual.targetName} onChange={(e) => setManual({ ...manual, targetName: e.target.value })} />
            </Field>
            <Field label="基数">
              <Input inputMode="decimal" value={manual.baseAmount} onChange={(e) => setManual({ ...manual, baseAmount: e.target.value })} />
            </Field>
            <Field label="计提额(负=罚扣)">
              <Input inputMode="decimal" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button
                disabled={busy}
                onClick={() => {
                  void req('POST', '/split/entries', {
                    planId: (plans ?? []).find((p) => p.status === 'ACTIVE')?.id ?? 0,
                    targetScope: manual.targetScope,
                    targetId: Number(manual.targetId),
                    targetName: manual.targetName,
                    baseAmount: Number(manual.baseAmount),
                    amount: Number(manual.amount),
                  })
                    .then(() => { toast.success('已计提'); setManual(null); return load() })
                    .catch((e) => toastError(e))
                }}
              >
                计提
              </Button>
              <Button variant="ghost" onClick={() => setManual(null)}>取消</Button>
            </div>
          </div>
        )}
      </Card>

      {/* 计提流水 */}
      <Card className="p-4">
        <DataTable columns={entryColumns} rows={entries} loading={entries === undefined} total={entries?.length ?? 0} page={1} pageSize={200} />
      </Card>
    </div>
  )
}
