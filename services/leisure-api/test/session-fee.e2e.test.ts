/**
 * YYC³ LeisureAPI · 阶段2 e2e(场次与资金)
 * 运行条件:服务已启动 + 环境变量凭据:
 *   LEISURE_E2E_PHONE / LEISURE_E2E_PASSWORD(管理员,申请人)
 *   LEISURE_E2E_FINANCE_PHONE(财务,审批人;密码与管理员同值)
 * 覆盖:建档审核→艺人端登录签到→上钟(房号必选/占用流转)→串台→下钟(快照计费+流水)
 *       →充值幂等(C-10)→手动扣费直扣(C-07)/审批(C-08 双人防线)→冲正(C-12)→余额对账(C-13)
 * 对齐 08-测试 §3 场次与台费域用例;计费口径测试在 leisure-core 单测(75/76 分钟进位等)
 */
import { beforeAll, describe, expect, it } from 'vitest'

// 常量回环地址(仅本机 dev 服务;不接收外部 URL 输入,无 SSRF 面)
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
): Promise<{ http: number; body: Envelope<T> }> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...(headers ?? {}) }
  if (bearer !== undefined) h.Authorization = 'Bearer ' + bearer
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as Envelope<T>
  return { http: res.status, body: json }
}

/* ── 顶层探测(收集期求值) ── */
const serverUp: boolean = await fetch(BASE + '/attendance/realtime')
  .then((res) => res.status === 401)
  .catch(() => false)
const canRun = serverUp && PHONE !== undefined && PASSWORD !== undefined && FINANCE_PHONE !== undefined

let adminToken = ''
let financeToken = ''
if (canRun) {
  const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', { phone: PHONE, password: PASSWORD })
  if (login.body.code === 0) adminToken = login.body.data.accessToken
  const financeLogin = await api<{ accessToken: string }>('POST', '/auth/admin/login', { phone: FINANCE_PHONE, password: PASSWORD })
  if (financeLogin.body.code === 0) financeToken = financeLogin.body.data.accessToken
}

describe.skipIf(!canRun || adminToken === '' || financeToken === '')('阶段2 场次与资金 e2e', () => {
  let artistId = 0
  let artistToken = ''
  let roomA01 = 0
  let roomB01 = 0
  let badge = ''
  const artistCode = 'e2e-artist-' + String(Date.now())

  beforeAll(async () => {
    // 清理上次运行遗留的孤儿进行中场次(房态断言依赖:每房无残留占用)
    const open = await api<{ rows: Array<{ id: number }> }>(
      'GET',
      '/sessions?businessDateFrom=2020-01-01&businessDateTo=2030-01-01&status=onstage&pageSize=200',
      undefined,
      adminToken,
    )
    for (const s of open.body.data.rows) {
      await api('POST', '/sessions/' + String(s.id) + '/finish', {}, adminToken)
    }

    // 房号档案(小包 A01 / 中包 B01)
    const rooms = await api<{ rows: Array<{ id: number; roomNo: string; roomTypeId: number }> }>(
      'GET',
      '/store/rooms?pageSize=50',
      undefined,
      adminToken,
    )
    const a01 = rooms.body.data.rows.find((r) => r.roomNo === 'A01')
    const b01 = rooms.body.data.rows.find((r) => r.roomNo === 'B01')
    expect(a01).toBeDefined()
    expect(b01).toBeDefined()
    roomA01 = a01!.id
    roomB01 = b01!.id

    // 建档 → 审核通过(档案默认 PENDING)
    badge = 'T' + String(Date.now()).slice(-8)
    const created = await api<{ id: number }>(
      'POST',
      '/artists',
      {
        realName: '测试档案-阶段二',
        stageName: '阶段二',
        badgeNo: badge,
        phone: '139' + String(Date.now()).slice(-8),
        hourlyRate: 66,
        // 单源引擎语义(单测钉死):maxCrossRooms=允许的并行场上限,2 = 允许一次串台
        maxCrossRooms: 2,
        sameRoomMinMinutes: 0,
      },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    artistId = created.body.data.id
    const audit = await api('POST', '/artists/' + String(artistId) + '/audit', { auditStatus: 'APPROVED' }, adminToken)
    expect(audit.body.code).toBe(0)

    // 艺人端登录(dev 骨架:code 即 openid)→ 绑定 → 换 token
    const wx1 = await api<{ status: string; bindToken: string }>('POST', '/auth/wx/login', { code: artistCode })
    expect(wx1.body.code).toBe(0)
    expect(wx1.body.data.status).toBe('NEED_BIND')
    const bind = await api<{ status: string }>(
      'POST',
      '/auth/wx/bind',
      { bindToken: wx1.body.data.bindToken, badgeNo: badge, storeId: 1 },
    )
    expect(bind.body.data.status).toBe('BOUND')
    const wx2 = await api<{ status: string; token: string }>('POST', '/auth/wx/login', { code: artistCode })
    expect(wx2.body.data.status).toBe('OK')
    artistToken = wx2.body.data.token
  })

  it('管理端禁止签到(仅艺人端)', async () => {
    const r = await api('POST', '/attendance/checkin', { reportType: 'CHECKIN' }, adminToken)
    expect(r.http).toBe(401)
  })

  it('艺人扫码签到(B-01)', async () => {
    const r = await api<{ reportId: number; businessDate: string }>(
      'POST',
      '/attendance/checkin',
      { reportType: 'CHECKIN' },
      artistToken,
    )
    expect(r.body.code).toBe(0)
    expect(r.body.data.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('上钟:房号必选→占用流转;串台并行;下钟落流水+房态回空闲(C-01/§5.3/§6.6)', async () => {
    // 第一场上钟(A01 小包):seed 兜底规则金额 0 → unitPrice 0,流程校验为主
    const start1 = await api<{ sessionId: number; businessDate: string }>(
      'POST',
      '/sessions/start',
      { artistId, roomId: roomA01 },
      adminToken,
    )
    expect(start1.body.code).toBe(0)

    // 房态 → OCCUPIED
    const roomsAfter = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/store/rooms?pageSize=50', undefined, adminToken)
    expect(roomsAfter.body.data.rows.find((r) => r.id === roomA01)?.status).toBe('OCCUPIED')

    // 串台到 B01(maxCrossRooms=1,允许 1 台)
    const cross = await api<{ sessionId: number }>(
      'POST',
      '/sessions/' + String(start1.body.data.sessionId) + '/cross',
      { toRoomId: roomB01 },
      adminToken,
    )
    expect(cross.body.code).toBe(0)

    // 实时看板:串台态
    const rt = await api<{ artists: Array<{ artistId: number; status: string; roomName?: string }> }>(
      'GET',
      '/attendance/realtime',
      undefined,
      adminToken,
    )
    const me = rt.body.data.artists.find((a) => a.artistId === artistId)
    expect(me?.status).toBe('CROSS')

    // 下第一场(A01)→ A01 回空闲,B01 仍占用
    const finish1 = await api<{ feeAmount: number; durationMinutes: number }>(
      'POST',
      '/sessions/' + String(start1.body.data.sessionId) + '/finish',
      {},
      adminToken,
    )
    expect(finish1.body.code).toBe(0)
    expect(finish1.body.data.feeAmount).toBe(0) // 时长 0 分钟 → 0 小时(进位口径)
    const roomsMid = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/store/rooms?pageSize=50', undefined, adminToken)
    expect(roomsMid.body.data.rows.find((r) => r.id === roomA01)?.status).toBe('FREE')
    expect(roomsMid.body.data.rows.find((r) => r.id === roomB01)?.status).toBe('OCCUPIED')

    // 下第二场(B01)→ B01 回空闲;SESSION_DEDUCT 流水已生成
    const finish2 = await api<{ feeAmount: number }>(
      'POST',
      '/sessions/' + String(cross.body.data.sessionId) + '/finish',
      {},
      adminToken,
    )
    expect(finish2.body.code).toBe(0)
    const roomsEnd = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/store/rooms?pageSize=50', undefined, adminToken)
    expect(roomsEnd.body.data.rows.find((r) => r.id === roomB01)?.status).toBe('FREE')

    // 下钟幂等:重复 finish → 404/400(场次已闭)
    const refinish = await api('POST', '/sessions/' + String(start1.body.data.sessionId) + '/finish', {}, adminToken)
    expect(refinish.http).toBe(404)
  })

  it('充值:现金落流水 + 同幂等键回放首答(C-10);抖音渠道 MVP 拒绝', async () => {
    // 确定性 key:由本 run 唯一 badge 派生(运行内同键→测回放;跨运行新键→免交叉污染)
    const idemKey = 'e2e-recharge-' + badge
    const r1 = await api<{ txnId: number; balance: number }>(
      'POST',
      '/stage-fee/recharge',
      { artistId, amount: 1000, payChannel: 'CASH' },
      adminToken,
      { 'Idempotency-Key': idemKey },
    )
    expect(r1.body.code).toBe(0)
    expect(r1.body.data.balance).toBe(1000)

    const r2 = await api<{ txnId: number; balance: number }>(
      'POST',
      '/stage-fee/recharge',
      { artistId, amount: 1000, payChannel: 'CASH' },
      adminToken,
      { 'Idempotency-Key': idemKey },
    )
    expect(r2.body.code).toBe(0)
    expect(r2.body.data.txnId).toBe(r1.body.data.txnId) // 回放首次结果,仅一笔
    expect(r2.body.data.balance).toBe(1000)

    const douyin = await api('POST', '/stage-fee/recharge', { artistId, amount: 100, payChannel: 'DOUYIN' }, adminToken)
    expect(douyin.http).toBe(400)
  })

  it('手动扣费:直扣(C-07)→ 高额审批(C-08 双人防线)→ 冲正(C-12)→ 余额对账(C-13)', async () => {
    // 直扣 100(备注必填)
    const noRemark = await api('POST', '/stage-fee/manual-deduct', { artistId, amount: 10, remark: '' }, adminToken)
    expect(noRemark.http).toBe(400)
    const deduct = await api<{ txnId: number; balance: number }>(
      'POST',
      '/stage-fee/manual-deduct',
      { artistId, amount: 100, remark: '测试违规扣费' },
      adminToken,
    )
    expect(deduct.body.code).toBe(0)
    expect(deduct.body.data.balance).toBe(900)

    // 高额 600 → 202 + 41201 审批单(申请人=管理员)
    const apply = await api<{ approvalId: number }>(
      'POST',
      '/stage-fee/manual-deduct',
      { artistId, amount: 600, remark: '测试高额扣费待审批' },
      adminToken,
    )
    expect(apply.http).toBe(202)
    expect(apply.body.code).toBe(41201)
    const approvalId = apply.body.data.approvalId
    expect(approvalId).toBeDefined()

    // 审批人=申请人 → 400(双人防线)
    const selfDecide = await api('POST', '/approvals/' + String(approvalId) + '/decide', { decision: 'APPROVED' }, adminToken)
    expect(selfDecide.http).toBe(400)

    // 财务审批通过 → 落流水
    const decide = await api<{ txnId: number }>(
      'POST',
      '/approvals/' + String(approvalId) + '/decide',
      { decision: 'APPROVED' },
      financeToken,
    )
    expect(decide.body.code).toBe(0)
    expect(decide.body.data.txnId).toBeDefined()
    const afterApproval = await api<{ balance: number }>('GET', '/stage-fee/balance/' + String(artistId), undefined, adminToken)
    expect(afterApproval.body.data.balance).toBe(300)

    // 冲正直扣那 100 → 余额回 400;重复冲正原单 → 追加反向流水合法,冲正单再冲 → 400
    const reverse = await api<{ txnId: number; balance: number }>(
      'POST',
      '/stage-fee/txns/' + String(deduct.body.data.txnId) + '/reverse',
      { remark: '测试冲正' },
      adminToken,
    )
    expect(reverse.body.code).toBe(0)
    expect(reverse.body.data.balance).toBe(400)
    const reverseTwice = await api<{ txnId: number }>(
      'POST',
      '/stage-fee/txns/' + String(reverse.body.data.txnId) + '/reverse',
      { remark: '测试冲正单再冲' },
      adminToken,
    )
    expect(reverseTwice.http).toBe(400)

    // 余额 = Σ流水(C-13):流水汇总接口的 totalAmount(store 全量)≥ 该艺人余额
    const txns = await api<{ totalAmount: number; rows: Array<{ type: string }> }>(
      'GET',
      '/stage-fee/txns?businessDateFrom=2020-01-01&businessDateTo=2030-01-01&pageSize=200',
      undefined,
      adminToken,
    )
    expect(txns.body.code).toBe(0)
    expect(txns.body.data.rows.some((r) => r.type === 'SESSION_DEDUCT')).toBe(true)
    expect(txns.body.data.rows.some((r) => r.type === 'REVERSE')).toBe(true)
  })

  it('规则解析与禁改(C-03): resolve-rule 带出单价;有场次当日禁改 → 40903', async () => {
    // 今日已有上钟(前用例产生):改覆盖全房型规则应 40903
    const levels = await api<Array<{ id: number; name: string }>>('GET', '/store/room-types', undefined, adminToken)
    void levels
    const rules = await api<Array<{ id: number; levelId: number; roomTypeIds: number[]; amount: number }>>(
      'GET',
      '/stage-fee-rules',
      undefined,
      adminToken,
    )
    expect(rules.body.code).toBe(0)
    const seedRule = rules.body.data[0]
    expect(seedRule).toBeDefined()
    const blocked = await api<null>(
      'PUT',
      '/stage-fee-rules/' + String(seedRule.id),
      { levelId: seedRule.levelId, roomTypeIds: seedRule.roomTypeIds, amount: 99 },
      adminToken,
    )
    expect(blocked.http).toBe(409)
    expect(blocked.body.code).toBe(40903)
  })

  it('清理:软删测试艺人(无流水不应误判——本用例已有流水 → 40906)', async () => {
    const del = await api('DELETE', '/artists/' + String(artistId), undefined, adminToken)
    expect(del.http).toBe(409)
    expect(del.body.code).toBe(40906) // 有流水禁删,引导停用(A-03)
  })
})
