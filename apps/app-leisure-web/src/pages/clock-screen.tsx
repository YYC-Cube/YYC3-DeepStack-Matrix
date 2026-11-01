/**
 * A27 钟房大屏(P0-1):叫钟队列 + Web Speech 语音播报
 * 新 CALLED 自动朗读「请{艺名}到{房号}包厢」;叫钟/接钟/完成按钮
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, toastError } from '@/lib/api'
import { PageHeader } from '@/components/kit'

interface CallRow {
  id: number
  roomNo: string
  artistId: number
  stageName: string
  status: string
  voiceText?: string
  calledAt?: string
}

const STATUS_TEXT: Record<string, string> = {
  QUEUED: '排队中', CALLED: '已叫钟', ACCEPTED: '已接钟', DONE: '已完成', CANCELLED: '已取消',
}
const STATUS_COLOR: Record<string, string> = {
  QUEUED: '#ffaa00', CALLED: '#00d4ff', ACCEPTED: '#00ff88', DONE: '#8b9bb4', CANCELLED: '#ff6699',
}

function speak(text: string): void {
  const synth = window.speechSynthesis
  if (synth === undefined) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 0.9
  synth.speak(utter)
}

export default function ClockScreenPage(): React.JSX.Element {
  const [rows, setRows] = useState<CallRow[]>([])
  const [businessDate, setBusinessDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [artistId, setArtistId] = useState<string>('')
  const lastSpoken = useRef<number>(0)

  const load = useCallback(async (date?: string): Promise<void> => {
    try {
      const d = date ?? new Date().toISOString().slice(0, 10)
    const out = await client.calls.list({ businessDate: d })
      const fresh = out.rows.find((r) => r.status === 'CALLED' && r.calledAt !== null)
      if (fresh !== undefined && fresh.id !== lastSpoken.current && fresh.voiceText !== null && fresh.voiceText !== undefined) {
        speak(fresh.voiceText)
        lastSpoken.current = fresh.id
      }
      setRows(out.rows)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    void load(businessDate)
    const timer = setInterval(() => { void load(businessDate) }, 10_000)
    return () => { clearInterval(timer) }
  }, [businessDate, load])

  const setStatus = async (id: number, status: string): Promise<void> => {
    try {
      await client.calls.setStatus(id, status as 'CALLED' | 'ACCEPTED' | 'DONE' | 'CANCELLED')
      await load(businessDate)
    } catch (e) { toastError(e, '操作失败') }
  }

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="钟房大屏(P0-1 语音叫钟)" desc="新 CALLED 自动语音播报 · 10s 轮询" />
      <div className="flex gap-2 items-center">
        <Input
          className="w-40"
          value={businessDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setBusinessDate(e.target.value) }}
          placeholder="YYYY-MM-DD"
        />
        <Button variant="outline" onClick={() => { void load(businessDate) }}>刷新</Button>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {rows.map((r) => (
          <Card key={r.id} className="p-3 space-y-1" style={{ borderColor: STATUS_COLOR[r.status] ?? '#8b9bb4' }}>
            <div className="font-semibold">{r.stageName}</div>
            <div className="text-xs opacity-80">房号 {r.roomNo}</div>
            <div className="text-sm" style={{ color: STATUS_COLOR[r.status] ?? '#fff' }}>
              {STATUS_TEXT[r.status] ?? r.status}
            </div>
            <div className="flex gap-1 pt-1 flex-wrap">
              {r.status === 'QUEUED' && (
                <Button size="sm" variant="outline" onClick={() => { void setStatus(r.id, 'CALLED') }}>叫钟</Button>
              )}
              {r.status === 'CALLED' && (
                <Button size="sm" variant="outline" onClick={() => { void setStatus(r.id, 'ACCEPTED') }}>接钟</Button>
              )}
              {r.status === 'ACCEPTED' && (
                <Button size="sm" variant="outline" onClick={() => { void setStatus(r.id, 'DONE') }}>完成</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
