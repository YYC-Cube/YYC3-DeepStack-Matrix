/**
 * 幂等拦截器:POST 写接口按 Idempotency-Key 去重(24h TTL,唯一索引兜底)
 * 命中:以快照作为响应值短路(不重复执行业务)
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import type { Request } from 'express'
import { defer, of, switchMap, type Observable } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service.js'

interface ReqWithUser extends Request {
  user?: { sub: number; storeId?: number }
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp()
    const req = http.getRequest<ReqWithUser>()

    if (req.method !== 'POST') return next.handle()
    const key = req.header('Idempotency-Key')
    if (key === undefined || key === '') return next.handle()

    const storeId = req.user?.storeId ?? 0
    const path = (req.baseUrl || '') + req.path

    // 命中即回放。注意:必须以 Observable 值短路,不能直接 res.json——
    // 直接写响应后 Nest 路由层仍会尝试写响应,触发 ERR_HTTP_HEADERS_SENT 崩进程
    return defer(() =>
      this.prisma.idempotencyKey
        .findUnique({
          where: { storeId_idemKey_path: { storeId, idemKey: key, path } },
        })
        .then((hit) => hit?.responseSnapshot ?? null),
    ).pipe(
      switchMap((snapshot) => {
        if (snapshot !== null) return of(snapshot)
        // 放行执行,快照落库后再放行响应(此时流经过内层 TransformInterceptor,快照即最终信封体)。
        // 竞态修复:此前 tap+void create 与响应并发,紧随其后的同键请求会在快照提交前查空而重复执行。
        // create 失败(含并发唯一冲突)不阻塞响应:首次响应已产生,冲突方业务侧仍有幂等表兜底
        return next.handle().pipe(
          switchMap((body) =>
            defer(() =>
              this.prisma.idempotencyKey
                .create({
                  data: { storeId, idemKey: key, path, responseSnapshot: body as object },
                })
                .then(() => body)
                .catch(() => body),
            ),
          ),
        )
      }),
    )
  }
}
