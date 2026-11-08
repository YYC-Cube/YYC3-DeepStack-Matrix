/**
 * 预约管理模块:客人预约销售经理/包厢(实测 PC「预约管理」列名:预约号/预约时间/包厢/组别/销售经理/状态)
 * 模型:artist_booking(storeId+bookingNo 唯一;status BOOKED→ARRIVED/CANCELLED/NO_SHOW,终态锁定)
 * - 预约号自动生成 BK{yyyymmdd}-{序号};押金登记口径;锁钟期=bookingTime+holdMinutes(期内撞开房 40915)
 * - 到店(ARRIVED)且指名房+销售经理 → 自动建叫钟(QUEUED,复用 RoomService.createCall;callId 回写)
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
import { IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import type { Request } from 'express'
import { randomInt } from 'node:crypto'
import { ERR, LeisureError, resolveBusinessDate } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { RoomModule, RoomService } from '../room/room.module.js'

/* ── 状态机(对齐 leisure-core BookingStatus) ── */

const BOOKING_STATUS = ['BOOKED', 'ARRIVED', 'CANCELLED', 'NO_SHOW'] as const
type BookingStatus = (typeof BOOKING_STATUS)[number]
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  BOOKED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: [],
  CANCELLED: [],
  NO_SHOW: [],
}

/* ── DTO ── */

class CreateBookingDto {
  /** 预约到店时间(ISO);缺省=现在 */
  @IsOptional()
  @IsISO8601()
  bookingTime?: string
  @IsOptional()
  @IsInt()
  roomId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
  @IsOptional()
  @IsInt()
  artistId?: number
  /** 未建档销售经理/口头指名时的名字(artistId 存在时以档案艺名为准) */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  artistName?: string
  /** 关联客资 id(客资体系衔接;存 customer_lead_id+冗余名) */
  @IsOptional()
  @IsInt()
  customerId?: number
  /** 外部预约号(如小程序/电话登记号);缺省自动生成 */
  @IsOptional()
  @IsString()
  @Length(1, 32)
  bookingNo?: string
  /** 押金(元;登记口径,收款在线下) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  deposit?: number
  /** 锁钟分钟数(默认 30;bookingTime+holdMinutes 内该房拒绝他人开房 40915) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  holdMinutes?: number
}

class SetStatusDto {
  @IsIn(['ARRIVED', 'CANCELLED', 'NO_SHOW'])
  status!: Exclude<BookingStatus, 'BOOKED'>
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/* ── Service ── */

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomService: RoomService,
  ) {}

  async list(
    storeId: number,
    q: { businessDate?: string; status?: string; customerId?: number; page: number; pageSize: number },
  ): Promise<{ rows: unknown[]; total: number; page: number; pageSize: number }> {
    const page = q.page > 0 ? q.page : 1
    const pageSize = q.pageSize > 0 ? Math.min(q.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
    const where = {
      storeId,
      ...(q.businessDate !== undefined && q.businessDate !== '' ? { businessDate: new Date(q.businessDate) } : {}),
      ...(q.status !== undefined && q.status !== '' ? { status: q.status } : {}),
      ...(q.customerId !== undefined ? { customerLeadId: q.customerId } : {}),
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.artistBooking.findMany({
        where,
        orderBy: [{ bookingTime: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { artist: { select: { stageName: true, badgeNo: true } } },
      }),
      this.prisma.artistBooking.count({ where }),
    ])
    return {
      rows: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        bookingNo: r.bookingNo,
        bookingTime: r.bookingTime !== null ? r.bookingTime.toISOString() : null,
        roomId: r.roomId,
        roomName: r.roomName,
        groupId: r.groupId,
        artistId: r.artistId,
        artistName: r.artistId !== null ? r.artist?.stageName ?? r.artistName : r.artistName,
        badgeNo: r.artist?.badgeNo ?? null,
        customerId: r.customerLeadId,
        customerName: r.customerName,
        status: r.status,
        deposit: Number(r.deposit),
        holdUntil: r.holdUntil !== null ? r.holdUntil.toISOString() : null,
        callId: r.callId,
      })),
      total,
      page,
      pageSize,
    }
  }

  async create(storeId: number, body: CreateBookingDto, operatorId: number): Promise<{ id: number; bookingNo: string }> {
    const bookingTime = body.bookingTime !== undefined ? new Date(body.bookingTime) : new Date()
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    const cut = store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
    const businessDateStr = resolveBusinessDate(bookingTime, { cutTime: cut })
    const businessDate = new Date(businessDateStr)

    let roomName: string | null = null
    if (body.roomId !== undefined) {
      const room = await this.prisma.room.findFirst({ where: { id: body.roomId, storeId } })
      if (room === null) throw new NotFoundException('包厢不存在')
      roomName = room.roomName ?? room.roomNo
    }
    let artistName: string | null = body.artistName ?? null
    if (body.artistId !== undefined) {
      const artist = await this.prisma.artist.findFirst({ where: { id: body.artistId, storeId, deletedAt: null } })
      if (artist === null) throw new NotFoundException('销售经理不存在')
      artistName = artist.stageName ?? artist.realName
    }
    if (body.groupId !== undefined) {
      const group = await this.prisma.artistGroup.findFirst({ where: { id: body.groupId, storeId } })
      if (group === null) throw new NotFoundException('组别不存在')
    }
    let customerName: string | null = null
    if (body.customerId !== undefined) {
      const lead = await this.prisma.customerLead.findFirst({ where: { id: body.customerId, storeId } })
      if (lead === null) throw new NotFoundException('客资不存在')
      customerName = lead.name
    }

    // 预约号:外部号优先;否则 BK{yyyymmdd}-{当日序号},冲突时补随机尾号(最多 3 次)
    let bookingNo = body.bookingNo ?? ''
    if (bookingNo === '') {
      const seq = await this.prisma.artistBooking.count({ where: { storeId, businessDate } })
      bookingNo = 'BK' + businessDateStr.replace(/-/g, '') + '-' + String(seq + 1).padStart(4, '0')
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const exists = await this.prisma.artistBooking.findFirst({ where: { storeId, bookingNo }, select: { id: true } })
      if (exists === null) break
      if (body.bookingNo !== undefined) {
        throw new LeisureError(ERR.BOOKING_STATE_INVALID, '预约号已存在')
      }
      bookingNo = bookingNo.slice(0, 26) + '-' + String(randomInt(100, 1000))
    }

    const created = await this.prisma.artistBooking.create({
      data: {
        storeId,
        businessDate,
        bookingNo,
        bookingTime,
        roomId: body.roomId ?? null,
        roomName,
        groupId: body.groupId ?? null,
        artistId: body.artistId ?? null,
        artistName,
        customerLeadId: body.customerId ?? null,
        customerName,
        deposit: body.deposit ?? 0,
        holdMinutes: body.holdMinutes ?? 30,
        // 锁钟截止=到店时间+锁钟分钟(仅指名包厢时有意义;无房预约不锁)
        holdUntil:
          body.roomId !== undefined
            ? new Date(bookingTime.getTime() + (body.holdMinutes ?? 30) * 60_000)
            : null,
        status: 'BOOKED',
      },
    })
    await this.audit(storeId, operatorId, 'BOOKING_CREATE', 'artist_booking', String(created.id), null, created)
    return { id: created.id, bookingNo }
  }

  async setStatus(
    id: number,
    storeId: number,
    status: Exclude<BookingStatus, 'BOOKED'>,
    operatorId: number,
  ): Promise<{ status: BookingStatus; autoCallId: number | null }> {
    const before = await this.prisma.artistBooking.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('预约不存在')
    const cur = before.status as BookingStatus
    const allowed = TRANSITIONS[cur] ?? []
    if (!allowed.includes(status)) {
      throw new LeisureError(ERR.BOOKING_STATE_INVALID, '预约状态不可从 ' + cur + ' 流转到 ' + status)
    }
    const after = await this.prisma.artistBooking.update({ where: { id }, data: { status } })

    // 到店自动叫钟(P1):指名房+销售经理的预约到店 → 自动进叫钟队列(QUEUED,前台大屏/语音接管)
    let autoCallId: number | null = null
    if (status === 'ARRIVED' && before.roomId !== null && before.artistId !== null) {
      const call = await this.roomService.createCall(
        { roomId: before.roomId, artistId: before.artistId },
        { sub: operatorId, name: '', storeId, scope: 'ADMIN' },
      )
      await this.prisma.artistBooking.update({ where: { id }, data: { callId: call.callId } })
      autoCallId = call.callId
    }
    // 客资到店/流失自动跟进(2026-11-08:客资消费档案闭环;挂了客资的预约状态变化即写时间线)
    if (before.customerLeadId !== null && (status === 'ARRIVED' || status === 'NO_SHOW')) {
      await this.prisma.customerFollowup.create({
        data: {
          storeId,
          leadId: before.customerLeadId,
          content: status === 'ARRIVED'
            ? '客到店 · ' + (before.roomName ?? '') + (before.artistName !== null ? ' · 指名 ' + before.artistName : '')
            : '未到店(NO_SHOW) · ' + (before.roomName ?? ''),
          kind: status === 'ARRIVED' ? 'ARRIVED' : 'SYSTEM',
          createdBy: operatorId,
        },
      })
    }
    await this.audit(storeId, operatorId, 'BOOKING_STATUS', 'artist_booking', String(id), before, {
      ...after,
      autoCallId,
    })
    return { status, autoCallId }
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

@Controller('bookings')
export class BookingController {
  constructor(private readonly svc: BookingService) {}

  @RequirePerm('booking:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('businessDate') businessDate?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list(user?.storeId ?? 1, {
      businessDate,
      status,
      customerId: customerId !== undefined && customerId !== '' ? Number(customerId) : undefined,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? DEFAULT_PAGE_SIZE),
    })
  }

  @RequirePerm('booking:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: CreateBookingDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.create(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('booking:manage')
  @Post(':id/status')
  async setStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetStatusDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.setStatus(id, user?.storeId ?? 1, body.status, user?.sub ?? 0)
  }
}

@Module({
  imports: [RoomModule],
  controllers: [BookingController],
  providers: [BookingService, PrismaService],
  exports: [BookingService],
})
export class BookingModule {}
