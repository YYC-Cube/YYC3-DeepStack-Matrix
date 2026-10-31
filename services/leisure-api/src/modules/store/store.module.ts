/**
 * 门店主数据模块:包厢类型 + 包厢房号(需求全集 §5)
 * 房号店内唯一(40907);维修/停用不可上钟(选择框过滤在阶段2 session 模块执行);
 * 占用/空闲随上下钟自动流转(阶段2),本模块禁止手工置 OCCUPIED
 * 计算与校验一律走 @yyc3/leisure-core(本模块只做 IO/事务/审计)
 */
import {
  BadRequestException,
  Body,
  ConflictException,
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
import { IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator'
import type { Request } from 'express'
import { ERR, LeisureError } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

/* ── 常量:房态(与 leisure-core ROOM_STATUSES 同源语义) ── */

const ROOM_EDITABLE_STATUSES = ['FREE', 'MAINTENANCE', 'DISABLED'] as const
// OCCUPIED 仅由上下钟生命周期驱动,不接受手工写入(§5.3 自动流转)

/** 房型入参 DTO(whitelist 全局管道:未知字段 400) */
class RoomTypeDto {
  @IsString()
  @Length(1, 32)
  name!: string
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number
}

/** 房号入参 DTO */
class RoomDto {
  @IsString()
  @Length(1, 32)
  roomNo!: string
  @IsOptional()
  @IsString()
  @MaxLength(64)
  roomName?: string
  @IsInt()
  roomTypeId!: number
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number
  @IsOptional()
  @IsIn(ROOM_EDITABLE_STATUSES)
  status?: (typeof ROOM_EDITABLE_STATUSES)[number]
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string
}

/** 房号状态更新 DTO(启用/停用/维修流转) */
class RoomStatusDto {
  @IsIn(ROOM_EDITABLE_STATUSES)
  status!: (typeof ROOM_EDITABLE_STATUSES)[number]
}

/* ── Service ── */

@Injectable()
export class StoreAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 房型 ── */

  async listRoomTypes(storeId: number): Promise<unknown> {
    return this.prisma.roomType.findMany({
      where: { storeId, status: 1 },
      orderBy: { sort: 'asc' },
    })
  }

  async createRoomType(storeId: number, body: RoomTypeDto, operatorId: number): Promise<{ id: number }> {
    const dup = await this.prisma.roomType.findFirst({
      where: { storeId, name: body.name, status: 1 },
    })
    if (dup !== null) {
      throw new ConflictException('包厢类型已存在')
    }
    const created = await this.prisma.roomType.create({
      data: { storeId, name: body.name, sort: body.sort ?? 0 },
    })
    await this.audit(storeId, operatorId, 'ROOM_TYPE_CREATE', 'room_type', String(created.id), null, created)
    return { id: created.id }
  }

  async updateRoomType(id: number, storeId: number, body: RoomTypeDto, operatorId: number): Promise<void> {
    const before = await this.prisma.roomType.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('包厢类型不存在')
    const dup = await this.prisma.roomType.findFirst({
      where: { storeId, name: body.name, status: 1, id: { not: id } },
    })
    if (dup !== null) throw new ConflictException('包厢类型已存在')
    const after = await this.prisma.roomType.update({
      where: { id },
      data: { name: body.name, sort: body.sort ?? before.sort },
    })
    await this.audit(storeId, operatorId, 'ROOM_TYPE_UPDATE', 'room_type', String(id), before, after)
  }

  async deleteRoomType(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.roomType.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('包厢类型不存在')
    const roomCount = await this.prisma.room.count({ where: { roomTypeId: id } })
    if (roomCount > 0) {
      throw new ConflictException('该包厢类型下存在房号,请先处理房号档案')
    }
    await this.prisma.roomType.update({ where: { id }, data: { status: 0 } })
    await this.audit(storeId, operatorId, 'ROOM_TYPE_DELETE', 'room_type', String(id), before, null)
  }

  /* ── 房号 ── */

  async listRooms(
    q: {
      storeId: number
      roomTypeId?: number
      status?: string
      keyword?: string
      page?: number
      pageSize?: number
    },
  ): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    const where = {
      storeId: q.storeId,
      roomTypeId: q.roomTypeId,
      status: q.status,
      OR:
        q.keyword !== undefined && q.keyword !== ''
          ? [
              { roomNo: { contains: q.keyword } },
              { roomName: { contains: q.keyword } },
            ]
          : undefined,
    }
    const [rows, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        orderBy: [{ roomTypeId: 'asc' }, { roomNo: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { roomType: true },
      }),
      this.prisma.room.count({ where }),
    ])
    return { rows, total }
  }

  async createRoom(storeId: number, body: RoomDto, operatorId: number): Promise<{ id: number }> {
    // 房号店内唯一(40907;并发由 uk(store_id, room_no) 兜底)
    const dup = await this.prisma.room.findFirst({
      where: { storeId, roomNo: body.roomNo },
    })
    if (dup !== null) {
      throw new LeisureError(ERR.ROOM_NO_DUPLICATED, '房号已存在(店内唯一)')
    }
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: body.roomTypeId, storeId, status: 1 },
    })
    if (roomType === null) {
      throw new NotFoundException('包厢类型不存在或已停用')
    }
    const created = await this.prisma.room.create({
      data: {
        storeId,
        roomNo: body.roomNo,
        roomName: body.roomName,
        roomTypeId: body.roomTypeId,
        capacity: body.capacity,
        status: body.status ?? 'FREE',
        remark: body.remark,
      },
    })
    await this.audit(storeId, operatorId, 'ROOM_CREATE', 'room', String(created.id), null, created)
    return { id: created.id }
  }

  async updateRoom(id: number, storeId: number, body: RoomDto, operatorId: number): Promise<void> {
    const before = await this.prisma.room.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('包厢不存在')
    const dup = await this.prisma.room.findFirst({
      where: { storeId, roomNo: body.roomNo, id: { not: id } },
    })
    if (dup !== null) {
      throw new LeisureError(ERR.ROOM_NO_DUPLICATED, '房号已存在(店内唯一)')
    }
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: body.roomTypeId, storeId, status: 1 },
    })
    if (roomType === null) {
      throw new NotFoundException('包厢类型不存在或已停用')
    }
    const after = await this.prisma.room.update({
      where: { id },
      data: {
        roomNo: body.roomNo,
        roomName: body.roomName,
        roomTypeId: body.roomTypeId,
        capacity: body.capacity,
        status: body.status ?? before.status,
        remark: body.remark,
      },
    })
    await this.audit(storeId, operatorId, 'ROOM_UPDATE', 'room', String(id), before, after)
  }

  /** 房态流转(启用/维修/停用);占用态由上下钟驱动,禁止手工设置 */
  async updateRoomStatus(id: number, storeId: number, status: string, operatorId: number): Promise<void> {
    if (status === 'OCCUPIED') {
      throw new BadRequestException('占用状态由上钟/下钟自动流转,不可手工设置')
    }
    const before = await this.prisma.room.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('包厢不存在')
    const after = await this.prisma.room.update({ where: { id }, data: { status } })
    await this.audit(storeId, operatorId, 'ROOM_STATUS_UPDATE', 'room', String(id), before, after)
  }

  async deleteRoom(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.room.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('包厢不存在')
    const sessionCount = await this.prisma.showSession.count({ where: { roomId: id } })
    if (sessionCount > 0) {
      throw new ConflictException('该包厢存在上钟场次记录,请使用停用')
    }
    await this.prisma.room.delete({ where: { id } })
    await this.audit(storeId, operatorId, 'ROOM_DELETE', 'room', String(id), before, null)
  }

  /** 审计(追加写;与 artist 模块同构) */
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

/* ── Controller ── */

@Controller('store/room-types')
export class RoomTypeController {
  constructor(private readonly svc: StoreAdminService) {}

  @Get()
  async list(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listRoomTypes(user?.storeId ?? 1)
  }

  @RequirePerm('room:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: RoomTypeDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createRoomType(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('room:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoomTypeDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateRoomType(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('room:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteRoomType(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Controller('store/rooms')
export class RoomController {
  constructor(private readonly svc: StoreAdminService) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query('roomTypeId') roomTypeId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listRooms({
      storeId: user?.storeId ?? 1,
      roomTypeId: roomTypeId !== undefined ? Number(roomTypeId) : undefined,
      status,
      keyword,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }

  @RequirePerm('room:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: RoomDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createRoom(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('room:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoomDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateRoom(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('room:manage')
  @Put(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoomStatusDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateRoomStatus(id, user?.storeId ?? 1, body.status, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('room:manage')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteRoom(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Module({
  controllers: [RoomTypeController, RoomController],
  providers: [StoreAdminService, PrismaService],
})
export class StoreAdminModule {}
