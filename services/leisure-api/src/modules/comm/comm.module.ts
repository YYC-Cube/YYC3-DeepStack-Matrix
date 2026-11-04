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
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
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
  @IsString()
  @Length(1, 2000)
  content!: string
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
        createdAt: m.createdAt.toISOString(),
      })),
    }
  }

  async sendMessage(
    chatGroupId: number,
    storeId: number,
    body: ChatMessageDto,
    sender: { scope: string; id: number; name: string },
  ) {
    await this.assertCanJoin(chatGroupId, storeId, sender)
    const created = await this.prisma.chatMessage.create({
      data: {
        storeId,
        chatGroupId,
        senderScope: sender.scope,
        senderId: sender.id,
        senderName: sender.name,
        content: body.content,
      },
    })
    return {
      id: created.id,
      senderScope: created.senderScope,
      senderId: created.senderId,
      senderName: created.senderName,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
    }
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
  controllers: [FeedbackController, ChatController],
  providers: [CommService, PrismaService],
})
export class CommModule {}
