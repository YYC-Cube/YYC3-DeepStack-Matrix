/**
 * YYC3-LeisureManage · 台费计算引擎(单源)
 * 实测依据:台费规则 = 艺人等级 × 包厢类型 → 金额(技师 × 小包/中包/大包/VIP包/西亳厅/外卖房)
 * 计费模式:FLAT=按场次一口价(预留) · HOURLY=小时计费+进位阈值(需求全集 §6,当前启用)
 * 红线:计费所用的规则与进位阈值在「上钟起表时」快照,后续变更不影响进行中场次
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

/* ───────────────────────── 进位阈值计费(需求全集 §6) ───────────────────────── */

/** 默认进位阈值(分钟)——门店未自定义时的回落值(对齐 10 号文档 BILL_ROUNDING_MINUTES) */
export const DEFAULT_ROUNDING_THRESHOLD_MINUTES = 15

/** 进位规则配置(门店级可自定义编辑;上钟时快照到场次) */
export interface BillRoundingConfig {
  /** 进位阈值 N(分钟):剩余分钟 > N 即进位 1 小时。缺省 15 */
  thresholdMinutes?: number
  /** 是否启用进位规则;false = 按实际时长向下取整到小时(§6.4「关闭」语义) */
  enabled?: boolean
}

/**
 * 计费小时数(纯函数)。
 * 口径(2026-11-01 裁决,以需求全集 §6.3 伪代码为准):
 *   base = floor(minutes / 60);remain = minutes % 60
 *   进位启用且 remain > N → base + 1;否则 base
 * 例(N=15):15min→0h · 16~75min→1h · 76~120min→2h · 136~180min→3h
 */
export function calcBillHours(actualMinutes: number, cfg?: BillRoundingConfig): number {
  if (actualMinutes <= 0) return 0
  const base = Math.floor(actualMinutes / 60)
  const enabled = cfg?.enabled ?? true
  if (!enabled) return base
  const n = cfg?.thresholdMinutes ?? DEFAULT_ROUNDING_THRESHOLD_MINUTES
  const remain = actualMinutes % 60
  return remain > n ? base + 1 : base
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
  /** 计费模式;缺省 FLAT(一口价预留;当前主模式为 HOURLY,见需求全集 §6.4) */
  mode?: StageFeeMode
  /** HOURLY 模式的时薪;FLAT 忽略。缺省回退艺人档案 hourlyRate */
  hourlyRate?: number
  /** 上钟最低时长(同包厢,分钟);不足时按此时长计(保底) */
  minDurationMinutes?: number
  /** 进位规则(门店级参数,上钟时快照;缺省=启用 + 15 分钟阈值) */
  rounding?: BillRoundingConfig
}

export interface SessionFeeResult {
  amount: number
  durationMinutes: number
  /** 计费小时数(HOURLY 模式;按上钟时快照阈值核算;FLAT 不适用) */
  billHours?: number
  /** 计费所用规则 id(FLAT 模式);HOURLY 为 undefined */
  ruleId?: number
  mode: StageFeeMode
  /** 是否触发了最低时长保底 */
  minDurationApplied: boolean
}

/**
 * 场次台费计算(纯函数,四端同源)。
 * - FLAT:命中规则取 amount;未命中规则返回 amount=0 并置 ruleId=undefined(由调用方决定兜底)
 * - HOURLY:先保底(minDurationMinutes)→ 再按进位阈值折算计费小时 × 时薪(§6.3)
 * - 最低时长保底:不足按 minDurationMinutes 计
 */
export function calcSessionFee(input: SessionFeeInput): SessionFeeResult {
  const mode: StageFeeMode = input.mode ?? 'FLAT'
  const durationMinutes = diffMinutes(input.startAt, input.endAt)

  let billed = durationMinutes
  let minDurationApplied = false
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
    // 小时计费 + 进位阈值(需求全集 §6):保底后按快照阈值折算计费小时
    const rate = input.hourlyRate ?? 0
    const billHours = calcBillHours(billed, input.rounding)
    const amount = round2(billHours * rate)
    return { amount, durationMinutes, billHours, mode, minDurationApplied }
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
