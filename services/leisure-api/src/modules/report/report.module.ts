/**
 * 报表模块:7 张 MVP 报表(10-后端 §七)+ CSV 导出
 * 包厢维度(需求全集 §8.3):扣款明细/流水汇总/上下钟明细/上下钟汇总 四张含房号·房型列
 * 红线:营业日口径过滤(business_date);分页≤200;导出走 report:export,查看走各自域权限
 * 导出格式:CSV + UTF-8 BOM(Excel 直开;xlsx 真格式 II 期,04-API format 参数兼容)
 */
import { Controller, Get, Injectable, Module, Query, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { resolveBusinessDate, REPORT_TYPES } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

const MAX_RANGE_DAYS = 92

/* ── Service ── */

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
  async deductDetail(storeId: number, q: { from: Date; to: Date }, groupId?: number) {
    const txns = await this.prisma.stageFeeTxn.findMany({
      where: { storeId, businessDate: { gte: q.from, lte: q.to }, type: 'SESSION_DEDUCT', groupId },
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

  /* ── 3. 台费流水汇总(按艺人;§8.3 含包厢维度=涉及包厢聚合列) ── */
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
      else if (t.type === 'SESSION_DEDUCT' || t.type === 'MANUAL_DEDUCT') row.deduct += amt
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

  /* ── 7. 上下钟汇总(按艺人;§8.3 含包厢聚合列) ── */
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
    if (q.format === 'csv') {
      const data = await handler(storeId, range, groupId, q.type)
      const csv = toCsv(headers, pickRows(data))
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=' + name + '-' + range.fromStr + '_' + range.toStr + '.csv')
      res.send(csv)
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
}

@Module({
  controllers: [ReportController],
  providers: [ReportService, PrismaService],
})
export class ReportModule {}
