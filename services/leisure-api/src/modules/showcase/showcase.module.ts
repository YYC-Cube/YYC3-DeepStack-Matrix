/**
 * 展示控制台模块:把在场艺人「投放」到包厢/组别展示屏(实测 App「展示控制台」+ 需求全集 §9)
 * 模型:showcase_cast(storeId/roomId?/groupId?/artistId/castBy/createdAt/endedAt)
 * - 投放=新建记录(可多艺人批量);结束=写 endedAt(记录保留,便于回看投放时长)
 * - 同一艺人同一目标(房/组)已有进行中投放时去重,不重复落记录
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
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt, IsOptional } from 'class-validator'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

/* ── DTO ── */

class CastDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  artistIds!: number[]
  /** 目标包厢(与 groupId 二选一;都不传=门店大屏) */
  @IsOptional()
  @IsInt()
  roomId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
}

class EndAllDto {
  @IsOptional()
  @IsInt()
  roomId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
}

/* ── Service ── */

@Injectable()
export class ShowcaseService {
  constructor(private readonly prisma: PrismaService) {}

  async cast(
    storeId: number,
    body: CastDto,
    operatorId: number,
  ): Promise<{ ids: number[]; skipped: number[] }> {
    if (body.roomId !== undefined && body.groupId !== undefined) {
      throw new BadRequestException('roomId 与 groupId 二选一')
    }
    if (body.roomId !== undefined) {
      const room = await this.prisma.room.findFirst({ where: { id: body.roomId, storeId } })
      if (room === null) throw new NotFoundException('包厢不存在')
    }
    if (body.groupId !== undefined) {
      const group = await this.prisma.artistGroup.findFirst({ where: { id: body.groupId, storeId } })
      if (group === null) throw new NotFoundException('组别不存在')
    }
    const artistIds = Array.from(new Set(body.artistIds))
    const artists = await this.prisma.artist.findMany({
      where: { id: { in: artistIds }, storeId, deletedAt: null },
      select: { id: true },
    })
    if (artists.length !== artistIds.length) {
      throw new NotFoundException('部分艺人不存在或不属于本店')
    }
    // 去重:同艺人同目标进行中投放不重复落记录
    const active = await this.prisma.showcaseCast.findMany({
      where: {
        storeId,
        artistId: { in: artistIds },
        endedAt: null,
        roomId: body.roomId ?? null,
        groupId: body.groupId ?? null,
      },
      select: { artistId: true },
    })
    const activeSet = new Set(active.map((a) => a.artistId))
    const toCreate = artistIds.filter((id) => !activeSet.has(id))
    const skipped = artistIds.filter((id) => activeSet.has(id))
    const ids: number[] = []
    for (const artistId of toCreate) {
      const row = await this.prisma.showcaseCast.create({
        data: {
          storeId,
          roomId: body.roomId ?? null,
          groupId: body.groupId ?? null,
          artistId,
          castBy: operatorId,
        },
      })
      ids.push(row.id)
    }
    if (ids.length > 0) {
      await this.audit(storeId, operatorId, 'SHOWCASE_CAST', 'showcase_cast', ids.join(','), null, {
        artistIds: toCreate,
        roomId: body.roomId ?? null,
        groupId: body.groupId ?? null,
      })
    }
    return { ids, skipped }
  }

  /** 投放列表(默认仅进行中;active=false 查全部,倒序最多 200) */
  async list(
    storeId: number,
    q: { active: boolean; roomId?: number; groupId?: number },
  ): Promise<{ rows: unknown[] }> {
    const rows = await this.prisma.showcaseCast.findMany({
      where: {
        storeId,
        ...(q.active ? { endedAt: null } : {}),
        ...(q.roomId !== undefined ? { roomId: q.roomId } : {}),
        ...(q.groupId !== undefined ? { groupId: q.groupId } : {}),
      },
      orderBy: { id: 'desc' },
      take: 200,
      include: {
        artist: { select: { stageName: true, badgeNo: true, realName: true, levelId: true, groupId: true } },
      },
    })
    const roomIds = Array.from(new Set(rows.map((r) => r.roomId).filter((x): x is number => x !== null)))
    const rooms = roomIds.length > 0
      ? await this.prisma.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, roomNo: true, roomName: true } })
      : []
    const roomMap = new Map(rooms.map((r) => [r.id, r]))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        artistId: r.artistId,
        stageName: r.artist.stageName,
        badgeNo: r.artist.badgeNo,
        realName: r.artist.realName,
        roomId: r.roomId,
        roomNo: r.roomId !== null ? roomMap.get(r.roomId)?.roomNo ?? null : null,
        groupId: r.groupId,
        castBy: r.castBy,
        createdAt: r.createdAt.toISOString(),
        endedAt: r.endedAt !== null ? r.endedAt.toISOString() : null,
      })),
    }
  }

  async end(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.showcaseCast.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('投放记录不存在')
    if (before.endedAt !== null) return
    const after = await this.prisma.showcaseCast.update({ where: { id }, data: { endedAt: new Date() } })
    await this.audit(storeId, operatorId, 'SHOWCASE_END', 'showcase_cast', String(id), before, after)
  }

  async endAll(storeId: number, body: EndAllDto, operatorId: number): Promise<{ ended: number }> {
    const res = await this.prisma.showcaseCast.updateMany({
      where: {
        storeId,
        endedAt: null,
        ...(body.roomId !== undefined ? { roomId: body.roomId } : {}),
        ...(body.groupId !== undefined ? { groupId: body.groupId } : {}),
      },
      data: { endedAt: new Date() },
    })
    if (res.count > 0) {
      await this.audit(storeId, operatorId, 'SHOWCASE_END_ALL', 'showcase_cast', '*', null, {
        ended: res.count,
        roomId: body.roomId ?? null,
        groupId: body.groupId ?? null,
      })
    }
    return { ended: res.count }
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

@Controller('showcase')
export class ShowcaseController {
  constructor(private readonly svc: ShowcaseService) {}

  @RequirePerm('showcase:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('active') active?: string,
    @Query('roomId') roomId?: string,
    @Query('groupId') groupId?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list(user?.storeId ?? 1, {
      active: active === undefined || active === '' ? true : active !== 'false',
      roomId: roomId !== undefined && roomId !== '' ? Number(roomId) : undefined,
      groupId: groupId !== undefined && groupId !== '' ? Number(groupId) : undefined,
    })
  }

  @RequirePerm('showcase:cast')
  @Post('cast')
  async cast(@Req() req: Request, @Body() body: CastDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.cast(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('showcase:cast')
  @Post(':id/end')
  async end(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.end(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { ended: true }
  }

  @RequirePerm('showcase:cast')
  @Post('end-all')
  async endAll(@Req() req: Request, @Body() body: EndAllDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.endAll(user?.storeId ?? 1, body, user?.sub ?? 0)
  }
}

@Module({
  controllers: [ShowcaseController],
  providers: [ShowcaseService, PrismaService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}
