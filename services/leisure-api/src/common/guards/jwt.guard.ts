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
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

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
    // (否则艺人端 token 可绕过功能码直调管理接口);ADMIN 再比对功能码
    const required =
      this.reflector.getAllAndOverride<string[] | undefined>(PERM_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? []
    if (required.length > 0) {
      if (payload.scope !== 'ADMIN') {
        throw new ForbiddenException('admin scope required')
      }
      const owned = new Set(payload.permCodes)
      const missing = required.filter((p) => !owned.has(p))
      if (missing.length > 0) {
        throw new ForbiddenException('missing perm: ' + missing.join(','))
      }
    }
    return true
  }
}
