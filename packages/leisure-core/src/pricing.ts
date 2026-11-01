/**
 * YYC³ LeisureManage · 时段差异化定价解析(单源)
 * P0-2(需求全集 §12):早/晚场、周末、节假日自动切换单价
 * 规则:命中「房型 + 星期 + 日期段 + 时刻窗(支持跨零点)」的槽位中取 priority 最高;
 *      无命中返回 undefined(调用方回退「等级×房型」基础单价)
 * 纯函数:四端/后端共用,禁止复制实现
 */

export interface PricingSlotLike {
  roomTypeId: number
  name?: string
  /** 星期数组(0=周日…6=周六);null/undefined = 不限 */
  daysOfWeek?: number[] | null
  /** 日期段(含边界);null = 不限 */
  dateFrom?: string | null // YYYY-MM-DD
  dateTo?: string | null
  /** 生效时刻窗 HH:mm;支持跨零点(start > end) */
  startClock: string // HH:mm
  endClock: string // HH:mm
  unitPrice: number
  priority?: number
}

function clockMinutes(clock: string): number {
  const m = clock.match(/^(\d{1,2}):(\d{2})$/)
  if (m === null) throw new Error('invalid clock format, expect HH:mm')
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 23 || mm > 59) throw new Error('invalid clock range, expect 00:00-23:59')
  return h * 60 + mm
}

function dateKey(d: Date): string {
  const p = (n: number): string => (n < 10 ? '0' + String(n) : String(n))
  return String(d.getFullYear()) + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function inDateRange(d: Date, from?: string | null, to?: string | null): boolean {
  if ((from === null || from === undefined) && (to === null || to === undefined)) return true
  const key = dateKey(d)
  if (from !== null && from !== undefined && key < from) return false
  if (to !== null && to !== undefined && key > to) return false
  return true
}

function inClockWindow(minutesOfDay: number, start: number, end: number): boolean {
  // 常规窗:start <= m < end;跨零点窗:start > end → m >= start || m < end
  if (start === end) return true
  if (start < end) return minutesOfDay >= start && minutesOfDay < end
  return minutesOfDay >= start || minutesOfDay < end
}

/**
 * 解析当前时刻命中的差异化定价槽位。
 * @param slots 候选槽位(调用方过滤 storeId/status=1/deletedAt=null)
 * @param roomTypeId 上钟包厢的房型
 * @param at 时刻(默认 now;门店本地时区)
 * @returns 命中槽位(priority 最高优先,同分取先创建);无命中 undefined
 */
export function resolvePricingSlot<T extends PricingSlotLike>(
  slots: readonly T[],
  roomTypeId: number,
  at: Date = new Date(),
): T | undefined {
  const candidates = slots.filter((s) => s.roomTypeId === roomTypeId)
  if (candidates.length === 0) return undefined
  const dow = at.getDay() // 0=周日
  const minutesOfDay = at.getHours() * 60 + at.getMinutes()
  const hits = candidates.filter((s) => {
    if (s.daysOfWeek !== null && s.daysOfWeek !== undefined && s.daysOfWeek.length > 0) {
      if (!s.daysOfWeek.includes(dow)) return false
    }
    if (!inDateRange(at, s.dateFrom ?? null, s.dateTo ?? null)) return false
    let start = clockMinutes(s.startClock)
    let end = clockMinutes(s.endClock)
    if (start === end) return true // 全天
    if (start > end) {
      // 跨零点:拆两段判定
      return minutesOfDay >= start || minutesOfDay < end
    }
    return minutesOfDay >= start && minutesOfDay < end
  })
  if (hits.length === 0) return undefined
  return hits.reduce((best, cur) =>
    (cur.priority ?? 0) > (best.priority ?? 0) ? cur : best,
  )
}
