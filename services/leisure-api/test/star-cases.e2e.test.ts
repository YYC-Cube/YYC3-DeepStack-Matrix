/**
 * YYC³ LeisureAPI · 08 文档 ★ 用例自动化(阶段6 补齐)+ 报表冒烟
 * ★全集:A-01(建档,阶段1B e2e 已覆盖)/A-02/B-01/B-03/C-01/C-07/C-08/C-10/D-01(台票 II 期)
 * 本文件补:A-02 腰牌重复 · B-03 签退时限(门店级配置绕行法,顺验 §7 配置生效)· C-15 营业日归属 · 报表 7 端点+CSV
 * 运行条件同 api.e2e.test.ts:服务已启动 + 环境变量凭据
 */
import { beforeAll, describe, expect, it } from 'vitest'

const BASE = 'http://127.0.0.1:3001/api/v1'
const PHONE = process.env.LEISURE_E2E_PHONE
const PASSWORD = process.env.LEISURE_E2E_PASSWORD
const FINANCE_PHONE = process.env.LEISURE_E2E_FINANCE_PHONE

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
  headers?: Record<string, string>,
): Promise<{ http: number; body: Envelope<T>; raw?: string }> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...(headers ?? {}) }
  if (bearer !== undefined) h.Authorization = 'Bearer ' + bearer
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('csv')) {
    return { http: res.status, body: { code: -1, msg: 'csv', data: null }, raw: await res.text() }
  }
  const json = (await res.json()) as Envelope<T>
  return { http: res.status, body: json }
}

const serverUp: boolean = await fetch(BASE + '/attendance/realtime')
  .then((res) => res.status === 401)
  .catch(() => false)
const canRun = serverUp && PHONE !== undefined && PASSWORD !== undefined && FINANCE_PHONE !== undefined

let adminToken = ''
if (canRun) {
  const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', { phone: PHONE, password: PASSWORD })
  if (login.body.code === 0) adminToken = login.body.data.accessToken
}

describe.skipIf(!canRun || adminToken === '')('08 文档 ★ 用例 + 报表', () => {
  let artistId = 0
  let artistToken = ''
  const badge = 'S' + String(Date.now()).slice(-8)
  const artistCode = 'star-' + String(Date.now())

  beforeAll(async () => {
    // 建档+审核(B-01 前置)
    const created = await api<{ id: number }>(
      'POST',
      '/artists',
      { realName: '测试档案-星例', stageName: '星例', badgeNo: badge, phone: '138' + String(Date.now()).slice(-8), hourlyRate: 60 },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    artistId = created.body.data.id
    await api('POST', '/artists/' + String(artistId) + '/audit', { auditStatus: 'APPROVED' }, adminToken)
    // 艺人端登录
    const wx1 = await api<{ status: string; bindToken: string }>('POST', '/auth/wx/login', { code: artistCode })
    await api('POST', '/auth/wx/bind', { bindToken: wx1.body.data.bindToken, badgeNo: badge, storeId: 1 })
    const wx2 = await api<{ status: string; token: string }>('POST', '/auth/wx/login', { code: artistCode })
    artistToken = wx2.body.data.token
  })

  it('★A-02 腰牌号重复 → 40901(含软删档案)', async () => {
    const r = await api<null>('POST', '/artists', { realName: '重复腰牌', badgeNo: 'A1001' }, adminToken)
    expect(r.http).toBe(409)
    expect(r.body.code).toBe(40901)
  })

  it('★B-03 签退时限:默认 60 分钟内签退 → 40905;门店级配置置 0 后放行(§7 门店级>env)', async () => {
    // 签到
    const c = await api('POST', '/attendance/checkin', { reportType: 'CHECKIN' }, artistToken)
    expect(c.body.code).toBe(0)
    // 立即签退 → 40905(签到未满 60 分钟)
    const early = await api<null>('POST', '/attendance/checkout', {}, artistToken)
    expect(early.http).toBe(409)
    expect(early.body.code).toBe(40905)
    // 门店级配置置 0(store-config 生效链路顺验)
    const put = await api('PUT', '/store-config/artist-settings', { checkoutMinMinutes: 0 }, adminToken)
    expect(put.body.code).toBe(0)
    const ok = await api<{ durationMinutes: number }>('POST', '/attendance/checkout', {}, artistToken)
    expect(ok.body.code).toBe(0)
    // 恢复 60
    await api('PUT', '/store-config/artist-settings', { checkoutMinMinutes: 60 }, adminToken)
  })

  it('★C-15 营业日口径:my-today 返回 businessDate 且 08:00 日切字符串格式', async () => {
    const r = await api<{ businessDate: string }>('GET', '/attendance/my-today', undefined, artistToken)
    expect(r.body.code).toBe(0)
    expect(r.body.data.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // 清理:软删(有流水→40906 符合 A-03)
    const del = await api('DELETE', '/artists/' + String(artistId), undefined, adminToken)
    expect([200, 409]).toContain(del.http)
  })

  it('报表 7 端点 + CSV 导出(A25;§8.3 包厢维度列)', async () => {
    const eps = [
      'stage-fee/deduct-detail', 'stage-fee/recharge', 'stage-fee/summary',
      'attendance/detail', 'attendance/summary', 'session/detail', 'session/summary',
    ]
    for (const ep of eps) {
      const r = await api<unknown>('GET', '/reports/' + ep + '?businessDateFrom=2026-10-01&businessDateTo=2026-11-30', undefined, adminToken)
      expect(r.body.code, ep).toBe(0)
    }
    // CSV:BOM 头(fetch text() 会剥 BOM,须以字节断言)+ 包厢维度列名
    const res = await fetch(BASE + '/reports/session/detail?businessDateFrom=2026-10-01&businessDateTo=2026-11-30&format=csv', {
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    const buf = new Uint8Array(await res.arrayBuffer())
    expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder('utf-8').decode(buf)
    expect(text).toContain('包厢房号')
    expect(text).toContain('包厢类型')
  })

  it('导出权限分离:无 report:export 的财务不可导 session 报表?——财务有 report:export,改验纯艺人端 40301', async () => {
    const r = await api<null>('GET', '/reports/session/detail?format=csv', undefined, artistToken)
    expect(r.http).toBe(403)
  })
})
