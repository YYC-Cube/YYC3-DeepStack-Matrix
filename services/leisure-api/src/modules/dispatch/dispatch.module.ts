/**
 * 轮台派单引擎(销售经理设置⑧ 上钟模式:ROTATION 轮台 / SELF_PICK 自选 / MIXED 混合)
 * 队列口径(当日,营业日):已签到(审核通过且未签退)且无进行中场次的在岗销售经理,
 *   按「当日被派次数 ASC → 最近一次被派时间 ASC(从未被派者优先)→ 签到时间 ASC」排序
 * 模式语义:
 *   ROTATION:开房所选销售经理必须恰为队列前 k 位(k=所选人数),否则 40914
 *   MIXED   :推荐前 k 位但允许越序(原因选填),日志标 overridden 供公平性考核
 *   SELF_PICK:自由选择,仅记日志
 * 日志 dispatch_log 为「主管轮台报表」唯一数据源(公平性考核)
 */
import { Controller, Get, Injectable, Module, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { ERR, LeisureError, resolveBusinessDate } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { StoreConfigService } from '../store-config/store-config.module.js'
import type { Prisma } from '@prisma/client'

type Db = PrismaService | Prisma.TransactionClient

export interface QueueRow {
  position: number
  artistId: number
  stageName: string | null
  badgeNo: string | null
  groupId: number | null
  supervisorName: string | null
  todayDispatches: number
  lastDispatchAt: string | null
  checkedInAt: string
}

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  private async businessDateOf(storeId: number): Promise<{ str: string; date: Date }> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    const str = resolveBusinessDate(new Date(), { cutTime: store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT })
    return { str, date: new Date(str) }
  }

  /** 当日轮台队列(可在事务内调用以保证派单校验与写入一致) */
  async queue(storeId: number, db: Db = this.prisma): Promise<{ businessDate: string; mode: string; rows: QueueRow[] }> {
    const { str, date } = await this.businessDateOf(storeId)
    const settings = await this.storeConfig.getArtistSettings(storeId)

    // 已签到(APPROVED,未签退)销售经理 + 签到时间
    const checkins = await db.attendanceReport.findMany({
      where: { storeId, businessDate: date, type: 'CHECKIN', reviewStatus: 'APPROVED', checkoutTime: null },
      select: { artistId: true, reportTime: true },
      orderBy: { reportTime: 'asc' },
    })
    const checkinAt = new Map<number, Date>()
    for (const c of checkins) if (!checkinAt.has(c.artistId)) checkinAt.set(c.artistId, c.reportTime)
    const candidateIds = Array.from(checkinAt.keys())
    if (candidateIds.length === 0) return { businessDate: str, mode: settings.stageAssignMode, rows: [] }

    // 排除进行中场次销售经理 + 排除未审核/停用档案
    const live = await db.showSession.findMany({
      where: { storeId, endAt: null, artistId: { in: candidateIds } },
      select: { artistId: true },
    })
    const liveSet = new Set(live.map((s) => s.artistId))
    const artists = await db.artist.findMany({
      where: { id: { in: candidateIds }, storeId, deletedAt: null, status: 1, auditStatus: 'APPROVED' },
      select: { id: true, stageName: true, badgeNo: true, groupId: true, supervisorName: true },
    })

    // 当日被派统计
    const logs = await db.dispatchLog.groupBy({
      by: ['artistId'],
      where: { storeId, businessDate: date, artistId: { in: candidateIds } },
      _count: { _all: true },
      _max: { createdAt: true },
    })
    const stat = new Map(logs.map((l) => [l.artistId, { n: l._count._all, last: l._max.createdAt }]))

    const rows = artists
      .filter((a) => !liveSet.has(a.id))
      .map((a) => {
        const s = stat.get(a.id)
        return {
          artistId: a.id,
          stageName: a.stageName,
          badgeNo: a.badgeNo,
          groupId: a.groupId,
          supervisorName: a.supervisorName,
          todayDispatches: s?.n ?? 0,
          lastDispatchAt: s?.last !== undefined && s.last !== null ? s.last.toISOString() : null,
          checkedInAt: (checkinAt.get(a.id) ?? new Date()).toISOString(),
        }
      })
      .sort((x, y) => {
        if (x.todayDispatches !== y.todayDispatches) return x.todayDispatches - y.todayDispatches
        const lx = x.lastDispatchAt === null ? 0 : new Date(x.lastDispatchAt).getTime()
        const ly = y.lastDispatchAt === null ? 0 : new Date(y.lastDispatchAt).getTime()
        if (lx !== ly) return lx - ly
        return new Date(x.checkedInAt).getTime() - new Date(y.checkedInAt).getTime()
      })
      .map((r, i) => ({ position: i + 1, ...r }))

    return { businessDate: str, mode: settings.stageAssignMode, rows }
  }

  /**
   * 开房派单校验 + 落日志(事务内调用):
   * ROTATION 越序 → 40914;MIXED 越序须 overrideReason;SELF_PICK 仅记录
   */
  async validateAndLog(
    db: Db,
    p: { storeId: number; roomSessionId: number; artistIds: number[]; operatorId: number; overrideReason?: string },
  ): Promise<{ mode: string; overridden: number[] }> {
    const { mode, rows, businessDate } = await this.queue(p.storeId, db)
    const k = p.artistIds.length
    const topK = new Set(rows.slice(0, k).map((r) => r.artistId))
    const offOrder = p.artistIds.filter((id) => !topK.has(id))

    if (mode === 'ROTATION' && offOrder.length > 0) {
      const next = rows.slice(0, k).map((r) => (r.stageName ?? String(r.artistId)) + '(' + (r.badgeNo ?? '') + ')').join('、')
      throw new LeisureError(ERR.DISPATCH_ORDER_VIOLATION, '轮台模式须按队列顺序派单,下一位应为:' + (next === '' ? '无可派销售经理' : next), {
        next: rows.slice(0, k).map((r) => r.artistId),
      })
    }
    const reason = p.overrideReason?.trim() ?? ''
    // MIXED:允许越过推荐位(原因选填),日志标 overridden 供主管轮台报表考核;SELF_PICK:自由选择仅记录

    const bd = new Date(businessDate)
    const artists = await db.artist.findMany({
      where: { id: { in: p.artistIds } },
      select: { id: true, groupId: true, supervisorName: true },
    })
    const meta = new Map(artists.map((a) => [a.id, a]))
    const counts = new Map(rows.map((r) => [r.artistId, r.todayDispatches]))
    for (const artistId of p.artistIds) {
      const a = meta.get(artistId)
      const isOff = offOrder.includes(artistId)
      await db.dispatchLog.create({
        data: {
          storeId: p.storeId,
          businessDate: bd,
          roomSessionId: p.roomSessionId,
          artistId,
          groupId: a?.groupId ?? null,
          supervisorName: a?.supervisorName ?? null,
          mode,
          position: (counts.get(artistId) ?? 0) + 1,
          suggested: !isOff,
          overridden: isOff && mode !== 'SELF_PICK',
          reason: isOff && reason !== '' ? reason : null,
          operatorId: p.operatorId,
        },
      })
    }
    return { mode, overridden: offOrder }
  }
}

/* ── Controller ── */

@Controller('dispatch')
export class DispatchController {
  constructor(private readonly svc: DispatchService) {}

  /** 当日轮台队列(开房弹窗/钟房大屏用) */
  @RequirePerm('session:view')
  @Get('queue')
  async queue(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.queue(user?.storeId ?? 1)
  }

  /** 下一位(或前 N 位) */
  @RequirePerm('session:view')
  @Get('next')
  async next(@Req() req: Request, @Query('count') count?: string): Promise<unknown> {
    const user = (req as ReqWithUser).user
    const q = await this.svc.queue(user?.storeId ?? 1)
    const n = Math.min(Math.max(Number(count ?? 1), 1), 20)
    return { businessDate: q.businessDate, mode: q.mode, rows: q.rows.slice(0, n) }
  }
}

@Module({
  controllers: [DispatchController],
  providers: [DispatchService, PrismaService, StoreConfigService],
  exports: [DispatchService],
})
export class DispatchModule {}
