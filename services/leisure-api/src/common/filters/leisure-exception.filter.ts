/**
 * 全局异常过滤器:LeisureError.code → HTTP + 统一响应体
 * 映射表对齐《04-API接口设计》§10;四端按 code 判断,不改语义
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import { LeisureError } from '@yyc3/leisure-core'

const CODE_TO_HTTP: Record<number, number> = {
  40001: 401,
  40301: 403,
  40401: 404,
  40901: 409,
  40902: 409,
  40903: 409,
  40904: 409,
  40905: 409,
  40906: 409,
  40907: 409,
  41201: 202, // 审批挂起
  42901: 429,
  50001: 502,
}

@Catch()
export class LeisureExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LeisureExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>()

    if (exception instanceof LeisureError) {
      const http = CODE_TO_HTTP[exception.code] ?? 400
      res.status(http).json({ code: exception.code, msg: exception.message, data: exception.detail ?? null })
      return
    }

    if (exception instanceof HttpException) {
      const http = exception.getStatus()
      const body = exception.getResponse()
      const msg = typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? exception.message)
      res.status(http).json({
        code: http === 401 ? 40001 : http === 403 ? 40301 : http === 404 ? 40401 : 400,
        msg: Array.isArray(msg) ? msg.join('; ') : String(msg ?? exception.message),
        data: null,
      })
      return
    }

    this.logger.error('unhandled', exception instanceof Error ? exception.stack : String(exception))
    res.status(500).json({ code: 50000, msg: 'internal error', data: null })
  }
}

/** 便捷:业务成功响应体 */
export function ok<T>(data: T): { code: 0; msg: string; data: T } {
  return { code: 0, msg: 'ok', data }
}

/** HTTP 状态码兜底(HttpStatus 重导出便于模块内使用) */
export { HttpStatus }
