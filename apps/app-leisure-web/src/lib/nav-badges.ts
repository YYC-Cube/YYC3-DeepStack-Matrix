/**
 * 底部导航角标单源(2026-11-17 角标深化批;BottomNav 与 m-workbench 同源,禁双实现)
 * 三数:沟通未读(各群 after=已读水位增量求和)/客资超期(daily-summary.overdue)/房态待办(BOOKED 待到店+CLEANING 待清扫,细粒度拆分)
 * 持久化:yyc3-nav-badges 先显上次值再校准(弱网体验);已读水位键 yyc3-chat-read 与 m-chat.tsx 同键同义
 */
import { req, client } from '@/lib/api'

export interface NavBadges {
  chat: number
  cust: number
  /** 房态细粒度(2026-11-17):待到店预定/待清扫确认分开计 */
  booked: number
  cleaning: number
}

const BADGE_KEY = 'yyc3-nav-badges'

function readMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('yyc3-chat-read') ?? '{}') as Record<string, number> } catch { return {} }
}

export function loadBadgeCache(): Partial<NavBadges> {
  try { return JSON.parse(localStorage.getItem(BADGE_KEY) ?? '{}') as Partial<NavBadges> } catch { return {} }
}

export function saveBadgeCache(b: NavBadges): void {
  try { localStorage.setItem(BADGE_KEY, JSON.stringify(b)) } catch { /* 静默 */ }
}

/** 沟通未读:从未打开过的群不计(水位 0 跳过),避免存量历史全算未读 */
export async function loadChatUnread(): Promise<number> {
  const res = await req<{ rows: Array<{ id: number; msgCount: number }> }>('GET', '/chat/groups')
  const rm = readMap()
  let total = 0
  for (const g of res.rows) {
    const wm = rm[String(g.id)] ?? 0
    if (wm === 0) continue
    const delta = await req<{ rows: unknown[] }>('GET', '/chat/groups/' + String(g.id) + '/messages?after=' + String(wm))
    total += delta.rows.length
  }
  return total
}

export async function loadCustOverdue(): Promise<number> {
  const r = await req<{ overdue: number }>('GET', '/customers/daily-summary')
  return r.overdue
}

/** 房态待办细粒度(BOOKED=待到店 / CLEANING=待清扫确认) */
export async function loadBoardDetailed(): Promise<{ booked: number; cleaning: number }> {
  const bd = client.businessDateOf()
  const [rooms, bookings] = await Promise.all([
    req<{ rows: Array<{ status: string }> }>('GET', '/store/rooms?pageSize=100'),
    client.bookings.list({ businessDate: bd, status: 'BOOKED', pageSize: 100 }),
  ])
  return {
    cleaning: (rooms.rows ?? []).filter((r) => r.status === 'CLEANING').length,
    booked: (bookings.rows ?? []).length,
  }
}

/** 三数一次拉全(调用方自行 set+persist) */
export async function loadAllBadges(): Promise<NavBadges> {
  const [chat, cust, board] = await Promise.allSettled([loadChatUnread(), loadCustOverdue(), loadBoardDetailed()])
  const out: NavBadges = {
    chat: chat.status === 'fulfilled' ? chat.value : (loadBadgeCache().chat ?? 0),
    cust: cust.status === 'fulfilled' ? cust.value : (loadBadgeCache().cust ?? 0),
    booked: board.status === 'fulfilled' ? board.value.booked : (loadBadgeCache().booked ?? 0),
    cleaning: board.status === 'fulfilled' ? board.value.cleaning : (loadBadgeCache().cleaning ?? 0),
  }
  saveBadgeCache(out)
  return out
}
