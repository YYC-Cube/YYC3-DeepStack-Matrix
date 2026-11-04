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
import { snapshotReconSelf } from '../modules/report/report.module.js'

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

    // 双轨对账试点:上一营业日自算四指标自动快照(幂等:已有行即跳过;对侧值由人工录入后比对)
    const reconRows = await this.prisma.reconDiff.count({ where: { storeId, businessDate: targetDate } })
    if (reconRows === 0) {
      try {
        await snapshotReconSelf(this.prisma, storeId, target)
        this.logger.log('recon self snapshot: store=' + storeName + ' bd=' + target)
      } catch (err) {
        this.logger.warn('recon snapshot failed: ' + (err instanceof Error ? err.message : String(err)))
      }
    }

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
            where: { storeId, businessDate: targetDate, type: 'ROOM_SETTLE' },
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
      // 分账三向平衡(17 号;S2 挂接):按状态计提净额 vs 结算单合计,差额=未入结算 ACCRUED
      const splitGroup = await this.prisma.splitEntry.groupBy({
        by: ['status'],
        where: { storeId, businessDate: targetDate },
        _sum: { amount: true },
      })
      const splitBy: Record<string, number> = {}
      for (const g of splitGroup) splitBy[g.status] = Number(g._sum.amount ?? 0)
      const splitAccrued = splitBy['ACCRUED'] ?? 0
      const splitConfirmed = splitBy['CONFIRMED'] ?? 0
      const splitPaid = splitBy['PAID'] ?? 0
      const splitReversed = splitBy['REVERSED'] ?? 0
      const splitEntryNet = Math.round((splitAccrued + splitConfirmed + splitPaid + splitReversed) * 100) / 100
      const splitSettleAgg = await this.prisma.splitSettlement.aggregate({
        where: { storeId, createdAt: { gte: new Date(targetDate + 'T00:00:00'), lte: new Date(targetDate + 'T23:59:59') } },
        _sum: { amount: true },
      })
      const splitSettled = Math.round(Number(splitSettleAgg._sum.amount ?? 0) * 100) / 100
      const splitDiff = Math.round((splitEntryNet - splitSettled) * 100) / 100
      // 正式校验口径:已入结算部分(CONFIRMED+PAID)必须与结算单合计一致;ACCRUED 未入结算是正常待结算
      const splitBalanced =
        Math.round((splitConfirmed + splitPaid - splitSettled) * 100) === 0

      await this.prisma.jobRunLog.create({
        data: {
          jobName: 'day-cut-summary',
          businessDate: targetDate,
          status: balanced && splitBalanced ? 'OK' : balanced ? 'OK_SPLIT_DIFF' : 'OK_WITH_DIFF',
          stats: {
            storeId,
            storeName,
            metrics,
            txnSumCheck: { netTotal, balanced },
            splitCheck: { entryNet: splitEntryNet, settled: splitSettled, diff: splitDiff, balanced: splitBalanced },
          },
          startedAt,
          finishedAt: new Date(),
        },
      })
      // 对账差异告警(008 #5 深化-c):不平衡时自动发管理职级通告;幂等=同营业日同标题不重复
      if (!balanced || !splitBalanced) {
        const alertTitle = '日切对账差异告警(' + targetDate + ')'
        const dup = await this.prisma.notice.findFirst({
          where: { storeId, title: alertTitle, deletedAt: null },
        })
        if (dup === null) {
          const parts: string[] = []
          if (!balanced) parts.push('台费流水净额与明细校验差异:净额 ' + String(netTotal))
          if (!splitBalanced) {
            parts.push(
              '分账三向不平:已复核/已付 ' + String(splitConfirmed + splitPaid) +
              ' vs 结算单合计 ' + String(splitSettled) + '(差 ' + String(splitDiff) + ')',
            )
            // 深化-1:按对象聚合已复核/已付条目 vs 结算单,差值绝对值 top3 附表
            const entryByTarget = await this.prisma.splitEntry.groupBy({
              by: ['targetName'],
              where: { storeId, businessDate: targetDate, status: { in: ['CONFIRMED', 'PAID'] } },
              _sum: { amount: true },
            })
            const settleByTarget = await this.prisma.splitSettlement.groupBy({
              by: ['targetName'],
              where: { storeId, createdAt: { gte: new Date(targetDate + 'T00:00:00'), lte: new Date(targetDate + 'T23:59:59') } },
              _sum: { amount: true },
            })
            const settleMap = new Map(settleByTarget.map((g) => [g.targetName, Number(g._sum.amount ?? 0)]))
            const names = new Set<string>([...entryByTarget.map((g) => g.targetName), ...settleMap.keys()])
            const diffs: Array<{ name: string; diff: number }> = []
            for (const name of names) {
              const e = Number(entryByTarget.find((g) => g.targetName === name)?._sum.amount ?? 0)
              const s = settleMap.get(name) ?? 0
              const d = Math.round((e - s) * 100) / 100
              if (Math.round(d * 100) !== 0) diffs.push({ name: name ?? '(空)', diff: d })
            }
            diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
            for (const d of diffs.slice(0, 3)) {
              parts.push('差异条目:' + d.name + ' ' + String(d.diff))
            }
          }
          await this.prisma.notice.create({
            data: {
              storeId,
              title: alertTitle,
              body: parts.join(';') + '。请财务核对日切 job_run_log(stats.txnSumCheck/splitCheck)后处置;本通告由日切 job 自动生成。',
              publishedBy: 0,
              visibleTitles: 'VP,MANAGER_DIRECTOR,MANAGER',
              remind: true,
            },
          })
          this.logger.warn('recon diff alert notice created: bd=' + targetDate + ' splitBalanced=' + String(splitBalanced))
        }
      }
      this.logger.log(
        'daily summary materialized: store=' + storeName + ' bd=' + target +
        ' split(entryNet=' + String(splitEntryNet) + ' settled=' + String(splitSettled) + ' diff=' + String(splitDiff) + ')',
      )
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
