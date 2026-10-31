/**
 * 统一响应信封拦截器:成功响应包一层 { code: 0, msg: 'ok', data }
 * 与 LeisureExceptionFilter 的错误体(code 4xxxx/5xxxx)配对,四端统一判 code
 * 注册顺序:IdempotencyInterceptor 之后(内层),幂等快照落库的即最终信封体
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { map } from 'rxjs'

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { code: 0; msg: string; data: T }> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<{ code: 0; msg: string; data: T }> {
    return next.handle().pipe(map((data) => ({ code: 0, msg: 'ok', data })))
  }
}
