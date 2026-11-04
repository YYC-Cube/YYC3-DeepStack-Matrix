/**
 * 组别/等级模块:CRUD(04-API §2 /artist-groups /artist-levels)
 * 红线:有销售经理挂靠禁删(引导先转移销售经理);名称店内唯一;软删
 * 依据:05 文档 A3 销售经理等级 / A4 销售经理组别 页面接口
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
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

/* ── DTO ── */

class GroupDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsOptional()
  @IsString()
  @MaxLength(64)
  supervisorName?: string
  /** 条线(资源经理板块新建传 RESOURCE;缺省=销售线视图,存量 NULL 视同 SELL) */
  @IsOptional()
  @IsIn(['RESOURCE', 'SELL'])
  line?: string
}

class LevelDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsOptional()
  @IsIn(['RESOURCE', 'SELL'])
  line?: string
}

/* ── Service ── */

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 组别(条线隔离:line=RESOURCE 取资源线;缺省=销售线视图,存量 NULL 视同 SELL) ── */

  private lineWhere(line?: string): Record<string, unknown> {
    return line === 'RESOURCE' ? { line: 'RESOURCE' } : { OR: [{ line: null }, { line: 'SELL' }] }
  }

  async listGroups(storeId: number, line?: string): Promise<unknown> {
    const rows = await this.prisma.artistGroup.findMany({
      where: { storeId, deletedAt: null, ...(this.lineWhere(line) as object) },
      orderBy: { id: 'asc' },
    })
    // 挂靠人数(A4 列:组名/主管/人数;按条线口径计数)
    const counts = await this.prisma.artist.groupBy({
      by: ['groupId'],
      where: { storeId, deletedAt: null, ...(this.lineWhere(line) as object) },
      _count: { _all: true },
    })
    const countMap = new Map(counts.map((c) => [c.groupId, c._count._all]))
    return rows.map((r) => ({ ...r, artistCount: countMap.get(r.id) ?? 0 }))
  }

  async createGroup(storeId: number, body: GroupDto, operatorId: number): Promise<{ id: number }> {
    await this.assertGroupNameFree(storeId, body.name, undefined, body.line)
    const created = await this.prisma.artistGroup.create({
      data: { storeId, name: body.name, supervisorName: body.supervisorName, line: body.line === 'RESOURCE' ? 'RESOURCE' : null },
    })
    await this.audit(storeId, operatorId, 'GROUP_CREATE', 'artist_group', String(created.id), null, created)
    return { id: created.id }
  }

  async updateGroup(id: number, storeId: number, body: GroupDto, operatorId: number): Promise<void> {
    const before = await this.prisma.artistGroup.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('组别不存在')
    await this.assertGroupNameFree(storeId, body.name, id)
    const after = await this.prisma.artistGroup.update({
      where: { id },
      data: { name: body.name, supervisorName: body.supervisorName ?? before.supervisorName },
    })
    await this.audit(storeId, operatorId, 'GROUP_UPDATE', 'artist_group', String(id), before, after)
  }

  async deleteGroup(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.artistGroup.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('组别不存在')
    const bound = await this.prisma.artist.count({ where: { groupId: id, deletedAt: null } })
    if (bound > 0) {
      throw new BadRequestException('该组别下仍有销售经理,请先转移销售经理后再删除')
    }
    await this.prisma.artistGroup.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'GROUP_DELETE', 'artist_group', String(id), before, null)
  }

  /* ── 等级(条线隔离口径同组别) ── */

  async listLevels(storeId: number, line?: string): Promise<unknown> {
    const rows = await this.prisma.artistLevel.findMany({
      where: { storeId, deletedAt: null, ...(this.lineWhere(line) as object) },
      orderBy: { id: 'asc' },
    })
    const counts = await this.prisma.artist.groupBy({
      by: ['levelId'],
      where: { storeId, deletedAt: null, ...(this.lineWhere(line) as object) },
      _count: { _all: true },
    })
    const countMap = new Map(counts.map((c) => [c.levelId, c._count._all]))
    return rows.map((r) => ({ ...r, artistCount: countMap.get(r.id) ?? 0 }))
  }

  async createLevel(storeId: number, body: LevelDto, operatorId: number): Promise<{ id: number }> {
    await this.assertLevelNameFree(storeId, body.name, undefined, body.line)
    const created = await this.prisma.artistLevel.create({
      data: { storeId, name: body.name, line: body.line === 'RESOURCE' ? 'RESOURCE' : null },
    })
    await this.audit(storeId, operatorId, 'LEVEL_CREATE', 'artist_level', String(created.id), null, created)
    return { id: created.id }
  }

  async updateLevel(id: number, storeId: number, body: LevelDto, operatorId: number): Promise<void> {
    const before = await this.prisma.artistLevel.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('等级不存在')
    await this.assertLevelNameFree(storeId, body.name, id)
    const after = await this.prisma.artistLevel.update({ where: { id }, data: { name: body.name } })
    await this.audit(storeId, operatorId, 'LEVEL_UPDATE', 'artist_level', String(id), before, after)
  }

  async deleteLevel(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.artistLevel.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('等级不存在')
    const bound = await this.prisma.artist.count({ where: { levelId: id, deletedAt: null } })
    if (bound > 0) {
      throw new BadRequestException('该等级下仍有销售经理,请先调整销售经理等级后再删除')
    }
    await this.prisma.artistLevel.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'LEVEL_DELETE', 'artist_level', String(id), before, null)
  }

  /* ── 私有 ── */

  private async assertGroupNameFree(storeId: number, name: string, excludeId?: number, line?: string): Promise<void> {
    const dup = await this.prisma.artistGroup.findFirst({
      where: { storeId, name, deletedAt: null, ...(this.lineWhere(line) as object), ...(excludeId !== undefined ? { id: { not: excludeId } } : {}) },
    })
    if (dup !== null) throw new BadRequestException('组别名称已存在(同条线)')
  }

  private async assertLevelNameFree(storeId: number, name: string, excludeId?: number, line?: string): Promise<void> {
    const dup = await this.prisma.artistLevel.findFirst({
      where: { storeId, name, deletedAt: null, ...(this.lineWhere(line) as object), ...(excludeId !== undefined ? { id: { not: excludeId } } : {}) },
    })
    if (dup !== null) throw new BadRequestException('等级名称已存在(同条线)')
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

@Controller('artist-groups')
export class ArtistGroupController {
  constructor(private readonly svc: TaxonomyService) {}

  @Get()
  async list(@Req() req: Request, @Query('line') line?: string): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listGroups(user?.storeId ?? 1, line)
  }

  @RequirePerm('group:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: GroupDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createGroup(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('group:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GroupDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateGroup(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('group:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteGroup(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Controller('artist-levels')
export class ArtistLevelController {
  constructor(private readonly svc: TaxonomyService) {}

  @Get()
  async list(@Req() req: Request, @Query('line') line?: string): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listLevels(user?.storeId ?? 1, line)
  }

  @RequirePerm('level:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: LevelDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createLevel(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('level:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: LevelDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateLevel(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('level:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteLevel(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Module({
  controllers: [ArtistGroupController, ArtistLevelController],
  providers: [TaxonomyService, PrismaService],
})
export class TaxonomyModule {}
