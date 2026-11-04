/**
 * 财务分账(/split;17 号闭环规划 S1-S3):方案(预算对比/激活/归档/计提)+计提流水(手动奖惩/冲正)
 * +结算单(生成/导出 xlsx/支付)+待复核(双人)+三向对账
 * 与 008/17 号规划对齐:全部 setting:manage;Entry 只增(冲正=反向条目)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, DataTable, Field, PageHeader, SelectBox, StatusBadge, type Column } from '@/components/kit'

interface PlanRow {
  id: number
  name: string
  category: string
  periodType: string
  status: string
  budgetAmount: number | null
  actualAmount: number
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
interface SettlementRow {
  id: number
  targetScope: string
  targetName: string
  periodFrom: string
  periodTo: string
  amount: number
  entryCount: number
  payMethod: string
  status: string
  paidAt: string | null
}
interface PendingRow {
  id: number
  planId: number
  targetName: string
  baseAmount: number
  amount: number
  remark: string | null
  createdAt: string
}
interface BalanceInfo {
  byStatus: Record<string, number>
  entryNet: number
  settledSum: number
  paidSum?: number
  diff: number
  balanced: boolean
}

const money = (v: number): string => '¥' + String(Math.round(v * 100) / 100)

export default function SplitPage(): React.JSX.Element {
  const [plans, setPlans] = useState<PlanRow[]>()
  const [entries, setEntries] = useState<EntryRow[]>()
  const [settlements, setSettlements] = useState<SettlementRow[]>()
  const [pending, setPending] = useState<PendingRow[]>()
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [form, setForm] = useState<{ name: string; category: string; percent: string; budget: string } | null>(null)
  const [manual, setManual] = useState<{ targetScope: string; targetId: string; targetName: string; baseAmount: string; amount: string } | null>(null)
  const [settleForm, setSettleForm] = useState<{ targetScope: string; targetId: string; targetName: string; periodFrom: string; periodTo: string; payMethod: string } | null>(null)
  const [payForm, setPayForm] = useState<{ id: number; targetName: string; amount: number; payMethod: string; payRef: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const [plansRes, entriesRes, settlementsRes, balanceRes] = await Promise.all([
        req<{ rows: PlanRow[] }>('GET', '/split/plans'),
        req<{ rows: EntryRow[] }>('GET', '/split/entries'),
        req<{ rows: SettlementRow[] }>('GET', '/split/settlements'),
        req<BalanceInfo>('GET', '/split/balance'),
      ])
      setPlans(plansRes.rows)
      setEntries(entriesRes.rows)
      setSettlements(settlementsRes.rows)
      setBalance(balanceRes)
      void req<{ rows: PendingRow[] }>('GET', '/split/pending').then((r) => setPending(r.rows)).catch(() => undefined)
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
        ...(form.budget.trim() !== '' ? { budgetAmount: Number(form.budget) } : {}),
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

  async function createSettlement(): Promise<void> {
    if (settleForm === null || settleForm.targetName.trim() === '') {
      toast.error('结算对象名称必填')
      return
    }
    setBusy(true)
    try {
      const out = await req<{ id: number; amount: number; entryCount: number }>('POST', '/split/settlements', {
        targetScope: settleForm.targetScope,
        targetId: Number(settleForm.targetId),
        targetName: settleForm.targetName.trim(),
        periodFrom: settleForm.periodFrom,
        periodTo: settleForm.periodTo,
        payMethod: settleForm.payMethod,
      })
      toast.success('结算单 #' + String(out.id) + ' 已生成:' + String(out.entryCount) + ' 条,合计 ¥' + String(out.amount))
      setSettleForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  async function paySettlement(): Promise<void> {
    if (payForm === null) return
    setBusy(true)
    try {
      await req('POST', '/split/settlements/' + String(payForm.id) + '/pay', { payRef: payForm.payRef })
      toast.success('结算单 #' + String(payForm.id) + ' 已支付')
      setPayForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const decide = async (id: number, approve: boolean): Promise<void> => {
    try {
      await req('POST', '/split/entries/' + String(id) + '/decide', { approve })
      toast.success(approve ? '已复核通过' : '已驳回')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  const entryColumns: Array<Column<EntryRow>> = [
    { key: 'businessDate', header: '营业日' },
    { key: 'targetName', header: '分账对象' },
    { key: 'baseAmount', header: '基数', render: (r) => money(r.baseAmount) },
    { key: 'amount', header: '计提额', render: (r) => <span className={r.amount < 0 ? 'text-error' : 'text-success'}>{money(r.amount)}</span> },
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
        desc="17 号闭环规划:方案(类目×周期×规则×预算)→ 计提(只增,基数快照)→ 结算单(复核→支付→导出);冲正=反向条目;三向对账挂日切"
        actions={
          <Button onClick={() => setForm({ name: '', category: 'SESSION', percent: '20', budget: '' })}>+ 新建方案(上钟业绩·比例)</Button>
        }
      />

      {/* 三向对账(计提↔结算↔支付) */}
      {balance !== null && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">三向对账</span>
            <StatusBadge label={balance.balanced ? '平衡' : '差异 ' + String(balance.diff)} color={balance.balanced ? '#00ff88' : '#ff5555'} />
            <span className="text-xs text-fg-muted ml-auto">计提净额 {money(balance.entryNet)} · 已入结算 {money(balance.settledSum)} · 日切 job 自动校验(stats.splitCheck)</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
            {Object.entries(balance.byStatus ?? {}).map(([k, v]) => (
              <span key={k}>{k}:{money(Number(v))}</span>
            ))}
          </div>
        </Card>
      )}

      {/* 方案(含预算对比) */}
      <Card className="p-4">
        <div className="text-sm font-medium mb-2">分账方案</div>
        <div className="flex flex-wrap gap-2">
          {(plans ?? []).map((p) => {
            const pct = p.budgetAmount !== null && p.budgetAmount > 0 ? Math.round((p.actualAmount / p.budgetAmount) * 100) : null
            const over = pct !== null && pct > 100
            return (
              <div key={p.id} className="rounded border border-line p-3 space-y-1 min-w-[240px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-[10px] px-1 rounded border border-line">{p.status}</span>
                </div>
                <div className="text-xs text-fg-muted">
                  类目 {p.category} · {String(p.rules.length)} 规则 · {String(p.entryCount)} 计提 · 实际 {money(p.actualAmount)}
                  {p.rules[0]?.percent !== null && p.rules[0]?.percent !== undefined ? ` · ${String(p.rules[0].percent)}%` : ''}
                </div>
                {pct !== null && (
                  <div className="space-y-0.5">
                    <div className="h-1.5 rounded bg-fg-muted/20 overflow-hidden">
                      <div className={'h-full ' + (over ? 'bg-[#ff5555]' : 'bg-[#00cc88]')} style={{ width: String(Math.min(pct, 100)) + '%' }} />
                    </div>
                    <div className={'text-[10px] ' + (over ? 'text-error' : 'text-fg-muted')}>
                      预算 {money(p.budgetAmount ?? 0)} · 达成 {String(pct)}%{over ? '(超支)' : ''}
                    </div>
                  </div>
                )}
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
            )
          })}
        </div>
      </Card>

      {/* 待复核(≥阈值双人复核) */}
      {(pending ?? []).length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">待复核(手动条目 ≥阈值双人复核,复核人≠制单人)</div>
          <div className="space-y-1.5">
            {(pending ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs rounded border border-line px-2 py-1.5">
                <span className="font-medium">{r.targetName}</span>
                <span className={r.amount < 0 ? 'text-error' : 'text-success'}>{money(r.amount)}</span>
                <span className="text-fg-muted">基数 {money(r.baseAmount)} · {r.remark ?? ''}</span>
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => { void decide(r.id, true) }}>通过</Button>
                  <Button size="sm" variant="ghost" onClick={() => { void decide(r.id, false) }}>驳回</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      {/* 结算单(生成/导出/支付) */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">结算单(按人/期汇总 ACCRUED → 复核 → 支付 → 导出)</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => {
            const today = new Date().toISOString().slice(0, 10)
            const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
            setSettleForm({ targetScope: 'ARTIST', targetId: '', targetName: '', periodFrom: monthAgo, periodTo: today, payMethod: 'CASH' })
          }}>
            + 生成结算单
          </Button>
        </div>
        {settleForm !== null && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end mb-3">
            <Field label="对象类型">
              <SelectBox
                value={settleForm.targetScope}
                onChange={(v) => setSettleForm({ ...settleForm, targetScope: v })}
                options={[{ value: 'ARTIST', label: '销售经理' }, { value: 'ADMIN', label: '岗位' }]}
              />
            </Field>
            <Field label="对象 ID">
              <Input inputMode="numeric" value={settleForm.targetId} onChange={(e) => setSettleForm({ ...settleForm, targetId: e.target.value })} />
            </Field>
            <Field label="对象名称">
              <Input value={settleForm.targetName} onChange={(e) => setSettleForm({ ...settleForm, targetName: e.target.value })} />
            </Field>
            <Field label="周期起">
              <Input type="date" value={settleForm.periodFrom} onChange={(e) => setSettleForm({ ...settleForm, periodFrom: e.target.value })} />
            </Field>
            <Field label="周期止">
              <Input type="date" value={settleForm.periodTo} onChange={(e) => setSettleForm({ ...settleForm, periodTo: e.target.value })} />
            </Field>
            <Field label="支付方式">
              <SelectBox
                value={settleForm.payMethod}
                onChange={(v) => setSettleForm({ ...settleForm, payMethod: v })}
                options={[{ value: 'CASH', label: '现金' }, { value: 'TRANSFER', label: '转账' }, { value: 'BANK', label: '银行' }, { value: 'OFFSET', label: '抵扣台费' }]}
              />
            </Field>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => { void createSettlement() }}>生成</Button>
              <Button variant="ghost" onClick={() => setSettleForm(null)}>取消</Button>
            </div>
          </div>
        )}
        <DataTable
          columns={[
            { key: 'id', header: '单号', render: (r) => '#' + String(r.id) },
            { key: 'targetName', header: '对象' },
            { key: 'period', header: '周期', render: (r) => r.periodFrom + ' ~ ' + r.periodTo },
            { key: 'amount', header: '金额', render: (r) => money(r.amount) },
            { key: 'entryCount', header: '条目', render: (r) => String(r.entryCount) },
            { key: 'payMethod', header: '支付方式' },
            { key: 'status', header: '状态', render: (r) => <StatusBadge label={r.status} color={r.status === 'PAID' ? '#00ff88' : '#ffaa00'} /> },
            {
              key: 'act',
              header: '操作',
              render: (r) => (
                <div className="flex gap-1.5">
                  {r.status === 'CONFIRMED' && (
                    <Button size="sm" variant="outline" onClick={() => setPayForm({ id: r.id, targetName: r.targetName, amount: r.amount, payMethod: r.payMethod, payRef: '' })}>
                      支付确认
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { window.open('/api/v1/split/settlements/' + String(r.id) + '/export?format=xlsx', '_blank') }}
                  >
                    导出
                  </Button>
                </div>
              ),
            },
          ] as Array<Column<SettlementRow>>}
          rows={settlements}
          loading={settlements === undefined}
          total={settlements?.length ?? 0}
          page={1}
          pageSize={100}
        />
      </Card>

      {/* 计提流水 */}
      <Card className="p-4">
        <DataTable columns={entryColumns} rows={entries} loading={entries === undefined} total={entries?.length ?? 0} page={1} pageSize={200} />
      </Card>

      {/* 支付确认弹窗 */}
      <Dialog open={payForm !== null} onOpenChange={(o) => { if (!o) setPayForm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>支付确认 · {payForm?.targetName ?? ''} {payForm !== null ? money(payForm.amount) : ''}</DialogTitle>
          </DialogHeader>
          {payForm !== null && (
            <div className="space-y-3">
              <Field label="支付凭证号(线下发放留痕)">
                <Input value={payForm.payRef} onChange={(e) => setPayForm({ ...payForm, payRef: e.target.value })} placeholder="如:WX20261104-001" />
              </Field>
              {payForm.payMethod === 'OFFSET' && (
                <p className="text-xs text-fg-muted">OFFSET 模式支付将自动写 MANUAL_DEDUCT 台费冲抵流水(只增)。</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void paySettlement() }}>确认支付</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
