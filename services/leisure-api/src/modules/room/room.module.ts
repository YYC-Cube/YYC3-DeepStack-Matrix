/**
 * 房账模块(方案甲):包厢开/关房 + 关房统一结算 + 销售经理自点单
 * 依据:《12-包厢房态模块-构建指导》《13-包厢操作与销售经理自点单-构建指导》《14-融合与数据互通》
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
  Put,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  diffMinutes,
  resolveBusinessDate,
  sumFeeBalance,
  ticketBalance,
  canUseTicket,
  ERR,
  LeisureError,
  HttpVoiceBoxTransport,
  NoopVoiceBoxTransport,
  type MeOrdersResult,
  type VoiceBoxResult,
  type VoiceBoxTransport,
} from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import type { ReqWithUser } from '../../common/guards/jwt.guard.js'
import { SessionModule, SessionService } from '../session/session.module.js'
import { StoreConfigService } from '../store-config/store-config.module.js'
import { DispatchModule, DispatchService } from '../dispatch/dispatch.module.js'

type Operator = { sub: number; name: string; storeId?: number; scope: 'ADMIN' | 'ARTIST' }

function op(req: Request): Operator {
  const user = (req as ReqWithUser).user
  if (user === undefined) throw new UnauthorizedException('未登录')
  return { sub: user.sub, name: user.name, storeId: user.storeId, scope: user.scope }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/* ── 关房结算单预览视图 ── */

interface BillSessionRow {
  sessionId: number
  artistId: number
  stageName: string | null
  badgeNo: string | null
  startAt: string
  endAt: string | null
  durationMinutes: number
  billHours: number | null
  unitPrice: number
  priceSlotName: string | null
  amount: number
  /** true=进行中(金额为此刻报价,关房时按实际时刻重算) */
  live: boolean
  minDurationApplied: boolean
}

interface BillOrderRow {
  orderId: number
  artistId: number
  stageName: string | null
  items: unknown
  totalAmount: number
  status: string
  placedAt: string
}

export interface BillPreview {
  roomSessionId: number
  roomId: number
  roomNo: string
  startAt: string
  elapsedMinutes: number
  quotedAt: string
  sessions: BillSessionRow[]
  orders: BillOrderRow[]
  roomFee: number
  orderTotal: number
  totalAmount: number
  /** 在房销售经理(抵扣分配参考:台费余额) */
  artists: Array<{ artistId: number; stageName: string | null; badgeNo: string | null; feeBalance: number }>
  /** 在房销售经理台票余额(§6.6 台票抵扣分配参考;可用性与核销校验同口径) */
  ticketOptions: Array<{
    artistId: number
    stageName: string | null
    badgeNo: string | null
    ticketRuleId: number
    ruleName: string
    balance: number
    faceValue: number
    expireAt: string | null
  }>
  billing: {
    feeMode: 'HOURLY' | 'FLAT'
    roundingEnabled: boolean
    roundingThresholdMinutes: number
    minCharge: number
    capCharge: number
  }
}

@Injectable()
export class RoomService {
  private voiceBox: VoiceBoxTransport | undefined

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly storeConfig: StoreConfigService,
    private readonly dispatch: DispatchService,
  ) {}

  /* ── 开房:创建房账 + 绑定在场销售经理(进房即上钟,方案甲融合) ── */
  async open(
    p: { roomId: number; artistIds: number[]; overrideReason?: string; ignoreBookingHold?: boolean },
    operator: Operator,
  ): Promise<{ roomSessionId: number; businessDate: string; dispatchMode: string; overridden: number[] }> {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: p.roomId } })
      if (room === null) throw new NotFoundException('包厢不存在')
      if (room.status === 'OCCUPIED') throw new ConflictException('包厢占用中')
      if (room.status === 'MAINTENANCE') throw new ConflictException('包厢维修中')
      if (room.status === 'DISABLED') throw new ConflictException('包厢已停用')

      // 预约锁钟(P1):存在未超时的 BOOKED 预约 → 40915;ignoreBookingHold 强开须记审计
      if (p.ignoreBookingHold !== true) {
        const held = await tx.artistBooking.findFirst({
          where: { storeId: room.storeId, roomId: room.id, status: 'BOOKED', holdUntil: { gt: new Date() } },
          select: { bookingNo: true },
        })
        if (held !== null) {
          throw new LeisureError(
            ERR.BOOKING_ROOM_HELD,
            '该包厢预约锁钟中(' + held.bookingNo + '),请到「预约管理」处理或强开',
          )
        }
      }

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
          // 客资自动入账(2026-11-08):当日 ARRIVED 预约挂客资且房号匹配 → 开房即把客资写入房账消费档案(替代结算时反查)
          customerLeadId: (
            await tx.artistBooking.findFirst({
              where: {
                storeId: room.storeId,
                roomId: room.id,
                customerLeadId: { not: null },
                status: 'ARRIVED',
                businessDate: new Date(businessDate),
              },
              orderBy: { id: 'desc' },
            })
          )?.customerLeadId ?? null,
        },
      })

      // 销售经理设置⑧ 上钟模式:轮台顺序校验 + 派单日志(须在 startIn 之前——上钟后销售经理即离开队列)
      const uniqueIds = [...new Set(p.artistIds)]
      const dispatch = await this.dispatch.validateAndLog(tx, {
        storeId: room.storeId,
        roomSessionId: session.id,
        artistIds: uniqueIds,
        operatorId: operator.sub,
        overrideReason: p.overrideReason,
      })

      // 进房即上钟(方案甲融合):逐销售经理复用场次事务(校验+计费快照+占用流转)
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
          afterJson: { roomId: room.id, roomNo: room.roomNo, artistIds: uniqueIds, ignoreBookingHold: p.ignoreBookingHold === true },
        },
      })
      return { roomSessionId: session.id, businessDate, dispatchMode: dispatch.mode, overridden: dispatch.overridden }
    })
  }

  /* ── 关房结算(方案甲核心):自动下钟 → Σ时间费+Σ点单 → 台票抵扣/台费抵扣/现金 ── */
  async close(
    p: {
      roomSessionId: number
      settleType: 'CASH' | 'FEE_DEDUCT' | 'MIXED' | 'TICKET'
      feeDeductAllocations?: Array<{ artistId: number; amount: number }>
      /** 台票抵扣(§6.6 并入结算):逐条 canUseTicket 校验 → 写 USE 行(只增)→ 抵扣额=qty×面值 */
      ticketAllocations?: Array<{ artistId: number; ticketRuleId: number; qty: number }>
      remark?: string
    },
    operator: Operator,
    idemKey?: string,
  ): Promise<{ roomFee: number; orderTotal: number; totalAmount: number; settledSessions: number; ticketDeductAmount: number; feeDeductAmount: number }> {
    return this.prisma.$transaction(async (tx) => {
      const rs = await tx.roomSession.findUnique({ where: { id: p.roomSessionId } })
      if (rs === null) throw new NotFoundException('房账不存在')
      if (rs.status !== 'OPEN') throw new LeisureError(ERR.ROOM_NOT_OPEN, '房账非 OPEN 态')

      const now = new Date()

      // ① 自动下钟:在房销售经理仍有进行中场次 → 强制下钟(§6.6,计费计入房账不落流水)
      const bound = await tx.roomSessionArtist.findMany({
        where: { sessionId: rs.id, leftAt: null },
      })
      const settledSessionsArr: number[] = []
      const firstSessionByArtist = new Map<number, number>() // 台票 USE 行 refSessionId 锚点
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
          if (!firstSessionByArtist.has(b.artistId)) firstSessionByArtist.set(b.artistId, live.id)
        }
      }

      // ② 关联本场次的全部已结束未结算场次(含 ①,含无销售经理在房的纯房账时间费)
      const pending = await tx.showSession.findMany({
        where: { roomId: rs.roomId, roomSessionId: null, startAt: { gte: rs.startAt } },
      })
      for (const s of pending) {
        roomFee += Number(s.feeAmount ?? 0)
        settledSessionsArr.push(s.id)
        if (!firstSessionByArtist.has(s.artistId)) firstSessionByArtist.set(s.artistId, s.id)
      }
      roomFee = round2(roomFee)

      // ③ 自点单归集(PLACED 视同送达一并结算,提示已在文档声明)
      const orders = await tx.selfOrder.findMany({
        where: { sessionId: rs.id, status: { in: ['PLACED', 'DELIVERED'] } },
      })
      const orderTotal = round2(orders.reduce((acc, o) => acc + Number(o.totalAmount), 0))

      const totalAmount = round2(roomFee + orderTotal)

      // ③½ 台票抵扣(§6.6 并入结算):同票合并 → 事务内 canUseTicket 校验 → 写 USE 行(只增,refSessionId=本场首场次)
      let ticketDeductAmount = 0
      const ticketAllocs = p.ticketAllocations ?? []
      if (p.settleType === 'TICKET' && ticketAllocs.length === 0) {
        throw new BadRequestException('台票抵扣结算需提供 ticketAllocations')
      }
      if (ticketAllocs.length > 0 && p.settleType === 'FEE_DEDUCT') {
        throw new BadRequestException('台票抵扣请选「台票」或「混合」结算')
      }
      if (ticketAllocs.length > 0) {
        // 同(销售经理,规则)合并数量,避免逐条校验重复消费同一余额
        const merged = new Map<string, { artistId: number; ticketRuleId: number; qty: number }>()
        for (const t of ticketAllocs) {
          if (!Number.isInteger(t.qty) || t.qty <= 0) throw new BadRequestException('台票数量必须为正整数')
          const key = String(t.artistId) + ':' + String(t.ticketRuleId)
          const hit = merged.get(key)
          if (hit !== undefined) hit.qty += t.qty
          else merged.set(key, { artistId: t.artistId, ticketRuleId: t.ticketRuleId, qty: t.qty })
        }
        for (const t of merged.values()) {
          const rule = await tx.ticketRule.findFirst({
            where: { id: t.ticketRuleId, storeId: rs.storeId, deletedAt: null },
          })
          if (rule === null) throw new BadRequestException('台票规则不存在')
          const txnRows = await tx.ticketTxn.findMany({
            where: { artistId: t.artistId, ticketRuleId: rule.id },
            select: { ticketRuleId: true, type: true, qty: true, createdAt: true },
          })
          const txns = txnRows.map((r) => ({
            ticketRuleId: r.ticketRuleId,
            type: r.type as 'BUY' | 'USE' | 'EXPIRE',
            qty: r.qty,
            createdAt: r.createdAt.toISOString(),
          }))
          const verdict = canUseTicket(txns, {
            id: rule.id,
            storeId: rule.storeId,
            name: rule.name,
            price: Number(rule.price),
            validDays: rule.validDays,
            status: rule.status === 1 ? 1 : 0,
          })
          if (!verdict.ok) {
            throw new LeisureError(
              verdict.reason === 'EXPIRED' ? ERR.TICKET_EXPIRED : ERR.TICKET_NO_BALANCE,
              verdict.reason === 'EXPIRED' ? '台票已过期,不可抵扣' : '台票余额不足(销售经理 ' + String(t.artistId) + ')',
            )
          }
          if (ticketBalance(txns, rule.id) < t.qty) {
            throw new LeisureError(ERR.TICKET_NO_BALANCE, '台票余额不足(销售经理 ' + String(t.artistId) + ')')
          }
          ticketDeductAmount = round2(ticketDeductAmount + Number(rule.price) * t.qty)
          await tx.ticketTxn.create({
            data: {
              storeId: rs.storeId,
              businessDate: rs.businessDate,
              artistId: t.artistId,
              type: 'USE',
              ticketRuleId: rule.id,
              qty: t.qty,
              amount: 0,
              refSessionId: firstSessionByArtist.get(t.artistId) ?? null,
              operatorId: operator.sub,
            },
          })
        }
      }

      // ④ 台费抵扣:按销售经理分配;台票+台费抵扣合计 ≤ 总额(余额现金收款)
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
      }
      if (round2(ticketDeductAmount + feeDeductAmount) > totalAmount) {
        throw new BadRequestException('抵扣合计(台票+台费)超过结算总额')
      }

      // ⑤ 结算落账:抵扣部分逐销售经理 ROOM_SETTLE(只增);现金部分直接收款登记
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
              throw new LeisureError(400, '台费余额不足,禁止结算抵扣(销售经理 ' + String(a.artistId) + ')')
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

      // ⑥ 房账 CLOSED + 场次回链 + 点单封单 + 房态 CLEANING + 在房销售经理离场
      const updated = await tx.roomSession.update({
        where: { id: rs.id },
        data: {
          endAt: now,
          roomFee,
          orderTotal,
          totalAmount,
          settleType: p.settleType,
          feeDeductAmount: feeDeductAmount > 0 ? feeDeductAmount : null,
          ticketDeductAmount: ticketDeductAmount > 0 ? ticketDeductAmount : null,
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
            ticketDeductAmount: ticketDeductAmount > 0 ? ticketDeductAmount : null,
            ticketAllocations: ticketAllocs.length > 0 ? ticketAllocs : undefined,
            txnIds,
          },
        },
      })

      // ⑥ 客资消费档案(2026-11-08):**优先直读房账挂载的客资**(开房时自动写入);旧数据回退=当日 ARRIVED 预约反查 → 写「消费完成」跟进(时间线闭环)
      let linkedLeadId = rs.customerLeadId
      if (linkedLeadId === null) {
        const linkedBooking = await tx.artistBooking.findFirst({
          where: {
            storeId: rs.storeId,
            roomId: rs.roomId,
            customerLeadId: { not: null },
            status: 'ARRIVED',
            businessDate: rs.businessDate,
          },
          orderBy: { id: 'desc' },
        })
        linkedLeadId = linkedBooking?.customerLeadId ?? null
      }
      if (linkedLeadId !== null) {
        await tx.customerFollowup.create({
          data: {
            storeId: rs.storeId,
            leadId: linkedLeadId,
            content: '消费完成 · ' + (rs.roomNo ?? '') + ' ¥' + String(totalAmount) + '(房费 ¥' + String(roomFee) + ' + 点单 ¥' + String(orderTotal) + ')',
            kind: 'CONSUME',
            createdBy: operator.sub,
          },
        })
      }

      return {
        roomFee,
        orderTotal,
        totalAmount,
        settledSessions: settledSessionsArr.length,
        ticketDeductAmount,
        feeDeductAmount,
      }
    })
  }

  /* ── 关房结算单预览(只读):与 close 同一归集口径,金额为此刻报价 ── */

  async billPreview(roomSessionId: number, operator: Operator): Promise<BillPreview> {
    const rs = await this.prisma.roomSession.findUnique({ where: { id: roomSessionId } })
    if (rs === null) throw new NotFoundException('房账不存在')
    if (operator.storeId !== undefined && rs.storeId !== operator.storeId) {
      throw new NotFoundException('房账不存在')
    }
    if (rs.status !== 'OPEN') throw new LeisureError(ERR.ROOM_NOT_OPEN, '房账非 OPEN 态')
    const now = new Date()
    const sessions: BillSessionRow[] = []
    let roomFee = 0

    // ① 在房销售经理进行中场次 → 此刻报价(与 finishIn 同一算路 quoteIn)
    const bound = await this.prisma.roomSessionArtist.findMany({
      where: { sessionId: rs.id, leftAt: null },
    })
    for (const b of bound) {
      const live = await this.prisma.showSession.findFirst({
        where: { artistId: b.artistId, roomId: rs.roomId, endAt: null, roomSessionId: null },
        orderBy: { startAt: 'desc' },
      })
      if (live === null) continue
      const q = await this.sessionService.quoteIn(this.prisma, live.id, now)
      roomFee += q.fee.amount
      sessions.push({
        sessionId: live.id,
        artistId: b.artistId,
        stageName: q.artist.stageName,
        badgeNo: q.artist.badgeNo,
        startAt: live.startAt.toISOString(),
        endAt: null,
        durationMinutes: q.durationMinutes,
        billHours: q.fee.billHours ?? null,
        unitPrice: Number(live.unitPrice ?? 0),
        priceSlotName: live.priceSlotName,
        amount: q.fee.amount,
        live: true,
        minDurationApplied: q.fee.minDurationApplied,
      })
    }

    // ② 已下钟未归本场次的存量(与 close 步骤②同 where,endAt 非空避免与 ① 重叠)
    const pending = await this.prisma.showSession.findMany({
      where: { roomId: rs.roomId, roomSessionId: null, startAt: { gte: rs.startAt }, endAt: { not: null } },
    })
    for (const s of pending) {
      roomFee += Number(s.feeAmount ?? 0)
      sessions.push({
        sessionId: s.id,
        artistId: s.artistId,
        stageName: null,
        badgeNo: null,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt !== null ? s.endAt.toISOString() : null,
        durationMinutes: s.durationMinutes ?? 0,
        billHours: s.billHours,
        unitPrice: Number(s.unitPrice ?? 0),
        priceSlotName: s.priceSlotName,
        amount: Number(s.feeAmount ?? 0),
        live: false,
        minDurationApplied: false,
      })
    }
    // ② 补销售经理名(一次取齐)
    const pendingArtistIds = Array.from(new Set(sessions.filter((x) => x.stageName === null).map((x) => x.artistId)))
    if (pendingArtistIds.length > 0) {
      const artists = await this.prisma.artist.findMany({
        where: { id: { in: pendingArtistIds } },
        select: { id: true, stageName: true, badgeNo: true },
      })
      const nameMap = new Map(artists.map((a) => [a.id, a]))
      for (const row of sessions) {
        if (row.stageName === null) {
          const a = nameMap.get(row.artistId)
          row.stageName = a?.stageName ?? null
          row.badgeNo = a?.badgeNo ?? null
        }
      }
    }
    roomFee = round2(roomFee)

    // ③ 自点单归集(PLACED 视同送达,提示同 close)
    const orders = await this.prisma.selfOrder.findMany({
      where: { sessionId: rs.id, status: { in: ['PLACED', 'DELIVERED'] } },
      orderBy: { id: 'asc' },
    })
    const orderTotal = round2(orders.reduce((acc, o) => acc + Number(o.totalAmount), 0))
    const orderArtistIds = Array.from(new Set(orders.map((o) => o.artistId)))
    const orderArtists = orderArtistIds.length > 0
      ? await this.prisma.artist.findMany({
          where: { id: { in: orderArtistIds } },
          select: { id: true, stageName: true },
        })
      : []
    const orderName = new Map(orderArtists.map((a) => [a.id, a.stageName]))

    // ④ 在房销售经理台费余额(抵扣分配参考)
    const artistRows: BillPreview['artists'] = []
    for (const b of bound) {
      const a = await this.prisma.artist.findUnique({
        where: { id: b.artistId },
        select: { stageName: true, badgeNo: true },
      })
      const txns = await this.prisma.stageFeeTxn.findMany({
        where: { artistId: b.artistId },
        select: { amount: true },
      })
      artistRows.push({
        artistId: b.artistId,
        stageName: a?.stageName ?? null,
        badgeNo: a?.badgeNo ?? null,
        feeBalance: sumFeeBalance(txns.map((t) => ({ amount: Number(t.amount) }))),
      })
    }

    // ④½ 台票余额(§6.6 台票抵扣分配参考):在房销售经理 × 规则聚合;可用性判定走单源 canUseTicket
    const ticketOptions: BillPreview['ticketOptions'] = []
    if (artistRows.length > 0) {
      const ruleRows = await this.prisma.ticketRule.findMany({ where: { storeId: rs.storeId, deletedAt: null } })
      const txnRows = await this.prisma.ticketTxn.findMany({
        where: { artistId: { in: artistRows.map((a) => a.artistId) } },
        select: { artistId: true, ticketRuleId: true, type: true, qty: true, createdAt: true },
      })
      const now = new Date()
      for (const rule of ruleRows) {
        const coreRule = {
          id: rule.id,
          storeId: rule.storeId,
          name: rule.name,
          price: Number(rule.price),
          validDays: rule.validDays,
          status: (rule.status === 1 ? 1 : 0) as 1 | 0,
        }
        for (const a of artistRows) {
          const own = txnRows.filter((t) => t.artistId === a.artistId && t.ticketRuleId === rule.id)
          if (own.length === 0) continue
          const txns = own.map((t) => ({
            ticketRuleId: t.ticketRuleId,
            type: t.type as 'BUY' | 'USE' | 'EXPIRE',
            qty: t.qty,
            createdAt: t.createdAt.getTime(),
          }))
          const usable = canUseTicket(
            txns.map((t) => ({ ...t, createdAt: new Date(t.createdAt).toISOString() })),
            coreRule,
            now,
          )
          if (!usable.ok) continue // 过期/零余额不进分配参考(与核销校验同口径)
          let expireAt: string | null = null
          if (rule.validDays > 0) {
            const buys = txns.filter((t) => t.type === 'BUY').map((t) => t.createdAt)
            if (buys.length > 0) expireAt = new Date(Math.min(...buys) + rule.validDays * 86_400_000).toISOString()
          }
          ticketOptions.push({
            artistId: a.artistId,
            stageName: a.stageName,
            badgeNo: a.badgeNo,
            ticketRuleId: rule.id,
            ruleName: rule.name,
            balance: ticketBalance(txns, rule.id),
            faceValue: Number(rule.price),
            expireAt,
          })
        }
      }
    }

    const settings = await this.storeConfig.getArtistSettings(rs.storeId)
    return {
      roomSessionId: rs.id,
      roomId: rs.roomId,
      roomNo: rs.roomNo,
      startAt: rs.startAt.toISOString(),
      elapsedMinutes: diffMinutes(rs.startAt, now),
      quotedAt: now.toISOString(),
      sessions,
      orders: orders.map((o) => ({
        orderId: o.id,
        artistId: o.artistId,
        stageName: orderName.get(o.artistId) ?? null,
        items: o.items,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        placedAt: o.placedAt.toISOString(),
      })),
      roomFee,
      orderTotal,
      totalAmount: round2(roomFee + orderTotal),
      artists: artistRows,
      ticketOptions,
      billing: {
        feeMode: settings.roomBilling.feeMode,
        roundingEnabled: settings.roomBilling.roundingEnabled,
        roundingThresholdMinutes: settings.roomBilling.roundingThresholdMinutes,
        minCharge: settings.roomBilling.minCharge,
        capCharge: settings.roomBilling.capCharge,
      },
    }
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

  /* ── 销售经理自点单 ── */

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

    // 点单人:销售端=token 本人;管理端=必须显式 artistId(代点)
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
    memberPrice?: number
    imageUrl?: string
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
        memberPrice: p.memberPrice,
        imageUrl: p.imageUrl,
        onSale: p.onSale ?? true,
      },
    })
    return { id: created.id }
  }

  /** 商品编辑(P3:图片/价格体系/上下架;守卫 ADMIN 于 Controller) */
  async updateGoods(
    id: number,
    storeId: number,
    p: {
      name?: string
      category?: string
      unit?: string
      salePrice?: number
      memberPrice?: number | null
      imageUrl?: string | null
      onSale?: boolean
      sort?: number
    },
  ): Promise<void> {
    const before = await this.prisma.goods.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('商品不存在')
    await this.prisma.goods.update({
      where: { id },
      data: {
        ...(p.name !== undefined ? { name: p.name } : {}),
        ...(p.category !== undefined ? { category: p.category } : {}),
        ...(p.unit !== undefined ? { unit: p.unit } : {}),
        ...(p.salePrice !== undefined ? { salePrice: p.salePrice } : {}),
        ...(p.memberPrice !== undefined ? { memberPrice: p.memberPrice } : {}),
        ...(p.imageUrl !== undefined ? { imageUrl: p.imageUrl } : {}),
        ...(p.onSale !== undefined ? { onSale: p.onSale } : {}),
        ...(p.sort !== undefined ? { sort: p.sort } : {}),
      },
    })
  }

  /** 商品软删(下架历史保留;点单历史 goodsId 引用不受影响) */
  async deleteGoods(id: number, storeId: number): Promise<void> {
    const before = await this.prisma.goods.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('商品不存在')
    await this.prisma.goods.update({ where: { id }, data: { deletedAt: new Date(), onSale: false } })
  }

  /* ── P0-1 钟房叫钟队列(大屏 + 语音播报文本) ── */
  async createCall(
    p: { roomId: number; artistId: number },
    operator: Operator,
  ): Promise<{ callId: number; voiceText: string }> {
    const room = await this.prisma.room.findUnique({ where: { id: p.roomId } })
    if (room === null) throw new NotFoundException('包厢不存在')
    const artist = await this.prisma.artist.findUnique({ where: { id: p.artistId } })
    if (artist === null) throw new NotFoundException('销售经理不存在')
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

  /* ── 硬件语音盒子(II 期联动层) ── */

  /** 盒子传输:env VOICE_BOX_URL 未配置或非法 → Noop(skipped,不影响 Web Speech 主通道) */
  private voiceBoxOf(): VoiceBoxTransport {
    if (this.voiceBox !== undefined) return this.voiceBox
    const url = env().VOICE_BOX_URL
    if (url === undefined || url === '') {
      this.voiceBox = new NoopVoiceBoxTransport()
      return this.voiceBox
    }
    try {
      this.voiceBox = new HttpVoiceBoxTransport({
        urlTemplate: url,
        timeoutMs: env().VOICE_BOX_TIMEOUT_MS,
      })
    } catch {
      // 配置非法:降级为 Noop(启动不失败;结果记审计可排查)
      this.voiceBox = new NoopVoiceBoxTransport()
    }
    return this.voiceBox
  }

  /** 盒子分发(尽力而为):结果落审计 VOICE_BOX_DISPATCH,失败不阻断叫钟流转 */
  private async dispatchVoiceBox(callId: number, storeId: number, text: string): Promise<void> {
    const result = await this.voiceBoxOf().announce(text)
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: null,
        action: 'VOICE_BOX_DISPATCH',
        targetType: 'room_call',
        targetId: String(callId),
        afterJson: { text, ...result } as object,
      },
    })
  }

  /** 盒子连通性测试(管理端):读 env 配置直接发一条 */
  async testVoiceBox(text: string, storeId: number, operatorId: number): Promise<VoiceBoxResult & { configured: boolean }> {
    const url = env().VOICE_BOX_URL
    const result = await this.voiceBoxOf().announce(text)
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action: 'VOICE_BOX_TEST',
        targetType: 'voice_box',
        targetId: 'test',
        afterJson: { text, url: url ?? null, ...result } as object,
      },
    })
    return { ...result, configured: url !== undefined && url !== '' }
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
    // 硬件盒子联动:CALLED 即向店内盒子分发播报(异步尽力而为,不拖慢流转响应)
    if (status === 'CALLED' && call.voiceText !== null && call.voiceText !== '') {
      void this.dispatchVoiceBox(call.id, call.storeId, call.voiceText).catch(() => undefined)
    }
    return { ok: true }
  }

  /** 销售端「我的包厢」 */
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

  /** 销售端「我的订单」(a21:房账+自点单归一视图;scope=ARTIST 强制本人) */
  async myOrders(artistId: number): Promise<MeOrdersResult> {
    const [orderRows, sessionRows] = await Promise.all([
      this.prisma.selfOrder.findMany({
        where: { artistId },
        orderBy: { id: 'desc' },
        take: 100,
      }),
      // 已随房账结算的本人在场场次(ROOM_FEE 行;未结算的进行中场次不入视图)
      this.prisma.showSession.findMany({
        where: { artistId, roomSessionId: { not: null } },
        orderBy: { id: 'desc' },
        take: 100,
      }),
    ])
    const rsRows = await this.prisma.roomSession.findMany({
      where: { id: { in: sessionRows.map((s) => s.roomSessionId ?? 0) } },
      select: { id: true, roomNo: true },
    })
    const roomNoById = new Map(rsRows.map((r) => [r.id, r.roomNo]))

    const orders: MeOrdersResult['orders'] = []
    let orderTotal = 0
    for (const o of orderRows) {
      if (o.status !== 'CANCELLED') orderTotal = round2(orderTotal + Number(o.totalAmount))
      orders.push({
        id: o.id,
        kind: 'SELF_ORDER',
        businessDate: o.businessDate.toISOString().slice(0, 10),
        roomNo: roomNoById.get(o.sessionId) ?? '',
        amount: Number(o.totalAmount),
        status: o.status,
        placedAt: o.placedAt.toISOString(),
        settledAt: o.settledAt !== null ? o.settledAt.toISOString() : null,
        items: Array.isArray(o.items) ? (o.items as MeOrdersResult['orders'][number]['items']) : null,
      })
    }
    let feeTotal = 0
    for (const s of sessionRows) {
      const amount = Number(s.feeAmount ?? 0)
      feeTotal = round2(feeTotal + amount)
      orders.push({
        id: s.id,
        kind: 'ROOM_FEE',
        businessDate: s.businessDate.toISOString().slice(0, 10),
        roomNo: s.roomSessionId !== null ? roomNoById.get(s.roomSessionId) ?? '' : '',
        amount,
        status: 'SETTLED',
        placedAt: s.startAt.toISOString(),
        settledAt: s.settledAt !== null ? s.settledAt.toISOString() : null,
        items: null,
      })
    }
    orders.sort((a, b) => (a.placedAt ?? '') < (b.placedAt ?? '') ? 1 : -1)
    return {
      orders,
      summary: { orderTotal, feeTotal, count: orders.length },
    }
  }
}

/* ── Controller ── */

interface RoomCloseBody {
  roomSessionId?: number
  settleType?: 'CASH' | 'FEE_DEDUCT' | 'MIXED' | 'TICKET'
  feeDeductAllocations?: Array<{ artistId: number; amount: number }>
  ticketAllocations?: Array<{ artistId: number; ticketRuleId: number; qty: number }>
  remark?: string
}

@Controller()
export class RoomController {
  constructor(private readonly svc: RoomService) {}

  @Post('room-sessions/open')
  async open(@Req() req: Request, @Body() body: { roomId: number; artistIds: number[]; overrideReason?: string; ignoreBookingHold?: boolean }): Promise<unknown> {
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
        ticketAllocations: body.ticketAllocations,
        remark: body.remark,
      },
      user,
    )
  }

  @Get('room-sessions/:id/bill-preview')
  async billPreview(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可查看结算单预览')
    return this.svc.billPreview(id, user)
  }

  @Post('voice-box/test')
  async voiceBoxTest(@Req() req: Request, @Body() body: { text?: string }): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可测试语音盒子')
    return this.svc.testVoiceBox(body.text ?? '语音盒子测试', user.storeId ?? 1, user.sub)
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
    body: { name: string; category?: string; unit?: string; salePrice: number; memberPrice?: number; imageUrl?: string; onSale?: boolean },
  ): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可维护商品')
    if (body.name === undefined || body.name === '' || body.salePrice === undefined) {
      throw new BadRequestException('name/salePrice 必填')
    }
    if (body.imageUrl !== undefined && (typeof body.imageUrl !== 'string' || !body.imageUrl.startsWith('data:image/') || body.imageUrl.length > 400_000)) {
      throw new BadRequestException('图片须为 data:image/* 且 ≤300KB')
    }
    return this.svc.createGoods({ ...body, storeId: user.storeId ?? 1 })
  }

  @Put('goods/:id')
  async updateGoods(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { name?: string; category?: string; unit?: string; salePrice?: number; memberPrice?: number | null; imageUrl?: string | null; onSale?: boolean; sort?: number },
  ): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可维护商品')
    if (body.imageUrl !== undefined && body.imageUrl !== null && (typeof body.imageUrl !== 'string' || !body.imageUrl.startsWith('data:image/') || body.imageUrl.length > 400_000)) {
      throw new BadRequestException('图片须为 data:image/* 且 ≤300KB')
    }
    await this.svc.updateGoods(id, user.storeId ?? 1, body)
    return { ok: true }
  }

  @Post('goods/:id/delete')
  async deleteGoods(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ADMIN') throw new ForbiddenException('仅管理端可维护商品')
    await this.svc.deleteGoods(id, user.storeId ?? 1)
    return { ok: true }
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
    if (user.scope !== 'ARTIST') throw new UnauthorizedException('仅销售端')
    return this.svc.myRoom(user.sub, user.storeId ?? 1)
  }

  /** 销售端「我的订单」(a21):自点单 + 已随房账结算的本人上场次 */
  @Get('me/orders')
  async myOrders(@Req() req: Request): Promise<unknown> {
    const user = op(req)
    if (user.scope !== 'ARTIST') throw new UnauthorizedException('仅销售端')
    return this.svc.myOrders(user.sub)
  }
}

/* ── Module ── */

@Module({
  imports: [SessionModule, DispatchModule],
  controllers: [RoomController],
  providers: [RoomService, PrismaService, StoreConfigService],
  exports: [RoomService],
})
export class RoomModule {}
