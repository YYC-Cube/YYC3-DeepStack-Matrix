import { describe, expect, it } from 'vitest'
import { resolvePricingSlot } from '../src/pricing.js'

const SLOTS = [
  { roomTypeId: 1, name: '全天基准', startClock: '00:00', endClock: '00:00', unitPrice: 100, priority: 0 },
  { roomTypeId: 1, name: '晚场', startClock: '18:00', endClock: '23:59', unitPrice: 200, priority: 10, daysOfWeek: [1, 2, 3, 4, 5] },
  { roomTypeId: 1, name: '周末全天', startClock: '00:00', endClock: '00:00', unitPrice: 300, priority: 20, daysOfWeek: [0, 6] },
  { roomTypeId: 2, name: '跨零点夜场', startClock: '22:00', endClock: '04:00', unitPrice: 260, priority: 30 },
]

describe('resolvePricingSlot(P0-2 时段差异化定价)', () => {
  it('无命中槽位 → undefined(回退基础单价)', () => {
    expect(resolvePricingSlot(SLOTS, 2, new Date(2026, 10, 2, 20, 0))).toBeUndefined() // 周一 20:00,房型2夜场是22点起
  })
  it('房型命中 + 时段窗内', () => {
    expect(resolvePricingSlot(SLOTS, 2, new Date(2026, 10, 2, 23, 30))?.unitPrice).toBe(260)
  })
  it('跨零点窗:凌晨 2 点命中夜场', () => {
    expect(resolvePricingSlot(SLOTS, 2, new Date(2026, 10, 3, 2, 0))?.name).toBe('跨零点夜场')
  })
  it('星期过滤:工作日晚场命中 200', () => {
    // 2026-11-02 是周一
    expect(resolvePricingSlot(SLOTS, 1, new Date(2026, 10, 2, 19, 0))?.unitPrice).toBe(200)
  })
  it('周末优先级 20 > 晚场 10(周六 19 点 → 周末 300)', () => {
    // 2026-11-07 是周六
    expect(resolvePricingSlot(SLOTS, 1, new Date(2026, 10, 7, 19, 0))?.unitPrice).toBe(300)
  })
  it('全天基准兜底:工作日 14 点无特设 → 基准 100', () => {
    expect(resolvePricingSlot(SLOTS, 1, new Date(2026, 10, 3, 14, 0))?.unitPrice).toBe(100)
  })
  it('日期段过滤:节假日槽位仅日期内生效', () => {
    const holiday = { roomTypeId: 1, name: '元旦', startClock: '00:00', endClock: '00:00', unitPrice: 500, priority: 50, dateFrom: '2027-01-01', dateTo: '2027-01-03' }
    expect(resolvePricingSlot([holiday, ...SLOTS], 1, new Date(2027, 0, 2, 12, 0))?.unitPrice).toBe(500)
    expect(resolvePricingSlot([holiday, ...SLOTS], 1, new Date(2026, 10, 3, 12, 0))?.unitPrice).toBe(100)
  })
})
