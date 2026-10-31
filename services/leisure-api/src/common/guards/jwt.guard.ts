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

export interface JwtPayload {
  sub: number
  name: string
  storeId?: number
  permCodes: string[]
  scope: 'ADMIN' | 'ARTIST'
}

export interface ReqWithUser extends Request {
  user?: JwtPayload
}

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

    // 功能码校验(类/方法元数据合并)
    const required =
      this.reflector.getAllAndOverride<string[] | undefined>(PERM_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? []
    if (payload.scope === 'ADMIN' && required.length > 0) {
      const owned = new Set(payload.permCodes)
      const missing = required.filter((p) => !owned.has(p))
      if (missing.length > 0) {
        throw new ForbiddenException('missing perm: ' + missing.join(','))
      }
    }
    return true
  }
}
