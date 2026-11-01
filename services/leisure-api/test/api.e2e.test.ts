/**
 * YYC³ LeisureAPI · 核心 API e2e(阶段1-B 范围)
 * 运行条件:服务已启动(pnpm dev / node dist/main.js)+ 本地登录凭据经环境变量提供:
 *   LEISURE_E2E_PHONE / LEISURE_E2E_PASSWORD(凭据不嵌入源码;dev 默认值见 README-DEV)
 * 覆盖:房型/房号 CRUD → 房号唯一 40907 → 房态禁手工 OCCUPIED
 *       → 艺人建档默认 PENDING → 审核流转 → 列表筛选 → 门店参数 8 项读写(env 默认合并)
 * 运行:LEISURE_E2E_PHONE=… LEISURE_E2E_PASSWORD=… ./node_modules/.bin/vitest run test/api.e2e.test.ts
 */
import { beforeAll, describe, expect, it } from 'vitest'

// 常量回环地址(仅本机 dev 服务;不接收外部 URL 输入,无 SSRF 面)
const BASE = 'http://127.0.0.1:3001/api/v1'
const PHONE = process.env.LEISURE_E2E_PHONE
const PASSWORD = process.env.LEISURE_E2E_PASSWORD

/** 统一信封:{ code, msg, data } */
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (bearer !== undefined) headers.Authorization = 'Bearer ' + bearer
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as Envelope<T>
  return { http: res.status, body: json }
}

/* ── 顶层探测(vitest 收集期求值;skipIf 条件在 beforeAll 之前定型) ──
 * 服务可达(未带 token 访问受保护路由应 401)且凭据齐备才执行套件 */
const serverUp: boolean = await fetch(BASE + '/attendance/realtime')
  .then((res) => res.status === 401)
  .catch(() => false)
const canRun = serverUp && PHONE !== undefined && PASSWORD !== undefined

let token = ''
if (canRun) {
  const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', {
    phone: PHONE,
    password: PASSWORD,
  })
  if (login.body.code === 0) token = login.body.data.accessToken
}

describe.skipIf(!canRun || token === '')('阶段1-B 核心 API e2e', () => {
  it('房型清单 = seed 6 类', async () => {
    const r = await api<Array<{ id: number; name: string }>>('GET', '/store/room-types', undefined, token)
    expect(r.body.code).toBe(0)
    expect(r.body.data.length).toBe(6)
    expect(r.body.data.map((x) => x.name)).toContain('西亳厅')
  })

  it('房号清单:seed 13 间,房型联动正确(需求全集 §5)', async () => {
    const r = await api<{ rows: Array<{ roomNo: string; roomType: { name: string } }>; total: number }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      token,
    )
    expect(r.body.code).toBe(0)
    expect(r.body.data.total).toBe(13)
    const a01 = r.body.data.rows.find((x) => x.roomNo === 'A01')
    expect(a01?.roomType.name).toBe('小包')
  })

  it('新建房号 → 重复房号 40907 → 删除(店内唯一)', async () => {
    const created = await api<{ id: number }>(
      'POST',
      '/store/rooms',
      { roomNo: 'Z99', roomTypeId: 1, capacity: 6 },
      token,
    )
    expect(created.body.code).toBe(0)
    const roomId = created.body.data.id

    const dup = await api<null>('POST', '/store/rooms', { roomNo: 'Z99', roomTypeId: 1 }, token)
    expect(dup.http).toBe(409)
    expect(dup.body.code).toBe(40907)

    const del = await api<{ deleted: boolean }>(
      'DELETE',
      '/store/rooms/' + String(roomId),
      undefined,
      token,
    )
    expect(del.body.code).toBe(0)
  })

  it('房态手工置 OCCUPIED → 400(占用只能由上下钟流转,§5.3)', async () => {
    const list = await api<{ rows: Array<{ id: number }> }>('GET', '/store/rooms?pageSize=1', undefined, token)
    const first = list.body.data.rows[0]
    expect(first).toBeDefined()
    const r = await api<null>(
      'PUT',
      '/store/rooms/' + String(first.id) + '/status',
      { status: 'OCCUPIED' },
      token,
    )
    expect(r.http).toBe(400)
  })

  it('艺人建档默认 PENDING → 审核 APPROVED → 列表筛选(需求全集 §3)', async () => {
    // 腰牌号含软删档案全局唯一 → 每次运行取新号,可重复执行
    const badge = 'T' + String(Date.now()).slice(-8)
    const created = await api<{ id: number }>(
      'POST',
      '/artists',
      { realName: '测试档案-云朵', stageName: '云朵', badgeNo: badge, phone: '13900000099', hourlyRate: 90 },
      token,
    )
    expect(created.body.code).toBe(0)
    const artistId = created.body.data.id

    // 默认审核态 = PENDING
    const pendingList = await api<{ rows: Array<{ badgeNo: string | null }> }>(
      'GET',
      '/artists?auditStatus=PENDING&pageSize=100',
      undefined,
      token,
    )
    expect(pendingList.body.data.rows.some((x) => x.badgeNo === badge)).toBe(true)

    // 审核通过 → 出现在 APPROVED 筛选
    const audit = await api<{ auditStatus: string }>(
      'POST',
      '/artists/' + String(artistId) + '/audit',
      { auditStatus: 'APPROVED' },
      token,
    )
    expect(audit.body.code).toBe(0)
    const approvedList = await api<{ rows: Array<{ badgeNo: string | null }> }>(
      'GET',
      '/artists?auditStatus=APPROVED&pageSize=100',
      undefined,
      token,
    )
    expect(approvedList.body.data.rows.some((x) => x.badgeNo === badge)).toBe(true)

    // 清理(软删)
    await api('DELETE', '/artists/' + String(artistId), undefined, token)
  })

  it('门店参数:GET → PUT 阈值(初值无关,规避并发文件互扰)→ 回读一致 → 恢复初值(需求全集 §7)', async () => {
    const got = await api<{
      checkoutMinMinutes: number
      roomBilling: { feeMode: string; roundingEnabled: boolean; roundingThresholdMinutes: number }
      stageAssignMode: string
    }>('GET', '/store-config/artist-settings', undefined, token)
    expect(got.body.code).toBe(0)
    expect(got.body.data.roomBilling.feeMode).toBe('HOURLY')
    expect(got.body.data.stageAssignMode).toBe('MIXED')
    const initial = got.body.data.roomBilling.roundingThresholdMinutes

    // 门店级覆盖阈值 = 初值+1(部分更新,其余键不受影响;不依赖固定初值——vitest 文件并发下另有用例写此键)
    const target = initial === 10 ? 11 : 10
    const put = await api<{ updated: boolean }>(
      'PUT',
      '/store-config/artist-settings',
      { roomBilling: { roundingThresholdMinutes: target } },
      token,
    )
    expect(put.body.code).toBe(0)
    const changed = await api<{ roomBilling: { roundingThresholdMinutes: number; feeMode: string } }>(
      'GET',
      '/store-config/artist-settings',
      undefined,
      token,
    )
    expect(changed.body.data.roomBilling.roundingThresholdMinutes).toBe(target)
    expect(changed.body.data.roomBilling.feeMode).toBe('HOURLY')

    // 恢复初值
    await api('PUT', '/store-config/artist-settings', { roomBilling: { roundingThresholdMinutes: initial } }, token)
  })

  it('未知字段请求 → 400(whitelist 边界)', async () => {
    const r = await api<null>('POST', '/store/rooms', { roomNo: 'X99', roomTypeId: 1, evil: 'payload' }, token)
    expect(r.http).toBe(400)
  })
})
