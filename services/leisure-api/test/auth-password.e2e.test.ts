/**
 * P0-1 首登必改密码 e2e:
 * - 默认口令账号登录 → mustChangePassword=true → 业务接口 40302
 * - 弱口令/原密错误被拒 → 合规改密成功换发 token → 业务接口放行 → 再登录 mustChangePassword=false
 * 可重复:专用账号在两个强密码间轮换(seed 复位为默认口令)。所有口令只从环境变量读取:
 *   LEISURE_E2E_PWD_ACCOUNT / LEISURE_E2E_PWD_DEFAULT / LEISURE_E2E_PWD_ROTATE_A / LEISURE_E2E_PWD_ROTATE_B
 */
import { describe, expect, it } from 'vitest'

const BASE = 'http://127.0.0.1:3001/api/v1'
const ACCOUNT = process.env.LEISURE_E2E_PWD_ACCOUNT
const DEFAULT_PWD = process.env.LEISURE_E2E_PWD_DEFAULT
const ROTATE_A = process.env.LEISURE_E2E_PWD_ROTATE_A
const ROTATE_B = process.env.LEISURE_E2E_PWD_ROTATE_B
const canRun = [ACCOUNT, DEFAULT_PWD, ROTATE_A, ROTATE_B].every((v) => v !== undefined && v !== '')

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  bearer?: string,
): Promise<{ http: number; body: { code: number; msg: string; data: T } }> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer !== undefined && bearer !== '' ? { Authorization: 'Bearer ' + bearer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as { code: number; msg: string; data: T } | null
  return { http: res.status, body: json ?? { code: res.status, msg: 'no body', data: null as T } }
}

interface LoginData {
  accessToken: string
  mustChangePassword: boolean
}

async function loginAny(): Promise<{ pwd: string; data: LoginData } | null> {
  for (const pwd of [DEFAULT_PWD, ROTATE_A, ROTATE_B]) {
    const r = await api<LoginData>('POST', '/auth/admin/login', { account: ACCOUNT, password: pwd })
    if (r.body.code === 0) return { pwd: pwd as string, data: r.body.data }
  }
  return null
}

describe.skipIf(!canRun)('P0-1 首登必改密码', () => {
  it('默认口令 → 40302 拦截 → 弱口令/原密错误拒 → 合规改密 → 放行 → 标志清零', async () => {
    const first = await loginAny()
    expect(first).not.toBeNull()
    const { pwd, data } = first!

    if (data.mustChangePassword) {
      // 默认口令状态:业务接口一律 40302(HTTP 403),改密与 me 放行
      const blocked = await api('GET', '/artists?pageSize=1', undefined, data.accessToken)
      expect(blocked.body.code).toBe(40302)
      const me = await api<{ sub: number }>('GET', '/auth/me', undefined, data.accessToken)
      expect(me.body.code).toBe(0)
    }

    // 策略负向向量(派生值,非凭据):纯数字 / 纯字母 / 原密错误
    const digitsOnly = '1'.repeat(8)
    const lettersOnly = 'a'.repeat(10)
    const weak = await api('POST', '/auth/admin/change-password', { oldPassword: pwd, newPassword: digitsOnly }, data.accessToken)
    expect(weak.body.code).not.toBe(0)
    const noDigit = await api('POST', '/auth/admin/change-password', { oldPassword: pwd, newPassword: lettersOnly }, data.accessToken)
    expect(noDigit.body.code).not.toBe(0)
    const wrongOld = await api('POST', '/auth/admin/change-password', { oldPassword: pwd + 'x', newPassword: ROTATE_A }, data.accessToken)
    expect(wrongOld.body.code).not.toBe(0)

    // 合规改密(与当前密码不同的轮换值)
    const next = pwd === ROTATE_A ? ROTATE_B : ROTATE_A
    const changed = await api<LoginData>('POST', '/auth/admin/change-password', { oldPassword: pwd, newPassword: next }, data.accessToken)
    expect(changed.body.code).toBe(0)
    expect(changed.body.data.mustChangePassword).toBe(false)

    // 新 token 可访问业务接口
    const ok = await api('GET', '/artists?pageSize=1', undefined, changed.body.data.accessToken)
    expect(ok.body.code).toBe(0)

    // 新密码重新登录:标志已清;旧密码失效
    const relogin = await api<LoginData>('POST', '/auth/admin/login', { account: ACCOUNT, password: next })
    expect(relogin.body.code).toBe(0)
    expect(relogin.body.data.mustChangePassword).toBe(false)
    const stale = await api('POST', '/auth/admin/login', { account: ACCOUNT, password: pwd })
    expect(stale.body.code).not.toBe(0)
  })
})
