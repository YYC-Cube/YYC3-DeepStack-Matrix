/**
 * 应用根模块:装配 auth / artist / attendance(阶段1)
 * 全局:LeisureExceptionFilter · JwtGuard · IdempotencyInterceptor(POST) · TransformInterceptor
 */
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { env } from './config/env.js'
import { PrismaService } from './prisma/prisma.service.js'
import { LeisureExceptionFilter } from './common/filters/leisure-exception.filter.js'
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor.js'
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js'
import { JwtGuard } from './common/guards/jwt.guard.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { ArtistModule } from './modules/artist/artist.module.js'
import { AttendanceModule } from './modules/attendance/attendance.module.js'

@Module({
  imports: [
    JwtModule.register({ secret: env().JWT_SECRET }),
    AuthModule,
    ArtistModule,
    AttendanceModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_FILTER, useClass: LeisureExceptionFilter },
    { provide: APP_GUARD, useClass: JwtGuard },
    // 幂等在外层(快照存信封后的最终体),信封转换在内层
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
