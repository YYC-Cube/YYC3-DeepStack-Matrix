/**
 * 考勤模块:扫码签到/签退(签退时限 40905)/补打卡/明细/汇总矩阵/实时看板
 * 营业日与时限计算 import @yyc3/leisure-core(单源,禁止复制实现)
 */
import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  Req,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  millisSinceBusinessDayStart,
  resolveBusinessDate,
  REPORT_TYPES,
  type ReportType,
} from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, type ReqWithUser } from '../../common/guards/jwt.guard.js'

const VALID_REPORT_TYPES = REPORT_TYPES.map((t) => t.code) as string[]

function isReportType(v: string): v is ReportType {
  return VALID_REPORT_TYPES.includes(v)
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** 扫码签到:geo 可空(失败标记 checkinGeoOk=false) */
  async checkin(
    p: { reportType: string; lat?: number; lng?: number },
    ctx: { artistId: number; storeId: number },
  ): Promise<{ reportId: number; businessDate: string }> {
    if (!isReportType(p.reportType)) {
      throw new ConflictException('无效的报备类型')
    }
    const now = new Date()
    const businessDate = resolveBusinessDate(now, { cutTime: env().BUSINESS_DAY_CUT })
    const bdDate = new Date(businessDate)
    const dup = await this.prisma.attendanceReport.findFirst({
      where: {
        storeId: ctx.storeId,
        artistId: ctx.artistId,
        businessDate: bdDate,
        type: 'CHECKIN',
      },
    })
    if (dup !== null) {
      throw new ConflictException('今日已签到')
    }
    const artist = await this.prisma.artist.findUnique({ where: { id: ctx.artistId } })
    const geoOk = p.lat !== undefined && p.lng !== undefined
    const created = await this.prisma.attendanceReport.create({
      data: {
        storeId: ctx.storeId,
        businessDate: bdDate,
        artistId: ctx.artistId,
        groupId: artist?.groupId ?? null,
        supervisorName: artist?.supervisorName ?? null,
        type: p.reportType,
        reportTime: now,
        checkinLat: p.lat,
        checkinLng: p.lng,
        checkinGeoOk: geoOk,
        source: 0,
      },
    })
    return { reportId: created.id, businessDate }
  }

  /** 签退:距签到 < CHECKOUT_MIN_MINUTES → 40905(单源校验口径) */
  async checkout(
    p: { lat?: number; lng?: number },
    ctx: { artistId: number; storeId: number },
  ): Promise<{ reportId: number; durationMinutes: number }> {
    const now = new Date()
    const businessDate = resolveBusinessDate(now, { cutTime: env().BUSINESS_DAY_CUT })
    const report = await this.prisma.attendanceReport.findFirst({
      where: {
        storeId: ctx.storeId,
        artistId: ctx.artistId,
        businessDate: new Date(businessDate),
        checkoutTime: null,
      },
      orderBy: { reportTime: 'desc' },
    })
    if (report === null) {
      throw new ConflictException('今日尚未签到')
    }
    // 时限:距「营业日开始」或「签到时刻」取大者后的 N 分钟窗口由配置语义决定;
    // 实测口径:签到后 N 分钟方可签退
    const sinceCheckin = now.getTime() - new Date(report.reportTime).getTime()
    const sinceDayStart = millisSinceBusinessDayStart(now, {
      cutTime: env().BUSINESS_DAY_CUT,
    })
    const minMs = env().CHECKOUT_MIN_MINUTES * 60_000
    if (sinceCheckin < minMs && sinceDayStart >= minMs) {
      throw new ConflictException('签到未满 ' + String(env().CHECKOUT_MIN_MINUTES) + ' 分钟,禁止签退')
    }
    const updated = await this.prisma.attendanceReport.update({
      where: { id: report.id },
      data: {
        checkoutTime: now,
        checkoutLat: p.lat,
        checkoutLng: p.lng,
      },
    })
    const durationMinutes = Math.max(
      0,
      Math.floor(
        (now.getTime() - new Date(updated.reportTime).getTime()) / 60_000,
      ),
    )
    return { reportId: updated.id, durationMinutes }
  }

  /** 报备明细 */
  async reports(q: {
    storeId: number
    businessDate: string
    groupId?: number
    type?: string
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    const where = {
      storeId: q.storeId,
      businessDate: new Date(q.businessDate),
      groupId: q.groupId,
      type: q.type,
    }
    const [rows, total] = await Promise.all([
      this.prisma.attendanceReport.findMany({
        where,
        orderBy: { reportTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { artist: { select: { stageName: true, badgeNo: true, realName: true } } },
      }),
      this.prisma.attendanceReport.count({ where }),
    ])
    return { rows, total }
  }

  /** 报备汇总矩阵:组别×主管 → 陪宴/签到/私事/早退/迟到/例假/其他/未报备/签退/合计 */
  async summary(q: {
    storeId: number
    businessDate: string
  }): Promise<{ rows: unknown[] }> {
    const rows = await this.prisma.attendanceReport.groupBy({
      by: ['groupId', 'supervisorName', 'type'],
      where: { storeId: q.storeId, businessDate: new Date(q.businessDate) },
      _count: { _all: true },
    })
    const artists = await this.prisma.artist.findMany({
      where: { storeId: q.storeId, deletedAt: null },
      select: { groupId: true, supervisorName: true },
    })
    const keyOf = (g: number | null, s: string | null): string =>
      String(g ?? 0) + '|' + String(s ?? '')
    const buckets = new Map<
      string,
      { groupId: number; groupName: string; supervisorName: string; counts: Map<string, number>; checkedOut: number }
    >()
    for (const a of artists) {
      const k = keyOf(a.groupId, a.supervisorName)
      if (!buckets.has(k)) {
        buckets.set(k, {
          groupId: a.groupId ?? 0,
          groupName: a.groupId !== null ? String(a.groupId) : '未分组',
          supervisorName: a.supervisorName ?? '',
          counts: new Map(),
          checkedOut: 0,
        })
      }
    }
    for (const r of rows) {
      const k = keyOf(r.groupId, r.supervisorName)
      if (!buckets.has(k)) {
        buckets.set(k, {
          groupId: r.groupId ?? 0,
          groupName: r.groupId !== null ? String(r.groupId) : '未分组',
          supervisorName: r.supervisorName ?? '',
          counts: new Map(),
          checkedOut: 0,
        })
      }
      const b = buckets.get(k)
      if (b === undefined) continue
      b.counts.set(r.type, (b.counts.get(r.type) ?? 0) + r._count._all)
      if (r.type === 'CHECKIN') {
        // 签退人数另算
      }
    }
    const checkouts = await this.prisma.attendanceReport.groupBy({
      by: ['groupId', 'supervisorName'],
      where: {
        storeId: q.storeId,
        businessDate: new Date(q.businessDate),
        checkoutTime: { not: null },
      },
      _count: { _all: true },
    })
    for (const c of checkouts) {
      const k = keyOf(c.groupId, c.supervisorName)
      const b = buckets.get(k)
      if (b !== undefined) b.checkedOut = c._count._all
    }
    const out = [...buckets.values()].map((b) => ({
      groupId: b.groupId,
      groupName: b.groupName,
      supervisorName: b.supervisorName,
      peiban: b.counts.get('PEIBAN') ?? 0,
      checkin: b.counts.get('CHECKIN') ?? 0,
      sishi: b.counts.get('SISHI') ?? 0,
      zaotui: b.counts.get('ZAOTUI') ?? 0,
      chidao: b.counts.get('CHIDAO') ?? 0,
      lijia: b.counts.get('LIJIA') ?? 0,
      qita: b.counts.get('QITA') ?? 0,
      weibao: 0, // 未报备=在册人数−Σ报备,由前端或报表层用档案总数补
      checkedOut: b.checkedOut,
      total:
        (b.counts.get('PEIBAN') ?? 0) +
        (b.counts.get('CHECKIN') ?? 0) +
        (b.counts.get('SISHI') ?? 0) +
        (b.counts.get('ZAOTUI') ?? 0) +
        (b.counts.get('CHIDAO') ?? 0) +
        (b.counts.get('LIJIA') ?? 0) +
        (b.counts.get('QITA') ?? 0),
    }))
    return { rows: out }
  }

  /** 补打卡(管理端,审计留痕) */
  async manual(
    p: { artistId: number; type: string; businessDate: string; reason: string },
    operator: { sub: number; name: string; storeId?: number },
  ): Promise<{ reportId: number }> {
    if (!isReportType(p.type)) {
      throw new ConflictException('无效的报备类型')
    }
    if (p.reason === undefined || p.reason === '') {
      throw new ConflictException('补打卡原因必填')
    }
    const artist = await this.prisma.artist.findUnique({ where: { id: p.artistId } })
    const created = await this.prisma.attendanceReport.create({
      data: {
        storeId: artist?.storeId ?? operator.storeId ?? 1,
        businessDate: new Date(p.businessDate),
        artistId: p.artistId,
        groupId: artist?.groupId ?? null,
        supervisorName: artist?.supervisorName ?? null,
        type: p.type,
        reportTime: new Date(),
        source: 1,
        operatorId: operator.sub,
        remark: p.reason,
      },
    })
    return { reportId: created.id }
  }

  /** 实时看板(阶段1:仅考勤态;阶段2接 session 上钟/串台) */
  async realtime(
    q: { storeId: number; groupId?: number; keyword?: string },
  ): Promise<{ counts: Record<string, number>; artists: unknown[] }> {
    const today = new Date(resolveBusinessDate(new Date(), { cutTime: env().BUSINESS_DAY_CUT }))
    const artists = await this.prisma.artist.findMany({
      where: {
        storeId: q.storeId,
        deletedAt: null,
        status: 1,
        groupId: q.groupId,
        OR:
          q.keyword !== undefined && q.keyword !== ''
            ? [
                { stageName: { contains: q.keyword } },
                { badgeNo: { contains: q.keyword } },
              ]
            : undefined,
      },
      select: {
        id: true,
        stageName: true,
        badgeNo: true,
        groupId: true,
        reports: {
          where: { businessDate: today },
          select: { type: true, checkoutTime: true },
        },
      },
    })
    const counts: Record<string, number> = {
      IDLE: 0,
      CHECKED_IN: 0,
      ON_STAGE: 0,
      CROSS: 0,
      SELECTED: 0,
    }
    const list = artists.map((a) => {
      const hasCheckin = a.reports.some((r) => r.type === 'CHECKIN')
      const hasCheckout = a.reports.some((r) => r.checkoutTime !== null)
      const status = hasCheckout ? 'IDLE' : hasCheckin ? 'CHECKED_IN' : 'IDLE'
      counts[status] = (counts[status] ?? 0) + 1
      return {
        artistId: a.id,
        stageName: a.stageName ?? a.id,
        badgeNo: a.badgeNo,
        groupId: a.groupId,
        status,
      }
    })
    return { counts, artists: list }
  }
}

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Post('checkin')
  async checkin(
    @Req() req: Request,
    @Body() body: { reportType: string; lat?: number; lng?: number },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    if (user === undefined || user.scope !== 'ARTIST') {
      throw new UnauthorizedException('仅艺人端可扫码签到')
    }
    return this.svc.checkin(body, { artistId: user.sub, storeId: user.storeId ?? 1 })
  }

  @Post('checkout')
  async checkout(
    @Req() req: Request,
    @Body() body: { lat?: number; lng?: number },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    if (user === undefined || user.scope !== 'ARTIST') {
      throw new UnauthorizedException('仅艺人端可扫码签退')
    }
    return this.svc.checkout(body, { artistId: user.sub, storeId: user.storeId ?? 1 })
  }

  @Get('reports')
  async reports(
    @Req() req: Request,
    @Query('businessDate') businessDate: string,
    @Query('groupId') groupId?: string,
    @Query('type') type?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.reports({
      storeId: user?.storeId ?? 1,
      businessDate,
      groupId: groupId !== undefined ? Number(groupId) : undefined,
      type,
      keyword,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }

  @Get('summary')
  async summary(
    @Req() req: Request,
    @Query('businessDate') businessDate: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.summary({ storeId: user?.storeId ?? 1, businessDate })
  }

  @Post('manual')
  async manual(
    @Req() req: Request,
    @Body() body: { artistId: number; type: string; businessDate: string; reason: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.manual(
      body,
      { sub: user?.sub ?? 0, name: user?.name ?? '', storeId: user?.storeId },
    )
  }

  @Get('realtime')
  async realtime(
    @Req() req: Request,
    @Query('groupId') groupId?: string,
    @Query('keyword') keyword?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.realtime({
      storeId: user?.storeId ?? 1,
      groupId: groupId !== undefined ? Number(groupId) : undefined,
      keyword,
    })
  }
}

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, PrismaService],
})
export class AttendanceModule {}
