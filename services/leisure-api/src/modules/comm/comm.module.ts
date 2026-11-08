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
  Put,
  Query,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common'
import { IsIn, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator'
import type { Request, Response } from 'express'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { env } from '../../config/env.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import type { ChatBroadcaster } from '../../ws/chat-ws.js'
import { toXlsx } from '../../common/utils/xlsx.js'

/** CSV(BOM+转义;与 report 模块 toCsv 同构) */
function toCsv(headers: string[], rows: Array<Array<string | number | null | boolean | Date>>): string {
  const esc = (v: string | number | null | boolean | Date): string => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))]
  return '\uFEFF' + lines.join('\r\n')
}

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

class ReactDto {
  /** 16 码元上限:unicode 全集面板(含 VS16 变体)兼容;ZWJ 大组合仍被拒 */
  @IsString()
  @Length(1, 16)
  emoji!: string
}

class TemplateDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsIn(['BOOKING', 'ORDER'])
  type!: string
  @IsString()
  @Length(1, 64)
  title!: string
  @IsInt()
  targetCount!: number
  @IsInt()
  days!: number
  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'WEEKLY'])
  recurrence?: string
  @IsOptional()
  @IsInt()
  sort?: number
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
    q?: string,
    senderName?: string,
  ) {
    await this.assertCanJoin(chatGroupId, storeId, viewer)
    // 搜索过滤(2026-11-07:关键词=内容/成员=发送者名;q 与 senderName 可组合)
    const kw = q?.trim() ?? ''
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        storeId,
        chatGroupId,
        ...(afterId !== undefined ? { id: { gt: afterId } } : {}),
        ...(beforeId !== undefined ? { id: { lt: beforeId } } : {}),
        ...(kw !== ''
          ? {
              OR: [
                { content: { contains: kw } },
                { senderName: { contains: kw } },
              ],
            }
          : {}),
        ...(senderName !== undefined && senderName !== '' ? { senderName } : {}),
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
        reactions: Array.isArray(m.reactions) ? (m.reactions as Array<{ emoji: string; by: Array<{ scope: string; id: number; name: string }> }>) : [],
        createdAt: m.createdAt.toISOString(),
      })),
    }
  }

  private chatServer: ChatBroadcaster | null = null

  /** WS 桥启动后注入(原生 ws 独立挂载;房间广播 to + 定向用户 toUsers) */
  setChatServer(server: ChatBroadcaster): void {
    this.chatServer = server
  }

  /** 任务事件定向推送(下发人+对象;H5 任务页 WS 实时化数据源) */
  private notifyTaskChange(targetArtistId: number, creatorAdminId: number, taskId: number, reason: string): void {
    const data = { taskId, reason }
    this.chatServer?.toUsers('ARTIST', [targetArtistId]).emit('task:changed', data)
    if (creatorAdminId > 0) this.chatServer?.toUsers('ADMIN', [creatorAdminId]).emit('task:changed', data)
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
    // WS 实时广播(房间=chat:<groupId>;前端轮询为 fallback 仍在)+全店 chat:ping(群列表未读角标实时,不要求 join)
    this.chatServer?.to('chat:' + String(chatGroupId)).emit('chat:message', msg)
    this.chatServer?.toStore(storeId).emit('chat:ping', { groupId: chatGroupId })

    // @提及定向通知(通告矩阵承接):@名字 匹配店内在册销售经理→定向 notice(提醒被 @ 者)
    const mentioned = (body.content ?? '').match(/@([\u4e00-\u9fa5a-zA-Z0-9_]+)/g) ?? []
    for (const raw of mentioned) {
      const nm = raw.slice(1)
      if (nm.length < 2) continue
      const hit = await this.prisma.artist.findFirst({
        where: { storeId, deletedAt: null, status: 1, OR: [{ stageName: nm }, { realName: nm }] },
        select: { id: true },
      })
      if (hit === null) continue
      await this.prisma.notice.create({
        data: {
          storeId,
          title: '群聊提及提醒:' + sender.name.slice(0, 24),
          body: '在群聊中被 @:' + (body.content ?? '').slice(0, 200),
          publishedBy: sender.id,
          visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
          remind: true,
        },
      })
      break // 单条消息至多一封提及通知
    }
    return msg
  }

  /** 消息撤回(2 分钟内本人;软删=内容置已撤回/图清空/类型 RETRACTED;WS 广播 retract) */
  async retractMessage(chatGroupId: number, messageId: number, storeId: number, sender: { scope: string; id: number }): Promise<void> {
    const m = await this.prisma.chatMessage.findFirst({ where: { id: messageId, storeId, chatGroupId } })
    if (m === null) throw new NotFoundException('消息不存在')
    if (m.senderScope !== sender.scope || m.senderId !== sender.id) throw new BadRequestException('仅本人可撤回')
    if (Date.now() - m.createdAt.getTime() > 2 * 60_000) throw new BadRequestException('超过 2 分钟,不可撤回')
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: '已撤回', type: 'RETRACTED' },
    })
    this.chatServer?.to('chat:' + String(chatGroupId)).emit('chat:retract', { id: messageId })
  }

  /** 表情回应 toggle(同 emoji 重复点=取消;WS 广播 chat:react;reactions=[{emoji,by:[{scope,id,name}]}]) */
  async reactMessage(chatGroupId: number, messageId: number, storeId: number, emoji: string, sender: { scope: string; id: number; name: string }): Promise<unknown> {
    const m = await this.prisma.chatMessage.findFirst({ where: { id: messageId, storeId, chatGroupId } })
    if (m === null) throw new NotFoundException('消息不存在')
    const list = Array.isArray(m.reactions) ? (m.reactions as Array<{ emoji: string; by: Array<{ scope: string; id: number; name: string }> }>) : []
    const hit = list.find((r) => r.emoji === emoji)
    if (hit === undefined) {
      if (list.length >= 8) throw new BadRequestException('回应种类已达上限(8)')
      list.push({ emoji, by: [{ scope: sender.scope, id: sender.id, name: sender.name }] })
    } else {
      const before = hit.by.length
      hit.by = hit.by.filter((b) => !(b.scope === sender.scope && b.id === sender.id))
      if (hit.by.length === before) hit.by.push({ scope: sender.scope, id: sender.id, name: sender.name })
      if (hit.by.length === 0) {
        const idx = list.findIndex((r) => r.emoji === emoji)
        list.splice(idx, 1)
      }
    }
    const reactions = list.length > 0 ? (list as object) : undefined
    await this.prisma.chatMessage.update({ where: { id: messageId }, data: { reactions } })
    const out = { id: messageId, reactions: list }
    this.chatServer?.to('chat:' + String(chatGroupId)).emit('chat:react', out)
    this.emojiStatsCache = null // 高频统计即时新鲜
    return out
  }

  /** 全店高频表情统计(近 7 天≤500 条消息 reactions 聚合 top12;60s 内存缓存防打库;react toggle 即时失效) */
  private emojiStatsCache: { at: number; rows: Array<{ emoji: string; count: number }> } | null = null
  async emojiStats(storeId: number): Promise<{ rows: Array<{ emoji: string; count: number }> }> {
    if (this.emojiStatsCache !== null && Date.now() - this.emojiStatsCache.at < 60_000) {
      return { rows: this.emojiStatsCache.rows }
    }
    const msgs = await this.prisma.chatMessage.findMany({
      where: { storeId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: { id: 'desc' },
      take: 500,
      select: { reactions: true },
    })
    const counter = new Map<string, number>()
    for (const m of msgs) {
      if (!Array.isArray(m.reactions)) continue
      for (const r of m.reactions as Array<{ emoji: string; by: unknown[] }>) {
        counter.set(r.emoji, (counter.get(r.emoji) ?? 0) + r.by.length)
      }
    }
    const rows = [...counter.entries()]
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
    this.emojiStatsCache = { at: Date.now(), rows }
    return { rows }
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
        // WS 定向:达标事件推对象+下发人(H5 任务页实时刷新)
        this.notifyTaskChange(t.targetArtistId, t.createdById, t.id, 'reached')
        // 达标抄送组别群(激励可见;无组别群则店群):系统消息「任务助手」
        const target = await this.prisma.artist.findUnique({ where: { id: t.targetArtistId }, select: { groupId: true } })
        const chatGroup = target?.groupId !== null && target?.groupId !== undefined
          ? await this.prisma.chatGroup.findFirst({ where: { storeId, groupId: target.groupId } })
          : await this.prisma.chatGroup.findFirst({ where: { storeId, groupId: null } })
        const cheer = '🎉 ' + (artist?.stageName ?? artist?.realName ?? '') + ' 已完成「' + t.title + '」' + String(progress) + '/' + String(t.targetCount)
        if (chatGroup !== null) {
          await this.prisma.chatMessage.create({
            data: {
              storeId,
              chatGroupId: chatGroup.id,
              senderScope: 'ADMIN',
              senderId: 0,
              senderName: '任务助手',
              content: cheer + ' (#task' + String(t.id) + ')',
              type: 'TEXT',
            },
          })
          this.chatServer?.to('chat:' + String(chatGroup.id)).emit('chat:message', {
            id: Date.now(), senderScope: 'ADMIN', senderId: 0, senderName: '任务助手',
            content: cheer, type: 'TEXT', images: [], createdAt: new Date().toISOString(),
          })
          this.chatServer?.toStore(storeId).emit('chat:ping', { groupId: chatGroup.id })
        }
      }
      // 超期未达标提醒(下发人 notice;NONE 单次任务到期未达标→通知后转 EXPIRED 归档,防止重复)
      const overdueSeen = t.notifyAt !== null && t.notifyAt.getTime() > t.endAt.getTime()
      if (t.endAt < new Date() && progress < t.targetCount && !overdueSeen && t.createdById > 0) {
        await this.prisma.notice.create({
          data: {
            storeId,
            title: '任务超期未达标:' + t.title.slice(0, 40),
            body: '对象「' + (artist?.stageName ?? artist?.realName ?? String(t.targetArtistId)) + '」截止 ' + t.endAt.toISOString().slice(0, 10) + ' 仅完成 ' + String(progress) + '/' + String(t.targetCount) + ',请跟进复盘或调整指标。',
            publishedBy: t.createdById,
            visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
            remind: true,
          },
        })
        await this.prisma.task.update({ where: { id: t.id }, data: { notifyAt: new Date() } })
        t.notifyAt = new Date()
        // WS 定向:超期事件推下发人(对象端由惰性重建/取消事件覆盖)
        this.chatServer?.toUsers('ADMIN', [t.createdById]).emit('task:changed', { taskId: t.id, reason: 'overdue' })
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
        // WS 定向:下周期任务已生成,推对象端实时可见
        this.chatServer?.toUsers('ARTIST', [t.targetArtistId]).emit('task:changed', { taskId: cloned.id, reason: 'recycled' })
        continue // 重建后的下周期任务从 0 开始,不在本轮列表(下轮可见)
      }
      // NONE 单次任务已超期且已通知未达标 → EXPIRED 归档(列表不再常驻;记录仍在)
      if (t.endAt < new Date() && t.recurrence === 'NONE' && t.status === 'ACTIVE' && progress < t.targetCount && overdueSeen) {
        await this.prisma.task.update({ where: { id: t.id }, data: { status: 'EXPIRED' } })
        continue
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
        notifyAt: t.notifyAt !== null && t.notifyAt !== undefined ? t.notifyAt.toISOString() : null,
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
    // WS 定向:下发即时可见(H5 任务页实时刷新)
    this.notifyTaskChange(created.targetArtistId, operatorId, created.id, 'created')
    return { id: created.id }
  }

  async cancelTask(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.task.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('任务不存在')
    await this.prisma.task.update({ where: { id }, data: { status: 'CANCELLED' } })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operatorId, action: 'TASK_CANCEL', targetType: 'task', targetId: String(id), beforeJson: { status: before.status } as object, afterJson: { status: 'CANCELLED' } as object },
    })
    // WS 定向:取消后对象端列表即时移除
    this.chatServer?.toUsers('ARTIST', [before.targetArtistId]).emit('task:changed', { taskId: id, reason: 'cancelled' })
  }

  /** 模板套用(计数累加+审计;高频排序数据源) */
  async applyTemplate(id: number, storeId: number, operatorId: number): Promise<{ applyCount: number }> {
    const t = await this.prisma.taskTemplate.findFirst({ where: { id, storeId, deletedAt: null } })
    if (t === null) throw new NotFoundException('模板不存在')
    const after = await this.prisma.taskTemplate.update({
      where: { id },
      data: { applyCount: { increment: 1 } },
    })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operatorId, action: 'TASK_TEMPLATE_APPLY', targetType: 'task_template', targetId: String(id), beforeJson: { applyCount: t.applyCount } as object, afterJson: { applyCount: after.applyCount } as object },
    })
    return { applyCount: after.applyCount }
  }

  /** 模板统计(高频排序) */
  async templateStats(storeId: number) {
    const rows = await this.prisma.taskTemplate.findMany({
      where: { storeId, deletedAt: null },
      orderBy: [{ applyCount: 'desc' }, { id: 'asc' }],
      take: 50,
    })
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        targetCount: r.targetCount,
        applyCount: r.applyCount,
      })),
    }
  }

  /* ── 任务模板库(管理员可编辑;一键套用持久化) ── */

  async listTemplates(storeId: number) {
    const rows = await this.prisma.taskTemplate.findMany({
      where: { storeId, deletedAt: null },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    })
    return { rows: rows.map((r) => ({ ...r, applyCount: r.applyCount })) }
  }

  async createTemplate(storeId: number, body: TemplateDto, operatorId: number): Promise<{ id: number }> {
    const dup = await this.prisma.taskTemplate.findFirst({ where: { storeId, name: body.name, deletedAt: null } })
    if (dup !== null) throw new BadRequestException('模板名称已存在')
    const created = await this.prisma.taskTemplate.create({
      data: {
        storeId,
        name: body.name,
        type: body.type,
        title: body.title,
        targetCount: body.targetCount,
        days: body.days,
        recurrence: body.recurrence ?? 'NONE',
        sort: body.sort ?? 0,
        createdById: operatorId,
      },
    })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operatorId, action: 'TASK_TEMPLATE_CREATE', targetType: 'task_template', targetId: String(created.id), beforeJson: null as unknown as object, afterJson: { name: body.name, type: body.type } as object },
    })
    return { id: created.id }
  }

  async updateTemplate(id: number, storeId: number, body: TemplateDto, operatorId: number): Promise<void> {
    const before = await this.prisma.taskTemplate.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('模板不存在')
    const after = await this.prisma.taskTemplate.update({
      where: { id },
      data: { name: body.name, type: body.type, title: body.title, targetCount: body.targetCount, days: body.days, recurrence: body.recurrence ?? 'NONE', sort: body.sort ?? 0 },
    })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operatorId, action: 'TASK_TEMPLATE_UPDATE', targetType: 'task_template', targetId: String(id), beforeJson: before as object, afterJson: after as object },
    })
  }

  async deleteTemplate(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.taskTemplate.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('模板不存在')
    await this.prisma.taskTemplate.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operatorId, action: 'TASK_TEMPLATE_DELETE', targetType: 'task_template', targetId: String(id), beforeJson: before as object, afterJson: null as unknown as object },
    })
  }

  /* ── 客资体系(P5 2026-11-07):客户线索最小闭环;ADMIN 全量/ARTIST 本人归属 ── */

  async listCustomers(storeId: number, viewer: { scope: string; id: number }, q?: string, status?: string, ownerArtistId?: number) {
    const kw = q?.trim() ?? ''
    const rows = await this.prisma.customerLead.findMany({
      where: {
        storeId,
        ...(viewer.scope === 'ARTIST' ? { ownerArtistId: viewer.id } : {}),
        ...(ownerArtistId !== undefined ? { ownerArtistId } : {}),
        ...(status !== undefined && status !== '' ? { status } : {}),
        ...(kw !== ''
          ? {
              OR: [
                { name: { contains: kw } },
                { phone: { contains: kw } },
                { note: { contains: kw } },
                { tags: { contains: kw } },
              ],
            }
          : {}),
      },
      orderBy: { id: 'desc' },
      take: 200,
    })
    const ownerIds = [...new Set(rows.map((r) => r.ownerArtistId).filter((x): x is number => x !== null))]
    const owners = ownerIds.length > 0
      ? await this.prisma.artist.findMany({ where: { id: { in: ownerIds } }, select: { id: true, stageName: true, realName: true } })
      : []
    const ownerMap = new Map(owners.map((o) => [o.id, o.stageName ?? o.realName ?? String(o.id)]))
    // 最近跟进摘要(时间线子表;一次聚合防 N+1)+TODO 待办到期
    const leadIds = rows.map((r) => r.id)
    const followups = leadIds.length > 0
      ? await this.prisma.customerFollowup.findMany({ where: { leadId: { in: leadIds } }, orderBy: { createdAt: 'desc' } })
      : []
    const lastMap = new Map<number, { content: string; at: string }>()
    const cntMap = new Map<number, number>()
    const todoMap = new Map<number, { overdue: boolean; dueAt: string; content: string }>()
    const nowMs = Date.now()
    for (const f of followups) {
      if (!lastMap.has(f.leadId)) lastMap.set(f.leadId, { content: f.content, at: f.createdAt.toISOString() })
      cntMap.set(f.leadId, (cntMap.get(f.leadId) ?? 0) + 1)
      if (f.kind === 'TODO' && !f.isDone && !todoMap.has(f.leadId)) {
        const dueAt = f.dueAt
        const overdue = dueAt !== null && dueAt.getTime() < nowMs
        const prev = todoMap.get(f.leadId)
        // 取最早未完成 TODO
        if (prev === undefined || (dueAt !== null && new Date(prev.dueAt).getTime() > dueAt.getTime())) {
          todoMap.set(f.leadId, { overdue, dueAt: dueAt !== null ? dueAt.toISOString() : '', content: f.content })
        }
      }
    }
    // TODO 到期通知矩阵(2026-11-08 惰性触发+同标题幂等):到期未完成 → notice 提醒录入人(接通告矩阵)
    for (const f of followups) {
      if (f.kind === 'TODO' && !f.isDone && f.dueAt !== null && f.dueAt.getTime() < nowMs) {
        const lead = rows.find((x) => x.id === f.leadId)
        const title = '客资待办到期:' + (lead?.name ?? '客资#' + String(f.leadId)) + ' ' + f.dueAt.toISOString().slice(5, 10)
        const dup = await this.prisma.notice.findFirst({ where: { storeId, title, deletedAt: null } })
        if (dup === null) {
          await this.prisma.notice.create({
            data: {
              storeId,
              title,
              body: '待办「' + f.content + '」已到期,请尽快跟进客资「' + (lead?.name ?? String(f.leadId)) + '」。',
              publishedBy: f.createdBy,
              visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
              remind: true,
            },
          })
        }
      }
    }
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        source: r.source,
        status: r.status,
        note: r.note,
        ownerArtistId: r.ownerArtistId,
        ownerName: r.ownerArtistId !== null ? ownerMap.get(r.ownerArtistId) ?? null : null,
        tags: r.tags ?? '',
        lastFollowAt: lastMap.get(r.id)?.at ?? null,
        lastFollowContent: lastMap.get(r.id)?.content ?? null,
        followupCount: cntMap.get(r.id) ?? 0,
        todoOverdue: todoMap.get(r.id)?.overdue === true,
        todoDueAt: todoMap.get(r.id)?.dueAt ?? null,
        todoContent: todoMap.get(r.id)?.content ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  /** 跟进时间线(一客多条;desc) */
  async listFollowups(leadId: number, storeId: number) {
    const rows = await this.prisma.customerFollowup.findMany({
      where: { leadId, storeId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const adminIds = [...new Set(rows.map((r) => r.createdBy))]
    const admins = adminIds.length > 0
      ? await this.prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } })
      : []
    const adminMap = new Map(admins.map((a) => [a.id, a.name]))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        content: r.content,
        kind: r.kind,
        dueAt: r.dueAt !== null && r.dueAt !== undefined ? r.dueAt.toISOString() : null,
        isDone: r.isDone,
        creatorName: adminMap.get(r.createdBy) ?? String(r.createdBy),
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  /** 新增跟进(手动/TODO 待办) */
  async createFollowup(leadId: number, storeId: number, operator: { scope: string; id: number }, body: { content: string; kind?: string; dueAt?: string }): Promise<{ id: number }> {
    const lead = await this.prisma.customerLead.findFirst({ where: { id: leadId, storeId } })
    if (lead === null) throw new NotFoundException('客资不存在')
    const kind = body.kind === 'TODO' ? 'TODO' : 'MANUAL'
    if (kind === 'TODO' && (body.dueAt === undefined || body.dueAt === '')) {
      throw new BadRequestException('待办跟进须带到期时间')
    }
    const created = await this.prisma.customerFollowup.create({
      data: {
        storeId,
        leadId,
        content: body.content.trim().slice(0, 500),
        kind,
        dueAt: body.dueAt !== undefined && body.dueAt !== '' ? new Date(body.dueAt) : null,
        createdBy: operator.id,
      },
    })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operator.id, action: 'CUSTOMER_FOLLOWUP', targetType: 'customer_lead', targetId: String(leadId), beforeJson: null as unknown as object, afterJson: { content: body.content.slice(0, 100), kind } as object },
    })
    return { id: created.id }
  }

  /** 完成待办跟进 */
  async doneFollowup(leadId: number, fid: number, storeId: number, operator: { scope: string; id: number }): Promise<void> {
    const f = await this.prisma.customerFollowup.findFirst({ where: { id: fid, leadId, storeId } })
    if (f === null) throw new NotFoundException('跟进记录不存在')
    if (f.isDone) return // 幂等
    await this.prisma.customerFollowup.update({ where: { id: fid }, data: { isDone: true } })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operator.id, action: 'CUSTOMER_TODO_DONE', targetType: 'customer_lead', targetId: String(leadId), beforeJson: { isDone: false } as object, afterJson: { isDone: true } as object },
    })
  }

  /** TODO 看板(全部未完成待办;按到期日排布,过期置顶;日历视图数据源) */
  async todoBoard(storeId: number): Promise<{ rows: Array<{ id: number; leadId: number; leadName: string; leadPhone: string | null; content: string; dueAt: string | null; overdue: boolean }> }> {
    const rows = await this.prisma.customerFollowup.findMany({
      where: { storeId, kind: 'TODO', isDone: false },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      take: 200,
    })
    const leadIds = [...new Set(rows.map((r) => r.leadId))]
    const leads = leadIds.length > 0
      ? await this.prisma.customerLead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true, phone: true } })
      : []
    const leadMap = new Map(leads.map((l) => [l.id, l]))
    const nowMs = Date.now()
    return {
      rows: rows.map((r) => {
        const lead = leadMap.get(r.leadId)
        return {
          id: r.id,
          leadId: r.leadId,
          leadName: lead?.name ?? ('客资#' + String(r.leadId)),
          leadPhone: lead?.phone ?? null,
          content: r.content,
          dueAt: r.dueAt !== null && r.dueAt !== undefined ? r.dueAt.toISOString() : null,
          overdue: r.dueAt !== null && r.dueAt !== undefined && r.dueAt.getTime() < nowMs,
        }
      }),
    }
  }

  /** 转化率排行(按销售经理聚合;衔接员工绩效) */
  async ownerStats(storeId: number): Promise<{ rows: Array<{ owner: string; ownerArtistId: number | null; total: number; deal: number; rate: number }> }> {
    const all = await this.prisma.customerLead.findMany({
      where: { storeId },
      select: { ownerArtistId: true, status: true },
    })
    const artistIds = [...new Set(all.map((r) => r.ownerArtistId).filter((x): x is number => x !== null))]
    const artists = artistIds.length > 0
      ? await this.prisma.artist.findMany({ where: { id: { in: artistIds } }, select: { id: true, stageName: true, realName: true } })
      : []
    const artistMap = new Map(artists.map((a) => [a.id, a.stageName ?? a.realName ?? String(a.id)]))
    const m = new Map<string, { total: number; deal: number }>()
    for (const r of all) {
      const o = r.ownerArtistId !== null ? artistMap.get(r.ownerArtistId) ?? ('销售#' + String(r.ownerArtistId)) : '未归属'
      const e = m.get(o) ?? { total: 0, deal: 0 }
      e.total += 1
      if (r.status === 'DEAL') e.deal += 1
      m.set(o, e)
    }
    return {
      rows: [...m.entries()]
        .map(([owner, st]) => {
          const artistId = artistIds.find((id) => artistMap.get(id) === owner) ?? null
          return { owner, ownerArtistId: artistId, total: st.total, deal: st.deal, rate: st.total > 0 ? Math.round((st.deal / st.total) * 100) : 0 }
        })
        .sort((a, b) => b.rate - a.rate || b.total - a.total)
        .slice(0, 20),
    }
  }

  /** 客资导出(xlsx/csv;对齐报表中心导出体系;@Res 直写) */
  async exportCustomers(
    storeId: number,
    viewer: { scope: string; id: number },
    q: { q?: string; status?: string; ownerArtistId?: number; fmt: 'xlsx' | 'csv' },
    res: Response,
  ): Promise<void> {
    const out = await this.listCustomers(storeId, viewer, q.q, q.status, q.ownerArtistId)
    const headers = ['客户', '电话', '来源', '状态', '归属销售经理', '最近跟进', '跟进次数', '录入时间']
    const rows = out.rows.map((r) => [
      r.name,
      r.phone ?? '',
      r.source ?? '',
      r.status === 'FOLLOW' ? '跟进中' : r.status === 'DEAL' ? '已成交' : '已流失',
      r.ownerName ?? '',
      r.lastFollowContent ?? '',
      r.followupCount,
      r.createdAt.slice(0, 16).replace('T', ' '),
    ])
    const name = '客资列表-' + new Date().toISOString().slice(0, 10)
    if (q.fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(name) + '.csv')
      res.send(toCsv(headers, rows))
      return
    }
    const buf = toXlsx([{ name: '客资列表', rows: [headers, ...rows] }])
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(name) + '.xlsx')
    res.send(buf)
  }

  async createCustomer(storeId: number, operator: { scope: string; id: number }, body: { name: string; phone?: string; source?: string; status?: string; note?: string; ownerArtistId?: number; tags?: string }): Promise<{ id: number }> {
    // phone 唯一软约束(2026-11-08):同店同号存在未流失(FOLLOW/DEAL)客资 → 拒绝重复录入
    if (body.phone !== undefined && body.phone.trim() !== '') {
      const dup = await this.prisma.customerLead.findFirst({
        where: { storeId, phone: body.phone.trim(), status: { not: 'LOST' } },
      })
      if (dup !== null) {
        throw new BadRequestException('该电话已有在跟客资「' + dup.name + '」(' + (dup.status === 'FOLLOW' ? '跟进中' : '已成交') + '),请勿重复录入;如确为新客请先调整原客资状态')
      }
    }
    const created = await this.prisma.customerLead.create({
      data: {
        storeId,
        name: body.name.trim(),
        phone: body.phone,
        source: body.source,
        status: body.status ?? 'FOLLOW',
        note: body.note,
        ownerArtistId: body.ownerArtistId ?? (operator.scope === 'ARTIST' ? operator.id : undefined),
        tags: body.tags,
        createdBy: operator.id,
      },
    })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: operator.id, action: 'CUSTOMER_CREATE', targetType: 'customer_lead', targetId: String(created.id), beforeJson: null as unknown as object, afterJson: { name: body.name } as object },
    })
    return { id: created.id }
  }

  async updateCustomer(id: number, storeId: number, viewer: { scope: string; id: number }, body: { name?: string; phone?: string; source?: string; status?: string; note?: string; ownerArtistId?: number; tags?: string }): Promise<void> {
    const before = await this.prisma.customerLead.findFirst({
      where: { id, storeId, ...(viewer.scope === 'ARTIST' ? { ownerArtistId: viewer.id } : {}) },
    })
    if (before === null) throw new NotFoundException('客资不存在或无权操作')
    // phone 唯一软约束(改号时同样校验;排除自身)
    if (body.phone !== undefined && body.phone.trim() !== '') {
      const dup = await this.prisma.customerLead.findFirst({
        where: { storeId, phone: body.phone.trim(), status: { not: 'LOST' }, id: { not: id } },
      })
      if (dup !== null) {
        throw new BadRequestException('该电话已有在跟客资「' + dup.name + '」,请勿重复录入')
      }
    }
    await this.prisma.customerLead.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
        ...(body.ownerArtistId !== undefined ? { ownerArtistId: body.ownerArtistId } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
      },
    })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: viewer.id, action: 'CUSTOMER_UPDATE', targetType: 'customer_lead', targetId: String(id), beforeJson: { status: before.status } as object, afterJson: { status: body.status ?? before.status } as object },
    })
  }

  async deleteCustomer(id: number, storeId: number, viewer: { scope: string; id: number }): Promise<void> {
    const before = await this.prisma.customerLead.findFirst({
      where: { id, storeId, ...(viewer.scope === 'ARTIST' ? { ownerArtistId: viewer.id } : {}) },
    })
    if (before === null) throw new NotFoundException('客资不存在或无权操作')
    await this.prisma.customerLead.delete({ where: { id } })
    await this.prisma.auditLog.create({
      data: { storeId, actorId: viewer.id, action: 'CUSTOMER_DELETE', targetType: 'customer_lead', targetId: String(id), beforeJson: { name: before.name } as object, afterJson: null as unknown as object },
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

  /** 模板套用计数(一键套用时调用;高频排序数据源) */
  @Post('templates/:id/apply')
  async applyTemplate(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    const u = op(req)
    return this.svc.applyTemplate(id, u.storeId, u.id)
  }

  /** 模板统计(高频排序) */
  @Get('templates/stats')
  async templateStats(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.templateStats(u.storeId)
  }

  /** 模板库清单(全员可读;套用下拉数据源) */
  @Get('templates')
  async templates(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.listTemplates(u.storeId)
  }

  @RequirePerm('setting:manage')
  @Post('templates')
  async createTemplate(@Req() req: Request, @Body() body: TemplateDto): Promise<unknown> {
    const u = op(req)
    return this.svc.createTemplate(u.storeId, body, u.id)
  }

  @RequirePerm('setting:manage')
  @Post('templates/:id')
  async updateTemplate(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: TemplateDto,
  ): Promise<unknown> {
    const u = op(req)
    await this.svc.updateTemplate(id, u.storeId, body, u.id)
    return { updated: true }
  }

  @RequirePerm('setting:manage')
  @Post('templates/:id/delete')
  async deleteTemplate(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const u = op(req)
    await this.svc.deleteTemplate(id, u.storeId, u.id)
    return { deleted: true }
  }
}

/* ── Customer 客资 Controller(P5) ── */

@Controller('customers')
export class CustomerController {
  constructor(private readonly svc: CommService) {}

  /** 客资列表(搜索/筛选+TODO 到期惰性 notice) */
  @Get()
  async list(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('ownerArtistId') ownerArtistId?: string,
  ): Promise<unknown> {
    const u = op(req)
    return this.svc.listCustomers(u.storeId, u, q, status, ownerArtistId !== undefined && ownerArtistId !== '' ? Number(ownerArtistId) : undefined)
  }

  /** TODO 看板(全部未完成待办,按到期日排布;日历视图数据源) */
  @Get('todo-board')
  async todoBoard(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.todoBoard(u.storeId)
  }

  /** 转化率排行(按销售经理;衔接员工绩效) */
  @Get('stats/by-owner')
  async statsByOwner(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.ownerStats(u.storeId)
  }

  /** 客资导出(xlsx/csv;对齐报表中心导出体系;@Res 直写绕信封) */
  @Get('export')
  async export(
    @Req() req: Request,
    @Query('fmt') fmt: string | undefined,
    @Query('q') q: string | undefined,
    @Query('status') status: string | undefined,
    @Query('ownerArtistId') ownerArtistId: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const u = op(req)
    await this.svc.exportCustomers(
      u.storeId,
      u,
      { q, status, fmt: fmt === 'csv' ? 'csv' : 'xlsx', ownerArtistId: ownerArtistId !== undefined && ownerArtistId !== '' ? Number(ownerArtistId) : undefined },
      res,
    )
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: { name: string; phone?: string; source?: string; status?: string; note?: string; ownerArtistId?: number; tags?: string },
  ): Promise<unknown> {
    const u = op(req)
    if (body.name === undefined || body.name.trim() === '') throw new BadRequestException('姓名必填')
    return this.svc.createCustomer(u.storeId, u, body)
  }

  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; phone?: string; source?: string; status?: string; note?: string; ownerArtistId?: number; tags?: string },
  ): Promise<unknown> {
    const u = op(req)
    await this.svc.updateCustomer(id, u.storeId, u, body)
    return { ok: true }
  }

  /** 跟进时间线(一客多条) */
  @Get(':id/followups')
  async followups(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const u = op(req)
    return this.svc.listFollowups(id, u.storeId)
  }

  /** 新增跟进(手动/TODO 待办) */
  @Post(':id/followups')
  async addFollowup(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string; kind?: string; dueAt?: string },
  ): Promise<unknown> {
    const u = op(req)
    if (body.content === undefined || body.content.trim() === '') throw new BadRequestException('跟进内容必填')
    return this.svc.createFollowup(id, u.storeId, u, body)
  }

  /** 完成待办跟进 */
  @Post(':id/followups/:fid/done')
  async doneFollowup(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('fid', ParseIntPipe) fid: number,
  ): Promise<unknown> {
    const u = op(req)
    await this.svc.doneFollowup(id, fid, u.storeId, u)
    return { ok: true }
  }

  @Post(':id/delete')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const u = op(req)
    await this.svc.deleteCustomer(id, u.storeId, u)
    return { ok: true }
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

  /** 全店高频表情统计(面板高频行;近 500 条聚合,60s 缓存) */
  @Get('emoji-stats')
  async emojiStats(@Req() req: Request): Promise<unknown> {
    const u = op(req)
    return this.svc.emojiStats(u.storeId)
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
    @Query('q') q?: string,
    @Query('senderName') senderName?: string,
  ): Promise<unknown> {
    const u = op(req)
    return this.svc.listMessages(
      id,
      u.storeId,
      u,
      after !== undefined && after !== '' ? Number(after) : undefined,
      before !== undefined && before !== '' ? Number(before) : undefined,
      q,
      senderName,
    )
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

  /** 消息撤回(2 分钟内本人) */
  @Post('groups/:id/messages/:mid/retract')
  async retract(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('mid', ParseIntPipe) mid: number,
  ): Promise<unknown> {
    const u = op(req)
    await this.svc.retractMessage(id, mid, u.storeId, u)
    return { retracted: true }
  }

  /** 表情回应 toggle */
  @Post('groups/:id/messages/:mid/react')
  async react(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('mid', ParseIntPipe) mid: number,
    @Body() body: ReactDto,
  ): Promise<unknown> {
    const u = op(req)
    return this.svc.reactMessage(id, mid, u.storeId, body.emoji, u)
  }
}


@Module({
  controllers: [FeedbackController, ChatController, TaskController, CustomerController],
  providers: [CommService, PrismaService],
  })
export class CommModule {}
