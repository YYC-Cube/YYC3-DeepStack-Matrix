/**
 * P1 批次 e2e(需求全集 §6.6 台票并入结算 / §12 P1-2 预约锁钟+到店叫钟 / a21 艺人订单):
 * ① 台票抵扣并入关房结算:购买 → bill-preview ticketOptions → close TICKET(写 USE 行 refSessionId)
 *    → 超余额 40911 且结算回滚 → 现金兜底
 * ② 预约:押金/锁钟登记 → 锁钟期内开房 40915 → ignoreBookingHold 强开 → 到店(ARRIVED)自动叫钟
 * ③ 艺人订单 /me/orders:自点单 + 上钟费归一视图(ARTIST scope;管理端 token 401)
 * 运行:LEISURE_E2E_PHONE=… LEISURE_E2E_PASSWORD=… vitest run test/p1-settle-hold-orders.e2e.test.ts
 * 前置:dev 服务运行于 127.0.0.1:3001(最新 leisure-core dist);库已应用 20261103000000 迁移
 */
import { beforeAll, describe, expect, it } from 'vitest'

const BASE = 'http://127.0.0.1:3001/api/v1'
const PHONE = process.env.LEISURE_E2E_PHONE
const PASSWORD = process.env.LEISURE_E2E_PASSWORD

interface Envelope<T> {
  code: number
  msg: string
  data: T
}

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  bearer?: string,
): Promise<{ http: number; body: Envelope<T> }> {
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

let adminToken = ''
let artistToken = ''
let artistId = 0
let ticketRuleId = 0
/** 权威营业日(08:00 日切;凌晨运行时 ≠ 自然日,流水/叫钟过滤必须用它) */
let bizToday = ''

const badge = 'P' + String(Date.now()).slice(-8)
const wxCode = 'p1-' + String(Date.now())

async function pickFreeRoom(exclude: number[] = []): Promise<number> {
  const [roomsRes, heldRes] = await Promise.all([
    api<{ rows: Array<{ id: number; status: string }> }>('GET', '/store/rooms?pageSize=100', undefined, adminToken),
    api<{ rows: Array<{ roomId: number | null }> }>('GET', '/bookings?status=BOOKED&pageSize=100', undefined, adminToken),
  ])
  // 排除:非空闲 / 显式排除 / 锁钟期内预约占用(含其他套件残留)
  const held = new Set(
    heldRes.body.data.rows
      .filter((b) => b.roomId !== null)
      .map((b) => b.roomId as number),
  )
  const hit = roomsRes.body.data.rows.find(
    (r) => r.status === 'FREE' && !exclude.includes(r.id) && !held.has(r.id),
  )
  expect(hit, '无可用空闲包厢(需避开锁钟预约房)').toBeDefined()
  return hit!.id
}

async function cleanupRoom(roomId: number): Promise<void> {
  const rooms = await api<{ rows: Array<{ id: number; status: string }> }>(
    'GET',
    '/store/rooms?pageSize=100',
    undefined,
    adminToken,
  )
  const st = rooms.body.data.rows.find((r) => r.id === roomId)?.status
  if (st === 'OCCUPIED') {
    const openList = await api<{ rows: Array<{ id: number; roomId: number }> }>(
      'GET',
      '/room-sessions?status=OPEN',
      undefined,
      adminToken,
    )
    const open = openList.body.data.rows.find((r) => r.roomId === roomId)
    if (open !== undefined) {
      await api('POST', '/room-sessions/' + String(open.id) + '/close', { settleType: 'CASH' }, adminToken)
    }
  }
  if (st === 'OCCUPIED' || st === 'CLEANING') {
    await api('POST', '/rooms/' + String(roomId) + '/cleaning-done', undefined, adminToken)
  }
}

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('P1:台票并入结算/预约锁钟叫钟/艺人订单', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', {
      phone: PHONE,
      password: PASSWORD,
    })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')

    // 全新档案+审核(与其他套件隔离;幂等:每次运行独立腰牌)
    const created = await api<{ id: number }>(
      'POST',
      '/artists',
      { realName: '测试档案-P1', stageName: 'P1艺人', badgeNo: badge, phone: '137' + String(Date.now()).slice(-8), hourlyRate: 60 },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    artistId = created.body.data.id
    await api('POST', '/artists/' + String(artistId) + '/audit', { auditStatus: 'APPROVED' }, adminToken)

    // 当日签到(门店默认未签到禁上钟)
    const today = new Date().toISOString().slice(0, 10)
    const reports = await api<{ rows: Array<{ artistId: number }> }>(
      'GET',
      '/attendance/reports?businessDate=' + today + '&type=CHECKIN&pageSize=200',
      undefined,
      adminToken,
    )
    if (!reports.body.data.rows.some((r) => r.artistId === artistId)) {
      const manual = await api('POST', '/attendance/manual', { artistId, type: 'CHECKIN', businessDate: today, reason: 'e2e P1 前置签到' }, adminToken)
      expect(manual.body.code).toBe(0)
    }

    // 艺人端登录(绑定后二次 login 换 token)
    const wx1 = await api<{ status: string; bindToken: string }>('POST', '/auth/wx/login', { code: wxCode })
    expect(wx1.body.data.status).toBe('NEED_BIND')
    await api('POST', '/auth/wx/bind', { bindToken: wx1.body.data.bindToken, badgeNo: badge, storeId: 1 })
    const wx2 = await api<{ status: string; token: string }>('POST', '/auth/wx/login', { code: wxCode })
    artistToken = wx2.body.data.token
    expect(artistToken).not.toBe('')

    // 权威营业日(服务端口径;my-today 与场次/流水同源)
    const mt = await api<{ businessDate: string }>('GET', '/attendance/my-today', undefined, artistToken)
    expect(mt.body.code).toBe(0)
    bizToday = mt.body.data.businessDate

    // 台票规则(每跑新建,避免他套件余额干扰)
    const rule = await api<{ id: number }>('POST', '/ticket-rules', { name: 'P1-台票-' + String(Date.now()).slice(-6), price: 100, validDays: 0 }, adminToken)
    expect(rule.body.code).toBe(0)
    ticketRuleId = rule.body.data.id
    const buy = await api<{ amount: number; balance: number }>(
      'POST',
      '/tickets/purchase',
      { artistId, ticketRuleId, qty: 2, payChannel: 'CASH' },
      adminToken,
    )
    expect(buy.body.code).toBe(0)
    expect(buy.body.data.balance).toBe(2)
  })

  it('① 台票抵扣并入结算:preview 余额 → close TICKET(USE refSessionId + ticketDeductAmount)→ 现金兜底', async () => {
    const roomId = await pickFreeRoom()
    try {
      const open = await api<{ roomSessionId: number }>('POST', '/room-sessions/open', { roomId, artistIds: [artistId] }, adminToken)
      expect(open.body.code).toBe(0)
      const rsId = open.body.data.roomSessionId

      // 房内点单一笔 120,保证抵扣合计(100)≤ 结算总额
      const goods = await api<{ id: number }>('POST', '/goods', { name: 'P1-果盘', salePrice: 120 }, adminToken)
      expect(goods.body.code).toBe(0)
      const order = await api<{ orderId: number }>(
        'POST',
        '/self-orders',
        { sessionId: rsId, artistId, items: [{ goodsId: goods.body.data.id, qty: 1 }] },
        adminToken,
      )
      expect(order.body.code).toBe(0)

      // 结算单预览:在房艺人台票余额进入分配参考
      const preview = await api<{
        ticketOptions: Array<{ artistId: number; ticketRuleId: number; balance: number; faceValue: number }>
        totalAmount: number
      }>('GET', '/room-sessions/' + String(rsId) + '/bill-preview', undefined, adminToken)
      expect(preview.body.code).toBe(0)
      const opt = preview.body.data.ticketOptions.find((t) => t.ticketRuleId === ticketRuleId && t.artistId === artistId)
      expect(opt).toBeDefined()
      expect(opt!.balance).toBe(2)
      expect(opt!.faceValue).toBe(100)

      // TICKET 结算:1 张抵 100;USE 行回链本场首场次
      const close = await api<{ ticketDeductAmount: number; totalAmount: number; settledSessions: number }>(
        'POST',
        '/room-sessions/' + String(rsId) + '/close',
        { settleType: 'TICKET', ticketAllocations: [{ artistId, ticketRuleId, qty: 1 }] },
        adminToken,
      )
      expect(close.body.code).toBe(0)
      expect(close.body.data.ticketDeductAmount).toBe(100)
      expect(close.body.data.totalAmount).toBeGreaterThanOrEqual(100)

      const today = bizToday !== '' ? bizToday : new Date().toISOString().slice(0, 10)
      const useTxns = await api<{ rows: Array<{ type: string; ticketRuleId: number; qty: number; refSessionId: number | null }> }>(
        'GET',
        '/tickets/txns?businessDateFrom=' + today + '&businessDateTo=' + today + '&type=USE&pageSize=100',
        undefined,
        adminToken,
      )
      const used = useTxns.body.data.rows.find((r) => r.ticketRuleId === ticketRuleId)
      expect(used).toBeDefined()
      expect(used!.qty).toBe(1)
      expect(used!.refSessionId).not.toBeNull()
    } finally {
      await cleanupRoom(roomId)
    }
  })

  it('①b 超余额台票抵扣 → 40911 且结算回滚(房仍占用)', async () => {
    const roomId = await pickFreeRoom()
    try {
      const open = await api<{ roomSessionId: number }>('POST', '/room-sessions/open', { roomId, artistIds: [artistId] }, adminToken)
      expect(open.body.code).toBe(0)
      const rsId = open.body.data.roomSessionId

      // 余 1 张,报 99 → 40911
      const bad = await api<{ code: number }>(
        'POST',
        '/room-sessions/' + String(rsId) + '/close',
        { settleType: 'TICKET', ticketAllocations: [{ artistId, ticketRuleId, qty: 99 }] },
        adminToken,
      )
      expect(bad.http).toBe(409)
      expect(bad.body.code).toBe(40911)

      // 事务回滚:房账仍 OPEN,可正常现金结算
      const again = await api<{ code: number }>(
        'POST',
        '/room-sessions/' + String(rsId) + '/close',
        { settleType: 'CASH' },
        adminToken,
      )
      expect(again.body.code).toBe(0)
    } finally {
      await cleanupRoom(roomId)
    }
  })

  it('② 预约押金/锁钟:锁钟期内开房 40915 → 强开放行;到店自动叫钟', async () => {
    const roomId = await pickFreeRoom()
    let bookingId = 0
    try {
      const created = await api<{ id: number; bookingNo: string }>(
        'POST',
        '/bookings',
        { roomId, artistId, holdMinutes: 30, deposit: 88 },
        adminToken,
      )
      expect(created.body.code).toBe(0)
      bookingId = created.body.data.id

      const list = await api<{ rows: Array<{ id: number; deposit: number; holdUntil: string | null; status: string }> }>(
        'GET',
        '/bookings?status=BOOKED&pageSize=100',
        undefined,
        adminToken,
      )
      const row = list.body.data.rows.find((r) => r.id === bookingId)
      expect(row).toBeDefined()
      expect(row!.deposit).toBe(88)
      expect(row!.holdUntil).not.toBeNull()

      // 锁钟期内开房 → 40915
      const blocked = await api<{ code: number }>(
        'POST',
        '/room-sessions/open',
        { roomId, artistIds: [artistId] },
        adminToken,
      )
      expect(blocked.http).toBe(409)
      expect(blocked.body.code).toBe(40915)

      // 强开(审计留痕)→ 正常关房还原
      const forced = await api<{ code: number }>(
        'POST',
        '/room-sessions/open',
        { roomId, artistIds: [artistId], ignoreBookingHold: true },
        adminToken,
      )
      expect(forced.body.code).toBe(0)
    } finally {
      // 断言失败也不残留锁钟预约/占用房(毒化后续用例)
      await cleanupRoom(roomId)
      if (bookingId !== 0) {
        await api('POST', '/bookings/' + String(bookingId) + '/status', { status: 'CANCELLED' }, adminToken)
      }
    }

    // 到店自动叫钟:指名房+艺人 ARRIVED → autoCallId + 叫钟队列含该记录
    const b2 = await api<{ id: number }>('POST', '/bookings', { roomId, artistId, holdMinutes: 30 }, adminToken)
    expect(b2.body.code).toBe(0)
    const arrived = await api<{ status: string; autoCallId: number | null }>(
      'POST',
      '/bookings/' + String(b2.body.data.id) + '/status',
      { status: 'ARRIVED' },
      adminToken,
    )
    expect(arrived.body.code).toBe(0)
    expect(arrived.body.data.autoCallId).not.toBeNull()
    const calls = await api<{ rows: Array<{ id: number; artistId: number; status: string }> }>(
      'GET',
      '/room-calls?businessDate=' + (bizToday !== '' ? bizToday : new Date().toISOString().slice(0, 10)),
      undefined,
      adminToken,
    )
    expect(calls.body.data.rows.some((c) => c.id === arrived.body.data.autoCallId && c.artistId === artistId)).toBe(true)
  })

  it('③ 艺人订单 /me/orders:自点单+上钟费归一;管理端 token 401', async () => {
    // 管理端 token → 仅艺人端
    const forbidden = await api<{ code: number }>('GET', '/me/orders', undefined, adminToken)
    expect(forbidden.http).toBe(401)

    // 开房(ARRIVED 不锁钟,pickFreeRoom 避开残留预约)→ 艺人端自点 → 送达 → 关房结算
    const roomId = await pickFreeRoom()
    const open = await api<{ roomSessionId: number }>('POST', '/room-sessions/open', { roomId, artistIds: [artistId] }, adminToken)
    expect(open.body.code).toBe(0)
    const rsId = open.body.data.roomSessionId

    const goods = await api<{ rows: Array<{ id: number; name: string; salePrice: number }> }>('GET', '/goods?onSale=true', undefined, adminToken)
    const g = goods.body.data.rows.find((x) => x.name === 'P1-果盘') ?? (await api<{ id: number }>('POST', '/goods', { name: 'P1-果盘', salePrice: 120 }, adminToken)).body.data
    const placed = await api<{ orderId: number; totalAmount: number }>(
      'POST',
      '/self-orders',
      { sessionId: rsId, items: [{ goodsId: g.id, qty: 1 }] },
      artistToken,
    )
    expect(placed.body.code).toBe(0)
    expect(placed.body.data.totalAmount).toBe(120)
    await api('POST', '/self-orders/' + String(placed.body.data.orderId) + '/deliver', {}, adminToken)

    const close = await api('POST', '/room-sessions/' + String(rsId) + '/close', { settleType: 'CASH' }, adminToken)
    expect(close.body.code).toBe(0)
    await cleanupRoom(roomId)

    // 归一视图:SELF_ORDER(SETTLED,含明细)+ ROOM_FEE(SETTLED,房号回链)
    const mine = await api<{
      orders: Array<{ id: number; kind: string; roomNo: string; amount: number; status: string; items: Array<{ name: string; qty: number }> | null }>
      summary: { orderTotal: number; feeTotal: number; count: number }
    }>('GET', '/me/orders', undefined, artistToken)
    expect(mine.body.code).toBe(0)
    const selfRow = mine.body.data.orders.find((o) => o.kind === 'SELF_ORDER' && o.id === placed.body.data.orderId)
    expect(selfRow).toBeDefined()
    expect(selfRow!.status).toBe('SETTLED')
    expect(selfRow!.amount).toBe(120)
    expect(selfRow!.items?.length).toBe(1)
    expect(selfRow!.roomNo).not.toBe('')
    const feeRow = mine.body.data.orders.find((o) => o.kind === 'ROOM_FEE' && o.roomNo === selfRow!.roomNo)
    expect(feeRow).toBeDefined()
    expect(mine.body.data.summary.orderTotal).toBeGreaterThanOrEqual(120)
  })
})
