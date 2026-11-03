/**
 * 工作通告模块(008 #12):工作台通知/公告条数据源
 * - 发布/删除:setting:manage(管理端「工作通告」页)
 * - 查看:任意登录者(管理端/销售端;工作台拉取)
 * 红线:软删(deletedAt);全动作审计
 */
import {
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
  Req,
} from '@nestjs/common'
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

const TITLE_SET = ['VP', 'MANAGER_DIRECTOR', 'MANAGER', 'CASHIER', 'FINANCE'] as const

class CreateNoticeDto {
  @IsString()
  @Length(1, 128)
  title!: string
  @IsString()
  @Length(1, 2000)
  body!: string
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number
  /** 公告条滚动播放次数(0=常驻循环;默认 3) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  playTimes?: number
  /** 展示时段窗口起(空=立即) */
  @IsOptional()
  @IsString()
  playStart?: string
  /** 展示时段窗口止(空=永久) */
  @IsOptional()
  @IsString()
  playEnd?: string
  /** 公告条单轮滚动秒数(10-120;默认 22) */
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  playSpeed?: number
  /** 可看职级白名单(逗号分隔;空=全员) */
  @IsOptional()
  @IsString()
  visibleTitles?: string
  /** 提醒效果(新通告红点+首次弹层;默认 true) */
  @IsOptional()
  remind?: boolean
}

class UpdateNoticeDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  title?: string
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  body?: string
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  playTimes?: number
  @IsOptional()
  @IsString()
  playStart?: string
  @IsOptional()
  @IsString()
  playEnd?: string
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  playSpeed?: number
  @IsOptional()
  @IsString()
  visibleTitles?: string
  @IsOptional()
  remind?: boolean
}

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 工作台/公告条拉取(任意登录者;按职级白名单/展示窗口过滤;最近 20 条未删) */
  async list(storeId: number, viewerId: number, viewerScope: 'ADMIN' | 'ARTIST' | undefined, limit = 20): Promise<{ rows: Array<{ id: number; title: string; body: string; publishedBy: number; publisherName: string | null; createdAt: string; playTimes: number; playSpeed: number; remind: boolean }> }> {
    // 调用者职级:管理端按账号职级;销售端无职级 → 视为 MANAGER
    let viewerTitle: string | undefined = viewerScope === 'ARTIST' ? 'MANAGER' : undefined
    if (viewerScope === 'ADMIN') {
      const u = await this.prisma.adminUser.findUnique({ where: { id: viewerId }, select: { title: true } })
      viewerTitle = u?.title ?? undefined
    }
    const rows = await this.prisma.notice.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { id: 'desc' },
      take: Math.min(Math.max(limit, 1), 20),
    })
    const now = Date.now()
    const visible = rows.filter((r) => {
      // 展示时段窗口(空=立即+永久)
      if (r.playStart !== null && now < r.playStart.getTime()) return false
      if (r.playEnd !== null && now > r.playEnd.getTime()) return false
      // 可看职级白名单(空=全员);viewerTitle 空视为 MANAGER(销售经理)
      if (r.visibleTitles !== null && r.visibleTitles !== '') {
        const allow = r.visibleTitles.split(',').map((s) => s.trim())
        return allow.includes(viewerTitle ?? 'MANAGER')
      }
      return true
    })
    const ids = Array.from(new Set(visible.map((r) => r.publishedBy)))
    const publishers = ids.length > 0
      ? await this.prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : []
    const nameMap = new Map(publishers.map((p) => [p.id, p.name]))
    return {
      rows: visible.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        publishedBy: r.publishedBy,
        publisherName: nameMap.get(r.publishedBy) ?? null,
        createdAt: r.createdAt.toISOString(),
        playTimes: r.playTimes,
        playSpeed: r.playSpeed,
        remind: r.remind,
      })),
    }
  }

  async create(storeId: number, body: CreateNoticeDto, operatorId: number): Promise<{ id: number }> {
    const created = await this.prisma.notice.create({
      data: {
        storeId,
        title: body.title,
        body: body.body,
        publishedBy: operatorId,
        ...(body.playTimes !== undefined ? { playTimes: body.playTimes } : {}),
        ...(body.playStart !== undefined ? { playStart: new Date(body.playStart) } : {}),
        ...(body.playEnd !== undefined ? { playEnd: new Date(body.playEnd) } : {}),
        ...(body.playSpeed !== undefined ? { playSpeed: body.playSpeed } : {}),
        ...(body.visibleTitles !== undefined ? { visibleTitles: body.visibleTitles } : {}),
        ...(body.remind !== undefined ? { remind: body.remind } : {}),
      },
    })
    await this.audit(storeId, operatorId, 'NOTICE_CREATE', 'notice', String(created.id), null, {
      title: body.title,
    })
    return { id: created.id }
  }

  async update(id: number, storeId: number, body: UpdateNoticeDto, operatorId: number): Promise<void> {
    const before = await this.prisma.notice.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('通告不存在')
    const after = await this.prisma.notice.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
        ...(body.playTimes !== undefined ? { playTimes: body.playTimes } : {}),
        ...(body.playStart !== undefined ? { playStart: body.playStart === '' ? null : new Date(body.playStart) } : {}),
        ...(body.playEnd !== undefined ? { playEnd: body.playEnd === '' ? null : new Date(body.playEnd) } : {}),
        ...(body.playSpeed !== undefined ? { playSpeed: body.playSpeed } : {}),
        ...(body.visibleTitles !== undefined ? { visibleTitles: body.visibleTitles === '' ? null : body.visibleTitles } : {}),
        ...(body.remind !== undefined ? { remind: body.remind } : {}),
      },
    })
    await this.audit(storeId, operatorId, 'NOTICE_UPDATE', 'notice', String(id), before, after)
  }

  async remove(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.notice.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('通告不存在')
    await this.prisma.notice.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'NOTICE_DELETE', 'notice', String(id), before, null)
  }

  /** 触达上报:同用户同通告幂等(重复上报静默忽略);职级取管理端账号 title */
  async markRead(noticeId: number, storeId: number, userId: number, scope: 'ADMIN' | 'ARTIST'): Promise<{ recorded: boolean }> {
    const notice = await this.prisma.notice.findFirst({ where: { id: noticeId, storeId, deletedAt: null } })
    if (notice === null) throw new NotFoundException('通告不存在')
    let viewerTitle: string | null = null
    if (scope === 'ADMIN') {
      const u = await this.prisma.adminUser.findUnique({ where: { id: userId }, select: { title: true } })
      viewerTitle = u?.title ?? null
    } else {
      viewerTitle = 'MANAGER' // 销售端视同销售经理
    }
    const dup = await this.prisma.noticeRead.findFirst({ where: { noticeId, userId } })
    if (dup !== null) return { recorded: false }
    await this.prisma.noticeRead.create({
      data: { storeId, noticeId, userId, viewerScope: scope, viewerTitle },
    })
    return { recorded: true }
  }

  /** 触达统计:已读数/按职级分布/触达率(分母=各职级在职员工数;销售端不计入分母) */
  async readStats(noticeId: number, storeId: number) {
    const notice = await this.prisma.notice.findFirst({ where: { id: noticeId, storeId, deletedAt: null } })
    if (notice === null) throw new NotFoundException('通告不存在')
    const reads = await this.prisma.noticeRead.findMany({ where: { noticeId, storeId } })
    const staff = await this.prisma.adminUser.groupBy({
      by: ['title'],
      where: { storeId, status: 1, roleId: { not: null } },
      _count: { _all: true },
    })
    const totalByTitle = new Map(staff.map((s) => [s.title ?? 'MANAGER', s._count._all]))
    const readByTitle: Record<string, number> = {}
    for (const r of reads) {
      const key = r.viewerTitle ?? 'MANAGER'
      readByTitle[key] = (readByTitle[key] ?? 0) + 1
    }
    const visibleTitles = notice.visibleTitles !== null && notice.visibleTitles !== ''
      ? notice.visibleTitles.split(',').map((s) => s.trim())
      : Array.from(totalByTitle.keys())
    const byTitle = visibleTitles.map((t) => {
      const denom = totalByTitle.get(t) ?? 0
      const read = readByTitle[t] ?? 0
      return { title: t, titleName: t === 'VP' ? '销售副总' : t === 'MANAGER_DIRECTOR' ? '销售总监' : t === 'MANAGER' ? '销售经理' : t === 'CASHIER' ? '收银员' : '财务', total: denom, read, rate: denom > 0 ? Math.round((read / denom) * 100) : null }
    })
    const denomAll = byTitle.reduce((a, b) => a + b.total, 0)
    const readAll = byTitle.reduce((a, b) => a + b.read, 0)
    return {
      noticeId,
      title: notice.title,
      readCount: reads.length,
      byTitle,
      reachRate: denomAll > 0 ? Math.round((readAll / denomAll) * 100) : null,
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

@Controller('notices')
export class NoticeController {
  constructor(private readonly svc: NoticeService) {}

  @Get()
  async list(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list(user?.storeId ?? 1, user?.sub ?? 0, user?.scope)
  }

  @RequirePerm('setting:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: CreateNoticeDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.create(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateNoticeDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.update(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('setting:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.remove(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }

  /** 触达上报(任意登录者;同用户同通告幂等) */
  @Post(':id/read')
  async markRead(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.markRead(id, user?.storeId ?? 1, user?.sub ?? 0, user?.scope ?? 'ADMIN')
  }

  /** 触达统计(谁看过/各职级触达;setting:manage) */
  @RequirePerm('setting:manage')
  @Get(':id/stats')
  async readStats(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.readStats(id, user?.storeId ?? 1)
  }
}

@Module({
  controllers: [NoticeController],
  providers: [NoticeService, PrismaService],
})
export class NoticeModule {}
