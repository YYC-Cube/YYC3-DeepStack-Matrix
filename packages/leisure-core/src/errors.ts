/**
 * YYC³ LeisureManage · 错误码单源
 * 与《04-API接口设计》错误码表一一对应;四端共用判断逻辑
 */

/** 业务错误(携带 API 错误码,对齐 04 文档) */
export class LeisureError extends Error {
  readonly code: number
  readonly detail?: unknown

  constructor(code: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'LeisureError'
    this.code = code
    this.detail = detail
  }
}

/** 错误码(节选,全表见 04-API接口设计 §10) */
export const ERR = {
  UNAUTHENTICATED: 40001,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  BADGE_DUPLICATED: 40901,
  WECHAT_BOUND_ELSEWHERE: 40902,
  RULE_LOCKED_BY_SESSION: 40903,
  SHOW_LIMIT_REACHED: 40904,
  CHECKOUT_TOO_EARLY: 40905,
  ARTIST_HAS_TXN_NO_DELETE: 40906,
  /** 房号店内唯一冲突(需求全集 §5.2;04 文档错误码表节选外追加) */
  ROOM_NO_DUPLICATED: 40907,
  APPROVAL_PENDING: 41201,
  RATE_LIMITED: 42901,
  PAY_CHANNEL_ERROR: 50001,
} as const

/** 便捷断言:不满足即抛对应业务错误 */
export function assertOk(condition: boolean, code: number, message: string, detail?: unknown): void {
  if (!condition) throw new LeisureError(code, message, detail)
}
