/**
 * A7 台费充值 / A8 手动扣费(表单页)
 * A8 红线:备注必填;金额≥阈值(默认500)→ 202+41201 转审批(非报错语义,引导查看审批单)
 */
import { useCallback, useState } from 'react'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, idemKey, toastError } from '@/lib/api'
import { fmtMoney } from '@/lib/format'
import { ConfirmButton, Field, MoneyText, PageHeader } from '@/components/kit'

interface ArtistRow {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
}

function ArtistPicker({ onPick }: { onPick: (a: ArtistRow) => void }): React.JSX.Element {
  const [keyword, setKeyword] = useState('')
  const [rows, setRows] = useState<ArtistRow[]>([])
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (): Promise<void> => {
    try {
      const res = await client.artists.list({ keyword, page: 1, pageSize: 10 })
      setRows(res.rows as ArtistRow[])
      setSearched(true)
    } catch (e) {
      toastError(e, '搜索失败')
    }
  }, [keyword])

  return (
    <div className="flex flex-col gap-2">
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
      {rows.length > 0 && (
        <Card className="p-1 divide-y divide-[rgba(0,212,255,0.08)]">
          {rows.map((a) => (
            <div
              key={a.id}
              onClick={() => onPick(a)}
              className="px-3 py-2 text-sm cursor-pointer rounded hover:bg-[rgba(0,212,255,0.06)] flex justify-between"
            >
              <span className="text-[#e0f0ff]">{a.stageName ?? a.realName}</span>
              <span className="text-[#8b9bb4]">{a.badgeNo ?? '无腰牌'} · {a.realName}</span>
            </div>
          ))}
        </Card>
      )}
      {searched && rows.length === 0 && <p className="text-xs text-[#8b9bb4]">未找到匹配档案</p>}
    </div>
  )
}

export default function FeeFormPage({ mode }: { mode: 'recharge' | 'deduct' }) {
  const isRecharge = mode === 'recharge'
  const [artist, setArtist] = useState<ArtistRow | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [busy, setBusy] = useState(false)

  async function pickBalance(a: ArtistRow): Promise<void> {
    setArtist(a)
    setBalance(null)
    try {
      const res = await client.fees.balance(a.id)
      setBalance(res.balance)
    } catch {
      setBalance(null)
    }
  }

  async function submit(): Promise<void> {
    if (artist === null) {
      toast.error('请先选择艺人')
      return
    }
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('金额须大于 0')
      return
    }
    if (!isRecharge && remark.trim() === '') {
      toast.error('手动扣费必须填写备注(资金红线)')
      return
    }
    setBusy(true)
    try {
      if (isRecharge) {
        const res = await client.fees.recharge({ artistId: artist.id, amount: n, payChannel: 'CASH' }, idemKey('recharge'))
        toast.success('充值成功:余额 ¥' + fmtMoney(res.balance))
        setBalance(res.balance)
      } else {
        // 直扣返回 balance;审批路径返回 approvalId(单源客户端类型未含 balance,实际载荷有)
        const res = (await client.fees.manualDeduct({ artistId: artist.id, amount: n, remark }, idemKey('deduct'))) as {
          txnId?: number
          approvalId?: number
          balance?: number
        }
        if (res.approvalId !== undefined) {
          // 202+41201:已转审批,不是失败
          toast.info('金额达到审批阈值,已生成审批单 #' + String(res.approvalId) + ',审批通过后落账')
        } else {
          toast.success('扣费成功:余额 ¥' + fmtMoney(res.balance ?? 0))
          setBalance(res.balance ?? null)
        }
      }
      setAmount('')
      setRemark('')
    } catch (e) {
      toastError(e, isRecharge ? '充值失败' : '扣费失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={isRecharge ? '台费充值' : '台费手动扣费'}
        desc={
          isRecharge
            ? 'MVP 支持现金渠道(幂等键防重复提交);抖音支付 II 期'
            : '备注必填;金额 ≥ 阈值(默认 ¥500)自动转审批单,审批通过才落账(双人防线)'
        }
      />
      <Card className="p-6 max-w-xl flex flex-col gap-5">
        <Field label="选择艺人(搜索:艺名/腰牌号)" required>
          {artist === null ? (
            <ArtistPicker onPick={(a) => void pickBalance(a)} />
          ) : (
            <div className="flex items-center justify-between rounded-md border border-[rgba(0,212,255,0.2)] px-3 py-2">
              <span className="text-sm text-[#e0f0ff]">
                {artist.stageName ?? artist.realName}({artist.badgeNo ?? '无腰牌'})
              </span>
              <Button variant="ghost" size="sm" onClick={() => setArtist(null)}>
                重选
              </Button>
            </div>
          )}
        </Field>
        {artist !== null && balance !== null && (
          <div className="text-sm text-[#8b9bb4]">
            当前余额:<MoneyText v={balance} /> 元
            {balance < 0 && <span className="ml-2 text-[#ff3366] text-xs">(负余额=未收款,红色标识)</span>}
          </div>
        )}
        <Field label={isRecharge ? '充值金额(元)' : '扣费金额(元)'} required>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        {!isRecharge && (
          <Field label="扣费原因(备注,必填)" required>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="如:违规罚款/抽成,须写明事由" />
          </Field>
        )}
        <ConfirmButton
          confirmTitle={isRecharge ? '确认充值' : '确认扣费'}
          confirmDesc={
            (artist !== null ? (artist.stageName ?? artist.realName) : '') +
            (isRecharge ? ' 充值 ¥' : ' 扣费 ¥') +
            fmtMoney(amount) +
            (!isRecharge && Number(amount) >= 500 ? '(达到审批阈值,将生成审批单待财务批准)' : '')
          }
          confirmText={isRecharge ? '确认充值' : '确认扣费'}
          variant={isRecharge ? 'default' : 'destructive'}
          disabled={busy || artist === null}
          onConfirm={() => {
            void submit()
          }}
        >
          {busy ? '提交中…' : isRecharge ? '提交充值' : '提交扣费'}
        </ConfirmButton>
        {!isRecharge && (
          <p className="text-xs text-[#8b9bb4]">提交后流水只增不改;更正请在「手动扣费记录」中走冲正(生成反向流水)。</p>
        )}
      </Card>
    </div>
  )
}
