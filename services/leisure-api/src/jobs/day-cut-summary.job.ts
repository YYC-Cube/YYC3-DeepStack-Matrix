/**
 * 日切汇总 job(10 号文档 §三 day-cut-summary)
 * 触发器:进程内 60s 轮询(BullMQ 依赖就绪后可平移替换——handler 幂等,重跑不重复写)
 * 逻辑:对每店取「上一营业日」,daily_summary 缺失则物化 + 明细和=汇总校验 + job_run_log 留痕
 * 口径:营业日一律按 store.business_day_cut_time(leisure-core resolveBusinessDate/shiftBusinessDate)
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import {
  resolveBusinessDate,
  shiftBusinessDate,
} from '@yyc3/leisure-core'
import { PrismaService } from '../prisma/prisma.service.js'

const TICK_MS = 60_000

@Injectable()
export class DayCutSummaryJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DayCutSummaryJob.name)
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // 启动即补算一次(幂等:已有汇总直接跳过),再进入轮询
    void this.tick()
    this.timer = setInterval(() => void this.tick(), TICK_MS)
    this.logger.log('day-cut-summary job started (interval ' + String(TICK_MS / 1000) + 's)')
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearInterval(this.timer)
  }

  async tick(): Promise<void> {
    if (this.running) return // 上轮未结束则跳过(单进程防重入)
    this.running = true
    try {
      const stores = await this.prisma.store.findMany()
      for (const store of stores) {
        await this.materializeStore(store.id, store.name, store.businessDayCutTime)
      }
    } catch (err) {
      this.logger.error('tick failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      this.running = false
    }
  }

  /** 物化单店上一营业日汇总(幂等:uk(store_id, business_date) + 存在即跳过) */
  private async materializeStore(
    storeId: number,
    storeName: string,
    cutTime: string,
  ): Promise<void> {
    const now = new Date()
    const currentBd = resolveBusinessDate(now, { cutTime: cutTime })
    const target = shiftBusinessDate(currentBd, -1) // 上一营业日(日切后即完整)
    const targetDate = new Date(target)
    const startedAt = new Date()

    const existing = await this.prisma.dailySummary.findUnique({
      where: { storeId_businessDate: { storeId, businessDate: targetDate } },
    })
    if (existing !== null) return

    try {
      const [rechargeAgg, sessionDeductAgg, manualDeductAgg, reverseAgg, sessionCount, crossCount, attendanceGroups] =
        await Promise.all([
          this.prisma.stageFeeTxn.aggregate({
            where: { storeId, businessDate: targetDate, type: 'RECHARGE' },
            _sum: { amount: true }, _count: { _all: true },
          }),
          this.prisma.stageFeeTxn.aggregate({
            where: { storeId, businessDate: targetDate, type: 'SESSION_DEDUCT' },
            _sum: { amount: true }, _count: { _all: true },
          }),
          this.prisma.stageFeeTxn.aggregate({
            where: { storeId, businessDate: targetDate, type: 'MANUAL_DEDUCT' },
            _sum: { amount: true }, _count: { _all: true },
          }),
          this.prisma.stageFeeTxn.aggregate({
            where: { storeId, businessDate: targetDate, type: 'REVERSE' },
            _sum: { amount: true }, _count: { _all: true },
          }),
          this.prisma.showSession.count({ where: { storeId, businessDate: targetDate } }),
          this.prisma.showSession.count({ where: { storeId, businessDate: targetDate, isCross: true } }),
          this.prisma.attendanceReport.groupBy({
            by: ['type'],
            where: { storeId, businessDate: targetDate },
            _count: { _all: true },
          }),
        ])

      // 明细和=汇总校验(10 号 §三;差异进 job_run_log stats)
      const allTxnAgg = await this.prisma.stageFeeTxn.aggregate({
        where: { storeId, businessDate: targetDate },
        _sum: { amount: true },
        _count: { _all: true },
      })
      const rechargeTotal = Number(rechargeAgg._sum.amount ?? 0)
      const sessionDeductTotal = Number(sessionDeductAgg._sum.amount ?? 0)
      const manualDeductTotal = Number(manualDeductAgg._sum.amount ?? 0)
      const reverseTotal = Number(reverseAgg._sum.amount ?? 0)
      const netTotal = Number(allTxnAgg._sum.amount ?? 0)
      const balanced =
        Math.round((rechargeTotal + sessionDeductTotal + manualDeductTotal + reverseTotal - netTotal) * 100) === 0

      const metrics = {
        rechargeTotal,
        rechargeCount: rechargeAgg._count._all,
        sessionDeductTotal,
        sessionDeductCount: sessionDeductAgg._count._all,
        manualDeductTotal,
        manualDeductCount: manualDeductAgg._count._all,
        reverseTotal,
        sessionCount,
        crossCount,
        attendance: Object.fromEntries(
          attendanceGroups.map((g) => [g.type, g._count._all]),
        ),
      }
      await this.prisma.dailySummary.upsert({
        where: { storeId_businessDate: { storeId, businessDate: targetDate } },
        update: { metrics },
        create: { storeId, businessDate: targetDate, metrics },
      })
      await this.prisma.jobRunLog.create({
        data: {
          jobName: 'day-cut-summary',
          businessDate: targetDate,
          status: balanced ? 'OK' : 'OK_WITH_DIFF',
          stats: { storeId, storeName, metrics, txnSumCheck: { netTotal, balanced } },
          startedAt,
          finishedAt: new Date(),
        },
      })
      this.logger.log('daily summary materialized: store=' + storeName + ' bd=' + target)
    } catch (err) {
      await this.prisma.jobRunLog.create({
        data: {
          jobName: 'day-cut-summary',
          businessDate: targetDate,
          status: 'FAILED',
          startedAt,
          finishedAt: new Date(),
          error: err instanceof Error ? err.message.slice(0, 1000) : String(err).slice(0, 1000),
        },
      }).catch(() => undefined)
      throw err
    }
  }
}
