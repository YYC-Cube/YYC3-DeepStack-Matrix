/**
 * 销售经理设置⑧ 上钟模式 · 轮台派单引擎 e2e:
 * - ROTATION:越序开房 40914(带下一位提示)→ 按序开房成功 → 被派者离开队列
 * - MIXED:越序允许(原因选填)→ 日志 overridden → 主管轮台报表可见(JSON + CSV)
 * 前置:A1001/A1002 当日已签到且空闲(关闭遗留 OPEN 房账);结束还原 MIXED
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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
  const json = (await res.json().catch(() => null)) as { code: number; msg: string; data: T } | null
  return { http: res.status, body: json ?? { code: res.status, msg: 'no body', data: null as T } }
}

interface QueueRow {
  position: number
  artistId: number
  todayDispatches: number
}
interface Queue {
  mode: string
  rows: QueueRow[]
}

let adminToken = ''
const today = (): string => new Date().toISOString().slice(0, 10)

async function freeRoomId(): Promise<number> {
  const rooms = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/store/rooms?pageSize=50', undefined, adminToken)
  const free = [...rooms.body.data.rows].reverse().find((r) => r.status === 'FREE')
  expect(free).toBeDefined()
  return free!.id
}

async function closeAndClean(roomSessionId: number, roomId: number): Promise<void> {
  await api('POST', '/room-sessions/' + String(roomSessionId) + '/close', { settleType: 'CASH' }, adminToken)
  await api('POST', '/rooms/' + String(roomId) + '/cleaning-done', {}, adminToken)
}

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('⑧ 轮台派单引擎', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', { account: PHONE, password: PASSWORD })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')

    // 关闭遗留 OPEN 房账(其他套件残留),让销售经理回到队列
    const open = await api<{ rows: Array<{ id: number; roomId: number }> }>('GET', '/room-sessions?status=OPEN', undefined, adminToken)
    for (const rs of open.body.data.rows) await closeAndClean(rs.id, rs.roomId)

    // 两名已审核销售经理当日签到(幂等)
    const artists = await api<{ rows: Array<{ id: number; badgeNo?: string }> }>('GET', '/artists?pageSize=50', undefined, adminToken)
    const reports = await api<{ rows: Array<{ artistId: number }> }>(
      'GET', '/attendance/reports?businessDate=' + today() + '&type=CHECKIN&pageSize=200', undefined, adminToken,
    )
    for (const badge of ['A1001', 'A1002']) {
      const id = artists.body.data.rows.find((a) => a.badgeNo === badge)!.id
      if (!reports.body.data.rows.some((r) => r.artistId === id)) {
        await api('POST', '/attendance/manual', { artistId: id, type: 'CHECKIN', businessDate: today(), reason: 'e2e 轮台前置' }, adminToken)
      }
    }
  })

  afterAll(async () => {
    await api('PUT', '/store-config/artist-settings', { stageAssignMode: 'MIXED' }, adminToken)
  })

  it('ROTATION:越序 40914 → 按序成功 → 被派者离开队列', async () => {
    const set = await api('PUT', '/store-config/artist-settings', { stageAssignMode: 'ROTATION' }, adminToken)
    expect(set.body.code).toBe(0)
    const q = await api<Queue>('GET', '/dispatch/queue', undefined, adminToken)
    expect(q.body.data.mode).toBe('ROTATION')
    expect(q.body.data.rows.length).toBeGreaterThanOrEqual(2)
    const next = q.body.data.rows[0]!.artistId
    const other = q.body.data.rows[1]!.artistId

    const roomId = await freeRoomId()
    const wrong = await api<{ next: number[] }>('POST', '/room-sessions/open', { roomId, artistIds: [other] }, adminToken)
    expect(wrong.body.code).toBe(40914)
    expect(wrong.body.msg).toContain('下一位')

    const ok = await api<{ roomSessionId: number; dispatchMode: string; overridden: number[] }>(
      'POST', '/room-sessions/open', { roomId, artistIds: [next] }, adminToken,
    )
    expect(ok.body.code).toBe(0)
    expect(ok.body.data.dispatchMode).toBe('ROTATION')
    expect(ok.body.data.overridden).toHaveLength(0)

    const after = await api<Queue>('GET', '/dispatch/queue', undefined, adminToken)
    expect(after.body.data.rows.some((r) => r.artistId === next)).toBe(false)

    await closeAndClean(ok.body.data.roomSessionId, roomId)
  })

  it('MIXED:越序允许(原因选填)→ overridden 入日志 → 主管轮台报表 JSON/CSV', async () => {
    await api('PUT', '/store-config/artist-settings', { stageAssignMode: 'MIXED' }, adminToken)
    const q = await api<Queue>('GET', '/dispatch/queue', undefined, adminToken)
    expect(q.body.data.rows.length).toBeGreaterThanOrEqual(2)
    const off = q.body.data.rows[1]!.artistId

    const roomId = await freeRoomId()
    const opened = await api<{ roomSessionId: number; dispatchMode: string; overridden: number[] }>(
      'POST', '/room-sessions/open', { roomId, artistIds: [off], overrideReason: '客人指名' }, adminToken,
    )
    expect(opened.body.code).toBe(0)
    expect(opened.body.data.dispatchMode).toBe('MIXED')
    expect(opened.body.data.overridden).toEqual([off])
    await closeAndClean(opened.body.data.roomSessionId, roomId)

    const report = await api<Array<{ artistId: number; dispatches: number; overridden: number }>>(
      'GET', '/reports/dispatch-rotation?businessDateFrom=' + today() + '&businessDateTo=' + today(), undefined, adminToken,
    )
    expect(report.body.code).toBe(0)
    const row = report.body.data.find((r) => r.artistId === off)
    expect(row).toBeDefined()
    expect(row!.overridden).toBeGreaterThanOrEqual(1)

    const csv = await fetch(
      BASE + '/reports/dispatch-rotation?businessDateFrom=' + today() + '&businessDateTo=' + today() + '&format=csv',
      { headers: { Authorization: 'Bearer ' + adminToken } },
    )
    expect(csv.status).toBe(200)
    expect((await csv.text()).includes('被派次数')).toBe(true)
  })
})
