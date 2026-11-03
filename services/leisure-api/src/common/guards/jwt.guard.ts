/**
 * 认证守卫(JWT)+ 功能码守卫(@RequirePerm)
 * payload: { sub: userId, storeId?, permCodes: string[], scope: 'ADMIN' | 'ARTIST' }
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { ERR, LeisureError } from '@yyc3/leisure-core'
import { PrismaService } from '../../prisma/prisma.service.js'

export interface JwtPayload {
  sub: number
  name: string
  storeId?: number
  permCodes: string[]
  scope: 'ADMIN' | 'ARTIST'
  /** 首登必改(P0-1):true 时除改密/me 外管理端接口一律 40302 */
  mustChangePassword?: boolean
}

export interface ReqWithUser extends Request {
  user?: JwtPayload
}

/** 改密前仍可访问的管理端路径(后缀匹配,兼容全局前缀) */
const PASSWORD_CHANGE_ALLOWLIST = ['/auth/admin/change-password', '/auth/me']

export const PERM_KEY = 'leisure:perm'
export const PUBLIC_KEY = 'leisure:public'

/** 功能码要求(管理端接口标注) */
export const RequirePerm = (...perms: string[]) => SetMetadata(PERM_KEY, perms)

/** 公开路由(登录等无 token 可访问;全局 JwtGuard 旁路) */
export const Public = () => SetMetadata(PUBLIC_KEY, true)

@Injectable()
export class JwtGuard implements CanActivate {
  /** 角色功能码 30s 缓存(权限变更 ≤30s 生效;避免每请求查库) */
  private static permCache = new Map<number, { codes: string[]; ts: number }>()
  private static readonly PERM_CACHE_TTL_MS = 30_000

  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /** 实时功能码:优先角色现值(30s 缓存),取不到回退 JWT 快照 */
  private async effectivePermCodes(payload: JwtPayload): Promise<string[]> {
    if (payload.scope !== 'ADMIN') return payload.permCodes
    const now = Date.now()
    const cached = JwtGuard.permCache.get(payload.sub)
    if (cached !== undefined && now - cached.ts < JwtGuard.PERM_CACHE_TTL_MS) return cached.codes
    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { status: true, role: { select: { permCodes: true } } },
    })
    // 账号被停用:即时失效(即使 JWT 未过期)
    if (user === null || user.status !== 1) return []
    const codes = Array.isArray(user.role?.permCodes) ? (user.role!.permCodes as string[]) : payload.permCodes
    JwtGuard.permCache.set(payload.sub, { codes, ts: now })
    return codes
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>()
    // 公开路由旁路(@Public 标注,方法覆盖类)
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? false
    if (isPublic) return true
    const header = req.header('Authorization')
    if (header === undefined || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token')
    }
    const token = header.slice(7)
    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token)
    } catch {
      throw new UnauthorizedException('invalid or expired token')
    }
    ;(req as ReqWithUser).user = payload

    // 首登必改(P0-1):默认口令未改前,管理端只放行改密与 me
    if (payload.scope === 'ADMIN' && payload.mustChangePassword === true) {
      const path = (req.path ?? req.url ?? '').split('?')[0] ?? ''
      const allowed = PASSWORD_CHANGE_ALLOWLIST.some((p) => path.endsWith(p))
      if (!allowed) {
        throw new LeisureError(ERR.PASSWORD_CHANGE_REQUIRED, '首次登录须先修改默认密码')
      }
    }

    // 功能码校验(类/方法元数据合并)
    // 标注了 @RequirePerm 的路由=管理端接口:scope 非 ADMIN 一律拒绝
    // (否则销售端 token 可绕过功能码直调管理接口);ADMIN 再比对实时功能码
    const required =
      this.reflector.getAllAndOverride<string[] | undefined>(PERM_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? []
    if (required.length > 0) {
      if (payload.scope !== 'ADMIN') {
        throw new ForbiddenException('admin scope required')
      }
      const owned = new Set(await this.effectivePermCodes(payload))
      const missing = required.filter((p) => !owned.has(p))
      if (missing.length > 0) {
        throw new ForbiddenException('missing perm: ' + missing.join(','))
      }
    }
    return true
  }
}

