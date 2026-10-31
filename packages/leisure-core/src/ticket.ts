/**
 * YYC³ LeisureManage · 台票计算/校验(单源)
 * 实测依据:台票四页(设置/购买/购买记录/使用记录)+ PC「台票购买设置」
 * 流水类型:BUY 购买 · USE 使用(核销) · EXPIRE 过期
 */

import type { TicketRule, TicketTxn } from './types.js'

/** 艺人当前台票余额(按规则聚合:ΣBUY − ΣUSE − ΣEXPIRE) */
export function ticketBalance(
  txns: Array<Pick<TicketTxn, 'ticketRuleId' | 'type' | 'qty'>>,
  ruleId?: number,
): number {
  return txns
    .filter((t) => (ruleId === undefined ? true : t.ticketRuleId === ruleId))
    .reduce((acc, t) => {
      if (t.type === 'BUY') return acc + t.qty
      if (t.type === 'USE') return acc - t.qty
      return acc // EXPIRE 由日切任务写入负数 qty,此处不再重复扣
    }, 0)
}

/** 台票购买金额 */
export function calcPurchaseAmount(rule: TicketRule, qty: number): number {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error('ticket qty must be a positive integer')
  }
  return Math.round(rule.price * qty * 100) / 100
}

/**
 * 台票可否核销(上钟使用):
 * - 余额充足(按规则)
 * - 未过期(首次 BUY 时间 + validDays;validDays=0 长期)
 */
export function canUseTicket(
  txns: Array<Pick<TicketTxn, 'ticketRuleId' | 'type' | 'qty' | 'createdAt'>>,
  rule: TicketRule,
  now: Date = new Date(),
): { ok: boolean; reason?: string } {
  const balance = ticketBalance(txns, rule.id)
  if (balance <= 0) return { ok: false, reason: 'NO_BALANCE' }

  if (rule.validDays > 0) {
    const buys = txns
      .filter((t) => t.ticketRuleId === rule.id && t.type === 'BUY')
      .map((t) => new Date(t.createdAt).getTime())
    if (buys.length === 0) return { ok: false, reason: 'NO_BALANCE' }
    const firstBuy = Math.min(...buys)
    const expireAt = firstBuy + rule.validDays * 86_400_000
    if (now.getTime() >= expireAt) return { ok: false, reason: 'EXPIRED' }
  }
  return { ok: true }
}
