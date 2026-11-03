/**
 * 门店参数模块:销售经理设置 8 项(需求全集 §7)· 按门店隔离 · 配置优先级:门店级 > 全局 env 默认
 * 存储模型:store_config 每店每配置键一行(configValue JSON);读时与 env 默认合并
 * 计费阈值/签退时限/未签到上钟三项的 env 默认在 config/env.ts;其余项在代码内置默认
 */
import { Body, Controller, Get, Injectable, Module, Put, Req } from '@nestjs/common'
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsBoolean, Min, Max } from 'class-validator'
import type { Request } from 'express'
import { BadRequestException } from '@nestjs/common'
import { DEFAULT_PAY_CHANNELS } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

/* ── 配置键(store_config.config_key;8 项) ── */

const CONFIG_KEYS = {
  requiredProfileFields: 'required_profile_fields',
  report: 'report_settings',
  checkoutMinMinutes: 'checkout_min_minutes',
  selfScanFinish: 'self_scan_finish',
  stageWithoutCheckin: 'stage_without_checkin',
  ticketPurchase: 'ticket_purchase',
  roomBilling: 'room_billing',
  stageAssignMode: 'stage_assign_mode',
} as const

/* ── DTO ── */

class ArtistSettingsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredProfileFields?: string[]

  @IsOptional()
  @IsObject()
  reportSettings?: {
    requireReview?: boolean
    openFrom?: string
    openTo?: string
  }

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  checkoutMinMinutes?: number

  @IsOptional()
  @IsBoolean()
  allowSelfScanFinish?: boolean

  @IsOptional()
  @IsBoolean()
  allowStageWithoutCheckin?: boolean

  @IsOptional()
  @IsObject()
  ticketPurchase?: {
    enabled?: boolean
    maxPerDay?: number
  }

  @IsOptional()
  @IsObject()
  roomBilling?: {
    feeMode?: 'HOURLY' | 'FLAT'
    roundingEnabled?: boolean
    roundingThresholdMinutes?: number
    crossDayAccumulate?: boolean
    /** 最低消费(元/场;0=不启用) */
    minCharge?: number
    /** 封顶计费(元/场;0=不封顶) */
    capCharge?: number
    /** 收费通道清单(现金/转账/自定义1-3;后台可编辑标签) */
    channels?: Array<{ code: string; label: string }>
  }

  @IsOptional()
  @IsIn(['ROTATION', 'SELF_PICK', 'MIXED'])
  stageAssignMode?: 'ROTATION' | 'SELF_PICK' | 'MIXED'
}

/* ── Service ── */

/** 销售经理设置合并视图(门店行 > env/内置默认;形态对齐 leisure-core StoreArtistSettings) */
export interface ArtistSettingsView {
  requiredProfileFields: string[]
  reportRequireReview: boolean
  reportOpenFrom?: string
  reportOpenTo?: string
  checkoutMinMinutes: number
  allowSelfScanFinish: boolean
  allowStageWithoutCheckin: boolean
  ticketPurchaseEnabled: boolean
  ticketPurchaseMaxPerDay?: number
  roomBilling: {
    feeMode: 'HOURLY' | 'FLAT'
    roundingEnabled: boolean
    roundingThresholdMinutes: number
    crossDayAccumulate: boolean
    /** 最低消费(元/场;预设 0=不启用;后台可编辑) */
    minCharge: number
    /** 封顶计费(元/场;预设 0=不封顶;后台可编辑) */
    capCharge: number
    /** 收费通道清单(预设:现金/转账/自定义1-3;后台可编辑) */
    channels: Array<{ code: string; label: string }>
  }
  stageAssignMode: 'ROTATION' | 'SELF_PICK' | 'MIXED'
}

/** 通道清单形态收敛:code 非空去重(大写)、label 非空、最多 10 项 */
function normalizeChannels(raw: unknown): Array<{ code: string; label: string }> {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('收费通道须为数组')
  }
  if (raw.length === 0 || raw.length > 10) {
    throw new BadRequestException('收费通道须 1-10 项')
  }
  const seen = new Set<string>()
  const out: Array<{ code: string; label: string }> = []
  for (const item of raw as Array<{ code?: unknown; label?: unknown }>) {
    const code = typeof item.code === 'string' ? item.code.trim().toUpperCase() : ''
    const label = typeof item.label === 'string' ? item.label.trim() : ''
    if (code === '' || label === '') {
      throw new BadRequestException('收费通道 code/label 不能为空')
    }
    if (!/^[A-Z0-9_]{1,20}$/.test(code)) {
      throw new BadRequestException('收费通道 code 仅限大写字母/数字/下划线(≤20)')
    }
    if (seen.has(code)) {
      throw new BadRequestException('收费通道 code 重复')
    }
    seen.add(code)
    out.push({ code, label: label.slice(0, 20) })
  }
  return out
}

function assertMoney(v: number | undefined, name: string): void {
  if (v === undefined) return
  if (!Number.isFinite(v) || v < 0 || v > 1_000_000) {
    throw new BadRequestException(name + '须为 0-1000000 的数值(0=不启用)')
  }
}

@Injectable()
export class StoreConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** 读 8 项合并结果(门店行 > env/内置默认) */
  async getArtistSettings(storeId: number): Promise<ArtistSettingsView> {
    const rows = await this.prisma.storeConfig.findMany({ where: { storeId } })
    const byKey = new Map(rows.map((r) => [r.configKey, r.configValue]))

    const roomBillingRow = byKey.get(CONFIG_KEYS.roomBilling) as
      | {
          feeMode?: string
          roundingEnabled?: boolean
          roundingThresholdMinutes?: number
          crossDayAccumulate?: boolean
          minCharge?: number
          capCharge?: number
          channels?: Array<{ code: string; label: string }>
        }
      | undefined
    const reportRow = byKey.get(CONFIG_KEYS.report) as
      | { requireReview?: boolean; openFrom?: string; openTo?: string }
      | undefined
    const ticketRow = byKey.get(CONFIG_KEYS.ticketPurchase) as
      | { enabled?: boolean; maxPerDay?: number }
      | undefined

    const e = env()
    const view: ArtistSettingsView = {
      // ① 资料必填项(内置默认:姓名/手机)
      requiredProfileFields:
        (byKey.get(CONFIG_KEYS.requiredProfileFields) as string[] | undefined) ??
        ['realName', 'phone'],
      // ② 报备设置
      reportRequireReview: reportRow?.requireReview ?? false,
      reportOpenFrom: reportRow?.openFrom,
      reportOpenTo: reportRow?.openTo,
      // ③ 签退时限(env 默认 → 门店覆盖)
      checkoutMinMinutes:
        (byKey.get(CONFIG_KEYS.checkoutMinMinutes) as number | undefined) ??
        e.CHECKOUT_MIN_MINUTES,
      // ④ 手动扫码下钟
      allowSelfScanFinish: (byKey.get(CONFIG_KEYS.selfScanFinish) as boolean | undefined) ?? true,
      // ⑤ 未签到上钟(env 默认 → 门店覆盖)
      allowStageWithoutCheckin:
        (byKey.get(CONFIG_KEYS.stageWithoutCheckin) as boolean | undefined) ??
        (e.ALLOW_STAGE_WITHOUT_CHECKIN === 'true'),
      // ⑥ 台票购买
      ticketPurchaseEnabled: ticketRow?.enabled ?? true,
      ticketPurchaseMaxPerDay: ticketRow?.maxPerDay,
      // ⑦ 包厢计费规则(env 阈值默认 → 门店覆盖;最低消费/封顶预设 0;通道预设五项)
      roomBilling: {
        feeMode: (roomBillingRow?.feeMode as ArtistSettingsView['roomBilling']['feeMode'] | undefined) ?? 'HOURLY',
        roundingEnabled: roomBillingRow?.roundingEnabled ?? true,
        roundingThresholdMinutes:
          roomBillingRow?.roundingThresholdMinutes ?? e.BILL_ROUNDING_MINUTES,
        crossDayAccumulate: roomBillingRow?.crossDayAccumulate ?? true,
        minCharge: roomBillingRow?.minCharge ?? 0,
        capCharge: roomBillingRow?.capCharge ?? 0,
        channels:
          Array.isArray(roomBillingRow?.channels) && roomBillingRow.channels.length > 0
            ? roomBillingRow.channels
            : DEFAULT_PAY_CHANNELS.map((c) => ({ code: String(c.code), label: c.label })),
      },
      // ⑧ 上钟模式
      stageAssignMode: (byKey.get(CONFIG_KEYS.stageAssignMode) as ArtistSettingsView['stageAssignMode'] | undefined) ?? 'MIXED',
    }
    return view
  }

  /**
   * 收费通道校验(充值/台票购买/关房结算共用):须在门店通道清单内;返回规范化 code。
   * 在线支付(DOUYIN 预下单+回调)为 II 期,不在清单内即拒绝。
   */
  async assertPayChannel(storeId: number, code: string): Promise<string> {
    const normalized = typeof code === 'string' ? code.trim().toUpperCase() : ''
    if (normalized === '') {
      throw new BadRequestException('收费通道不能为空')
    }
    const settings = await this.getArtistSettings(storeId)
    if (!settings.roomBilling.channels.some((c) => c.code === normalized)) {
      throw new BadRequestException('收费通道不在门店清单内(请到销售经理设置·计费配置中维护)')
    }
    return normalized
  }

  /** 写:仅落显式提供的键;服务内显式字段收敛(第二层防线),未知键丢弃 */
  async updateArtistSettings(storeId: number, body: ArtistSettingsDto, operatorId: number): Promise<void> {
    const jobs: Array<{ key: string; value: object | Array<string | number> | string | number | boolean }> = []

    if (body.requiredProfileFields !== undefined) {
      jobs.push({ key: CONFIG_KEYS.requiredProfileFields, value: body.requiredProfileFields })
    }
    if (body.reportSettings !== undefined) {
      const before = await this.readRow(storeId, CONFIG_KEYS.report)
      jobs.push({
        key: CONFIG_KEYS.report,
        value: {
          requireReview: body.reportSettings.requireReview ?? before?.requireReview ?? false,
          openFrom: body.reportSettings.openFrom ?? before?.openFrom,
          openTo: body.reportSettings.openTo ?? before?.openTo,
        },
      })
    }
    if (body.checkoutMinMinutes !== undefined) {
      jobs.push({ key: CONFIG_KEYS.checkoutMinMinutes, value: body.checkoutMinMinutes })
    }
    if (body.allowSelfScanFinish !== undefined) {
      jobs.push({ key: CONFIG_KEYS.selfScanFinish, value: body.allowSelfScanFinish })
    }
    if (body.allowStageWithoutCheckin !== undefined) {
      jobs.push({ key: CONFIG_KEYS.stageWithoutCheckin, value: body.allowStageWithoutCheckin })
    }
    if (body.ticketPurchase !== undefined) {
      const before = await this.readRow(storeId, CONFIG_KEYS.ticketPurchase)
      const maxPerDay = body.ticketPurchase.maxPerDay ?? before?.maxPerDay
      jobs.push({
        key: CONFIG_KEYS.ticketPurchase,
        value: {
          enabled: body.ticketPurchase.enabled ?? before?.enabled ?? true,
          ...(maxPerDay !== undefined ? { maxPerDay } : {}),
        },
      })
    }
    if (body.roomBilling !== undefined) {
      // 计费阈值合法性:0-59 分钟(0=整点即进位,即"超1分钟进位"语义)
      const threshold = body.roomBilling.roundingThresholdMinutes
      if (threshold !== undefined && (threshold < 0 || threshold > 59)) {
        throw new BadRequestException('进位阈值须在 0-59 分钟之间')
      }
      // 最低消费/封顶:0=不启用;两者同时 >0 时封顶不得低于最低消费
      assertMoney(body.roomBilling.minCharge, '最低消费')
      assertMoney(body.roomBilling.capCharge, '封顶计费')
      const before = await this.readRow(storeId, CONFIG_KEYS.roomBilling)
      const cur = before ?? {}
      const minCharge = body.roomBilling.minCharge ?? (cur.minCharge as number | undefined) ?? 0
      const capCharge = body.roomBilling.capCharge ?? (cur.capCharge as number | undefined) ?? 0
      if (minCharge > 0 && capCharge > 0 && capCharge < minCharge) {
        throw new BadRequestException('封顶计费不得低于最低消费')
      }
      const channels =
        body.roomBilling.channels !== undefined
          ? normalizeChannels(body.roomBilling.channels)
          : (cur.channels as Array<{ code: string; label: string }> | undefined)
      jobs.push({
        key: CONFIG_KEYS.roomBilling,
        value: {
          feeMode: body.roomBilling.feeMode ?? cur.feeMode ?? 'HOURLY',
          roundingEnabled: body.roomBilling.roundingEnabled ?? cur.roundingEnabled ?? true,
          roundingThresholdMinutes:
            body.roomBilling.roundingThresholdMinutes ?? cur.roundingThresholdMinutes ?? env().BILL_ROUNDING_MINUTES,
          crossDayAccumulate: body.roomBilling.crossDayAccumulate ?? cur.crossDayAccumulate ?? true,
          minCharge,
          capCharge,
          ...(channels !== undefined ? { channels } : {}),
        },
      })
    }
    if (body.stageAssignMode !== undefined) {
      jobs.push({ key: CONFIG_KEYS.stageAssignMode, value: body.stageAssignMode })
    }

    for (const job of jobs) {
      await this.prisma.storeConfig.upsert({
        where: { storeId_configKey: { storeId, configKey: job.key } },
        update: { configValue: job.value as object },
        create: { storeId, configKey: job.key, configValue: job.value as object },
      })
      await this.prisma.auditLog.create({
        data: {
          storeId,
          action: 'STORE_CONFIG_UPDATE',
          targetType: 'store_config',
          targetId: job.key,
          afterJson: job.value as object,
          actorId: operatorId,
        },
      })
    }
  }

  private async readRow(
    storeId: number,
    key: string,
  ): Promise<Record<string, unknown> | undefined> {
    const row = await this.prisma.storeConfig.findUnique({
      where: { storeId_configKey: { storeId, configKey: key } },
    })
    if (row === null) return undefined
    return row.configValue as Record<string, unknown>
  }
}

/* ── Controller ── */

@Controller('store-config/artist-settings')
export class StoreConfigController {
  constructor(private readonly svc: StoreConfigService) {}

  @RequirePerm('setting:manage')
  @Get()
  async get(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.getArtistSettings(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Put()
  async update(@Req() req: Request, @Body() body: ArtistSettingsDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateArtistSettings(user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }
}

@Module({
  controllers: [StoreConfigController],
  providers: [StoreConfigService, PrismaService],
})
export class StoreConfigModule {}
