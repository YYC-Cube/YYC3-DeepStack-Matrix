/**
 * 员工管理模块(2026-11-03 组织架构批次,《16-全链路权限体系与组织架构设计》实施):
 * 员工信息(admin_user CRUD/重置密码/停用) · 部门管理(两级树) · 权限管理(角色/功能码矩阵)
 * 红线:
 * - 全部端点 setting:manage;建号/重置密码生成的临时密码仅在响应中一次性返回(不落审计/日志)
 * - 角色权限变更 → JwtGuard 实时查库(30s 缓存)自动生效;管理员角色保护不可改码/不可删
 * - 权限链路红线(06 号):全部动作入 audit_log;密码只存 bcrypt 哈希
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common'
import { IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ArrayNotEmpty } from 'class-validator'
import type { Request } from 'express'
import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service.js'
import { STAFF_TITLE_LABEL } from '@yyc3/leisure-core'
import { RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

const TITLES = ['VP', 'MANAGER_DIRECTOR', 'MANAGER', 'CASHIER', 'FINANCE'] as const
const TITLE_LABEL: Record<string, string> = STAFF_TITLE_LABEL
/** 预置角色保护:不可删;管理员不可改功能码 */
const BUILTIN_ROLES = ['管理员']

function tempPassword(): string {
  // 预设口令(Owner 裁决 2026-11-06:全局新增员工统一 123456;mustChangePassword=true 首登强制改密)
  return '123456'
}

/* ── DTO ── */

class CreateStaffDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsString()
  @Length(5, 20)
  phone!: string
  @IsOptional()
  @IsInt()
  roleId?: number
  @IsOptional()
  @IsInt()
  departmentId?: number
  @IsOptional()
  @IsIn(TITLES)
  title?: string
  @IsOptional()
  @IsInt()
  managerId?: number
}

class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string
  @IsOptional()
  @IsInt()
  roleId?: number
  @IsOptional()
  @IsInt()
  departmentId?: number
  @IsOptional()
  @IsIn(TITLES)
  title?: string
  @IsOptional()
  @IsInt()
  managerId?: number
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number
}

class RoleDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permCodes!: string[]
}

class DepartmentDto {
  @IsString()
  @Length(1, 64)
  name!: string
  @IsOptional()
  @IsInt()
  parentId?: number
  @IsOptional()
  @IsInt()
  headUserId?: number
}

/* ── Service ── */

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 员工信息 ── */

  /** 查看者画像(角色名+职级;「管理员」预置角色或 VP 职级=超管全见) */
  async viewerProfile(userId: number, storeId: number): Promise<{ title: string | null; isSuperAdmin: boolean } | null> {
    const u = await this.prisma.adminUser.findFirst({
      where: { id: userId, storeId },
      include: { role: { select: { name: true } } },
    })
    if (u === null) return null
    const isSuperAdmin = u.role?.name === '管理员' || u.title === 'VP'
    return { title: u.title ?? null, isSuperAdmin }
  }

  /** 职级权重(16 号组织树:VP4 > 总监3 > 经理2 > 其余1;无职级=1 与一线平权) */
  private titleWeight(title: string | null): number {
    if (title === 'VP') return 4
    if (title === 'MANAGER_DIRECTOR') return 3
    if (title === 'MANAGER') return 2
    return 1
  }

  async listUsers(storeId: number, q: { departmentId?: number; keyword?: string; status?: number }, viewer?: { id: number; title: string | null; isSuperAdmin: boolean }) {
    const where = {
      storeId,
      ...(q.departmentId !== undefined ? { departmentId: q.departmentId } : {}),
      ...(q.status !== undefined ? { status: q.status } : {}),
      ...(q.keyword !== undefined && q.keyword !== ''
        ? { OR: [{ name: { contains: q.keyword } }, { phone: { contains: q.keyword } }] }
        : {}),
    }
    // 层级可见性(Owner 裁决 2026-11-06:下级不可查上级——非超管按职级权重过滤,仅见平级+下属)
    let rows = await this.prisma.adminUser.findMany({
      where,
      include: { role: { select: { name: true } } },
      orderBy: { id: 'desc' },
      take: 200,
    })
    if (viewer !== undefined && !viewer.isSuperAdmin) {
      const w = this.titleWeight(viewer.title)
      rows = rows.filter((r) => {
        if (r.id === viewer.id) return true
        const isSuper = r.role?.name === '管理员' || r.title === 'VP'
        return !isSuper && this.titleWeight(r.title) <= w
      })
    }
    const deptIds = Array.from(new Set(rows.map((r) => r.departmentId).filter((x): x is number => x !== null)))
    const depts = deptIds.length > 0
      ? await this.prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
      : []
    const deptName = new Map(depts.map((d) => [d.id, d.name]))
    // 汇报线(直属上级中文名)
    const managerIds = Array.from(new Set(rows.map((r) => r.managerId).filter((x): x is number => x !== null)))
    const managers = managerIds.length > 0
      ? await this.prisma.adminUser.findMany({ where: { id: { in: managerIds } }, select: { id: true, name: true, title: true } })
      : []
    const managerName = new Map(managers.map((m) => [m.id, (m.name ?? '') + '(' + (TITLE_LABEL[m.title ?? ''] ?? m.title ?? '—') + ')']))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        roleName: r.role?.name ?? null,
        departmentId: r.departmentId,
        departmentName: r.departmentId !== null ? deptName.get(r.departmentId) ?? null : null,
        title: r.title,
        titleName: r.title !== null ? TITLE_LABEL[r.title] ?? r.title : null,
        managerId: r.managerId,
        managerName: r.managerId !== null ? managerName.get(r.managerId) ?? null : null,
        status: r.status,
        mustChangePassword: r.mustChangePassword,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  async createUser(storeId: number, body: CreateStaffDto, operatorId: number): Promise<{ id: number; tempPassword: string }> {
    const dup = await this.prisma.adminUser.findFirst({ where: { phone: body.phone } })
    if (dup !== null) throw new BadRequestException('手机号已存在')
    if (body.roleId !== undefined) await this.assertRole(storeId, body.roleId)
    if (body.departmentId !== undefined) await this.assertDepartment(storeId, body.departmentId)
    const temp = tempPassword()
    const passwordHash = await bcrypt.hash(temp, 10)
    const created = await this.prisma.adminUser.create({
      data: {
        storeId,
        name: body.name,
        phone: body.phone,
        passwordHash,
        mustChangePassword: true,
        presetAt: new Date(),
        roleId: body.roleId ?? null,
        departmentId: body.departmentId ?? null,
        title: body.title ?? null,
        managerId: body.managerId ?? null,
        status: 1,
      },
    })
    await this.audit(storeId, operatorId, 'STAFF_USER_CREATE', 'admin_user', String(created.id), null, {
      name: body.name,
      phone: body.phone,
      roleId: body.roleId ?? null,
    })
    return { id: created.id, tempPassword: temp }
  }

  async updateUser(id: number, storeId: number, body: UpdateStaffDto, operatorId: number): Promise<void> {
    const before = await this.prisma.adminUser.findFirst({ where: { id, storeId } })
    if (before === null) throw new NotFoundException('员工不存在')
    if (body.roleId !== undefined) await this.assertRole(storeId, body.roleId)
    if (body.departmentId !== undefined) await this.assertDepartment(storeId, body.departmentId)
    if (body.managerId !== undefined && body.managerId === id) {
      throw new BadRequestException('直属上级不能是本人')
    }
    const after = await this.prisma.adminUser.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.roleId !== undefined ? { roleId: body.roleId } : {}),
        ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    })
    await this.audit(storeId, operatorId, 'STAFF_USER_UPDATE', 'admin_user', String(id), before, after)
  }

  /** 重置密码:生成临时口令 + mustChange(首登强制改密);仅响应一次性返回 */
  async resetPassword(id: number, storeId: number, operatorId: number): Promise<{ tempPassword: string }> {
    const user = await this.prisma.adminUser.findFirst({ where: { id, storeId } })
    if (user === null) throw new NotFoundException('员工不存在')
    const temp = tempPassword()
    const passwordHash = await bcrypt.hash(temp, 10)
    await this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, presetAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    })
    await this.audit(storeId, operatorId, 'STAFF_USER_RESET_PASSWORD', 'admin_user', String(id), null, null)
    return { tempPassword: temp }
  }

  /* ── 部门管理 ── */

  async listDepartments(storeId: number) {
    const rows = await this.prisma.department.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { id: 'asc' },
    })
    const headIds = Array.from(new Set(rows.map((r) => r.headUserId).filter((x): x is number => x !== null)))
    const heads = headIds.length > 0
      ? await this.prisma.adminUser.findMany({ where: { id: { in: headIds } }, select: { id: true, name: true } })
      : []
    const headName = new Map(heads.map((h) => [h.id, h.name]))
    const counts = await this.prisma.adminUser.groupBy({
      by: ['departmentId'],
      where: { storeId, status: 1, departmentId: { not: null } },
      _count: { _all: true },
    })
    const countMap = new Map(counts.map((c) => [c.departmentId, c._count._all]))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        parentId: r.parentId,
        headUserId: r.headUserId,
        headName: r.headUserId !== null ? headName.get(r.headUserId) ?? null : null,
        memberCount: countMap.get(r.id) ?? 0,
      })),
    }
  }

  async createDepartment(storeId: number, body: DepartmentDto, operatorId: number): Promise<{ id: number }> {
    const parent = body.parentId !== undefined
      ? await this.prisma.department.findFirst({ where: { id: body.parentId, storeId, deletedAt: null } })
      : null
    if (body.parentId !== undefined && parent === null) throw new NotFoundException('上级部门不存在')
    if (parent !== null && parent.parentId !== null) throw new BadRequestException('部门层级最多两级')
    const dup = await this.prisma.department.findFirst({
      where: { storeId, name: body.name, parentId: body.parentId ?? null, deletedAt: null },
    })
    if (dup !== null) throw new BadRequestException('同级部门重名')
    const created = await this.prisma.department.create({
      data: {
        storeId,
        name: body.name,
        parentId: body.parentId ?? null,
        headUserId: body.headUserId ?? null,
      },
    })
    await this.audit(storeId, operatorId, 'DEPT_CREATE', 'department', String(created.id), null, created)
    return { id: created.id }
  }

  async updateDepartment(id: number, storeId: number, body: DepartmentDto, operatorId: number): Promise<void> {
    const before = await this.prisma.department.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('部门不存在')
    if (body.parentId !== undefined && body.parentId !== null && body.parentId !== before.parentId) {
      const parent = await this.prisma.department.findFirst({ where: { id: body.parentId, storeId, deletedAt: null } })
      if (parent === null) throw new NotFoundException('上级部门不存在')
      if (parent.parentId !== null || before.parentId === null) {
        // 三级禁止;也不允许把一级挂到二级下
        throw new BadRequestException('部门层级最多两级')
      }
    }
    const after = await this.prisma.department.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
        ...(body.headUserId !== undefined ? { headUserId: body.headUserId } : {}),
      },
    })
    await this.audit(storeId, operatorId, 'DEPT_UPDATE', 'department', String(id), before, after)
  }

  async deleteDepartment(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.department.findFirst({ where: { id, storeId, deletedAt: null } })
    if (before === null) throw new NotFoundException('部门不存在')
    const members = await this.prisma.adminUser.count({ where: { departmentId: id, status: 1 } })
    if (members > 0) throw new BadRequestException('部门仍有在职成员,先转移后再删')
    const children = await this.prisma.department.count({ where: { parentId: id, deletedAt: null } })
    if (children > 0) throw new BadRequestException('部门下仍有小组,先删小组')
    await this.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit(storeId, operatorId, 'DEPT_DELETE', 'department', String(id), before, null)
  }

  /* ── 权限管理(角色/功能码) ── */

  async listRoles(storeId: number) {
    const rows = await this.prisma.role.findMany({
      where: { OR: [{ storeId }, { storeId: null }] },
      orderBy: { id: 'asc' },
    })
    const counts = await this.prisma.adminUser.groupBy({
      by: ['roleId'],
      where: { storeId, status: 1, roleId: { not: null } },
      _count: { _all: true },
    })
    const countMap = new Map(counts.map((c) => [c.roleId, c._count._all]))
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        permCodes: Array.isArray(r.permCodes) ? (r.permCodes as string[]) : [],
        builtin: BUILTIN_ROLES.includes(r.name),
        userCount: countMap.get(r.id) ?? 0,
      })),
    }
  }

  async createRole(storeId: number, body: RoleDto, operatorId: number): Promise<{ id: number }> {
    const dup = await this.prisma.role.findFirst({ where: { storeId, name: body.name } })
    if (dup !== null) throw new BadRequestException('角色重名')
    const created = await this.prisma.role.create({
      data: { storeId, name: body.name, permCodes: body.permCodes },
    })
    await this.audit(storeId, operatorId, 'ROLE_CREATE', 'role', String(created.id), null, {
      name: body.name,
      permCount: body.permCodes.length,
    })
    return { id: created.id }
  }

  async updateRole(id: number, storeId: number, body: RoleDto, operatorId: number): Promise<void> {
    const before = await this.prisma.role.findFirst({ where: { id, OR: [{ storeId }, { storeId: null }] } })
    if (before === null) throw new NotFoundException('角色不存在')
    if (BUILTIN_ROLES.includes(before.name)) {
      throw new ForbiddenException('预置角色「' + before.name + '」的功能码不可修改(防锁死)')
    }
    const after = await this.prisma.role.update({ where: { id }, data: { name: body.name, permCodes: body.permCodes } })
    await this.audit(storeId, operatorId, 'ROLE_UPDATE', 'role', String(id), before, after)
  }

  async deleteRole(id: number, storeId: number, operatorId: number): Promise<void> {
    const before = await this.prisma.role.findFirst({ where: { id, OR: [{ storeId }, { storeId: null }] } })
    if (before === null) throw new NotFoundException('角色不存在')
    if (BUILTIN_ROLES.includes(before.name)) {
      throw new ForbiddenException('预置角色「' + before.name + '」不可删除')
    }
    const users = await this.prisma.adminUser.count({ where: { roleId: id, status: 1 } })
    if (users > 0) throw new BadRequestException('角色仍有在职员工,先转移后再删')
    await this.prisma.role.delete({ where: { id } })
    await this.audit(storeId, operatorId, 'ROLE_DELETE', 'role', String(id), before, null)
  }

  /** 部门/角色下拉辅助(员工编辑表单) */
  async formOptions(storeId: number) {
    const [roles, departments, users] = await Promise.all([
      this.listRoles(storeId),
      this.listDepartments(storeId),
      this.prisma.adminUser.findMany({
        where: { storeId, status: 1, title: { in: ['VP', 'MANAGER_DIRECTOR'] } },
        select: { id: true, name: true, title: true },
      }),
    ])
    return {
      roles: roles.rows.map((r) => ({ id: r.id, name: r.name })),
      departments: departments.rows.map((d) => ({ id: d.id, name: d.name })),
      managers: users.map((u) => ({ id: u.id, name: u.name, title: TITLE_LABEL[u.title ?? ''] ?? u.title })),
    }
  }

  /* ── 内部 ── */

  private async assertRole(storeId: number, roleId: number): Promise<void> {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, OR: [{ storeId }, { storeId: null }] } })
    if (role === null) throw new NotFoundException('角色不存在')
  }

  private async assertDepartment(storeId: number, departmentId: number): Promise<void> {
    const dept = await this.prisma.department.findFirst({ where: { id: departmentId, storeId, deletedAt: null } })
    if (dept === null) throw new NotFoundException('部门不存在')
  }

  private async audit(storeId: number, operatorId: number, action: string, targetType: string, targetId: string, before: unknown, after: unknown): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorId: operatorId,
        action,
        targetType,
        targetId,
        beforeJson: (before ?? null) as object,
        afterJson: (after ?? null) as object,
      },
    })
  }
}

/* ── Controller ── */

@Controller('staff')
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @RequirePerm('setting:manage')
  @Get('users')
  async users(
    @Req() req: Request,
    @Query('departmentId') departmentId?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    const viewerProfile = user?.sub !== undefined ? await this.svc.viewerProfile(user.sub, user?.storeId ?? 1) : null
    return this.svc.listUsers(user?.storeId ?? 1, {
      departmentId: departmentId !== undefined && departmentId !== '' ? Number(departmentId) : undefined,
      keyword,
      status: status !== undefined && status !== '' ? Number(status) : undefined,
    }, viewerProfile !== null && user !== undefined ? { id: user.sub, title: viewerProfile.title, isSuperAdmin: viewerProfile.isSuperAdmin } : undefined)
  }

  @RequirePerm('setting:manage')
  @Get('form-options')
  async formOptions(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.formOptions(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Post('users')
  async create(@Req() req: Request, @Body() body: CreateStaffDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createUser(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Put('users/:id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStaffDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateUser(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('setting:manage')
  @Post('users/:id/reset-password')
  async resetPassword(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.resetPassword(id, user?.storeId ?? 1, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Get('departments')
  async departments(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listDepartments(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Post('departments')
  async createDept(@Req() req: Request, @Body() body: DepartmentDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createDepartment(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Put('departments/:id')
  async updateDept(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DepartmentDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateDepartment(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('setting:manage')
  @Delete('departments/:id')
  async deleteDept(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteDepartment(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }

  @RequirePerm('setting:manage')
  @Get('roles')
  async roles(@Req() req: Request): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.listRoles(user?.storeId ?? 1)
  }

  @RequirePerm('setting:manage')
  @Post('roles')
  async createRole(@Req() req: Request, @Body() body: RoleDto): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.createRole(user?.storeId ?? 1, body, user?.sub ?? 0)
  }

  @RequirePerm('setting:manage')
  @Put('roles/:id')
  async updateRole(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoleDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.updateRole(id, user?.storeId ?? 1, body, user?.sub ?? 0)
    return { updated: true }
  }

  @RequirePerm('setting:manage')
  @Delete('roles/:id')
  async deleteRole(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = (req as ReqWithUser).user
    await this.svc.deleteRole(id, user?.storeId ?? 1, user?.sub ?? 0)
    return { deleted: true }
  }
}

@Module({
  controllers: [StaffController],
  providers: [StaffService, PrismaService],
  exports: [StaffService],
})
export class StaffModule {}
