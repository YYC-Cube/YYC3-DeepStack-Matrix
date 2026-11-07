/**
 * 沟通(/m/chat;Owner 申请 2026-11-04):群聊最小闭环
 * 群列表(店群全员+组别动态群)→ 聊天室(3s 轮询;WS 预留);管理端可建组别群
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { PageHeader } from '@/components/kit'

interface GroupRow {
  id: number
  name: string
  kind: 'STORE' | 'GROUP'
  msgCount: number
  lastAt: string | null
  lastPreview: string
}
interface ReactionGroup {
  emoji: string
  by: Array<{ scope: string; id: number; name: string }>
}
interface MsgRow {
  id: number
  senderScope: string
  senderId: number
  senderName: string
  content: string
  type: string
  images: string[]
  reactions: ReactionGroup[]
  createdAt: string
}

/** 本地已读水位(群 id → 最后已读消息 id;未读数=群消息总数-水位) */
function readMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('yyc3-chat-read') ?? '{}') as Record<string, number> } catch { return {} }
}
function writeRead(gid: number, lastId: number): void {
  try {
    const m = readMap()
    m[String(gid)] = Math.max(m[String(gid)] ?? 0, lastId)
    localStorage.setItem('yyc3-chat-read', JSON.stringify(m))
  } catch { /* localStorage 不可用静默 */ }
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
  /** WS 实时(优先)——连不上自动回落 3s 轮询 */
  const wsRef = useRef<WebSocket | null>(null)
  const [wsOk, setWsOk] = useState(false)
  const [pendingImages, setPendingImages] = useState<string[]>([])
  /** 图片消息点击放大预览 */
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  /** @ 点击定位成员卡(最近发言/入群信息) */
  const [memberCard, setMemberCard] = useState<{ name: string; count: number; lastAt: string | null; mine: boolean } | null>(null)
  const token = useAuthStore((s) => s.token)
  const myName = useAuthStore((s) => s.name)

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
    // 群列表轻轮询(15s):未读角标实时刷新(进聊天室走 WS 双模,列表页保持轻量)
    const timer = setInterval(() => { void loadGroups() }, 15_000)
    return () => clearInterval(timer)
  }, [loadGroups])

  // 聊天室轮询(3s;增量 after=lastId)
  useEffect(() => {
    if (active === null || wsOk) return
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
  }, [active, wsOk])

  // WS 实时通道(深化:连接→join 房间→onmessage 增量;失败静默回落轮询)
  useEffect(() => {
    if (active === null || token === null || token === '') return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    let ws: WebSocket
    try {
      ws = new WebSocket(proto + '://' + location.host + '/api/v1/ws/chat?token=' + encodeURIComponent(token))
    } catch {
      return
    }
    wsRef.current = ws
    ws.onopen = () => {
      setWsOk(true)
      ws.send(JSON.stringify({ event: 'chat:join', data: { groupId: active.id } }))
    }
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data)) as { event?: string; data?: MsgRow }
        if (payload.event === 'chat:react' && payload.data !== undefined) {
          const rid = payload.data.id
          const rr = payload.data.reactions
          setMsgs((s2) => s2.map((x) => (x.id === rid ? { ...x, reactions: rr } : x)))
        } else if (payload.event === 'chat:retract' && payload.data !== undefined) {
          const rid = payload.data.id
          setMsgs((s2) => s2.map((x) => (x.id === rid ? { ...x, type: 'RETRACTED', content: '已撤回', images: [] } : x)))
        } else if (payload.event === 'chat:message' && payload.data !== undefined) {
          const m = payload.data
          setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]))
          lastIdRef.current = Math.max(lastIdRef.current, m.id)
          try {
            const rm = JSON.parse(localStorage.getItem('yyc3-chat-read') ?? '{}') as Record<string, number>
            rm[String(active.id)] = Math.max(rm[String(active.id)] ?? 0, m.id)
            localStorage.setItem('yyc3-chat-read', JSON.stringify(rm))
          } catch { /* 静默 */ }
        }
      } catch { /* 非 JSON 静默 */ }
    }
    ws.onerror = () => { setWsOk(false) }
    ws.onclose = () => { setWsOk(false) }
    return () => {
      try { ws.send(JSON.stringify({ event: 'chat:leave', data: { groupId: active.id } })) } catch { /* 静默 */ }
      ws.close()
      wsRef.current = null
      setWsOk(false)
    }
  }, [active, token])

  const react = (m: MsgRow, emoji: string): void => {
    if (active === null) return
    void req<{ id: number; reactions: ReactionGroup[] }>('POST', '/chat/groups/' + String(active.id) + '/messages/' + String(m.id) + '/react', { emoji })
      .then((out) => {
        setMsgs((s2) => s2.map((x) => (x.id === m.id ? { ...x, reactions: out.reactions } : x)))
      })
      .catch((e) => toastError(e))
  }

  const retract = (m: MsgRow): void => {
    if (active === null) return
    void req('POST', '/chat/groups/' + String(active.id) + '/messages/' + String(m.id) + '/retract', {})
      .then(() => {
        setMsgs((s2) => s2.map((x) => (x.id === m.id ? { ...x, type: 'RETRACTED', content: '已撤回', images: [] } : x)))
      })
      .catch((e) => toastError(e))
  }

  const openRoom = (g: GroupRow): void => {
    setActive(g)
    lastIdRef.current = 0
    setMsgs([])
    setPendingImages([])
    void req<{ rows: MsgRow[] }>('GET', '/chat/groups/' + String(g.id) + '/messages')
      .then((res) => {
        setMsgs(res.rows)
        lastIdRef.current = res.rows.length > 0 ? Math.max(...res.rows.map((m) => m.id)) : 0
        if (lastIdRef.current > 0) writeRead(g.id, lastIdRef.current)
      })
      .catch((e) => toastError(e, '消息加载失败'))
  }

  async function send(): Promise<void> {
    if (active === null || draft.trim() === '') return
    setBusy(true)
    try {
      const m = await req<MsgRow>('POST', '/chat/groups/' + String(active.id) + '/messages', {
        content: draft.trim(),
        ...(pendingImages.length > 0 ? { images: pendingImages } : {}),
      })
      setPendingImages([])
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
                {m.images !== undefined && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {m.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="rounded-lg max-w-[180px] max-h-[180px] object-cover cursor-zoom-in"
                        onClick={() => { setPreviewImg(img) }}
                      />
                    ))}
                  </div>
                )}
                {m.type === 'RETRACTED' ? (
                  <div className="text-xs italic text-fg-muted">已撤回</div>
                ) : (
                  <>
                    {m.reactions !== undefined && m.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            className="px-1.5 py-0.5 rounded-full border border-line text-xs bg-fg-muted/10 hover:border-primary"
                            title={r.by.map((b) => b.name).join('、')}
                            onClick={() => { react(m, r.emoji) }}
                          >
                            {r.emoji} {String(r.by.length)}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.content !== '' && (
                      <div className="text-sm break-all whitespace-pre-wrap">
                        {m.content.split(/(@[\u4e00-\u9fa5a-zA-Z0-9_]+)/g).map((part, i) =>
                          part.startsWith('@') && part.length > 1 ? (
                            <span
                              key={i}
                              className="text-primary font-medium cursor-pointer hover:underline"
                              title="查看成员"
                              onClick={() => {
                                const name = part.slice(1)
                                const theirs = msgs.filter((x) => x.senderName === name)
                                setMemberCard({
                                  name,
                                  count: theirs.length,
                                  lastAt: theirs.length > 0 ? theirs[theirs.length - 1]!.createdAt.slice(0, 16).replace('T', ' ') : null,
                                  mine: name === myName,
                                })
                              }}
                            >
                              {part}
                            </span>
                          ) : (
                            <span key={i}>{part}</span>
                          ),
                        )}
                      </div>
                    )}
                    {m.type === 'TEXT' && (
                      <div className="flex gap-1 mt-0.5 items-center">
                        {['👍', '❤️', '🎉'].map((e) => (
                          <button key={e} className="text-[10px] text-fg-muted hover:text-primary" onClick={() => { react(m, e) }}>
                            {e}
                          </button>
                        ))}
                        {m.senderScope === 'ADMIN' && m.senderName === myName && Date.now() - new Date(m.createdAt).getTime() < 2 * 60_000 && (
                          <button
                            className="text-[10px] text-fg-muted hover:text-error"
                            onClick={() => retract(m)}
                          >
                            撤回
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {msgs.length === 0 && <div className="text-center text-xs text-fg-muted py-10">暂无消息,说第一句吧</div>}
        </div>
        <div className="flex gap-2 pt-2 border-t border-line items-center">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="m-chat-img"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f === undefined) return
              const reader = new FileReader()
              reader.onload = () => {
                const img = new Image()
                img.onload = () => {
                  const scale = Math.min(1, 640 / Math.max(img.width, img.height))
                  const canvas = document.createElement('canvas')
                  canvas.width = Math.round(img.width * scale)
                  canvas.height = Math.round(img.height * scale)
                  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
                  setPendingImages((s) => (s.length >= 4 ? s : [...s, dataUrl]))
                }
                img.src = String(reader.result)
              }
              reader.readAsDataURL(f)
            }}
          />
          <label
            htmlFor="m-chat-img"
            className="shrink-0 w-9 h-9 rounded-lg border border-line flex items-center justify-center cursor-pointer text-fg-muted hover:text-primary text-lg"
            title="发送图片(≤4 张)"
          >
            +
          </label>
          <button
            className="shrink-0 w-9 h-9 rounded-lg border border-line flex items-center justify-center cursor-pointer text-fg-muted hover:text-primary"
            title="提及某人(@名字)"
            onClick={() => setDraft((d) => d + '@')}
          >
            @
          </button>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入消息…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          />
          <Button disabled={busy || (draft.trim() === '' && pendingImages.length === 0)} onClick={() => { void send() }}>发送</Button>
        </div>
        {pendingImages.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {pendingImages.map((img, i) => (
              <span key={i} className="relative">
                <img src={img} alt="" className="w-14 h-14 rounded object-cover" />
                <button
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white text-xs leading-none"
                  onClick={() => setPendingImages((s) => s.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
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

      {/* 图片放大预览 */}
      <Dialog open={previewImg !== null} onOpenChange={(o) => { if (!o) setPreviewImg(null) }}>
        <DialogContent className="max-w-2xl">
          {previewImg !== null && (
            <img src={previewImg} alt="图片预览" className="w-full max-h-[75vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {/* @ 成员定位卡 */}
      <Dialog open={memberCard !== null} onOpenChange={(o) => { if (!o) setMemberCard(null) }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>成员 · {memberCard?.name ?? ''}</DialogTitle>
          </DialogHeader>
          {memberCard !== null && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-fg-muted/15 flex items-center justify-center text-sm text-fg-muted">
                  {memberCard.name.slice(-2)}
                </span>
                <div>
                  <div className="font-medium">{memberCard.name}{memberCard.mine ? '(我)' : ''}</div>
                  <div className="text-xs text-fg-muted">
                    {memberCard.count > 0 ? `本群发言 ${String(memberCard.count)} 条 · 最近 ${memberCard.lastAt ?? ''}` : '本群暂无发言记录'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-fg-muted">成员 roster 以群消息发言推断(组别群=本组销售经理;店群=全员)。</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberCard(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
