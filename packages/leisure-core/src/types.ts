/**
 * YYC³ LeisureManage · 领域类型单源
 * 依据:智慧商家 App「销售管理」25 子模块实测(2026-11-01)
 * 消费端:Web 管理后台 / PWA / Taro 小程序 / 后端(NestJS)——四端同源
 */

/* ───────────────────────── 实时状态(实测色点) ───────────────────────── */

/** 实时状态码:0 空闲 · 1 签到 · 2 上钟 · 3 串台 · 4 被选中(展示投放) */
export enum RealtimeStatus {
  IDLE = 0,
  CHECKED_IN = 1,
  ON_STAGE = 2,
  CROSS = 3,
  SELECTED = 4,
} 

export const REALTIME_STATUS_LABEL: Record<RealtimeStatus, string> = {
  [RealtimeStatus.IDLE]: '空闲',
  [RealtimeStatus.CHECKED_IN]: '签到',
  [RealtimeStatus.ON_STAGE]: '上钟',
  [RealtimeStatus.CROSS]: '串台',
  [RealtimeStatus.SELECTED]: '被选中',
}

/* ───────────────────────── 报备(考勤,实测 9 枚举) ───────────────────────── */

export const REPORT_TYPES = [
  { code: 'CHECKIN', label: '签到' },
  { code: 'PEIBAN', label: '陪宴' },
  { code: 'SISHI', label: '私事' },
  { code: 'ZAOTUI', label: '早退' },
  { code: 'CHIDAO', label: '迟到' },
  { code: 'LIJIA', label: '例假' },
  { code: 'QITA', label: '其他' },
  { code: 'WEIBAO', label: '未报备' },
] as const

export type ReportType = (typeof REPORT_TYPES)[number]['code']

/** 报备汇总列(实测汇总矩阵列序) */
export const REPORT_SUMMARY_KEYS = [
  'peiban', 'checkin', 'sishi', 'zaotui', 'chidao', 'lijia', 'qita', 'weibao', 'checkedOut', 'total',
] as const
export type ReportSummaryKey = (typeof REPORT_SUMMARY_KEYS)[number]

/** 报备汇总行:组别 × 主管 → 各状态人数(实测汇总矩阵) */
export interface ReportSummaryRow {
  groupId: number
  groupName: string
  supervisorName: string
  peiban: number
  checkin: number
  sishi: number
  zaotui: number
  chidao: number
  lijia: number
  qita: number
  weibao: number
  checkedOut: number
  total: number
}

export interface AttendanceReport {
  id: number
  storeId: number
  businessDate: string // YYYY-MM-DD(营业日冗余)
  artistId: number
  stageName: string
  groupId: number
  supervisorName: string
  type: ReportType
  reportTime: string // ISO
  checkinLat?: number
  checkinLng?: number
  /** 定位授权失败时 false,仍允许签到(风控可见) */
  checkinGeoOk: boolean
  checkoutTime?: string
  checkoutLat?: number
  checkoutLng?: number
  /** 0 自助扫码 · 1 补打卡 */
  source: 'SELF' | 'MANUAL'
  operatorName?: string
  remark?: string
}

/* ───────────────────────── 销售经理档案(实测 94 项表单子集) ───────────────────────── */

/** 档案审核状态(需求全集 §3):审核通过才对外展示 */
export const ARTIST_AUDIT_STATUSES = [
  { code: 'PENDING', label: '等待审核' },
  { code: 'REJECTED', label: '审核未通过' },
  { code: 'APPROVED', label: '审核通过' },
] as const
export type ArtistAuditStatus = (typeof ARTIST_AUDIT_STATUSES)[number]['code']

export interface Artist {
  id: number
  storeId: number
  groupId?: number
  supervisorName?: string
  levelId?: number
  realName: string
  stageName?: string
  gender: 1 | 2 // 1 女(实测默认) 2 男
  phone?: string
  badgeNo?: string
  tags: string[]
  performanceTarget: number
  /** 总上台次数上限,实测语义:0 = 不限制 */
  maxTotalShows: number
  /** 允许串台数,实测语义:0 = 不允许串台 */
  maxCrossRooms: number
  firstShowMinMinutes: number
  sameRoomMinMinutes: number
  workStartMode: 'FREE' | 'FIXED'
  workStart?: string // HH:mm
  workEndMode: 'FREE' | 'FIXED'
  workEnd?: string // HH:mm
  tipFixed: number
  hourlyRate: number
  wechatOpenid?: string
  /** 在职状态(与审核状态两个维度:审核管对外展示,在职管业务可用) */
  status: 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED'
  /** 档案审核状态(需求全集 §3;新建默认 PENDING) */
  auditStatus: ArtistAuditStatus
}

/* ───────────────────────── 包厢房号(需求全集 §5) ───────────────────────── */

/** 包厢状态:占用/空闲随上下钟自动流转;维修/停用在上钟选择框不可选 */
export const ROOM_STATUSES = [
  { code: 'FREE', label: '空闲' },
  { code: 'OCCUPIED', label: '占用' },
  { code: 'MAINTENANCE', label: '维修' },
  { code: 'DISABLED', label: '停用' },
] as const
export type RoomStatus = (typeof ROOM_STATUSES)[number]['code']

/** 包厢房号:房号店内唯一;上钟必选房号 → 带出房型匹配单价 */
export interface Room {
  id: number
  storeId: number
  /** 房号,店内唯一(如 A01、VIP03) */
  roomNo: string
  roomName?: string
  roomTypeId: number
  capacity?: number
  status: RoomStatus
  remark?: string
}

/* ───────────────────────── 台费(等级 × 房型 → 金额,实测矩阵) ───────────────────────── */

export interface StageFeeRule {
  id: number
  storeId: number
  levelId: number
  /** 适用包厢类型数组(实测:小包,中包,大包,VIP包,西亳厅,外卖房) */
  roomTypeIds: number[]
  amount: number
}

/** 台费计费模式:FLAT=按场次一口价(实测主模式) · HOURLY=按小时价折算 */
export type StageFeeMode = 'FLAT' | 'HOURLY'

export interface ShowSession {
  id: number
  storeId: number
  businessDate: string
  artistId: number
  roomId: number
  roomTypeId: number
  roomName: string
  startAt: string
  endAt?: string
  durationMinutes?: number
  isCross: boolean
  feeAmount?: number
  billNo?: string
  /** 计费单价快照(上钟时由「等级×房型」规则带出,元/小时) */
  unitPrice?: number
  /** 计费小时数(下钟时按上钟时快照阈值核算,需求全集 §6.5) */
  billHours?: number
  /** 进位阈值快照(分钟;门店改阈值不影响进行中场次) */
  roundingMinutes?: number
}

/* ───────────────────────── 门店销售经理设置(需求全集 §7,8 项) ───────────────────────── */

/** 上钟模式:轮台 / 自选 / 混合 */
export type StageAssignMode = 'ROTATION' | 'SELF_PICK' | 'MIXED'

/** 包厢计费规则设置(需求全集 §6.4) */
export interface RoomBillingConfig {
  /** 计费模式:HOURLY 小时计费(当前启用)/ FLAT 一口价(预留) */
  feeMode: StageFeeMode
  /** 是否启用进位规则;关闭 = 按实际时长向下取整到小时 */
  roundingEnabled: boolean
  /** 进位阈值 N(分钟),默认 15;剩余分钟 > N 进位 1 小时 */
  roundingThresholdMinutes: number
  /** 跨天处理:连续累计(班次周期 08:00~次日 08:00,跨天上钟时长不截断) */
  crossDayAccumulate: boolean
  /** 最低消费(元/场;预设 0=不启用;可编辑):计费低于此值按此值计 */
  minCharge?: number
  /** 封顶计费(元/场;预设 0=不封顶;可编辑):计费高于此值按此值计 */
  capCharge?: number
  /** 收费通道清单(后台可编辑;驱动充值/结算/自点单的通道下拉) */
  channels?: PayChannelItem[]
}

/** 销售经理设置 8 项(门店级隔离:A 店配置不影响 B 店;配置优先级:门店级 > 全局 env 默认) */
export interface StoreArtistSettings {
  /** ① 销售经理资料必填项(字段名数组;管控自助绑定与后台新增校验) */
  requiredProfileFields: string[]
  /** ② 销售经理报备设置:是否需主管审核 */
  reportRequireReview: boolean
  /** ② 销售经理报备设置:开放时段(HH:mm;缺省全天) */
  reportOpenFrom?: string
  reportOpenTo?: string
  /** ③ 销售经理签到后多久可签退(分钟;防刷考勤) */
  checkoutMinMinutes: number
  /** ④ 销售经理是否支持手动扫码下钟(关闭=仅前台/后台下钟) */
  allowSelfScanFinish: boolean
  /** ⑤ 未签到是否支持上钟打卡(宽松=可 / 严格=必须先签到报备) */
  allowStageWithoutCheckin: boolean
  /** ⑥ 台票购买设置 */
  ticketPurchaseEnabled: boolean
  /** ⑥ 台票购买设置:单人单日购买上限(缺省不限) */
  ticketPurchaseMaxPerDay?: number
  /** ⑦ 包厢计费规则设置(§6) */
  roomBilling: RoomBillingConfig
  /** ⑧ 销售经理上钟模式(轮台/自选/混合) */
  stageAssignMode: StageAssignMode
}

/** ① 资料必填项可选字段清单(门店在「销售经理设置」勾选;后端新增/编辑按此校验)——四端同源 */
export const ARTIST_PROFILE_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'realName', label: '姓名' },
  { key: 'stageName', label: '艺名' },
  { key: 'phone', label: '手机号' },
  { key: 'gender', label: '性别' },
  { key: 'badgeNo', label: '腰牌号' },
  { key: 'groupId', label: '组别' },
  { key: 'levelId', label: '等级' },
  { key: 'supervisorName', label: '主管' },
  { key: 'hourlyRate', label: '计时单价' },
]

/* ───────────────────────── 资金流水(只增不改) ───────────────────────── */

/** 台费流水类型(方案甲裁决 2026-11-01):
 *  RECHARGE 充值 · ROOM_SETTLE 房账关房结算(时间费即台费,下钟仅计入房账不落流水) ·
 *  MANUAL_DEDUCT 手动扣费 · REVERSE 冲正。原 SESSION_DEDUCT(下钟即扣)已废止 */
export type FeeTxnType = 'RECHARGE' | 'ROOM_SETTLE' | 'MANUAL_DEDUCT' | 'REVERSE'
/** 收费通道(用户裁决 2026-11-01):现金/转账/自定义1-3;DOUYIN 为历史兼容保留 */
export type PayChannel = 'CASH' | 'TRANSFER' | 'CUSTOM1' | 'CUSTOM2' | 'CUSTOM3' | 'DOUYIN'
/** 通道 code 入参:保留内置通道自动补全,同时接受门店自定义 code(服务端按门店清单校验) */
export type PayChannelCode = PayChannel | (string & Record<never, never>)

/** 收费通道清单项(后台可编辑标签;code 大写字母/数字/下划线 ≤20) */
export interface PayChannelItem {
  code: PayChannelCode
  label: string
}

/** 默认收费通道清单(门店可在设置中增删改名,存 store_config) */
export const DEFAULT_PAY_CHANNELS: PayChannelItem[] = [
  { code: 'CASH', label: '现金' },
  { code: 'TRANSFER', label: '转账' },
  { code: 'CUSTOM1', label: '自定义1' },
  { code: 'CUSTOM2', label: '自定义2' },
  { code: 'CUSTOM3', label: '自定义3' },
]

export interface StageFeeTxn {
  id: number
  storeId: number
  businessDate: string
  artistId: number
  type: FeeTxnType
  /** 充值正数 · 扣费负数 · 冲正与原流水反号 */
  amount: number
  payChannel?: PayChannel
  payTxnNo?: string
  refType?: 'session' | 'manual' | 'reverse'
  refId?: number
  /** MANUAL_DEDUCT 必填(红线) */
  remark?: string
  approvalId?: number
  operatorName?: string
  createdAt: string
}

/* ───────────────────────── 台票(实测四页) ───────────────────────── */

export type TicketTxnType = 'BUY' | 'USE' | 'EXPIRE'

export interface TicketRule {
  id: number
  storeId: number
  name: string
  price: number
  /** 有效期天数,0=长期 */
  validDays: number
  status: 1 | 0
}

export interface TicketTxn {
  id: number
  storeId: number
  businessDate: string
  artistId: number
  type: TicketTxnType
  ticketRuleId: number
  qty: number
  amount: number
  payChannel?: PayChannel
  refSessionId?: number
  createdAt: string
}

/* ───────────────────────── 订单 / 评价 / 预约(实测列名) ───────────────────────── */

export interface ArtistOrder {
  id: number
  orderNo: string // 实测:KB01665…
  orderType: string // 酒水订单/计时开房/…
  payStatus: '待支付' | '已付款'
  payType: string // 后买单/现金/…
  amount: number
  businessDate: string
  paidAt?: string
  roomName?: string
}

export interface ArtistReview {
  id: number
  artistId: number
  reviewType: string
  score: number
  content?: string
  reviewer?: string
  createdAt: string
}

export type BookingStatus = 'BOOKED' | 'ARRIVED' | 'CANCELLED' | 'NO_SHOW'

export interface ArtistBooking {
  id: number
  bookingNo: string
  businessDate: string
  bookingTime?: string
  roomId?: number
  roomName?: string
  groupId?: number
  artistId?: number
  artistName?: string // 艺名/腰牌号
  status: BookingStatus
  /** 押金(元;登记口径) */
  deposit?: number
  /** 锁钟截止(bookingTime + holdMinutes;期内该房拒绝他人开房 40915) */
  holdUntil?: string
  /** 到店自动叫钟记录 id(ARRIVED 且指名房+销售经理时生成) */
  callId?: number
}

/* ───────────────────────── 营业日配置 ───────────────────────── */

export interface BusinessDayConfig {
  /** 日切时刻 HH:mm,实测口径默认 08:00 */
  cutTime: string
}

/* ───────────────────────── 房账(方案甲:开/关房 + 关房统一结算) ───────────────────────── */

export interface RoomSession {
  id: number
  storeId: number
  businessDate: string
  roomId: number
  roomNo: string
  openedBy: number
  startAt: string
  endAt?: string
  status: 'OPEN' | 'CLOSED'
  /** Σ上钟时间费(关房结算时汇总;下钟计费计入房账不即扣) */
  roomFee?: number
  /** Σ销售经理自点单 */
  orderTotal: number
  totalAmount?: number
  settleType?: 'CASH' | 'FEE_DEDUCT' | 'MIXED' | 'TICKET'
  feeDeductAmount?: number
  /** 台票抵扣额(§6.6 并入结算:Σ qty×面值;USE 流水只增) */
  ticketDeductAmount?: number
  artistIds: number[]
}

export interface RoomSessionArtist {
  sessionId: number
  artistId: number
  joinedAt: string
  leftAt?: string
}

/** 销售经理自点单(差异化核心:点单权交给房内销售经理) */
export interface SelfOrder {
  id: number
  sessionId: number
  roomId: number
  artistId: number
  items: Array<{ goodsId: number; name: string; qty: number; unitPrice: number }>
  totalAmount: number
  status: 'PLACED' | 'DELIVERED' | 'SETTLED' | 'CANCELLED'
  placedAt: string
  deliveredAt?: string
  settledAt?: string
}

/** 叫钟队列(P0-1 大屏语音叫钟) */
export interface RoomCall {
  id: number
  storeId: number
  businessDate: string
  roomId: number
  roomNo: string
  artistId: number
  stageName: string
  status: 'QUEUED' | 'CALLED' | 'ACCEPTED' | 'DONE' | 'CANCELLED'
  calledAt?: string
  voiceText?: string
}

/** 自点单商品目录 */
export interface Goods {
  id: number
  storeId: number
  name: string
  category?: string
  unit?: string
  salePrice: number
  onSale: boolean
}
