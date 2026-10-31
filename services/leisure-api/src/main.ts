/**
 * YYC³ LeisureAPI 入口
 * 全局前缀 /api/v1 · Swagger /docs · LeisureExceptionFilter
 */
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import { LeisureExceptionFilter } from './common/filters/leisure-exception.filter.js'
import { env } from './config/env.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 生产置于 LB/nginx 之后
    logger: ['log', 'warn', 'error'],
  })

  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  )
  app.useGlobalFilters(new LeisureExceptionFilter())
  app.enableCors({ origin: true, credentials: true })

  const docCfg = new DocumentBuilder()
    .setTitle('YYC³ LeisureManage API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docCfg))

  await app.listen(env().PORT)
  new Logger('bootstrap').log('leisure-api listening on :' + String(env().PORT) + ' /api/v1 (docs: /docs)')
}

void bootstrap()
