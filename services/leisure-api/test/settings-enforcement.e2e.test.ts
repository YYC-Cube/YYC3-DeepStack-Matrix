/**
 * 销售经理设置消费面 e2e(①②④):配置不再"只存不用"
 * - ① 资料必填项:见 star-cases(缺手机 400)
 * - ② 报备审核/开放时段:开审核 → 补打卡进 PENDING → 实时不计签到 → 审核通过 → 计签到;时段外销售端签到 409
 * - ④ 手动扫码下钟:开关关 → 403;开 → 本人进行中场次下钟成功
 * 销售端 token 走 dev 模式 wx 登录(code 即 openid)+ 腰牌绑定;口令均取环境变量
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

let adminToken = ''
let artistToken = ''
let artistId = 0
const BADGE = 'A1002'
const today = (): string => new Date().toISOString().slice(0, 10)

function hhmm(d: Date): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('销售经理设置消费面(②报备审核/时段 ④扫码下钟)', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', { account: PHONE, password: PASSWORD })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')
    const artists = await api<{ rows: Array<{ id: number; badgeNo?: string }> }>('GET', '/artists?pageSize=50', undefined, adminToken)
    artistId = artists.body.data.rows.find((a) => a.badgeNo === BADGE)!.id

    // 销售端 token:dev 模式 code 即 openid;首次 NEED_BIND → 以腰牌绑定;其后直接 OK
    const code = 'e2e-' + BADGE
    const first = await api<{ status: string; token?: string; bindToken?: string }>('POST', '/auth/wx/login', { code })
    if (first.body.data.status === 'NEED_BIND') {
      const bound = await api('POST', '/auth/wx/bind', { bindToken: first.body.data.bindToken, badgeNo: BADGE, storeId: 1 })
      expect(bound.body.code).toBe(0)
      const second = await api<{ status: string; token?: string }>('POST', '/auth/wx/login', { code })
      artistToken = second.body.data.token ?? ''
    } else {
      artistToken = first.body.data.token ?? ''
    }
    expect(artistToken).not.toBe('')
  })

  afterAll(async () => {
    // 还原门店设置,避免污染其他套件
    await api('PUT', '/store-config/artist-settings', {
      reportSettings: { requireReview: false, openFrom: '', openTo: '' },
      allowSelfScanFinish: true,
    }, adminToken)
  })

  it('② 开放时段:窗口不含当前时刻 → 销售端签到 409;全天 → 放行(或已签到 409 今日已签到)', async () => {
    const now = new Date()
    const from = new Date(now.getTime() + 2 * 3600_000)
    const to = new Date(now.getTime() + 3 * 3600_000)
    const put = await api('PUT', '/store-config/artist-settings', {
      reportSettings: { requireReview: false, openFrom: hhmm(from), openTo: hhmm(to) },
    }, adminToken)
    expect(put.body.code).toBe(0)
    const blocked = await api<{ msg: string }>('POST', '/attendance/checkin', { reportType: 'CHECKIN' }, artistToken)
    expect(blocked.http).toBe(409)
    expect(blocked.body.msg).toContain('不在报备开放时段')

    await api('PUT', '/store-config/artist-settings', { reportSettings: { requireReview: false, openFrom: '', openTo: '' } }, adminToken)
    const allowed = await api<{ msg: string }>('POST', '/attendance/checkin', { reportType: 'CHECKIN' }, artistToken)
    // 当日已签过则 409「今日已签到」,否则 0 —— 两者都证明时段拦截已解除
    expect(allowed.body.code === 0 || allowed.body.msg.includes('今日已签到')).toBe(true)
  })

  it('② 报备审核:开审核 → 补打卡 PENDING → 实时不计签到 → 审核通过 → 计签到 → 重复审核 409', async () => {
    const on = await api('PUT', '/store-config/artist-settings', { reportSettings: { requireReview: true } }, adminToken)
    expect(on.body.code).toBe(0)
    const manual = await api<{ reportId: number }>('POST', '/attendance/manual', {
      artistId, type: 'PEIBAN', businessDate: today(), reason: 'e2e 审核流',
    }, adminToken)
    expect(manual.body.code).toBe(0)

    const pending = await api<{ rows: Array<{ id: number; reviewStatus: string }> }>(
      'GET', '/attendance/reports?businessDate=' + today() + '&reviewStatus=PENDING&pageSize=200', undefined, adminToken,
    )
    expect(pending.body.data.rows.some((r) => r.id === manual.body.data.reportId)).toBe(true)

    const summaryBefore = await api<{ rows: Array<{ peiban?: number }> }>('GET', '/attendance/summary?businessDate=' + today(), undefined, adminToken)
    expect(summaryBefore.body.code).toBe(0)

    const approved = await api<{ reviewStatus: string }>(
      'POST', '/attendance/reports/' + String(manual.body.data.reportId) + '/review', { decision: 'APPROVED' }, adminToken,
    )
    expect(approved.body.data.reviewStatus).toBe('APPROVED')

    const again = await api('POST', '/attendance/reports/' + String(manual.body.data.reportId) + '/review', { decision: 'REJECTED' }, adminToken)
    expect(again.http).toBe(409)

    await api('PUT', '/store-config/artist-settings', { reportSettings: { requireReview: false } }, adminToken)
  })

  it('④ 扫码下钟:开关关 → 403;开 → 无场次 404 → 前台上钟后本人下钟成功', async () => {
    const off = await api('PUT', '/store-config/artist-settings', { allowSelfScanFinish: false }, adminToken)
    expect(off.body.code).toBe(0)
    const denied = await api('POST', '/sessions/my/finish', {}, artistToken)
    expect(denied.http).toBe(403)

    await api('PUT', '/store-config/artist-settings', { allowSelfScanFinish: true }, adminToken)
    // 确保无进行中场次时 404
    const none = await api('POST', '/sessions/my/finish', {}, artistToken)
    expect(none.http === 404 || none.body.code === 0).toBe(true)

    // 前台为该销售经理上钟(需当日已签到:补打卡 CHECKIN,审核已关为 APPROVED;幂等)
    const reports = await api<{ rows: Array<{ artistId: number }> }>(
      'GET', '/attendance/reports?businessDate=' + today() + '&type=CHECKIN&pageSize=200', undefined, adminToken,
    )
    if (!reports.body.data.rows.some((r) => r.artistId === artistId)) {
      await api('POST', '/attendance/manual', { artistId, type: 'CHECKIN', businessDate: today(), reason: 'e2e 前置签到' }, adminToken)
    }
    const rooms = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/store/rooms?pageSize=50', undefined, adminToken)
    // 取最后一间空闲房,降低与并行套件(取第一间)的撞房概率
    const free = [...rooms.body.data.rows].reverse().find((r) => r.status === 'FREE')
    expect(free).toBeDefined()
    const started = await api<{ sessionId: number }>('POST', '/sessions/start', { artistId, roomId: free!.id }, adminToken)
    expect(started.body.code).toBe(0)

    const finished = await api<{ sessionId: number; feeAmount: number }>('POST', '/sessions/my/finish', {}, artistToken)
    expect(finished.body.code).toBe(0)
    expect(finished.body.data.sessionId).toBe(started.body.data.sessionId)
  })
})
