/**
 * A23 服务评价(III 期起步):区间统计(均分/星级分布)+ 列表筛选 + 前台代录
 * 红线:评价只增不改不删;统计按营业日区间(默认近 7 天)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, idemKey, toastError } from '@/lib/api'
import { DataTable, PageHeader, SelectBox, StatCard, StatusBadge } from '@/components/kit'
import type { Column } from '@/components/kit'
import type { ReviewRow, ReviewSummary } from '@yyc3/leisure-core'
import PersonPicker from '@/components/person-picker'

const REVIEW_TYPES = ['综合', '服务', '形象', '才艺']
const SCORE_COLOR: Record<number, string> = { 1: 'var(--lm-danger)', 2: '#ff6699', 3: 'var(--lm-warning)', 4: 'var(--lm-primary)', 5: 'var(--lm-success)' }

interface ArtistLite {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}

function Stars({ n }: { n: number | null }): React.JSX.Element {
  const v = n ?? 0
  return (
    <span style={{ color: SCORE_COLOR[v] ?? 'var(--lm-text-muted)', letterSpacing: 1 }} title={String(v) + ' 分'}>
      {'★'.repeat(v)}{'☆'.repeat(Math.max(0, 5 - v))}
    </span>
  )
}

export default function ReviewsPage(): React.JSX.Element {
  const [from, setFrom] = useState(isoDaysAgo(6))
  const [to, setTo] = useState(isoDaysAgo(0))
  const [type, setType] = useState('ALL')
  const [minScore, setMinScore] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<ReviewRow[]>()
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(false)

  // 录入
  const [formOpen, setFormOpen] = useState(false)
  /** 评价选人器(2026-11-04:评价对象=进行中上钟人员,统一选人器) */
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false)
  const [artists, setArtists] = useState<ArtistLite[]>([])
  const [artistId, setArtistId] = useState('')
  const [fType, setFType] = useState('综合')
  const [customType, setCustomType] = useState('')
  const [score, setScore] = useState(5)
  const [content, setContent] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (p: number): Promise<void> => {
    setLoading(true)
    try {
      const res = await client.reviews.list({
        businessDateFrom: from,
        businessDateTo: to,
        ...(type !== 'ALL' ? { reviewType: type } : {}),
        ...(minScore !== 'ALL' ? { minScore: Number(minScore) } : {}),
        ...(keyword.trim() !== '' ? { keyword: keyword.trim() } : {}),
        page: p,
        pageSize: 20,
      })
      setRows(res.rows)
      setTotal(res.total)
      setSummary(res.summary)
      setPage(p)
    } catch (e) {
      toastError(e, '评价加载失败')
    } finally {
      setLoading(false)
    }
  }, [from, to, type, minScore, keyword])

  useEffect(() => {
    void load(1)
  }, [load])

  useEffect(() => {
    client.artists
      .list({ page: 1, pageSize: 100 })
      .then((r) => setArtists(r.rows as ArtistLite[]))
      .catch(() => {})
  }, [])

  const submit = async (): Promise<void> => {
    const reviewType = fType === '__custom__' ? customType.trim() : fType
    if (artistId === '' || reviewType === '') {
      toast.error('请选择销售经理与评价类型')
      return
    }
    setBusy(true)
    try {
      await client.reviews.create(
        {
          artistId: Number(artistId),
          reviewType,
          score,
          ...(content.trim() !== '' ? { content: content.trim() } : {}),
          ...(reviewer.trim() !== '' ? { reviewer: reviewer.trim() } : {}),
        },
        idemKey('review'),
      )
      toast.success('评价已录入(只增不改)')
      setContent('')
      setReviewer('')
      setFormOpen(false)
      await load(1)
    } catch (e) {
      toastError(e, '录入失败')
    } finally {
      setBusy(false)
    }
  }

  const columns: Array<Column<ReviewRow>> = [
    { key: 'businessDate', header: '营业日' },
    { key: 'stageName', header: '销售经理', render: (r) => (r.stageName ?? r.realName) + '(' + (r.badgeNo ?? '无腰牌') + ')' },
    { key: 'reviewType', header: '类型', render: (r) => <StatusBadge label={r.reviewType ?? '—'} color="#00d4ff" /> },
    { key: 'score', header: '评分', render: (r) => <Stars n={r.score} /> },
    { key: 'content', header: '内容', render: (r) => <span className="text-xs">{r.content ?? '—'}</span> },
    { key: 'reviewer', header: '评价人', render: (r) => r.reviewer ?? '匿名' },
    { key: 'createdAt', header: '时间', render: (r) => r.createdAt.slice(5, 16).replace('T', ' ') },
  ]

  const maxDist = summary !== null ? Math.max(1, ...Object.values(summary.dist)) : 1

  return (
    <div>
      <PageHeader
        title="服务评价"
        desc="客人对销售经理的服务评价:前台代录/扫码评价落库;只增不改不删,统计按营业日区间"
        actions={<Button onClick={() => setFormOpen(!formOpen)}>{formOpen ? '收起' : '+ 录入评价'}</Button>}
      />

      {formOpen && (
        <Card className="p-4 space-y-3 max-w-2xl mb-3">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-fg-muted">销售经理(进行中上钟人员;选人器)</Label>
              <Button
                variant="outline"
                className="w-56 justify-start"
                onClick={() => { setReviewPickerOpen(true) }}
              >
                {(() => {
                  const a = artists.find((x) => String(x.id) === artistId)
                  return a !== undefined ? `${a.stageName ?? a.realName}(${a.badgeNo ?? '无腰牌'})` : '+ 选择上钟人员'
                })()}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-fg-muted">类型</Label>
              <SelectBox
                className="w-32"
                value={fType}
                onChange={(v) => setFType(v)}
                options={[...REVIEW_TYPES.map((t) => ({ value: t, label: t })), { value: '__custom__', label: '自定义…' }]}
              />
            </div>
            {fType === '__custom__' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-fg-muted">自定义类型</Label>
                <Input className="w-32" value={customType} onChange={(e) => setCustomType(e.target.value)} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-fg-muted">评分</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Button key={s} size="sm" variant={score === s ? 'default' : 'outline'} onClick={() => setScore(s)}>
                    {String(s)}★
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Input className="flex-1 min-w-[240px]" placeholder="评价内容(可空)" value={content} onChange={(e) => setContent(e.target.value)} />
            <Input className="w-40" placeholder="评价人(房号/称呼,可空)" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={busy} onClick={() => void submit()}>提交评价</Button>
          </div>
        </Card>
      )}

      {/* 统计 */}
      {summary !== null && (
        <div className="grid gap-3 md:grid-cols-[auto_auto_1fr] mb-3">
          <StatCard label="区间评价数" value={summary.count} tone="primary" />
          <StatCard
            label="均分"
            value={summary.count > 0 ? summary.avgScore.toFixed(2) : '—'}
            tone="success"
            hint="5 星制"
          />
          <Card className="p-4 space-y-1">
            <div className="text-xs text-fg-muted mb-1">星级分布</div>
            {([5, 4, 3, 2, 1] as const).map((s) => {
              const n = summary.dist[String(s) as keyof ReviewSummary['dist']]
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-8" style={{ color: SCORE_COLOR[s] }}>{String(s)}★</span>
                  <div className="flex-1 h-2 rounded bg-primary/10 overflow-hidden">
                    <div className="h-full rounded" style={{ width: String((n / maxDist) * 100) + '%', background: SCORE_COLOR[s] }} />
                  </div>
                  <span className="w-8 text-right text-fg-muted">{String(n)}</span>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* 筛选 */}
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-fg-muted">~</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <SelectBox
          className="w-28"
          value={type}
          onChange={(v) => setType(v)}
          options={[{ value: 'ALL', label: '全部类型' }, ...REVIEW_TYPES.map((t) => ({ value: t, label: t }))]}
        />
        <SelectBox
          className="w-28"
          value={minScore}
          onChange={(v) => setMinScore(v)}
          options={[{ value: 'ALL', label: '全部评分' }, { value: '4', label: '≥4★' }, { value: '3', label: '≥3★' }, { value: '1', label: '≥1★' }]}
        />
        <Input className="w-44" placeholder="艺名/腰牌/内容/评价人" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Button variant="outline" onClick={() => void load(1)}>查询</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={20} onPageChange={(p) => void load(p)} />
      <PersonPicker
        open={reviewPickerOpen}
        title="选择上钟人员(进行中上钟)"
        line="SELL"
        busyOnly
        onClose={() => { setReviewPickerOpen(false) }}
        onPick={(p) => {
          if (p !== null && !Array.isArray(p)) {
            setArtistId(String(p.id))
            setArtists((s) => (s.some((x) => x.id === p.id) ? s : [...s, { id: p.id, realName: p.realName, stageName: p.stageName, badgeNo: p.badgeNo }]))
          }
        }}
      />
    </div>
  )
}
