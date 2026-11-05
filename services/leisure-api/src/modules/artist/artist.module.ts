/**
 * 销售经理档案模块:CRUD/批量设置/软删(有流水禁删 40906)/腰牌号唯一(40901)
 * 计算与校验一律走 @yyc3/leisure-core(本模块主要做 IO/事务/审计)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { createHmac } from 'node:crypto'
import type { Request } from 'express'
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { ARTIST_PROFILE_FIELDS, ERR, LeisureError } from '@yyc3/leisure-core'
import { JwtGuard, Public, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'
import { StoreConfigService } from '../store-config/store-config.module.js'

/** ① 资料必填项(销售经理设置):按门店配置校验 body 中各字段非空;返回缺失字段中文名 */
function assertRequiredProfileFields(required: string[], body: Record<string, unknown>): void {
  const missing: string[] = []
  for (const key of required) {
    const meta = ARTIST_PROFILE_FIELDS.find((f) => f.key === key)
    if (meta === undefined) continue // 配置了未知字段名,忽略(不阻断业务)
    const v = body[key]
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
    if (empty) missing.push(meta.label)
  }
  if (missing.length > 0) {
    throw new BadRequestException('资料必填项缺失: ' + missing.join('、'))
  }
}

interface ArtistCreateBody {
  // storeId 不在契约内:svc.create 以独立入参接收(控制器做 body→用户默认店兜底)
  groupId?: number
  /** 专业条线:SELL=销售经理线(默认) RESOURCE=资源经理线 */
  line?: string
  supervisorName?: string
  levelId?: number
  realName: string
  stageName?: string
  gender?: number
  phone?: string
  badgeNo?: string
  performanceTarget?: number
  maxTotalShows?: number
  maxCrossRooms?: number
  firstShowMinMinutes?: number
  sameRoomMinMinutes?: number
  tipFixed?: number
  hourlyRate?: number
  /** 审核状态(需求全集 §3;缺省 PENDING 等待审核) */
  auditStatus?: 'PENDING' | 'REJECTED' | 'APPROVED'
}

/**
 * 建档入参 DTO:激活全局 ValidationPipe(whitelist+forbidNonWhitelisted)
 * 未知字段 400 拒绝;长度对齐 schema VarChar 上限。Mimosa「整块请求对象
 * 进入资源写入」的边界收口(svc 层显式映射保留为第二层防线)
 */
class ArtistCreateDto {
  @IsOptional()
  @IsInt()
  storeId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
  @IsOptional()
  @IsInt()
  levelId?: number
  /** 专业条线(2026-11-04):SELL=销售经理线(默认) RESOURCE=资源经理线 */
  @IsOptional()
  @IsIn(['SELL', 'RESOURCE'])
  line?: string
  @IsOptional()
  @IsString()
  @MaxLength(64)
  supervisorName?: string
  @IsString()
  @Length(1, 64)
  realName!: string
  @IsOptional()
  @IsString()
  @MaxLength(64)
  stageName?: string
  @IsOptional()
  @IsIn([1, 2])
  gender?: number
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string
  @IsOptional()
  @IsString()
  @MaxLength(32)
  badgeNo?: string
  @IsOptional()
  @IsNumber()
  @Min(0)
  performanceTarget?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTotalShows?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCrossRooms?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  firstShowMinMinutes?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  sameRoomMinMinutes?: number
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipFixed?: number
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number
  @IsOptional()
  @IsIn(['PENDING', 'REJECTED', 'APPROVED'])
  auditStatus?: 'PENDING' | 'REJECTED' | 'APPROVED'
}

/** 批量设置入参 DTO(同上,拒绝未知字段与非法 id 形状) */
class ArtistBatchUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids!: number[]
  @IsOptional()
  @IsInt()
  levelId?: number
  @IsOptional()
  @IsInt()
  groupId?: number
  @IsOptional()
  @IsInt()
  status?: number
}

/** 档案审核入参 DTO(需求全集 §3) */
class ArtistAuditDto {
  @IsIn(['APPROVED', 'REJECTED'])
  auditStatus!: 'APPROVED' | 'REJECTED'
}

@Injectable()
export class ArtistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  async list(q: {
    storeId: number
    groupId?: number
    levelId?: number
    status?: string
    auditStatus?: string
    keyword?: string
    line?: string
    page?: number
    pageSize?: number
  }): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    const where = {
      storeId: q.storeId,
      deletedAt: null,
      groupId: q.groupId,
      levelId: q.levelId,
      auditStatus: q.auditStatus,
      // 条线过滤(2026-11-04 资源经理线):line=RESOURCE 只取资源线;SELL/缺省=销售线(存量 NULL 视同 SELL;用 AND 避免与 keyword OR 冲突)
      ...(q.line === 'RESOURCE'
        ? { line: 'RESOURCE' }
        : q.line === 'SELL'
          ? { AND: [{ OR: [{ line: 'SELL' }, { line: null }] }] }
          : {}),
      OR:
        q.keyword !== undefined && q.keyword !== ''
          ? [
              // PostgreSQL contains 默认大小写敏感;腰牌/手机号按不敏感匹配
              { realName: { contains: q.keyword, mode: 'insensitive' as const } },
              { stageName: { contains: q.keyword, mode: 'insensitive' as const } },
              { badgeNo: { contains: q.keyword, mode: 'insensitive' as const } },
              { phone: { contains: q.keyword } },
            ]
          : undefined,
    }
    const [rows, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { group: true, level: true },
      }),
      this.prisma.artist.count({ where }),
    ])
    return { rows, total }
  }

  async create(
    body: ArtistCreateBody,
    operatorId: number,
    storeId: number,
  ): Promise<{ id: number }> {
    if (body.realName === undefined || body.realName === '') {
      throw new BadRequestException('realName 必填')
    }
    // ① 资料必填项(门店配置;销售经理设置①)——后台新增按配置校验
    const settings = await this.storeConfig.getArtistSettings(storeId)
    assertRequiredProfileFields(settings.requiredProfileFields, body as unknown as Record<string, unknown>)
    if (body.badgeNo !== undefined && body.badgeNo !== '') {
      // 腰牌号店内唯一含软删档案(uk_badge 唯一索引不滤 deleted_at):
      // 查重若滤软删,删除后同号重建会直撞 DB 唯一键(500);此处统一 40901
      const dup = await this.prisma.artist.findFirst({
        where: { storeId, badgeNo: body.badgeNo },
      })
      if (dup !== null) {
        // 40901 腰牌号重复(04-API §10;业务码入响应体)
        throw new LeisureError(ERR.BADGE_DUPLICATED, '腰牌号已存在')
      }
    }
    const created = await this.prisma.artist.create({
      data: {
        storeId,
        groupId: body.groupId,
        line: body.line ?? 'SELL',
        supervisorName: body.supervisorName,
        levelId: body.levelId,
        realName: body.realName,
        stageName: body.stageName,
        gender: body.gender ?? 1,
        phone: body.phone,
        badgeNo: body.badgeNo,
        performanceTarget: body.performanceTarget ?? 0,
        maxTotalShows: body.maxTotalShows ?? 0,
        maxCrossRooms: body.maxCrossRooms ?? 0,
        firstShowMinMinutes: body.firstShowMinMinutes ?? 0,
        sameRoomMinMinutes: body.sameRoomMinMinutes ?? 0,
        tipFixed: body.tipFixed ?? 0,
        hourlyRate: body.hourlyRate ?? 0,
        auditStatus: body.auditStatus ?? 'PENDING',
      },
    })
    await this.audit(operatorId, 'ARTIST_CREATE', 'artist', String(created.id), null, created)
    return { id: created.id }
  }

  /** 软删(有台费/台票/场次流水 → 40906 禁删,引导停用) */
  async softDelete(id: number, operatorId: number): Promise<void> {
    const [fee, ticket, session] = await Promise.all([
      this.prisma.stageFeeTxn.count({ where: { artistId: id } }),
      this.prisma.ticketTxn.count({ where: { artistId: id } }),
      this.prisma.showSession.count({ where: { artistId: id } }),
    ])
    if (fee + ticket + session > 0) {
      // 40906(04-API §10):有流水禁删,引导停用——业务码入响应体供四端判断
      throw new LeisureError(ERR.ARTIST_HAS_TXN_NO_DELETE, '该销售经理存在业务流水,请使用停用')
    }
    const before = await this.prisma.artist.findUnique({ where: { id } })
    await this.prisma.artist.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(operatorId, 'ARTIST_DELETE', 'artist', String(id), before, null)
  }

  /** 批量设置(等级/组别/状态);逐条审计 */
  async batchUpdate(
    p: { ids: number[]; levelId?: number; groupId?: number; status?: number },
    operatorId: number,
  ): Promise<{ updated: number }> {
    let updated = 0
    for (const id of p.ids) {
      const before = await this.prisma.artist.findUnique({ where: { id } })
      if (before === null) continue
      await this.prisma.artist.update({
        where: { id },
        data: {
          levelId: p.levelId ?? before.levelId,
          groupId: p.groupId ?? before.groupId,
          status: p.status ?? before.status,
        },
      })
      await this.audit(operatorId, 'ARTIST_BATCH_UPDATE', 'artist', String(id), before, {
        levelId: p.levelId,
        groupId: p.groupId,
        status: p.status,
      })
      updated += 1
    }
    return { updated }
  }

  /** 更新档案(显式字段收敛;审计前后值;不做 body spread) */
  async update(id: number, body: ArtistCreateBody, operatorId: number): Promise<void> {
    const before = await this.prisma.artist.findFirst({ where: { id, deletedAt: null } })
    if (before === null) {
      throw new BadRequestException('销售经理不存在或已删除')
    }
    if (body.badgeNo !== undefined && body.badgeNo !== '' && body.badgeNo !== before.badgeNo) {
      const dup = await this.prisma.artist.findFirst({
        where: { storeId: before.storeId, badgeNo: body.badgeNo },
      })
      if (dup !== null) {
        throw new LeisureError(ERR.BADGE_DUPLICATED, '腰牌号已存在')
      }
    }
    const after = await this.prisma.artist.update({
      where: { id },
      data: {
        groupId: body.groupId ?? before.groupId,
        supervisorName: body.supervisorName ?? before.supervisorName,
        levelId: body.levelId ?? before.levelId,
        realName: body.realName ?? before.realName,
        stageName: body.stageName ?? before.stageName,
        gender: body.gender ?? before.gender,
        phone: body.phone ?? before.phone,
        badgeNo: body.badgeNo ?? before.badgeNo,
        performanceTarget: body.performanceTarget ?? before.performanceTarget,
        maxTotalShows: body.maxTotalShows ?? before.maxTotalShows,
        maxCrossRooms: body.maxCrossRooms ?? before.maxCrossRooms,
        firstShowMinMinutes: body.firstShowMinMinutes ?? before.firstShowMinMinutes,
        sameRoomMinMinutes: body.sameRoomMinMinutes ?? before.sameRoomMinMinutes,
        tipFixed: body.tipFixed ?? before.tipFixed,
        hourlyRate: body.hourlyRate ?? before.hourlyRate,
        auditStatus: body.auditStatus ?? before.auditStatus,
      },
    })
    await this.audit(operatorId, 'ARTIST_UPDATE', 'artist', String(id), before, after)
  }

  /** 档案审核流转(需求全集 §3:等待审核/审核未通过/审核通过;通过才对外展示) */
  async auditArtist(
    id: number,
    auditStatus: 'APPROVED' | 'REJECTED',
    operatorId: number,
  ): Promise<void> {
    const before = await this.prisma.artist.findFirst({
      where: { id, deletedAt: null },
    })
    if (before === null) {
      throw new BadRequestException('销售经理不存在或已删除')
    }
    await this.prisma.artist.update({ where: { id }, data: { auditStatus } })
    await this.audit(operatorId, 'ARTIST_AUDIT', 'artist', String(id), before, {
      auditStatus,
    })
  }

  /** 头像写入(avatarKeys.photo dataURL ≤300KB;全员头像显示数据源) */
  async setAvatar(id: number, photoBase64: string, storeId: number, operatorId: number): Promise<void> {
    if (!photoBase64.startsWith('data:image/')) {
      throw new BadRequestException('照片须为 data:image/* dataURL')
    }
    if (photoBase64.length > 400_000) {
      throw new BadRequestException('照片超过 300KB 上限,请压缩后上传')
    }
    const target = await this.prisma.artist.findFirst({ where: { id, storeId, deletedAt: null } })
    if (target === null) throw new BadRequestException('销售经理不存在或已删除')
    await this.prisma.artist.update({ where: { id }, data: { avatarKeys: { photo: photoBase64 } as object } })
    await this.audit(operatorId, 'ARTIST_AVATAR_SET', 'artist', String(id), { avatarSet: false }, { avatarSet: true })
  }

  /** 资源经理转入销售:建审批单(bizType=RESOURCE_TO_SELL);审批通过由 approval.decide 钩子改线 */
  async requestTransferToSell(
    id: number,
    reason: string,
    storeId: number,
    operatorId: number,
  ): Promise<{ approvalId: number }> {
    const target = await this.prisma.artist.findFirst({ where: { id, storeId, deletedAt: null } })
    if (target === null) throw new BadRequestException('档案不存在或已删除')
    if ((target.line ?? 'SELL') !== 'RESOURCE') {
      throw new BadRequestException('仅资源经理档案可发起转入销售申请')
    }
    const dup = await this.prisma.approval.findFirst({
      where: { storeId, bizType: 'RESOURCE_TO_SELL', status: 'PENDING', bizPayload: { path: ['artistId'], equals: id } },
    })
    if (dup !== null) throw new ConflictException('该档案已有待审批的转入销售申请')
    const created = await this.prisma.approval.create({
      data: {
        storeId,
        bizType: 'RESOURCE_TO_SELL',
        bizPayload: { artistId: id, artistName: target.realName, badgeNo: target.badgeNo, reason } as object,
        applicantId: operatorId,
      },
    })
    await this.audit(operatorId, 'RESOURCE_TRANSFER_APPLY', 'artist', String(id), { line: 'RESOURCE' }, { approvalId: created.id })
    return { approvalId: created.id }
  }

  /** 转销售统计仪表数据(三状态计数+最近 5 条) */
  async transferStats(storeId: number) {
    const rows = await this.prisma.approval.findMany({
      where: { storeId, bizType: 'RESOURCE_TO_SELL' },
      orderBy: { id: 'desc' },
      take: 200,
    })
    const by = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
    for (const r of rows) {
      const k = r.status as keyof typeof by
      if (k in by) by[k]++
    }
    return {
      counts: by,
      recent: rows.slice(0, 5).map((r) => {
        const p = r.bizPayload as { artistName?: string; badgeNo?: string }
        return {
          id: r.id,
          name: p.artistName ?? '',
          badgeNo: p.badgeNo ?? '',
          status: r.status,
          at: r.createdAt.toISOString().slice(0, 10),
        }
      }),
    }
  }

  /* ── A17 注册二维码自助绑定(2026-11-05;HMAC 短时 token,免短信通道走人工审核兜底) ── */

  /** 签名/验签(HMAC-SHA256,密钥复用 SCENE_HMAC_KEY) */
  private regSig(storeId: number, exp: number): string {
    return createHmac('sha256', env().SCENE_HMAC_KEY).update('reg|' + String(storeId) + '|' + String(exp)).digest('hex').slice(0, 32)
  }

  /** 生成注册链接(24h 有效;H5 页 /m/register?t=) */
  registerToken(storeId: number): { token: string; url: string; expireAt: string } {
    const exp = Date.now() + 24 * 3600_000
    const token = String(exp) + this.regSig(storeId, exp)
    const base = env().H5_PUBLIC_BASE ?? 'https://lm.0379.pro'
    return { token, url: base + '/m/#/pages/register/index?t=' + token, expireAt: new Date(exp).toISOString() }
  }

  /** 验签注册提交(公开;字段参照竞品「我的资料」,缺项审核时补;身份证等敏感件仅存键不存明文) */
  async registerFromToken(token: string, body: {
    realName: string; stageName?: string; phone: string; gender?: number
    heightCm?: number; weightKg?: number; bustCm?: number; waistCm?: number; hipCm?: number
    showWechat?: string; photos?: string[]
  }, storeId: number): Promise<{ artistId: number }> {
    if (token.length < 20 || !/^\d{13}[0-9a-f]{32}$/.test(token)) throw new BadRequestException('注册链接无效')
    const exp = Number(token.slice(0, 13))
    if (!Number.isFinite(exp) || Date.now() > exp) throw new BadRequestException('注册链接已过期,请向门店索取新二维码')
    if (this.regSig(storeId, exp) !== token.slice(13)) throw new BadRequestException('注册链接校验失败')
    if (body.realName === undefined || body.realName.trim() === '' || body.phone === undefined || body.phone.trim() === '') {
      throw new BadRequestException('姓名与手机号必填')
    }
    const photos = Array.isArray(body.photos) ? body.photos : []
    for (const p of photos) {
      if (typeof p !== 'string' || !p.startsWith('data:image/') || p.length > 400_000) {
        throw new BadRequestException('照片须为 data:image/* 且单张 ≤300KB')
      }
    }
    if (photos.length > 6) throw new BadRequestException('照片最多 6 张')
    // 腰牌冲突预检(审核时定牌,先防撞)
    const dupPhone = await this.prisma.artist.findFirst({
      where: { storeId, phone: body.phone.trim(), deletedAt: null },
    })
    if (dupPhone !== null) throw new ConflictException('该手机号已有档案,请联系门店管理员直接绑定')
    const created = await this.prisma.artist.create({
      data: {
        storeId,
        realName: body.realName.trim(),
        stageName: body.stageName?.trim() === '' ? undefined : body.stageName?.trim(),
        phone: body.phone.trim(),
        gender: body.gender ?? 1,
        line: 'SELL',
        auditStatus: 'PENDING',
        hourlyRate: 0,
        heightCm: body.heightCm ?? null,
        weightKg: body.weightKg ?? null,
        bustCm: body.bustCm ?? null,
        waistCm: body.waistCm ?? null,
        hipCm: body.hipCm ?? null,
        showWechat: body.showWechat?.trim() === '' ? undefined : body.showWechat?.trim(),
        showPhotos: photos.length > 0 ? (photos as object) : undefined,
        avatarKeys: photos.length > 0 ? ({ photo: photos[0] } as object) : undefined,
      },
    })
    await this.audit(0, 'REGISTER_SUBMIT', 'artist', String(created.id), null, {
      realName: created.realName,
      phone: created.phone,
      source: 'A17_QRCODE',
    })
    return { artistId: created.id }
  }

  private async audit(
    operatorId: number,
    action: string,
    targetType: string,
    targetId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        beforeJson: (before ?? null) as object,
        afterJson: (after ?? null) as object,
        actorId: operatorId,
      },
    })
  }
}

@Controller('artists')
export class ArtistController {
  constructor(private readonly svc: ArtistService) {}

  @RequirePerm('artist:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('groupId') groupId?: string,
    @Query('levelId') levelId?: string,
    @Query('auditStatus') auditStatus?: string,
    @Query('keyword') keyword?: string,
    @Query('line') line?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list({
      storeId: user?.storeId ?? 1,
      groupId: groupId !== undefined ? Number(groupId) : undefined,
      levelId: levelId !== undefined ? Number(levelId) : undefined,
      auditStatus,
      keyword,
      line: line === 'RESOURCE' || line === 'SELL' ? line : undefined,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }

  @RequirePerm('artist:edit')
  @Post()
  async create(@Req() req: Request, @Body() body: ArtistCreateDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    const storeId = body.storeId ?? user?.storeId ?? 1
    // DTO 实例整体直传(svc 内显式字段映射为唯一写入源),不做 spread:
    // 入口层 DTO 校验(拒未知字段)+ svc 层显式映射,双层防线且无整包透传形态
    return this.svc.create(body, user?.sub ?? 0, storeId)
  }

  @RequirePerm('artist:delete')
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.softDelete(id, user?.sub ?? 0)
    return { deleted: true }
  }

  @RequirePerm('artist:edit')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ArtistCreateDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.update(id, body, user?.sub ?? 0)
    return { updated: true }
  }

  /** 档案审核流转(需求全集 §3;A1 列表筛选 + A2 表单依据) */
  @RequirePerm('artist:edit')
  @Post(':id/audit')
  async audit(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ArtistAuditDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.auditArtist(id, body.auditStatus, user?.sub ?? 0)
    return { auditStatus: body.auditStatus }
  }

  /** 头像上传(前端压缩 ≤300KB dataURL 存 avatarKeys.photo;全员头像:档案/选人器/实时态显示) */
  @RequirePerm('artist:edit')
  @Post(':id/avatar')
  async uploadAvatar(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { photoBase64?: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.setAvatar(id, body.photoBase64 ?? '', user?.storeId ?? 1, user?.sub ?? 0)
    return { avatarSet: true }
  }

  /** 资源经理「转入销售」申请(2026-11-04 Owner 裁决:两线不互通,转线走审批;审批通过自动改线) */
  @RequirePerm('resource:view')
  @Post(':id/transfer-to-sell')
  async transferToSell(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.requestTransferToSell(id, body.reason ?? '', user?.storeId ?? 1, user?.sub ?? 0)
  }

  /** 转销售统计(移动仪表:申请/通过/驳回计数+最近 5 条;数据源=approval bizType=RESOURCE_TO_SELL) */
  @RequirePerm('resource:view')
  @Get('transfer-stats')
  async transferStats(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.transferStats(user?.storeId ?? 1)
  }

  /** A17 注册二维码(24h 短时链接;前端 qrcode 库渲染;H5 /m/register?t=) */
  @RequirePerm('artist:edit')
  @Get('register-qr')
  async registerQr(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.registerToken(user?.storeId ?? 1)
  }

  /** A17 自助注册提交(公开;扫码免登,人工审核兜底) */
  @Public()
  @Post('register')
  async register(@Req() req: Request, @Body() body: Record<string, unknown>): Promise<unknown> {
    const token = typeof body.token === 'string' ? body.token : ''
    const storeId = req.headers['x-store-id'] !== undefined ? Number(req.headers['x-store-id']) : 1
    return this.svc.registerFromToken(token, body as never, Number.isFinite(storeId) ? storeId : 1)
  }

  @RequirePerm('artist:batch')
  @Put('batch')
  async batchUpdate(
    @Req() req: Request,
    @Body() body: ArtistBatchUpdateDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.batchUpdate(body, user?.sub ?? 0)
  }
}

@Module({
  controllers: [ArtistController],
  providers: [ArtistService, PrismaService, StoreConfigService],
})
export class ArtistModule {}
