/**
 * 沟通与回馈模块(comm;Owner 指令 2026-11-04):
 * - Feedback 功能定制回馈:无关模块收进定制申请→Owner 收 notice 回馈→回复拟定;产品需求收集通道
 * - Chat 群聊最小闭环:全员店群+组别动态群(成员=组内在场销售经理动态计算,免维护成员表);REST 轮询(WS 预留)
 * 守卫:管理端 setting:manage(群管理/回馈管理);artist 端 scope 强制本人/本组
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
} from '@nestjs/common'
import { IsIn, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator'
import type { Request } from 'express'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { env } from '../../config/env.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

const CHAT_GROUP_NAME_RE = /^.{1,64}$/

/* ── DTO ── */

class FeedbackDto {
  @IsString()
  @Length(1, 32)
  module!: string
  @IsString()
  @Length(1, 128)
  title!: string
  @IsString()
  @Length(1, 2000)
  detail!: string
  /** 截图 dataURL 数组(可选;每张须 data:image/* 且 ≤300KB) */
  @IsOptional()
  photoKeys?: unknown
}

class ChatGroupDto {
  @IsString()
  @Matches(CHAT_GROUP_NAME_RE)
  name!: string
  /** 绑定组别=动态成员群(组内销售经理);空=店群(全员) */
  @IsOptional()
  @IsInt()
  groupId?: number
}

class ChatMessageDto {
  /** 文本或图片说明(纯图消息可空串;service 校验「文本/图片至少其一」) */
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  content?: string
  @IsOptional()
  images?: unknown
}

/* ── Service ── */

@Injectable()
export class CommService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Feedback ── */

  async createFeedback(
    storeId: number,
    body: FeedbackDto,
    operator: { id: number; scope: string; name: string },
  ): Promise<{ id: number }> {
    const photos = Array.isArray(body.photoKeys) ? body.photoKeys : []
    for (const p of photos) {
      if (typeof p !== 'string' || !p.startsWith('data:image/') || p.length > 400_000) {
        throw new BadRequestException('截图须为 data:image/* dataURL 且单张 ≤300KB')
      }
    }
    if (photos.length > 4) throw new BadRequestException('截图最多 4 张')
    const created = await this.prisma.feedback.create({
      data: {
        storeId,
        module: body.module,
        title: body.title,
        detail: body.detail,
        photoKeys: photos.length > 0 ? (photos as object) : undefined,
        applicantId: operator.id,
      },
    })
    // 回馈通知:发管理职级通告(Owner 即时收到;title 带申请人)
    await this.prisma.notice.create({
      data: {
        storeId,
        title: '功能定制回馈:' + body.title.slice(0, 40),
        body:
          '模块「' + body.module + '」定制申请来自 ' +
          (operator.scope === 'ARTIST' ? '销售端' : '管理端') + ' ' + operator.name +
          ';详情:' + body.detail.slice(0, 300),
        publishedBy: operator.id,
        visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
        remind: true,
      },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operator.id,
        action: 'FEEDBACK_CREATE',
        targetType: 'feedback',
        targetId: String(created.id),
        afterJson: { module: body.module, title: body.title } as object,
      },
    })
    return { id: created.id }
  }

  async listFeedback(storeId: number, status?: string) {
    const rows = await this.prisma.feedback.findMany({
      where: { storeId, ...(status !== undefined && status !== '' ? { status } : {}) },
      orderBy: { id: 'desc' },
      take: 100,
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        module: r.module,
        title: r.title,
        detail: r.detail,
        photos: Array.isArray(r.photoKeys) ? (r.photoKeys as string[]) : [],
        status: r.status,
        reply: r.reply,
        applicantId: r.applicantId,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
      })),
    }
  }

  async decideFeedback(
    id: number,
    storeId: number,
    status: 'PLANNED' | 'DONE' | 'REJECTED',
    reply: string,
    operatorId: number,
  ): Promise<void> {
    const before = await this.prisma.feedback.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('回馈单不存在')
    await this.prisma.feedback.update({
      where: { id },
      data: { status, reply: reply === '' ? null : reply, decidedAt: new Date() },
    })
    // 回复通知:回给申请人(管理端通告若申请人是管理;artist 端后续接推送,当前以 audit+列表状态为准)
    await this.prisma.notice.create({
      data: {
        storeId,
        title: '功能定制回复:' + before.title.slice(0, 40) + '(' + status + ')',
        body: '回复:' + (reply === '' ? '已受理(' + status + ')' : reply),
        publishedBy: operatorId,
        visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
        remind: true,
      },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action: 'FEEDBACK_DECIDE',
        targetType: 'feedback',
        targetId: String(id),
        beforeJson: { status: before.status } as object,
        afterJson: { status, reply } as object,
      },
    })
  }

  /* ── Chat ── */

  /** viewer 的组别归属(ARTIST 从档案查;JWT 不带 groupId,免 token 结构变更) */
  private async viewerGroupId(storeId: number, viewer: { scope: string; id: number }): Promise<number | null> {
    if (viewer.scope !== 'ARTIST') return null
    const a = await this.prisma.artist.findUnique({ where: { id: viewer.id }, select: { groupId: true } })
    return a?.groupId ?? null
  }

  /** 群列表(含可见性过滤:artist 只见店群+本人组别的动态群) */
  async listGroups(storeId: number, viewer: { scope: string; id: number }) {
    const groups = await this.prisma.chatGroup.findMany({
      where: { storeId },
      orderBy: { id: 'asc' },
    })
    const myGroupId = await this.viewerGroupId(storeId, viewer)
    const visible = groups.filter((g) => {
      if (viewer.scope !== 'ARTIST') return true
      if (g.groupId === null) return true // 店群全员可见
      return myGroupId === g.groupId // 组别群=本组成员
    })
    const last = await this.prisma.chatMessage.groupBy({
      by: ['chatGroupId'],
      where: { storeId, chatGroupId: { in: visible.map((g) => g.id) } },
      _max: { id: true },
      _count: { _all: true },
    })
    const lastMap = new Map(last.map((l) => [l.chatGroupId, l]))
    const lastIds = last.map((l) => l._max.id).filter((x): x is number => x !== null)
    const lastMsgs = await this.prisma.chatMessage.findMany({ where: { id: { in: lastIds } } })
    const msgMap = new Map(lastMsgs.map((m) => [m.id, m]))
    return {
      rows: visible.map((g) => {
        const l = lastMap.get(g.id)
        const lm = l?._max.id !== null && l?._max.id !== undefined ? msgMap.get(l._max.id) : undefined
        return {
          id: g.id,
          name: g.name,
          groupId: g.groupId,
          kind: g.groupId === null ? 'STORE' : 'GROUP',
          msgCount: l?._count._all ?? 0,
          lastAt: lm?.createdAt.toISOString() ?? null,
          lastPreview: lm !== undefined ? lm.senderName + ':' + lm.content.slice(0, 30) : '',
        }
      }),
    }
  }

  async createGroup(storeId: number, body: ChatGroupDto, operator: { id: number; scope: string }): Promise<{ id: number }> {
    let groupId: number | null = null
    if (body.groupId !== undefined) {
      const g = await this.prisma.artistGroup.findFirst({ where: { id: body.groupId, storeId, deletedAt: null } })
      if (g === null) throw new BadRequestException('组别不存在')
      groupId = g.id
    }
    const created = await this.prisma.chatGroup.create({
      data: { storeId, name: body.name, groupId, createdById: operator.id },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operator.id,
        action: 'CHAT_GROUP_CREATE',
        targetType: 'chat_group',
        targetId: String(created.id),
        beforeJson: null as unknown as object,
        afterJson: { name: body.name, groupId } as object,
      },
    })
    return { id: created.id }
  }

  /** 成员可见性校验(artist 只能在店群/本人组别群发言) */
  private async assertCanJoin(chatGroupId: number, storeId: number, viewer: { scope: string; id: number }): Promise<void> {
    const g = await this.prisma.chatGroup.findFirst({ where: { id: chatGroupId, storeId } })
    if (g === null) throw new NotFoundException('群不存在')
    if (viewer.scope === 'ARTIST' && g.groupId !== null) {
      const myGroupId = await this.viewerGroupId(storeId, viewer)
      if (myGroupId !== g.groupId) throw new BadRequestException('仅本组别成员可进群')
    }
  }

  async listMessages(
    chatGroupId: number,
    storeId: number,
    viewer: { scope: string; id: number },
    afterId?: number,
    beforeId?: number,
  ) {
    await this.assertCanJoin(chatGroupId, storeId, viewer)
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        storeId,
        chatGroupId,
        ...(afterId !== undefined ? { id: { gt: afterId } } : {}),
        ...(beforeId !== undefined ? { id: { lt: beforeId } } : {}),
      },
      orderBy: { id: afterId !== undefined ? 'asc' : 'desc' },
      take: afterId !== undefined ? 200 : 50,
    })
    const ordered = afterId !== undefined ? rows : rows.reverse()
    return {
      rows: ordered.map((m) => ({
        id: m.id,
        senderScope: m.senderScope,
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
        type: m.type,
        images: Array.isArray(m.images) ? (m.images as string[]) : [],
        createdAt: m.createdAt.toISOString(),
      })),
    }
  }

  private chatServer: { to: (room: string) => { emit: (ev: string, data: unknown) => void } } | null = null

  /** WS 桥启动后注入(原生 ws 独立挂载;群消息实时广播) */
  setChatServer(server: { to: (room: string) => { emit: (ev: string, data: unknown) => void } }): void {
    this.chatServer = server
  }

  async sendMessage(
    chatGroupId: number,
    storeId: number,
    body: ChatMessageDto,
    sender: { scope: string; id: number; name: string },
  ) {
    await this.assertCanJoin(chatGroupId, storeId, sender)
    const images = Array.isArray(body.images) ? body.images : []
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/') || img.length > 400_000) {
        throw new BadRequestException('图片须为 data:image/* 且单张 ≤300KB')
      }
    }
    if (images.length > 4) throw new BadRequestException('单条消息图片最多 4 张')
    const content = body.content ?? ''
    if (content.trim() === '' && images.length === 0) throw new BadRequestException('消息内容不能为空')
    const created = await this.prisma.chatMessage.create({
      data: {
        storeId,
        chatGroupId,
        senderScope: sender.scope,
        senderId: sender.id,
        senderName: sender.name,
        content: body.content ?? '',
        type: images.length > 0 ? 'IMAGE' : 'TEXT',
        images: images.length > 0 ? (images as object) : undefined,
      },
    })
    const msg = {
      id: created.id,
      senderScope: created.senderScope,
      senderId: created.senderId,
      senderName: created.senderName,
      content: created.content,
      type: created.type,
      images: Array.isArray(created.images) ? (created.images as string[]) : [],
      createdAt: created.createdAt.toISOString(),
    }
    // WS 实时广播(房间=chat:<groupId>;前端轮询为 fallback 仍在)
    this.chatServer?.to('chat:' + String(chatGroupId)).emit('chat:message', msg)
    return msg
  }


  /* ── Task 任务中心(对标竞品图 9「设置订房任务」;完成度实时聚合) ── */

  async listTasks(storeId: number, viewer: { scope: string; id: number }) {
    const rows = await this.prisma.task.findMany({
      where: {
        storeId,
        status: 'ACTIVE',
        ...(viewer.scope === 'ARTIST' ? { targetArtistId: viewer.id } : {}),
      },
      orderBy: { id: 'desc' },
      take: 100,
    })
    // 完成度实时聚合:BOOKING=期内作为在场销售经理的房账数;ORDER=期内本人点单数
    const out = []
    for (const t of rows) {
      let progress = 0
      if (t.type === 'BOOKING') {
        progress = await this.prisma.roomSessionArtist.count({
          where: { artistId: t.targetArtistId, joinedAt: { gte: t.startAt, lte: t.endAt } },
        })
      } else if (t.type === 'ORDER') {
        progress = await this.prisma.selfOrder.count({
          where: { storeId, artistId: t.targetArtistId, placedAt: { gte: t.startAt, lte: t.endAt }, status: { not: 'CANCELLED' } },
        })
      }
      const artist = await this.prisma.artist.findUnique({ where: { id: t.targetArtistId }, select: { stageName: true, realName: true } })
      // 达标事件通知(下发人 notice;notifyAt 去重——与日切告警同链)
      if (progress >= t.targetCount && t.notifyAt === null && t.createdById > 0) {
        const creator = await this.prisma.adminUser.findUnique({ where: { id: t.createdById }, select: { title: true } })
        if (creator !== null) {
          await this.prisma.notice.create({
            data: {
              storeId,
              title: '任务达标:' + t.title.slice(0, 40),
              body: '对象「' + (artist?.stageName ?? artist?.realName ?? String(t.targetArtistId)) + '」已完成 ' + String(progress) + '/' + String(t.targetCount) + '(' + (t.type === 'BOOKING' ? '订房' : '点餐') + '任务)。',
              publishedBy: t.createdById,
              visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
              remind: true,
            },
          })
        }
        await this.prisma.task.update({ where: { id: t.id }, data: { notifyAt: new Date() } })
        t.notifyAt = new Date()
      }
      // 周期模板惰性重建(到期且 recurrence!=NONE:旧任务转 EXPIRED,顺延创建下一周期)
      if (t.endAt < new Date() && t.recurrence !== 'NONE' && t.status === 'ACTIVE') {
        const span = t.endAt.getTime() - t.startAt.getTime()
        const nextStart = t.recurrence === 'DAILY' ? new Date(t.startAt.getTime() + 86_400_000) : new Date(t.startAt.getTime() + 7 * 86_400_000)
        const nextEnd = new Date(nextStart.getTime() + span)
        await this.prisma.task.update({ where: { id: t.id }, data: { status: 'EXPIRED' } })
        const cloned = await this.prisma.task.create({
          data: {
            storeId,
            type: t.type,
            title: t.title,
            targetArtistId: t.targetArtistId,
            targetCount: t.targetCount,
            startAt: nextStart,
            endAt: nextEnd,
            recurrence: t.recurrence,
            createdById: t.createdById,
          },
        })
        await this.prisma.auditLog.create({
          data: { storeId, actorId: 0, action: 'TASK_RECURRING_CLONE', targetType: 'task', targetId: String(cloned.id), beforeJson: { from: t.id } as object, afterJson: { nextStart, nextEnd } as object },
        })
        continue // 重建后的下周期任务从 0 开始,不在本轮列表(下轮可见)
      }
      out.push({
        id: t.id,
        type: t.type,
        title: t.title,
        targetArtistId: t.targetArtistId,
        targetName: artist?.stageName ?? artist?.realName ?? String(t.targetArtistId),
        targetCount: t.targetCount,
        progress: Math.min(progress, t.targetCount * 3),
        rawProgress: progress,
        recurrence: t.recurrence,
        startAt: t.startAt.toISOString(),
        endAt: t.endAt.toISOString(),
      })
    }
    return { rows: out }
  }

  async createTask(storeId: number, body: { type: string; title: string; targetArtistId: number; targetCount: number; startAt: string; endAt: string; recurrence?: string }, operatorId: number): Promise<{ id: number }> {
    if (!['BOOKING', 'ORDER'].includes(body.type)) throw new BadRequestException('任务类型无效')
    if (body.targetCount <= 0) throw new BadRequestException('目标数量须为正数')
    const artist = await this.prisma.artist.findFirst({ where: { id: body.targetArtistId, storeId, deletedAt: null } })
    if (artist === null) throw new BadRequestException('目标销售经理不存在')
    const created = await this.prisma.task.create({
      data: {
        storeId,
        type: body.type,
        title: body.title,
        targetArtistId: body.targetArtistId,
        targetCount: body.targetCount,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        recurrence: body.recurrence ?? 'NONE',
        createdById: operatorId,
      },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action: 'TASK_CREATE',
        targetType: 'task',
        targetId: String(created.id),
        beforeJson: null as unknown as object,
        afterJson: { type: body.type, title: body.title, targetArtistId: body.targetArtistId, targetCount: body.targetCount } as object,
      },
    })
    return { id: created.id }
  }

  async cancelTask(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.task.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('任务不存在')
    await this.prisma.task.update({ where: { id }, data: { status: 'CANCELLED' } })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operatorId, action: 'TASK_CANCEL', targetType: 'task', targetId: String(id), beforeJson: { status: before.status } as object, afterJson: { status: 'CANCELLED' } as object },
    })
  }
}

/* ── Task DTO ── */

class TaskDto {
  @IsIn(['BOOKING', 'ORDER'])
  type!: string
  @IsString()
  @Length(1, 64)
  title!: string
  @IsInt()
  targetArtistId!: number
  @IsInt()
  targetCount!: number
  @IsString()
  startAt!: string
  @IsString()
  endAt!: string
  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'WEEKLY'])
  recurrence?: string
}

/* ── Task Controller ── */

@Controller('tasks')
export class TaskController {
  constructor(private readonly svc: CommService) {}

  @Get()
  async list(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.listTasks(u.storeId, u)
  }

  /** 下发任务(管理端) */
  @RequirePerm('setting:manage')
  @Post()
  async create(@Req() req: Request, @Body() body: TaskDto): Promise<unknown> {
    const u = op(req)
    return this.svc.createTask(u.storeId, body, u.id)
  }

  @RequirePerm('setting:manage')
  @Post(':id/cancel')
  async cancel(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const u = op(req)
    await this.svc.cancelTask(id, u.storeId, u.id)
    return { cancelled: true }
  }
}

/* ── Controllers ── */

function op(req: Request): { scope: string; id: number; name: string; storeId: number } {
  const user = (req as ReqWithUser).user
  return { scope: user?.scope ?? 'ADMIN', id: user?.sub ?? 0, name: user?.name ?? String(user?.sub ?? 0), storeId: user?.storeId ?? 1 }
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly svc: CommService) {}

  /** 提交功能定制回馈(管理端+销售端均可) */
  @Post()
  async create(@Req() req: Request, @Body() body: FeedbackDto): Promise<unknown> {
    return this.svc.createFeedback(op(req).storeId, body, op(req))
  }

  /** 我的回馈(申请人维度) */
  @Get('my')
  async my(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    const all = await this.svc.listFeedback(u.storeId, '')
    return { rows: all.rows.filter((r) => r.applicantId === u.id) }
  }

  /** 回馈管理清单(Owner) */
  @RequirePerm('setting:manage')
  @Get()
  async list(@Req() req: Request, @Query('status') status?: string): Promise<unknown> {
    const u = op(req)
    return this.svc.listFeedback(u.storeId, status ?? '')
  }

  /** 回复拟定(Owner) */
  @RequirePerm('setting:manage')
  @Post(':id/decide')
  async decide(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'PLANNED' | 'DONE' | 'REJECTED'; reply?: string },
  ): Promise<unknown> {
    const u = op(req)
    await this.svc.decideFeedback(id, u.storeId, body.status, body.reply ?? '', u.id)
    return { decided: true }
  }
}

@Controller('chat')
export class ChatController {
  constructor(private readonly svc: CommService) {}

  @Get('groups')
  async groups(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.listGroups(u.storeId, u)
  }

  /** 建群(管理端;组别群=动态成员) */
  @RequirePerm('setting:manage')
  @Post('groups')
  async createGroup(@Req() req: Request, @Body() body: ChatGroupDto): Promise<unknown> {
    const u = op(req)
    return this.svc.createGroup(u.storeId, body, u)
  }

  @Get('groups/:id/messages')
  async messages(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ): Promise<unknown> {
    const u = op(req)
    return this.svc.listMessages(id, u.storeId, u, after !== undefined && after !== '' ? Number(after) : undefined, before !== undefined && before !== '' ? Number(before) : undefined)
  }

  @Post('groups/:id/messages')
  async send(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ChatMessageDto,
  ): Promise<unknown> {
    const u = op(req)
    return this.svc.sendMessage(id, u.storeId, body, u)
  }
}


@Module({
  controllers: [FeedbackController, ChatController, TaskController],
  providers: [CommService, PrismaService],
  })
export class CommModule {}
