/**
 * 房账模块(方案甲):包厢开/关房 + 关房统一结算 + 艺人自点单
 * 依据:《12-包厢房态模块-构建指导》《13-包厢操作与艺人自点单-构建指导》《14-融合与数据互通》
 * 红线:
 * - 下钟计费计入房账(不落流水);关房结算才落 ROOM_SETTLE(只增不改)
 * - 点单四重前置校验:房 OPEN(40908)· 本人在房(40909)· 限额(40910)· 商品在售
 * - 结算需二次确认语义(前端 confirm;后端不做静默结算)
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
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  resolveBusinessDate,
  sumFeeBalance,
  ERR,
  LeisureError,
} from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import type { ReqWithUser } from '../../common/guards/jwt.guard.js'
import { SessionModule, SessionService } from '../session/session.module.js'

type Operator = { sub: number; name: string; storeId?: number; scope: 'ADMIN' | 'ARTIST' }

function op(req: Request): Operator {
  const user = (req as ReqWithUser).user
  if (user === undefined) throw new UnauthorizedException('未登录')
  return { sub: user.sub, name: user.name, storeId: user.storeId, scope: user.scope }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  /* ── 开房:创建房账 + 绑定在场艺人(进房即上钟,方案甲融合) ── */
  async open(
    p: { roomId: number; artistIds: number[] },
    operator: Operator,
  ): Promise<{ roomSessionId: number; businessDate: string }> {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: p.roomId } })
      if (room === null) throw new NotFoundException('包厢不存在')
      if (room.status === 'OCCUPIED') throw new ConflictException('包厢占用中')
      if (room.status === 'MAINTENANCE') throw new ConflictException('包厢维修中')
      if (room.status === 'DISABLED') throw new ConflictException('包厢已停用')

      const store = await tx.store.findUnique({ where: { id: room.storeId } })
      if (store === null) throw new NotFoundException('门店不存在')
      const businessDate = resolveBusinessDate(new Date(), {
        cutTime: store.businessDayCutTime,
      })

      const session = await tx.roomSession.create({
        data: {
          storeId: room.storeId,
          businessDate: new Date(businessDate),
          roomId: room.id,
          roomNo: room.roomNo,
          openedBy: operator.sub,
          startAt: new Date(),
          status: 'OPEN',
        },
      })

      // 进房即上钟(方案甲融合):逐艺人复用场次事务(校验+计费快照+占用流转)
      const uniqueIds = [...new Set(p.artistIds)]
      for (const artistId of uniqueIds) {
        await this.sessionService.startIn(tx, { artistId, roomId: room.id }, {
          sub: operator.sub,
          storeId: room.storeId,
        })
        await tx.roomSessionArtist.create({
          data: { sessionId: session.id, artistId, joinedAt: new Date() },
        })
      }

      await tx.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
      })
      await tx.auditLog.create({
        data: {
          storeId: room.storeId,
          actorId: operator.sub,
          action: 'ROOM_OPENED',
          targetType: 'room_session',
          targetId: String(session.id),
          afterJson: { roomId: room.id, roomNo: room.roomNo, artistIds: uniqueIds },
        },
      })
      return { roomSessionId: session.id, businessDate }
    })
  }

  /* ── 关房结算(方案甲核心):自动下钟 → Σ时间费+Σ点单 → 现金/台费抵扣/混合 ── */
  async close(
    p: {
      roomSessionId: number
      settleType: 'CASH' | 'FEE_DEDUCT' | 'MIXED'
      feeDeductAllocations?: Array<{ artistId: number; amount: number }>
      remark?: string
    },
    operator: Operator,
    idemKey?: string,
  ): Promise<{ roomFee: number; orderTotal: number; totalAmount: number; settledSessions: number }> {
    return this.prisma.$transaction(async (tx) => {
      const rs = await tx.roomSession.findUnique({ where: { id: p.roomSessionId } })
      if (rs === null) throw new NotFoundException('房账不存在')
      if (rs.status !== 'OPEN') throw new LeisureError(ERR.ROOM_NOT_OPEN, '房账非 OPEN 态')

      const now = new Date()

      // ① 自动下钟:在房艺人仍有进行中场次 → 强制下钟(§6.6,计费计入房账不落流水)
      const bound = await tx.roomSessionArtist.findMany({
        where: { sessionId: rs.id, leftAt: null },
      })
      const settledSessionsArr: number[] = []
      let roomFee = 0
      for (const b of bound) {
        const live = await tx.showSession.findFirst({
          where: { artistId: b.artistId, roomId: rs.roomId, endAt: null, roomSessionId: null },
          orderBy: { startAt: 'desc' },
        })
        if (live !== null) {
          const fin = await this.sessionService.finishIn(tx, live.id, {
            sub: operator.sub,
            storeId: rs.storeId,
          })
          roomFee += fin.feeAmount
          settledSessionsArr.push(live.id)
        }
      }

      // ② 关联本场次的全部已结束未结算场次(含 ①,含无艺人在房的纯房账时间费)
      const pending = await tx.showSession.findMany({
        where: { roomId: rs.roomId, roomSessionId: null, startAt: { gte: rs.startAt } },
      })
      for (const s of pending) {
        roomFee += Number(s.feeAmount ?? 0)
        settledSessionsArr.push(s.id)
      }
      roomFee = round2(roomFee)

      // ③ 自点单归集(PLACED 视同送达一并结算,提示已在文档声明)
      const orders = await tx.selfOrder.findMany({
        where: { sessionId: rs.id, status: { in: ['PLACED', 'DELIVERED'] } },
      })
      const orderTotal = round2(orders.reduce((acc, o) => acc + Number(o.totalAmount), 0))

      const totalAmount = round2(roomFee + orderTotal)

      // ④ 台费抵扣:按艺人分配;Σ分配 = 抵扣额 ≤ 总额
      let feeDeductAmount = 0
      const allocations = p.feeDeductAllocations ?? []
      if (p.settleType === 'FEE_DEDUCT' || p.settleType === 'MIXED') {
        if (allocations.length === 0) {
          throw new BadRequestException('台费抵扣需提供 feeDeductAllocations')
        }
        for (const a of allocations) {
          if (a.amount <= 0) throw new BadRequestException('抵扣额必须大于 0')
          feeDeductAmount = round2(feeDeductAmount + a.amount)
        }
        if (feeDeductAmount > totalAmount) {
          throw new BadRequestException('台费抵扣额超过结算总额')
        }
      }

      // ⑤ 结算落账:抵扣部分逐艺人 ROOM_SETTLE(只增);现金部分直接收款登记
      const txnIds: number[] = []
      if (feeDeductAmount > 0) {
        for (const a of allocations) {
          if (env().ALLOW_NEGATIVE_BALANCE !== 'true') {
            const txns = await tx.stageFeeTxn.findMany({
              where: { artistId: a.artistId },
              select: { amount: true },
            })
            const balance = sumFeeBalance(txns.map((t) => ({ amount: Number(t.amount) })))
            if (balance - a.amount < 0) {
              throw new LeisureError(400, '台费余额不足,禁止结算抵扣(艺人 ' + String(a.artistId) + ')')
            }
          }
          const artist = await tx.artist.findUnique({ where: { id: a.artistId } })
          const created = await tx.stageFeeTxn.create({
            data: {
              storeId: rs.storeId,
              businessDate: rs.businessDate,
              artistId: a.artistId,
              stageName: artist?.stageName ?? null,
              badgeNo: artist?.badgeNo ?? null,
              groupId: artist?.groupId ?? null,
              type: 'ROOM_SETTLE',
              amount: -a.amount,
              refType: 'room_session',
              refId: rs.id,
              operatorId: operator.sub,
            },
          })
          txnIds.push(created.id)
        }
      }

      // ⑥ 房账 CLOSED + 场次回链 + 点单封单 + 房态 CLEANING + 在房艺人离场
      const updated = await tx.roomSession.update({
        where: { id: rs.id },
        data: {
          endAt: now,
          roomFee,
          orderTotal,
          totalAmount,
          settleType: p.settleType,
          feeDeductAmount: feeDeductAmount > 0 ? feeDeductAmount : null,
          status: 'CLOSED',
          closedBy: operator.sub,
          closedAt: now,
          remark: p.remark ?? rs.remark,
        },
      })
      await tx.showSession.updateMany({
        where: { id: { in: settledSessionsArr } },
        data: { roomSessionId: rs.id, settledAt: now },
      })
      await tx.selfOrder.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { status: 'SETTLED', deliveredAt: new Date(), settledAt: now },
      })
      await tx.roomSessionArtist.updateMany({
        where: { sessionId: rs.id, leftAt: null },
        data: { leftAt: now },
      })
      await tx.room.update({ where: { id: rs.roomId }, data: { status: 'CLEANING' } })
      await tx.auditLog.create({
        data: {
          storeId: rs.storeId,
          actorId: operator.sub,
          action: 'ROOM_CLOSED',
          targetType: 'room_session',
          targetId: String(rs.id),
          beforeJson: { status: 'OPEN' },
          afterJson: {
            roomFee,
            orderTotal,
            totalAmount,
            settleType: p.settleType,
            feeDeductAmount: feeDeductAmount > 0 ? feeDeductAmount : null,
            txnIds,
          },
        },
      })

      return {
        roomFee,
        orderTotal,
        totalAmount,
        settledSessions: settledSessionsArr.length,
      }
    })
  }

  /* ── 清扫 ── */
  async cleaningDone(roomId: number, operator: Operator): Promise<{ ok: true }> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } })
    if (room === null) throw new NotFoundException('包厢不存在')
    if (room.status !== 'CLEANING') throw new ConflictException('包厢非清扫中')
    await this.prisma.room.update({ where: { id: roomId }, data: { status: 'FREE' } })
    await this.prisma.auditLog.create({
      data: {
        storeId: room.storeId,
        actorId: operator.sub,
        action: 'ROOM_CLEANING_DONE',
        targetType: 'room',
        targetId: String(roomId),
      },
    })
    return { ok: true }
  }

  async bulkCleaningDone(storeId: number, operator: Operator): Promise<{ updated: number }> {
    const out = await this.prisma.room.updateMany({
      where: { storeId, status: 'CLEANING' },
      data: { status: 'FREE' },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operator.sub,
        action: 'ROOM_BULK_CLEANING_DONE',
        targetType: 'room',
        targetId: String(storeId),
        afterJson: { updated: out.count },
      },
    })
    return { updated: out.count }
  }

  async listSessions(q: {
    storeId: number
    businessDate?: string
    status?: string
  }): Promise<{ rows: unknown[]; total: number }> {
    const where = {
      storeId: q.storeId,
      businessDate: q.businessDate !== undefined ? new Date(q.businessDate) : undefined,
      status: q.status,
    }
    const [rows, total] = await Promise.all([
      this.prisma.roomSession.findMany({ where, orderBy: { id: 'desc' }, take: 200 }),
      this.prisma.roomSession.count({ where }),
    ])
    return { rows, total }
  }

  /* ── 艺人自点单 ── */

  async placeOrder(
    p: {
      sessionId: number
      artistId?: number
      items: Array<{ goodsId: number; qty: number }>
      remark?: string
    },
    operator: Operator,
    idemKey?: string,
  ): Promise<{ orderId: number; totalAmount: number }> {
    // 幂等(骨架期同键查询去重)
    if (idemKey !== undefined) {
      const hit = await this.prisma.idempotencyKey.findFirst({
        where: { storeId: operator.storeId ?? 0, idemKey, path: '/self-orders' },
      })
      if (hit !== null && hit.responseSnapshot !== null) {
        const snap = hit.responseSnapshot as { orderId: number; totalAmount: number }
        return snap
      }
    }

    // 点单人:艺人端=token 本人;管理端=必须显式 artistId(代点)
    const artistId = operator.scope === 'ARTIST' ? operator.sub : p.artistId
    if (artistId === undefined) throw new BadRequestException('缺少 artistId(代点时必填)')

    const rs = await this.prisma.roomSession.findUnique({ where: { id: p.sessionId } })
    if (rs === null || rs.status !== 'OPEN') {
      throw new LeisureError(ERR.ROOM_NOT_OPEN, '房账非 OPEN 态(未开房或已关房)')
    }
    const inRoom = await this.prisma.roomSessionArtist.findFirst({
      where: { sessionId: rs.id, artistId, leftAt: null },
    })
    if (inRoom === null) {
      throw new LeisureError(ERR.NOT_IN_ROOM, '点单人不在该包厢在场名单内')
    }

    // 商品快照计价(在售校验)
    const goodsIds = [...new Set(p.items.map((i) => i.goodsId))]
    const goodsRows = await this.prisma.goods.findMany({
      where: { id: { in: goodsIds }, storeId: rs.storeId, deletedAt: null },
    })
    if (goodsRows.length !== goodsIds.length) {
      throw new BadRequestException('存在无效或下架商品')
    }
    const goodsMap = new Map(goodsRows.map((g) => [g.id, g]))
    let total = 0
    const items = p.items.map((i) => {
      const g = goodsMap.get(i.goodsId)
      if (g === undefined) throw new BadRequestException('商品不存在')
      if (!Number.isInteger(i.qty) || i.qty <= 0) throw new BadRequestException('数量必须为正整数')
      total = round2(total + Number(g.salePrice) * i.qty)
      return { goodsId: g.id, name: g.name, qty: i.qty, unitPrice: Number(g.salePrice) }
    })

    // 限额(方案甲独立系统简化风控;配置走 env,II 期挪门店配置)
    const perTxnLimit = Number(env().SELF_ORDER_PER_TXN_LIMIT ?? 500)
    if (total > perTxnLimit) {
      throw new LeisureError(ERR.ORDER_LIMIT_EXCEEDED, '单笔点单超限额(' + String(perTxnLimit) + ' 元)')
    }
    const today = resolveBusinessDate(new Date(), { cutTime: env().BUSINESS_DAY_CUT })
    const dayAgg = await this.prisma.selfOrder.aggregate({
      where: {
        storeId: rs.storeId,
        artistId,
        businessDate: new Date(today),
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    })
    const dayTotal = Number(dayAgg._sum.totalAmount ?? 0)
    const dailyLimit = Number(env().SELF_ORDER_DAILY_LIMIT ?? 2000)
    if (dayTotal + total > dailyLimit) {
      throw new LeisureError(ERR.ORDER_LIMIT_EXCEEDED, '当日累计点单超限额(' + String(dailyLimit) + ' 元)')
    }

    const created = await this.prisma.selfOrder.create({
      data: {
        storeId: rs.storeId,
        businessDate: new Date(today),
        sessionId: rs.id,
        roomId: rs.roomId,
        artistId,
        items: items as unknown as object,
        totalAmount: total,
        status: 'PLACED',
        remark: p.remark,
      },
    })
    await this.prisma.roomSession.update({
      where: { id: rs.id },
      data: { orderTotal: { increment: total } },
    })
    await this.prisma.idempotencyKey.create({
      data: {
        storeId: operator.storeId ?? 0,
        idemKey: idemKey ?? '',
        path: '/self-orders',
        responseSnapshot: { orderId: created.id, totalAmount: total } as object,
      },
    }).catch(() => undefined)
    await this.prisma.auditLog.create({
      data: {
        storeId: rs.storeId,
        actorId: operator.sub,
        action: 'SELF_ORDER_PLACED',
        targetType: 'self_order',
        targetId: String(created.id),
        afterJson: { sessionId: rs.id, artistId, total } as object,
      },
    })
    return { orderId: created.id, totalAmount: total }
  }

  async deliverOrder(orderId: number, operator: Operator): Promise<void> {
    const order = await this.prisma.selfOrder.findUnique({ where: { id: orderId } })
    if (order === null) throw new NotFoundException('点单不存在')
    if (order.status !== 'PLACED') throw new ConflictException('仅 PLACED 可送达')
    await this.prisma.selfOrder.update({
      where: { id: orderId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    })
  }

  async cancelOrder(orderId: number, operator: Operator): Promise<void> {
    const order = await this.prisma.selfOrder.findUnique({ where: { id: orderId } })
    if (order === null) throw new NotFoundException('点单不存在')
    if (order.status !== 'PLACED') throw new ConflictException('仅 PLACED 可取消')
    await this.prisma.selfOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    })
  }

  async listOrders(q: {
    storeId: number
    sessionId?: number
    artistId?: number
    businessDate?: string
    status?: string
  }): Promise<{ rows: unknown[]; total: number; totalAmount: number }> {
    const where = {
      storeId: q.storeId,
      sessionId: q.sessionId,
      artistId: q.artistId,
      status: q.status,
      businessDate: q.businessDate !== undefined ? new Date(q.businessDate) : undefined,
    }
    const [rows, agg] = await Promise.all([
      this.prisma.selfOrder.findMany({ where, orderBy: { id: 'desc' }, take: 200 }),
      this.prisma.selfOrder.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ])
    return {
      rows,
      total: agg._count._all,
      totalAmount: round2(Number(agg._sum.totalAmount ?? 0)),
    }
  }

  /* ── 商品目录(自点单;幂等创建:同名复用,e2e 可重跑) ── */
  async listGoods(storeId: number, onSale?: boolean): Promise<{ rows: unknown[] }> {
    const rows = await this.prisma.goods.findMany({
      where: {
        storeId,
        deletedAt: null,
        ...(onSale !== undefined ? { onSale } : {}),
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    })
    return { rows }
  }

  async createGoods(p: {
    storeId: number
    name: string
    category?: string
    unit?: string
    salePrice: number
    onSale?: boolean
  }): Promise<{ id: number }> {
    const dup = await this.prisma.goods.findFirst({
      where: { storeId: p.storeId, name: p.name, deletedAt: null },
    })
    if (dup !== null) return { id: dup.id } // 幂等复用
    const created = await this.prisma.goods.create({
      data: {
        storeId: p.storeId,
        name: p.name,
        category: p.category,
        unit: p.unit,
        salePrice: p.salePrice,
        onSale: p.onSale ?? true,
      },
    })
    return { id: created.id }
  }

  /* ── P0-1 钟房叫钟队列(大屏 + 语音播报文本) ── */
  async createCall(
    p: { roomId: number; artistId: number },
    operator: Operator,
  ): Promise<{ callId: number; voiceText: string }> {
    const room = await this.prisma.room.findUnique({ where: { id: p.roomId } })
    if (room === null) throw new NotFoundException('包厢不存在')
    const artist = await this.prisma.artist.findUnique({ where: { id: p.artistId } })
    if (artist === null) throw new NotFoundException('艺人不存在')
    const store = await this.prisma.store.findUnique({ where: { id: room.storeId } })
    const businessDate = resolveBusinessDate(new Date(), {
      cutTime: store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT,
    })
    const voiceText = '请' + (artist.stageName ?? artist.realName) + '到' + room.roomNo + '包厢'
    const created = await this.prisma.roomCall.create({
      data: {
        storeId: room.storeId,
        businessDate: new Date(businessDate),
        roomId: room.id,
        roomNo: room.roomNo,
        artistId: artist.id,
        stageName: artist.stageName ?? artist.realName,
        status: 'QUEUED',
        voiceText,
      },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId: room.storeId,
        actorId: operator.sub,
        action: 'ROOM_CALL_CREATED',
        targetType: 'room_call',
        targetId: String(created.id),
        afterJson: { roomId: room.id, artistId: artist.id, voiceText } as object,
      },
    })
    return { callId: created.id, voiceText }
  }

  async listCalls(
    storeId: number,
    businessDate: string,
    status?: string,
  ): Promise<{ rows: unknown[] }> {
    const rows = await this.prisma.roomCall.findMany({
      where: {
        storeId,
        businessDate: new Date(businessDate),
        status,
      },
      orderBy: { id: 'desc' },
      take: 100,
    })
    return { rows }
  }

  async setCallStatus(
    id: number,
    status: 'CALLED' | 'ACCEPTED' | 'DONE' | 'CANCELLED',
    operator: Operator,
  ): Promise<{ ok: true }> {
    const call = await this.prisma.roomCall.findUnique({ where: { id } })
    if (call === null) throw new NotFoundException('叫钟不存在')
    if (call.status === 'DONE' || call.status === 'CANCELLED') {
      throw new ConflictException('已终态,不可再流转')
    }
    await this.prisma.roomCall.update({
      where: { id },
      data: { status, ...(status === 'CALLED' ? { calledAt: new Date() } : {}) },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId: call.storeId,
        actorId: operator.sub,
        action: 'ROOM_CALL_STATUS',
        targetType: 'room_call',
        targetId: String(id),
        afterJson: { from: call.status, to: status } as object,
      },
    })
    return { ok: true }
  }

  /** 艺人端「我的包厢」 */
  async myRoom(artistId: number, storeId: number): Promise<unknown> {
    const bind = await this.prisma.roomSessionArtist.findFirst({
      where: { artistId, leftAt: null },
      orderBy: { id: 'desc' },
    })
    if (bind === null) return { inRoom: false }
    const rs = await this.prisma.roomSession.findUnique({ where: { id: bind.sessionId } })
    if (rs === null || rs.status !== 'OPEN') return { inRoom: false }
    const mates = await this.prisma.roomSessionArtist.findMany({
      where: { sessionId: rs.id, leftAt: null },
      select: { artistId: true },
    })
    const orders = await this.prisma.selfOrder.aggregate({
      where: { sessionId: rs.id, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    })
    return {
      inRoom: true,
      roomSessionId: rs.id,
      roomId: rs.roomId,
      roomNo: rs.roomNo,
      startAt: rs.startAt,
      companions: mates.map((m) => m.artistId),
      orderTotalSoFar: round2(Number(orders._sum.totalAmount ?? 0)),
    }
  }
}

/* ── Controller ── */

interface RoomCloseBody {
  roomSessionId?: number
  settleType?: 'CASH' | 'FEE_DEDUCT' | 'MIXED'
  feeDeductAllocations?: Array<{ artistId: number; amount: number }>
  remark?: string
}

@Controller()
export class RoomController {
  constructor(private readonly svc: RoomService) {}

  @Post('room-sessions/open')
  async open(@Req() req: Request, @Body() body: { roomId: number; artistIds: number[] }): Promise<unknown> {
    return this.svc.open(body, op(req))
  }

  @Post('room-sessions/:id/close')
  async close(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoomCloseBody,
  ): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可关房结算')
    return this.svc.close(
      {
        roomSessionId: id,
        settleType: body.settleType ?? 'CASH',
        feeDeductAllocations: body.feeDeductAllocations,
        remark: body.remark,
      },
      user,
    )
  }

  @Get('room-sessions')
  async list(
    @Req() req: Request,
    @Query('businessDate') businessDate?: string,
    @Query('status') status?: string,
  ): Promise<unknown> {
    const user = op(req)
    return this.svc.listSessions({
      storeId: user.storeId ?? 1,
      businessDate,
      status,
    })
  }

  @Post('rooms/:id/cleaning-done')
  async cleaningDone(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.svc.cleaningDone(id, op(req))
  }

  @Post('rooms/bulk-cleaning-done')
  async bulk(@Req() req: Request): Promise<unknown> {
    const user = op(req)
    return this.svc.bulkCleaningDone(user.storeId ?? 1, user)
  }

  @Post('self-orders')
  async placeOrder(@Req() req: Request, @Body() body: {
    sessionId: number
    artistId?: number
    items: Array<{ goodsId: number; qty: number }>
    remark?: string
  }): Promise<unknown> {
    const user = op(req)
    if (body.items === undefined || !Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('items 必填')
    }
    return this.svc.placeOrder(
      { sessionId: body.sessionId, artistId: body.artistId, items: body.items },
      user,
      req.header('Idempotency-Key'),
    )
  }

  @Get('self-orders')
  async listOrders(
    @Req() req: Request,
    @Query('sessionId') sessionId?: string,
    @Query('artistId') artistId?: string,
    @Query('businessDate') businessDate?: string,
    @Query('status') status?: string,
  ): Promise<unknown> {
    const user = op(req)
    return this.svc.listOrders({
      storeId: user.storeId ?? 1,
      sessionId: sessionId !== undefined ? Number(sessionId) : undefined,
      artistId: artistId !== undefined ? Number(artistId) : undefined,
      businessDate,
      status,
    })
  }

  @Post('self-orders/:id/deliver')
  async deliver(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    await this.svc.deliverOrder(id, op(req))
    return { ok: true }
  }

  @Post('self-orders/:id/cancel')
  async cancel(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    await this.svc.cancelOrder(id, op(req))
    return { ok: true }
  }

  @Get('goods')
  async listGoods(@Req() req: Request, @Query('onSale') onSale?: string): Promise<unknown> {
    const user = op(req)
    return this.svc.listGoods(
      user.storeId ?? 1,
      onSale === undefined ? undefined : onSale === 'true',
    )
  }

  @Post('goods')
  async createGoods(
    @Req() req: Request,
    @Body()
    body: { name: string; category?: string; unit?: string; salePrice: number; onSale?: boolean },
  ): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可维护商品')
    if (body.name === undefined || body.name === '' || body.salePrice === undefined) {
      throw new BadRequestException('name/salePrice 必填')
    }
    return this.svc.createGoods({ ...body, storeId: user.storeId ?? 1 })
  }

  @Post('room-calls')
  async createCall(
    @Req() req: Request,
    @Body() body: { roomId: number; artistId: number },
  ): Promise<unknown> {
    return this.svc.createCall(body, op(req))
  }

  @Get('room-calls')
  async listCalls(
    @Req() req: Request,
    @Query('businessDate') businessDate: string,
    @Query('status') status?: string,
  ): Promise<unknown> {
    const user = op(req)
    return this.svc.listCalls(user.storeId ?? 1, businessDate, status)
  }

  @Post('room-calls/:id/status')
  async setCallStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ): Promise<unknown> {
    const allowed = ['CALLED', 'ACCEPTED', 'DONE', 'CANCELLED']
    if (!allowed.includes(body.status)) throw new BadRequestException('无效状态')
    return this.svc.setCallStatus(
      id,
      body.status as 'CALLED' | 'ACCEPTED' | 'DONE' | 'CANCELLED',
      op(req),
    )
  }

  @Get('me/room')
  async myRoom(@Req() req: Request): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ARTIST') throw new UnauthorizedException('仅艺人端')
    return this.svc.myRoom(user.sub, user.storeId ?? 1)
  }
}

/* ── Module ── */

@Module({
  imports: [SessionModule],
  controllers: [RoomController],
  providers: [RoomService, PrismaService],
})
export class RoomModule {}
