/**
 * 沟通(/m/chat;Owner 申请 2026-11-04):群聊最小闭环
 * 群列表(店群全员+组别动态群)→ 聊天室(3s 轮询;WS 预留);管理端可建组别群
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { PageHeader } from '@/components/kit'

interface GroupRow {
  id: number
  name: string
  kind: 'STORE' | 'GROUP'
  msgCount: number
  lastAt: string | null
  lastPreview: string
}
interface MsgRow {
  id: number
  senderScope: string
  senderId: number
  senderName: string
  content: string
  createdAt: string
}

export default function MChatPage(): React.JSX.Element {
  const [groups, setGroups] = useState<GroupRow[]>()
  const [active, setActive] = useState<GroupRow | null>(null)
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [draft, setDraft] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<{ name: string; groupId: string }>({ name: '', groupId: '' })
  const [groupsList, setGroupsList] = useState<Array<{ id: number; name: string }>>([])
  const [busy, setBusy] = useState(false)
  const lastIdRef = useRef(0)

  const loadGroups = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: GroupRow[] }>('GET', '/chat/groups')
      setGroups(res.rows)
    } catch (e) {
      toastError(e, '群加载失败')
    }
  }, [])

  useEffect(() => {
    void loadGroups()
    void req<Array<{ id: number; name: string }>>('GET', '/artist-groups?line=SELL').then((r) => setGroupsList(r)).catch(() => undefined)
  }, [loadGroups])

  // 聊天室轮询(3s;增量 after=lastId)
  useEffect(() => {
    if (active === null) return
    let stop = false
    const pull = async (): Promise<void> => {
      try {
        const res = await req<{ rows: MsgRow[] }>('GET', '/chat/groups/' + String(active.id) + '/messages?after=' + String(lastIdRef.current))
        if (stop || res.rows.length === 0) return
        setMsgs((s) => {
          const known = new Set(s.map((m) => m.id))
          const fresh = res.rows.filter((m) => !known.has(m.id))
          if (fresh.length === 0) return s
          lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id))
          return [...s, ...fresh]
        })
      } catch {
        /* 轮询静默 */
      }
    }
    void pull()
    const timer = setInterval(() => { void pull() }, 3000)
    return () => { stop = true; clearInterval(timer) }
  }, [active])

  const openRoom = (g: GroupRow): void => {
    setActive(g)
    lastIdRef.current = 0
    setMsgs([])
    void req<{ rows: MsgRow[] }>('GET', '/chat/groups/' + String(g.id) + '/messages')
      .then((res) => {
        setMsgs(res.rows)
        lastIdRef.current = res.rows.length > 0 ? Math.max(...res.rows.map((m) => m.id)) : 0
      })
      .catch((e) => toastError(e, '消息加载失败'))
  }

  async function send(): Promise<void> {
    if (active === null || draft.trim() === '') return
    setBusy(true)
    try {
      const m = await req<MsgRow>('POST', '/chat/groups/' + String(active.id) + '/messages', { content: draft.trim() })
      setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]))
      lastIdRef.current = Math.max(lastIdRef.current, m.id)
      setDraft('')
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  async function createGroup(): Promise<void> {
    if (createForm.name.trim() === '') {
      toast.error('群名称必填')
      return
    }
    setBusy(true)
    try {
      await req('POST', '/chat/groups', {
        name: createForm.name.trim(),
        ...(createForm.groupId !== '' ? { groupId: Number(createForm.groupId) } : {}),
      })
      toast.success('群已创建')
      setCreateOpen(false)
      setCreateForm({ name: '', groupId: '' })
      await loadGroups()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  if (active !== null) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)]">
        <div className="flex items-center gap-2 pb-2">
          <Button variant="outline" size="sm" onClick={() => { setActive(null); void loadGroups() }}>← 返回</Button>
          <span className="text-sm font-semibold">{active.name}</span>
          <span className="text-[10px] text-fg-muted">{active.kind === 'STORE' ? '店群' : '组别群'}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          {msgs.map((m) => (
            <div key={m.id} className={'flex ' + (m.senderScope === 'ADMIN' ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[78%] rounded-2xl px-3 py-1.5 ' + (m.senderScope === 'ADMIN' ? 'bg-primary/15' : 'bg-fg-muted/10')}>
                <div className="text-[10px] text-fg-muted">{m.senderName} · {m.createdAt.slice(11, 16)}</div>
                <div className="text-sm break-all whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {msgs.length === 0 && <div className="text-center text-xs text-fg-muted py-10">暂无消息,说第一句吧</div>}
        </div>
        <div className="flex gap-2 pt-2 border-t border-line">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入消息…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          />
          <Button disabled={busy || draft.trim() === ''} onClick={() => { void send() }}>发送</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="沟通"
        desc="店群全员可见;组别群=本组销售经理;3 秒轻轮询"
        actions={<Button onClick={() => { setCreateOpen(true) }}>+ 建群</Button>}
      />
      {(groups ?? []).map((g) => (
        <Card key={g.id} className="p-3 cursor-pointer active:opacity-70" onClick={() => { openRoom(g) }}>
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center text-primary text-sm font-bold">
              {g.name.slice(0, 1)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{g.name}</div>
              <div className="text-[11px] text-fg-muted truncate">{g.lastPreview !== '' ? g.lastPreview : '暂无消息'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-fg-muted">{g.msgCount > 0 ? String(g.msgCount) + ' 条' : ''}</div>
              <div className="text-[10px] text-fg-muted">{g.kind === 'STORE' ? '店群' : '组别'}</div>
            </div>
          </div>
        </Card>
      ))}
      {groups !== undefined && groups.length === 0 && (
        <Card className="p-6 text-center text-sm text-fg-muted">暂无群组,点击「+ 建群」</Card>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>建群</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-fg-muted">群名称</label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="如:销售一部沟通群" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg-muted">绑定组别(可选;绑定后仅该组销售经理可见)</label>
              <select
                className="w-full h-9 rounded border border-line bg-transparent px-2 text-sm"
                value={createForm.groupId}
                onChange={(e) => setCreateForm({ ...createForm, groupId: e.target.value })}
              >
                <option value="">不绑定(店群,全员可见)</option>
                {groupsList.map((g) => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button disabled={busy} onClick={() => { void createGroup() }}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
