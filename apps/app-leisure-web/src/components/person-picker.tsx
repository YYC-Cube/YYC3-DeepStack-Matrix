/**
 * PersonPicker 统一选人器(2026-11-04 Owner 裁决:人员 100+,开房/送花/评价/分账对象等一切选人场景统一本件)
 * - 分组下拉(条线隔离:line=SELL/RESOURCE)→ 人名下拉/网格 → 搜索(姓名/中文首字母/腰牌/手机,任一项自动匹配)
 * - 仅显示「当前未上钟」候选(可关)· 头像显示(avatarKeys.photo)
 * - 数据源:/artists?line=…&pageSize=200 + /attendance/realtime(排除在房)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { pinyin } from 'pinyin-pro'

export interface PickedPerson {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
  phone: string | null
  groupId: number | null
  groupName: string | null
  levelId: number | null
  levelName: string | null
  avatar: string | null
}

interface ArtistRow {
  id: number
  realName: string
  stageName?: string | null
  badgeNo?: string | null
  phone?: string | null
  groupId?: number | null
  levelId?: number | null
  avatarKeys?: { photo?: string } | null
  group?: { id: number; name: string } | null
  level?: { id: number; name: string } | null
}

interface GroupRow {
  id: number
  name: string
}

function initialsOf(name: string): string {
  try {
    return pinyin(name, { pattern: 'first', toneType: 'none' }).replace(/\s+/g, '').toUpperCase()
  } catch {
    return ''
  }
}

export default function PersonPicker(props: {
  open: boolean
  title?: string
  line?: 'SELL' | 'RESOURCE'
  /** true=排除进行中上钟(开房/上钟场景);false=不过滤 */
  excludeBusy?: boolean
  /** true=只显示进行中上钟人员(送花/服务评价等「关于上钟人员」场景) */
  busyOnly?: boolean
  multiple?: boolean
  onClose: () => void
  onPick: (p: PickedPerson | PickedPerson[]) => void
}): React.JSX.Element {
  const [rows, setRows] = useState<ArtistRow[]>()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [groupId, setGroupId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [pickedIds, setPickedIds] = useState<number[]>([])
  const [busyIds, setBusyIds] = useState<number[]>([])

  const load = useCallback(async (): Promise<void> => {
    try {
      const line = props.line ?? 'SELL'
      const [res, groupsRes] = await Promise.all([
        req<{ rows: ArtistRow[] }>('GET', '/artists?line=' + line + '&pageSize=200&auditStatus=APPROVED'),
        req<GroupRow[]>('GET', '/artist-groups?line=' + line),
      ])
      setRows(res.rows)
      setGroups(groupsRes)
      // 未上钟过滤:realtime 里 ON_STAGE/SELECTED 的排除
      if (props.excludeBusy !== false) {
        try {
          const rt = await req<{ artists: Array<{ artistId: number; status: string }> }>('GET', '/attendance/realtime')
          setBusyIds(rt.artists.filter((a) => a.status === 'ON_STAGE' || a.status === 'SELECTED' || a.status === 'CROSS').map((a) => a.artistId))
        } catch {
          setBusyIds([])
        }
      } else {
        setBusyIds([])
      }
    } catch (e) {
      toastError(e, '人员加载失败')
    }
  }, [props.line, props.excludeBusy])

  useEffect(() => {
    if (props.open) void load()
  }, [props.open, load])

  const kw = keyword.trim().toLowerCase()
  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (groupId !== '' && String(r.groupId ?? '') !== groupId) return false
      if (props.busyOnly === true) {
        if (!busyIds.includes(r.id)) return false
      } else if (props.excludeBusy !== false) {
        if (busyIds.includes(r.id)) return false
      }
      if (kw === '') return true
      const py = initialsOf(r.realName)
      return (
        r.realName.toLowerCase().includes(kw) ||
        py.toLowerCase().includes(kw) ||
        (r.badgeNo ?? '').toLowerCase().includes(kw) ||
        (r.phone ?? '').includes(keyword.trim()) ||
        (r.stageName ?? '').toLowerCase().includes(kw)
      )
    })
  }, [rows, groupId, kw, keyword, busyIds])

  function confirm(): void {
    const picked = (rows ?? []).filter((r) => pickedIds.includes(r.id)).map((r) => ({
      id: r.id,
      realName: r.realName,
      stageName: r.stageName ?? null,
      badgeNo: r.badgeNo ?? null,
      phone: r.phone ?? null,
      groupId: r.groupId ?? null,
      groupName: r.group?.name ?? null,
      levelId: r.levelId ?? null,
      levelName: r.level?.name ?? null,
      avatar: r.avatarKeys?.photo ?? null,
    }))
    props.onPick(props.multiple === true ? picked : (picked[0] ?? null))
    setPickedIds([])
    props.onClose()
  }

  return (
    <Dialog open={props.open} onOpenChange={(o) => { if (!o) { setPickedIds([]); props.onClose() } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.title ?? '选择人员'}<span className="text-xs text-fg-muted ml-2">姓名 / 首字母 / 腰牌 / 手机 任一项可搜索</span></DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2">
          <select
            className="h-9 rounded border border-line bg-transparent px-2 text-sm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">全部分组</option>
            {groups.map((g) => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索:姓名 / 拼音首字母(如 zhl) / 腰牌 / 手机号" />
        </div>
        <div className="max-h-80 overflow-auto rounded border border-line divide-y">
          {filtered.length === 0 && <div className="p-4 text-xs text-fg-muted text-center">无候选(已过滤进行中上钟/未审核)</div>}
          {filtered.map((r) => {
            const on = pickedIds.includes(r.id)
            return (
              <div
                key={r.id}
                className={'flex items-center gap-3 px-3 py-2 cursor-pointer ' + (on ? 'bg-primary/10' : 'hover:bg-fg-muted/5')}
                onClick={() => {
                  if (props.multiple === true) {
                    setPickedIds((s) => (on ? s.filter((x) => x !== r.id) : [...s, r.id]))
                  } else {
                    setPickedIds([r.id])
                  }
                }}
              >
                {r.avatarKeys?.photo ? (
                  <img src={r.avatarKeys.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-fg-muted/15 flex items-center justify-center text-xs text-fg-muted">
                    {r.realName.slice(-2)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.realName}{r.stageName !== null && r.stageName !== undefined && r.stageName !== '' ? `(${r.stageName})` : ''}</div>
                  <div className="text-[11px] text-fg-muted">
                    {r.group?.name ?? '未分组'} · {r.level?.name ?? '未定级'}{r.badgeNo ? ` · ${r.badgeNo}` : ''}
                  </div>
                </div>
                <div className="text-[11px] text-fg-muted">{initialsOf(r.realName)}</div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <span className="text-xs text-fg-muted mr-auto">{String(filtered.length)} 人 · 已选 {String(pickedIds.length)}</span>
          <Button variant="outline" onClick={() => { setPickedIds([]); props.onClose() }}>取消</Button>
          <Button disabled={pickedIds.length === 0} onClick={() => { void confirm() }}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
