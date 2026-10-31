/**
 * YYC³ LeisureManage · API Client(单源)
 * 传输层注入式:Web 用内置 FetchTransport;Taro 小程序注入 Taro.request 适配器
 * 契约对齐《04-API接口设计》;错误码对齐 errors.ts / 04 §10
 */

import { LeisureError } from './errors.js'
import { resolveBusinessDate } from './business-day.js'
import type {
  Artist,
  ArtistBooking,
  ArtistOrder,
  ArtistReview,
  AttendanceReport,
  ReportSummaryRow,
  ReportType,
  ShowSession,
  StageFeeRule,
  StageFeeTxn,
  TicketRule,
  TicketTxn,
  RealtimeStatus,
} from './types.js'

/* ───────────────────────── 传输层抽象 ───────────────────────── */

export interface TransportRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string // 以 / 开头,不含 baseUrl
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
  /** 资金/单据写接口必传(幂等键,24h 去重) */
  idempotencyKey?: string
  timeoutMs?: number
}

export interface Transport {
  request<T>(req: TransportRequest): Promise<T>
}

/** Web/PWA 内置 fetch 传输(Taro 端自行实现同接口的 TaroTransport) */
export class FetchTransport implements Transport {
  constructor(
    private readonly opts: {
      baseUrl: string
      getToken?: () => string | undefined
      timeoutMs?: number
    },
  ) {}

  async request<T>(req: TransportRequest): Promise<T> {
    const url = this.opts.baseUrl.replace(/\/+$/, '') + req.path
    const search = new URLSearchParams()
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined) search.set(k, String(v))
    }
    const qs = search.toString()
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      req.timeoutMs ?? this.opts.timeoutMs ?? 10_000,
    )
    try {
      const token = this.opts.getToken?.()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...req.headers,
      }
      if (token !== undefined) headers.Authorization = 'Bearer ' + token
      if (req.idempotencyKey !== undefined) headers['Idempotency-Key'] = req.idempotencyKey
      const init: RequestInit = { method: req.method, headers, signal: controller.signal }
      if (req.body !== undefined) init.body = JSON.stringify(req.body)
      const res = await fetch(qs ? url + '?' + qs : url, init)
      const json = (await res.json().catch(() => null)) as
        | { code: number; msg?: string; data?: T }
        | null
      if (json === null) {
        throw new LeisureError(res.status, 'HTTP ' + String(res.status))
      }
      if (json.code !== 0) {
        throw new LeisureError(json.code, json.msg ?? 'error', json)
      }
      return json.data as T
    } finally {
      clearTimeout(timer)
    }
  }
}

/* ───────────────────────── 客户端 ───────────────────────── */

export interface LeisureClientOptions {
  baseUrl: string
  /** 各端注入:管理端取 JWT;艺人端取微信 session token */
  getToken?: () => string | undefined
  /** 门店上下文(多店预留) */
  getStoreId?: () => number | undefined
  /** 日切配置(客户端营业日预览用;最终以服务端为准) */
  cutTime?: string
  timeoutMs?: number
}

export class LeisureApiClient {
  constructor(
    private readonly transport: Transport,
    private readonly opts: LeisureClientOptions,
  ) {}

  /* ── 考勤 ── */
  attendance = {
    /** 艺人端扫码签到(类型=报备类型;geo 可空,失败标记 checkinGeoOk=false) */
    checkin: (p: { reportType: ReportType; lat?: number; lng?: number }) =>
      this.post<{ reportId: number; businessDate: string }>('/attendance/checkin', p),
    checkout: (p: { lat?: number; lng?: number }) =>
      this.post<{ reportId: number; durationMinutes: number }>('/attendance/checkout', p),
    reports: (q: {
      businessDate: string
      groupId?: number
      type?: ReportType
      keyword?: string
      page?: number
      pageSize?: number
    }) => this.get<{ rows: AttendanceReport[]; total: number }>('/attendance/reports', q),
    summary: (q: { businessDate: string }) =>
      this.get<{ rows: ReportSummaryRow[] }>('/attendance/summary', q),
    realtime: (q: { groupId?: number; keyword?: string }) =>
      this.get<{
        counts: Record<RealtimeStatus, number>
        artists: Array<{
          artistId: number
          stageName: string
          badgeNo?: string
          groupId?: number
          status: RealtimeStatus
          roomName?: string
        }>
      }>('/attendance/realtime', q),
    manual: (p: {
      artistId: number
      type: ReportType
      businessDate: string
      reason: string
    }) => this.post<{ reportId: number }>('/attendance/manual', p),
  }

  /* ── 场次与台费 ── */
  sessions = {
    start: (p: { artistId: number; roomId: number }) =>
      this.post<{ sessionId: number; businessDate: string }>('/sessions/start', p),
    finish: (p: { sessionId: number }) =>
      this.post<{ feeAmount: number; durationMinutes: number }>('/sessions/' + String(p.sessionId) + '/finish', {}),
    cross: (p: { sessionId: number; toRoomId: number }) =>
      this.post<{ sessionId: number }>('/sessions/' + String(p.sessionId) + '/cross', p),
    list: (q: {
      businessDateFrom: string
      businessDateTo: string
      by?: 'artist' | 'room' | 'group'
      status?: 'all' | 'onstage' | 'cross'
      keyword?: string
      groupId?: number
    }) => this.get<{ rows: ShowSession[]; total: number }>('/sessions', q),
  }

  fees = {
    rules: {
      list: (q: { levelId?: number }) =>
        this.get<{ rows: StageFeeRule[] }>('/stage-fee-rules', q),
      upsert: (p: Omit<StageFeeRule, 'id'> & { id?: number }) =>
        this.post<{ id: number }>('/stage-fee-rules', p),
      remove: (id: number) => this.del('/stage-fee-rules/' + String(id)),
    },
    recharge: (p: {
      artistId: number
      amount: number
      payChannel: 'CASH' | 'DOUYIN'
    }, idemKey?: string) =>
      this.post<{ txnId: number; balance: number }>('/stage-fee/recharge', p, idemKey),
    manualDeduct: (p: { artistId: number; amount: number; remark: string }, idemKey?: string) =>
      this.post<{ txnId?: number; approvalId?: number }>('/stage-fee/manual-deduct', p, idemKey),
    txns: (q: {
      businessDateFrom: string
      businessDateTo: string
      type?: 'RECHARGE' | 'SESSION_DEDUCT' | 'MANUAL_DEDUCT'
      groupId?: number
      keyword?: string
    }) => this.get<{ rows: StageFeeTxn[]; total: number; totalAmount: number }>(
      '/stage-fee/txns',
      q,
    ),
    balance: (artistId: number) =>
      this.get<{ balance: number }>('/stage-fee/balance/' + String(artistId)),
  }

  /* ── 台票 ── */
  tickets = {
    rules: {
      list: () => this.get<{ rows: TicketRule[] }>('/ticket-rules'),
      upsert: (p: Omit<TicketRule, 'id'> & { id?: number }) =>
        this.post<{ id: number }>('/ticket-rules', p),
    },
    purchase: (p: { artistId: number; ticketRuleId: number; qty: number; payChannel: 'CASH' | 'DOUYIN' }, idemKey?: string) =>
      this.post<{ txnId: number; amount: number }>('/tickets/purchase', p, idemKey),
    use: (p: { artistId: number; ticketRuleId: number; qty: number; refSessionId?: number }, idemKey?: string) =>
      this.post<{ ok: true }>('/tickets/use', p, idemKey),
    txns: (q: { businessDateFrom: string; businessDateTo: string; type?: 'BUY' | 'USE'; keyword?: string }) =>
      this.get<{ rows: TicketTxn[]; total: number; totalAmount: number }>('/tickets/txns', q),
  }

  /* ── 档案 ── */
  artists = {
    get: (id: number) => this.get<Artist>('/artists/' + String(id)),
    list: (q: { groupId?: number; levelId?: number; status?: string; keyword?: string; page?: number; pageSize?: number }) =>
      this.get<{ rows: Artist[]; total: number }>('/artists', q),
  }

  /* ── 订单/评价/预约/报表 ── */
  orders = {
    list: (q: { businessDateFrom: string; businessDateTo: string; payStatus?: string; orderType?: string; orderNo?: string }) =>
      this.get<{ rows: ArtistOrder[]; total: number }>('/artist-orders', q),
  }
  reviews = {
    list: (q: { reviewType?: string; keyword?: string }) =>
      this.get<{ rows: ArtistReview[]; total: number }>('/reviews', q),
  }
  bookings = {
    list: (q: { businessDate: string }) =>
      this.get<{ rows: ArtistBooking[]; total: number }>('/bookings', q),
  }

  /** 营业日辅助(客户端预览;最终以服务端响应为准) */
  businessDateOf(at: Date = new Date()): string {
    return resolveBusinessDate(at, { cutTime: this.opts.cutTime ?? '08:00' })
  }

  /* ── 底层 ── */
  private get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) {
    const req: TransportRequest = { method: 'GET', path }
    if (query !== undefined) req.query = query
    return this.transport.request<T>(req)
  }
  private post<T>(path: string, body?: unknown, idemKey?: string) {
    return this.transport.request<T>({
      method: 'POST',
      path,
      body,
      idempotencyKey: idemKey ?? newIdempotencyKey(),
    })
  }
  private del(path: string) {
    return this.transport.request<void>({ method: 'DELETE', path })
  }
}

/** 幂等键:优先 crypto.randomUUID(Web/小程序新基础库均支持),回退时间戳+随机 */

/** 结构化 crypto 形状:不引 DOM lib 的全局 Crypto 类型,保持包框架无关 */
interface RandomCryptoLike {
  randomUUID?: () => string
  getRandomValues?: <T extends Uint8Array>(array: T) => T
}

export function newIdempotencyKey(): string {
  const c = globalThis.crypto as RandomCryptoLike | undefined
  if (c !== undefined && typeof c.randomUUID === 'function') return c.randomUUID()
  if (c !== undefined && typeof c.getRandomValues === 'function') {
    const buf = new Uint8Array(16)
    c.getRandomValues(buf)
    let out = ''
    for (const b of buf) out += b.toString(16).padStart(2, '0')
    return out
  }
  // 最终兜底:时间戳+单调计数(仅幂等去重用途,非加密材料)
  idemSeq += 1
  return 'idem-' + String(Date.now()) + '-' + String(idemSeq)
}
let idemSeq = 0
