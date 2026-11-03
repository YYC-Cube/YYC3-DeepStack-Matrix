/**
 * 房账全链 e2e(方案甲):开房(进房即上钟)→ 销售经理自点单 → 关房 FEE_DEDUCT 结算
 * → ROOM_SETTLE 流水 + 台费余额扣减 + 房态 CLEANING → 清扫完成 → 空闲
 * 运行:LEISURE_E2E_PHONE=… LEISURE_E2E_PASSWORD=… LEISURE_E2E_FINANCE_PHONE=… vitest run test/room-account.e2e.test.ts
 * 前置:dev 服务运行于 127.0.0.1:3001;种子含 A01/B01 房与已审核销售经理
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
let artistId = 0
let roomA01 = 0
let roomSessionId = 0
let selfOrderId = 0

const canRun = PHONE !== undefined && PASSWORD !== undefined

describe.skipIf(!canRun)('房账全链 e2e(方案甲)', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', {
      phone: PHONE,
      password: PASSWORD,
    })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')

    // 取种子销售经理(晨曦 A1001,已审核)+ 空闲房 A01
    const artists = await api<{ rows: Array<{ id: number; badgeNo?: string; realName: string }> }>(
      'GET',
      '/artists?pageSize=50',
      undefined,
      adminToken,
    )
    const target = artists.body.data.rows.find((a) => a.badgeNo === 'A1001')
    artistId = target!.id
    // 自含前置:门店默认「未签到禁上钟」,干净库上需先为 A1001 补一条当日签到(幂等:已有则跳过)
    const today = new Date().toISOString().slice(0, 10)
    const reports = await api<{ rows: Array<{ artistId: number }> }>(
      'GET',
      '/attendance/reports?businessDate=' + today + '&type=CHECKIN&pageSize=200',
      undefined,
      adminToken,
    )
    if (!reports.body.data.rows.some((r) => r.artistId === artistId)) {
      await api('POST', '/attendance/manual', { artistId, type: 'CHECKIN', businessDate: today, reason: 'e2e 前置签到' }, adminToken)
    }
    const rooms = await api<{ rows: Array<{ id: number; roomNo: string; status: string }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    const a01 = rooms.body.data.rows.find((r) => r.roomNo === 'A01')
    roomA01 = a01!.id

    // 归一化:清掉遗留 OPEN 房账(现金结算)与 CLEANING 态,保证用例从空闲起跑
    if (a01!.status === 'OCCUPIED') {
      const openList = await api<{ rows: Array<{ id: number; roomId: number }> }>(
        'GET',
        '/room-sessions?status=OPEN',
        undefined,
        adminToken,
      )
      const leftover = openList.body.data.rows.find((r) => r.roomId === roomA01)
      if (leftover !== undefined) {
        await api('POST', '/room-sessions/' + String(leftover.id) + '/close', { settleType: 'CASH' }, adminToken)
      }
    }
    if (a01!.status === 'CLEANING' || a01!.status === 'OCCUPIED') {
      await api('POST', '/rooms/' + String(roomA01) + '/cleaning-done', undefined, adminToken)
    }
  })

  async function ensureGoods(name: string, salePrice: number): Promise<number> {
    const list = await api<{ rows: Array<{ id: number; name: string; salePrice: number }> }>(
      'GET',
      '/goods',
      undefined,
      adminToken,
    )
    const found = list.body.data.rows.find((g) => g.name === name)
    if (found !== undefined) return found.id
    const created = await api<{ id: number }>('POST', '/goods', { name, salePrice }, adminToken)
    expect(created.body.code).toBe(0)
    return created.body.data.id
  }

  it('前置:销售经理充值 500(现金)建立台费余额', async () => {
    const out = await api<{ balance: number }>(
      'POST',
      '/stage-fee/recharge',
      { artistId, amount: 500, payChannel: 'CASH' },
      adminToken,
    )
    expect(out.body.code).toBe(0)
    expect(Number(out.body.data.balance)).toBeGreaterThanOrEqual(500)
  })

  it('R-01★ 开房:进房即上钟(实时状态 ON_STAGE)+ 房态 OCCUPIED', async () => {
    const open = await api<{ roomSessionId: number }>(
      'POST',
      '/room-sessions/open',
      { roomId: roomA01, artistIds: [artistId] },
      adminToken,
    )
    expect(open.body.code).toBe(0)
    roomSessionId = open.body.data.roomSessionId

    const rt = await api<{ artists: Array<{ artistId: number; status: string }> }>(
      'GET',
      '/attendance/realtime',
      undefined,
      adminToken,
    )
    expect(rt.body.data.artists.find((a) => a.artistId === artistId)?.status).toBe('ON_STAGE')

    const rooms = await api<{ rows: Array<{ id: number; status: string }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    expect(rooms.body.data.rows.find((r) => r.id === roomA01)?.status).toBe('OCCUPIED')
  })

  it('R-02 销售经理自点单:下单→送达→计入房账', async () => {
    // 建两个在售商品(幂等:已存在则复用)
    const g1id = await ensureGoods('E2E-科罗娜', 65)
    const g2id = await ensureGoods('E2E-果盘', 60)

    const placed = await api<{ orderId: number; totalAmount: number }>(
      'POST',
      '/self-orders',
      { sessionId: roomSessionId, artistId, items: [{ goodsId: g1id, qty: 1 }, { goodsId: g2id, qty: 1 }] },
      adminToken,
    )
    expect(placed.body.code).toBe(0)
    selfOrderId = placed.body.data.orderId
    expect(placed.body.data.totalAmount).toBe(125)

    const delivered = await api('POST', '/self-orders/' + String(selfOrderId) + '/deliver', undefined, adminToken)
    expect(delivered.body.code).toBe(0)

    // 超单笔限额(默认 500):40910
    const big = await api<{ code: number }>(
      'POST',
      '/self-orders',
      { sessionId: roomSessionId, artistId, items: [{ goodsId: g1id, qty: 20 }] },
      adminToken,
    )
    expect([40910, 400]).toContain(big.body.code)
  })

  it('R-03★ 关房 FEE_DEDUCT 结算:ROOM_SETTLE 落流水 + 台费扣减 + 房态 CLEANING', async () => {
    const close = await api<{ roomFee: number; orderTotal: number; totalAmount: number }>(
      'POST',
      '/room-sessions/' + String(roomSessionId) + '/close',
      {
        settleType: 'FEE_DEDUCT',
        feeDeductAllocations: [{ artistId, amount: 100 }],
        remark: 'e2e 结算',
      },
      adminToken,
    )
    expect(close.body.code).toBe(0)
    expect(Number(close.body.data.orderTotal)).toBe(125) // 点单计入

    // ROOM_SETTLE 流水已生成(−100)
    const txns = await api<{ rows: Array<{ type: string; amount: number }> }>(
      'GET',
      '/stage-fee/txns?businessDateFrom=2020-01-01&businessDateTo=2030-01-01&pageSize=200',
      undefined,
      adminToken,
    )
    const settle = txns.body.data.rows.filter((r) => r.type === 'ROOM_SETTLE')
    expect(settle.length).toBeGreaterThanOrEqual(1)
    expect(Number(settle[settle.length - 1]?.amount)).toBe(-100)

    // 余额已扣(≥400:500 − 100)
    const bal = await api<{ balance: number }>(
      'GET',
      '/stage-fee/balance/' + String(artistId),
      undefined,
      adminToken,
    )
    expect(Number(bal.body.data.balance)).toBeGreaterThanOrEqual(400)

    // 房态 → CLEANING
    const rooms = await api<{ rows: Array<{ id: number; status: string }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    expect(rooms.body.data.rows.find((r) => r.id === roomA01)?.status).toBe('CLEANING')

    // 重复关房 → 拒绝
    const again = await api<{ code: number }>(
      'POST',
      '/room-sessions/' + String(roomSessionId) + '/close',
      { settleType: 'CASH' },
      adminToken,
    )
    expect(again.body.code).not.toBe(0)
  })

  it('R-04 清扫完成 → 空闲;再开房流程可复用', async () => {
    const done = await api('POST', '/rooms/' + String(roomA01) + '/cleaning-done', undefined, adminToken)
    expect(done.body.code).toBe(0)
    const rooms = await api<{ rows: Array<{ id: number; status: string }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    expect(rooms.body.data.rows.find((r) => r.id === roomA01)?.status).toBe('FREE')
  })
})
