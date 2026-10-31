/**
 * YYC³ LeisureManage · 营业日计算单源
 * 口径:实测系统默认 08:00 方式日切(页面默认 2026-10-31 08:00 至 11-01 08:00)
 * 所有时间按「门店本地时区」解读;四端(Web/PWA/Taro/后端)必须使用本模块,禁止自行推算
 */

import type { BusinessDayConfig } from './types.js'

const DEFAULT_CUT = '08:00'

export function normalizeCutTime(cutTime?: string): { h: number; m: number } {
  const raw = (cutTime ?? DEFAULT_CUT).trim()
  const m = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (m === null) {
    throw new Error('invalid cutTime format, expect HH:mm')
  }
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 23 || mm > 59) {
    throw new Error('invalid cutTime range, expect 00:00-23:59')
  }
  return { h, m: mm }
}

function pad(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** Date → 本地 YYYY-MM-DD */
export function formatDateLocal(d: Date): string {
  return (
    String(d.getFullYear()) +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate())
  )
}

/** 本地 YYYY-MM-DD → 当日 00:00 的 Date */
export function parseDateLocal(date: string): Date {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m === null) {
    throw new Error('invalid date format, expect YYYY-MM-DD')
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * 解析某时刻所属营业日。
 * 规则:时刻 < 日切点 → 归前一个自然日;否则归当日。
 * 例:cut=08:00,2026-11-01 02:00 → 营业日 2026-10-31;09:00 → 2026-11-01
 */
export function resolveBusinessDate(at: Date, config?: BusinessDayConfig): string {
  const cut = normalizeCutTime(config?.cutTime)
  const d = new Date(at)
  const minutesOfDay = d.getHours() * 60 + d.getMinutes()
  if (minutesOfDay < cut.h * 60 + cut.m) d.setDate(d.getDate() - 1)
  return formatDateLocal(d)
}

/**
 * 营业日 → [开始时刻, 结束时刻)。
 * 例:2026-10-31(cut 08:00)→ 2026-10-31 08:00 至 2026-11-01 08:00
 */
export function businessDateRange(
  businessDate: string,
  config?: BusinessDayConfig,
): { start: Date; end: Date } {
  const cut = normalizeCutTime(config?.cutTime)
  const start = parseDateLocal(businessDate)
  start.setHours(cut.h, cut.m, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

/** 上一/下一营业日(纯日历推算,与日切点无关) */
export function shiftBusinessDate(businessDate: string, days: number): string {
  const d = parseDateLocal(businessDate)
  d.setDate(d.getDate() + days)
  return formatDateLocal(d)
}

/** 某时刻距所属营业日开始时刻的偏移毫秒(排序稳定性 / 签到时限校验用) */
export function millisSinceBusinessDayStart(at: Date, config?: BusinessDayConfig): number {
  const bd = resolveBusinessDate(at, config)
  const range = businessDateRange(bd, config)
  return at.getTime() - range.start.getTime()
}
