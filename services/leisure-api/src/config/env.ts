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
  ALLOW_NEGATIVE_BALANCE: z.enum(['true', 'false']).default('true'),
  ALLOW_STAGE_WITHOUT_CHECKIN: z.enum(['true', 'false']).default('false'),
  CHECKOUT_MIN_MINUTES: z.coerce.number().default(60),
  INTEGRATION_ENABLED: z.enum(['true', 'false']).default('false'),
  WX_APPID: z.string().optional(),
  WX_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | undefined

export function loadEnv(): Env {
  if (cached !== undefined) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => i.path.join('.') + ': ' + i.message)
      .join('; ')
    throw new Error('env invalid → ' + issues)
  }
  cached = parsed.data
  return cached
}

export const env = (): Env => {
  if (cached === undefined) return loadEnv()
  return cached
}
