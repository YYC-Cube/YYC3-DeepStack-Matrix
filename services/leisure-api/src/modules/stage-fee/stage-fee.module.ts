/**
 * 台费模块:规则 CRUD / 充值 / 手动扣费(阈值审批)/ 流水三查 / 余额 / 冲正
 * 红线(铁律 2):
 * - 台费流水只增不改不删;更正走 REVERSE 反向流水(DB 层 REVOKE 见 docker/mysql-init/02-accounts.sql)
 * - 手动扣费备注必填;金额 ≥ 阈值(默认 500)生成审批单(PENDING 不落流水,审批通过才落账)
 * - 余额 = Σ流水(leisure-core sumFeeBalance);允许负数=对齐实测「未收款」(ALLOW_NEGATIVE_BALANCE)
 * 依据:04-API §4 + 08-测试 C-01~C-15 + 需求全集 §8.3(流水冗余艺人/组别/包厢字段)
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common'
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Length,
  Min,
} from 'class-validator'
import type { Request } from 'express'
import {
  ERR,
  LeisureError,
  resolveBusinessDate,
  resolveStageFeeRule,
  sumFeeBalance,
} from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

/* ── DTO ── */

class FeeRuleDto {
  @IsInt()
  levelId!: number
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  roomTypeIds!: number[]
  @IsNumber()
  @Min(0)
  amount!: number
}

class RechargeDto {
  @IsInt()
  artistId!: number
  @IsNumber()
  @Min(0.01)
  amount!: number
  @IsIn(['CASH', 'DOUYIN'])
  payChannel!: 'CASH' | 'DOUYIN'
}

class ManualDeductDto {
  @IsInt()
  artistId!: number
  @IsNumber()
  @Min(0.01)
  amount!: number
  @IsString()
  @Length(1, 255)
  remark!: string
}

class ReverseDto {
  @IsString()
  @Length(1, 255)
  remark!: string
}

/* ── Service ── */

@Injectable()
export class StageFeeService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 规则(等级×房型矩阵,A5) ── */

  async listRules(storeId: number, levelId?: number): Promise<unknown> {
    return this.prisma.stageFeeRule.findMany({
      where: { storeId, levelId, deletedAt: null },
      orderBy: [{ levelId: 'asc' }, { id: 'asc' }],
    })
  }

  async createRule(storeId: number, body: FeeRuleDto, operatorId: number): Promise<{ id: number }> {
    await this.assertLevelExists(storeId, body.levelId)
    await this.assertRoomTypesExist(storeId, body.roomTypeIds)
    const created = await this.prisma.stageFeeRule.create({
      data: {
        storeId,
        levelId: body.levelId,
        roomTypeIds: body.roomTypeIds,
        amount: body.amount,
      },
    })
    await this.audit(storeId, operatorId, 'FEE_RULE_CREATE', 'stage_fee_rule', String(created.id), null, created)
    return { id: created.id }
  }

  async updateRule(id: number, storeId: number, body: FeeRuleDto, operatorId: number): Promise<void> {
    const before = await this.prisma.stageFeeRule.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('台费规则不存在')
    await this.assertRuleEditable(storeId, body.roomTypeIds)
    await this.assertLevelExists(storeId, body.levelId)
    await this.assertRoomTypesExist(storeId, body.roomTypeIds)
    const after = await this.prisma.stageFeeRule.update({
      where: { id },
      data: { levelId: body.levelId, roomTypeIds: body.roomTypeIds, amount: body.amount },
    })
    await this.audit(storeId, operatorId, 'FEE_RULE_UPDATE', 'stage_fee_rule', String(id), before, after)
  }

  async deleteRule(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.stageFeeRule.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('台费规则不存在')
    const roomTypeIds = Array.isArray(before.roomTypeIds) ? (before.roomTypeIds as number[]) : []
    await this.assertRuleEditable(storeId, roomTypeIds)
    await this.prisma.stageFeeRule.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'FEE_RULE_DELETE', 'stage_fee_rule', String(id), before, null)
  }

  /** C-03:该房型当日已有上钟 → 规则禁改(40903) */
  private async assertRuleEditable(storeId: number, roomTypeIds: number[]): Promise<void> {
    if (roomTypeIds.length === 0) return
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    const cut = store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
    const today = new Date(resolveBusinessDate(new Date(), { cutTime: cut }))
    const count = await this.prisma.showSession.count({
      where: { storeId, businessDate: today, roomTypeId: { in: roomTypeIds } },
    })
    if (count > 0) {
      throw new LeisureError(ERR.RULE_LOCKED_BY_SESSION, '该包厢类型当日已有上钟,规则禁改')
    }
  }

  private async assertLevelExists(storeId: number, levelId: number): Promise<void> {
    const level = await this.prisma.artistLevel.findFirst({
      where: { id: levelId, storeId, deletedAt: null },
    })
    if (level === null) throw new NotFoundException('艺人等级不存在')
  }

  private async assertRoomTypesExist(storeId: number, roomTypeIds: number[]): Promise<void> {
    const found = await this.prisma.roomType.count({
      where: { storeId, id: { in: roomTypeIds }, status: 1 },
    })
    if (found !== roomTypeIds.length) {
      throw new NotFoundException('包厢类型不存在或已停用')
    }
  }

  /* ── 充值(C-10 幂等由 Idempotency-Key 拦截器承担) ── */

  async recharge(
    p: { artistId: number; amount: number; payChannel: 'CASH' | 'DOUYIN' },
    operator: { sub: number; storeId?: number },
  ): Promise<{ txnId: number; balance: number }> {
    // MVP 仅现金记账;抖音渠道预下单+回调落流水为 II 期(10 号文档 §2.5)
    if (p.payChannel !== 'CASH') {
      throw new BadRequestException('当前仅支持现金渠道,抖音支付 II 期开通')
    }
    const artist = await this.prisma.artist.findFirst({
      where: { id: p.artistId, deletedAt: null },
    })
    if (artist === null) throw new NotFoundException('艺人不存在')
    const store = await this.prisma.store.findUnique({ where: { id: artist.storeId } })
    const cut = store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
    const businessDate = new Date(resolveBusinessDate(new Date(), { cutTime: cut }))
    const txn = await this.prisma.stageFeeTxn.create({
      data: {
        storeId: artist.storeId,
        businessDate,
        artistId: artist.id,
        stageName: artist.stageName,
        badgeNo: artist.badgeNo,
        groupId: artist.groupId,
        type: 'RECHARGE',
        amount: p.amount,
        payChannel: 'CASH',
        operatorId: operator.sub,
      },
    })
    await this.audit(artist.storeId, operator.sub, 'FEE_RECHARGE', 'stage_fee_txn', String(txn.id), null, txn)
    const balance = await this.balanceOf(artist.id)
    return { txnId: txn.id, balance }
  }

  /* ── 手动扣费(备注必填;≥阈值走审批) ── */

  async manualDeduct(
    p: { artistId: number; amount: number; remark: string },
    operator: { sub: number; storeId?: number },
  ): Promise<{ txnId?: number; balance?: number; approvalId?: number }> {
    const artist = await this.prisma.artist.findFirst({
      where: { id: p.artistId, deletedAt: null },
    })
    if (artist === null) throw new NotFoundException('艺人不存在')
    const store = await this.prisma.store.findUnique({ where: { id: artist.storeId } })
    const cut = store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
    const businessDate = new Date(resolveBusinessDate(new Date(), { cutTime: cut }))

    const threshold = env().MANUAL_DEDUCT_THRESHOLD
    if (p.amount >= threshold) {
      // 高额 → 审批单(PENDING 不落流水;审批通过由 approval 模块落账,C-08)
      const approval = await this.prisma.approval.create({
        data: {
          storeId: artist.storeId,
          bizType: 'MANUAL_DEDUCT',
          bizPayload: {
            artistId: artist.id,
            artistStoreId: artist.storeId,
            businessDate: resolveBusinessDate(new Date(), { cutTime: cut }),
            stageName: artist.stageName,
            badgeNo: artist.badgeNo,
            groupId: artist.groupId,
            amount: p.amount,
            remark: p.remark,
          },
          amount: p.amount,
          applicantId: operator.sub,
          remark: p.remark,
        },
      })
      await this.audit(artist.storeId, operator.sub, 'FEE_MANUAL_APPLY', 'approval', String(approval.id), null, approval)
      // 41201 → HTTP 202(10 号文档 §五 异常映射:审批挂起)
      throw new LeisureError(ERR.APPROVAL_PENDING, '金额达到审批阈值,已生成审批单,审批通过后落账', {
        approvalId: approval.id,
      })
    }

    const txn = await this.prisma.stageFeeTxn.create({
      data: {
        storeId: artist.storeId,
        businessDate,
        artistId: artist.id,
        stageName: artist.stageName,
        badgeNo: artist.badgeNo,
        groupId: artist.groupId,
        type: 'MANUAL_DEDUCT',
        amount: -p.amount,
        refType: 'manual',
        remark: p.remark,
        operatorId: operator.sub,
      },
    })
    await this.audit(artist.storeId, operator.sub, 'FEE_MANUAL_DEDUCT', 'stage_fee_txn', String(txn.id), null, txn)
    const balance = await this.balanceOf(artist.id)
    return { txnId: txn.id, balance }
  }

  /* ── 流水三查(充值/扣费/汇总共用;A9/A10/A11) ── */

  async txns(q: {
    storeId: number
    businessDateFrom: string
    businessDateTo: string
    type?: string
    groupId?: number
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<{ rows: unknown[]; total: number; totalAmount: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    const where = {
      storeId: q.storeId,
      businessDate: { gte: new Date(q.businessDateFrom), lte: new Date(q.businessDateTo) },
      type: q.type,
      groupId: q.groupId,
      OR:
        q.keyword !== undefined && q.keyword !== ''
          ? [
              { stageName: { contains: q.keyword } },
              { badgeNo: { contains: q.keyword } },
            ]
          : undefined,
    }
    const [rows, total, agg] = await Promise.all([
      this.prisma.stageFeeTxn.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stageFeeTxn.count({ where }),
      this.prisma.stageFeeTxn.aggregate({ where, _sum: { amount: true } }),
    ])
    return { rows, total, totalAmount: Number(agg._sum.amount ?? 0) }
  }

  /** 余额 = Σ流水(审批挂起单不计入;C-13) */
  async balanceOf(artistId: number): Promise<number> {
    const txns = await this.prisma.stageFeeTxn.findMany({
      where: { artistId },
      select: { amount: true },
    })
    return sumFeeBalance(txns.map((t) => ({ amount: Number(t.amount) })))
  }

  async balance(artistId: number): Promise<{ balance: number }> {
    return { balance: await this.balanceOf(artistId) }
  }

  /* ── 冲正(C-12):REVERSE 反向流水 + 关联原单;原单不动 ── */

  async reverse(
    txnId: number,
    remark: string,
    operator: { sub: number; storeId?: number },
  ): Promise<{ txnId: number; balance: number }> {
    const original = await this.prisma.stageFeeTxn.findUnique({ where: { id: txnId } })
    if (original === null) throw new NotFoundException('原流水不存在')
    if (original.type === 'REVERSE') {
      throw new BadRequestException('冲正流水不可再次冲正')
    }
    const txn = await this.prisma.stageFeeTxn.create({
      data: {
        storeId: original.storeId,
        businessDate: original.businessDate,
        artistId: original.artistId,
        stageName: original.stageName,
        badgeNo: original.badgeNo,
        groupId: original.groupId,
        type: 'REVERSE',
        amount: -Number(original.amount),
        refType: 'reverse',
        refId: original.id,
        remark,
        operatorId: operator.sub,
      },
    })
    await this.audit(original.storeId, operator.sub, 'FEE_REVERSE', 'stage_fee_txn', String(txn.id), original, txn)
    const balance = await this.balanceOf(original.artistId)
    return { txnId: txn.id, balance }
  }

  /** 规则解析暴露给联调(带出单价预览) */
  async resolveRule(storeId: number, levelId: number, roomTypeId: number): Promise<{ unitPrice: number; ruleId?: number }> {
    const rows = await this.prisma.stageFeeRule.findMany({
      where: { storeId, deletedAt: null },
    })
    const rules = rows.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      levelId: r.levelId,
      roomTypeIds: Array.isArray(r.roomTypeIds) ? (r.roomTypeIds as number[]) : [],
      amount: Number(r.amount),
    }))
    const rule = resolveStageFeeRule(rules, levelId, roomTypeId)
    return { unitPrice: rule !== undefined ? Number(rule.amount) : 0, ruleId: rule?.id }
  }

  private async audit(
    storeId: number,
    operatorId: number,
    action: string,
    targetType: string,
    targetId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
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

/* ── Controller ── */

@Controller('stage-fee-rules')
export class FeeRuleController {
  constructor(private readonly svc: StageFeeService) {}

  @RequirePerm('feerule:manage')
  @Get()
  async list(@Req() req: Request, @Query('levelId') levelId?: string): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listRules(user?.storeId ?? 1, levelId !== undefined ? Number(levelId) : undefined)
  }

  @RequirePerm('feerule:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: FeeRuleDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createRule(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('feerule:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: FeeRuleDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateRule(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('feerule:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteRule(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Controller('stage-fee')
export class StageFeeController {
  constructor(private readonly svc: StageFeeService) {}

  @RequirePerm('fee:recharge')
  @Post('recharge')
  async recharge(@Req() req: Request, @Body() body: RechargeDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.recharge(body, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('fee:manual')
  @Post('manual-deduct')
  async manualDeduct(@Req() req: Request, @Body() body: ManualDeductDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.manualDeduct(body, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('fee:ledger:view')
  @Get('txns')
  async txns(
    @Req() req: Request,
    @Query('businessDateFrom') businessDateFrom: string,
    @Query('businessDateTo') businessDateTo: string,
    @Query('type') type?: string,
    @Query('groupId') groupId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.txns({
      storeId: user?.storeId ?? 1,
      businessDateFrom,
      businessDateTo,
      type,
      groupId: groupId !== undefined ? Number(groupId) : undefined,
      keyword,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }

  @RequirePerm('fee:ledger:view')
  @Get('balance/:artistId')
  async balance(@Req() req: Request, @Param('artistId', ParseIntPipe) artistId: number): Promise<unknown> {
    return this.svc.balance(artistId)
  }

  @RequirePerm('fee:manual')
  @Post('txns/:id/reverse')
  async reverse(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReverseDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.reverse(id, body.remark, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('feerule:manage')
  @Get('resolve-rule')
  async resolveRule(
    @Req() req: Request,
    @Query('levelId') levelId: string,
    @Query('roomTypeId') roomTypeId: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.resolveRule(user?.storeId ?? 1, Number(levelId), Number(roomTypeId))
  }
}

@Module({
  controllers: [FeeRuleController, StageFeeController],
  providers: [StageFeeService, PrismaService],
  exports: [StageFeeService],
})
export class StageFeeModule {}
