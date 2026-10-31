/**
 * 场次模块:上钟/下钟/串台/转包厢/检索(10 号文档 §2.4 + 需求全集 §6.5/§6.6)
 * 红线:
 * - 计费与前置校验一律 import @yyc3/leisure-core(assertCanTakeSession/resolveStageFeeRule/calcSessionFee/diffMinutes)
 * - 上钟必选包厢房号;维修/停用不可选;占用/空闲随上下钟自动流转(§5.3)
 * - 上钟时快照单价+进位阈值+计费模式到场次,下钟按快照核算(§6.4;门店改配置不影响进行中场次)
 * - 转包厢=终止当前计时(同规结算)+同事务新开记录;串台=并行独立核算(§6.6)
 * - 下钟落 SESSION_DEDUCT 流水(只增);余额负数按 ALLOW_NEGATIVE_BALANCE 配置放行(对齐实测未收款)
 */
import {
  BadRequestException,
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
} from '@nestjs/common'
import { IsInt } from 'class-validator'
import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import {
  assertCanTakeSession,
  calcSessionFee,
  diffMinutes,
  resolveBusinessDate,
  resolveStageFeeRule,
  sumFeeBalance,
  ticketBalance,
  ERR,
  LeisureError,
} from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { StoreConfigService } from '../store-config/store-config.module.js'

/** 事务客户端(交互式事务内复用同一套内部方法) */
type DbClient = Pick<
  PrismaService,
  | 'store'
  | 'artist'
  | 'room'
  | 'showSession'
  | 'stageFeeTxn'
  | 'stageFeeRule'
  | 'attendanceReport'
  | 'auditLog'
  | 'ticketTxn'
>

class SessionStartDto {
  @IsInt()
  artistId!: number
  @IsInt()
  roomId!: number
}

class SessionRoomDto {
  @IsInt()
  toRoomId!: number
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  /* ── 上钟(可入事务;transfer 时传入 tx) ── */
  private async startIn(
    db: DbClient,
    p: { artistId: number; roomId: number },
    operator: { sub: number; storeId?: number },
  ): Promise<{ sessionId: number; businessDate: string }> {
    const artist = await db.artist.findFirst({
      where: { id: p.artistId, deletedAt: null, status: 1 },
    })
    if (artist === null) {
      throw new NotFoundException('艺人不存在或已停用')
    }
    const store = await db.store.findUnique({ where: { id: artist.storeId } })
    if (store === null) {
      throw new NotFoundException('门店不存在')
    }
    const room = await db.room.findFirst({
      where: { id: p.roomId, storeId: artist.storeId },
      include: { roomType: true },
    })
    if (room === null) {
      throw new NotFoundException('包厢不存在')
    }
    // §5.3:维修/停用在上钟选择框不可选(占用允许=多艺人同房/续台场景)
    if (room.status === 'MAINTENANCE' || room.status === 'DISABLED') {
      throw new BadRequestException('维修/停用包厢不可上钟')
    }

    const now = new Date()
    const businessDate = resolveBusinessDate(now, { cutTime: store.businessDayCutTime })
    const bdDate = new Date(businessDate)

    // 门店设置(门店级 > env 默认):未签到上钟开关 + 包厢计费规则
    const settings = await this.storeConfig.getArtistSettings(artist.storeId)
    const billing = settings.roomBilling

    // 前置校验数据:当日已完成次数 + 进行中场次
    const [totalShowsDone, activeSessions, checkinCount] = await Promise.all([
      db.showSession.count({
        where: { artistId: artist.id, businessDate: bdDate, endAt: { not: null } },
      }),
      db.showSession.findMany({
        where: { artistId: artist.id, endAt: null },
        select: { roomId: true, startAt: true },
      }),
      db.attendanceReport.count({
        where: { artistId: artist.id, businessDate: bdDate, type: 'CHECKIN' },
      }),
    ])
    const check = assertCanTakeSession({
      artist: {
        maxTotalShows: artist.maxTotalShows,
        maxCrossRooms: artist.maxCrossRooms,
        firstShowMinMinutes: artist.firstShowMinMinutes,
        sameRoomMinMinutes: artist.sameRoomMinMinutes,
      },
      totalShowsDone,
      activeCrossDurations: activeSessions.map((s) => diffMinutes(s.startAt, now)),
      sameRoomAsActive: activeSessions.some((s) => s.roomId === room.id),
      allowStageWithoutCheckin: settings.allowStageWithoutCheckin,
      hasCheckedInToday: checkinCount > 0,
    })
    if (!check.ok) {
      const first = check.violations[0]
      throw new LeisureError(
        first?.code ?? 400,
        first?.message ?? '前置校验未通过',
        check.violations,
      )
    }

    // 规则解析(等级×房型)+ 快照:无规则命中回退档案计时单价(需求全集 §6.5)
    const ruleRows = await db.stageFeeRule.findMany({
      where: { storeId: artist.storeId, deletedAt: null },
    })
    // DB 行 → 单源类型(Json 数组/Decimal 显式收敛)
    const rules = ruleRows.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      levelId: r.levelId,
      roomTypeIds: Array.isArray(r.roomTypeIds) ? (r.roomTypeIds as number[]) : [],
      amount: Number(r.amount),
    }))
    const rule = artist.levelId !== null
      ? resolveStageFeeRule(rules, artist.levelId, room.roomTypeId)
      : undefined
    // Decimal → number:单源计费函数按 number 运算(金额精度 2 位,铁律 6)
    const unitPrice = rule !== undefined ? Number(rule.amount) : Number(artist.hourlyRate)
    const isCross = activeSessions.length > 0 && !activeSessions.some((s) => s.roomId === room.id)

    const created = await db.showSession.create({
      data: {
        storeId: artist.storeId,
        businessDate: bdDate,
        artistId: artist.id,
        roomId: room.id,
        roomTypeId: room.roomTypeId,
        roomName: room.roomName ?? room.roomNo,
        startAt: now,
        isCross,
        feeRuleId: rule?.id ?? null,
        unitPrice,
        roundingMinutes: billing.roundingThresholdMinutes,
        roundingEnabled: billing.roundingEnabled,
        feeMode: billing.feeMode,
        operatorId: operator.sub,
      },
    })
    // 房态流转:占用(§5.3;幂等——已占用不重复写)
    if (room.status !== 'OCCUPIED') {
      await db.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } })
    }
    await db.auditLog.create({
      data: {
        storeId: artist.storeId,
        actorId: operator.sub,
        action: 'SESSION_START',
        targetType: 'show_session',
        targetId: String(created.id),
        afterJson: created as unknown as object,
      },
    })
    return { sessionId: created.id, businessDate }
  }

  /* ── 下钟(可入事务;transfer 时传入 tx) ── */
  private async finishIn(
    db: DbClient,
    sessionId: number,
    operator: { sub: number; storeId?: number },
  ): Promise<{
    feeAmount: number
    durationMinutes: number
    billHours: number | undefined
    ticketHint: boolean
  }> {
    const session = await db.showSession.findFirst({
      where: { id: sessionId, endAt: null },
    })
    if (session === null) {
      throw new NotFoundException('场次不存在或已下钟')
    }
    const artist = await db.artist.findUnique({ where: { id: session.artistId } })
    if (artist === null) {
      throw new NotFoundException('艺人不存在')
    }
    const now = new Date()
    const durationMinutes = diffMinutes(session.startAt, now)
    const mode = session.feeMode ?? 'HOURLY'
    const rounding = {
      enabled: session.roundingEnabled ?? true,
      thresholdMinutes: session.roundingMinutes ?? env().BILL_ROUNDING_MINUTES,
    }

    // 计费(单源):HOURLY=先保底再进位×单价;FLAT=一口价(§6.3/§6.6 强制下钟同规)
    let fee: ReturnType<typeof calcSessionFee>
    if (mode === 'FLAT') {
      fee = calcSessionFee({
        rule: {
          id: session.feeRuleId ?? 0,
          storeId: session.storeId,
          levelId: artist.levelId ?? 0,
          roomTypeIds: session.roomTypeId !== null ? [session.roomTypeId] : [],
          amount: Number(session.unitPrice ?? 0),
        },
        startAt: session.startAt,
        endAt: now,
        minDurationMinutes: artist.sameRoomMinMinutes,
      })
    } else {
      fee = calcSessionFee({
        rule: undefined,
        mode: 'HOURLY',
        hourlyRate: Number(session.unitPrice ?? 0),
        startAt: session.startAt,
        endAt: now,
        minDurationMinutes: artist.sameRoomMinMinutes,
        rounding,
      })
    }

    // 余额负数防线(默认放行=对齐实测「未收款」;配置关闭时拦截)
    if (env().ALLOW_NEGATIVE_BALANCE !== 'true' && fee.amount > 0) {
      const txns = await db.stageFeeTxn.findMany({
        where: { artistId: artist.id },
        select: { amount: true },
      })
      const balance = sumFeeBalance(txns.map((t) => ({ amount: Number(t.amount) })))
      if (balance - fee.amount < 0) {
        throw new LeisureError(400, '台费余额不足,禁止下钟扣费')
      }
    }

    const updated = await db.showSession.update({
      where: { id: session.id },
      data: {
        endAt: now,
        durationMinutes,
        feeAmount: fee.amount,
        billHours: fee.billHours ?? null,
      },
    })

    // 房态流转:该房无进行中场次 → 空闲(§5.3)
    if (session.roomId !== null) {
      const stillActive = await db.showSession.count({
        where: { roomId: session.roomId, endAt: null },
      })
      if (stillActive === 0) {
        await db.room.update({ where: { id: session.roomId }, data: { status: 'FREE' } })
      }
    }

    // 台费流水(只增):SESSION_DEDUCT 负向,归集到场次营业日
    const txn = await db.stageFeeTxn.create({
      data: {
        storeId: session.storeId,
        businessDate: session.businessDate,
        artistId: artist.id,
        stageName: artist.stageName,
        badgeNo: artist.badgeNo,
        groupId: artist.groupId,
        type: 'SESSION_DEDUCT',
        amount: -fee.amount,
        refType: 'session',
        refId: session.id,
        operatorId: operator.sub,
      },
    })

    // 台票抵扣提示(§6.6 台票抵扣优先;核销走 /tickets/use,II 期全套)
    const ticketTxnRows = await db.ticketTxn.findMany({
      where: { artistId: artist.id },
      select: { ticketRuleId: true, type: true, qty: true },
    })
    const ticketHint = ticketBalance(
      ticketTxnRows.map((t) => ({ ticketRuleId: t.ticketRuleId, type: t.type as 'BUY' | 'USE' | 'EXPIRE', qty: t.qty })),
    ) > 0

    await db.auditLog.create({
      data: {
        storeId: session.storeId,
        actorId: operator.sub,
        action: 'SESSION_FINISH',
        targetType: 'show_session',
        targetId: String(session.id),
        beforeJson: session as unknown as object,
        afterJson: { ...updated, txnId: txn.id },
      },
    })
    return {
      feeAmount: fee.amount,
      durationMinutes,
      billHours: fee.billHours,
      ticketHint,
    }
  }

  async start(
    p: { artistId: number; roomId: number },
    operator: { sub: number; storeId?: number },
  ): Promise<{ sessionId: number; businessDate: string }> {
    return this.startIn(this.prisma, p, operator)
  }

  async finish(
    sessionId: number,
    operator: { sub: number; storeId?: number },
  ): Promise<{
    feeAmount: number
    durationMinutes: number
    billHours: number | undefined
    ticketHint: boolean
  }> {
    return this.finishIn(this.prisma, sessionId, operator)
  }

  /** 串台:保持当前场次并行,另开一场独立核算(§6.6;maxCrossRooms 由前置校验拦截) */
  async cross(
    sessionId: number,
    toRoomId: number,
    operator: { sub: number; storeId?: number },
  ): Promise<{ sessionId: number; businessDate: string }> {
    const session = await this.prisma.showSession.findFirst({
      where: { id: sessionId, endAt: null },
    })
    if (session === null) {
      throw new NotFoundException('场次不存在或已下钟')
    }
    return this.start(
      { artistId: session.artistId, roomId: toRoomId },
      operator,
    )
  }

  /** 转包厢(§6.6):终止当前计时(按快照结算)+ 同事务新开记录 */
  async transfer(
    sessionId: number,
    toRoomId: number,
    operator: { sub: number; storeId?: number },
  ): Promise<{ finishedSessionId: number; newSessionId: number; businessDate: string }> {
    const session = await this.prisma.showSession.findFirst({
      where: { id: sessionId, endAt: null },
    })
    if (session === null) {
      throw new NotFoundException('场次不存在或已下钟')
    }
    const artistId = session.artistId
    return this.prisma.$transaction(async (tx) => {
      await this.finishIn(tx as unknown as DbClient, sessionId, operator)
      const next = await this.startIn(tx as unknown as DbClient, { artistId, roomId: toRoomId }, operator)
      return { finishedSessionId: sessionId, newSessionId: next.sessionId, businessDate: next.businessDate }
    })
  }

  /** 检索:营业日区间 + 组别/包厢 + 状态(全部/上钟/串台);列含房号与计费快照(A20) */
  async list(q: {
    storeId: number
    businessDateFrom: string
    businessDateTo: string
    groupId?: number
    roomId?: number
    status?: string
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    // 场次表无 groupId 列:组别/关键词过滤统一走 artist 关联
    const artistFilter: Prisma.ShowSessionWhereInput['artist'] = {
      groupId: q.groupId,
      OR:
        q.keyword !== undefined && q.keyword !== ''
          ? [
              { stageName: { contains: q.keyword } },
              { badgeNo: { contains: q.keyword } },
            ]
          : undefined,
    }
    const where: Prisma.ShowSessionWhereInput = {
      storeId: q.storeId,
      businessDate: { gte: new Date(q.businessDateFrom), lte: new Date(q.businessDateTo) },
      roomId: q.roomId,
      isCross: q.status === 'cross' ? true : undefined,
      endAt: q.status === 'onstage' ? null : undefined,
      artist: artistFilter,
    }
    const [rows, total] = await Promise.all([
      this.prisma.showSession.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.showSession.count({ where }),
    ])
    return { rows, total }
  }
}

@Controller('sessions')
export class SessionController {
  constructor(private readonly svc: SessionService) {}

  @RequirePerm('session:view')
  @Post('start')
  async start(@Req() req: Request, @Body() body: SessionStartDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.start(body, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('session:finish')
  @Post(':id/finish')
  async finish(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.finish(id, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('session:cross')
  @Post(':id/cross')
  async cross(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SessionRoomDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.cross(id, body.toRoomId, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('session:finish')
  @Post(':id/transfer')
  async transfer(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SessionRoomDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.transfer(id, body.toRoomId, { sub: user?.sub ?? 0, storeId: user?.storeId })
  }

  @RequirePerm('session:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('businessDateFrom') businessDateFrom: string,
    @Query('businessDateTo') businessDateTo: string,
    @Query('groupId') groupId?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list({
      storeId: user?.storeId ?? 1,
      businessDateFrom,
      businessDateTo,
      groupId: groupId !== undefined ? Number(groupId) : undefined,
      roomId: roomId !== undefined ? Number(roomId) : undefined,
      status,
      keyword,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }
}

@Module({
  controllers: [SessionController],
  providers: [SessionService, PrismaService, StoreConfigService],
})
export class SessionModule {}
