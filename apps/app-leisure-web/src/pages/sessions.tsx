/**
 * A20 艺人上下钟(检索 + 代下钟):营业日区间/状态/关键词;行含房号·计费小时·单价·金额(§8.3 维度)
 * 代下钟 = finish(强制下钟同规计费,§6.6);权限 session:finish
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, toastError } from '@/lib/api'
import { fmtMoney, fmtTime, today } from '@/lib/format'
import { ConfirmButton, DataTable, MoneyText, PageHeader, StatusBadge, type Column } from '@/components/kit'

interface SessionRow {
  id: number
  businessDate: string
  artistId: number
  roomName: string | null
  startAt: string
  endAt: string | null
  durationMinutes: number | null
  isCross: boolean
  feeAmount: string | null
  unitPrice: string | null
  billHours: number | null
  roundingMinutes: number | null
}

interface ArtistLite {
  id: number
  stageName: string | null
  badgeNo: string | null
}

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[]>()
  const [artists, setArtists] = useState<Map<number, ArtistLite>>(new Map())
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [status, setStatus] = useState<'all' | 'onstage' | 'cross'>('all')
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await client.sessions.list({
        businessDateFrom: from,
        businessDateTo: to,
        status,
        keyword: keyword === '' ? undefined : keyword,
      })
      setRows(res.rows as unknown as SessionRow[])
      setTotal(res.total)
      // 艺人名映射(200/页,足够 MVP;阶段6 换后端 join)
      const list = await client.artists.list({ page: 1, pageSize: 200 })
      setArtists(new Map((list.rows as ArtistLite[]).map((a) => [a.id, a])))
    } catch (e) {
      toastError(e, '上下钟加载失败')
    } finally {
      setLoading(false)
    }
  }, [from, to, status, keyword])

  useEffect(() => {
    setPage(1)
    void load()
  }, [load])

  async function finish(id: number, artist: string): Promise<void> {
    try {
      const res = await client.sessions.finish({ sessionId: id })
      toast.success(artist + ' 已下钟:计费 ' + String(res.durationMinutes) + ' 分钟,台费 ¥' + fmtMoney(res.feeAmount))
      await load()
    } catch (e) {
      toastError(e, '代下钟失败')
    }
  }

  const nameOf = (id: number): string => {
    const a = artists.get(id)
    return a !== undefined ? (a.stageName ?? String(id)) + '(' + (a.badgeNo ?? '—') + ')' : '#' + String(id)
  }

  const columns: Array<Column<SessionRow>> = [
    { key: 'artist', header: '艺人', render: (r) => nameOf(r.artistId) },
    { key: 'room', header: '包厢', render: (r) => r.roomName ?? '—' },
    { key: 'startAt', header: '上钟时间', render: (r) => fmtTime(r.startAt) },
    { key: 'endAt', header: '下钟时间', render: (r) => fmtTime(r.endAt) },
    { key: 'duration', header: '时长(分)', render: (r) => (r.durationMinutes !== null ? String(r.durationMinutes) : '进行中') },
    {
      key: 'price',
      header: '单价/小时',
      render: (r) => (r.unitPrice !== null ? '¥' + fmtMoney(r.unitPrice) : '—'),
    },
    { key: 'billHours', header: '计费小时', render: (r) => (r.billHours !== null ? String(r.billHours) + 'h' : '—') },
    {
      key: 'fee',
      header: '台费',
      render: (r) => (r.feeAmount !== null ? <MoneyText v={r.feeAmount} /> : '—'),
    },
    {
      key: 'cross',
      header: '标记',
      render: (r) =>
        r.isCross ? (
          <StatusBadge label="串台" color="#ffaa00" />
        ) : (
          <span className="text-xs text-[#8b9bb4]">—</span>
        ),
    },
    {
      key: 'act',
      header: '操作',
      render: (r) =>
        r.endAt === null ? (
          <ConfirmButton
            confirmTitle="确认代下钟"
            confirmDesc={nameOf(r.artistId) + ' 在 ' + (r.roomName ?? '') + ' 强制下钟,按上钟时快照单价与进位阈值核算台费。'}
            confirmText="确认下钟"
            onConfirm={() => {
              void finish(r.id, nameOf(r.artistId))
            }}
          >
            代下钟
          </ConfirmButton>
        ) : (
          <span className="text-xs text-[#8b9bb4]">已结</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="艺人上下钟"
        desc="进位阈值可门店自定义(进行中场次按上钟时快照计);串台独立核算;台费快照不受后续改价影响"
      />
      <Card className="p-4 mb-4 flex items-center gap-3 flex-wrap">
        <Input type="date" className="w-40" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} />
        <span className="text-[#8b9bb4]">至</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} />
        <div className="flex gap-1">
          {([['all', '全部'], ['onstage', '上钟中'], ['cross', '串台']] as const).map(([v, label]) => (
            <Button key={v} variant={status === v ? 'default' : 'outline'} size="sm" onClick={() => { setPage(1); setStatus(v) }}>
              {label}
            </Button>
          ))}
        </div>
        <Input className="w-44" placeholder="艺名/腰牌号" value={keyword} onChange={(e) => { setPage(1); setKeyword(e.target.value) }} />
      </Card>
      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  )
}
