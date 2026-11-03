/**
 * YYC³ LeisureManage 销售端小程序 · API 层
 * 单源契约:类型/枚举/错误码 import @yyc3/leisure-core;端点为显式清单(全字面量 URL,逐一可审计)
 * 安全:请求 URL 全部为编译期字面量(协议/主机固定),不存在运行时可变基址
 */
import Taro from '@tarojs/taro'
import { LeisureError, type MeOrdersResult, type ReportType } from '@yyc3/leisure-core'

/** 基础地址(常量):H5 dev 直连后端(CORS 已开);小程序 dev 工具勾选「不校验合法域名」 */
// API 基址:defineConstants 编译期内联(config/index.ts;TARO_APP_API_BASE 可覆盖,缺省本机 dev)
declare const API_BASE: string

/* ── 登录态(Taro Storage 持久化) ── */

export interface MpAuth {
  token: string
  name: string
  storeId: number
}

const AUTH_KEY = 'leisure-mp-auth'
const DEV_CODE_KEY = 'leisure-mp-dev-code'

/* ── 存储适配:H5 直用 localStorage(绕开 Taro H5 storage 封装的时序/格式差异);小程序端回落 Taro ── */

function rawGet(key: string): string {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key) ?? ''
  } catch {
    // H5 不可达时回落 Taro
  }
  try {
    const v = Taro.getStorageSync(key)
    return typeof v === 'string' ? v : ''
  } catch {
    return ''
  }
}

function rawSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
      return
    }
  } catch {
    // 回落 Taro
  }
  try {
    Taro.setStorageSync(key, value)
  } catch {
    // 存储不可用时静默(登录态不持久,本次会话仍可用)
  }
}

export function loadAuth(): MpAuth | null {
  const raw = rawGet(AUTH_KEY)
  if (raw === '') return null
  try {
    const obj = JSON.parse(raw) as MpAuth
    if (typeof obj.token !== 'string' || obj.token === '') return null
    return obj
  } catch {
    return null
  }
}

export function saveAuth(a: MpAuth): void {
  rawSet(AUTH_KEY, JSON.stringify(a))
}

export function clearAuth(): void {
  rawSet(AUTH_KEY, '')
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const auth = loadAuth()
  if (auth !== null && auth.token !== '') h.Authorization = 'Bearer ' + auth.token
  return h
}

/** 统一信封解包:非 0 code 抛 LeisureError(错误码与四端同源) */
function envelope<T>(res: Taro.request.SuccessCallbackResult<any>): T {
  const json = res.data as { code: number; msg?: string; data?: T } | null
  if (json === null) {
    throw new LeisureError(res.statusCode, 'HTTP ' + String(res.statusCode))
  }
  if (json.code !== 0) {
    throw new LeisureError(json.code, json.msg ?? 'error', json)
  }
  return json.data as T
}

/** 统一异常翻译(网络层错误→静态文案) */
function translate(e: unknown): never {
  if (e instanceof LeisureError) throw e
  throw new LeisureError(-1, '网络异常,请检查网络后重试')
}

/* ── 稳定伪 code(dev 骨架:后端 code 即 openid;时间戳+持久化计数器,无随机数) ── */

let codeCounter = 0

export function getStableCode(): string {
  let code = rawGet(DEV_CODE_KEY)
  if (code === '') {
    codeCounter += 1
    code = 'mp-' + String(Date.now()) + '-' + String(codeCounter)
    rawSet(DEV_CODE_KEY, code)
  }
  return code
}

/* ── 端点清单(全字面量 URL) ── */

/** B1:wx 登录(未绑定返回 NEED_BIND + bindToken;dev 模式 code 即 openid) */
export function wxLogin(code: string): Promise<{ status: 'OK'; token: string; name?: string } | { status: 'NEED_BIND'; bindToken: string }> {
  return Taro.request({
    url: API_BASE + '/auth/wx/login',
    method: 'POST',
    data: { code },
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ status: "OK"; token: string; name?: string } | { status: "NEED_BIND"; bindToken: string }>(res))
    .catch(translate)
}

/** B1:绑定(凭 bindToken + 腰牌号/手机号;跨店唯一冲突转转移工单) */
export function wxBind(p: { bindToken: string; badgeNo?: string; phone?: string; storeId: number }): Promise<{ status: string }> {
  return Taro.request({
    url: API_BASE + '/auth/wx/bind',
    method: 'POST',
    data: p,
    header: { 'Content-Type': 'application/json' },
    timeout: 10_000,
  })
    .then((res) => envelope<{ status: string }>(res))
    .catch(translate)
}

/** B2:扫码签到(geo 可空;失败标记 checkinGeoOk=false 仍允许) */
export function checkin(p: { reportType: ReportType; lat?: number; lng?: number }): Promise<{ reportId: number; businessDate: string }> {
  return Taro.request({
    url: API_BASE + '/attendance/checkin',
    method: 'POST',
    data: p,
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ reportId: number; businessDate: string }>(res))
    .catch(translate)
}

/** B2:签退(后端校验门店级签退时限,40905 拒绝) */
export function checkout(p: { lat?: number; lng?: number }): Promise<{ reportId: number; durationMinutes: number }> {
  return Taro.request({
    url: API_BASE + '/attendance/checkout',
    method: 'POST',
    data: p,
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ reportId: number; durationMinutes: number }>(res))
    .catch(translate)
}

/** B2:今日最新报备(状态卡;仅本人) */
export function myToday(): Promise<{ businessDate: string; report: { type: string; reportTime: string; checkoutTime: string | null } | null }> {
  return Taro.request({
    url: API_BASE + '/attendance/my-today',
    method: 'GET',
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ businessDate: string; report: { type: string; reportTime: string; checkoutTime: string | null } | null }>(res))
    .catch(translate)
}

/** B4:本人台费余额+流水(强制本人;B4 我的流水) */
export function myTxns(p: { businessDateFrom: string; businessDateTo: string }): Promise<{
  balance: number
  rows: Array<{ id: number; type: string; amount: string; remark: string | null; refType: string | null; createdAt: string }>
}> {
  return Taro.request({
    url: API_BASE + '/stage-fee/my?businessDateFrom=' + encodeURIComponent(p.businessDateFrom) + '&businessDateTo=' + encodeURIComponent(p.businessDateTo),
    method: 'GET',
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ balance: number; rows: Array<{ id: number; type: string; amount: string; remark: string | null; refType: string | null; createdAt: string }> }>(res))
    .catch(translate)
}

/** B2+:销售经理自助下钟(销售经理设置④ 开关;关闭时后端 403) */
export function myFinish(): Promise<{ sessionId: number; feeAmount: number; durationMinutes: number }> {
  return Taro.request({
    url: API_BASE + '/sessions/my/finish',
    method: 'POST',
    data: {},
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ sessionId: number; feeAmount: number; durationMinutes: number }>(res))
    .catch(translate)
}

/** B7:本人台票余额+流水(强制本人;台票四页的销售端视图) */
export function myTickets(p: { businessDateFrom: string; businessDateTo: string }): Promise<{
  balance: {
    rows: Array<{ ticketRuleId: number; name: string; validDays: number; balance: number; expireAt: string | null }>
    total: number
  }
  txns: Array<{ id: number; businessDate: string; type: string; ruleName: string; qty: number; amount: number; createdAt: string }>
}> {
  return Taro.request({
    url: API_BASE + '/tickets/my?businessDateFrom=' + encodeURIComponent(p.businessDateFrom) + '&businessDateTo=' + encodeURIComponent(p.businessDateTo),
    method: 'GET',
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{
      balance: { rows: Array<{ ticketRuleId: number; name: string; validDays: number; balance: number; expireAt: string | null }>; total: number }
      txns: Array<{ id: number; businessDate: string; type: string; ruleName: string; qty: number; amount: number; createdAt: string }>
    }>(res))
    .catch(translate)
}

/** scene 校验(B2 扫码后;HMAC 签名+60s 时间窗 ±2 分钟容差) */
export function qrcodeVerify(scene: string): Promise<{ valid: boolean; storeId?: number; businessDate?: string; reason?: string }> {
  return Taro.request({
    url: API_BASE + '/attendance/qrcode/verify?scene=' + encodeURIComponent(scene),
    method: 'GET',
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<{ valid: boolean; storeId?: number; businessDate?: string; reason?: string }>(res))
    .catch(translate)
}

/** a21 我的订单:自点单 + 已随房账结算的本人上场次(scope=ARTIST 强制本人;类型单源 MeOrdersResult) */
export function myOrders(): Promise<MeOrdersResult> {
  return Taro.request({
    url: API_BASE + '/me/orders',
    method: 'GET',
    header: authHeaders(),
    timeout: 10_000,
  })
    .then((res) => envelope<MeOrdersResult>(res))
    .catch(translate)
}

/** 统一错误文案(401 清态;其余透出后端中文文案) */
export function errText(e: unknown): string {
  if (e instanceof LeisureError) {
    if (e.code === 40001) {
      clearAuth()
      return '登录已过期,请重新进入'
    }
    return e.message
  }
  return '操作失败,请重试'
}
