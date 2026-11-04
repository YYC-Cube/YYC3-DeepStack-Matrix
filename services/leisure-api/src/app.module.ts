/**
 * 应用根模块:装配 auth / artist / attendance / store / store-config / session / stage-fee / approval(阶段2)
 * 全局:LeisureExceptionFilter · JwtGuard · IdempotencyInterceptor(POST) · TransformInterceptor · DayCutSummaryJob
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
import { DayCutSummaryJob } from './jobs/day-cut-summary.job.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { ArtistModule } from './modules/artist/artist.module.js'
import { AttendanceModule } from './modules/attendance/attendance.module.js'
import { StoreAdminModule } from './modules/store/store.module.js'
import { StoreConfigModule } from './modules/store-config/store-config.module.js'
import { SessionModule } from './modules/session/session.module.js'
import { StageFeeModule } from './modules/stage-fee/stage-fee.module.js'
import { ApprovalModule } from './modules/approval/approval.module.js'
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module.js'
import { ReportModule } from './modules/report/report.module.js'
import { RoomModule } from './modules/room/room.module.js'
import { TicketModule } from './modules/ticket/ticket.module.js'
import { ShowcaseModule } from './modules/showcase/showcase.module.js'
import { BookingModule } from './modules/booking/booking.module.js'
import { ReviewModule } from './modules/review/review.module.js'
import { DispatchModule } from './modules/dispatch/dispatch.module.js'
import { StaffModule } from './modules/staff/staff.module.js'
import { NoticeModule } from './modules/notice/notice.module.js'
import { SplitHandoverModule } from './modules/split/split-handover.module.js'

@Module({
  imports: [
    JwtModule.register({ secret: env().JWT_SECRET }),
    AuthModule,
    ArtistModule,
    AttendanceModule,
    StoreAdminModule,
    StoreConfigModule,
    SessionModule,
    StageFeeModule,
    ApprovalModule,
    TaxonomyModule,
    ReportModule,
    RoomModule,
    TicketModule,
    ShowcaseModule,
    BookingModule,
    ReviewModule,
    DispatchModule,
    StaffModule,
    NoticeModule,
    SplitHandoverModule,
  ],
  providers: [
    PrismaService,
    DayCutSummaryJob,
    { provide: APP_FILTER, useClass: LeisureExceptionFilter },
    { provide: APP_GUARD, useClass: JwtGuard },
    // 幂等在外层(快照存信封后的最终体),信封转换在内层
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
