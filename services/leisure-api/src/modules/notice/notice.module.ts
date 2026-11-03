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
  Req,
} from '@nestjs/common'
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

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
}

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 工作台/公告条拉取(任意登录者;最近 20 条未删) */
  async list(storeId: number, limit = 20): Promise<{ rows: Array<{ id: number; title: string; body: string; publishedBy: number; publisherName: string | null; createdAt: string }> }> {
    const rows = await this.prisma.notice.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { id: 'desc' },
      take: Math.min(Math.max(limit, 1), 20),
    })
    const ids = Array.from(new Set(rows.map((r) => r.publishedBy)))
    const publishers = ids.length > 0
      ? await this.prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : []
    const nameMap = new Map(publishers.map((p) => [p.id, p.name]))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        publishedBy: r.publishedBy,
        publisherName: nameMap.get(r.publishedBy) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  async create(storeId: number, body: CreateNoticeDto, operatorId: number): Promise<{ id: number }> {
    const created = await this.prisma.notice.create({
      data: { storeId, title: body.title, body: body.body, publishedBy: operatorId },
    })
    await this.audit(storeId, operatorId, 'NOTICE_CREATE', 'notice', String(created.id), null, {
      title: body.title,
    })
    return { id: created.id }
  }

  async remove(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.notice.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('通告不存在')
    await this.prisma.notice.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'NOTICE_DELETE', 'notice', String(id), before, null)
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
    return this.svc.list(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: CreateNoticeDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.create(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.remove(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Module({
  controllers: [NoticeController],
  providers: [NoticeService, PrismaService],
})
export class NoticeModule {}
