/**
 * 沟通群聊(销售端 H5;2026-11-07 web/H5 双端一致)
 * 群列表(店群+本人组别群;15s 轮询未读)→聊天室(3s 增量轮询;撤回/图片/@高亮;已读水位 localStorage)
 * hooks 全部顶层(useDidShow+useEffect timer;聊天室/列表由 active 分支渲染)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { chatGroups, chatMessages, chatSend, chatRetract, chatReact, errText } from '../../lib/api'

interface GroupRow {
  id: number
  name: string
  kind: string
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

function readMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('yyc3-chat-read') ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function writeRead(gid: number, lastId: number): void {
  try {
    const m = readMap()
    m[String(gid)] = Math.max(m[String(gid)] ?? 0, lastId)
    localStorage.setItem('yyc3-chat-read', JSON.stringify(m))
  } catch {
    /* 静默 */
  }
}

function myName(): string {
  try {
    return (JSON.parse(localStorage.getItem('leisure-web-auth') ?? '{}') as { state?: { name?: string } }).state?.name ?? ''
  } catch {
    return ''
  }
}

export default function Chat() {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [active, setActive] = useState<GroupRow | null>(null)
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [draft, setDraft] = useState('')
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg_, setMsg_] = useState('')
  const lastIdRef = useRef(0)
  const activeRef = useRef<GroupRow | null>(null)
  activeRef.current = active

  const loadGroups = useCallback(async (): Promise<void> => {
    try {
      const res = await chatGroups()
      setGroups(res.rows)
    } catch (e) {
      setMsg_(errText(e))
    }
  }, [])

  // 页面显示即刷新 + 15s 列表轮询(未读角标实时;列表/聊天室共用)
  useDidShow(() => {
    void loadGroups()
  })
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeRef.current === null) void loadGroups()
    }, 15_000)
    return () => clearInterval(timer)
  }, [loadGroups])

  // 聊天室 3s 增量轮询(active 存在时启用;ref 保稳定)
  useEffect(() => {
    if (active === null) return
    const timer = setInterval(() => {
      const g = activeRef.current
      if (g === null) return
      void chatMessages(g.id, lastIdRef.current)
        .then((res) => {
          if (res.rows.length === 0) return
          setMsgs((s) => {
            const known = new Set(s.map((m) => m.id))
            const fresh = res.rows.filter((m) => !known.has(m.id))
            if (fresh.length === 0) return s
            lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id))
            writeRead(g.id, lastIdRef.current)
            return [...s, ...fresh]
          })
        })
        .catch(() => undefined)
    }, 3000)
    return () => clearInterval(timer)
  }, [active])

  const openRoom = (g: GroupRow): void => {
    setActive(g)
    lastIdRef.current = 0
    setMsgs([])
    setPendingImages([])
    void chatMessages(g.id)
      .then((res) => {
        setMsgs(res.rows)
        lastIdRef.current = res.rows.length > 0 ? Math.max(...res.rows.map((m) => m.id)) : 0
        if (lastIdRef.current > 0) writeRead(g.id, lastIdRef.current)
      })
      .catch((e) => setMsg_(errText(e)))
  }

  const send = (): void => {
    const g = active
    if (g === null) return
    setBusy(true)
    chatSend(g.id, { content: draft.trim(), ...(pendingImages.length > 0 ? { images: pendingImages } : {}) })
      .then((m) => {
        setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]))
        lastIdRef.current = Math.max(lastIdRef.current, m.id)
        writeRead(g.id, lastIdRef.current)
        setDraft('')
        setPendingImages([])
      })
      .catch((e) => setMsg_(errText(e)))
      .finally(() => setBusy(false))
  }

  const react = (m: MsgRow, emoji: string): void => {
    const g = active
    if (g === null) return
    chatReact(g.id, m.id, emoji)
      .then((out) => setMsgs((s) => s.map((x) => (x.id === m.id ? { ...x, reactions: out.reactions } : x))))
      .catch((e) => setMsg_(errText(e)))
  }

  const retract = (m: MsgRow): void => {
    const g = active
    if (g === null) return
    chatRetract(g.id, m.id)
      .then(() => setMsgs((s) => s.map((x) => (x.id === m.id ? { ...x, type: 'RETRACTED', content: '已撤回', images: [] } : x))))
      .catch((e) => setMsg_(errText(e)))
  }

  const pickImage = (): void => {
    void Taro.chooseImage({ count: 1 })
      .then((r) => {
        const p = r.tempFilePaths[0]
        if (p === undefined) return
        if (typeof document === 'undefined') return // weapp 端后续对齐
        const img = new window.Image()
        img.onload = () => {
          const scale = Math.min(1, 640 / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
          setPendingImages((s) => (s.length >= 4 ? s : [...s, dataUrl]))
        }
        img.src = p
      })
      .catch(() => undefined)
  }

  if (active !== null) {
    return (
      <View className="mp-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
          <Button className="mp-btn" style={{ flex: '0 0 auto', padding: '2px 10px' }} onClick={() => { setActive(null); void loadGroups() }}>← 返回</Button>
          <Text style={{ fontSize: '14px', fontWeight: 700, color: '#e0f0ff' }}>{active.name}</Text>
          <Text className="mp-muted">{active.kind === 'STORE' ? '店群' : '组别群'}</Text>
        </View>
        <View style={{ flex: 1, overflowY: 'auto' }}>
          {msgs.map((m) => {
            const mine = m.senderScope === 'ADMIN' && m.senderName === myName()
            if (m.type === 'RETRACTED') {
              return (
                <View key={m.id} style={{ textAlign: 'center', margin: '4px 0' }}>
                  <Text className="mp-muted" style={{ fontSize: '11px' }}>已撤回</Text>
                </View>
              )
            }
            const mentionMe = m.content.includes('@' + myName())
            return (
              <View key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
                <View style={{ maxWidth: '80%', borderRadius: 16, padding: '6px 10px', background: mine ? 'rgba(0,212,255,0.14)' : 'rgba(139,155,180,0.12)', border: mentionMe && !mine ? '1px solid #f5a623' : '1px solid transparent' }}>
                  <Text className="mp-muted" style={{ fontSize: '10px' }}>{m.senderName} · {m.createdAt.slice(11, 16)}{mentionMe && !mine ? ' · @提及我' : ''}</Text>
                  {m.images.length > 0 && (
                    <View style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {m.images.map((img, i) => (
                        <Image key={i} src={img} mode='aspectFill' style={{ width: '120px', height: '120px', borderRadius: 8 }} onClick={() => setPreviewImg(img)} />
                      ))}
                    </View>
                  )}
                  {m.reactions !== undefined && m.reactions.length > 0 && (
                    <View style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {m.reactions.map((r) => (
                        <Text
                          key={r.emoji}
                          style={{ padding: '1px 8px', borderRadius: 999, border: '1px solid rgba(139,155,180,0.3)', fontSize: '11px', color: '#e0f0ff', background: 'rgba(139,155,180,0.08)' }}
                          onClick={() => { react(m, r.emoji) }}
                        >
                          {r.emoji} {String(r.by.length)}
                        </Text>
                      ))}
                    </View>
                  )}
                  {m.content !== '' && (
                    <Text style={{ fontSize: '13px', color: '#e0f0ff', wordBreak: 'break-all' }}>
                      {m.content.split(/(@[\u4e00-\u9fa5a-zA-Z0-9_]+)/g).map((part, i) =>
                        part.startsWith('@') ? <Text key={i} style={{ color: '#00d4ff', fontWeight: 700 }}>{part}</Text> : <Text key={i}>{part}</Text>,
                      )}
                    </Text>
                  )}
                  {m.type === 'TEXT' && (
                    <View style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      {['👍', '❤️', '🎉'].map((e) => (
                        <Text key={e} className="mp-muted" style={{ fontSize: '10px' }} onClick={() => { react(m, e) }}>{e}</Text>
                      ))}
                      {mine && Date.now() - new Date(m.createdAt).getTime() < 2 * 60_000 && (
                        <Text className="mp-muted" style={{ fontSize: '10px' }} onClick={() => { retract(m) }}>撤回</Text>
                      )}
                    </View>
                  )}
                  {mine && Date.now() - new Date(m.createdAt).getTime() < 2 * 60_000 && m.type === 'TEXT' && (
                    <Text className="mp-muted" style={{ fontSize: '10px' }} onClick={() => { retract(m) }}>
                      撤回
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
          {msgs.length === 0 && <Text className="mp-muted" style={{ textAlign: 'center', margin: '20px 0' }}>暂无消息,说第一句吧</Text>}
        </View>
        {previewImg !== null && (
          <View style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }} onClick={() => setPreviewImg(null)}>
            <Image src={previewImg} mode='aspectFit' style={{ width: '90vw', maxHeight: '75vh' }} />
          </View>
        )}
        <View style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(139,155,180,0.15)', alignItems: 'center' }}>
          <Button className="mp-btn" style={{ flex: '0 0 auto', padding: '2px 8px' }} onClick={() => { pickImage() }}>图</Button>
          <input
            value={draft}
            onInput={(e) => setDraft((e as unknown as { detail: { value: string } }).detail.value)}
            placeholder="输入消息…"
            style={{ flex: 1, height: '32px', borderRadius: 8, border: '1px solid rgba(139,155,180,0.3)', background: 'transparent', color: '#e0f0ff', padding: '0 8px', fontSize: '13px' }}
          />
          <Button className="mp-btn" style={{ flex: '0 0 auto' }} disabled={busy || (draft.trim() === '' && pendingImages.length === 0)} onClick={() => { send() }}>发送</Button>
        </View>
        {pendingImages.length > 0 && (
          <View style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {pendingImages.map((img, i) => (
              <Image key={i} src={img} mode='aspectFill' style={{ width: '48px', height: '48px', borderRadius: 6 }} onClick={() => setPendingImages((s) => s.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}
        {msg_ !== '' && <Text className="mp-warn">{msg_}</Text>}
      </View>
    )
  }

  return (
    <View className="mp-page">
      <View className="mp-card">
        <Text className="mp-title">沟通</Text>
        <Text className="mp-muted">店群全员可见;组别群=本组销售经理</Text>
        {msg_ !== '' && <Text className="mp-warn">{msg_}</Text>}
      </View>
      {groups.map((g) => {
        const read = readMap()[String(g.id)] ?? 0
        const unread = g.msgCount - read
        return (
          <View key={g.id} className="mp-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => { openRoom(g) }}>
            <View style={{ width: '40px', height: '40px', borderRadius: 999, background: 'rgba(0,212,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontWeight: 700, flexShrink: 0 }}>
              {g.name.slice(0, 1)}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: '13px', fontWeight: 600, color: '#e0f0ff' }}>{g.name}</Text>
              <Text className="mp-muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.lastPreview !== '' ? g.lastPreview : '暂无消息'}
              </Text>
            </View>
            <View style={{ position: 'relative', flexShrink: 0 }}>
              {unread > 0 && (
                <View style={{ position: 'absolute', top: -8, right: -6, minWidth: 16, height: 16, borderRadius: 999, background: '#ff3366', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {unread > 99 ? '99+' : String(unread)}
                </View>
              )}
              <Text className="mp-muted" style={{ fontSize: '10px' }}>{g.kind === 'STORE' ? '店群' : '组别'}</Text>
            </View>
          </View>
        )
      })}
      {groups.length === 0 && (
        <View className="mp-card">
          <Text className="mp-muted">暂无群组(管理员可建群)</Text>
        </View>
      )}
    </View>
  )
}
