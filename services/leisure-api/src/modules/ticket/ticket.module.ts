/**
 * 台票模块:规则 CRUD(台票设置)/ 购买 / 核销(使用)/ 购买记录 / 使用记录 / 余额
 * 实测依据:App「台票」四页(设置/购买/购买记录/使用记录)+ PC「台票购买设置」(需求全集 §6.6)
 * 红线:
 * - ticket_txn 只增不改不删(与台费流水同纪律);余额 = ΣBUY − ΣUSE(leisure-core ticketBalance)
 * - 购买金额/可核销判定一律 import @yyc3/leisure-core(calcPurchaseAmount/canUseTicket),禁止本地复制
 * - 收费通道走门店清单(现金/转账/自定义1-3,后台可编辑;StoreConfigService.assertPayChannel)
 * - 每日购买上限/购买开关来自「艺人设置 ⑥ 台票购买」
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
  UnauthorizedException,
} from '@nestjs/common'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'
import type { Request } from 'express'
import {
  ERR,
  LeisureError,
  calcPurchaseAmount,
  canUseTicket,
  resolveBusinessDate,
  ticketBalance,
  type TicketRule as CoreTicketRule,
} from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { StoreConfigService } from '../store-config/store-config.module.js'

/* ── DTO ── */

class TicketRuleDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  price!: number
  /** 有效期天数;0=长期 */
  @IsInt()
  @Min(0)
  @Max(3650)
  validDays!: number
  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1
}

class BuyDto {
  @IsInt()
  artistId!: number
  @IsInt()
  ticketRuleId!: number
  @IsInt()
  @Min(1)
  @Max(99)
  qty!: number
  /** 收费通道 code(须在门店通道清单内,服务层二次校验) */
  @IsString()
  @Matches(/^[A-Za-z0-9_]{1,20}$/)
  payChannel!: string
}

class UseDto {
  @IsInt()
  artistId!: number
  @IsInt()
  ticketRuleId!: number
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  qty?: number
  /** 关联场次(上钟核销时带上,便于使用记录追溯) */
  @IsOptional()
  @IsInt()
  refSessionId?: number
}

/* ── 视图 ── */

interface TicketRuleRow {
  id: number
  storeId: number
  name: string
  price: unknown
  validDays: number
  status: number
}

function toCoreRule(r: TicketRuleRow): CoreTicketRule {
  return {
    id: r.id,
    storeId: r.storeId,
    name: r.name,
    price: Number(r.price),
    validDays: r.validDays,
    status: r.status === 1 ? 1 : 0,
  }
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function parseDateOrThrow(s: string | undefined, name: string): Date {
  if (s === undefined || s === '') {
    throw new BadRequestException(name + ' 必填(YYYY-MM-DD)')
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(name + ' 日期格式错误')
  }
  return d
}

/* ── Service ── */

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  /* ── 规则(台票设置) ── */

  async listRules(storeId: number): Promise<{ rows: CoreTicketRule[] }> {
    const rows = await this.prisma.ticketRule.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { id: 'asc' },
    })
    return { rows: rows.map(toCoreRule) }
  }

  async createRule(storeId: number, body: TicketRuleDto, operatorId: number): Promise<{ id: number }> {
    const created = await this.prisma.ticketRule.create({
      data: {
        storeId,
        name: body.name,
        price: body.price,
        validDays: body.validDays,
        status: body.status ?? 1,
      },
    })
    await this.audit(storeId, operatorId, 'TICKET_RULE_CREATE', 'ticket_rule', String(created.id), null, created)
    return { id: created.id }
  }

  async updateRule(id: number, storeId: number, body: TicketRuleDto, operatorId: number): Promise<void> {
    const before = await this.prisma.ticketRule.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('台票规则不存在')
    const after = await this.prisma.ticketRule.update({
      where: { id },
      data: {
        name: body.name,
        price: body.price,
        validDays: body.validDays,
        status: body.status ?? before.status,
      },
    })
    await this.audit(storeId, operatorId, 'TICKET_RULE_UPDATE', 'ticket_rule', String(id), before, after)
  }

  /** 软删;仍有艺人持有该票余额时禁删(避免余额失去规则锚点) */
  async deleteRule(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.ticketRule.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('台票规则不存在')
    const txns = await this.prisma.ticketTxn.findMany({
      where: { storeId, ticketRuleId: id },
      select: { ticketRuleId: true, type: true, qty: true },
    })
    const outstanding = ticketBalance(
      txns.map((t) => ({ ticketRuleId: t.ticketRuleId, type: t.type as 'BUY' | 'USE' | 'EXPIRE', qty: t.qty })),
      id,
    )
    if (outstanding > 0) {
      throw new BadRequestException('仍有艺人持有该台票余额,不可删除(可改为停用)')
    }
    await this.prisma.ticketRule.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'TICKET_RULE_DELETE', 'ticket_rule', String(id), before, null)
  }

  /* ── 购买(购买记录只增) ── */

  async buy(
    p: { artistId: number; ticketRuleId: number; qty: number; payChannel: string },
    operator: { sub: number; storeId?: number },
  ): Promise<{ txnId: number; amount: number; balance: number }> {
    const artist = await this.prisma.artist.findFirst({ where: { id: p.artistId, deletedAt: null } })
    if (artist === null) throw new NotFoundException('艺人不存在')
    if (operator.storeId !== undefined && operator.storeId !== artist.storeId) {
      throw new NotFoundException('艺人不存在')
    }
    const settings = await this.storeConfig.getArtistSettings(artist.storeId)
    if (!settings.ticketPurchaseEnabled) {
      throw new BadRequestException('门店已关闭台票购买(艺人设置 ⑥)')
    }
    const rule = await this.prisma.ticketRule.findFirst({
      where: { id: p.ticketRuleId, storeId: artist.storeId, deletedAt: null, status: 1 },
    })
    if (rule === null) throw new NotFoundException('台票规则不存在或已停用')
    const payChannel = await this.storeConfig.assertPayChannel(artist.storeId, p.payChannel)
    const businessDate = await this.businessDateOf(artist.storeId)

    // 每日购买上限(张;艺人设置 ⑥ maxPerDay;未配置=不限)
    const maxPerDay = settings.ticketPurchaseMaxPerDay
    if (maxPerDay !== undefined && maxPerDay > 0) {
      const agg = await this.prisma.ticketTxn.aggregate({
        where: { artistId: artist.id, businessDate, type: 'BUY' },
        _sum: { qty: true },
      })
      const bought = agg._sum.qty ?? 0
      if (bought + p.qty > maxPerDay) {
        throw new BadRequestException('超出每日台票购买上限(' + String(maxPerDay) + ' 张)')
      }
    }

    const amount = calcPurchaseAmount(toCoreRule(rule), p.qty)
    const txn = await this.prisma.ticketTxn.create({
      data: {
        storeId: artist.storeId,
        businessDate,
        artistId: artist.id,
        type: 'BUY',
        ticketRuleId: rule.id,
        qty: p.qty,
        amount,
        payChannel,
        operatorId: operator.sub,
      },
    })
    await this.audit(artist.storeId, operator.sub, 'TICKET_BUY', 'ticket_txn', String(txn.id), null, txn)
    const balance = await this.balanceOf(artist.id, rule.id)
    return { txnId: txn.id, amount, balance }
  }

  /* ── 核销(使用记录只增;§6.6 上钟抵扣提示后由此落账) ── */

  async use(
    p: { artistId: number; ticketRuleId: number; qty?: number; refSessionId?: number },
    operator: { sub: number; storeId?: number },
  ): Promise<{ txnId: number; balance: number }> {
    const artist = await this.prisma.artist.findFirst({ where: { id: p.artistId, deletedAt: null } })
    if (artist === null) throw new NotFoundException('艺人不存在')
    if (operator.storeId !== undefined && operator.storeId !== artist.storeId) {
      throw new NotFoundException('艺人不存在')
    }
    // 规则停用仍允许消耗既有余额(停用只拦新购)
    const rule = await this.prisma.ticketRule.findFirst({
      where: { id: p.ticketRuleId, storeId: artist.storeId, deletedAt: null },
    })
    if (rule === null) throw new NotFoundException('台票规则不存在')
    const qty = p.qty ?? 1

    const txnRows = await this.prisma.ticketTxn.findMany({
      where: { artistId: artist.id, ticketRuleId: rule.id },
      select: { ticketRuleId: true, type: true, qty: true, createdAt: true },
    })
    const txns = txnRows.map((t) => ({
      ticketRuleId: t.ticketRuleId,
      type: t.type as 'BUY' | 'USE' | 'EXPIRE',
      qty: t.qty,
      createdAt: t.createdAt.toISOString(),
    }))
    const verdict = canUseTicket(txns, toCoreRule(rule))
    if (!verdict.ok) {
      if (verdict.reason === 'EXPIRED') {
        throw new LeisureError(ERR.TICKET_EXPIRED, '台票已过期')
      }
      throw new LeisureError(ERR.TICKET_NO_BALANCE, '台票余额不足')
    }
    if (ticketBalance(txns, rule.id) < qty) {
      throw new LeisureError(ERR.TICKET_NO_BALANCE, '台票余额不足')
    }
    if (p.refSessionId !== undefined) {
      const session = await this.prisma.showSession.findFirst({
        where: { id: p.refSessionId, storeId: artist.storeId, artistId: artist.id },
        select: { id: true },
      })
      if (session === null) throw new NotFoundException('关联场次不存在或不属于该艺人')
    }

    const businessDate = await this.businessDateOf(artist.storeId)
    const txn = await this.prisma.ticketTxn.create({
      data: {
        storeId: artist.storeId,
        businessDate,
        artistId: artist.id,
        type: 'USE',
        ticketRuleId: rule.id,
        qty,
        amount: 0,
        refSessionId: p.refSessionId ?? null,
        operatorId: operator.sub,
      },
    })
    await this.audit(artist.storeId, operator.sub, 'TICKET_USE', 'ticket_txn', String(txn.id), null, txn)
    const balance = await this.balanceOf(artist.id, rule.id)
    return { txnId: txn.id, balance }
  }

  /* ── 流水(购买记录 type=BUY / 使用记录 type=USE) ── */

  async listTxns(
    storeId: number,
    q: {
      type?: string
      artistId?: number
      keyword?: string
      businessDateFrom: string
      businessDateTo: string
      page: number
      pageSize: number
    },
  ): Promise<{ rows: unknown[]; total: number; totalAmount: number; page: number; pageSize: number }> {
    const from = parseDateOrThrow(q.businessDateFrom, 'businessDateFrom')
    const to = parseDateOrThrow(q.businessDateTo, 'businessDateTo')
    const page = q.page > 0 ? q.page : 1
    const pageSize = q.pageSize > 0 ? Math.min(q.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
    const keyword = q.keyword?.trim() ?? ''
    const where = {
      storeId,
      ...(q.type !== undefined && q.type !== '' ? { type: q.type } : {}),
      ...(q.artistId !== undefined ? { artistId: q.artistId } : {}),
      ...(keyword !== ''
        ? { artist: { OR: [{ stageName: { contains: keyword } }, { badgeNo: { contains: keyword } }, { realName: { contains: keyword } }] } }
        : {}),
      businessDate: { gte: from, lte: to },
    }
    const [rows, total, agg] = await this.prisma.$transaction([
      this.prisma.ticketTxn.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { artist: { select: { stageName: true, badgeNo: true, realName: true } } },
      }),
      this.prisma.ticketTxn.count({ where }),
      this.prisma.ticketTxn.aggregate({ where, _sum: { amount: true } }),
    ])
    const ruleIds = Array.from(new Set(rows.map((r) => r.ticketRuleId)))
    const rules = ruleIds.length > 0
      ? await this.prisma.ticketRule.findMany({ where: { id: { in: ruleIds } }, select: { id: true, name: true } })
      : []
    const ruleName = new Map(rules.map((r) => [r.id, r.name]))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        artistId: r.artistId,
        stageName: r.artist.stageName,
        badgeNo: r.artist.badgeNo,
        realName: r.artist.realName,
        type: r.type,
        ticketRuleId: r.ticketRuleId,
        ruleName: ruleName.get(r.ticketRuleId) ?? '',
        qty: r.qty,
        amount: Number(r.amount),
        payChannel: r.payChannel,
        refSessionId: r.refSessionId,
        operatorId: r.operatorId,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      totalAmount: Number(agg._sum.amount ?? 0),
      page,
      pageSize,
    }
  }

  /* ── 余额(按规则聚合;含有效期) ── */

  async balance(artistId: number, storeId?: number): Promise<{
    rows: Array<{ ticketRuleId: number; name: string; validDays: number; balance: number; expireAt: string | null; expired: boolean }>
    total: number
  }> {
    const artist = await this.prisma.artist.findFirst({ where: { id: artistId, deletedAt: null } })
    if (artist === null || (storeId !== undefined && artist.storeId !== storeId)) {
      throw new NotFoundException('艺人不存在')
    }
    const txnRows = await this.prisma.ticketTxn.findMany({
      where: { artistId },
      select: { ticketRuleId: true, type: true, qty: true, createdAt: true },
    })
    const txns = txnRows.map((t) => ({
      ticketRuleId: t.ticketRuleId,
      type: t.type as 'BUY' | 'USE' | 'EXPIRE',
      qty: t.qty,
      createdAt: t.createdAt.getTime(),
    }))
    const ruleIds = Array.from(new Set(txns.map((t) => t.ticketRuleId)))
    const rules = ruleIds.length > 0
      ? await this.prisma.ticketRule.findMany({ where: { id: { in: ruleIds } } })
      : []
    const now = Date.now()
    const rows = rules.map((r) => {
      const raw = ticketBalance(txns, r.id)
      let expireAt: string | null = null
      let expired = false
      if (r.validDays > 0) {
        const buys = txns.filter((t) => t.ticketRuleId === r.id && t.type === 'BUY').map((t) => t.createdAt)
        if (buys.length > 0) {
          const expireTs = Math.min(...buys) + r.validDays * 86_400_000
          expireAt = new Date(expireTs).toISOString()
          // 与 canUseTicket 同口径:到期即不可用,余额视图归零(资金无损,仅展示一致性)
          expired = now >= expireTs
        }
      }
      return { ticketRuleId: r.id, name: r.name, validDays: r.validDays, balance: expired ? 0 : raw, expireAt, expired }
    })
    return { rows, total: rows.reduce((acc, r) => acc + r.balance, 0) }
  }

  /** 艺人端:本人余额 + 流水(scope=ARTIST) */
  async my(artistId: number, q: { businessDateFrom: string; businessDateTo: string }): Promise<unknown> {
    const artist = await this.prisma.artist.findFirst({ where: { id: artistId, deletedAt: null } })
    if (artist === null) throw new NotFoundException('艺人不存在')
    const balance = await this.balance(artistId)
    const txns = await this.listTxns(artist.storeId, {
      artistId,
      businessDateFrom: q.businessDateFrom,
      businessDateTo: q.businessDateTo,
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    })
    return { balance, txns: txns.rows }
  }

  /* ── 内部 ── */

  private async balanceOf(artistId: number, ruleId: number): Promise<number> {
    const txns = await this.prisma.ticketTxn.findMany({
      where: { artistId, ticketRuleId: ruleId },
      select: { ticketRuleId: true, type: true, qty: true },
    })
    return ticketBalance(
      txns.map((t) => ({ ticketRuleId: t.ticketRuleId, type: t.type as 'BUY' | 'USE' | 'EXPIRE', qty: t.qty })),
      ruleId,
    )
  }

  private async businessDateOf(storeId: number): Promise<Date> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    const cut = store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
    return new Date(resolveBusinessDate(new Date(), { cutTime: cut }))
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

@Controller('ticket-rules')
export class TicketRuleController {
  constructor(private readonly svc: TicketService) {}

  @RequirePerm('ticketrule:manage')
  @Get()
  async list(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listRules(user?.storeId ?? 1)
  }

  @RequirePerm('ticketrule:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: TicketRuleDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createRule(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('ticketrule:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: TicketRuleDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateRule(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('ticketrule:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteRule(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Controller('tickets')
export class TicketController {
  constructor(private readonly svc: TicketService) {}

  @RequirePerm('ticket:buy')
  @Post('purchase')
  async purchase(@Req() req: Request, @Body() body: BuyDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.buy(body, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('ticket:use')
  @Post('use')
  async use(@Req() req: Request, @Body() body: UseDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.use(body, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('ticket:ledger:view')
  @Get('txns')
  async txns(
    @Req() req: Request,
    @Query('businessDateFrom') businessDateFrom: string,
    @Query('businessDateTo') businessDateTo: string,
    @Query('type') type?: string,
    @Query('artistId') artistId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listTxns(user?.storeId ?? 1, {
      type,
      artistId: artistId !== undefined && artistId !== '' ? Number(artistId) : undefined,
      keyword,
      businessDateFrom,
      businessDateTo,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? DEFAULT_PAGE_SIZE),
    })
  }

  @RequirePerm('ticket:ledger:view')
  @Get('balance/:artistId')
  async balance(@Req() req: Request, @Param('artistId', ParseIntPipe) artistId: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.balance(artistId, user?.storeId)
  }

  /** 艺人端:本人台票余额+流水(scope=ARTIST) */
  @Get('my')
  async my(
    @Req() req: Request,
    @Query('businessDateFrom') businessDateFrom: string,
    @Query('businessDateTo') businessDateTo: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    if (user === undefined || user.scope !== 'ARTIST') {
      throw new UnauthorizedException('仅艺人端可查询本人台票')
    }
    return this.svc.my(user.sub, { businessDateFrom, businessDateTo })
  }
}

@Module({
  controllers: [TicketRuleController, TicketController],
  providers: [TicketService, PrismaService, StoreConfigService],
  exports: [TicketService],
})
export class TicketModule {}
