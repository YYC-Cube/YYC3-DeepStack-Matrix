/**
 * 原生 ws 独立挂载(/ws/chat;沟通批深化二 2026-11-05)
 * 选用原生 ws 而非 @nestjs/websockets:Nest 10 + platform-ws 适配器识别摩擦(No driver),自研桥 ~60 行更稳
 * 协议:连接 ?token=<JWT>(鉴权)→ client 发 {event:'chat:join', data:{groupId}}(成员校验)→ REST 新消息经 setChatServer 注入的 adapter 广播
 */
import { WebSocketServer } from 'ws'
import type { IncomingMessage, Server as HttpServer } from 'node:http'
import { JwtService } from '@nestjs/jwt'
import { env } from '../config/env.js'
import { PrismaService } from '../prisma/prisma.service.js'

interface ChatSession {
  scope: string
  id: number
  storeId: number
  groups: Set<string>
}

export interface ChatBroadcaster {
  to: (room: string) => { emit: (ev: string, data: unknown) => void }
  /** 定向用户(task:changed 等非房间事件;scope+id 匹配在线会话) */
  toUsers: (scope: string, ids: number[]) => { emit: (ev: string, data: unknown) => void }
  /** 全店广播(chat:ping 群列表未读实时;不要求 join 房间) */
  toStore: (storeId: number) => { emit: (ev: string, data: unknown) => void }
}

/** 已验证 socket + 房间注册表 */
const sessions = new Map<object, ChatSession>()

function sendSock(sock: object, payload: string): void {
  try {
    (sock as unknown as { send: (s: string) => void }).send(payload)
  } catch {
    /* 死连接由 close 事件清理 */
  }
}

export function mountChatWs(
  httpServer: HttpServer,
  deps: { setChatServer: (b: ChatBroadcaster) => void; prisma: PrismaService; jwt: JwtService },
): void {
  const { prisma, jwt } = deps
  // 路径含全局前缀(2026-11-07 修复:原生 ws 升级请求不受 Nest setGlobalPrefix 影响,曾挂 /ws/chat 与客户端 /api/v1/ws/chat 错配→永远静默回落轮询)
  const wss = new WebSocketServer({ server: httpServer, path: '/api/v1/ws/chat' })

  // 广播适配器:to('chat:<id>') 房间语义 + toUsers 定向语义;事件名透传(chat:message/react/retract/task:changed)
  deps.setChatServer({
    to(room: string) {
      const gid = room.replace('chat:', '')
      return {
        emit(ev: string, data: unknown) {
          const payload = JSON.stringify({ event: ev, data })
          for (const [sock, sess] of sessions) {
            if (sess.groups.has(gid)) sendSock(sock, payload)
          }
        },
      }
    },
    toUsers(scope: string, ids: number[]) {
      const targets = new Set(ids)
      return {
        emit(ev: string, data: unknown) {
          const payload = JSON.stringify({ event: ev, data })
          for (const [sock, sess] of sessions) {
            if (sess.scope === scope && targets.has(sess.id)) sendSock(sock, payload)
          }
        },
      }
    },
    toStore(storeId: number) {
      return {
        emit(ev: string, data: unknown) {
          const payload = JSON.stringify({ event: ev, data })
          for (const [sock, sess] of sessions) {
            if (sess.storeId === storeId) sendSock(sock, payload)
          }
        },
      }
    },
  })

  wss.on('connection', (sock: import('ws').WebSocket, req: IncomingMessage) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', 'http://local')
        const token = url.searchParams.get('token') ?? ''
        const payload = await jwt.verifyAsync(token, { secret: env().JWT_SECRET })
        sessions.set(sock, {
          scope: String(payload.scope ?? 'ADMIN'),
          id: Number(payload.sub ?? 0),
          storeId: Number(payload.storeId ?? 1),
          groups: new Set(),
        })
      } catch {
        try { (sock as unknown as { close: () => void }).close() } catch { /* 已断 */ }
        sessions.delete(sock)
      }
    })()

    sock.on('message', (raw: import('ws').RawData) => {
      void (async () => {
        const sess = sessions.get(sock)
        if (sess === undefined) return
        try {
          const msg = JSON.parse(String(raw)) as { event?: string; data?: { groupId?: number } }
          if (msg.event === 'chat:join' && msg.data !== undefined && msg.data.groupId !== undefined) {
            const g = await prisma.chatGroup.findFirst({ where: { id: msg.data.groupId, storeId: sess.storeId } })
            if (g !== null) {
              if (sess.scope === 'ARTIST' && g.groupId !== null) {
                const a = await prisma.artist.findUnique({ where: { id: sess.id }, select: { groupId: true } })
                if ((a?.groupId ?? null) !== g.groupId) {
                  sendSock(sock, JSON.stringify({ event: 'chat:error', data: { msg: '仅本组别成员可进群' } }))
                  return
                }
              }
              sess.groups.add(String(msg.data.groupId))
            }
          }
        } catch {
          /* 非 JSON/查询失败静默 */
        }
      })()
    })

    sock.on('close', () => {
      sessions.delete(sock)
    })
  })
}
