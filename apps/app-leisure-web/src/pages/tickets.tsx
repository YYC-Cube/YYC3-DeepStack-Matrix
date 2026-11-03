/**
 * 台票全套(实测四页:设置/购买/购买记录/使用记录;需求全集 §6.6)
 * 流水只增:购买=purchase(通道走门店清单),核销=use(余额/有效期由单源判定)
 */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button, Card, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, idemKey, req, toastError } from '@/lib/api'
import { fmtMoney } from '@/lib/format'
import { ConfirmButton, DataTable, EmptyState, Field, MoneyText, PageHeader, SelectBox } from '@/components/kit'
import type { Column } from '@/components/kit'
import type { TicketBalanceRow, TicketRule, TicketTxnRow } from '@yyc3/leisure-core'

const today = (): string => new Date().toISOString().slice(0, 10)

/* ── ① 台票设置(规则 CRUD) ── */

function RulesTab(): React.JSX.Element {
  const [rows, setRows] = useState<TicketRule[]>([])
  const [form, setForm] = useState<{ id?: number; name: string; price: string; validDays: string; status: '1' | '0' } | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      setRows((await client.tickets.rules.list()).rows)
    } catch (e) {
      toastError(e, '台票规则加载失败')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const save = async (): Promise<void> => {
    const f = form
    if (f === null) return
    if (f.name.trim() === '' || !Number.isFinite(Number(f.price))) {
      toast.error('名称/价格必填')
      return
    }
    try {
      await client.tickets.rules.upsert({
        ...(f.id !== undefined ? { id: f.id } : {}),
        name: f.name.trim(),
        price: Number(f.price),
        validDays: Number(f.validDays === '' ? '0' : f.validDays) || 0,
        status: f.status === '1' ? 1 : 0,
      })
      toast.success('台票规则已保存')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e, '保存失败')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-fg-muted">价格/有效期可随时调整;删除仅限无人持有余额的规则</span>
        <Button onClick={() => setForm({ name: '', price: '', validDays: '0', status: '1' })}>新建台票</Button>
      </div>
      <div className="grid gap-2">
        {rows.map((r) => (
          <Card key={r.id} className="p-3 flex items-center gap-3 text-sm flex-wrap">
            <div className="w-40 font-medium text-[var(--lm-fg)]">{r.name}</div>
            <div className="text-primary font-semibold">¥{fmtMoney(r.price)}</div>
            <div className="text-fg-muted">{r.validDays > 0 ? '有效期 ' + String(r.validDays) + ' 天' : '长期有效'}</div>
            <div className={r.status === 1 ? 'text-success' : 'text-fg-muted'}>{r.status === 1 ? '启用' : '停用'}</div>
            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    id: r.id,
                    name: r.name,
                    price: String(r.price),
                    validDays: String(r.validDays),
                    status: r.status === 1 ? '1' : '0',
                  })
                }
              >
                编辑
              </Button>
              <ConfirmButton
                confirmTitle="确认删除该台票规则?"
                confirmDesc="仅当无人持有余额时可删;一般建议改「停用」"
                variant="outline"
                onConfirm={async () => {
                  await client.tickets.rules.remove(r.id)
                  toast.success('已删除')
                  await load()
                }}
              >
                删除
              </ConfirmButton>
            </div>
          </Card>
        ))}
        {rows.length === 0 && form === null && (
          <EmptyState
            title="暂无台票"
            desc="创建第一种台票后,即可在「台票购买」中销售"
            action={<Button onClick={() => setForm({ name: '', price: '', validDays: '0', status: '1' })}>新建台票</Button>}
          />
        )}
      </div>
      {form !== null && (
        <Card className="p-4 space-y-3 max-w-md">
          <Field label="台票名称" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如:普通台票" />
          </Field>
          <div className="flex gap-3">
            <Field label="单价(元)" required>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label="有效期(天;0=长期)">
              <Input type="number" value={form.validDays} onChange={(e) => setForm({ ...form, validDays: e.target.value })} />
            </Field>
            <Field label="状态">
              <SelectBox
                className="w-24"
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as '1' | '0' })}
                options={[{ value: '1', label: '启用' }, { value: '0', label: '停用' }]}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button onClick={() => void save()}>保存</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── ② 台票购买 ── */

interface ArtistLite {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
}

function PurchaseTab({ channels }: { channels: Array<{ code: string; label: string }> }): React.JSX.Element {
  const [rules, setRules] = useState<TicketRule[]>([])
  const [artist, setArtist] = useState<ArtistLite | null>(null)
  const [keyword, setKeyword] = useState('')
  const [candidates, setCandidates] = useState<ArtistLite[]>([])
  const [ruleId, setRuleId] = useState('')
  const [qty, setQty] = useState('1')
  const [channel, setChannel] = useState(channels[0]?.code ?? 'CASH')
  const [balances, setBalances] = useState<TicketBalanceRow[]>([])

  useEffect(() => {
    client.tickets.rules
      .list()
      .then((r) => {
        setRules(r.rows.filter((x) => x.status === 1))
        if (r.rows.length > 0) setRuleId(String(r.rows[0]?.id ?? ''))
      })
      .catch((e) => toastError(e, '规则加载失败'))
  }, [])

  const search = async (): Promise<void> => {
    try {
      const res = await client.artists.list({ keyword, page: 1, pageSize: 10 })
      setCandidates(res.rows as ArtistLite[])
    } catch (e) {
      toastError(e, '搜索失败')
    }
  }

  const pick = async (a: ArtistLite): Promise<void> => {
    setArtist(a)
    setCandidates([])
    try {
      setBalances((await client.tickets.balance(a.id)).rows)
    } catch {
      setBalances([])
    }
  }

  const submit = async (): Promise<void> => {
    if (artist === null || ruleId === '') {
      toast.error('请选择销售经理与台票')
      return
    }
    const n = Number(qty)
    if (!Number.isInteger(n) || n <= 0) {
      toast.error('数量须为正整数')
      return
    }
    try {
      const res = await client.tickets.purchase(
        { artistId: artist.id, ticketRuleId: Number(ruleId), qty: n, payChannel: channel },
        idemKey('ticket-purchase'),
      )
      toast.success('购买成功:¥' + fmtMoney(res.amount) + ',余额 ' + String(res.balance) + ' 张')
      await pick(artist)
    } catch (e) {
      toastError(e, '购买失败')
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field label="选择销售经理" required>
        {artist === null ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="艺名/姓名/腰牌号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void search()
                }}
              />
              <Button variant="outline" onClick={() => void search()}>
                搜索
              </Button>
            </div>
            {candidates.map((a) => (
              <Card
                key={a.id}
                className="p-2 px-3 text-sm cursor-pointer hover:bg-primary/6 flex justify-between"
                onClick={() => void pick(a)}
              >
                <span className="text-[var(--lm-fg)]">{a.stageName ?? a.realName}</span>
                <span className="text-fg-muted">{a.badgeNo ?? '无腰牌'}</span>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-line px-3 py-2">
            <span className="text-sm text-[var(--lm-fg)]">
              {artist.stageName ?? artist.realName}({artist.badgeNo ?? '无腰牌'})
            </span>
            <Button variant="ghost" size="sm" onClick={() => { setArtist(null); setBalances([]) }}>
              重选
            </Button>
          </div>
        )}
      </Field>
      {artist !== null && balances.length > 0 && (
        <div className="text-xs text-fg-muted space-y-0.5">
          {balances.map((b) => (
            <div key={b.ticketRuleId}>
              {b.name}:<span className="text-success">{String(b.balance)}</span> 张
              {b.expireAt !== null && <span className="ml-1">(有效至 {b.expireAt.slice(0, 10)})</span>}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <Field label="台票" required>
          <SelectBox
            className="w-40"
            value={ruleId}
            onChange={(v) => setRuleId(v)}
            options={rules.map((r) => ({ value: String(r.id), label: r.name + ' ¥' + fmtMoney(r.price) }))}
          />
        </Field>
        <Field label="数量" required>
          <Input type="number" className="w-24" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="收费通道">
          <SelectBox
            className="w-32"
            value={channel}
            onChange={(v) => setChannel(v)}
            options={channels.map((c) => ({ value: c.code, label: c.label }))}
          />
        </Field>
      </div>
      <ConfirmButton
        confirmTitle="确认台票购买"
        confirmDesc={(artist !== null ? artist.stageName ?? artist.realName : '') + ' 购买 ' + qty + ' 张(' + (channels.find((c) => c.code === channel)?.label ?? channel) + ')'}
        disabled={artist === null || ruleId === ''}
        onConfirm={() => {
          void submit()
        }}
      >
        提交购买
      </ConfirmButton>
    </div>
  )
}

/* ── ③④ 购买/使用记录 ── */

function TxnTab({ type }: { type: 'BUY' | 'USE' }): React.JSX.Element {
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<TicketTxnRow[]>()
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (p: number): Promise<void> => {
    setLoading(true)
    try {
      const res = await client.tickets.txns({ businessDateFrom: from, businessDateTo: to, type, page: p, pageSize: 20 })
      setRows(res.rows as unknown as TicketTxnRow[])
      setTotal(res.total)
      setTotalAmount(res.totalAmount)
      setPage(p)
    } catch (e) {
      toastError(e, '记录加载失败')
    } finally {
      setLoading(false)
    }
  }, [from, to, type])

  useEffect(() => {
    void load(1)
  }, [load])

  const columns: Array<Column<TicketTxnRow>> = [
    { key: 'businessDate', header: '营业日' },
    {
      key: 'stageName',
      header: '销售经理',
      render: (r) => (r.stageName ?? r.realName) + '(' + (r.badgeNo ?? '无腰牌') + ')',
    },
    { key: 'ruleName', header: '台票' },
    { key: 'qty', header: '数量' },
    {
      key: 'amount',
      header: '金额',
      render: (r) => <MoneyText v={r.amount} />,
    },
    ...(type === 'BUY'
      ? [{
          key: 'payChannel',
          header: '通道',
          render: (r: TicketTxnRow) => r.payChannel ?? '—',
        } as Column<TicketTxnRow>]
      : []),
    { key: 'createdAt', header: '时间', render: (r) => r.createdAt.slice(5, 16).replace('T', ' ') },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-fg-muted">~</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="outline" onClick={() => void load(1)}>
          查询
        </Button>
        {type === 'BUY' && <span className="text-sm text-fg-muted ml-2">合计:¥{fmtMoney(totalAmount)}</span>}
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={20} onPageChange={(p) => void load(p)} />
    </div>
  )
}

const TAB_KEYS = ['rules', 'purchase', 'buy-log', 'use-log'] as const

export default function TicketsPage(): React.JSX.Element {
  // ?tab= 深链(侧边栏单项 + 页内四视图;URL 可分享/刷新保持视图)
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab') ?? 'rules'
  const tab = (TAB_KEYS as readonly string[]).includes(raw) ? raw : 'rules'
  const [channels, setChannels] = useState<Array<{ code: string; label: string }>>([])
  useEffect(() => {
    req<{ roomBilling: { channels: Array<{ code: string; label: string }> } }>('GET', '/store-config/artist-settings')
      .then((s) => setChannels(s.roomBilling.channels))
      .catch(() => {})
  }, [])

  return (
    <div>
      <PageHeader title="台票体系" desc="设置/购买/购买记录/使用记录;流水只增不改,余额=ΣBUY−ΣUSE" />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="rules">台票设置</TabsTrigger>
          <TabsTrigger value="purchase">台票购买</TabsTrigger>
          <TabsTrigger value="buy-log">购买记录</TabsTrigger>
          <TabsTrigger value="use-log">使用记录</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="purchase">
          <PurchaseTab channels={channels} />
        </TabsContent>
        <TabsContent value="buy-log">
          <TxnTab type="BUY" />
        </TabsContent>
        <TabsContent value="use-log">
          <TxnTab type="USE" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
