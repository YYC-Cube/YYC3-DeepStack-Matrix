/**
 * A5 台费规则(等级×房型矩阵 + 列表;当日已有该房型上钟禁改 40903)
 * 计费模式 HOURLY 下 amount 语义 = 计时单价(元/小时),需求全集 §6
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Checkbox, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, req, toastError } from '@/lib/api'
import { fmtMoney, num } from '@/lib/format'
import { ConfirmButton, DataTable, Field, PageHeader, type Column } from '@/components/kit'

interface RuleRow {
  id: number
  levelId: number
  roomTypeIds: number[]
  amount: string
}
interface Option {
  id: number
  name: string
}
interface FormState {
  id?: number
  levelId: string
  roomTypeIds: number[]
  amount: string
}

export default function FeeRulesPage() {
  const [rules, setRules] = useState<RuleRow[]>()
  const [levels, setLevels] = useState<Option[]>([])
  const [roomTypes, setRoomTypes] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [r, l, rt] = await Promise.all([
        client.fees.rules.list({}),
        req<Option[]>('GET', '/artist-levels'),
        req<Option[]>('GET', '/store/room-types'),
      ])
      // 服务端 Decimal 序列化为字符串,单源客户端类型为 number → 经 unknown 收敛到本页行类型
      setRules(r.rows as unknown as RuleRow[])
      setLevels(l)
      setRoomTypes(rt)
    } catch (e) {
      toastError(e, '规则加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const levelName = (id: number): string => levels.find((l) => l.id === id)?.name ?? String(id)
  const roomName = (id: number): string => roomTypes.find((r) => r.id === id)?.name ?? String(id)

  async function save(): Promise<void> {
    if (form === null) return
    if (form.levelId === '' || form.roomTypeIds.length === 0) {
      toast.error('等级与至少一个包厢类型必选')
      return
    }
    setBusy(true)
    try {
      const body = { levelId: Number(form.levelId), roomTypeIds: form.roomTypeIds, amount: num(form.amount) }
      if (form.id !== undefined) {
        await req('PUT', '/stage-fee-rules/' + String(form.id), body)
        toast.success('规则已更新')
      } else {
        await req('POST', '/stage-fee-rules', body)
        toast.success('规则已创建')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e) // 40903 文案由后端给出:「该包厢类型当日已有上钟,规则禁改」
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number): Promise<void> {
    try {
      await req('DELETE', '/stage-fee-rules/' + String(id))
      toast.success('规则已删除')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  /* ── 矩阵(行=等级,列=房型) ── */
  const matrix = useMemo(() => {
    return levels.map((l) => {
      const cells = roomTypes.map((rt) => {
        const hit = (rules ?? []).find((r) => r.levelId === l.id && r.roomTypeIds.includes(rt.id))
        return { roomTypeId: rt.id, ruleId: hit?.id, amount: hit !== undefined ? num(hit.amount) : null }
      })
      return { level: l, cells }
    })
  }, [levels, roomTypes, rules])

  const columns: Array<Column<RuleRow>> = [
    { key: 'level', header: '艺人等级', render: (r) => levelName(r.levelId) },
    { key: 'rooms', header: '适用包厢类型', render: (r) => r.roomTypeIds.map(roomName).join(' / ') },
    { key: 'amount', header: '计时单价(元/小时)', render: (r) => fmtMoney(r.amount) },
    {
      key: 'act',
      header: '操作',
      render: (r) => (
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setForm({ id: r.id, levelId: String(r.levelId), roomTypeIds: [...r.roomTypeIds], amount: String(num(r.amount)) })
            }
          >
            修改
          </Button>
          <ConfirmButton
            confirmTitle="确认删除规则"
            confirmDesc={levelName(r.levelId) + ' × ' + r.roomTypeIds.map(roomName).join('/') + ' 的规则将停用(软删,可重建)。'}
            onConfirm={() => {
              void remove(r.id)
            }}
          >
            删除
          </ConfirmButton>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="台费规则(等级 × 包厢类型)"
        desc="小时计费模式下金额 = 计时单价(元/小时);上钟时快照到场次,改价不影响进行中场次;当日已有该房型上钟时禁改(40903)"
        actions={<Button onClick={() => setForm({ levelId: '', roomTypeIds: [], amount: '0' })}>+ 新增规则</Button>}
      />

      {/* 矩阵视图(A5) */}
      <Card className="p-4 mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#8b9bb4] border-b border-[rgba(0,212,255,0.12)]">
              <th className="text-left py-2 pr-4">等级 \ 房型</th>
              {roomTypes.map((rt) => (
                <th key={rt.id} className="text-left py-2 pr-4">
                  {rt.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.level.id} className="border-b border-[rgba(0,212,255,0.06)]">
                <td className="py-2 pr-4 text-[#e0f0ff]">{row.level.name}</td>
                {row.cells.map((c) => (
                  <td key={c.roomTypeId} className="py-2 pr-4">
                    {c.amount !== null ? (
                      <button
                        className="text-[#00d4ff] hover:underline"
                        onClick={() => {
                          const rule = (rules ?? []).find((r) => r.id === c.ruleId)
                          if (rule !== undefined) {
                            setForm({ id: rule.id, levelId: String(rule.levelId), roomTypeIds: [...rule.roomTypeIds], amount: String(num(rule.amount)) })
                          }
                        }}
                      >
                        ¥{fmtMoney(c.amount)}
                      </button>
                    ) : (
                      <span className="text-[#8b9bb4]/50">未配置</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <DataTable columns={columns} rows={rules} loading={loading} emptyText="暂无规则" />

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '修改规则' : '新增规则'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="flex flex-col gap-4">
              <Field label="艺人等级" required>
                <select
                  className="w-full h-9 rounded-md bg-[rgba(10,30,60,0.7)] border border-[rgba(0,212,255,0.2)] px-3 text-sm text-[#e0f0ff]"
                  value={form.levelId}
                  onChange={(e) => setForm({ ...form, levelId: e.target.value })}
                >
                  <option value="">请选择等级</option>
                  {levels.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex flex-col gap-2">
                <Label className="text-[#8b9bb4] text-xs">适用包厢类型(至少一项)</Label>
                <div className="flex flex-wrap gap-3">
                  {roomTypes.map((rt) => (
                    <label key={rt.id} className="flex items-center gap-1.5 text-sm text-[#e0f0ff]">
                      <Checkbox
                        checked={form.roomTypeIds.includes(rt.id)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            roomTypeIds: v === true ? [...form.roomTypeIds, rt.id] : form.roomTypeIds.filter((x) => x !== rt.id),
                          })
                        }
                      />
                      {rt.name}
                    </label>
                  ))}
                </div>
              </div>
              <Field label="计时单价(元/小时)" required>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
