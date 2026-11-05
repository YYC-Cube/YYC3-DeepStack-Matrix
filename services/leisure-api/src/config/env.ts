/**
 * 环境配置(zod 校验,缺失/非法启动即失败)
 */
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['dev', 'staging', 'prod']).default('dev'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url().or(z.string().startsWith('mysql://')),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('2h'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  BUSINESS_DAY_CUT: z.string().default('08:00'),
  TRANSFER_MODE: z.enum(['manual', 'auto']).default('manual'),
  MANUAL_DEDUCT_THRESHOLD: z.coerce.number().default(500),
  // 接班码有效期(小时,默认 24;超期 OPEN 单须重新生成快照后确认)
  HANDOVER_CODE_TTL_HOURS: z.coerce.number().default(24),
  // H5 公网基地址(A17 注册二维码链接;与销售端发布域一致)
  H5_PUBLIC_BASE: z.string().default('https://lm.0379.pro'),
  ALLOW_NEGATIVE_BALANCE: z.enum(['true', 'false']).default('true'),
  ALLOW_STAGE_WITHOUT_CHECKIN: z.enum(['true', 'false']).default('false'),
  CHECKOUT_MIN_MINUTES: z.coerce.number().default(60),
  SELF_ORDER_PER_TXN_LIMIT: z.coerce.number().default(500),
  SELF_ORDER_DAILY_LIMIT: z.coerce.number().default(2000),
  // 计费进位阈值(分钟,默认15;门店级「销售经理设置-包厢计费规则」可覆盖,见 store-config 模块)
  BILL_ROUNDING_MINUTES: z.coerce.number().int().min(0).max(59).default(15),
  // 开放 API 生态预留开关(2026-11-01 v1.1 裁决:原 INTEGRATION_ENABLED 主系统联动废止)
  OPENAPI_ENABLED: z.enum(['true', 'false']).default('false'),
  // 现场屏 scene 签名密钥(HMAC-SHA256,防伪造;生产必须替换强随机)
  SCENE_HMAC_KEY: z.string().default('dev-only-scene-key-change-me'),
  // 硬件语音盒子(钟房叫钟联动;未配置=仅大屏 Web Speech)。URL 模板含 {text} 占位,如
  // http://192.168.1.50/tts?text={text};仅允许 http/https 且目标为私网/局域网地址(盒子在店内)
  VOICE_BOX_URL: z.string().optional(),
  VOICE_BOX_TIMEOUT_MS: z.coerce.number().int().min(200).max(10_000).default(3000),
  // 生产 CORS 白名单(逗号分隔完整 origin,如 https://leisure.example.com,https://pc.example.com);
  // 为空时放行任意源(仅 dev 允许;prod 必填,见下方生产硬化校验)
  CORS_ORIGINS: z.string().optional(),
  // Swagger 文档开关:dev 默认开;prod 建议关(内网排障可临时开)
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
  WX_APPID: z.string().optional(),
  WX_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | undefined

/** 生产硬化(P0-2):开发默认值/弱配置在 NODE_ENV=prod 下直接拒绝启动 */
function assertProdHardening(e: Env): void {
  if (e.NODE_ENV !== 'prod') return
  const issues: string[] = []
  const looksDev = (v: string): boolean => /dev-only|change-me|CHANGE_ME|example/i.test(v)
  if (e.JWT_SECRET.length < 32 || looksDev(e.JWT_SECRET)) issues.push('JWT_SECRET 须为 ≥32 位强随机且不得为开发默认值')
  if (e.JWT_REFRESH_SECRET.length < 32 || looksDev(e.JWT_REFRESH_SECRET)) issues.push('JWT_REFRESH_SECRET 须为 ≥32 位强随机且不得为开发默认值')
  if (e.SCENE_HMAC_KEY.length < 32 || looksDev(e.SCENE_HMAC_KEY)) issues.push('SCENE_HMAC_KEY 须为 ≥32 位强随机且不得为开发默认值')
  if (looksDev(e.DATABASE_URL)) issues.push('DATABASE_URL 不得使用开发口令')
  if (e.CORS_ORIGINS === undefined || e.CORS_ORIGINS.trim() === '') issues.push('CORS_ORIGINS 生产必填(逗号分隔白名单)')
  if (issues.length > 0) {
    throw new Error('prod hardening failed → ' + issues.join('; '))
  }
}

export function loadEnv(): Env {
  if (cached !== undefined) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => i.path.join('.') + ': ' + i.message)
      .join('; ')
    throw new Error('env invalid → ' + issues)
  }
  assertProdHardening(parsed.data)
  cached = parsed.data
  return cached
}

export const env = (): Env => {
  if (cached === undefined) return loadEnv()
  return cached
}
