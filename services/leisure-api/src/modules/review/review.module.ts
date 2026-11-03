/**
 * 服务评价模块(III 期起步):客人对销售经理的服务评价——前台代录/扫码评价落库,管理端查看与统计
 * 实测依据:App「服务评价」+ PC 列表(评价类型/评分/内容/评价人);需求全集 §9
 * 红线:评价只增不改不删(与流水同纪律;争议走备注/审计),统计按营业日区间
 */
import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { IsInt, IsISO8601, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import type { Request } from 'express'
import { resolveBusinessDate } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

/* ── DTO ── */

class CreateReviewDto {
  @IsInt()
  artistId!: number
  /** 评价类型(服务/形象/才艺/综合…;门店自定义文案,≤32) */
  @IsString()
  @Length(1, 32)
  reviewType!: string
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number
  @IsOptional()
  @IsString()
  @Length(0, 500)
  content?: string
  /** 评价人(客人称呼/房号/手机尾号;可空=匿名) */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  reviewer?: string
  /** 评价发生时刻(ISO);缺省=现在(营业日按门店日切解析) */
  @IsOptional()
  @IsISO8601()
  at?: string
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export interface ReviewSummary {
  count: number
  avgScore: number
  dist: Record<'1' | '2' | '3' | '4' | '5', number>
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseDateOrThrow(s: string | undefined, name: string): Date {
  if (s === undefined || s === '') {
    throw new NotFoundException(name + ' 必填(YYYY-MM-DD)')
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    throw new NotFoundException(name + ' 日期格式错误')
  }
  return d
}

/* ── Service ── */

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    storeId: number,
    q: {
      businessDateFrom: string
      businessDateTo: string
      artistId?: number
      reviewType?: string
      minScore?: number
      keyword?: string
      page: number
      pageSize: number
    },
  ): Promise<{ rows: unknown[]; total: number; summary: ReviewSummary; page: number; pageSize: number }> {
    const from = parseDateOrThrow(q.businessDateFrom, 'businessDateFrom')
    const to = parseDateOrThrow(q.businessDateTo, 'businessDateTo')
    const page = q.page > 0 ? q.page : 1
    const pageSize = q.pageSize > 0 ? Math.min(q.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
    const keyword = q.keyword?.trim() ?? ''
    const where = {
      storeId,
      businessDate: { gte: from, lte: to },
      ...(q.artistId !== undefined ? { artistId: q.artistId } : {}),
      ...(q.reviewType !== undefined && q.reviewType !== '' ? { reviewType: q.reviewType } : {}),
      ...(q.minScore !== undefined ? { score: { gte: q.minScore } } : {}),
      ...(keyword !== ''
        ? {
            OR: [
              { content: { contains: keyword } },
              { reviewer: { contains: keyword } },
              { artist: { OR: [{ stageName: { contains: keyword } }, { badgeNo: { contains: keyword } }] } },
            ],
          }
        : {}),
    }
    // 只读统计:groupBy 不进 $transaction 元组(Prisma 在元组内丢失 by/_count 字面量类型)
    const [rows, total, scored] = await Promise.all([
      this.prisma.artistReview.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { artist: { select: { stageName: true, badgeNo: true, realName: true } } },
      }),
      this.prisma.artistReview.count({ where }),
      this.prisma.artistReview.groupBy({
        by: ['score'],
        where,
        _count: { _all: true },
      }),
    ])
    const dist: ReviewSummary['dist'] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    let sum = 0
    let n = 0
    for (const g of scored) {
      const s = g.score
      if (s === null) continue
      const key = String(s) as keyof ReviewSummary['dist']
      if (key in dist) dist[key] = g._count._all
      sum += s * g._count._all
      n += g._count._all
    }
    return {
      rows: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        artistId: r.artistId,
        stageName: r.artist.stageName,
        badgeNo: r.artist.badgeNo,
        realName: r.artist.realName,
        reviewType: r.reviewType,
        score: r.score,
        content: r.content,
        reviewer: r.reviewer,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      summary: { count: n, avgScore: n > 0 ? round2(sum / n) : 0, dist },
      page,
      pageSize,
    }
  }

  async create(storeId: number, body: CreateReviewDto, operatorId: number): Promise<{ id: number }> {
    const artist = await this.prisma.artist.findFirst({ where: { id: body.artistId, storeId, deletedAt: null } })
    if (artist === null) throw new NotFoundException('销售经理不存在')
    const at = body.at !== undefined ? new Date(body.at) : new Date()
    const store = await this.prisma.store.findUnique({ where: { id: storeId } })
    const cut = store?.businessDayCutTime ?? env().BUSINESS_DAY_CUT
    const businessDate = new Date(resolveBusinessDate(at, { cutTime: cut }))
    const created = await this.prisma.artistReview.create({
      data: {
        storeId,
        businessDate,
        artistId: artist.id,
        reviewType: body.reviewType.trim(),
        score: body.score,
        content: body.content?.trim() === '' ? null : (body.content?.trim() ?? null),
        reviewer: body.reviewer?.trim() === '' ? null : (body.reviewer?.trim() ?? null),
        createdAt: at,
      },
    })
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action: 'REVIEW_CREATE',
        targetType: 'artist_review',
        targetId: String(created.id),
        afterJson: created as unknown as object,
      },
    })
    return { id: created.id }
  }

  /** 销售端:本人评价(只读;近 100 条 + 均分) */
  async my(artistId: number): Promise<{ rows: unknown[]; summary: ReviewSummary }> {
    const artist = await this.prisma.artist.findFirst({ where: { id: artistId, deletedAt: null } })
    if (artist === null) throw new NotFoundException('销售经理不存在')
    const rows = await this.prisma.artistReview.findMany({
      where: { artistId },
      orderBy: { id: 'desc' },
      take: 100,
    })
    const dist: ReviewSummary['dist'] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    let sum = 0
    let n = 0
    for (const r of rows) {
      if (r.score === null) continue
      const key = String(r.score) as keyof ReviewSummary['dist']
      if (key in dist) dist[key] += 1
      sum += r.score
      n += 1
    }
    return {
      rows: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate.toISOString().slice(0, 10),
        reviewType: r.reviewType,
        score: r.score,
        content: r.content,
        reviewer: r.reviewer,
        createdAt: r.createdAt.toISOString(),
      })),
      summary: { count: n, avgScore: n > 0 ? round2(sum / n) : 0, dist },
    }
  }
}

/* ── Controller ── */

@Controller('reviews')
export class ReviewController {
  constructor(private readonly svc: ReviewService) {}

  @RequirePerm('review:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('businessDateFrom') businessDateFrom: string,
    @Query('businessDateTo') businessDateTo: string,
    @Query('artistId') artistId?: string,
    @Query('reviewType') reviewType?: string,
    @Query('minScore') minScore?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list(user?.storeId ?? 1, {
      businessDateFrom,
      businessDateTo,
      artistId: artistId !== undefined && artistId !== '' ? Number(artistId) : undefined,
      reviewType,
      minScore: minScore !== undefined && minScore !== '' ? Number(minScore) : undefined,
      keyword,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? DEFAULT_PAGE_SIZE),
    })
  }

  @RequirePerm('review:create')
  @Post()
  async create(@Req() req: Request, @Body() body: CreateReviewDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.create(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  /** 销售端:本人评价(scope=ARTIST) */
  @Get('my')
  async my(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    if (user === undefined || user.scope !== 'ARTIST') {
      throw new UnauthorizedException('仅销售端可查询本人评价')
    }
    return this.svc.my(user.sub)
  }
}

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService],
})
export class ReviewModule {}
