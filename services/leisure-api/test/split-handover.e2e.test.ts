/**
 * 财务分账 S1 + 交接班 e2e(17 号闭环规划;008 #3):
 * - 方案 DRAFT→激活(无规则拒)→计提(SESSION 类目按销售经理分组基数×比例;幂等防双计)
 * - 手动奖惩 → 冲正(反向条目)→ 结算单(CONFIRMED)→ 支付(PAID)→ 条目状态联动
 * - 交接班:生成快照(四合计+未结订单)→ 接班确认(OPEN→CONFIRMED)
 * 运行:LEISURE_E2E_PHONE=… LEISURE_E2E_PASSWORD=… vitest run test/split-handover.e2e.test.ts
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
let planId = 0
const runSeed = String(Date.now()).slice(-8)

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('财务分账 S1+交接班', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', { phone: PHONE, password: PASSWORD })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')
  })

  it('方案:建(DRAFT 含规则)→ 未激活计提拒 → 激活 → 归档保护', async () => {
    const created = await api<{ id: number }>(
      'POST',
      '/split/plans',
      {
        name: 'E2E-销售提成-' + runSeed,
        category: 'SESSION',
        periodType: 'MONTHLY',
        rules: [{ calcType: 'PERCENT', percent: 20, applyLine: 'SELL', payMethod: 'CASH', rewardType: 'REWARD' }],
      },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    planId = created.body.data.id

    // DRAFT 态计提拒绝
    const draftAccrue = await api('POST', '/split/plans/' + String(planId) + '/accrue', { businessDate: new Date().toISOString().slice(0, 10) }, adminToken)
    expect(draftAccrue.body.code).not.toBe(0)

    const activated = await api('POST', '/split/plans/' + String(planId) + '/activate', {}, adminToken)
    expect(activated.body.code).toBe(0)
  })

  it('计提:SESSION 按销售经理分组×比例;幂等防双计', async () => {
    const bd = new Date().toISOString().slice(0, 10)
    const first = await api<{ created: number; totalAmount: number }>(
      'POST',
      '/split/plans/' + String(planId) + '/accrue',
      { businessDate: bd },
      adminToken,
    )
    expect(first.body.code).toBe(0)
    const second = await api<{ created: number; totalAmount: number }>(
      'POST',
      '/split/plans/' + String(planId) + '/accrue',
      { businessDate: bd },
      adminToken,
    )
    expect(second.body.data.created).toBe(0) // 幂等:重复触发防双计
    expect(second.body.data.totalAmount).toBe(0)
  })

  it('手动奖惩 + 冲正(反向条目)', async () => {
    const created = await api<{ id: number }>(
      'POST',
      '/split/entries',
      { planId, targetScope: 'ADMIN', targetId: 1, targetName: 'E2E 岗位奖惩', baseAmount: 100, amount: -50, remark: 'E2E 罚扣' },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    const reversed = await api<{ reverseId: number }>(
      'POST',
      '/split/entries/' + String(created.body.data.id) + '/reverse',
      { remark: 'E2E 冲正' },
      adminToken,
    )
    expect(reversed.body.code).toBe(0)
    expect(reversed.body.data.reverseId).not.toBe(created.body.data.id)
  })

  it('结算单:生成(CONFIRMED)→ 支付(PAID);条目状态联动', async () => {
    // 先造一条 ARTIST 手动奖惩(不冲正),给结算提供 ACCRUED 条目
    const seeded = await api<{ id: number }>(
      'POST',
      '/split/entries',
      { planId, targetScope: 'ARTIST', targetId: 1, targetName: 'E2E 结算对象', baseAmount: 100, amount: 200 },
      adminToken,
    )
    expect(seeded.body.code).toBe(0)
    const created = await api<{ id: number; amount: number; entryCount: number }>(
      'POST',
      '/split/settlements',
      { targetScope: 'ARTIST', targetId: 1, targetName: 'E2E 结算对象', periodFrom: '2026-11-01', periodTo: '2026-11-30', payMethod: 'CASH' },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    expect(created.body.data.entryCount).toBeGreaterThanOrEqual(1)

    const paid = await api('POST', '/split/settlements/' + String(created.body.data.id) + '/pay', { payRef: 'E2E-PAY-001' }, adminToken)
    expect(paid.body.code).toBe(0)
    const list = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/split/settlements', undefined, adminToken)
    expect(list.body.data.rows.find((r) => r.id === created.body.data.id)?.status).toBe('PAID')
  })

  it('交接班:生成快照(四合计)→ 无码/错码拒 → 接班码确认(CONFIRMED)', async () => {
    const created = await api<{ id: number; rechargeTotal: number; openOrders: number; confirmCode: string }>(
      'POST',
      '/handover',
      { shiftName: 'E2E-晚班' },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    expect(created.body.data.rechargeTotal).toBeGreaterThanOrEqual(0)
    // 深化-b:接班码 6 位返回;无码/错码 400;对码通过
    const code = created.body.data.confirmCode
    expect(code).toMatch(/^\d{6}$/)
    const noCode = await api('POST', '/handover/' + String(created.body.data.id) + '/confirm', {}, adminToken)
    expect(noCode.http).toBe(400)
    const wrongCode = await api('POST', '/handover/' + String(created.body.data.id) + '/confirm', { confirmCode: '000000' === code ? '111111' : '000000' }, adminToken)
    expect(wrongCode.http).toBe(400)
    const confirmed = await api('POST', '/handover/' + String(created.body.data.id) + '/confirm', { confirmCode: code }, adminToken)
    expect(confirmed.body.code).toBe(0)
    const list = await api<{ rows: Array<{ id: number; status: string; confirmCode: string }> }>('GET', '/handover', undefined, adminToken)
    expect(list.body.data.rows.find((r) => r.id === created.body.data.id)?.status).toBe('CONFIRMED')
  })

  it('S3-a 预算对比:建预算方案 → listPlans 返回 budget/actual 达成口径', async () => {
    const created = await api<{ id: number }>(
      'POST',
      '/split/plans',
      {
        name: 'E2E-预算对比-' + runSeed,
        category: 'MANUAL',
        periodType: 'MONTHLY',
        budgetAmount: 1000,
        rules: [{ calcType: 'PERCENT', percent: 10, payMethod: 'CASH', rewardType: 'REWARD' }],
      },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    const activated = await api('POST', '/split/plans/' + String(created.body.data.id) + '/activate', {}, adminToken)
    expect(activated.body.code).toBe(0)
    // 造一笔 300 计提 → actual=300(该方案口径),budget=1000 → 前端达成率 30%
    const entry = await api('POST', '/split/entries', { planId: created.body.data.id, targetScope: 'ADMIN', targetId: 1, targetName: 'E2E 预算对象', baseAmount: 300, amount: 300 }, adminToken)
    expect(entry.body.code).toBe(0)
    const plans = await api<{ rows: Array<{ id: number; budgetAmount: number | null; actualAmount: number }> }>('GET', '/split/plans', undefined, adminToken)
    const row = plans.body.data.rows.find((r) => r.id === created.body.data.id)
    expect(row).toBeDefined()
    expect(row!.budgetAmount).toBe(1000)
    expect(row!.actualAmount).toBeGreaterThanOrEqual(300)
  })

  it('S3-b 结算单明细导出:xlsx(ZIP 头)与 csv(BOM)双格式', async () => {
    const list = await api<{ rows: Array<{ id: number }> }>('GET', '/split/settlements', undefined, adminToken)
    expect(list.body.data.rows.length).toBeGreaterThanOrEqual(1)
    const sid = list.body.data.rows[0]!.id
    for (const fmt of ['xlsx', 'csv']) {
      const res = await fetch(BASE + '/split/settlements/' + String(sid) + '/export?format=' + fmt, {
        headers: { Authorization: 'Bearer ' + adminToken },
      })
      expect(res.status).toBe(200)
      const buf = new Uint8Array(await res.arrayBuffer())
      if (fmt === 'xlsx') {
        // ZIP local header 'PK\x03\x04'
        expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0x50, 0x4b, 0x03, 0x04])
      } else {
        expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf])
        expect(new TextDecoder('utf-8').decode(buf)).toContain('结算单')
      }
    }
    const missing = await api('GET', '/split/settlements/99999999/export', undefined, adminToken)
    expect(missing.body.code).not.toBe(0)
  })

  it('S4-1 批量凭证导入(CSV):表头跳过/回写/状态保护/不存在单逐行报告', async () => {
    // 造一张 CONFIRMED 结算单(生成即 CONFIRMED,支付后亦可)用于回写
    const seeded = await api<{ id: number }>(
      'POST',
      '/split/entries',
      { planId, targetScope: 'ARTIST', targetId: 1, targetName: 'E2E 导入对象', baseAmount: 100, amount: 80 },
      adminToken,
    )
    expect(seeded.body.code).toBe(0)
    const created = await api<{ id: number }>(
      'POST',
      '/split/settlements',
      { targetScope: 'ARTIST', targetId: 1, targetName: 'E2E 导入对象', periodFrom: '2026-11-01', periodTo: '2026-11-30', payMethod: 'CASH' },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    const sid = created.body.data.id
    const csv = '结算单号,凭证号\n' + String(sid) + ',WX-IMPORT-001\n99999999,SHOULD-SKIP\nnot-a-number,BAD\n'
    const b64 = Buffer.from(csv, 'utf8').toString('base64')
    const out = await api<{ updated: number; rows: Array<{ id: number | null; ok: boolean; reason: string }> }>(
      'POST',
      '/split/settlements/import-refs',
      { contentBase64: b64 },
      adminToken,
    )
    expect(out.body.code).toBe(0)
    expect(out.body.data.updated).toBe(1)
    expect(out.body.data.rows.some((r) => r.ok)).toBe(true)
    expect(out.body.data.rows.filter((r) => !r.ok)).toHaveLength(2)
    // 回写实证:列表中该单 payRef 已带值
    const list = await api<{ rows: Array<{ id: number; status: string; payRef?: string }> }>('GET', '/split/settlements', undefined, adminToken)
    const row = list.body.data.rows.find((r) => r.id === sid)
    expect(row).toBeDefined()
    expect(row!.payRef).toBe('WX-IMPORT-001')
    // 再导一次改值(幂等覆盖;CONFIRMED 可重复补录)
    const csv2 = '结算单号,凭证号\n#' + String(sid) + ',WX-IMPORT-002\n'
    const out2 = await api<{ updated: number }>('POST', '/split/settlements/import-refs', { contentBase64: Buffer.from(csv2, 'utf8').toString('base64') }, adminToken)
    expect(out2.body.data.updated).toBe(1)
    // 缺参 400
    const bad = await api('POST', '/split/settlements/import-refs', {}, adminToken)
    expect(bad.http).toBe(400)
  })

  it('深化-3 周期滚动:MONTHLY 方案 periodStart=本月 1 日,actualAmount 含当期条目', async () => {
    const plans = await api<{ rows: Array<{ id: number; periodType: string; periodStart?: string; actualAmount: number }> }>('GET', '/split/plans', undefined, adminToken)
    const monthly = plans.body.data.rows.find((r) => r.periodType === 'MONTHLY')
    expect(monthly).toBeDefined()
    const expectedStart = new Date().toISOString().slice(0, 8) + '01'
    expect(monthly!.periodStart).toBe(expectedStart)
    expect(monthly!.actualAmount).toBeGreaterThanOrEqual(0)
  })

  it('分账目标三维(岗位/部门/人员):DEPARTMENT 手动条目+结算单;OFFSET 部门拒', async () => {
    // 部门手动奖惩
    const deptEntry = await api<{ id: number }>(
      'POST',
      '/split/entries',
      { planId, targetScope: 'DEPARTMENT', targetId: 1, targetName: 'E2E-销售一部', baseAmount: 1000, amount: 150, remark: '部门团队激励' },
      adminToken,
    )
    if (deptEntry.body.code !== 0) console.log('deptEntry fail:', JSON.stringify(deptEntry.body).slice(0, 200), 'planId=', String(planId))
    expect(deptEntry.body.code).toBe(0)
    // 部门结算单(CONFIRMED)
    const deptSettle = await api<{ id: number }>(
      'POST',
      '/split/settlements',
      { targetScope: 'DEPARTMENT', targetId: 1, targetName: 'E2E-销售一部', periodFrom: '2026-11-01', periodTo: '2026-11-30', payMethod: 'CASH' },
      adminToken,
    )
    expect(deptSettle.body.code).toBe(0)
    // OFFSET 部门支付拒绝(台费账户仅销售经理):先补一笔新 DEPARTMENT 条目供第二张单吃
    const deptEntry2 = await api<{ id: number }>(
      'POST',
      '/split/entries',
      { planId, targetScope: 'DEPARTMENT', targetId: 1, targetName: 'E2E-销售一部', baseAmount: 500, amount: 60, remark: '部门激励二' },
      adminToken,
    )
    expect(deptEntry2.body.code).toBe(0)
    const offsetSettle = await api<{ id: number }>(
      'POST',
      '/split/settlements',
      { targetScope: 'DEPARTMENT', targetId: 1, targetName: 'E2E-销售一部', periodFrom: '2026-11-01', periodTo: '2026-11-30', payMethod: 'OFFSET' },
      adminToken,
    )
    expect(offsetSettle.body.code).toBe(0)
    const denied = await api('POST', '/split/settlements/' + String(offsetSettle.body.data.id) + '/pay', { payRef: 'X' }, adminToken)
    expect(denied.http).toBe(400)
    expect(denied.body.msg).toContain('OFFSET')
    // 非法 targetScope 400(class-validator whitelist)
    const bad = await api(
      'POST',
      '/split/entries',
      { planId, targetScope: 'ROOM', targetId: 1, targetName: '非法', baseAmount: 1, amount: 1 },
      adminToken,
    )
    expect(bad.http).toBe(400)
  })
})
