/**
 * YYC³ LeisureManage · 台费计算引擎(单源)
 * 实测依据:台费规则 = 艺人等级 × 包厢类型 → 金额(技师 × 小包/中包/大包/VIP包/西亳厅/外卖房)
 * 计费模式:FLAT=按场次一口价(实测主模式) · HOURLY=按小时价折算(向上取整到分钟)
 * 红线:计费所用的规则在「上钟起表时」快照,后续规则变更不影响进行中场次
 */

import { ERR, LeisureError } from './errors.js'
import type { Artist, StageFeeRule, StageFeeMode } from './types.js'

/* ───────────────────────── 规则解析 ───────────────────────── */

/**
 * 解析适用规则:等级匹配 且 房型在适用数组内。
 * 命中多条时取「房型数组更小者」(更特化);仍未命中返回 null(调用方决定兜底价)。
 */
export function resolveStageFeeRule(
  rules: readonly StageFeeRule[],
  levelId: number,
  roomTypeId: number,
): StageFeeRule | undefined {
  const hits = rules.filter(
    (r) => r.levelId === levelId && r.roomTypeIds.includes(roomTypeId),
  )
  if (hits.length === 0) return undefined
  return hits.reduce((best, cur) =>
    cur.roomTypeIds.length < best.roomTypeIds.length ? cur : best,
  )
}

/* ───────────────────────── 时长与计费 ───────────────────────── */

export function diffMinutes(startAt: Date | string, endAt: Date | string): number {
  const s = typeof startAt === 'string' ? new Date(startAt) : startAt
  const e = typeof endAt === 'string' ? new Date(endAt) : endAt
  const ms = e.getTime() - s.getTime()
  if (ms < 0) throw new LeisureError(400, 'session end before start')
  return Math.floor(ms / 60_000)
}

export interface SessionFeeInput {
  rule: StageFeeRule | undefined
  startAt: Date | string
  endAt: Date | string
  /** 计费模式;缺省 FLAT(实测主模式) */
  mode?: StageFeeMode
  /** HOURLY 模式的时薪;FLAT 忽略。缺省回退艺人档案 hourlyRate */
  hourlyRate?: number
  /** 上钟最低时长(同包厢,分钟);不足时按此时长计(保底) */
  minDurationMinutes?: number
}

export interface SessionFeeResult {
  amount: number
  durationMinutes: number
  /** 计费所用规则 id(FLAT 模式);HOURLY 为 undefined */
  ruleId?: number
  mode: StageFeeMode
  /** 是否触发了最低时长保底 */
  minDurationApplied: boolean
}

/**
 * 场次台费计算(纯函数,四端同源)。
 * - FLAT:命中规则取 amount;未命中规则返回 amount=0 并置 ruleId=undefined(由调用方决定兜底)
 * - HOURLY:按分钟向上取整 × 时薪
 * - 最低时长保底:不足按 minDurationMinutes 计
 */
export function calcSessionFee(input: SessionFeeInput): SessionFeeResult {
  const mode: StageFeeMode = input.mode ?? 'FLAT'
  const durationMinutes = diffMinutes(input.startAt, input.endAt)

  let billed = durationMinutes
  let minDurationApplied = false
  if (mode === 'HOURLY') {
    // 按分钟向上取整:触及的分钟段即计一整分钟(实测:08:00→09:23 计 84 分钟)
    billed = durationMinutes + 1
  }
  if (
    input.minDurationMinutes !== undefined &&
    input.minDurationMinutes > 0 &&
    durationMinutes > 0 &&
    durationMinutes < input.minDurationMinutes
  ) {
    billed = input.minDurationMinutes
    minDurationApplied = true
  }

  if (mode === 'HOURLY') {
    const rate = input.hourlyRate ?? 0
    const amount = round2((billed / 60) * rate)
    return { amount, durationMinutes, mode, minDurationApplied }
  }

  // FLAT
  if (input.rule === undefined) {
    return { amount: 0, durationMinutes, mode, minDurationApplied }
  }
  const amount = round2(billed > 0 ? input.rule.amount : 0)
  return { amount, durationMinutes, ruleId: input.rule.id, mode, minDurationApplied }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/* ───────────────────────── 上钟前置校验(实测档案限制) ───────────────────────── */

export interface CanTakeSessionParams {
  artist: Pick<
    Artist,
    'maxTotalShows' | 'maxCrossRooms' | 'firstShowMinMinutes' | 'sameRoomMinMinutes'
  >
  /** 该艺人当日已完成场次次数(0=尚未上钟) */
  totalShowsDone: number
  /** 当前进行中(未下钟)的场次列表时长(分钟),用于串台校验 */
  activeCrossDurations: number[]
  /** 本次目标房型是否与当前进行中场次相同 */
  sameRoomAsActive: boolean
  /** 配置:未签到是否允许上钟打卡(实测 PC「艺人设置」) */
  allowStageWithoutCheckin: boolean
  /** 该艺人当日是否已报备签到 */
  hasCheckedInToday: boolean
}

export interface CanTakeSessionResult {
  ok: boolean
  /** 建议本次场次的最短计费/驻场时长(分钟);不满足时 ok=false */
  requiredMinMinutes?: number | undefined
  violations: Array<{ code: number; message: string }>
}

/**
 * 上钟前置校验(纯函数)。错误码对齐 04-API:
 * - 40904 超出允许串台数 / 上台次数上限
 * - 附加:未签到且配置禁止时校验(提示语对齐实测语义)
 */
export function assertCanTakeSession(p: CanTakeSessionParams): CanTakeSessionResult {
  const violations: CanTakeSessionResult['violations'] = []

  // 1) 未签到上钟开关
  if (!p.allowStageWithoutCheckin && !p.hasCheckedInToday) {
    violations.push({ code: 400, message: '未报备签到,且门店配置禁止未签到上钟' })
  }

  // 2) 总上台次数(实测语义:0 = 不限制)
  if (p.artist.maxTotalShows > 0 && p.totalShowsDone >= p.artist.maxTotalShows) {
    violations.push({ code: ERR.SHOW_LIMIT_REACHED, message: '超出总上台次数上限' })
  }

  // 3) 串台数(实测语义:0 = 不允许串台)
  if (p.sameRoomAsActive) {
    // 同包厢续台不算串台,仅校验同包厢最低时长
    if (
      p.artist.sameRoomMinMinutes > 0 &&
      p.activeCrossDurations.length > 0 &&
      Math.max(...p.activeCrossDurations, 0) < p.artist.sameRoomMinMinutes
    ) {
      violations.push({
        code: 400,
        message: '同包厢上钟未满最低时长',
      })
    }
  } else if (p.activeCrossDurations.length > 0) {
    // 有进行中场次且换了包厢 = 串台
    if (p.artist.maxCrossRooms <= 0) {
      violations.push({ code: ERR.SHOW_LIMIT_REACHED, message: '该艺人不允许串台' })
    } else if (p.activeCrossDurations.length >= p.artist.maxCrossRooms) {
      violations.push({ code: ERR.SHOW_LIMIT_REACHED, message: '超出允许串台数' })
    }
  }

  // 4) 首台最低上钟时长(仅首台)
  const requiredMinMinutes =
    p.totalShowsDone === 0 && p.artist.firstShowMinMinutes > 0
      ? p.artist.firstShowMinMinutes
      : undefined

  return { ok: violations.length === 0, requiredMinMinutes, violations }
}

/* ───────────────────────── 台费余额(纯聚合) ───────────────────────── */

/** 余额 = Σ流水(充值+/扣费−/冲正反号);审批挂起单不计入 */
export function sumFeeBalance(txns: Array<Pick<StageFeeTxnLike, 'amount'>>): number {
  return round2(txns.reduce((acc, t) => acc + t.amount, 0))
}

/** 最小结构(避免业务端为求和构造全量实体) */
export interface StageFeeTxnLike {
  amount: number
}
