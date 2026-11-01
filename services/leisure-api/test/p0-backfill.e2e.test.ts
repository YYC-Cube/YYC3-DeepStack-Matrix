/**
 * P0 缺失回补 e2e(需求全集 §12):
 * - P0-2 时段差异化定价:槽位覆盖基础单价(离线上钟回拨 2 小时 → 2×槽位价)
 * - P0-1 叫钟队列:创建/语音文本/状态流转(QUEUED→CALLED→DONE)
 * - 双轨对账:导入对侧日报 → 逐指标 MATCHED
 * 运行:同 room-account 套件环境变量;服务须以最新 leisure-core dist 运行
 */
import { beforeAll, describe, expect, it } from 'vitest'

const BASE = 'http://127.0.0.1:3001/api/v1'
const PHONE = process.env.LEISURE_E2E_PHONE
const PASSWORD = process.env.LEISURE_E2E_PASSWORD

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  bearer?: string,
): Promise<{ http: number; body: { code: number; msg: string; data: T } }> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer !== undefined && bearer !== '' ? { Authorization: 'Bearer ' + bearer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as Envelope<T> | null
  return { http: res.status, body: json ?? { code: res.status, msg: 'no body', data: null as T } }
}

interface Envelope<T> {
  code: number
  msg: string
  data: T
}

let adminToken = ''
let artistId = 0
let roomId = 0
let roomTypeId = 0

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('P0 缺失回补(时段定价/叫钟/离线/对账)', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', {
      phone: PHONE,
      password: PASSWORD,
    })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')

    const rooms = await api<{ rows: Array<{ id: number; roomNo: string; roomTypeId: number; status: string }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    const target = rooms.body.data.rows.find((r) => r.roomNo === 'B01')
    roomId = target!.id
    roomTypeId = target!.roomTypeId
    const artists = await api<{ rows: Array<{ id: number; badgeNo?: string }> }>(
      'GET',
      '/artists?pageSize=50',
      undefined,
      adminToken,
    )
    artistId = artists.body.data.rows.find((a) => a.badgeNo === 'A1001')!.id
  })

  it('P0-2 时段定价:创建全天槽位(200 元)→ 离线上钟回拨 2 小时 → 台费=2×200', async () => {
    const upsert = await api<{ id: number }>(
      'POST',
      '/stage-fee/pricing-slots',
      {
        roomTypeId,
        name: 'E2E-全天档',
        startClock: '00:00',
        endClock: '23:59',
        unitPrice: 200,
        priority: 99,
        daysOfWeek: [],
      },
      adminToken,
    )
    expect(upsert.body.code).toBe(0)

    const start = new Date(Date.now() - 2 * 3600_000).toISOString()
    const end = new Date().toISOString()
    const off = await api<{ sessionId: number; feeAmount: number }>(
      'POST',
      '/sessions/offline',
      { clientOpId: 'e2e-offline-' + String(Date.now()), artistId, roomId, startAt: start, endAt: end },
      adminToken,
    )
    expect(off.body.code).toBe(0)
    // 快照单价被槽位覆盖为 200;2 小时(无进位剩余)→ 400
    expect(off.body.data.feeAmount).toBe(400)
  })

  it('P0-1 叫钟:创建→语音文本→CALLED→DONE', async () => {
    const created = await api<{ callId: number; voiceText: string }>(
      'POST',
      '/room-calls',
      { roomId, artistId },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    expect(created.body.data.voiceText).toContain('B01')

    const called = await api<{ ok: true }>(
      'POST',
      '/room-calls/' + String(created.body.data.callId) + '/status',
      { status: 'CALLED' },
      adminToken,
    )
    expect(called.body.code).toBe(0)

    const list = await api<{ rows: Array<{ status: string }> }>(
      'GET',
      '/room-calls?businessDate=' + new Date().toISOString().slice(0, 10) + '&status=CALLED',
      undefined,
      adminToken,
    )
    expect(list.body.data.rows.length).toBeGreaterThanOrEqual(1)

    const done = await api<{ ok: true }>(
      'POST',
      '/room-calls/' + String(created.body.data.callId) + '/status',
      { status: 'DONE' },
      adminToken,
    )
    expect(done.body.code).toBe(0)
  })

  it('双轨对账:导入对侧日报 → 逐指标 MATCHED', async () => {
    // 首查拿自算指标(legacy 未导入 → OPEN),按自算值导入对侧 → 全 MATCHED(方案甲自洽)
    const bd = new Date().toISOString().slice(0, 10)
    const first = await api<{
      rows: Array<{ metric: string; selfValue: number; legacyValue: number; status: string }>
      overall: string
      selfMetrics: Record<string, number>
    }>('GET', '/reports/recon?businessDate=' + bd, undefined, adminToken)
    expect(first.body.code).toBe(0)

    const imp = await api<{ rows: Array<{ metric: string; status: string }> }>(
      'POST',
      '/reports/recon/legacy',
      { businessDate: bd, metrics: first.body.data.selfMetrics },
      adminToken,
    )
    expect(imp.body.code).toBe(0)
    expect(imp.body.data.rows.every((r) => r.status === 'MATCHED')).toBe(true)

    const second = await api<{ overall: string }>(
      'GET',
      '/reports/recon?businessDate=' + bd,
      undefined,
      adminToken,
    )
    expect(second.body.data.overall).toBe('MATCHED')
  })

  it('关房结算单预览:开房 → 预览明细(实时报价)→ 与真结算同额', async () => {
    // 选一间空闲房(避免与并行套件的 B01 冲突)
    const rooms = await api<{ rows: Array<{ id: number; roomNo: string; status: string }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    const free = rooms.body.data.rows.find((r) => r.status === 'FREE')
    expect(free).toBeDefined()

    const opened = await api<{ roomSessionId: number }>(
      'POST',
      '/room-sessions/open',
      { roomId: free!.id, artistIds: [artistId] },
      adminToken,
    )
    expect(opened.body.code).toBe(0)

    const preview = await api<{
      roomNo: string
      sessions: Array<{ sessionId: number; live: boolean; amount: number; artistId: number }>
      orders: unknown[]
      roomFee: number
      totalAmount: number
      artists: Array<{ artistId: number; feeBalance: number }>
      billing: { minCharge: number; capCharge: number }
    }>('GET', '/room-sessions/' + String(opened.body.data.roomSessionId) + '/bill-preview', undefined, adminToken)
    expect(preview.body.code).toBe(0)
    expect(preview.body.data.roomNo).toBe(free!.roomNo)
    expect(preview.body.data.sessions.length).toBeGreaterThanOrEqual(1)
    expect(preview.body.data.sessions.every((s) => s.live)).toBe(true)
    expect(preview.body.data.orders).toHaveLength(0)
    expect(preview.body.data.totalAmount).toBe(preview.body.data.roomFee)
    expect(preview.body.data.artists.some((a) => a.artistId === artistId)).toBe(true)
    expect(typeof preview.body.data.billing.minCharge).toBe('number')

    const closed = await api<{ totalAmount: number; roomFee: number }>(
      'POST',
      '/room-sessions/' + String(opened.body.data.roomSessionId) + '/close',
      { settleType: 'CASH' },
      adminToken,
    )
    expect(closed.body.code).toBe(0)
    // 预览与真结算同一算路(quoteIn),短间隔内金额一致
    expect(closed.body.data.totalAmount).toBe(preview.body.data.totalAmount)

    // 清扫归位
    await api('POST', '/rooms/' + String(free!.id) + '/cleaning-done', {}, adminToken)
  })

  it('语音盒子测试端点:双态自洽(未配置→skipped;已配置→真发不抛)', async () => {
    const res = await api<{ ok: boolean; skipped?: boolean; configured: boolean }>(
      'POST',
      '/voice-box/test',
      { text: 'e2e 语音盒子测试' },
      adminToken,
    )
    expect(res.body.code).toBe(0)
    // dev 环境可能已配 VOICE_BOX_URL(mock 盒子联调);两种状态各自自洽——
    // 已配置:真发,盒子在线 ok=true / 离线 ok=false 但不抛(code 仍 0);未配置:skipped=true
    if (res.body.data.configured) {
      expect(typeof res.body.data.ok).toBe('boolean')
      expect(res.body.data.skipped).toBeUndefined()
    } else {
      expect(res.body.data.ok).toBe(true)
      expect(res.body.data.skipped).toBe(true)
    }
  })

  it('双轨 14 天门禁视图:14 格 + 连续天数 + 门禁判定字段', async () => {
    const h = await api<{
      days: Array<{ businessDate: string; overall: string; complete: boolean }>
      streak: number
      gateDays: number
      gatePassed: boolean
      currentBusinessDate: string
    }>('GET', '/reports/recon/history?days=14', undefined, adminToken)
    expect(h.body.code).toBe(0)
    expect(h.body.data.days).toHaveLength(14)
    expect(h.body.data.gateDays).toBe(14)
    expect(typeof h.body.data.streak).toBe('number')
    // 今日(最后格)为进行中
    expect(h.body.data.days[13]!.businessDate).toBe(h.body.data.currentBusinessDate)
    expect(h.body.data.days[13]!.complete).toBe(false)
  })
})
