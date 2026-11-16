/**
 * 点单履约提醒 job(2026-11-17;13 号履约形态配套:PLACED 超 5 分钟未送达→通告点名吧台)
 * 骨架:进程内 60s 轮询(与 day-cut-summary 同模式);幂等=同单号同标题不重复(notice findFirst)
 * 口径:每店扫当日 PLACED 单,placedAt < now-5min 即提醒一次;文案含单号/房/点单人/明细/金额/等待时长
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

const TICK_MS = 60_000
/** 超时阈值(分钟):PLACED 超 5 分钟未送达即提醒 */
const OVERDUE_MIN = 5

@Injectable()
export class OrderFulfillmentJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderFulfillmentJob.name)
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS)
    this.logger.log('order-fulfillment job started (interval ' + String(TICK_MS / 1000) + 's, overdue=' + String(OVERDUE_MIN) + 'min)')
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearInterval(this.timer)
  }

  async tick(): Promise<void> {
    if (this.running) return // 单进程防重入
    this.running = true
    try {
      const stores = await this.prisma.store.findMany({ select: { id: true } })
      for (const s of stores) {
        await this.remindOverdue(s.id)
      }
    } catch (err) {
      this.logger.error('tick failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      this.running = false
    }
  }

  /** 单店超时 PLACED 提醒(每单一次;同标题幂等) */
  private async remindOverdue(storeId: number): Promise<void> {
    const cutoff = new Date(Date.now() - OVERDUE_MIN * 60_000)
    const overdue = await this.prisma.selfOrder.findMany({
      where: { storeId, status: 'PLACED', placedAt: { lt: cutoff } },
      orderBy: { id: 'asc' },
      take: 50,
    })
    for (const o of overdue) {
      const title = '点单履约超时(#' + String(o.id) + ')'
      const dup = await this.prisma.notice.findFirst({
        where: { storeId, title, deletedAt: null },
      })
      if (dup !== null) continue // 已提醒过该单
      const [rs, artist, items] = await Promise.all([
        this.prisma.roomSession.findUnique({ where: { id: o.sessionId }, select: { roomNo: true } }),
        this.prisma.artist.findUnique({ where: { id: o.artistId }, select: { stageName: true, realName: true } }),
        Array.isArray(o.items) ? (o.items as Array<{ name: string; qty: number }>) : [],
      ])
      const detail = items.map((it) => it.name + '×' + String(it.qty)).join('·')
      const waitMin = Math.floor((Date.now() - o.placedAt.getTime()) / 60_000)
      await this.prisma.notice.create({
        data: {
          storeId,
          title,
          body:
            '点单已等待 ' + String(waitMin) + ' 分钟未送达:' +
            (rs?.roomNo ?? '房 ' + String(o.roomId)) + ' · ' +
            (artist?.stageName ?? artist?.realName ?? '点单人 ' + String(o.artistId)) + ' 点 ' +
            detail + ' ¥' + String(o.totalAmount) +
            ';请吧台尽快送达(履约队列:/orders/queue)。本提醒由履约 job 自动生成,每单一次。',
          publishedBy: 0,
          visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
          remind: true,
        },
      })
      this.logger.warn('fulfillment overdue notice: order=' + String(o.id) + ' wait=' + String(waitMin) + 'min')
    }
  }
}
