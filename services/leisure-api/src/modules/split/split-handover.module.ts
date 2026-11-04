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
  BadRequestException,
} from '@nestjs/common'
import { IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min, Max, IsNumber } from 'class-validator'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

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

  async createManualEntry(storeId: number, body: ManualEntryDto, operatorId: number): Promise<{ id: number }> {
    const plan = await this.prisma.splitPlan.findFirst({ where: { id: body.planId, storeId, status: 'ACTIVE' } })
    if (plan === null) throw new NotFoundException('ACTIVE 方案不存在')
    const rules = await this.prisma.splitRule.findMany({ where: { planId: plan.id } })
    const rule = rules[0]
    if (rule === undefined) throw new BadRequestException('方案无规则项,不可手动计提')
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
        status: 'ACCRUED',
        payMethod: body.payMethod ?? rule.payMethod,
        refType: 'MANUAL',
        operatorId,
        remark: body.remark ?? null,
      },
    })
    await this.audit(storeId, operatorId, 'SPLIT_ENTRY_MANUAL', 'split_entry', String(entry.id), null, {
      targetId: body.targetId,
      amount: body.amount,
    })
    return { id: entry.id }
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

  /** 生成交接班快照:当班四合计(充值/扣费/结算/点单)+未结订单数(生成时冻结) */
  async create(storeId: number, body: { shiftName: string; remark?: string }, operatorId: number) {
    const bd = await this.businessDate(storeId)
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
    const after = await this.prisma.shiftHandover.update({
      where: { id },
      data: { status: 'CONFIRMED', takenBy, confirmedAt: new Date() },
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
    return this.svc.create(user?.storeId ?? 1, body, user?.sub ?? 0)
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
}

@Module({
  controllers: [SplitController, HandoverController],
  providers: [SplitService, HandoverService, PrismaService],
})
export class SplitHandoverModule {}
