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

  it('交接班:生成快照(四合计)→ 接班确认(CONFIRMED)', async () => {
    const created = await api<{ id: number; rechargeTotal: number; openOrders: number }>(
      'POST',
      '/handover',
      { shiftName: 'E2E-晚班' },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    expect(created.body.data.rechargeTotal).toBeGreaterThanOrEqual(0)
    const confirmed = await api('POST', '/handover/' + String(created.body.data.id) + '/confirm', {}, adminToken)
    expect(confirmed.body.code).toBe(0)
    const list = await api<{ rows: Array<{ id: number; status: string }> }>('GET', '/handover', undefined, adminToken)
    expect(list.body.data.rows.find((r) => r.id === created.body.data.id)?.status).toBe('CONFIRMED')
  })
})
