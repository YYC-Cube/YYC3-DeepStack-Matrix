/**
 * 台票/展示/预约 + 计费钳位 e2e(需求全集 §6.4/§6.6/§9):
 * - 台票:规则创建 → 购买(转账通道)→ DOUYIN 拒(通道清单)→ 核销 → 超额 40911 → 流水
 * - 展示:投放 → 去重跳过 → 结束
 * - 预约:创建(自动预约号)→ 到店 → 终态锁定 40913
 * - 最低消费:设置 88 → 离线上钟回拨 20 分钟(1h×200=40 < 88 兜到 88)
 * 运行:同 p0-backfill 套件环境变量;服务须以最新 leisure-core dist 运行
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
let ruleId = 0

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('台票/展示/预约/计费钳位', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', {
      phone: PHONE,
      password: PASSWORD,
    })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')
    const artists = await api<{ rows: Array<{ id: number; badgeNo?: string }> }>(
      'GET',
      '/artists?pageSize=50',
      undefined,
      adminToken,
    )
    artistId = artists.body.data.rows.find((a) => a.badgeNo === 'A1001')!.id

    // 规则幂等:同名单查复用,否则建
    const existing = await api<{ rows: Array<{ id: number; name: string }> }>(
      'GET',
      '/ticket-rules',
      undefined,
      adminToken,
    )
    const hit = existing.body.data.rows.find((r) => r.name === 'E2E-台票')
    ruleId = hit?.id ?? 0
    if (ruleId === 0) {
      const created = await api<{ id: number }>(
        'POST',
        '/ticket-rules',
        { name: 'E2E-台票', price: 100, validDays: 0 },
        adminToken,
      )
      expect(created.body.code).toBe(0)
      ruleId = created.body.data.id
    }
    // 基线:最低消费/封顶归零(其他用例可能改过)
    await api('PUT', '/store-config/artist-settings', { roomBilling: { minCharge: 0, capCharge: 0 } }, adminToken)
  })

  it('台票:购买(转账)→ DOUYIN 拒 → 核销 → 超额 40911 → 流水', async () => {
    const buy = await api<{ txnId: number; amount: number; balance: number }>(
      'POST',
      '/tickets/purchase',
      { artistId, ticketRuleId: ruleId, qty: 2, payChannel: 'TRANSFER' },
      adminToken,
    )
    expect(buy.body.code).toBe(0)
    expect(buy.body.data.amount).toBe(200)

    const bad = await api<{ msg: string }>(
      'POST',
      '/tickets/purchase',
      { artistId, ticketRuleId: ruleId, qty: 1, payChannel: 'DOUYIN' },
      adminToken,
    )
    expect(bad.body.msg).toContain('收费通道不在门店清单内')

    const use1 = await api<{ balance: number }>(
      'POST',
      '/tickets/use',
      { artistId, ticketRuleId: ruleId, qty: 1 },
      adminToken,
    )
    expect(use1.body.code).toBe(0)

    const over = await api<{ code: number }>(
      'POST',
      '/tickets/use',
      { artistId, ticketRuleId: ruleId, qty: 99 },
      adminToken,
    )
    expect(over.body.code).toBe(40911)

    const txns = await api<{ total: number; totalAmount: number }>(
      'GET',
      '/tickets/txns?businessDateFrom=' +
        new Date().toISOString().slice(0, 10) +
        '&businessDateTo=' +
        new Date().toISOString().slice(0, 10) +
        '&type=BUY',
      undefined,
      adminToken,
    )
    expect(txns.body.code).toBe(0)
    expect(txns.body.data.total).toBeGreaterThanOrEqual(1)
  })

  it('展示:投放 → 重复投放去重 → 结束', async () => {
    const first = await api<{ ids: number[]; skipped: number[] }>(
      'POST',
      '/showcase/cast',
      { artistIds: [artistId] },
      adminToken,
    )
    expect(first.body.code).toBe(0)

    const dup = await api<{ ids: number[]; skipped: number[] }>(
      'POST',
      '/showcase/cast',
      { artistIds: [artistId] },
      adminToken,
    )
    expect(dup.body.data.skipped).toHaveLength(1)

    const list = await api<{ rows: Array<{ id: number; artistId: number }> }>(
      'GET',
      '/showcase?active=true',
      undefined,
      adminToken,
    )
    expect(list.body.data.rows.some((r) => r.artistId === artistId)).toBe(true)

    for (const id of first.body.data.ids) {
      const ended = await api('POST', '/showcase/' + String(id) + '/end', {}, adminToken)
      expect(ended.body.code).toBe(0)
    }
  })

  it('预约:创建 → 到店 → 终态锁定 40913', async () => {
    const created = await api<{ id: number; bookingNo: string }>(
      'POST',
      '/bookings',
      { artistId, bookingTime: new Date().toISOString() },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    expect(created.body.data.bookingNo).toMatch(/^BK/)

    const arrived = await api<{ status: string }>(
      'POST',
      '/bookings/' + String(created.body.data.id) + '/status',
      { status: 'ARRIVED' },
      adminToken,
    )
    expect(arrived.body.data.status).toBe('ARRIVED')

    const locked = await api<{ code: number }>(
      'POST',
      '/bookings/' + String(created.body.data.id) + '/status',
      { status: 'CANCELLED' },
      adminToken,
    )
    expect(locked.body.code).toBe(40913)
  })

  it('服务评价:录入 5★ → 区间列表含该条 → 统计均分/分布自洽', async () => {
    const created = await api<{ id: number }>(
      'POST',
      '/reviews',
      { artistId, reviewType: '综合', score: 5, content: 'e2e 服务很好', reviewer: 'A01 客人' },
      adminToken,
    )
    expect(created.body.code).toBe(0)

    const today = new Date().toISOString().slice(0, 10)
    const list = await api<{
      rows: Array<{ id: number; score: number | null; reviewType: string | null }>
      total: number
      summary: { count: number; avgScore: number; dist: Record<string, number> }
    }>('GET', '/reviews?businessDateFrom=' + today + '&businessDateTo=' + today + '&artistId=' + String(artistId), undefined, adminToken)
    expect(list.body.code).toBe(0)
    expect(list.body.data.rows.some((r) => r.id === created.body.data.id)).toBe(true)
    expect(list.body.data.summary.count).toBeGreaterThanOrEqual(1)
    expect(list.body.data.summary.avgScore).toBeGreaterThanOrEqual(1)
    expect(list.body.data.summary.avgScore).toBeLessThanOrEqual(5)
    const distSum = Object.values(list.body.data.summary.dist).reduce((a, b) => a + b, 0)
    expect(distSum).toBe(list.body.data.summary.count)

    // 评分越界 → 400(class-validator)
    const bad = await api('POST', '/reviews', { artistId, reviewType: '综合', score: 9 }, adminToken)
    expect(bad.body.code).not.toBe(0)
  })

  it('最低消费:设置 88 → 回拨 20 分钟离线上钟 → 台费兜到 88', async () => {
    const put = await api(
      'PUT',
      '/store-config/artist-settings',
      { roomBilling: { minCharge: 88, capCharge: 0 } },
      adminToken,
    )
    expect(put.body.code).toBe(0)
    const start = new Date(Date.now() - 20 * 60_000).toISOString()
    const end = new Date().toISOString()
    const off = await api<{ feeAmount: number }>(
      'POST',
      '/sessions/offline',
      { clientOpId: 'e2e-mincap-' + String(Date.now()), artistId, roomId: await anyRoomId(), startAt: start, endAt: end },
      adminToken,
    )
    expect(off.body.code).toBe(0)
    // 20 分钟进位 1h;槽位价 200 → 40 < 最低消费 88 → 88
    expect(off.body.data.feeAmount).toBe(88)
    // 归零还原,避免污染其他套件
    await api('PUT', '/store-config/artist-settings', { roomBilling: { minCharge: 0, capCharge: 0 } }, adminToken)
  })
})

async function anyRoomId(): Promise<number> {
  const res = await fetch(BASE + '/store/rooms?pageSize=50', {
    headers: { Authorization: 'Bearer ' + adminToken },
  })
  const json = (await res.json()) as { data: { rows: Array<{ id: number }> } }
  return json.data.rows[0]!.id
}
