/**
 * 财务分账模块(17 号闭环规划 S1;III-B)+ 交接班对账(008 #3)
 * 分账:方案(类目×周期)→规则(比例/固定/阶梯×支付方式×奖惩)→计提(只增)→结算(复核→支付)
 * 交接班:当班金额四合计+未结订单快照 → 接班确认
 * 红线:SplitEntry 只增(冲正=反向条目);基数快照留痕;全部 setting:manage(财务域)
 */
import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common'
import { IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min, Max, IsNumber } from 'class-validator'
import type { Request, Response } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { toXlsx } from '../../common/utils/xlsx.js'

const CATEGORIES = ['SESSION', 'ROOM', 'ORDER', 'TICKET', 'RECHARGE', 'MANUAL'] as const
const CALC_TYPES = ['PERCENT', 'FIXED', 'TIERED'] as const
const PAY_METHODS = ['CASH', 'TRANSFER', 'BANK', 'OFFSET'] as const

/* ── DTO ── */

class RuleDto {
  @IsOptional()
  @IsString()
  applyTitle?: string
  @IsOptional()
  @IsString()
  applyLine?: string
  @IsOptional()
  @IsInt()
  applyDepartmentId?: number
  @IsIn(CALC_TYPES)
  calcType!: string
  @IsOptional()
  @IsNumber()
  percent?: number
  @IsOptional()
  @IsNumber()
  fixedAmount?: number
  @IsOptional()
  tierJson?: unknown
  @IsOptional()
  @IsIn(['REWARD', 'PENALTY'])
  rewardType?: string
  @IsOptional()
  @IsIn(PAY_METHODS)
  payMethod?: string
}

class PlanDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsIn(CATEGORIES)
  category!: string
  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  periodType?: string
  @IsOptional()
  rules?: RuleDto[]
}

class ManualEntryDto {
  @IsInt()
  planId!: number
  // 分账对象(无装饰器字段不在 whitelist——三件必须挂校验)
  @IsIn(['ADMIN', 'ARTIST'])
  targetScope!: 'ADMIN' | 'ARTIST'
  @IsInt()
  targetId!: number
  @IsString()
  @Length(1, 64)
  targetName!: string
  @IsNumber()
  baseAmount!: number
  @IsNumber()
  amount!: number
  @IsOptional()
  @IsIn(PAY_METHODS)
  payMethod?: string
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string
}

class SettlementDto {
  @IsIn(['ADMIN', 'ARTIST'])
  targetScope!: 'ADMIN' | 'ARTIST'
  @IsInt()
  targetId!: number
  @IsString()
  targetName!: string
  @IsString()
  periodFrom!: string
  @IsString()
  periodTo!: string
  @IsIn(PAY_METHODS)
  payMethod!: string
}

class HandoverDto {
  @IsString()
  shiftName!: string
  /** 接班人(可指定;空=确认时操作人) */
  @IsOptional()
  @IsInt()
  takenBy?: number
  /** 跨日班次归属营业日(可选;缺省=当日营业日口径) */
  @IsOptional()
  @IsString()
  businessDate?: string
  @IsOptional()
  @IsString()
  remark?: string
}

/* ── Service ── */

@Injectable()
export class SplitService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 方案与规则 ── */

  async listPlans(storeId: number) {
    const rows = await this.prisma.splitPlan.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      include: { rules: true, _count: { select: { entries: true } } },
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        periodType: r.periodType,
        status: r.status,
        effectiveFrom: r.effectiveFrom?.toISOString() ?? null,
        effectiveTo: r.effectiveTo?.toISOString() ?? null,
        rules: r.rules.map((x) => ({
          id: x.id,
          applyTitle: x.applyTitle,
          applyLine: x.applyLine,
          calcType: x.calcType,
          percent: x.percent !== null ? Number(x.percent) : null,
          fixedAmount: x.fixedAmount !== null ? Number(x.fixedAmount) : null,
          rewardType: x.rewardType,
          payMethod: x.payMethod,
        })),
        entryCount: r._count.entries,
      })),
    }
  }

  async createPlan(storeId: number, body: PlanDto, operatorId: number): Promise<{ id: number }> {
    const created = await this.prisma.splitPlan.create({
      data: {
        storeId,
        name: body.name,
        category: body.category,
        periodType: body.periodType ?? 'MONTHLY',
        status: 'DRAFT',
        rules: {
          create: (body.rules ?? []).map((r) => ({
            applyTitle: r.applyTitle ?? null,
            applyLine: r.applyLine ?? null,
            applyDepartmentId: r.applyDepartmentId ?? null,
            calcType: r.calcType,
            percent: r.percent ?? null,
            fixedAmount: r.fixedAmount ?? null,
            tierJson: (r.tierJson ?? null) as object,
            rewardType: r.rewardType ?? 'REWARD',
            payMethod: r.payMethod ?? 'CASH',
          })),
        },
      },
    })
    await this.audit(storeId, operatorId, 'SPLIT_PLAN_CREATE', 'split_plan', String(created.id), null, { name: body.name })
    return { id: created.id }
  }

  async activatePlan(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.splitPlan.findFirst({ where: { id, storeId }, include: { rules: true } })
    if (before === null) throw new NotFoundException('方案不存在')
    if (before.rules.length === 0) throw new BadRequestException('方案无规则项,不可激活')
    const after = await this.prisma.splitPlan.update({ where: { id }, data: { status: 'ACTIVE' } })
    await this.audit(storeId, operatorId, 'SPLIT_PLAN_ACTIVATE', 'split_plan', String(id), before, after)
  }

  async archivePlan(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.splitPlan.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('方案不存在')
    const after = await this.prisma.splitPlan.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await this.audit(storeId, operatorId, 'SPLIT_PLAN_ARCHIVE', 'split_plan', String(id), before, after)
  }

  /* ── 计提引擎(上钟业绩类目;按销售经理/资源经理分组基数×规则) ── */

  /**
   * 按方案计提(SESSION 类目):SUM(场次 feeAmount) group by artist → 规则计算 → Entry(ACCRUED)
   * 规则匹配:applyLine/applyTitle 匹配 artist.line;PERCENT=基数×%/FIXED=固定额/TIERED=阶梯表
   */
  async accrue(planId: number, storeId: number, businessDate: string, operatorId: number): Promise<{ created: number; totalAmount: number }> {
    const plan = await this.prisma.splitPlan.findFirst({ where: { id: planId, storeId } , include: { rules: true } })
    if (plan === null) throw new NotFoundException('方案不存在')
    if (plan.status !== 'ACTIVE') throw new BadRequestException('方案非 ACTIVE 态')
    if (plan.category !== 'SESSION') throw new BadRequestException('S1 计提引擎仅支持 SESSION(上钟业绩)类目')

    const bd = new Date(businessDate)
    const grouped = await this.prisma.showSession.groupBy({
      by: ['artistId'],
      where: { storeId, businessDate: bd, feeAmount: { not: null } },
      _sum: { feeAmount: true },
    })
    const artistIds = grouped.map((g) => g.artistId)
    const artists = artistIds.length > 0
      ? await this.prisma.artist.findMany({
          where: { id: { in: artistIds } },
          select: { id: true, stageName: true, realName: true, line: true, deletedAt: true, status: true },
        })
      : []
    const artistMap = new Map(artists.map((a) => [a.id, a]))

    let created = 0
    let total = 0
    for (const g of grouped) {
      const artist = artistMap.get(g.artistId)
      if (artist === undefined || artist.status !== 1 || artist.deletedAt !== null) continue
      const base = Number(g._sum.feeAmount ?? 0)
      for (const rule of plan.rules) {
        // 规则匹配(条线/职级维度;空=全员)
        if (rule.applyLine !== null && (artist.line ?? 'SELL') !== rule.applyLine) continue
        const amount = this.calcByRule(base, rule.calcType, Number(rule.percent ?? 0), Number(rule.fixedAmount ?? 0), rule.tierJson)
        if (amount === 0) continue
        const signed = rule.rewardType === 'PENALTY' ? -Math.abs(amount) : amount
        // 幂等:同方案同日同对象已计提则跳过(重复触发防双计)
        const dup = await this.prisma.splitEntry.findFirst({
          where: { planId: plan.id, businessDate: bd, targetScope: 'ARTIST', targetId: artist.id, status: { not: 'REVERSED' } },
        })
        if (dup !== null) continue
        await this.prisma.splitEntry.create({
          data: {
            storeId,
            planId: plan.id,
            ruleId: rule.id,
            businessDate: bd,
            targetScope: 'ARTIST',
            targetId: artist.id,
            targetName: artist.stageName ?? artist.realName,
            baseAmount: base,
            amount: signed,
            status: 'ACCRUED',
            payMethod: rule.payMethod,
            refType: 'SESSION_DAY',
            operatorId: operatorId,
          },
        })
        created += 1
        total += signed
      }
    }
    await this.audit(storeId, operatorId, 'SPLIT_ACCRUE', 'split_plan', String(planId), null, {
      businessDate,
      created,
      totalAmount: total,
    })
    return { created, totalAmount: Math.round(total * 100) / 100 }
  }

  /** 单一计价:按规则计算额(伪代码口径无关;金额=基数×比例或固定或阶梯) */
  private calcByRule(base: number, calcType: string, percent?: number | null, fixed?: number | null, tierJson?: unknown): number {
    if (calcType === 'PERCENT') return Math.round(base * (Number(percent ?? 0) / 100) * 100) / 100
    if (calcType === 'FIXED') return Math.round(Number(fixed ?? 0) * 100) / 100
    if (calcType === 'TIERED') {
      const tiers = Array.isArray(tierJson) ? (tierJson as Array<{ min: number; max: number | null; percent: number }>) : []
      let amount = 0
      for (const t of tiers) {
        if (base >= t.min && (t.max === null || base <= t.max)) {
          amount = Math.round(base * (t.percent / 100) * 100) / 100
          break
        }
      }
      return amount
    }
    return 0
  }

  /* ── 手动奖惩 ── */

  async createManualEntry(storeId: number, body: ManualEntryDto, operatorId: number): Promise<{ id: number; status: string }> {
    const plan = await this.prisma.splitPlan.findFirst({ where: { id: body.planId, storeId, status: 'ACTIVE' } })
    if (plan === null) throw new NotFoundException('ACTIVE 方案不存在')
    const rules = await this.prisma.splitRule.findMany({ where: { planId: plan.id } })
    const rule = rules[0]
    if (rule === undefined) throw new BadRequestException('方案无规则项,不可手动计提')
    // S2 审批联动:|amount| ≥ 阈值(env MANUAL_DEDUCT_THRESHOLD)→ PENDING(双人复核,申请人不可自批)
    const threshold = Number(env().MANUAL_DEDUCT_THRESHOLD ?? 500)
    const needsApproval = Math.abs(body.amount) >= threshold
    const status = needsApproval ? 'PENDING' : 'ACCRUED'
    const entry = await this.prisma.splitEntry.create({
      data: {
        storeId,
        planId: plan.id,
        ruleId: rule.id,
        businessDate: new Date(),
        targetScope: body.targetScope,
        targetId: body.targetId,
        targetName: body.targetName,
        baseAmount: body.baseAmount,
        amount: body.amount,
        status,
        payMethod: body.payMethod ?? rule.payMethod,
        refType: 'MANUAL',
        operatorId,
        remark: body.remark ?? null,
      },
    })
    await this.audit(storeId, operatorId, 'SPLIT_ENTRY_MANUAL', 'split_entry', String(entry.id), null, {
      targetId: body.targetId,
      amount: body.amount,
      status,
    })
    return { id: entry.id, status }
  }

  /** S2 双人复核:复核人 ≠ 制单人;APPROVE→ACCRUED / REJECT→REJECTED(终态,不进结算) */
  async decideEntry(id: number, storeId: number, operatorId: number, approve: boolean, remark: string): Promise<void> {
    const before = await this.prisma.splitEntry.findUnique({ where: { id } })
    if (before === null || before.storeId !== storeId) throw new NotFoundException('计提记录不存在')
    if (before.status !== 'PENDING') throw new BadRequestException('仅 PENDING 态可复核')
    if (before.operatorId === operatorId) throw new BadRequestException('复核人不可为制单人(双人复核)')
    const after = await this.prisma.splitEntry.update({
      where: { id },
      data: { status: approve ? 'ACCRUED' : 'REJECTED', remark: (before.remark ? before.remark + ' · ' : '') + '复核:' + (approve ? '通过' : '驳回') + '(by ' + String(operatorId) + ')' },
    })
    await this.audit(storeId, operatorId, approve ? 'SPLIT_ENTRY_APPROVE' : 'SPLIT_ENTRY_REJECT', 'split_entry', String(id), before, after)
  }

  /** PENDING 列表(待我复核=非本人制单) */
  async listPending(storeId: number, operatorId: number) {
    const rows = await this.prisma.splitEntry.findMany({
      where: { storeId, status: 'PENDING', operatorId: { not: operatorId } },
      orderBy: { id: 'desc' },
      take: 100,
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        planId: r.planId,
        targetScope: r.targetScope,
        targetId: r.targetId,
        targetName: r.targetName,
        baseAmount: Number(r.baseAmount),
        amount: Number(r.amount),
        remark: r.remark,
      })),
    }
  }

  /** 冲正:反向条目(只增纪律) */
  async reverseEntry(id: number, storeId: number, operatorId: number, remark: string): Promise<{ reverseId: number }> {
    const before = await this.prisma.splitEntry.findUnique({ where: { id } })
    if (before === null || before.storeId !== storeId) throw new NotFoundException('计提记录不存在')
    if (before.status === 'REVERSED') throw new BadRequestException('已是冲正态')
    if (before.settlementId !== null) throw new BadRequestException('已入结算单,不可冲正')
    const reverse = await this.prisma.splitEntry.create({
      data: {
        storeId,
        planId: before.planId,
        ruleId: before.ruleId,
        businessDate: before.businessDate,
        targetScope: before.targetScope,
        targetId: before.targetId,
        targetName: before.targetName,
        baseAmount: before.baseAmount,
        amount: -Number(before.amount),
        status: 'REVERSED',
        payMethod: before.payMethod,
        refType: 'REVERSE_OF',
        refId: before.id,
        operatorId,
        remark,
      },
    })
    await this.prisma.splitEntry.update({ where: { id }, data: { status: 'REVERSED' } })
    await this.audit(storeId, operatorId, 'SPLIT_ENTRY_REVERSE', 'split_entry', String(id), before, null)
    return { reverseId: reverse.id }
  }

  async listEntries(storeId: number, q: { planId?: number; targetScope?: string; status?: string }) {
    const rows = await this.prisma.splitEntry.findMany({
      where: {
        storeId,
        ...(q.planId !== undefined ? { planId: q.planId } : {}),
        ...(q.targetScope !== undefined ? { targetScope: q.targetScope } : {}),
        ...(q.status !== undefined ? { status: q.status } : {}),
      },
      orderBy: { id: 'desc' },
      take: 200,
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        planId: r.planId,
        ruleId: r.ruleId,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        targetScope: r.targetScope,
        targetId: r.targetId,
        targetName: r.targetName,
        baseAmount: Number(r.baseAmount),
        amount: Number(r.amount),
        status: r.status,
        payMethod: r.payMethod,
        settlementId: r.settlementId,
        remark: r.remark,
      })),
    }
  }

  /* ── 结算单 ── */

  async createSettlement(storeId: number, body: SettlementDto & { operatorId: number }): Promise<{ id: number; amount: number; entryCount: number }> {
    const from = new Date(body.periodFrom)
    const to = new Date(body.periodTo)
    const pending = await this.prisma.splitEntry.findMany({
      where: {
        storeId,
        targetScope: body.targetScope,
        targetId: body.targetId,
        status: 'ACCRUED',
        businessDate: { gte: from, lte: to },
        settlementId: null,
      },
    })
    if (pending.length === 0) throw new BadRequestException('该对象周期内无待结算计提')
    const amount = Math.round(pending.reduce((a, e) => a + Number(e.amount), 0) * 100) / 100
    const settlement = await this.prisma.splitSettlement.create({
      data: {
        storeId,
        targetScope: body.targetScope,
        targetId: body.targetId,
        targetName: body.targetName,
        periodFrom: from,
        periodTo: to,
        amount,
        entryCount: pending.length,
        payMethod: body.payMethod,
        status: 'CONFIRMED',
        confirmedBy: body.operatorId,
      },
    })
    await this.prisma.splitEntry.updateMany({
      where: { id: { in: pending.map((e) => e.id) } },
      data: { settlementId: settlement.id, status: 'CONFIRMED', payMethod: body.payMethod },
    })
    await this.audit(storeId, body.operatorId, 'SPLIT_SETTLEMENT_CREATE', 'split_settlement', String(settlement.id), null, {
      targetId: body.targetId,
      amount,
      entryCount: pending.length,
    })
    return { id: settlement.id, amount, entryCount: pending.length }
  }

  async paySettlement(id: number, storeId: number, payRef: string, operatorId: number): Promise<void> {
    const before = await this.prisma.splitSettlement.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('结算单不存在')
    if (before.status === 'PAID') throw new BadRequestException('已支付')
    // OFFSET 台费冲抵(仅 ARTIST 对象):生成只增流水(MANUAL_DEDUCT 负额,refType=split_settlement)
    if (before.payMethod === 'OFFSET') {
      if (before.targetScope !== 'ARTIST') {
        throw new BadRequestException('OFFSET 冲抵仅支持销售经理/资源经理(台费账户)')
      }
      const artist = await this.prisma.artist.findUnique({ where: { id: before.targetId } })
      if (artist === null) throw new NotFoundException('对象档案不存在')
      await this.prisma.stageFeeTxn.create({
        data: {
          storeId,
          businessDate: new Date(),
          artistId: before.targetId,
          stageName: artist.stageName,
          badgeNo: artist.badgeNo,
          groupId: artist.groupId,
          type: 'MANUAL_DEDUCT',
          amount: -Number(before.amount),
          refType: 'split_settlement',
          refId: before.id,
          remark: '分账结算 OFFSET 冲抵(结算单 ' + String(before.id) + ')',
          operatorId,
        },
      })
    }
    const after = await this.prisma.splitSettlement.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), payRef },
    })
    await this.prisma.splitEntry.updateMany({
      where: { settlementId: id },
      data: { status: 'PAID' },
    })
    await this.audit(storeId, operatorId, 'SPLIT_SETTLEMENT_PAY', 'split_settlement', String(id), before, after)
  }

  /** S2 结算报表(人/期/类目聚合):按对象与方案类目汇总 CONFIRMED+PAID */
  async settlementReport(storeId: number, from: Date, to: Date) {
    const rows = await this.prisma.splitSettlement.findMany({
      where: { storeId, createdAt: { gte: from, lte: to } },
      orderBy: { id: 'desc' },
      take: 500,
    })
    const entries = await this.prisma.splitEntry.findMany({
      where: { storeId, settlementId: { not: null } },
      select: { settlementId: true, planId: true, amount: true },
    })
    const plans = await this.prisma.splitPlan.findMany({ where: { storeId }, select: { id: true, category: true } })
    const catMap = new Map(plans.map((p) => [p.id, p.category]))
    const byTarget = new Map<string, { targetName: string; amount: number; count: number }>()
    const byCategory = new Map<string, { category: string; amount: number; count: number }>()
    for (const r of rows) {
      const tk = r.targetScope + ':' + String(r.targetId)
      const t = byTarget.get(tk) ?? { targetName: r.targetName, amount: 0, count: 0 }
      t.amount += Number(r.amount)
      t.count += 1
      byTarget.set(tk, t)
    }
    const entryBySettlement = new Map<number, { planId: number; amount: number }[]>()
    for (const e of entries) {
      if (e.settlementId === null) continue
      const list = entryBySettlement.get(e.settlementId) ?? []
      list.push({ planId: e.planId, amount: Number(e.amount) })
      entryBySettlement.set(e.settlementId, list)
    }
    for (const r of rows) {
      for (const e of entryBySettlement.get(r.id) ?? []) {
        const cat = catMap.get(e.planId) ?? 'MANUAL'
        const c = byCategory.get(cat) ?? { category: cat, amount: 0, count: 0 }
        c.amount += e.amount
        c.count += 1
        byCategory.set(cat, c)
      }
    }
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      total: Math.round(rows.reduce((a, r) => a + Number(r.amount), 0) * 100) / 100,
      byTarget: Array.from(byTarget.values()).map((t) => ({ ...t, amount: Math.round(t.amount * 100) / 100 })),
      byCategory: Array.from(byCategory.values()).map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100 })),
    }
  }

  async listSettlements(storeId: number) {
    const rows = await this.prisma.splitSettlement.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      take: 100,
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        targetScope: r.targetScope,
        targetId: r.targetId,
        targetName: r.targetName,
        periodFrom: r.periodFrom.toISOString().slice(0, 10),
        periodTo: r.periodTo.toISOString().slice(0, 10),
        amount: Number(r.amount),
        entryCount: r.entryCount,
        payMethod: r.payMethod,
        status: r.status,
        paidAt: r.paidAt?.toISOString() ?? null,
      })),
    }
  }

  /** 销售端「我的分成」(ARTIST 强制本人):本人计提条目+按状态净汇总 */
  async myEarnings(storeId: number, scope: 'ADMIN' | 'ARTIST' | undefined, userId: number) {
    if (scope !== 'ARTIST') throw new (await import('@nestjs/common')).UnauthorizedException('仅销售端')
    const rows = await this.prisma.splitEntry.findMany({
      where: { storeId, targetScope: 'ARTIST', targetId: userId },
      orderBy: { id: 'desc' },
      take: 100,
    })
    const total = Math.round(rows.filter((r) => r.status !== 'REVERSED' && r.status !== 'REJECTED').reduce((a, e) => a + Number(e.amount), 0) * 100) / 100
    return {
      total,
      rows: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        baseAmount: Number(r.baseAmount),
        amount: Number(r.amount),
        status: r.status,
        payMethod: r.payMethod,
        remark: r.remark,
      })),
    }
  }

  /** 三向对账(计提↔结算↔支付):状态金额分布+平衡差 */
  async splitBalance(storeId: number) {
    const group = await this.prisma.splitEntry.groupBy({
      by: ['status'],
      where: { storeId },
      _sum: { amount: true },
      _count: { _all: true },
    })
    const byStatus: Record<string, { amount: number; count: number }> = {}
    for (const g of group) {
      byStatus[g.status] = { amount: Number(g._sum.amount ?? 0), count: g._count._all }
    }
    const settlements = await this.prisma.splitSettlement.aggregate({
      where: { storeId, status: { in: ['CONFIRMED', 'PAID'] } },
      _sum: { amount: true },
      _count: { _all: true },
    })
    const settledSum = Math.round(Number(settlements._sum.amount ?? 0) * 100) / 100
    const entryNet = Math.round(((byStatus['ACCRUED']?.amount ?? 0) + (byStatus['CONFIRMED']?.amount ?? 0) + (byStatus['PAID']?.amount ?? 0) + (byStatus['REVERSED']?.amount ?? 0)) * 100) / 100
    return {
      byStatus,
      settledSum,
      settlementCount: settlements._count ?? 0,
      entryNet,
      diff: Math.round((entryNet - settledSum) * 100) / 100,
      note: 'diff=未入结算的 ACCRUED 净额(正常待结算);PENDING 待双人复核',
    }
  }

  /** 报表:分账计提明细(11 张)/结算汇总(12 张)数据源;json/csv/xlsx */
  async entriesReport(storeId: number, q: { from: Date; to: Date }) {
    const rows = await this.prisma.splitEntry.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, status: { not: 'REJECTED' } },
      orderBy: { id: 'asc' },
    })
    const planIds = Array.from(new Set(rows.map((r) => r.planId)))
    const plans = planIds.length > 0
      ? await this.prisma.splitPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true, category: true } })
      : []
    const planMap = new Map(plans.map((p) => [p.id, p]))
    return rows.map((r) => ({
      businessDate: r.businessDate,
      planName: planMap.get(r.planId)?.name ?? String(r.planId),
      category: planMap.get(r.planId)?.category ?? 'MANUAL',
      targetScope: r.targetScope,
      targetName: r.targetName,
      baseAmount: Number(r.baseAmount),
      amount: Number(r.amount),
      status: r.status,
      payMethod: r.payMethod ?? '—',
      createdAt: r.createdAt,
    }))
  }

  async settlementsReport(storeId: number, q: { from: Date; to: Date }) {
    const rows = await this.prisma.splitSettlement.findMany({
      where: { storeId, createdAt: { gte: q.from, lte: q.to } },
      orderBy: { id: 'asc' },
    })
    return rows.map((r) => ({
      businessDate: r.createdAt,
      targetScope: r.targetScope,
      targetName: r.targetName,
      periodFrom: r.periodFrom,
      periodTo: r.periodTo,
      amount: Number(r.amount),
      entryCount: r.entryCount,
      payMethod: r.payMethod,
      status: r.status,
    }))
  }

  private async audit(storeId: number, operatorId: number, action: string, targetType: string, targetId: string, before: unknown, after: unknown): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action,
        targetType,
        targetId,
        beforeJson: (before ?? null) as object,
        afterJson: (after ?? null) as object,
      },
    })
  }
}

/* ── 交接班 Service ── */

@Injectable()
export class HandoverService {
  constructor(private readonly prisma: PrismaService) {}

  /** 生成交接班快照:当班四合计(充值/扣费/结算/点单)+未结订单数(生成时冻结);可指定接班人与跨日归属营业日 */
  async create(storeId: number, body: { shiftName: string; takenBy?: number; businessDate?: string; remark?: string }, operatorId: number) {
    // 跨日班次归属细化:显式指定归属营业日优先;缺省按门店日切口径(如晚班跨零点归属次营业日可显式传)
    const bd = body.businessDate !== undefined && body.businessDate !== '' ? body.businessDate : await this.businessDate(storeId)
    const bdDate = new Date(bd)
    const sumFee = async (type: string): Promise<number> => {
      const r = await this.prisma.stageFeeTxn.aggregate({ where: { storeId, businessDate: bdDate, type }, _sum: { amount: true } })
      return Number(r._sum.amount ?? 0)
    }
    const rechargeTotal = await sumFee('RECHARGE')
    const deductTotal = Math.abs(await sumFee('MANUAL_DEDUCT'))
    const settleTotal = Math.abs(await sumFee('ROOM_SETTLE'))
    const orderAgg = await this.prisma.selfOrder.aggregate({
      where: { storeId, businessDate: bdDate, status: { in: ['PLACED', 'DELIVERED'] } },
      _sum: { totalAmount: true },
    })
    const orderTotal = Number(orderAgg._sum.totalAmount ?? 0)
    const openOrders = await this.prisma.selfOrder.count({
      where: { storeId, businessDate: bdDate, status: 'PLACED' },
    })
    const created = await this.prisma.shiftHandover.create({
      data: {
        storeId,
        businessDate: bdDate,
        shiftName: body.shiftName,
        handedBy: operatorId,
        takenBy: body.takenBy ?? null,
        rechargeTotal,
        deductTotal,
        settleTotal,
        orderTotal,
        openOrders,
        summaryJson: { rechargeTotal, deductTotal, settleTotal, orderTotal, openOrders } as object,
        remark: body.remark ?? null,
      },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action: 'HANDOVER_CREATE',
        targetType: 'shift_handover',
        targetId: String(created.id),
        afterJson: { businessDate: bd, shiftName: body.shiftName } as object,
      },
    })
    return {
      id: created.id,
      businessDate: bd,
      rechargeTotal,
      deductTotal,
      settleTotal,
      orderTotal,
      openOrders,
    }
  }

  async list(storeId: number, businessDate?: string) {
    const rows = await this.prisma.shiftHandover.findMany({
      where: {
        storeId,
        ...(businessDate !== undefined && businessDate !== '' ? { businessDate: new Date(businessDate) } : {}),
      },
      orderBy: { id: 'desc' },
      take: 100,
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        shiftName: r.shiftName,
        handedBy: r.handedBy,
        rechargeTotal: Number(r.rechargeTotal),
        deductTotal: Number(r.deductTotal),
        settleTotal: Number(r.settleTotal),
        orderTotal: Number(r.orderTotal),
        openOrders: r.openOrders,
        status: r.status,
        takenBy: r.takenBy,
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        remark: r.remark,
      })),
    }
  }

  async confirm(id: number, storeId: number, takenBy: number): Promise<void> {
    const before = await this.prisma.shiftHandover.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('交接单不存在')
    if (before.status !== 'OPEN') throw new BadRequestException('交接单非 OPEN 态')
    // 接班人:生成时已指定者优先,否则取确认操作人
    const taker = before.takenBy ?? takenBy
    const after = await this.prisma.shiftHandover.update({
      where: { id },
      data: { status: 'CONFIRMED', takenBy: taker, confirmedAt: new Date() },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: takenBy,
        action: 'HANDOVER_CONFIRM',
        targetType: 'shift_handover',
        targetId: String(id),
        beforeJson: before as object,
        afterJson: after as object,
      },
    })
  }

  /** 交接单导出(CSV BOM;打印/归档) */
  async exportCsv(id: number, storeId: number): Promise<string> {
    const r = await this.prisma.shiftHandover.findFirst({ where: { id, storeId } })
    if (r === null) throw new NotFoundException('交接单不存在')
    const esc = (v: string | number): string => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const lines = [
      '项目,数值',
      '营业日,' + r.businessDate.toISOString().slice(0, 10),
      '班次,' + esc(r.shiftName),
      '充值合计,' + String(r.rechargeTotal),
      '扣费合计,' + String(r.deductTotal),
      '关房结算合计,' + String(r.settleTotal),
      '点单合计,' + String(r.orderTotal),
      '未结订单数,' + String(r.openOrders),
      '状态,' + r.status,
    ]
    return '\uFEFF' + lines.join('\r\n')
  }

  private async businessDate(storeId: number): Promise<string> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    const cut = store?.businessDayCutTime ?? '08:00'
    const now = new Date()
    const parts = cut.split(':')
    const h: number = Number(parts[0] ?? 8)
    const m: number = Number(parts[1] ?? 0)
    const cutAt = new Date(now)
    cutAt.setHours(h, m, 0, 0)
    if (now < cutAt) {
      cutAt.setDate(cutAt.getDate() - 1)
    }
    return now >= cutAt ? now.toISOString().slice(0, 10) : new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)
  }
}

/* ── Controllers ── */

@Controller('split')
export class SplitController {
  constructor(private readonly svc: SplitService) {}

  @RequirePerm('setting:manage')
  @Get('plans')
  async plans(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listPlans(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Post('plans')
  async createPlan(@Req() req: Request, @Body() body: PlanDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createPlan(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Post('plans/:id/activate')
  async activate(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.activatePlan(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { activated: true }
  }

  @RequirePerm('setting:manage')
  @Post('plans/:id/archive')
  async archive(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.archivePlan(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { archived: true }
  }

  /** 计提:按方案+营业日触发(SESSION 类目) */
  @RequirePerm('setting:manage')
  @Post('plans/:id/accrue')
  async accrue(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { businessDate?: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    const bd = body.businessDate ?? new Date().toISOString().slice(0, 10)
    return this.svc.accrue(id, user?.storeId ?? 1, bd, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Get('entries')
  async entries(
    @Req() req: Request,
    @Query('planId') planId?: string,
    @Query('targetScope') targetScope?: string,
    @Query('status') status?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listEntries(user?.storeId ?? 1, {
      planId: planId !== undefined && planId !== '' ? Number(planId) : undefined,
      targetScope,
      status,
    })
  }

  /** 手动奖惩计提 */
  @RequirePerm('setting:manage')
  @Post('entries')
  async createEntry(@Req() req: Request, @Body() body: ManualEntryDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createManualEntry(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Post('entries/:id/reverse')
  async reverse(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { remark?: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.reverseEntry(id, user?.storeId ?? 1, user?.sub ?? 0, body.remark ?? '管理端冲正')
  }

  @RequirePerm('setting:manage')
  @Post('settlements')
  async createSettlement(@Req() req: Request, @Body() body: SettlementDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createSettlement(user?.storeId ?? 1, { ...body, operatorId: user?.sub ?? 0 })
  }

  @RequirePerm('setting:manage')
  @Get('settlements')
  async settlements(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listSettlements(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Get('settlements/report')
  async settlementReport(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    const to2 = to !== undefined && to !== '' ? to : new Date().toISOString().slice(0, 10)
    const from2 = from !== undefined && from !== '' ? from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    return this.svc.settlementReport(user?.storeId ?? 1, new Date(from2), new Date(to2 + 'T23:59:59'))
  }

  /** S2 双人复核:APPROVE/REJECT(复核人≠制单人) */
  @RequirePerm('setting:manage')
  @Post('entries/:id/decide')
  async decide(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approve: boolean; remark?: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.decideEntry(id, user?.storeId ?? 1, user?.sub ?? 0, body.approve === true, body.remark ?? '')
    return { decided: true }
  }

  @RequirePerm('setting:manage')
  @Get('pending')
  async pending(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listPending(user?.storeId ?? 1, user?.sub ?? 0)
  }

  /** 三向对账(计提↔结算↔支付平衡) */
  @RequirePerm('setting:manage')
  @Get('balance')
  async balance(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.splitBalance(user?.storeId ?? 1)
  }

  /** 销售端「我的分成」只读(ARTIST scope 强制本人;无守卫,scope 校验在 svc) */
  @Get('my')
  async myEarnings(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.myEarnings(user?.storeId ?? 1, user?.scope, user?.sub ?? 0)
  }

  /** 报表(第 11 张):分账计提明细 json/csv/xlsx */
  @RequirePerm('setting:manage')
  @Get('report/entries')
  async entriesReport(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    const user = (req as ReqWithUser).user
    const range = {
      from: new Date(from !== undefined && from !== '' ? from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)),
      to: new Date(to !== undefined && to !== '' ? to + 'T23:59:59' : new Date().toISOString().slice(0, 10) + 'T23:59:59'),
    }
    const rows = await this.svc.entriesReport(user?.storeId ?? 1, range)
    if (format === 'csv' || format === 'xlsx') {
      const headers = ['营业日', '方案', '类目', '对象类型', '对象', '基数', '计提额', '状态', '支付方式']
      if (format === 'csv') {
        const esc = (v: unknown): string => {
          const s = String(v ?? '')
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        }
        const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => [r.businessDate.toISOString().slice(0, 10), r.planName, r.category, r.targetScope, r.targetName, r.baseAmount, r.amount, r.status, r.payMethod].map(esc).join(','))].join('\r\n')
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename=split-entries.csv')
        res.send(csv)
        return
      }
      const buf = toXlsx([{ name: '分账计提明细', rows: [headers, ...rows.map((r) => [r.businessDate.toISOString().slice(0, 10), r.planName, r.category, r.targetScope, r.targetName, r.baseAmount, r.amount, r.status, r.payMethod])] }])
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename=split-entries.xlsx')
      res.send(buf)
      return
    }
    res.json({ code: 0, msg: 'ok', data: { rows } })
  }

  /** 报表(第 12 张):分账结算汇总 json/csv/xlsx */
  @RequirePerm('setting:manage')
  @Get('report/settlements')
  async settlementsReportEndpoint(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    const user = (req as ReqWithUser).user
    const range = {
      from: new Date(from !== undefined && from !== '' ? from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)),
      to: new Date(to !== undefined && to !== '' ? to + 'T23:59:59' : new Date().toISOString().slice(0, 10) + 'T23:59:59'),
    }
    const rows = await this.svc.settlementsReport(user?.storeId ?? 1, range)
    if (format === 'csv' || format === 'xlsx') {
      const headers = ['生成时间', '对象类型', '对象', '周期起', '周期止', '金额', '条目数', '支付方式', '状态']
      if (format === 'csv') {
        const esc = (v: unknown): string => {
          const s = String(v ?? '')
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        }
        const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => [r.businessDate.toISOString().slice(0, 10), r.targetScope, r.targetName, r.periodFrom.toISOString().slice(0, 10), r.periodTo.toISOString().slice(0, 10), r.amount, r.entryCount, r.payMethod, r.status].map(esc).join(','))].join('\r\n')
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename=split-settlements.csv')
        res.send(csv)
        return
      }
      const buf = toXlsx([{ name: '分账结算汇总', rows: [headers, ...rows.map((r) => [r.businessDate.toISOString().slice(0, 10), r.targetScope, r.targetName, r.periodFrom.toISOString().slice(0, 10), r.periodTo.toISOString().slice(0, 10), r.amount, r.entryCount, r.payMethod, r.status])] }])
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename=split-settlements.xlsx')
      res.send(buf)
      return
    }
    res.json({ code: 0, msg: 'ok', data: { rows } })
  }

  @RequirePerm('setting:manage')
  @Post('settlements/:id/pay')
  async pay(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { payRef?: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.paySettlement(id, user?.storeId ?? 1, body.payRef ?? '', user?.sub ?? 0)
    return { paid: true }
  }
}

@Controller('handover')
export class HandoverController {
  constructor(private readonly svc: HandoverService) {}

  @RequirePerm('setting:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: HandoverDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.create(
      user?.storeId ?? 1,
      {
        shiftName: body.shiftName,
        takenBy: body.takenBy,
        businessDate: body.businessDate,
        remark: body.remark,
      },
      user?.sub ?? 0,
    )
  }

  @Get()
  async list(@Req() req: Request, @Query('businessDate') businessDate?: string): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list(user?.storeId ?? 1, businessDate)
  }

  @RequirePerm('setting:manage')
  @Post(':id/confirm')
  async confirm(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.confirm(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { confirmed: true }
  }

  /** 交接单导出(CSV BOM;打印/归档) */
  @RequirePerm('setting:manage')
  @Get(':id/export')
  async exportCsv(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<string> {
    const user = (req as ReqWithUser).user
    return this.svc.exportCsv(id, user?.storeId ?? 1)
  }
}

@Module({
  controllers: [SplitController, HandoverController],
  providers: [SplitService, HandoverService, PrismaService],
})
export class SplitHandoverModule {}
