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
  /** 首登必改密码:默认口令未改前,除改密/me 外管理端接口一律拒绝(P0-1) */
  PASSWORD_CHANGE_REQUIRED: 40302,
  NOT_FOUND: 40401,
  BADGE_DUPLICATED: 40901,
  WECHAT_BOUND_ELSEWHERE: 40902,
  RULE_LOCKED_BY_SESSION: 40903,
  SHOW_LIMIT_REACHED: 40904,
  CHECKOUT_TOO_EARLY: 40905,
  ARTIST_HAS_TXN_NO_DELETE: 40906,
  ROOM_NOT_OPEN: 40908,
  NOT_IN_ROOM: 40909,
  ORDER_LIMIT_EXCEEDED: 40910,
  /** 台票余额不足(核销时;需求全集 §6.6) */
  TICKET_NO_BALANCE: 40911,
  /** 台票已过期(首次购买 + validDays) */
  TICKET_EXPIRED: 40912,
  /** 预约状态流转非法(BOOKED→ARRIVED/CANCELLED,终态锁定) */
  BOOKING_STATE_INVALID: 40913,
  /** 轮台模式派单越序(销售经理设置⑧ ROTATION:须按队列顺序;MIXED 越序须填原因) */
  DISPATCH_ORDER_VIOLATION: 40914,
  /** 预约锁钟中(包厢存在未超时的 BOOKED 预约;可 ignoreBookingHold 强开,记审计) */
  BOOKING_ROOM_HELD: 40915,
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
