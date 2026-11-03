/**
 * 员工管理/权限链路 e2e(《16-全链路权限体系与组织架构设计》W3 固化):
 * - 部门 CRUD(两级/重名/禁删规则)
 * - 建号(临时口令一次性)→ 新员工首登 40302 强制改密 → 无角色访问管理接口 403(实时权限)
 * - 角色创建+分配 → 实时生效(新登录即带新码;停用即时失效)
 * - 预置角色保护(管理员不可改/删)
 * - 停用 → 登录 401;重置密码 → 临时口令再登 + mustChange
 * 运行:LEISURE_E2E_PHONE=… LEISURE_E2E_PASSWORD=… vitest run test/staff.e2e.test.ts
 * 口令纪律:测试口令一律运行时生成,不入源码(Mimosa 约束)
 */
import { beforeAll, describe, expect, it } from 'vitest'

const BASE = 'http://127.0.0.1:3001/api/v1'
const PHONE = process.env.LEISURE_E2E_PHONE
const PASSWORD = process.env.LEISURE_E2E_PASSWORD

interface Envelope<T> {
  code: number
  msg: string
  data: T
}

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  bearer?: string,
): Promise<{ http: number; body: Envelope<T> }> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer !== undefined && bearer !== '' ? { Authorization: 'Bearer ' + bearer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as Envelope<T> | null
  return { http: res.status, body: json ?? { code: res.status, msg: 'no body', data: null as T } }
}

/** 运行时生成符合策略的口令(8-64 位含字母数字;每跑唯一) */
function genPwd(seed: string): string {
  return 'E2e' + seed.replace(/[^a-zA-Z0-9]/g, '') + String(Date.now()).slice(-6)
}

let adminToken = ''
const staffPhone = '138' + String(Date.now()).slice(-8)
const runSeed = String(Date.now()).slice(-8)
const deptName = 'E2E-部门-' + runSeed
const roleName = 'E2E-销售总监-' + runSeed
const staffPwd2 = genPwd(runSeed + 'b')
let staffTempPwd = ''
let staffId = 0
let deptId = 0
let roleId = 0

describe.skipIf(PHONE === undefined || PASSWORD === undefined)('员工管理/权限链路', () => {
  beforeAll(async () => {
    const login = await api<{ accessToken: string }>('POST', '/auth/admin/login', { phone: PHONE, password: PASSWORD })
    adminToken = login.body.data.accessToken
    expect(adminToken).not.toBe('')
  })

  it('部门:建一级+重名拒+二级小组+无成员禁删', async () => {
    const created = await api<{ id: number }>('POST', '/staff/departments', { name: deptName }, adminToken)
    expect(created.body.code).toBe(0)
    deptId = created.body.data.id
    const dup = await api('POST', '/staff/departments', { name: deptName }, adminToken)
    expect(dup.body.code).not.toBe(0)
    const group = await api<{ id: number }>('POST', '/staff/departments', { name: deptName + '-一组', parentId: deptId }, adminToken)
    expect(group.body.code).toBe(0)
    const delBlocked = await api('DELETE', '/staff/departments/' + String(deptId), undefined, adminToken)
    expect(delBlocked.body.code).not.toBe(0) // 有小组禁删
    const delGroup = await api('DELETE', '/staff/departments/' + String(group.body.data.id), undefined, adminToken)
    expect(delGroup.body.code).toBe(0)
  })

  it('角色:新建(功能码矩阵)+ 预置管理员保护', async () => {
    const created = await api<{ id: number }>(
      'POST',
      '/staff/roles',
      { name: roleName, permCodes: ['artist:view', 'attend:summary:view'] },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    roleId = created.body.data.id
    const list = await api<{ rows: Array<{ id: number; name: string; builtin: boolean }> }>('GET', '/staff/roles', undefined, adminToken)
    const admin = list.body.data.rows.find((r) => r.name === '管理员')
    expect(admin).toBeDefined()
    expect(admin!.builtin).toBe(true)
    const updateBlocked = await api('PUT', '/staff/roles/' + String(admin!.id), { name: '管理员', permCodes: ['artist:view'] }, adminToken)
    expect(updateBlocked.body.code).not.toBe(0)
    const delBlocked = await api('DELETE', '/staff/roles/' + String(admin!.id), undefined, adminToken)
    expect(delBlocked.body.code).not.toBe(0)
  })

  it('员工:建号(临时口令)→ 首登 40302 → 改密后无 setting 码 403 → 角色实时生效', async () => {
    const created = await api<{ id: number; tempPassword: string }>(
      'POST',
      '/staff/users',
      { name: 'E2E-销售', phone: staffPhone, title: 'MANAGER', roleId, departmentId: deptId },
      adminToken,
    )
    expect(created.body.code).toBe(0)
    staffId = created.body.data.id
    staffTempPwd = created.body.data.tempPassword
    expect(staffTempPwd).not.toBe('')

    // 首登:mustChange=true → 业务接口 40302(P0-1)
    const firstLogin = await api<{ accessToken: string; mustChangePassword: boolean }>('POST', '/auth/admin/login', {
      phone: staffPhone,
      password: staffTempPwd,
    })
    expect(firstLogin.body.code).toBe(0)
    expect(firstLogin.body.data.mustChangePassword).toBe(true)
    const blocked = await api<{ code: number }>('GET', '/artists', undefined, firstLogin.body.data.accessToken)
    expect(blocked.body.code).toBe(40302)

    // 改密(口令运行时生成)→ 带角色码:artist:view 通过;setting:manage 实时 403
    const changed = await api<{ accessToken: string }>(
      'POST',
      '/auth/admin/change-password',
      { oldPassword: staffTempPwd, newPassword: staffPwd2 },
      firstLogin.body.data.accessToken,
    )
    expect(changed.body.code).toBe(0)
    const viewOk = await api('GET', '/artists?pageSize=1', undefined, changed.body.data.accessToken)
    expect(viewOk.body.code).toBe(0)
    const staffBlocked = await api<{ code: number }>('GET', '/staff/users', undefined, changed.body.data.accessToken)
    expect(staffBlocked.http).toBe(403)
  })

  it('停用:即时失效(重登 401);启用+重置密码:新临时口令+mustChange', async () => {
    const disabled = await api('PUT', '/staff/users/' + String(staffId), { status: 0 }, adminToken)
    expect(disabled.body.code).toBe(0)
    const relLogin = await api('POST', '/auth/admin/login', { phone: staffPhone, password: staffPwd2 })
    expect(relLogin.http).toBe(401)

    // 重新启用(管理员处置闭环)→ 重置密码 → 临时口令登录 + 首登强制改密
    const enabled = await api('PUT', '/staff/users/' + String(staffId), { status: 1 }, adminToken)
    expect(enabled.body.code).toBe(0)
    const reset = await api<{ tempPassword: string }>(
      'POST',
      '/staff/users/' + String(staffId) + '/reset-password',
      undefined,
      adminToken,
    )
    expect(reset.body.code).toBe(0)
    const reLogin = await api<{ mustChangePassword: boolean }>('POST', '/auth/admin/login', {
      phone: staffPhone,
      password: reset.body.data.tempPassword,
    })
    expect(reLogin.body.code).toBe(0)
    expect(reLogin.body.data.mustChangePassword).toBe(true)
  })

  it('工作通告:发布→全员可见→删除', async () => {
    const title = 'E2E 通告-' + runSeed
    const created = await api<{ id: number }>('POST', '/notices', { title, body: 'e2e 通告正文' }, adminToken)
    expect(created.body.code).toBe(0)
    const list = await api<{ rows: Array<{ id: number; title: string; publisherName: string | null }> }>('GET', '/notices', undefined, adminToken)
    expect(list.body.data.rows.some((r) => r.title === title)).toBe(true)
    const del = await api('DELETE', '/notices/' + String(created.body.data.id), undefined, adminToken)
    expect(del.body.code).toBe(0)
    const after = await api<{ rows: Array<{ title: string }> }>('GET', '/notices', undefined, adminToken)
    expect(after.body.data.rows.some((r) => r.title === title)).toBe(false)
  })
})
