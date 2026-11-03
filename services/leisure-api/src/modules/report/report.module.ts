/**
 * 报表模块:7 张 MVP 报表(10-后端 §七)+ CSV 导出
 * 包厢维度(需求全集 §8.3):扣款明细/流水汇总/上下钟明细/上下钟汇总 四张含房号·房型列
 * 红线:营业日口径过滤(business_date);分页≤200;导出走 report:export,查看走各自域权限
 * 导出格式:CSV + UTF-8 BOM(Excel 直开;xlsx 真格式 II 期,04-API format 参数兼容)
 */
import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { resolveBusinessDate, shiftBusinessDate, REPORT_TYPES } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { toXlsx } from '../../common/utils/xlsx.js'

const MAX_RANGE_DAYS = 92
const RECON_METRICS = ['openCount', 'roomFee', 'orderTotal', 'checkedIn'] as const
/** 双轨切换门禁:连续完整营业日全 MATCHED 的天数 */
export const RECON_GATE_DAYS = 14

/* ── Service ── */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface SelfMetrics {
  openCount: number
  roomFee: number
  orderTotal: number
  checkedIn: number
}

/** 双轨自算指标(方案甲独立运营口径;与智慧商家日报对齐 4 项)——纯查询,供 Service 与日切 job 共用 */
export async function computeSelfMetrics(prisma: PrismaService, storeId: number, businessDate: string): Promise<SelfMetrics> {
  const bd = new Date(businessDate)
  const [rs, orders, checkin] = await Promise.all([
    prisma.roomSession.aggregate({
      where: { storeId, businessDate: bd },
      _count: { _all: true },
      _sum: { roomFee: true },
    }),
    prisma.roomSession.aggregate({
      where: { storeId, businessDate: bd },
      _sum: { orderTotal: true },
    }),
    // 签到人数:已通过审核的 CHECKIN 去重销售经理数(与对侧「签到(人)」口径一致;补打卡重复行不重复计)
    prisma.attendanceReport.findMany({
      where: { storeId, businessDate: bd, type: 'CHECKIN', reviewStatus: 'APPROVED' },
      distinct: ['artistId'],
      select: { artistId: true },
    }),
  ])
  return {
    openCount: rs._count._all,
    roomFee: round2(Number(rs._sum.roomFee ?? 0)),
    orderTotal: round2(Number(orders._sum.orderTotal ?? 0)),
    checkedIn: checkin.length,
  }
}

/**
 * 日切自动快照:把自算四指标写入 recon_diff(status=PENDING_LEGACY,待录对侧);
 * 已有行(对侧已录)则按新自算值重算 diff/status。幂等,日切 job 与手工均可调用。
 */
export async function snapshotReconSelf(prisma: PrismaService, storeId: number, businessDate: string): Promise<void> {
  const bd = new Date(businessDate)
  const self = await computeSelfMetrics(prisma, storeId, businessDate)
  const existing = await prisma.reconDiff.findMany({ where: { storeId, businessDate: bd } })
  const byMetric = new Map(existing.map((r) => [r.metric, r]))
  for (const key of RECON_METRICS) {
    const selfValue = round2(self[key])
    const cur = byMetric.get(key)
    if (cur === undefined) {
      await prisma.reconDiff.create({
        data: { storeId, businessDate: bd, metric: key, selfValue, legacyValue: 0, diff: selfValue, status: 'PENDING_LEGACY' },
      })
      continue
    }
    if (cur.status === 'PENDING_LEGACY') {
      await prisma.reconDiff.update({ where: { id: cur.id }, data: { selfValue, diff: selfValue } })
      continue
    }
    const legacyValue = Number(cur.legacyValue)
    const diff = round2(selfValue - legacyValue)
    const status = cur.status === 'EXPLAINED' ? 'EXPLAINED' : Math.abs(diff) < 0.01 ? 'MATCHED' : 'OPEN'
    await prisma.reconDiff.update({ where: { id: cur.id }, data: { selfValue, diff, status } })
  }
}

/** 单日总体:NO_DATA / PENDING_LEGACY / MATCHED / EXPLAINED(全部已解释或匹配) / OPEN */
function overallOf(statuses: string[]): string {
  if (statuses.length === 0) return 'NO_DATA'
  if (statuses.some((s) => s === 'PENDING_LEGACY')) return 'PENDING_LEGACY'
  if (statuses.every((s) => s === 'MATCHED')) return 'MATCHED'
  if (statuses.every((s) => s === 'MATCHED' || s === 'EXPLAINED')) return 'EXPLAINED'
  return 'OPEN'
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** 区间规整:默认上一营业日至当前营业日?——实测口径默认当日;上限 92 天防拖库 */
  normRange(from?: string, to?: string): { from: Date; to: Date; fromStr: string; toStr: string } {
    const cut = env().BUSINESS_DAY_CUT
    const fromStr = from !== undefined && from !== '' ? from : resolveBusinessDate(new Date(), { cutTime: cut })
    const toStr = to !== undefined && to !== '' ? to : fromStr
    const days = (new Date(toStr).getTime() - new Date(fromStr).getTime()) / 86_400_000
    if (days > MAX_RANGE_DAYS) {
      // 静态文案;超限拒绝
      throw new RangeError('查询区间过长(上限 92 天)')
    }
    return { from: new Date(fromStr), to: new Date(toStr), fromStr, toStr }
  }

  async storeCutOf(storeId: number): Promise<string> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    return store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
  }

  /* ── 1. 台费扣款明细(§8.3 含包厢维度:关联场次房号/房型) ── */
  /** 双轨自算指标(方案甲独立运营口径;与智慧商家日报对齐 4 项) */
  async selfMetrics(storeId: number, businessDate: string): Promise<SelfMetrics> {
    return computeSelfMetrics(this.prisma, storeId, businessDate)
  }

  /** 双轨导入:录对侧(智慧商家)日报值 → 逐指标 upsert 差异行 */
  async importLegacy(
    storeId: number,
    businessDate: string,
    metrics: Record<string, number>,
    operatorId?: number,
  ): Promise<{ rows: Array<{ metric: string; selfValue: number; legacyValue: number; diff: number; status: string }> }> {
    const bd = new Date(businessDate)
    const self = await this.selfMetrics(storeId, businessDate)
    const out: Array<{ metric: string; selfValue: number; legacyValue: number; diff: number; status: string }> = []
    for (const key of ['openCount', 'roomFee', 'orderTotal', 'checkedIn'] as const) {
      const selfValue = round2(self[key])
      const legacyValue = round2(Number(metrics[key] ?? 0))
      const diff = round2(selfValue - legacyValue)
      const status = Math.abs(diff) < 0.01 ? 'MATCHED' : 'OPEN'
      await this.prisma.reconDiff.upsert({
        where: { storeId_businessDate_metric: { storeId, businessDate: bd, metric: key } },
        update: { selfValue, legacyValue, diff, status },
        create: {
          storeId,
          businessDate: bd,
          metric: key,
          selfValue,
          legacyValue,
          diff,
          status,
        },
      })
      out.push({ metric: key, selfValue, legacyValue, diff, status })
    }
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId ?? null,
        action: 'RECON_LEGACY_IMPORT',
        targetType: 'recon_diff',
        targetId: businessDate,
        afterJson: out as unknown as object,
      },
    })
    return { rows: out }
  }

  /** 双轨查询:差异行 + 总体状态(全 MATCHED 才过 14 天门禁的一天) */
  async reconList(storeId: number, businessDate: string): Promise<{
    rows: Array<{ metric: string; selfValue: number; legacyValue: number; diff: number; status: string }>
    overall: string
    selfMetrics: SelfMetrics
  }> {
    const bd = new Date(businessDate)
    const selfMetrics = await this.selfMetrics(storeId, businessDate)
    const rows = await this.prisma.reconDiff.findMany({
      where: { storeId, businessDate: bd },
      orderBy: { metric: 'asc' },
    })
    const overall = overallOf(rows.map((r) => r.status))
    return {
      rows: rows.map((r) => ({
        metric: r.metric,
        selfValue: Number(r.selfValue),
        legacyValue: Number(r.legacyValue),
        diff: Number(r.diff),
        status: r.status,
      })),
      overall,
      selfMetrics,
    }
  }

  /** 手工触发当日自算快照(日切 job 会自动做;试点首日/补录用) */
  async reconSnapshot(storeId: number, businessDate: string, operatorId?: number): Promise<{ snapshotted: true }> {
    await snapshotReconSelf(this.prisma, storeId, businessDate)
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId ?? null,
        action: 'RECON_SELF_SNAPSHOT',
        targetType: 'recon_diff',
        targetId: businessDate,
      },
    })
    return { snapshotted: true }
  }

  /**
   * 14 天门禁视图:近 N 个营业日(含今日,今日标 complete=false)逐日总体 + 连续 MATCHED 天数(自昨日往前数完整日)
   * gatePassed = streak ≥ RECON_GATE_DAYS
   */
  async reconHistory(storeId: number, days: number): Promise<{
    days: Array<{ businessDate: string; overall: string; complete: boolean; matched: number; total: number }>
    streak: number
    gateDays: number
    gatePassed: boolean
    currentBusinessDate: string
  }> {
    const n = Math.min(Math.max(days, 1), 60)
    const cut = await this.storeCutOf(storeId)
    const current = resolveBusinessDate(new Date(), { cutTime: cut })
    const dates: string[] = []
    for (let i = n - 1; i >= 0; i--) dates.push(shiftBusinessDate(current, -i))
    const rows = await this.prisma.reconDiff.findMany({
      where: { storeId, businessDate: { gte: new Date(dates[0] ?? current), lte: new Date(current) } },
      select: { businessDate: true, status: true },
    })
    const byDate = new Map<string, string[]>()
    for (const r of rows) {
      const key = r.businessDate.toISOString().slice(0, 10)
      const list = byDate.get(key) ?? []
      list.push(r.status)
      byDate.set(key, list)
    }
    const out = dates.map((d) => {
      const statuses = byDate.get(d) ?? []
      return {
        businessDate: d,
        overall: overallOf(statuses),
        complete: d < current,
        matched: statuses.filter((s) => s === 'MATCHED').length,
        total: statuses.length,
      }
    })
    // 连续 MATCHED:从最近一个完整日往前数
    let streak = 0
    for (let i = out.length - 1; i >= 0; i--) {
      const d = out[i]
      if (d === undefined || !d.complete) continue
      if (d.overall === 'MATCHED') streak += 1
      else break
    }
    return { days: out, streak, gateDays: RECON_GATE_DAYS, gatePassed: streak >= RECON_GATE_DAYS, currentBusinessDate: current }
  }

  async deductDetail(storeId: number, q: { from: Date; to: Date }, groupId?: number) {
    const txns = await this.prisma.stageFeeTxn.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, type: 'ROOM_SETTLE', groupId },
      orderBy: { id: 'asc' },
    })
    const refIds = txns.map((t) => t.refId).filter((v): v is number => v !== null)
    const sessions = await this.prisma.showSession.findMany({
      where: { id: { in: refIds } },
      select: { id: true, roomName: true, roomTypeId: true },
    })
    const roomTypes = await this.prisma.roomType.findMany({ where: { storeId }, select: { id: true, name: true } })
    const rtName = new Map(roomTypes.map((r) => [r.id, r.name]))
    const sessMap = new Map(sessions.map((s) => [s.id, s]))
    return txns.map((t) => {
      const sess = t.refId !== null ? sessMap.get(t.refId) : undefined
      return {
        businessDate: t.businessDate,
        stageName: t.stageName,
        badgeNo: t.badgeNo,
        amount: Number(t.amount),
        roomName: sess?.roomName ?? '—',
        roomTypeName: sess?.roomTypeId !== undefined && sess?.roomTypeId !== null ? (rtName.get(sess.roomTypeId) ?? '—') : '—',
        refSessionId: t.refId,
        createdAt: t.createdAt,
      }
    })
  }

  /* ── 2. 台费充值报表 ── */
  async rechargeReport(storeId: number, q: { from: Date; to: Date }, groupId?: number) {
    const txns = await this.prisma.stageFeeTxn.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, type: 'RECHARGE', groupId },
      orderBy: { id: 'asc' },
    })
    return txns.map((t) => ({
      businessDate: t.businessDate,
      stageName: t.stageName,
      badgeNo: t.badgeNo,
      amount: Number(t.amount),
      payChannel: t.payChannel === 'CASH' ? '现金' : (t.payChannel ?? '—'),
      createdAt: t.createdAt,
    }))
  }

  /* ── 9/10. 台票购买/使用明细(§8.2 补齐;含规则名/渠道/关联场次) ── */
  async ticketPurchaseReport(storeId: number, q: { from: Date; to: Date }) {
    const txns = await this.prisma.ticketTxn.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, type: 'BUY' },
      orderBy: { id: 'asc' },
      include: { artist: { select: { stageName: true, badgeNo: true } } },
    })
    const ruleIds = Array.from(new Set(txns.map((t) => t.ticketRuleId)))
    const rules = ruleIds.length > 0
      ? await this.prisma.ticketRule.findMany({ where: { id: { in: ruleIds } }, select: { id: true, name: true } })
      : []
    const ruleName = new Map(rules.map((r) => [r.id, r.name]))
    return {
      rows: txns.map((t) => ({
        businessDate: t.businessDate,
        stageName: t.artist.stageName,
        badgeNo: t.artist.badgeNo,
        ruleName: ruleName.get(t.ticketRuleId) ?? String(t.ticketRuleId),
        qty: t.qty,
        amount: Number(t.amount),
        payChannel: t.payChannel ?? '—',
        operatorId: t.operatorId,
        createdAt: t.createdAt,
      })),
    }
  }

  async ticketUseReport(storeId: number, q: { from: Date; to: Date }) {
    const txns = await this.prisma.ticketTxn.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, type: 'USE' },
      orderBy: { id: 'asc' },
      include: { artist: { select: { stageName: true, badgeNo: true } } },
    })
    const ruleIds = Array.from(new Set(txns.map((t) => t.ticketRuleId)))
    const rules = ruleIds.length > 0
      ? await this.prisma.ticketRule.findMany({ where: { id: { in: ruleIds } }, select: { id: true, name: true } })
      : []
    const ruleName = new Map(rules.map((r) => [r.id, r.name]))
    return {
      rows: txns.map((t) => ({
        businessDate: t.businessDate,
        stageName: t.artist.stageName,
        badgeNo: t.artist.badgeNo,
        ruleName: ruleName.get(t.ticketRuleId) ?? String(t.ticketRuleId),
        qty: t.qty,
        refSessionId: t.refSessionId,
        operatorId: t.operatorId,
        createdAt: t.createdAt,
      })),
    }
  }

  /* ── 3. 台费流水汇总(按销售经理;§8.3 含包厢维度=涉及包厢聚合列) ── */
  async feeSummary(storeId: number, q: { from: Date; to: Date }, groupId?: number) {
    const txns = await this.prisma.stageFeeTxn.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, groupId },
      select: { artistId: true, stageName: true, badgeNo: true, type: true, amount: true },
    })
    const sessions = await this.prisma.showSession.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to } },
      select: { artistId: true, roomName: true },
    })
    const roomsByArtist = new Map<number, Set<string>>()
    for (const s of sessions) {
      if (s.roomName === null) continue
      const set = roomsByArtist.get(s.artistId) ?? new Set<string>()
      set.add(s.roomName)
      roomsByArtist.set(s.artistId, set)
    }
    const byArtist = new Map<number, { stageName: string | null; badgeNo: string | null; recharge: number; deduct: number; reverse: number }>()
    for (const t of txns) {
      const row = byArtist.get(t.artistId) ?? {
        stageName: t.stageName,
        badgeNo: t.badgeNo,
        recharge: 0,
        deduct: 0,
        reverse: 0,
      }
      const amt = Number(t.amount)
      if (t.type === 'RECHARGE') row.recharge += amt
      else if (t.type === 'ROOM_SETTLE' || t.type === 'MANUAL_DEDUCT') row.deduct += amt
      else if (t.type === 'REVERSE') row.reverse += amt
      byArtist.set(t.artistId, row)
    }
    return [...byArtist.entries()].map(([artistId, r]) => ({
      artistId,
      stageName: r.stageName,
      badgeNo: r.badgeNo,
      recharge: Math.round(r.recharge * 100) / 100,
      deduct: Math.round(r.deduct * 100) / 100,
      reverse: Math.round(r.reverse * 100) / 100,
      net: Math.round((r.recharge + r.deduct + r.reverse) * 100) / 100,
      rooms: [...(roomsByArtist.get(artistId) ?? [])].join(' / ') || '—',
    }))
  }

  /* ── 4. 报备明细 ── */
  async attendanceDetail(storeId: number, q: { from: Date; to: Date }, groupId?: number, type?: string) {
    const rows = await this.prisma.attendanceReport.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, groupId, type },
      orderBy: { reportTime: 'asc' },
      include: { artist: { select: { stageName: true, badgeNo: true } } },
    })
    const label = new Map(REPORT_TYPES.map((t) => [t.code as string, t.label]))
    return rows.map((r) => ({
      businessDate: r.businessDate,
      stageName: r.artist.stageName,
      badgeNo: r.artist.badgeNo,
      type: label.get(r.type) ?? r.type,
      reportTime: r.reportTime,
      checkoutTime: r.checkoutTime,
      geoOk: r.checkinGeoOk,
    }))
  }

  /* ── 5. 报备汇总(组别×主管矩阵;口径与 attendance/summary 一致) ── */
  async attendanceSummary(storeId: number, bd: string) {
    const target = new Date(bd)
    const [rows, artists] = await Promise.all([
      this.prisma.attendanceReport.groupBy({
        by: ['groupId', 'supervisorName', 'type'],
        where: { storeId, businessDate: target },
        _count: { _all: true },
      }),
      this.prisma.artist.findMany({
        where: { storeId, deletedAt: null },
        select: { groupId: true, supervisorName: true },
      }),
    ])
    const groups = await this.prisma.artistGroup.findMany({ where: { storeId, deletedAt: null }, select: { id: true, name: true } })
    const gName = new Map(groups.map((g) => [g.id, g.name]))
    const keyOf = (g: number | null, s: string | null): string => String(g ?? 0) + '|' + String(s ?? '')
    const buckets = new Map<string, { groupId: number; groupName: string; supervisorName: string; counts: Map<string, number>; total: number; members: number }>()
    for (const a of artists) {
      const k = keyOf(a.groupId, a.supervisorName)
      const b = buckets.get(k) ?? {
        groupId: a.groupId ?? 0,
        groupName: a.groupId !== null ? (gName.get(a.groupId) ?? String(a.groupId)) : '未分组',
        supervisorName: a.supervisorName ?? '',
        counts: new Map<string, number>(),
        total: 0,
        members: 0,
      }
      b.members += 1
      buckets.set(k, b)
    }
    for (const r of rows) {
      const k = keyOf(r.groupId, r.supervisorName)
      const b = buckets.get(k)
      if (b === undefined) continue
      b.counts.set(r.type, (b.counts.get(r.type) ?? 0) + r._count._all)
      b.total += r._count._all
    }
    const out = [...buckets.values()].map((b) => ({
      groupName: b.groupName,
      supervisorName: b.supervisorName,
      members: b.members,
      weibao: Math.max(0, b.members - b.total),
      peiban: b.counts.get('PEIBAN') ?? 0,
      checkin: b.counts.get('CHECKIN') ?? 0,
      sishi: b.counts.get('SISHI') ?? 0,
      zaotui: b.counts.get('ZAOTUI') ?? 0,
      chidao: b.counts.get('CHIDAO') ?? 0,
      lijia: b.counts.get('LIJIA') ?? 0,
      qita: b.counts.get('QITA') ?? 0,
      total: b.total,
    }))
    return out
  }

  /* ── 6. 上下钟明细(§8.3 含房号/房型/计费小时/单价) ── */
  async sessionDetail(storeId: number, q: { from: Date; to: Date }, groupId?: number) {
    const rows = await this.prisma.showSession.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to } },
      orderBy: { startAt: 'asc' },
    })
    const artistIds = [...new Set(rows.map((r) => r.artistId))]
    const artists = await this.prisma.artist.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, stageName: true, badgeNo: true, groupId: true },
    })
    const roomTypes = await this.prisma.roomType.findMany({ where: { storeId }, select: { id: true, name: true } })
    const aMap = new Map(artists.map((a) => [a.id, a]))
    const rtName = new Map(roomTypes.map((r) => [r.id, r.name]))
    return rows
      .filter((r) => groupId === undefined || aMap.get(r.artistId)?.groupId === groupId)
      .map((r) => {
        const a = aMap.get(r.artistId)
        return {
          businessDate: r.businessDate,
          stageName: a?.stageName ?? null,
          badgeNo: a?.badgeNo ?? null,
          roomName: r.roomName,
          roomTypeName: r.roomTypeId !== null ? (rtName.get(r.roomTypeId) ?? '—') : '—',
          startAt: r.startAt,
          endAt: r.endAt,
          durationMinutes: r.durationMinutes,
          billHours: r.billHours,
          unitPrice: r.unitPrice !== null ? Number(r.unitPrice) : null,
          feeAmount: r.feeAmount !== null ? Number(r.feeAmount) : null,
          isCross: r.isCross,
        }
      })
  }

  /* ── 7. 上下钟汇总(按销售经理;§8.3 含包厢聚合列) ── */
  async sessionSummary(storeId: number, q: { from: Date; to: Date }, groupId?: number) {
    const byArtist = new Map<number, {
      stageName: string | null
      badgeNo: string | null
      count: number
      minutes: number
      fee: number
      rooms: Set<string>
    }>()
    const rows = await this.prisma.showSession.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to } },
      select: { artistId: true, durationMinutes: true, feeAmount: true, roomName: true },
    })
    const artists = await this.prisma.artist.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.artistId))] } },
      select: { id: true, stageName: true, badgeNo: true, groupId: true },
    })
    const aMap = new Map(artists.map((a) => [a.id, a]))
    for (const r of rows) {
      const a = aMap.get(r.artistId)
      if (a === undefined) continue
      if (groupId !== undefined && a.groupId !== groupId) continue
      const b = byArtist.get(r.artistId) ?? {
        stageName: a.stageName,
        badgeNo: a.badgeNo,
        count: 0,
        minutes: 0,
        fee: 0,
        rooms: new Set<string>(),
      }
      b.count += 1
      b.minutes += r.durationMinutes ?? 0
      b.fee += r.feeAmount !== null ? Number(r.feeAmount) : 0
      if (r.roomName !== null) b.rooms.add(r.roomName)
      byArtist.set(r.artistId, b)
    }
    return [...byArtist.entries()].map(([artistId, b]) => ({
      artistId,
      stageName: b.stageName,
      badgeNo: b.badgeNo,
      count: b.count,
      totalMinutes: b.minutes,
      totalFee: Math.round(b.fee * 100) / 100,
      rooms: [...b.rooms].join(' / ') || '—',
    }))
  }

  /* ── 8. 主管轮台报表:按主管/组别/销售经理统计被派次数与按序/越序(公平性考核;数据源 dispatch_log) ── */
  async dispatchRotation(storeId: number, q: { from: Date; to: Date }, groupId?: number): Promise<Array<{
    supervisorName: string
    groupId: number | null
    artistId: number
    stageName: string | null
    badgeNo: string | null
    dispatches: number
    suggested: number
    overridden: number
    lastDispatchAt: string
  }>> {
    const logs = await this.prisma.dispatchLog.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, ...(groupId !== undefined ? { groupId } : {}) },
      include: { artist: { select: { stageName: true, badgeNo: true } } },
      orderBy: { id: 'asc' },
    })
    const byArtist = new Map<number, {
      supervisorName: string
      groupId: number | null
      stageName: string | null
      badgeNo: string | null
      dispatches: number
      suggested: number
      overridden: number
      last: Date
    }>()
    for (const l of logs) {
      const cur = byArtist.get(l.artistId) ?? {
        supervisorName: l.supervisorName ?? '',
        groupId: l.groupId,
        stageName: l.artist.stageName,
        badgeNo: l.artist.badgeNo,
        dispatches: 0,
        suggested: 0,
        overridden: 0,
        last: l.createdAt,
      }
      cur.dispatches += 1
      if (l.suggested) cur.suggested += 1
      if (l.overridden) cur.overridden += 1
      if (l.createdAt > cur.last) cur.last = l.createdAt
      byArtist.set(l.artistId, cur)
    }
    return [...byArtist.entries()]
      .map(([artistId, b]) => ({
        supervisorName: b.supervisorName,
        groupId: b.groupId,
        artistId,
        stageName: b.stageName,
        badgeNo: b.badgeNo,
        dispatches: b.dispatches,
        suggested: b.suggested,
        overridden: b.overridden,
        lastDispatchAt: b.last.toISOString(),
      }))
      .sort((a, b) => a.supervisorName.localeCompare(b.supervisorName) || b.dispatches - a.dispatches)
  }
}

/* ── CSV 助手(UTF-8 BOM;引号转义) ── */

function toCsv(headers: string[], rows: Array<Array<string | number | null | boolean | Date>>): string {
  const esc = (v: string | number | null | boolean | Date): string => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))]
  return '\uFEFF' + lines.join('\r\n')
}

/* ── Controller ── */

@Controller('reports')
export class ReportController {
  constructor(private readonly svc: ReportService) {}

  /** 双轨对账:查询(差异矩阵+总体) */
  @Get('recon')
  async recon(
    @Req() req: Request,
    @Query('businessDate') businessDate: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.reconList(user?.storeId ?? 1, businessDate)
  }

  /** 双轨对账:导入对侧日报(录 legacy 值并即时比对) */
  @Post('recon/legacy')
  async importLegacy(
    @Req() req: Request,
    @Body() body: { businessDate: string; metrics: Record<string, number> },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.importLegacy(user?.storeId ?? 1, body.businessDate, body.metrics, user?.sub)
  }

  /** 双轨对账:手工触发自算快照(日切 job 自动做;首日/补录用) */
  @Post('recon/snapshot')
  async reconSnapshot(@Req() req: Request, @Body() body: { businessDate: string }): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.reconSnapshot(user?.storeId ?? 1, body.businessDate, user?.sub)
  }

  /** 双轨对账:14 天门禁视图(逐日总体 + 连续 MATCHED 天数) */
  @Get('recon/history')
  async reconHistory(@Req() req: Request, @Query('days') days?: string): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.reconHistory(user?.storeId ?? 1, Number(days ?? 14))
  }

  /** 通用:查询或 CSV 导出(导出经 @Res 直写,绕过 JSON 信封) */
  private async send(
    res: Response,
    permView: string,
    name: string,
    q: { format?: string; businessDateFrom?: string; businessDateTo?: string; groupId?: string; type?: string },
    handler: (storeId: number, range: { from: Date; to: Date }, groupId?: number, type?: string) => Promise<unknown>,
    headers: string[],
    pickRows: (data: unknown) => Array<Array<string | number | null | boolean | Date>>,
    req: Request,
  ): Promise<void> {
    const user = (req as ReqWithUser).user
    const storeId = user?.storeId ?? 1
    const range = this.svc.normRange(q.businessDateFrom, q.businessDateTo)
    const groupId = q.groupId !== undefined && q.groupId !== '' ? Number(q.groupId) : undefined
    if (q.format === 'csv' || q.format === 'xlsx') {
      const data = await handler(storeId, range, groupId, q.type)
      if (q.format === 'csv') {
        const csv = toCsv(headers, pickRows(data))
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename=' + name + '-' + range.fromStr + '_' + range.toStr + '.csv')
        res.send(csv)
        return
      }
      const buf = toXlsx([{ name, rows: [headers, ...pickRows(data)] }])
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename=' + name + '-' + range.fromStr + '_' + range.toStr + '.xlsx')
      res.send(buf)
      return
    }
    void permView
    const data = await handler(storeId, range, groupId, q.type)
    res.json({ code: 0, msg: 'ok', data })
  }

  /** 1. 台费扣款明细(§8.3 含包厢维度) */
  @RequirePerm('fee:ledger:view')
  @Get('stage-fee/deduct-detail')
  async deductDetail(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'fee:ledger:view', 'stage-fee-deduct-detail', { format, businessDateFrom: from, businessDateTo: to, groupId }, (s, r, g) =>
      this.svc.deductDetail(s, r, g),
      ['营业日', '艺名', '腰牌号', '金额', '包厢房号', '包厢类型', '关联场次', '时间'],
      (d) => (d as Awaited<ReturnType<ReportService['deductDetail']>>).map((r) => [r.businessDate, r.stageName, r.badgeNo, r.amount, r.roomName, r.roomTypeName, r.refSessionId, r.createdAt]),
      req,
    )
  }

  /** 9. 台票购买明细(§8.2 补齐;json/csv/xlsx) */
  @RequirePerm('ticket:ledger:view')
  @Get('tickets/purchase')
  async ticketPurchase(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'ticket:ledger:view', 'ticket-purchase', { format, businessDateFrom: from, businessDateTo: to }, (s, r) =>
      this.svc.ticketPurchaseReport(s, r),
      ['营业日', '艺名', '腰牌号', '票种', '数量', '金额', '收费通道', '操作员', '时间'],
      (d) =>
        (d as Awaited<ReturnType<ReportService['ticketPurchaseReport']>>).rows.map((r) => [
          r.businessDate, r.stageName, r.badgeNo, r.ruleName, r.qty, r.amount, r.payChannel, r.operatorId, r.createdAt,
        ]),
      req,
    )
  }

  /** 10. 台票使用明细(§8.2 补齐;json/csv/xlsx) */
  @RequirePerm('ticket:ledger:view')
  @Get('tickets/use')
  async ticketUse(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'ticket:ledger:view', 'ticket-use', { format, businessDateFrom: from, businessDateTo: to }, (s, r) =>
      this.svc.ticketUseReport(s, r),
      ['营业日', '艺名', '腰牌号', '票种', '数量', '关联场次', '操作员', '时间'],
      (d) =>
        (d as Awaited<ReturnType<ReportService['ticketUseReport']>>).rows.map((r) => [
          r.businessDate, r.stageName, r.badgeNo, r.ruleName, r.qty, r.refSessionId, r.operatorId, r.createdAt,
        ]),
      req,
    )
  }

  /** 2. 台费充值报表 */
  @RequirePerm('fee:ledger:view')
  @Get('stage-fee/recharge')
  async recharge(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'fee:ledger:view', 'stage-fee-recharge', { format, businessDateFrom: from, businessDateTo: to, groupId }, (s, r, g) =>
      this.svc.rechargeReport(s, r, g),
      ['营业日', '艺名', '腰牌号', '金额', '渠道', '时间'],
      (d) => (d as Awaited<ReturnType<ReportService['rechargeReport']>>).map((r) => [r.businessDate, r.stageName, r.badgeNo, r.amount, r.payChannel, r.createdAt]),
      req,
    )
  }

  /** 3. 台费流水汇总(§8.3 含包厢维度) */
  @RequirePerm('fee:ledger:view')
  @Get('stage-fee/summary')
  async feeSummary(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'fee:ledger:view', 'stage-fee-summary', { format, businessDateFrom: from, businessDateTo: to, groupId }, (s, r, g) =>
      this.svc.feeSummary(s, r, g),
      ['艺名', '腰牌号', '充值', '扣费', '冲正', '净额', '涉及包厢'],
      (d) => (d as Awaited<ReturnType<ReportService['feeSummary']>>).map((r) => [r.stageName, r.badgeNo, r.recharge, r.deduct, r.reverse, r.net, r.rooms]),
      req,
    )
  }

  /** 4. 报备明细 */
  @RequirePerm('attend:ledger:view')
  @Get('attendance/detail')
  async attendanceDetail(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('type') type?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'attend:ledger:view', 'attendance-detail', { format, businessDateFrom: from, businessDateTo: to, groupId, type }, (s, r, g, t) =>
      this.svc.attendanceDetail(s, r, g, t),
      ['营业日', '艺名', '腰牌号', '类型', '报备时间', '签退时间', '定位可用'],
      (d) => (d as Awaited<ReturnType<ReportService['attendanceDetail']>>).map((r) => [r.businessDate, r.stageName, r.badgeNo, r.type, r.reportTime, r.checkoutTime, r.geoOk]),
      req,
    )
  }

  /** 5. 报备汇总(营业日单日矩阵) */
  @RequirePerm('attend:summary:view')
  @Get('attendance/summary')
  async attendanceSummary(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDate') bd?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    const user = (req as ReqWithUser).user
    const storeId = user?.storeId ?? 1
    const cut = await this.svc.storeCutOf(storeId)
    const day = bd !== undefined && bd !== '' ? bd : resolveBusinessDate(new Date(), { cutTime: cut })
    if (format === 'csv') {
      const rows = await this.svc.attendanceSummary(storeId, day)
      const csv = toCsv(
        ['组别', '主管', '在册', '未报备', '陪宴', '签到', '私事', '早退', '迟到', '例假', '其他', '合计'],
        rows.map((r) => [r.groupName, r.supervisorName, r.members, r.weibao, r.peiban, r.checkin, r.sishi, r.zaotui, r.chidao, r.lijia, r.qita, r.total]),
      )
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-summary-' + day + '.csv')
      res.send(csv)
      return
    }
    res.json({ code: 0, msg: 'ok', data: { businessDate: day, rows: await this.svc.attendanceSummary(storeId, day) } })
  }

  /** 6. 上下钟明细(§8.3 含包厢维度) */
  @RequirePerm('session:view')
  @Get('session/detail')
  async sessionDetail(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'session:view', 'session-detail', { format, businessDateFrom: from, businessDateTo: to, groupId }, (s, r, g) =>
      this.svc.sessionDetail(s, r, g),
      ['营业日', '艺名', '腰牌号', '包厢房号', '包厢类型', '上钟', '下钟', '时长(分)', '计费小时', '单价', '台费', '串台'],
      (d) => (d as Awaited<ReturnType<ReportService['sessionDetail']>>).map((r) => [r.businessDate, r.stageName, r.badgeNo, r.roomName, r.roomTypeName, r.startAt, r.endAt, r.durationMinutes, r.billHours, r.unitPrice, r.feeAmount, r.isCross]),
      req,
    )
  }

  /** 7. 上下钟汇总(§8.3 含包厢维度) */
  @RequirePerm('session:view')
  @Get('session/summary')
  async sessionSummary(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'session:view', 'session-summary', { format, businessDateFrom: from, businessDateTo: to, groupId }, (s, r, g) =>
      this.svc.sessionSummary(s, r, g),
      ['艺名', '腰牌号', '上钟次数', '总时长(分)', '总台费', '涉及包厢'],
      (d) => (d as Awaited<ReturnType<ReportService['sessionSummary']>>).map((r) => [r.stageName, r.badgeNo, r.count, r.totalMinutes, r.totalFee, r.rooms]),
      req,
    )
  }

  /* ── 8. 主管轮台报表(需求全集 §8.2 第 8 张;数据源 dispatch_log,销售经理设置⑧) ── */
  @Get('dispatch-rotation')
  async dispatchRotation(
    @Req() req: Request,
    @Res() res: Response,
    @Query('businessDateFrom') from?: string,
    @Query('businessDateTo') to?: string,
    @Query('groupId') groupId?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    await this.send(res, 'session:view', 'dispatch-rotation', { format, businessDateFrom: from, businessDateTo: to, groupId }, (s, r, g) =>
      this.svc.dispatchRotation(s, r, g),
      ['主管', '组别', '艺名', '腰牌号', '被派次数', '按序派单', '越序派单', '最近派单'],
      (d) => (d as Awaited<ReturnType<ReportService['dispatchRotation']>>).map((r) => [
        r.supervisorName, r.groupId, r.stageName, r.badgeNo, r.dispatches, r.suggested, r.overridden, r.lastDispatchAt,
      ]),
      req,
    )
  }
}

@Module({
  controllers: [ReportController],
  providers: [ReportService, PrismaService],
})
export class ReportModule {}
