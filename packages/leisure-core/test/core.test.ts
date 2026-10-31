import { describe, expect, it } from 'vitest'
import {
  businessDateRange,
  resolveBusinessDate,
  shiftBusinessDate,
} from '../src/business-day.js'
import {
  calcSessionFee,
  resolveStageFeeRule,
  assertCanTakeSession,
  calcBillHours,
  DEFAULT_ROUNDING_THRESHOLD_MINUTES,
} from '../src/stage-fee.js'
import { canUseTicket, calcPurchaseAmount, ticketBalance } from '../src/ticket.js'
import { RealtimeStatus, REPORT_TYPES } from '../src/types.js'

/* ── 营业日(实测口径:08:00 日切) ── */

describe('business-day', () => {
  it('02:00 归前一日(对齐实测 2026-11-01 02:00 → 2026-10-31)', () => {
    expect(resolveBusinessDate(new Date(2026, 10, 1, 2, 0), { cutTime: '08:00' })).toBe(
      '2026-10-31',
    )
  })
  it('09:00 归当日', () => {
    expect(resolveBusinessDate(new Date(2026, 10, 1, 9, 0), { cutTime: '08:00' })).toBe(
      '2026-11-01',
    )
  })
  it('营业日区间:10-31 → 10-31 08:00 至 11-01 08:00', () => {
    const r = businessDateRange('2026-10-31', { cutTime: '08:00' })
    expect(r.start.getHours()).toBe(8)
    expect(r.end.getDate()).toBe(1)
  })
  it('shift ±1 天', () => {
    expect(shiftBusinessDate('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftBusinessDate('2026-11-01', -1)).toBe('2026-10-31')
  })
})

/* ── 台费规则(实测:技师 × 6 房型 → 金额) ── */

const RULES = [
  { id: 1, storeId: 1, levelId: 100, roomTypeIds: [1, 2, 3, 4, 5, 6], amount: 100 },
  { id: 2, storeId: 1, levelId: 200, roomTypeIds: [1, 2, 3], amount: 200 },
]

describe('stage-fee', () => {
  it('等级×房型命中', () => {
    const r = resolveStageFeeRule(RULES, 100, 5)
    expect(r?.id).toBe(1)
    expect(r?.amount).toBe(100)
  })
  it('未命中返回 undefined', () => {
    expect(resolveStageFeeRule(RULES, 100, 9)).toBeUndefined()
  })
  it('FLAT:有单则一口价', () => {
    const out = calcSessionFee({
      rule: RULES[0],
      startAt: '2026-10-31T08:00:00',
      endAt: '2026-10-31T09:23:00',
    })
    expect(out.amount).toBe(100)
    expect(out.mode).toBe('FLAT')
  })
  it('最低时长保底(83 分钟 < 120 按保底计)', () => {
    const out = calcSessionFee({
      rule: RULES[0],
      startAt: '2026-10-31T08:00:00',
      endAt: '2026-10-31T09:23:00',
      minDurationMinutes: 120,
    })
    expect(out.minDurationApplied).toBe(true)
  })
  it('HOURLY:进位阈值计费(83 分钟,默认 N=15 → 2 小时)', () => {
    const out = calcSessionFee({
      rule: undefined,
      startAt: '2026-10-31T08:00:00',
      endAt: '2026-10-31T09:23:00',
      mode: 'HOURLY',
      hourlyRate: 120,
    })
    expect(out.durationMinutes).toBe(83)
    expect(out.billHours).toBe(2)
    expect(out.amount).toBe(240)
  })
  it('HOURLY:保底后进位(83 分钟 < 保底 120 → 计费 2 小时)', () => {
    const out = calcSessionFee({
      rule: undefined,
      startAt: '2026-10-31T08:00:00',
      endAt: '2026-10-31T09:23:00',
      mode: 'HOURLY',
      hourlyRate: 100,
      minDurationMinutes: 120,
    })
    expect(out.minDurationApplied).toBe(true)
    expect(out.billHours).toBe(2)
    expect(out.amount).toBe(200)
  })
})

/* ── 进位阈值(需求全集 §6.3 伪代码口径,2026-11-01 裁决) ── */

describe('calcBillHours', () => {
  it('默认阈值 15:N=15 边界(15 不进位 / 16 进位)', () => {
    expect(DEFAULT_ROUNDING_THRESHOLD_MINUTES).toBe(15)
    expect(calcBillHours(15)).toBe(0)
    expect(calcBillHours(16)).toBe(1)
  })
  it('整段对照(默认 N=15,伪代码口径):75→1h · 76→2h · 135→2h · 136→3h · 195→3h', () => {
    expect(calcBillHours(60)).toBe(1)
    expect(calcBillHours(75)).toBe(1)
    expect(calcBillHours(76)).toBe(2)
    expect(calcBillHours(120)).toBe(2)
    expect(calcBillHours(135)).toBe(2)
    expect(calcBillHours(136)).toBe(3)
    expect(calcBillHours(180)).toBe(3)
    expect(calcBillHours(195)).toBe(3)
    expect(calcBillHours(196)).toBe(4)
  })
  it('门店自定义 N=10:70 分钟不进位 / 71 分钟进位', () => {
    expect(calcBillHours(70, { thresholdMinutes: 10 })).toBe(1)
    expect(calcBillHours(71, { thresholdMinutes: 10 })).toBe(2)
  })
  it('关闭进位规则 = 向下取整(90 分钟 → 1h)', () => {
    expect(calcBillHours(90, { enabled: false })).toBe(1)
    expect(calcBillHours(179, { enabled: false })).toBe(2)
  })
  it('非正时长 → 0 小时', () => {
    expect(calcBillHours(0)).toBe(0)
    expect(calcBillHours(-5)).toBe(0)
  })
})

/* ── 上钟前置校验(实测档案限制语义) ── */

const baseArtist = {
  maxTotalShows: 0, // 0 = 不限
  maxCrossRooms: 0, // 0 = 不允许串台(实测语义)
  firstShowMinMinutes: 0,
  sameRoomMinMinutes: 0,
}

describe('assertCanTakeSession', () => {
  it('未签到且配置禁止 → 校验失败', () => {
    const out = assertCanTakeSession({
      artist: baseArtist,
      totalShowsDone: 0,
      activeCrossDurations: [],
      sameRoomAsActive: false,
      allowStageWithoutCheckin: false,
      hasCheckedInToday: false,
    })
    expect(out.ok).toBe(false)
  })
  it('串台数 0 = 不允许串台(实测语义)', () => {
    const out = assertCanTakeSession({
      artist: { ...baseArtist, maxCrossRooms: 0 },
      totalShowsDone: 3,
      activeCrossDurations: [90],
      sameRoomAsActive: false,
      allowStageWithoutCheckin: true,
      hasCheckedInToday: true,
    })
    expect(out.ok).toBe(false)
    expect(out.violations[0]?.code).toBe(40904)
  })
  it('串台上限(允许 1 台,已有 1 台进行中再串)', () => {
    const out = assertCanTakeSession({
      artist: { ...baseArtist, maxCrossRooms: 1 },
      totalShowsDone: 3,
      activeCrossDurations: [90],
      sameRoomAsActive: false,
      allowStageWithoutCheckin: true,
      hasCheckedInToday: true,
    })
    expect(out.ok).toBe(false)
  })
  it('首台最低时长提示', () => {
    const out = assertCanTakeSession({
      artist: { ...baseArtist, firstShowMinMinutes: 60 },
      totalShowsDone: 0,
      activeCrossDurations: [],
      sameRoomAsActive: false,
      allowStageWithoutCheckin: true,
      hasCheckedInToday: true,
    })
    expect(out.requiredMinMinutes).toBe(60)
    expect(out.ok).toBe(true)
  })
})

/* ── 台票 ── */

const RULE = { id: 9, storeId: 1, name: '场券', price: 50, validDays: 30, status: 1 as const }

describe('ticket', () => {
  it('余额 = ΣBUY − ΣUSE', () => {
    const txns = [
      { ticketRuleId: 9, type: 'BUY' as const, qty: 5 },
      { ticketRuleId: 9, type: 'USE' as const, qty: 2 },
    ]
    expect(ticketBalance(txns, 9)).toBe(3)
  })
  it('购买金额', () => {
    expect(calcPurchaseAmount(RULE, 3)).toBe(150)
  })
  it('过期不可核销', () => {
    const txns = [
      {
        ticketRuleId: 9,
        type: 'BUY' as const,
        qty: 2,
        createdAt: '2026-09-01T10:00:00',
      },
    ]
    const out = canUseTicket(txns, RULE, new Date(2026, 10, 1))
    expect(out.ok).toBe(false)
    expect(out.reason).toBe('EXPIRED')
  })
  it('余额不足不可核销', () => {
    expect(canUseTicket([], RULE).ok).toBe(false)
  })
})

/* ── 枚举(实测对齐冒烟) ── */

describe('constants', () => {
  it('报备类型 8 枚举 + 未报备展示', () => {
    expect(REPORT_TYPES.length).toBe(8)
    expect(REPORT_TYPES.some((t) => t.label === '陪宴')).toBe(true)
  })
  it('实时状态码', () => {
    expect(RealtimeStatus.SELECTED).toBe(4)
  })
})
