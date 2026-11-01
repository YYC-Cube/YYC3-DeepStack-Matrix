/**
 * A19 实时状态看板:统计卡 + 名单(色点);10s 轮询(02 文档 §4.2,WS 预留)
 * 状态机:空闲/签到/上钟/串台/被选中(上钟/串台来自进行中场次)
 */
import { useCallback, useEffect, useState } from 'react'
import { Card, Input } from '@yyc3/ui'
import { client, toastError } from '@/lib/api'
import { RT_COLOR, RT_LABEL } from '@/lib/format'
import { PageHeader, StatusBadge, usePolling } from '@/components/kit'

interface RtArtist {
  artistId: number
  stageName: string
  badgeNo?: string
  groupId?: number
  status: string
  roomName?: string
}
interface RtResponse {
  counts: Record<string, number>
  artists: RtArtist[]
}

const ORDER = ['IDLE', 'CHECKED_IN', 'ON_STAGE', 'CROSS', 'SELECTED'] as const

export default function RealtimePage() {
  const [data, setData] = useState<RtResponse | undefined>()
  const [keyword, setKeyword] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string>('')

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await client.attendance.realtime({ keyword: keyword === '' ? undefined : keyword })
      setData(res as unknown as RtResponse)
      setUpdatedAt(new Date().toLocaleTimeString('zh-CN'))
    } catch (e) {
      toastError(e, '看板加载失败')
    }
  }, [keyword])

  useEffect(() => {
    void load()
  }, [load])
  usePolling(() => void load(), 10_000)

  return (
    <div>
      <PageHeader title="实时状态看板" desc={'事件驱动状态机 · 10s 轮询(WS 预留)' + (updatedAt !== '' ? ' · 更新于 ' + updatedAt : '')} />
      <div className="grid grid-cols-5 gap-3 mb-4">
        {ORDER.map((s) => (
          <Card key={s} className="p-4">
            <div className="flex items-center gap-2">
              <StatusBadge label={RT_LABEL[s]} color={RT_COLOR[s]} />
            </div>
            <p className="text-2xl font-semibold mt-2 text-[#e0f0ff]">{String(data?.counts[s] ?? 0)}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4 mb-4">
        <Input className="w-52" placeholder="艺名/腰牌号过滤" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {(data?.artists ?? []).map((a) => (
          <Card key={a.artistId} className="p-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RT_COLOR[a.status] ?? '#8b9bb4' }} />
            <div className="min-w-0">
              <p className="text-sm text-[#e0f0ff] truncate">
                {a.stageName}
                <span className="text-[#8b9bb4] ml-2 text-xs">{a.badgeNo ?? ''}</span>
              </p>
              <p className="text-xs text-[#8b9bb4] truncate">{a.roomName !== undefined ? '进行中 · ' + a.roomName : RT_LABEL[a.status]}</p>
            </div>
          </Card>
        ))}
      </div>
      {(data?.artists ?? []).length === 0 && (
        <Card className="p-10 text-center text-[#8b9bb4]">暂无在册艺人</Card>
      )}
    </div>
  )
}
