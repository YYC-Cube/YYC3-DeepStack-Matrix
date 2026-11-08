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
  AttendanceReport,
  BookingStatus,
  PayChannelCode,
  PayChannelItem,
  ReportSummaryRow,
  ReportType,
  ShowSession,
  StageFeeRule,
  StageFeeTxn,
  TicketRule,
  TicketTxn,
  RealtimeStatus,
  RoomSession,
  SelfOrder,
  RoomCall,
} from './types.js'

/* ───────────────────────── 传输层抽象 ───────────────────────── */

/** 审批单行(列表用;bizPayload 为申请时快照) */
export interface ApprovalRow {
  id: number
  storeId: number
  bizType: string
  bizPayload: unknown
  amount?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  applicantId: number
  approverId?: number
  decidedAt?: string
  remark?: string
  createdAt: string
}

/** 台票流水行(列表用;含销售经理冗余与规则名) */
export interface TicketTxnRow extends Omit<TicketTxn, 'payChannel' | 'refSessionId'> {
  stageName: string | null
  badgeNo: string | null
  realName: string
  ruleName: string
  payChannel: string | null
  refSessionId: number | null
  operatorId: number | null
}

/** 台票余额行(按规则聚合;expireAt 为首购+validDays,长期票为 null;expired=到期后余额视图归零) */
export interface TicketBalanceRow {
  ticketRuleId: number
  name: string
  validDays: number
  balance: number
  expireAt: string | null
  expired: boolean
}

/** 展示投放行 */
export interface ShowcaseCastRow {
  id: number
  artistId: number
  stageName: string | null
  badgeNo: string | null
  realName: string
  roomId: number | null
  roomNo: string | null
  groupId: number | null
  castBy: number
  createdAt: string
  endedAt: string | null
}

/** 关房结算单预览行(与 close 同一归集口径;live=true 金额为此刻报价) */
export interface BillPreviewSessionRow {
  sessionId: number
  artistId: number
  stageName: string | null
  badgeNo: string | null
  startAt: string
  endAt: string | null
  durationMinutes: number
  billHours: number | null
  unitPrice: number
  priceSlotName: string | null
  amount: number
  live: boolean
  minDurationApplied: boolean
}

export interface BillPreview {
  roomSessionId: number
  roomId: number
  roomNo: string
  startAt: string
  elapsedMinutes: number
  quotedAt: string
  sessions: BillPreviewSessionRow[]
  orders: Array<{
    orderId: number
    artistId: number
    stageName: string | null
    items: unknown
    totalAmount: number
    status: string
    placedAt: string
  }>
  roomFee: number
  orderTotal: number
  totalAmount: number
  artists: Array<{ artistId: number; stageName: string | null; badgeNo: string | null; feeBalance: number }>
  /** 在房销售经理台票余额(§6.6 台票抵扣并入结算的分配参考;expired 余额已归零) */
  ticketOptions: Array<{
    artistId: number
    stageName: string | null
    badgeNo: string | null
    ticketRuleId: number
    ruleName: string
    balance: number
    /** 面值(元/张):抵扣额 = qty × faceValue */
    faceValue: number
    expireAt: string | null
  }>
  billing: {
    feeMode: 'HOURLY' | 'FLAT'
    roundingEnabled: boolean
    roundingThresholdMinutes: number
    minCharge: number
    capCharge: number
  }
}

/** 销售端「我的订单」(a21:房账+自点单归一视图;scope=ARTIST 强制本人) */
export interface MeOrdersResult {
  orders: Array<{
    id: number
    /** SELF_ORDER=自点单;ROOM_FEE=本人上场次时间费(已随房账结算) */
    kind: 'SELF_ORDER' | 'ROOM_FEE'
    businessDate: string
    roomNo: string
    /** SELF_ORDER=点单金额;ROOM_FEE=该场次计费额 */
    amount: number
    /** SELF_ORDER: PLACED/DELIVERED/SETTLED/CANCELLED;ROOM_FEE: SETTLED */
    status: string
    placedAt: string | null
    settledAt: string | null
    items: Array<{ goodsId: number; name: string; qty: number; unitPrice: number }> | null
  }>
  summary: { orderTotal: number; feeTotal: number; count: number }
}

/** 双轨对账单日结果(overall: NO_DATA/PENDING_LEGACY/MATCHED/EXPLAINED/OPEN) */
export interface ReconListResult {
  rows: Array<{ metric: string; selfValue: number; legacyValue: number; diff: number; status: string }>
  overall: string
  selfMetrics: { openCount: number; roomFee: number; orderTotal: number; checkedIn: number }
}

/** 服务评价行(列表用;含销售经理冗余) */
export interface ReviewRow {
  id: number
  businessDate: string
  artistId: number
  stageName: string | null
  badgeNo: string | null
  realName: string
  reviewType: string | null
  score: number | null
  content: string | null
  reviewer: string | null
  createdAt: string
}

/** 评价统计(均分/星级分布) */
export interface ReviewSummary {
  count: number
  avgScore: number
  dist: Record<'1' | '2' | '3' | '4' | '5', number>
}

/** 双轨对账 14 天门禁视图 */
export interface ReconHistory {
  days: Array<{ businessDate: string; overall: string; complete: boolean; matched: number; total: number }>
  streak: number
  gateDays: number
  gatePassed: boolean
  currentBusinessDate: string
}

/** 语音盒子测试结果 */
export interface VoiceBoxTestResult {
  ok: boolean
  skipped?: boolean
  status?: number
  error?: string
  configured: boolean
}

/** 轮台队列(销售经理设置⑧):当日已签到且空闲的在岗销售经理,按被派次数/最近被派/签到时间排序 */
export interface DispatchQueue {
  businessDate: string
  mode: 'ROTATION' | 'SELF_PICK' | 'MIXED' | string
  rows: Array<{
    position: number
    artistId: number
    stageName: string | null
    badgeNo: string | null
    groupId: number | null
    supervisorName: string | null
    todayDispatches: number
    lastDispatchAt: string | null
    checkedInAt: string
  }>
}

/** 门店参数合并视图(GET /store-config/artist-settings;门店行 > env/内置默认) */
export interface StoreArtistSettingsView {
  requiredProfileFields: string[]
  reportRequireReview: boolean
  reportOpenFrom?: string
  reportOpenTo?: string
  checkoutMinMinutes: number
  allowSelfScanFinish: boolean
  allowStageWithoutCheckin: boolean
  ticketPurchaseEnabled: boolean
  ticketPurchaseMaxPerDay?: number
  roomBilling: {
    feeMode: 'HOURLY' | 'FLAT'
    roundingEnabled: boolean
    roundingThresholdMinutes: number
    crossDayAccumulate: boolean
    minCharge: number
    capCharge: number
    channels: PayChannelItem[]
  }
  stageAssignMode: 'ROTATION' | 'SELF_PICK' | 'MIXED'
}

/** 门店参数更新体(PUT;仅落显式提供的键) */
export interface StoreArtistSettingsUpdate {
  requiredProfileFields: string[]
  reportSettings: { requireReview?: boolean; openFrom?: string; openTo?: string }
  checkoutMinMinutes: number
  allowSelfScanFinish: boolean
  allowStageWithoutCheckin: boolean
  ticketPurchase: { enabled?: boolean; maxPerDay?: number }
  roomBilling: Partial<StoreArtistSettingsView['roomBilling']>
  stageAssignMode: 'ROTATION' | 'SELF_PICK' | 'MIXED'
}

/** 预约行(列表用;artistName 以档案艺名优先) */
export interface BookingRow extends Omit<ArtistBooking, 'bookingTime' | 'roomId' | 'roomName' | 'groupId' | 'artistId' | 'artistName' | 'customerLeadId' | 'customerName'> {
  bookingTime: string | null
  roomId: number | null
  roomName: string | null
  groupId: number | null
  artistId: number | null
  artistName: string | null
  badgeNo: string | null
  customerId: number | null
  customerName: string | null
}

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
  /** 各端注入:管理端取 JWT;销售端取微信 session token */
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
    /** 销售端扫码签到(类型=报备类型;geo 可空,失败标记 checkinGeoOk=false) */
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
    /** 转包厢(需求全集 §6.6):终止当前计时并按快照结算,同事务新开一条上钟记录 */
    transfer: (p: { sessionId: number; toRoomId: number }) =>
      this.post<{ finishedSessionId: number; newSessionId: number }>('/sessions/' + String(p.sessionId) + '/transfer', p),
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
      /** 收费通道 code(现金/转账/自定义1-3;须在门店通道清单内) */
      payChannel: PayChannelCode
    }, idemKey?: string) =>
      this.post<{ txnId: number; balance: number }>('/stage-fee/recharge', p, idemKey),
    manualDeduct: (p: { artistId: number; amount: number; remark: string }, idemKey?: string) =>
      this.post<{ txnId?: number; approvalId?: number }>('/stage-fee/manual-deduct', p, idemKey),
    txns: (q: {
      businessDateFrom: string
      businessDateTo: string
      type?: 'RECHARGE' | 'ROOM_SETTLE' | 'MANUAL_DEDUCT'
      groupId?: number
      keyword?: string
    }) => this.get<{ rows: StageFeeTxn[]; total: number; totalAmount: number }>(
      '/stage-fee/txns',
      q,
    ),
    balance: (artistId: number) =>
      this.get<{ balance: number }>('/stage-fee/balance/' + String(artistId)),
    /** 冲正(铁律:更正=REVERSE 反向流水+关联原单;原单只增不改) */
    reverse: (p: { txnId: number; remark: string }, idemKey?: string) =>
      this.post<{ txnId: number; balance: number }>('/stage-fee/txns/' + String(p.txnId) + '/reverse', { remark: p.remark }, idemKey),
  }

  /* ── 审批(手动扣费高额;审批人与申请人不得同一人) ── */
  approvals = {
    list: (q: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; page?: number; pageSize?: number }) =>
      this.get<{ rows: ApprovalRow[]; total: number }>('/approvals', q),
    decide: (p: { id: number; decision: 'APPROVED' | 'REJECTED' }, idemKey?: string) =>
      this.post<{ id: number; status: 'APPROVED' | 'REJECTED'; txnId?: number }>('/approvals/' + String(p.id) + '/decide', { decision: p.decision }, idemKey),
  }

  /* ── 台票(四页:设置/购买/购买记录/使用记录;流水只增) ── */
  tickets = {
    rules: {
      list: () => this.get<{ rows: TicketRule[] }>('/ticket-rules'),
      /** 有 id 走 PUT 更新,无 id 走 POST 新建 */
      upsert: (p: Omit<TicketRule, 'id' | 'storeId'> & { id?: number }) =>
        p.id !== undefined
          ? this.put<{ updated: true }>('/ticket-rules/' + String(p.id), p)
          : this.post<{ id: number }>('/ticket-rules', p),
      remove: (id: number) => this.del('/ticket-rules/' + String(id)),
    },
    purchase: (p: { artistId: number; ticketRuleId: number; qty: number; payChannel: PayChannelCode }, idemKey?: string) =>
      this.post<{ txnId: number; amount: number; balance: number }>('/tickets/purchase', p, idemKey),
    use: (p: { artistId: number; ticketRuleId: number; qty?: number; refSessionId?: number }, idemKey?: string) =>
      this.post<{ txnId: number; balance: number }>('/tickets/use', p, idemKey),
    txns: (q: {
      businessDateFrom: string
      businessDateTo: string
      type?: 'BUY' | 'USE' | 'EXPIRE'
      artistId?: number
      keyword?: string
      page?: number
      pageSize?: number
    }) =>
      this.get<{ rows: TicketTxnRow[]; total: number; totalAmount: number; page: number; pageSize: number }>('/tickets/txns', q),
    /** 按规则聚合的余额(含有效期) */
    balance: (artistId: number) =>
      this.get<{ rows: TicketBalanceRow[]; total: number }>('/tickets/balance/' + String(artistId)),
    /** 销售端:本人余额+流水 */
    my: (q: { businessDateFrom: string; businessDateTo: string }) =>
      this.get<{ balance: { rows: TicketBalanceRow[]; total: number }; txns: TicketTxnRow[] }>('/tickets/my', q),
  }

  /* ── 展示控制台(投放在场销售经理到包厢/组别展示屏) ── */
  showcase = {
    list: (q?: { active?: boolean; roomId?: number; groupId?: number }) =>
      this.get<{ rows: ShowcaseCastRow[] }>('/showcase', q),
    /** 投放:仅审核通过销售经理可投(rejected=未审核被拒);同目标去重(skipped) */
    cast: (p: { artistIds: number[]; roomId?: number; groupId?: number }, idemKey?: string) =>
      this.post<{ ids: number[]; skipped: number[]; rejected: number[] }>('/showcase/cast', p, idemKey),
    end: (id: number) => this.post<{ ended: true }>('/showcase/' + String(id) + '/end', {}),
    endAll: (p?: { roomId?: number; groupId?: number }) =>
      this.post<{ ended: number }>('/showcase/end-all', p ?? {}),
  }

  /* ── 门店参数(销售经理设置 8 项;计费配置含最低消费/封顶/通道清单) ── */
  storeConfig = {
    get: () => this.get<StoreArtistSettingsView>('/store-config/artist-settings'),
    update: (p: Partial<StoreArtistSettingsUpdate>) =>
      this.put<{ updated: true }>('/store-config/artist-settings', p),
  }

  /* ── 房账(方案甲:开/关房 + 结算单预览 + 关房统一结算) ── */
  roomSessions = {
    /** 开房:artistIds 进房即上钟;轮台模式(⑧)越序 40914;撞未超时 BOOKED 预约 40915(可强开,记审计) */
    open: (p: { roomId: number; artistIds: number[]; overrideReason?: string; ignoreBookingHold?: boolean }, idemKey?: string) =>
      this.post<{ roomSessionId: number; businessDate: string; dispatchMode: string; overridden: number[] }>('/room-sessions/open', p, idemKey),
    /** 结算单预览(只读;关房弹窗展示明细,金额为此刻报价;含台票余额分配参考) */
    billPreview: (id: number) => this.get<BillPreview>('/room-sessions/' + String(id) + '/bill-preview'),
    /** 关房统一结算:台费抵扣(ROOM_SETTLE)+ 台票抵扣(USE 只增,qty×面值)后余额按现金收款 */
    close: (p: {
      roomSessionId: number
      settleType: 'CASH' | 'FEE_DEDUCT' | 'MIXED' | 'TICKET'
      feeDeductAllocations?: Array<{ artistId: number; amount: number }>
      /** 台票抵扣分配(§6.6):逐条 canUseTicket 校验,写 USE 流水(refSessionId=该销售经理在本场首个场次) */
      ticketAllocations?: Array<{ artistId: number; ticketRuleId: number; qty: number }>
      remark?: string
    }, idemKey?: string) =>
      this.post<{ roomFee: number; orderTotal: number; totalAmount: number; settledSessions: number; ticketDeductAmount: number; feeDeductAmount: number }>(
        '/room-sessions/' + String(p.roomSessionId) + '/close',
        p,
        idemKey,
      ),
    list: (q: { businessDate: string; status?: string }) =>
      this.get<{ rows: RoomSession[]; total: number }>('/room-sessions', q),
  }
  rooms = {
    cleaningDone: (roomId: number) => this.post<{ ok: true }>('/rooms/' + String(roomId) + '/cleaning-done', {}),
    bulkCleaningDone: () => this.post<{ updated: number }>('/rooms/bulk-cleaning-done', {}),
  }

  /* ── 销售端本人视图(scope=ARTIST 强制本人) ── */
  me = {
    /** 我的订单(a21):自点单 + 已随房账结算的本人在场场次时间费 */
    orders: () => this.get<MeOrdersResult>('/me/orders'),
  }

  /* ── 硬件语音盒子(II 期联动层;未配置 VOICE_BOX_URL 时 skipped) ── */
  voiceBox = {
    test: (text: string) => this.post<VoiceBoxTestResult>('/voice-box/test', { text }),
  }

  /* ── 轮台派单(销售经理设置⑧):当日队列与推荐位 ── */
  dispatch = {
    queue: () => this.get<DispatchQueue>('/dispatch/queue'),
    next: (count = 1) => this.get<DispatchQueue>('/dispatch/next', { count }),
  }

  /* ── 双轨对账(P0 门禁;14 天连续 MATCHED 才满足切换) ── */
  recon = {
    list: (businessDate: string) => this.get<ReconListResult>('/reports/recon', { businessDate }),
    importLegacy: (p: { businessDate: string; metrics: Record<string, number> }) =>
      this.post<{ rows: Array<{ metric: string; status: string }> }>('/reports/recon/legacy', p),
    /** 手工触发自算快照(日切 job 自动做;首日/补录用) */
    snapshot: (businessDate: string) => this.post<{ snapshotted: true }>('/reports/recon/snapshot', { businessDate }),
    history: (days = 14) => this.get<ReconHistory>('/reports/recon/history', { days }),
  }

  /* ── 销售经理自点单 ── */
  selfOrders = {
    place: (p: {
      sessionId: number
      artistId: number
      items: Array<{ goodsId: number; qty: number }>
    }, idemKey?: string) =>
      this.post<{ orderId: number; totalAmount: number }>('/self-orders', p, idemKey),
    deliver: (orderId: number) => this.post<{ ok: true }>('/self-orders/' + String(orderId) + '/deliver', {}),
    cancel: (orderId: number, idemKey?: string) =>
      this.post<{ ok: true }>('/self-orders/' + String(orderId) + '/cancel', {}, idemKey),
    list: (q: { sessionId?: number; artistId?: number; businessDate?: string; status?: string }) =>
      this.get<{ rows: SelfOrder[]; total: number; totalAmount: number }>('/self-orders', q),
  }
  goods = {
    list: (q?: { onSale?: boolean }) =>
      this.get<{ rows: Array<{ id: number; name: string; category?: string; unit?: string; salePrice: number }> }>('/goods', q),
    create: (p: { name: string; category?: string; unit?: string; salePrice: number; onSale?: boolean }) =>
      this.post<{ id: number }>('/goods', p),
  }

  /* ── P0-1 叫钟队列 ── */
  calls = {
    create: (p: { roomId: number; artistId: number }) =>
      this.post<{ callId: number; voiceText: string }>('/room-calls', p),
    list: (q: { businessDate: string; status?: string }) =>
      this.get<{ rows: RoomCall[]; total: number }>('/room-calls', q),
    setStatus: (id: number, status: 'CALLED' | 'ACCEPTED' | 'DONE' | 'CANCELLED') =>
      this.post<{ ok: true }>('/room-calls/' + String(id) + '/status', { status }),
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
  /* ── 服务评价(III 期:只增不改不删;统计按营业日区间) ── */
  reviews = {
    list: (q: {
      businessDateFrom: string
      businessDateTo: string
      artistId?: number
      reviewType?: string
      minScore?: number
      keyword?: string
      page?: number
      pageSize?: number
    }) => this.get<{ rows: ReviewRow[]; total: number; summary: ReviewSummary; page: number; pageSize: number }>('/reviews', q),
    create: (p: { artistId: number; reviewType: string; score: number; content?: string; reviewer?: string; at?: string }, idemKey?: string) =>
      this.post<{ id: number }>('/reviews', p, idemKey),
    /** 销售端:本人评价 */
    my: () => this.get<{ rows: ReviewRow[]; summary: ReviewSummary }>('/reviews/my'),
  }
  /* ── 预约(BOOKED→ARRIVED/CANCELLED/NO_SHOW,终态锁定;锁钟期内撞开房 40915) ── */
  bookings = {
    list: (q: { businessDate?: string; status?: BookingStatus; page?: number; pageSize?: number }) =>
      this.get<{ rows: BookingRow[]; total: number; page: number; pageSize: number }>('/bookings', q),
    create: (p: {
      bookingTime?: string
      roomId?: number
      groupId?: number
      artistId?: number
      artistName?: string
      /** 关联客资 id(客资体系衔接) */
      customerId?: number
      bookingNo?: string
      /** 押金(元,默认 0;登记口径,收款在线下) */
      deposit?: number
      /** 锁钟分钟数(默认 30;bookingTime+holdMinutes 内该房拒绝他人开房 40915) */
      holdMinutes?: number
    }, idemKey?: string) =>
      this.post<{ id: number; bookingNo: string }>('/bookings', p, idemKey),
    setStatus: (id: number, status: Exclude<BookingStatus, 'BOOKED'>) =>
      this.post<{ status: BookingStatus; autoCallId: number | null }>('/bookings/' + String(id) + '/status', { status }),
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
  private put<T>(path: string, body?: unknown) {
    return this.transport.request<T>({ method: 'PUT', path, body })
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
