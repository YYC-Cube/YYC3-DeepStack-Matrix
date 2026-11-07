/**
 * 任务中心(销售端本人任务进度;2026-11-07 web/H5 双端一致)
 * 数据=GET /tasks(ARTIST scope 后端自动过滤本人);进度条+达标✅;周期标签
 * WS 实时化(服务端 task:changed 定向推送→即时刷新;断线自动回落 15s 轻轮询;离线缓存不变)
 * 任务详情(#taskN 抄送卡 taskId 参数直达;列表行点击亦可;详情弹层=完整指标)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { apiBase, loadAuth, myTasks, errText } from '../../lib/api'

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
  const { params } = useRouter()
  /** #taskN 抄送卡带来的直达目标(仅首次加载消费) */
  const focusId = params.taskId !== undefined && /^\d+$/.test(String(params.taskId)) ? Number(params.taskId) : null
  const focusConsumedRef = useRef(false)
  const [rows, setRows] = useState<TaskRow[]>([])
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)

  const load = useCallback(async (): Promise<void> => {
    // 离线缓存优先(H5 弱网可用;刷新成功后覆盖)
    try {
      const cached = JSON.parse(localStorage.getItem('yyc3-tasks-cache') ?? 'null') as TaskRow[] | null
      if (cached !== null && Array.isArray(cached) && cached.length > 0) setRows(cached)
    } catch { /* 静默 */ }
    try {
      const res = await myTasks()
      setRows(res.rows)
      setMsg('')
      try { localStorage.setItem('yyc3-tasks-cache', JSON.stringify(res.rows)) } catch { /* 静默 */ }
      // #taskN 直达:仅首次消费;目标不在列表(已达标归档/取消/非本人)给提示
      if (focusId !== null && !focusConsumedRef.current) {
        focusConsumedRef.current = true
        if (res.rows.some((r) => r.id === focusId)) setShowDetail(focusId)
        else setMsg('任务 #' + String(focusId) + ' 不在进行中列表(可能已达标归档或已取消)')
      }
    } catch (e) {
      setMsg(errText(e))
    } finally {
      setLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useDidShow(() => {
    void load()
  })

  // WS 实时通道(优先):下发/取消/达标/周期重建均触发 task:changed→即时刷新
  const wsOkRef = useRef(false)
  useEffect(() => {
    if (typeof WebSocket === 'undefined') return // weapp 端暂走轮询
    const auth = loadAuth()
    if (auth === null) return
    let ws: WebSocket
    try {
      ws = new WebSocket(apiBase().replace(/^http/, 'ws') + '/ws/chat?token=' + encodeURIComponent(auth.token))
    } catch {
      return
    }
    ws.onopen = () => { wsOkRef.current = true }
    ws.onmessage = (ev) => {
      try {
        const p = JSON.parse(String(ev.data)) as { event?: string }
        if (p.event === 'task:changed') void load()
      } catch { /* 非 JSON 静默 */ }
    }
    ws.onclose = () => { wsOkRef.current = false }
    ws.onerror = () => { wsOkRef.current = false }
    return () => {
      wsOkRef.current = false
      try { ws.close() } catch { /* 已断 */ }
    }
  }, [load])

  // 轮询兜底(WS 未连通时 15s 轻轮询;连通后不重复打)
  useEffect(() => {
    const t = setInterval(() => {
      if (!wsOkRef.current) void load()
    }, 15_000)
    return () => clearInterval(t)
  }, [load])

  const done = rows.filter((r) => r.rawProgress >= r.targetCount).length
  const detail = showDetail !== null ? rows.find((r) => r.id === showDetail) ?? null : null

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
          <View key={t.id} className="mp-card" onClick={() => { setShowDetail(t.id) }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Text className="mp-txn-badge" style={{ background: t.type === 'BOOKING' ? '#7b8cff' : '#f5a623' }}>{TYPE_LABEL[t.type] ?? t.type}</Text>
              {t.recurrence === 'DAILY' && <Text className="mp-muted">每日</Text>}
              {t.recurrence === 'WEEKLY' && <Text className="mp-muted">每周</Text>}
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#e0f0ff', flex: 1 }}>{t.title}</Text>
              <Text className="mp-muted" style={{ fontSize: '11px' }}>详情 ›</Text>
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

      {detail !== null && (
        <View
          style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}
          onClick={() => { setShowDetail(null) }}
        >
          <View
            style={{ background: 'rgba(8,17,38,0.98)', border: '1px solid rgba(139,155,180,0.25)', borderRadius: 12, padding: '14px', width: '86vw', maxHeight: '70vh' }}
            onClick={(e) => { e.stopPropagation() }}
          >
            <View style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Text className="mp-txn-badge" style={{ background: detail.type === 'BOOKING' ? '#7b8cff' : '#f5a623' }}>{TYPE_LABEL[detail.type] ?? detail.type}</Text>
              <Text style={{ fontSize: '14px', fontWeight: 700, color: '#e0f0ff', flex: 1 }}>{detail.title}</Text>
              <Text className="mp-muted" style={{ fontSize: '16px', padding: '0 4px' }} onClick={() => { setShowDetail(null) }}>×</Text>
            </View>
            <Text className="mp-muted" style={{ marginTop: '6px', display: 'block' }}>
              对象:{detail.targetName} · {detail.recurrence === 'DAILY' ? '每日重建' : detail.recurrence === 'WEEKLY' ? '每周重建' : '单次'}
            </Text>
            <Text className="mp-muted" style={{ display: 'block', marginTop: '2px' }}>
              周期:{detail.startAt.slice(0, 10)} ~ {detail.endAt.slice(0, 10)}
            </Text>
            {(() => {
              const pct = detail.targetCount > 0 ? Math.min(100, Math.round((detail.rawProgress / detail.targetCount) * 100)) : 0
              const ok = detail.rawProgress >= detail.targetCount
              return (
                <View>
                  <View style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <View style={{ flex: 1, height: '10px', borderRadius: 999, background: 'rgba(139,155,180,0.15)', overflow: 'hidden' }}>
                      <View style={{ width: `${String(pct)}%`, height: '100%', borderRadius: 999, background: ok ? '#37d67a' : 'linear-gradient(90deg,#00d4ff,#7b8cff)' }} />
                    </View>
                    <Text style={{ fontSize: '13px', color: ok ? '#37d67a' : '#e0f0ff', fontVariantNumeric: 'tabular-nums' }}>{String(pct)}%</Text>
                  </View>
                  <Text className="mp-muted" style={{ display: 'block', marginTop: '6px' }}>
                    完成度 {String(detail.rawProgress)}/{String(detail.targetCount)}{ok ? ' · 已达标 🎉' : ' · 进行中'}
                  </Text>
                </View>
              )
            })()}
            <Text className="mp-muted" style={{ fontSize: '10px', display: 'block', marginTop: '10px' }}>
              群聊任务抄送卡尾缀 #task{String(detail.id)} 可直达本详情;进度实时(WS 推送)。
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
