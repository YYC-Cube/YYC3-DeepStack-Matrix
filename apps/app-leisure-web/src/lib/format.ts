/**
 * 展示格式化:金额(负数红)/时间/枚举中文标签
 * 后端 Decimal 过 API 为字符串 → 统一 num() 收敛
 */

export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  return typeof v === 'number' ? v : Number(v)
}

/** ¥1,234.56;负数由调用方配合 MoneyText 标红 */
export function fmtMoney(v: string | number | null | undefined): string {
  return num(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** ISO → YYYY-MM-DD HH:mm(本地) */
export function fmtTime(v: string | Date | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function today(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 审核状态(需求全集 §3) */
export const AUDIT_LABEL: Record<string, string> = {
  PENDING: '等待审核',
  REJECTED: '审核未通过',
  APPROVED: '审核通过',
}

/** 流水类型中文 */
export const TXN_TYPE_LABEL: Record<string, string> = {
  RECHARGE: '充值',
  SESSION_DEDUCT: '上钟扣费',
  MANUAL_DEDUCT: '手动扣费',
  REVERSE: '冲正',
}

/** 包厢状态 */
export const ROOM_STATUS_LABEL: Record<string, string> = {
  FREE: '空闲',
  OCCUPIED: '占用',
  MAINTENANCE: '维修',
  DISABLED: '停用',
}

/** 实时状态(与 leisure-core RealtimeStatus 对齐) */
export const RT_LABEL: Record<string, string> = {
  IDLE: '空闲',
  CHECKED_IN: '签到',
  ON_STAGE: '上钟',
  CROSS: '串台',
  SELECTED: '被选中',
}

export const RT_COLOR: Record<string, string> = {
  IDLE: '#8b9bb4',
  CHECKED_IN: '#00e5ff',
  ON_STAGE: '#00ff88',
  CROSS: '#ffaa00',
  SELECTED: '#ff6699',
}
