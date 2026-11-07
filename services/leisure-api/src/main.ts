/**
 * YYC³ LeisureAPI 入口
 * 全局前缀 /api/v1 · Swagger /docs · LeisureExceptionFilter
 */
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { PrismaClient } from '@prisma/client'
import { AppModule } from './app.module.js'
import { CommModule, CommService } from './modules/comm/comm.module.js'
import { PrismaService } from './prisma/prisma.service.js'
import { JwtService } from '@nestjs/jwt'
import { LeisureExceptionFilter } from './common/filters/leisure-exception.filter.js'
import { env } from './config/env.js'
import { mountChatWs } from './ws/chat-ws.js'

/**
 * 启动自防(部署红线):admin_user 关键列缺失=迁移未跑,拒绝带病服务。
 * 代码与库 schema 两态漂移时,登录等接口会 500;宁可启动即失败并给明确指引
 * (先对目标库跑 `prisma migrate deploy`,生产用 DATABASE_URL_OWNER 所有者账号)
 */
async function assertDbSchemaUpToDate(): Promise<void> {
  const required = ['must_change_password', 'failed_login_count', 'locked_until', 'preset_at']
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_user'`
    const have = new Set(rows.map((r) => r.column_name))
    const missing = required.filter((c) => !have.has(c))
    if (missing.length > 0) {
      new Logger('bootstrap').error(
        'admin_user 缺列: ' + missing.join(', ') + ' —— 库 schema 未迁移,拒绝启动。' +
        '请先执行: DATABASE_URL=<所有者账号> pnpm exec prisma migrate deploy(services/leisure-api 下)',
      )
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function bootstrap(): Promise<void> {
  await assertDbSchemaUpToDate()
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 生产置于 LB/nginx 之后
    logger: ['log', 'warn', 'error'],
  })

  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  )
  app.useGlobalFilters(new LeisureExceptionFilter())
  // CORS:配置了白名单(生产必填)按白名单放行;否则放行任意源(仅 dev)
  const corsOrigins = (env().CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '')
  app.enableCors(
    corsOrigins.length > 0 ? { origin: corsOrigins, credentials: true } : { origin: true, credentials: true },
  )

  if (env().NODE_ENV !== 'prod' || env().SWAGGER_ENABLED === 'true') {
    const docCfg = new DocumentBuilder()
      .setTitle('YYC³ LeisureManage API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build()
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docCfg))
  }

  await app.listen(env().PORT ?? 3001, '0.0.0.0')
  // A17+/沟通批:原生 ws 独立挂载(/ws/chat;JWT 连接鉴权;房间广播;避开 @nestjs/websockets 适配器摩擦)
  mountChatWs(app.getHttpServer(), {
    setChatServer: (b) => app.get(CommService).setChatServer(b),
    prisma: app.get(PrismaService),
    jwt: app.get(JwtService),
  })
  new Logger('bootstrap').log(
    'leisure-api listening on :' + String(env().PORT) + ' /api/v1 (env ' + env().NODE_ENV + ', cors ' + (corsOrigins.length > 0 ? String(corsOrigins.length) + ' origins' : 'any') + ')',
  )
}

void bootstrap()
