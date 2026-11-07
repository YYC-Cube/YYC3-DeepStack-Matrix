/**
 * 任务中心(销售端本人任务进度;2026-11-07 web/H5 双端一致)
 * 数据=GET /tasks(ARTIST scope 后端自动过滤本人);进度条+达标✅;周期标签
 */
import { useCallback, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { myTasks, errText } from '../../lib/api'

interface TaskRow {
  id: number
  type: string
  title: string
  targetName: string
  targetCount: number
  progress: number
  rawProgress: number
  recurrence: string
  startAt: string
  endAt: string
}

const TYPE_LABEL: Record<string, string> = { BOOKING: '订房任务', ORDER: '点餐任务' }

export default function Tasks() {
  const [rows, setRows] = useState<TaskRow[]>([])
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await myTasks()
      setRows(res.rows)
      setMsg('')
    } catch (e) {
      setMsg(errText(e))
    } finally {
      setLoaded(true)
    }
  }, [])

  useDidShow(() => {
    void load()
  })

  const done = rows.filter((r) => r.rawProgress >= r.targetCount).length

  return (
    <View className="mp-page">
      <View className="mp-card">
        <Text className="mp-title">我的任务</Text>
        {rows.length > 0 && (
          <Text className="mp-muted" style={{ color: done === rows.length ? '#37d67a' : '#f5a623' }}>
            {done === rows.length ? '✅ 全部达标' : `进行中 ${done}/${String(rows.length)} 达标`}
          </Text>
        )}
        {msg !== '' && <Text className="mp-warn">{msg}</Text>}
        {loaded && rows.length === 0 && msg === '' && <Text className="mp-muted">暂无进行中的任务</Text>}
      </View>

      {rows.map((t) => {
        const pct = t.targetCount > 0 ? Math.min(100, Math.round((t.rawProgress / t.targetCount) * 100)) : 0
        const ok = t.rawProgress >= t.targetCount
        return (
          <View key={t.id} className="mp-card">
            <View style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Text className="mp-txn-badge" style={{ background: t.type === 'BOOKING' ? '#7b8cff' : '#f5a623' }}>{TYPE_LABEL[t.type] ?? t.type}</Text>
              {t.recurrence === 'DAILY' && <Text className="mp-muted">每日</Text>}
              {t.recurrence === 'WEEKLY' && <Text className="mp-muted">每周</Text>}
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#e0f0ff', flex: 1 }}>{t.title}</Text>
            </View>
            <Text className="mp-muted" style={{ marginTop: '2px' }}>{t.startAt.slice(0, 10)} ~ {t.endAt.slice(0, 10)}</Text>
            <View style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <View style={{ flex: 1, height: '8px', borderRadius: 999, background: 'rgba(139,155,180,0.15)', overflow: 'hidden' }}>
                <View style={{ width: `${String(pct)}%`, height: '100%', borderRadius: 999, background: ok ? '#37d67a' : 'linear-gradient(90deg,#00d4ff,#7b8cff)', transition: 'width .4s' }} />
              </View>
              <Text style={{ fontSize: '12px', color: ok ? '#37d67a' : '#e0f0ff', fontVariantNumeric: 'tabular-nums' }}>
                {String(t.rawProgress)}/{String(t.targetCount)}{ok ? ' ✅' : ''}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}
