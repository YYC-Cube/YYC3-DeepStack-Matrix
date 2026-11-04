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
import PersonPicker from '@/components/person-picker'

/** 结算方式单源:门店收费渠道(DEFAULT_PAY_CHANNELS:CASH/TRANSFER/CUSTOM1-3,门店可配)+保留语义 OFFSET(台费冲抵) */
const PAY_METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'CASH', label: '现金' },
  { value: 'TRANSFER', label: '转账' },
  { value: 'BANK', label: '银行' },
  { value: 'WECHAT', label: '微信' },
  { value: 'ALIPAY', label: '支付宝' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'CUSTOM1', label: '自定义1' },
  { value: 'CUSTOM2', label: '自定义2' },
  { value: 'CUSTOM3', label: '自定义3' },
  { value: 'OFFSET', label: '抵扣台费(仅销售经理)' },
]

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
  const [form, setForm] = useState<{
    name: string
    category: string
    calcType: string
    percent: string
    fixedAmount: string
    tiers: Array<{ min: string; max: string; percent: string }>
    budget: string
  } | null>(null)
  const [manual, setManual] = useState<{ targetScope: string; targetId: string; targetName: string; baseAmount: string; amount: string } | null>(null)
  const [settleForm, setSettleForm] = useState<{ targetScope: string; targetId: string; targetName: string; periodFrom: string; periodTo: string; payMethod: string } | null>(null)
  const [payForm, setPayForm] = useState<{ id: number; targetName: string; amount: number; payMethod: string; payRef: string } | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<{ updated: number; rows: Array<{ id: number | null; payRef: string; ok: boolean; reason: string }> } | null>(null)
  /** 分账对象选择器/部门数据源(A:任一项匹配;结算方式全渠道下拉) */
  const [manualPicker, setManualPicker] = useState(false)
  const [settlePicker, setSettlePicker] = useState(false)
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const payMethodOptions = PAY_METHOD_OPTIONS
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
    // 部门数据源(分账目标 DEPARTMENT 下拉;staff API setting:manage 同守卫)
    void req<{ rows: Array<{ id: number; name: string }> }>('GET', '/staff/departments')
      .then((r) => setDepartments(r.rows))
      .catch(() => undefined)
  }, [load])

  async function savePlan(): Promise<void> {
    if (form === null || form.name.trim() === '') {
      toast.error('方案名称必填')
      return
    }
    const base = { payMethod: 'CASH', rewardType: 'REWARD' }
    if (form.calcType === 'TIERED') {
      const tiers = form.tiers.filter((t) => t.percent.trim() !== '')
      if (tiers.length === 0) {
        toast.error('阶梯规则至少一行(填比例)')
        return
      }
    }
    const rule: Record<string, unknown> =
      form.calcType === 'TIERED'
        ? {
            calcType: 'TIERED',
            ...base,
            tierJson: form.tiers
              .filter((t) => t.percent.trim() !== '')
              .map((t) => ({ min: t.min.trim() === '' ? null : Number(t.min), max: t.max.trim() === '' ? null : Number(t.max), percent: Number(t.percent) })),
          }
        : form.calcType === 'FIXED'
          ? { calcType: 'FIXED', ...base, fixedAmount: Number(form.fixedAmount) || 0 }
          : { calcType: 'PERCENT', ...base, percent: Number(form.percent) || 0 }
    setBusy(true)
    try {
      await req('POST', '/split/plans', {
        name: form.name.trim(),
        category: form.category,
        ...(form.budget.trim() !== '' ? { budgetAmount: Number(form.budget) } : {}),
        rules: [rule],
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

  async function importRefs(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('请选择 CSV 文件(Excel/WPS 另存为「CSV UTF-8」)')
      return
    }
    setBusy(true)
    try {
      const text = await file.text()
      const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(text)))
      const out = await req<{ updated: number; rows: Array<{ id: number | null; payRef: string; ok: boolean; reason: string }> }>(
        'POST',
        '/split/settlements/import-refs',
        { contentBase64: b64 },
      )
      setImportResult(out)
      toast.success('导入完成:更新 ' + String(out.updated) + ' 条')
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
          <div className="flex gap-2">
            <Button onClick={() => setForm({ name: '', category: 'SESSION', calcType: 'PERCENT', percent: '20', fixedAmount: '', tiers: [{ min: '', max: '', percent: '' }], budget: '' })}>+ 新建方案</Button>
            <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null) }}>批量导入凭证(CSV)</Button>
          </div>
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
                onChange={(v) => setManual({ ...manual, targetScope: v, targetId: '', targetName: '' })}
                options={[{ value: 'ARTIST', label: '销售经理' }, { value: 'ADMIN', label: '岗位' }, { value: 'DEPARTMENT', label: '部门' }]}
              />
            </Field>
            {manual.targetScope === 'ARTIST' && (
              <Field label="对象(姓名/首字母/腰牌/电话 任一项可搜)">
                <Button variant="outline" className="w-full justify-start" onClick={() => { setManualPicker(true) }}>
                  {manual.targetName !== '' ? `已选:${manual.targetName}#${manual.targetId}` : '+ 选择人员'}
                </Button>
              </Field>
            )}
            {manual.targetScope === 'DEPARTMENT' && (
              <Field label="部门">
                <SelectBox
                  value={manual.targetId}
                  onChange={(v) => {
                    const d = departments.find((x) => String(x.id) === v)
                    setManual({ ...manual, targetId: v, targetName: d?.name ?? '' })
                  }}
                  options={[{ value: '', label: '选择部门' }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))]}
                />
              </Field>
            )}
            {manual.targetScope === 'ADMIN' && (
              <>
                <Field label="岗位 ID">
                  <Input inputMode="numeric" value={manual.targetId} onChange={(e) => setManual({ ...manual, targetId: e.target.value })} />
                </Field>
                <Field label="岗位名称">
                  <Input value={manual.targetName} onChange={(e) => setManual({ ...manual, targetName: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="基数">
              <Input inputMode="decimal" value={manual.baseAmount} onChange={(e) => setManual({ ...manual, baseAmount: e.target.value })} />
            </Field>
            <Field label="计提额(负=罚扣)">
              <Input inputMode="decimal" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button
                disabled={busy || manual.targetId === '' || manual.targetName.trim() === ''}
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
                onChange={(v) => setSettleForm({ ...settleForm, targetScope: v, targetId: '', targetName: '' })}
                options={[{ value: 'ARTIST', label: '销售经理' }, { value: 'ADMIN', label: '岗位' }, { value: 'DEPARTMENT', label: '部门' }]}
              />
            </Field>
            {settleForm.targetScope === 'ARTIST' && (
              <Field label="对象(任一项可搜)">
                <Button variant="outline" className="w-full justify-start" onClick={() => { setSettlePicker(true) }}>
                  {settleForm.targetName !== '' ? `已选:${settleForm.targetName}#${settleForm.targetId}` : '+ 选择人员'}
                </Button>
              </Field>
            )}
            {settleForm.targetScope === 'DEPARTMENT' && (
              <Field label="部门">
                <SelectBox
                  value={settleForm.targetId}
                  onChange={(v) => {
                    const d = departments.find((x) => String(x.id) === v)
                    setSettleForm({ ...settleForm, targetId: v, targetName: d?.name ?? '' })
                  }}
                  options={[{ value: '', label: '选择部门' }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))]}
                />
              </Field>
            )}
            {settleForm.targetScope === 'ADMIN' && (
              <>
                <Field label="岗位 ID">
                  <Input inputMode="numeric" value={settleForm.targetId} onChange={(e) => setSettleForm({ ...settleForm, targetId: e.target.value })} />
                </Field>
                <Field label="岗位名称">
                  <Input value={settleForm.targetName} onChange={(e) => setSettleForm({ ...settleForm, targetName: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="周期起">
              <Input type="date" value={settleForm.periodFrom} onChange={(e) => setSettleForm({ ...settleForm, periodFrom: e.target.value })} />
            </Field>
            <Field label="周期止">
              <Input type="date" value={settleForm.periodTo} onChange={(e) => setSettleForm({ ...settleForm, periodTo: e.target.value })} />
            </Field>
            <Field label="结算方式(对应门店全部收付款渠道)">
              <SelectBox
                value={settleForm.payMethod}
                onChange={(v) => setSettleForm({ ...settleForm, payMethod: v })}
                options={payMethodOptions}
              />
            </Field>
            <div className="flex gap-2">
              <Button disabled={busy || settleForm.targetId === '' || settleForm.targetName.trim() === ''} onClick={() => { void createSettlement() }}>生成</Button>
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
      {/* 新建方案(含 S4-2 阶梯规则 UI 化) */}
      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建分账方案</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <Field label="方案名称" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如:销售经理月度提成" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="类目">
                  <SelectBox
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: v })}
                    options={[
                      { value: 'SESSION', label: '上钟业绩' },
                      { value: 'ROOM', label: '房账消费' },
                      { value: 'ORDER', label: '自点单' },
                      { value: 'TICKET', label: '台票销售' },
                      { value: 'RECHARGE', label: '充值业绩' },
                      { value: 'MANUAL', label: '手动调整' },
                    ]}
                  />
                </Field>
                <Field label="计算方式">
                  <SelectBox
                    value={form.calcType}
                    onChange={(v) => setForm({ ...form, calcType: v })}
                    options={[{ value: 'PERCENT', label: '比例 %' }, { value: 'FIXED', label: '固定金额' }, { value: 'TIERED', label: '阶梯' }]}
                  />
                </Field>
              </div>
              {form.calcType === 'PERCENT' && (
                <Field label="比例(%)">
                  <Input inputMode="decimal" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} />
                </Field>
              )}
              {form.calcType === 'FIXED' && (
                <Field label="固定金额(元/期)">
                  <Input inputMode="decimal" value={form.fixedAmount} onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })} />
                </Field>
              )}
              {form.calcType === 'TIERED' && (
                <div className="space-y-1.5">
                  <div className="text-xs text-fg-muted">阶梯表(基数区间×比例;min/max 留空=不设界,命中首个满足区间)</div>
                  {form.tiers.map((t, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                      <Input placeholder="基数≥" inputMode="decimal" value={t.min} onChange={(e) => setForm({ ...form, tiers: form.tiers.map((x, j) => j === i ? { ...x, min: e.target.value } : x) })} />
                      <Input placeholder="基数<" inputMode="decimal" value={t.max} onChange={(e) => setForm({ ...form, tiers: form.tiers.map((x, j) => j === i ? { ...x, max: e.target.value } : x) })} />
                      <Input placeholder="比例%" inputMode="decimal" value={t.percent} onChange={(e) => setForm({ ...form, tiers: form.tiers.map((x, j) => j === i ? { ...x, percent: e.target.value } : x) })} />
                      <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, j) => j !== i) })}>删</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setForm({ ...form, tiers: [...form.tiers, { min: '', max: '', percent: '' }] })}>+ 加一行</Button>
                </div>
              )}
              <Field label="计划期预算(可选;达成率=实际/预算)">
                <Input inputMode="decimal" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="如 5000" />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void savePlan() }}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量凭证导入(S4-1;CSV UTF-8 两列[结算单号,凭证号]) */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportResult(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量导入支付凭证(CSV)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">
              Excel/WPS 另存为「CSV UTF-8」;两列:<code>结算单号,凭证号</code>(首行表头自动跳过;单号可带 #)。
              仅回写 CONFIRMED/PAID 状态单,全部留审计。
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f !== undefined) void importRefs(f)
              }}
            />
            {importResult !== null && (
              <div className="max-h-48 overflow-auto rounded border border-line text-xs space-y-1 p-2">
                <div className="font-medium">更新 {String(importResult.updated)} 条</div>
                {importResult.rows.filter((r) => !r.ok).map((r, i) => (
                  <div key={i} className="text-error">#{String(r.id ?? '?')} {r.reason}</div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportResult(null) }}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* 分账对象选择器(手动奖惩) */}
      <PersonPicker
        open={manualPicker}
        title="选择分账对象(销售经理)"
        line="SELL"
        excludeBusy={false}
        onClose={() => { setManualPicker(false) }}
        onPick={(p) => {
          if (p !== null && !Array.isArray(p) && manual !== null) {
            setManual({ ...manual, targetId: String(p.id), targetName: p.realName + (p.groupName !== null ? '(' + p.groupName + ')' : '') })
          }
        }}
      />
      {/* 分账对象选择器(结算单) */}
      <PersonPicker
        open={settlePicker}
        title="选择结算对象(销售经理)"
        line="SELL"
        excludeBusy={false}
        onClose={() => { setSettlePicker(false) }}
        onPick={(p) => {
          if (p !== null && !Array.isArray(p) && settleForm !== null) {
            setSettleForm({ ...settleForm, targetId: String(p.id), targetName: p.realName })
          }
        }}
      />
    </div>
  )
}
