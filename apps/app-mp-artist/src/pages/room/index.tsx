/**
 * 我的包厢+自点单(/pages/room;2026-11-17 H5 自点单批;13 号《包厢操作与销售经理自点单》销售端半场)
 * 流程:myOrders().currentRoom(本人当前 OPEN 房账;不在房=空态)→ 在售商品目录(分类 Tab)→ 步进购物车 → 提交
 * 后端四重校验现成(房 OPEN 40908/本人在房 40909/在售/限额 40910;ARTIST scope 强制本人;Idempotency-Key 幂等)
 * 提交后订单=PLACED 待吧台送达(13 号完整履约形态);包厢卡含同伴/累计消费(13 号完整字段)
 * 离线兜底(2026-11-17b):room 数据 localStorage 先显后校准(弱网体验;同角标策略);申请更正/退单走 feedback 回馈通道
 */
import { useCallback, useState } from 'react'
import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { myOrders, goodsOnSale, placeSelfOrder, feedback, errText, loadAuth } from '../../lib/api'

interface GoodsLite {
  id: number
  name: string
  category: string | null
  unit: string | null
  salePrice: string | number
  imageUrl: string | null
}

interface RoomInfo {
  sessionId: number
  roomNo: string
  startAt: string
  peers: string[]
  consumption: number
}

const ROOM_CACHE_KEY = 'yyc3-mp-room-cache'

/** 分钟时长(X 小时 Y 分) */
function elapsed(startAt: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? String(h) + ' 小时 ' + String(m) + ' 分' : String(m) + ' 分钟'
}

function loadRoomCache(): RoomInfo | null {
  try {
    const raw = localStorage.getItem(ROOM_CACHE_KEY)
    if (raw === '' || raw === null) return null
    return JSON.parse(raw) as RoomInfo
  } catch { return null }
}

function saveRoomCache(r: RoomInfo | null): void {
  try {
    if (r === null) localStorage.removeItem(ROOM_CACHE_KEY)
    else localStorage.setItem(ROOM_CACHE_KEY, JSON.stringify(r))
  } catch { /* 静默 */ }
}

export default function RoomPage(): React.JSX.Element {
  const [authed, setAuthed] = useState(true)
  // 离线兜底:先显上次缓存,再校准(校准后落盘)
  const [room, setRoom] = useState<RoomInfo | null>(() => loadRoomCache())
  const [goods, setGoods] = useState<GoodsLite[]>([])
  const [cat, setCat] = useState('') // ''=全部
  const [cart, setCart] = useState<Record<number, number>>({})
  const [pendingCount, setPendingCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [correctDetail, setCorrectDetail] = useState('')

  const load = useCallback(async (): Promise<void> => {
    const auth = loadAuth()
    if (auth === null) { setAuthed(false); return }
    setAuthed(true)
    try {
      const me = await myOrders()
      setRoom(me.currentRoom)
      saveRoomCache(me.currentRoom)
      setPendingCount(me.orders.filter((o) => o.kind === 'SELF_ORDER' && o.status === 'PLACED').length)
      if (me.currentRoom !== null && goods.length === 0) {
        const list = await goodsOnSale()
        setGoods(list)
      }
    } catch (e) {
      // 弱网:保留缓存 room 继续展示(离线兜底),仅提示
      Taro.showToast({ title: errText(e), icon: 'none' })
    }
  }, [goods.length])

  useDidShow(() => {
    void load()
  })

  const cats = [''].concat([...new Set(goods.map((g) => g.category ?? '其他'))])
  const shown = cat === '' ? goods : goods.filter((g) => (g.category ?? '其他') === cat)
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)
  const cartTotal = goods.reduce((s, g) => s + (cart[g.id] ?? 0) * Number(g.salePrice), 0)

  async function submit(): Promise<void> {
    if (room === null) return
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([gid, q]) => ({ goodsId: Number(gid), qty: q }))
    if (items.length === 0) {
      Taro.showToast({ title: '请先选购商品', icon: 'none' })
      return
    }
    setBusy(true)
    try {
      const out = await placeSelfOrder({ sessionId: room.sessionId, items })
      Taro.showToast({ title: '下单成功 ¥' + String(out.totalAmount) + ' 待送达', icon: 'success' })
      setCart({})
      await load()
    } catch (e) {
      Taro.showToast({ title: errText(e), icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  async function submitCorrection(): Promise<void> {
    if (room === null) return
    if (correctDetail.trim() === '') {
      Taro.showToast({ title: '请填写说明', icon: 'none' })
      return
    }
    setBusy(true)
    try {
      await feedback({
        module: '包厢更正/退单',
        title: '包厢 ' + room.roomNo + ' 更正/退单申请',
        detail: correctDetail.trim() + '(房账 #' + String(room.sessionId) + ';累计消费 ¥' + String(room.consumption) + ')',
      })
      Taro.showToast({ title: '已提交,管理端将尽快处理', icon: 'none' })
      setCorrectOpen(false)
      setCorrectDetail('')
    } catch (e) {
      Taro.showToast({ title: errText(e), icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <View className="mp-page">
        <View className="mp-card">
          <Text className="mp-title">我的包厢</Text>
          <Text className="mp-muted">请先完成档案绑定。</Text>
          <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/bind/index' })}>去绑定</Button>
        </View>
      </View>
    )
  }

  return (
    <View className="mp-page">
      {/* 包厢卡(在房) / 空态 */}
      {room !== null ? (
        <View className="mp-card">
          <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Text style={{ fontSize: '18px' }}>🎱</Text>
            <View style={{ flex: 1 }}>
              <Text className="mp-title">{room.roomNo} · 我的包厢</Text>
              <Text className="mp-muted">已开 {elapsed(room.startAt)} · 在场可点单入房账</Text>
            </View>
            {pendingCount > 0 && (
              <Text style={{ fontSize: '11px', color: '#f5a623', background: 'rgba(245,166,35,0.12)', borderRadius: '10px', padding: '3px 8px' }}>
                待送达 {String(pendingCount)}
              </Text>
            )}
          </View>
          {/* 13 号完整字段:房内同伴 */}
          {room.peers.length > 0 && (
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {room.peers.map((p) => (
                <Text key={p} style={{ fontSize: '11px', color: '#00d4ff', background: 'rgba(0,212,255,0.08)', borderRadius: '10px', padding: '3px 10px' }}>
                  👤 {p}
                </Text>
              ))}
            </View>
          )}
          {/* 累计消费 */}
          <View style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#8b9bb4', flex: 1 }}>本房累计消费(含待送达)</Text>
            <Text style={{ fontSize: '16px', fontWeight: 700, color: '#e0f0ff' }}>¥{String(room.consumption)}</Text>
          </View>
          {/* 申请更正/退单(走 feedback 回馈通道;管理端收到后人工处理) */}
          {correctOpen ? (
            <View style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,212,255,0.1)' }}>
              <Text className="mp-muted" style={{ display: 'block' }}>说明问题(如:数量错了/多点了/不要了/价格异议):</Text>
              <Input
                value={correctDetail}
                onInput={(e) => setCorrectDetail(e.detail.value)}
                placeholder="一句话说明要更正/退的内容"
                style={{ marginTop: '8px' }}
              />
              <View style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <Button className="mp-btn" style={{ flex: 1 }} disabled={busy} onClick={() => { void submitCorrection() }}>提交申请</Button>
                <Button className="mp-btn-outline" onClick={() => setCorrectOpen(false)}>取消</Button>
              </View>
            </View>
          ) : (
            <Button className="mp-btn-outline" style={{ marginTop: '10px' }} onClick={() => setCorrectOpen(true)}>申请更正/退单</Button>
          )}
        </View>
      ) : (
        <View className="mp-card">
          <Text className="mp-title">我的包厢</Text>
          <Text className="mp-muted">当前不在任何包厢;开房后可自助点单(商品入房账,关房一并结算)。</Text>
        </View>
      )}

      {/* 商品目录(分类 Tab;仅在售) */}
      {room !== null && (
        <View className="mp-card">
          <View style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {cats.map((c) => (
              <Text
                key={c}
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: '1px solid ' + (cat === c ? '#00d4ff' : 'rgba(0,212,255,0.15)'),
                  color: cat === c ? '#00d4ff' : '#8b9bb4',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setCat(c)}
              >
                {c === '' ? '全部' : c}
              </Text>
            ))}
          </View>
          {shown.map((g) => {
            const q = cart[g.id] ?? 0
            return (
              <View key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                {g.imageUrl !== null && g.imageUrl !== ''
                  ? <Image src={g.imageUrl} style={{ width: '44px', height: '44px', borderRadius: '8px' }} mode='aspectFill' />
                  : <View style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(0,212,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#8b9bb4' }}>{g.name.slice(0, 1)}</Text>
                  </View>}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: '13px', color: '#e0f0ff' }}>{g.name}</Text>
                  <Text className="mp-muted" style={{ display: 'block' }}>¥{String(g.salePrice)}{g.unit !== null && g.unit !== '' ? '/' + g.unit : ''}</Text>
                </View>
                <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text
                    style={{ width: '26px', height: '26px', borderRadius: '13px', border: '1px solid rgba(0,212,255,0.3)', color: '#8b9bb4', textAlign: 'center', lineHeight: '24px', fontSize: '14px' }}
                    onClick={() => { if (q > 0) setCart({ ...cart, [g.id]: q - 1 }) }}
                  >−</Text>
                  <Text style={{ width: '24px', textAlign: 'center', fontSize: '13px', color: '#e0f0ff' }}>{String(q)}</Text>
                  <Text
                    style={{ width: '26px', height: '26px', borderRadius: '13px', background: 'rgba(0,212,255,0.15)', color: '#00d4ff', textAlign: 'center', lineHeight: '24px', fontSize: '14px' }}
                    onClick={() => setCart({ ...cart, [g.id]: q + 1 })}
                  >+</Text>
                </View>
              </View>
            )
          })}
          {goods.length === 0 && <Text className="mp-muted">暂无在售商品;请联系管理员上架。</Text>}

          {/* 购物车条 */}
          {cartCount > 0 && (
            <View style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,212,255,0.12)' }}>
              <Text style={{ flex: 1, fontSize: '13px', color: '#e0f0ff' }}>
                已选 {String(cartCount)} 件 · 合计 <Text style={{ color: '#00d4ff', fontWeight: 700 }}>¥{String(Math.round(cartTotal * 100) / 100)}</Text>
              </Text>
              <Button className="mp-btn" style={{ margin: 0, width: 'auto', padding: '0 18px' }} disabled={busy} onClick={() => { void submit() }}>
                提交点单
              </Button>
            </View>
          )}
        </View>
      )}

      <Text className="mp-muted" style={{ textAlign: 'center', display: 'block', padding: '8px 0' }}>
        点单计入房账,关房时随结算单一并结算;限额与在售由后台校验
      </Text>
    </View>
  )
}
