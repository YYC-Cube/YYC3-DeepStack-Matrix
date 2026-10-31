/**
 * 艺人档案模块:CRUD/批量设置/软删(有流水禁删 40906)/腰牌号唯一(40901)
 * 计算与校验一律走 @yyc3/leisure-core(本模块主要做 IO/事务/审计)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator'
import { PrismaService } from '../../prisma/prisma.service.js'
import { ERR, LeisureError } from '@yyc3/leisure-core'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

interface ArtistCreateBody {
  // storeId 不在契约内:svc.create 以独立入参接收(控制器做 body→用户默认店兜底)
  groupId?: number
  supervisorName?: string
  levelId?: number
  realName: string
  stageName?: string
  gender?: number
  phone?: string
  badgeNo?: string
  performanceTarget?: number
  maxTotalShows?: number
  maxCrossRooms?: number
  firstShowMinMinutes?: number
  sameRoomMinMinutes?: number
  tipFixed?: number
  hourlyRate?: number
  /** 审核状态(需求全集 §3;缺省 PENDING 等待审核) */
  auditStatus?: 'PENDING' | 'REJECTED' | 'APPROVED'
}

/**
 * 建档入参 DTO:激活全局 ValidationPipe(whitelist+forbidNonWhitelisted)
 * 未知字段 400 拒绝;长度对齐 schema VarChar 上限。Mimosa「整块请求对象
 * 进入资源写入」的边界收口(svc 层显式映射保留为第二层防线)
 */
class ArtistCreateDto {
  @IsOptional()
  @IsInt()
  storeId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
  @IsOptional()
  @IsInt()
  levelId?: number
  @IsOptional()
  @IsString()
  @MaxLength(64)
  supervisorName?: string
  @IsString()
  @Length(1, 64)
  realName!: string
  @IsOptional()
  @IsString()
  @MaxLength(64)
  stageName?: string
  @IsOptional()
  @IsIn([1, 2])
  gender?: number
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string
  @IsOptional()
  @IsString()
  @MaxLength(32)
  badgeNo?: string
  @IsOptional()
  @IsNumber()
  @Min(0)
  performanceTarget?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTotalShows?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCrossRooms?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  firstShowMinMinutes?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  sameRoomMinMinutes?: number
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipFixed?: number
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number
  @IsOptional()
  @IsIn(['PENDING', 'REJECTED', 'APPROVED'])
  auditStatus?: 'PENDING' | 'REJECTED' | 'APPROVED'
}

/** 批量设置入参 DTO(同上,拒绝未知字段与非法 id 形状) */
class ArtistBatchUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids!: number[]
  @IsOptional()
  @IsInt()
  levelId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
  @IsOptional()
  @IsInt()
  status?: number
}

/** 档案审核入参 DTO(需求全集 §3) */
class ArtistAuditDto {
  @IsIn(['APPROVED', 'REJECTED'])
  auditStatus!: 'APPROVED' | 'REJECTED'
}

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: {
    storeId: number
    groupId?: number
    levelId?: number
    status?: string
    auditStatus?: string
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    const where = {
      storeId: q.storeId,
      deletedAt: null,
      groupId: q.groupId,
      levelId: q.levelId,
      auditStatus: q.auditStatus,
      OR:
        q.keyword !== undefined && q.keyword !== ''
          ? [
              { realName: { contains: q.keyword } },
              { stageName: { contains: q.keyword } },
              { badgeNo: { contains: q.keyword } },
              { phone: { contains: q.keyword } },
            ]
          : undefined,
    }
    const [rows, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { group: true, level: true },
      }),
      this.prisma.artist.count({ where }),
    ])
    return { rows, total }
  }

  async create(
    body: ArtistCreateBody,
    operatorId: number,
    storeId: number,
  ): Promise<{ id: number }> {
    if (body.realName === undefined || body.realName === '') {
      throw new BadRequestException('realName 必填')
    }
    if (body.badgeNo !== undefined && body.badgeNo !== '') {
      // 腰牌号店内唯一含软删档案(uk_badge 唯一索引不滤 deleted_at):
      // 查重若滤软删,删除后同号重建会直撞 DB 唯一键(500);此处统一 40901
      const dup = await this.prisma.artist.findFirst({
        where: { storeId, badgeNo: body.badgeNo },
      })
      if (dup !== null) {
        // 40901 腰牌号重复(对齐 04-API 错误码)
        throw new ConflictException('腰牌号已存在')
      }
    }
    const created = await this.prisma.artist.create({
      data: {
        storeId,
        groupId: body.groupId,
        supervisorName: body.supervisorName,
        levelId: body.levelId,
        realName: body.realName,
        stageName: body.stageName,
        gender: body.gender ?? 1,
        phone: body.phone,
        badgeNo: body.badgeNo,
        performanceTarget: body.performanceTarget ?? 0,
        maxTotalShows: body.maxTotalShows ?? 0,
        maxCrossRooms: body.maxCrossRooms ?? 0,
        firstShowMinMinutes: body.firstShowMinMinutes ?? 0,
        sameRoomMinMinutes: body.sameRoomMinMinutes ?? 0,
        tipFixed: body.tipFixed ?? 0,
        hourlyRate: body.hourlyRate ?? 0,
        auditStatus: body.auditStatus ?? 'PENDING',
      },
    })
    await this.audit(operatorId, 'ARTIST_CREATE', 'artist', String(created.id), null, created)
    return { id: created.id }
  }

  /** 软删(有台费/台票/场次流水 → 40906 禁删,引导停用) */
  async softDelete(id: number, operatorId: number): Promise<void> {
    const [fee, ticket, session] = await Promise.all([
      this.prisma.stageFeeTxn.count({ where: { artistId: id } }),
      this.prisma.ticketTxn.count({ where: { artistId: id } }),
      this.prisma.showSession.count({ where: { artistId: id } }),
    ])
    if (fee + ticket + session > 0) {
      // 40906(04-API §10):有流水禁删,引导停用——业务码入响应体供四端判断
      throw new LeisureError(ERR.ARTIST_HAS_TXN_NO_DELETE, '该艺人存在业务流水,请使用停用')
    }
    const before = await this.prisma.artist.findUnique({ where: { id } })
    await this.prisma.artist.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(operatorId, 'ARTIST_DELETE', 'artist', String(id), before, null)
  }

  /** 批量设置(等级/组别/状态);逐条审计 */
  async batchUpdate(
    p: { ids: number[]; levelId?: number; groupId?: number; status?: number },
    operatorId: number,
  ): Promise<{ updated: number }> {
    let updated = 0
    for (const id of p.ids) {
      const before = await this.prisma.artist.findUnique({ where: { id } })
      if (before === null) continue
      await this.prisma.artist.update({
        where: { id },
        data: {
          levelId: p.levelId ?? before.levelId,
          groupId: p.groupId ?? before.groupId,
          status: p.status ?? before.status,
        },
      })
      await this.audit(operatorId, 'ARTIST_BATCH_UPDATE', 'artist', String(id), before, {
        levelId: p.levelId,
        groupId: p.groupId,
        status: p.status,
      })
      updated += 1
    }
    return { updated }
  }

  /** 档案审核流转(需求全集 §3:等待审核/审核未通过/审核通过;通过才对外展示) */
  async auditArtist(
    id: number,
    auditStatus: 'APPROVED' | 'REJECTED',
    operatorId: number,
  ): Promise<void> {
    const before = await this.prisma.artist.findFirst({
      where: { id, deletedAt: null },
    })
    if (before === null) {
      throw new BadRequestException('艺人不存在或已删除')
    }
    await this.prisma.artist.update({ where: { id }, data: { auditStatus } })
    await this.audit(operatorId, 'ARTIST_AUDIT', 'artist', String(id), before, {
      auditStatus,
    })
  }

  private async audit(
    operatorId: number,
    action: string,
    targetType: string,
    targetId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        beforeJson: (before ?? null) as object,
        afterJson: (after ?? null) as object,
        actorId: operatorId,
      },
    })
  }
}

@Controller('artists')
export class ArtistController {
  constructor(private readonly svc: ArtistService) {}

  @RequirePerm('artist:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('groupId') groupId?: string,
    @Query('levelId') levelId?: string,
    @Query('auditStatus') auditStatus?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list({
      storeId: user?.storeId ?? 1,
      groupId: groupId !== undefined ? Number(groupId) : undefined,
      levelId: levelId !== undefined ? Number(levelId) : undefined,
      auditStatus,
      keyword,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }

  @RequirePerm('artist:edit')
  @Post()
  async create(@Req() req: Request, @Body() body: ArtistCreateDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    const storeId = body.storeId ?? user?.storeId ?? 1
    // DTO 实例整体直传(svc 内显式字段映射为唯一写入源),不做 spread:
    // 入口层 DTO 校验(拒未知字段)+ svc 层显式映射,双层防线且无整包透传形态
    return this.svc.create(body, user?.sub ?? 0, storeId)
  }

  @RequirePerm('artist:delete')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.softDelete(id, user?.sub ?? 0)
    return { deleted: true }
  }

  /** 档案审核流转(需求全集 §3;A1 列表筛选 + A2 表单依据) */
  @RequirePerm('artist:edit')
  @Post(':id/audit')
  async audit(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ArtistAuditDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.auditArtist(id, body.auditStatus, user?.sub ?? 0)
    return { auditStatus: body.auditStatus }
  }

  @RequirePerm('artist:batch')
  @Put('batch')
  async batchUpdate(
    @Req() req: Request,
    @Body() body: ArtistBatchUpdateDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.batchUpdate(body, user?.sub ?? 0)
  }
}

@Module({
  controllers: [ArtistController],
  providers: [ArtistService, PrismaService],
})
export class ArtistModule {}
