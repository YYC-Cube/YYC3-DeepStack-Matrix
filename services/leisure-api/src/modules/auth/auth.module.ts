/**
 * 认证模块:管理端登录(JWT)+ 微信登录/绑定(骨架,微信开放平台凭据就绪后接通)
 */
import { Body, Controller, Get, Module, Post, Req, UnauthorizedException, Injectable, ConflictException } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service.js'
import { env } from '../../config/env.js'
import { JwtGuard, Public, type JwtPayload } from '../../common/guards/jwt.guard.js'
import { LeisureError, ERR } from '@yyc3/leisure-core'

/* ── Service ── */

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** 管理端登录(手机号+密码);连错5次锁15分钟(库计数,Redis 增强位阶段3接) */
  async adminLogin(p: { phone: string; password: string }): Promise<{
    accessToken: string
    refreshToken: string
    permCodes: string[]
    name: string
  }> {
    const user = await this.prisma.adminUser.findUnique({ where: { phone: p.phone } })
    if (user === null) {
      // 不存在账号与密码错误同文案,不给枚举探测面
      throw new UnauthorizedException('手机号或密码错误')
    }
    if (user.status !== 1) {
      throw new UnauthorizedException('账号已停用')
    }
    // 锁定期内直接拒绝(42901 → HTTP 429),不比对密码
    if (user.lockedUntil !== null && user.lockedUntil.getTime() > Date.now()) {
      const remainMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new LeisureError(ERR.RATE_LIMITED, '登录失败次数过多', { retryAfterMinutes: remainMin })
    }
    const okPwd = await bcrypt.compare(p.password, user.passwordHash)
    if (!okPwd) {
      const failed = user.failedLoginCount + 1
      if (failed >= 5) {
        // 第5次错误:锁15分钟并清零计数(锁过期后重新累计)
        await this.prisma.adminUser.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
        })
      } else {
        await this.prisma.adminUser.update({
          where: { id: user.id },
          data: { failedLoginCount: failed },
        })
      }
      throw new UnauthorizedException('手机号或密码错误')
    }
    // 成功即复位
    if (user.failedLoginCount !== 0 || user.lockedUntil !== null) {
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      })
    }
    const role = user.roleId
      ? await this.prisma.role.findUnique({ where: { id: user.roleId } })
      : null
    const permCodes = Array.isArray(role?.permCodes) ? (role?.permCodes as string[]) : []
    return this.issue({
      sub: user.id,
      name: user.name,
      storeId: user.storeId ?? undefined,
      permCodes,
      scope: 'ADMIN',
    })
  }

  /** 微信登录骨架:code 换 openid(凭据就绪后接通);未绑定返回 NEED_BIND */
  async wxLogin(_code: string): Promise<{ status: 'OK'; token: string } | { status: 'NEED_BIND'; bindToken: string }> {
    const openid = await this.codeToOpenid(_code)
    const artist = await this.prisma.artist.findFirst({
      where: { wechatOpenid: openid, status: 1, deletedAt: null },
    })
    if (artist === null) {
      // bindToken=短期(15min)签名,携带 openid
      const bindToken = await this.jwt.signAsync(
        { openid, typ: 'BIND' },
        { secret: env().JWT_SECRET, expiresIn: '15m' },
      )
      return { status: 'NEED_BIND', bindToken }
    }
    const issued = await this.issue({
      sub: artist.id,
      name: artist.stageName ?? artist.realName,
      storeId: artist.storeId,
      permCodes: [],
      scope: 'ARTIST',
    })
    return { status: 'OK', token: issued.accessToken }
  }

  /** 微信绑定:bindToken + 档案匹配(腰牌号/手机号);跨店唯一 → 转移工单 */
  async wxBind(p: {
    bindToken: string
    badgeNo?: string
    phone?: string
    storeId: number
  }): Promise<{ status: 'BOUND' } | { status: 'TRANSFER_PENDING'; workorderId: number }> {
    let openid: string
    try {
      const payload = await this.jwt.verifyAsync<{ openid: string; typ: string }>(p.bindToken, {
        secret: env().JWT_SECRET,
      })
      if (payload.typ !== 'BIND') throw new Error('bad typ')
      openid = payload.openid
    } catch {
      throw new UnauthorizedException('bindToken 无效或过期')
    }
    const conflict = await this.prisma.artist.findFirst({
      where: { wechatOpenid: openid, deletedAt: null },
    })
    if (conflict !== null && conflict.storeId !== p.storeId) {
      if (env().TRANSFER_MODE === 'manual') {
        const wo = await this.prisma.transferWorkorder.create({
          data: {
            openid,
            fromStoreId: conflict.storeId,
            fromArtistId: conflict.id,
            toStoreId: p.storeId,
            toBadgeNo: p.badgeNo ?? null,
            payload: conflict as unknown as object,
            createdBy: 0,
          },
        })
        return { status: 'TRANSFER_PENDING', workorderId: wo.id }
      }
      throw new ConflictException('微信已绑定其他门店(自动转移模式未启用)')
    }

    const candidate = await this.prisma.artist.findFirst({
      where: {
        storeId: p.storeId,
        deletedAt: null,
        OR: [
          p.badgeNo !== undefined ? { badgeNo: p.badgeNo } : undefined,
          p.phone !== undefined ? { phone: p.phone } : undefined,
        ].filter((x): x is NonNullable<typeof x> => x !== undefined),
      },
    })
    if (candidate === null) {
      throw new LeisureError(ERR.NOT_FOUND, '未找到匹配的艺人档案(腰牌号/手机号)')
    }
    await this.prisma.$transaction([
      this.prisma.artist.update({
        where: { id: candidate.id },
        data: { wechatOpenid: openid },
      }),
      this.prisma.wechatBindLog.create({
        data: {
          openid,
          artistId: candidate.id,
          storeId: candidate.storeId,
          action: 'BIND',
          mode: 'MANUAL',
        },
      }),
    ])
    return { status: 'BOUND' }
  }

  async verify(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, { secret: env().JWT_SECRET })
  }

  private async issue(payload: JwtPayload): Promise<{
    accessToken: string
    refreshToken: string
    permCodes: string[]
    name: string
  }> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env().JWT_SECRET,
      expiresIn: env().JWT_ACCESS_TTL,
    })
    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, typ: 'REFRESH' },
      { secret: env().JWT_REFRESH_SECRET, expiresIn: env().JWT_REFRESH_TTL },
    )
    return { accessToken, refreshToken, permCodes: payload.permCodes, name: payload.name }
  }

  /** 微信 code2session(凭据就绪后接通;骨架返回确定性占位以支撑联调) */
  private async codeToOpenid(code: string): Promise<string> {
    const appid = env().WX_APPID
    const secret = env().WX_SECRET
    if (appid === undefined || secret === undefined || appid === '' || secret === '') {
      // 骨架模式:code 即 openid(仅限 dev),生产必须配置 WX_APPID/WX_SECRET
      return 'dev-openid-' + code
    }
    const url =
      'https://api.weixin.qq.com/sns/jscode2session?appid=' +
      encodeURIComponent(appid) +
      '&secret=' +
      encodeURIComponent(secret) +
      '&js_code=' +
      encodeURIComponent(code) +
      '&grant_type=authorization_code'
    const res = await fetch(url)
    const json = (await res.json()) as { openid?: string; errcode?: number }
    if (json.openid === undefined || json.openid === '') {
      throw new LeisureError(ERR.PAY_CHANNEL_ERROR, 'wx code2session failed')
    }
    return json.openid
  }
}

/* ── Controller ── */

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('admin/login')
  async adminLogin(
    @Body() body: { phone: string; password: string },
  ): Promise<unknown> {
    return this.auth.adminLogin(body)
  }

  @Public()
  @Post('wx/login')
  async wxLogin(@Body() body: { code: string }): Promise<unknown> {
    return this.auth.wxLogin(body.code)
  }

  @Post('wx/bind')
  async wxBind(
    @Body()
    body: { bindToken: string; badgeNo?: string; phone?: string; storeId: number },
  ): Promise<unknown> {
    return this.auth.wxBind(body)
  }

  @Get('me')
  async me(@Req() req: Request): Promise<unknown> {
    const user = (req as Request & { user?: JwtPayload }).user
    return user ?? {}
  }
}

/* ── Module ── */

@Module({
  imports: [JwtModule.register({ secret: env().JWT_SECRET })],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
