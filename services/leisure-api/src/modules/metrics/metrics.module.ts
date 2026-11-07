/**
 * Prometheus 文本指标端点(/api/v1/metrics;008 #6 轻落地 2026-11-07)
 * 零依赖:text/plain Prometheus 格式;业务计数 60s 内存缓存(防抓取打库)
 * 抓取方:NAS prometheus(Tailscale 100.87.159.21:3002);公开只读(无敏感值,仅计数)
 */
import { Controller, Get, Injectable, Module, Req, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Public } from '../../common/guards/jwt.guard.js'
import type { ReqWithUser } from '../../common/guards/jwt.guard.js'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service.js'

const BOOT_AT = Date.now()

interface BizCache {
  at: number
  artists: number
  openSessions: number
  activeTasks: number
  chatMessages: number
  txnsToday: number
}

@Injectable()
export class MetricsService {
  private cache: BizCache | null = null
  private readonly cacheMs = 60_000

  constructor(private readonly prisma: PrismaService) {}

  private async biz(): Promise<BizCache> {
    if (this.cache !== null && Date.now() - this.cache.at < this.cacheMs) return this.cache
    const dayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')
    const [artists, openSessions, activeTasks, chatMessages, txnsToday] = await Promise.all([
      this.prisma.artist.count({ where: { deletedAt: null, status: 1 } }),
      this.prisma.roomSession.count({ where: { status: 'OPEN' } }).catch(() => 0),
      this.prisma.task.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
      this.prisma.chatMessage.count().catch(() => 0),
      this.prisma.stageFeeTxn.count({ where: { createdAt: { gte: dayStart } } }).catch(() => 0),
    ])
    this.cache = { at: Date.now(), artists, openSessions, activeTasks, chatMessages, txnsToday }
    return this.cache
  }

  async render(): Promise<string> {
    const mem = process.memoryUsage()
    const uptime = Math.floor((Date.now() - BOOT_AT) / 1000)
    let biz: BizCache = { at: 0, artists: 0, openSessions: 0, activeTasks: 0, chatMessages: 0, txnsToday: 0 }
    try {
      biz = await this.biz()
    } catch {
      /* DB 不可达时仅输出进程指标 */
    }
    const lines = [
      '# HELP lm_uptime_seconds Process uptime in seconds',
      '# TYPE lm_uptime_seconds gauge',
      'lm_uptime_seconds ' + String(uptime),
      '# HELP lm_process_heap_bytes Node heap used bytes',
      '# TYPE lm_process_heap_bytes gauge',
      'lm_process_heap_bytes ' + String(mem.heapUsed),
      '# HELP lm_process_rss_bytes Resident set size bytes',
      '# TYPE lm_process_rss_bytes gauge',
      'lm_process_rss_bytes ' + String(mem.rss),
      '# HELP lm_artists_total Active artists',
      '# TYPE lm_artists_total gauge',
      'lm_artists_total ' + String(biz.artists),
      '# HELP lm_room_sessions_open Open room sessions',
      '# TYPE lm_room_sessions_open gauge',
      'lm_room_sessions_open ' + String(biz.openSessions),
      '# HELP lm_tasks_active Active tasks',
      '# TYPE lm_tasks_active gauge',
      'lm_tasks_active ' + String(biz.activeTasks),
      '# HELP lm_chat_messages_total Chat messages',
      '# TYPE lm_chat_messages_total gauge',
      'lm_chat_messages_total ' + String(biz.chatMessages),
      '# HELP lm_stage_fee_txns_today Stage fee txns today',
      '# TYPE lm_stage_fee_txns_today gauge',
      'lm_stage_fee_txns_today ' + String(biz.txnsToday),
    ]
    return lines.join('\n') + '\n'
  }
}

@Controller('metrics')
export class MetricsController {
  constructor(private readonly svc: MetricsService) {}

  @Public()
  @Get()
  async get(@Req() _req: Request, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.send(await this.svc.render())
  }
}

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PrismaService],
})
export class MetricsModule {}
