/**
 * A9/A10/A11 台费流水三查(同一组件按 :type 切换:RECHARGE/SESSION_DEDUCT/MANUAL_DEDUCT)
 * 支持:营业日区间/组别/腰牌艺名检索;totalAmount 汇总卡;冲正(铁律:反向流水+关联原单)
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, idemKey, toastError } from '@/lib/api'
import { fmtMoney, fmtTime, TXN_TYPE_LABEL, today } from '@/lib/format'
import { ConfirmButton, DataTable, MoneyText, PageHeader, type Column } from '@/components/kit'

interface TxnRow {
  id: number
  businessDate: string
  stageName: string | null
  badgeNo: string | null
  type: string
  amount: string
  payChannel: string | null
  refType: string | null
  refId: number | null
  remark: string | null
  approvalId: number | null
  createdAt: string
}

export default function FeeTxnsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const type = (params.type ?? 'RECHARGE') as 'RECHARGE' | 'SESSION_DEDUCT' | 'MANUAL_DEDUCT'
  const [rows, setRows] = useState<TxnRow[]>()
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await client.fees.txns({
        businessDateFrom: from,
        businessDateTo: to,
        type,
        keyword: keyword === '' ? undefined : keyword,
      })
      setRows(res.rows as unknown as TxnRow[])
      setTotal(res.total)
      setTotalAmount(res.totalAmount)
    } catch (e) {
      toastError(e, '流水加载失败')
    } finally {
      setLoading(false)
    }
  }, [from, to, type, keyword])

  useEffect(() => {
    setPage(1)
    void load()
  }, [load])

  /** 冲正(反向流水;原单不动) */
  async function reverse(txnId: number, amount: string): Promise<void> {
    try {
      const res = await client.fees.reverse({ txnId, remark: '管理端冲正(原流水 ¥' + fmtMoney(amount) + ')' }, idemKey('reverse'))
      toast.success('已生成冲正流水,余额 ¥' + fmtMoney(res.balance))
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  const columns: Array<Column<TxnRow>> = [
    { key: 'businessDate', header: '营业日', render: (r) => r.businessDate.slice(0, 10) },
    { key: 'artist', header: '艺人', render: (r) => (r.stageName ?? '—') + '(' + (r.badgeNo ?? '—') + ')' },
    { key: 'type', header: '类型', render: (r) => TXN_TYPE_LABEL[r.type] ?? r.type },
    {
      key: 'amount',
      header: '金额',
      render: (r) => (
        <MoneyText v={r.amount} signed />
      ),
    },
    ...(type === 'RECHARGE' ? [{ key: 'payChannel', header: '渠道', render: (r: TxnRow) => (r.payChannel === 'CASH' ? '现金' : (r.payChannel ?? '—')) }] : []),
    ...(type === 'SESSION_DEDUCT' ? [{ key: 'ref', header: '关联场次', render: (r: TxnRow) => (r.refId !== null ? '#' + String(r.refId) : '—') }] : []),
    { key: 'remark', header: '备注', render: (r) => r.remark ?? '—' },
    { key: 'approval', header: '审批单', render: (r) => (r.approvalId !== null ? '#' + String(r.approvalId) : '—') },
    { key: 'createdAt', header: '时间', render: (r) => fmtTime(r.createdAt) },
    {
      key: 'act',
      header: '操作',
      render: (r) =>
        r.type === 'REVERSE' ? (
          <span className="text-xs text-[#8b9bb4]">冲正单</span>
        ) : (
          <ConfirmButton
            confirmTitle="确认冲正"
            confirmDesc={'将对原流水 #' + String(r.id) + '(¥' + fmtMoney(r.amount) + ')生成反向冲正流水;原单不动,余额相应回退。'}
            confirmText="确认冲正"
            onConfirm={() => {
              void reverse(r.id, r.amount)
            }}
          >
            冲正
          </ConfirmButton>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={(TXN_TYPE_LABEL[type] ?? '流水') + '记录'}
        desc="流水只增不改;更正走冲正(反向流水关联原单);余额 = Σ流水"
        actions={
          <div className="flex gap-1">
            {(['RECHARGE', 'SESSION_DEDUCT', 'MANUAL_DEDUCT'] as const).map((t) => (
              <Button key={t} variant={t === type ? 'default' : 'outline'} size="sm" onClick={() => navigate('/fees/txns/' + t)}>
                {TXN_TYPE_LABEL[t]}
              </Button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4">
          <p className="text-xs text-[#8b9bb4]">筛选区间流水合计</p>
          <p className="text-xl font-semibold mt-1">
            <MoneyText v={totalAmount} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#8b9bb4]">笔数</p>
          <p className="text-xl font-semibold mt-1 text-[#e0f0ff]">{String(total)}</p>
        </Card>
      </div>
      <Card className="p-4 mb-4 flex items-center gap-3 flex-wrap">
        <Input type="date" className="w-40" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} />
        <span className="text-[#8b9bb4]">至</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} />
        <Input className="w-52" placeholder="腰牌号/艺名" value={keyword} onChange={(e) => { setPage(1); setKeyword(e.target.value) }} />
      </Card>
      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  )
}
