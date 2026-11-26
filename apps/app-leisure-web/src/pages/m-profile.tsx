/**
 * 移动「我的」页(/m/profile;2026-11-16 移动原生化批):BottomNav「我的」Tab 落点
 * 背景:原直跳桌面 profile 页(可用但不贴移动范式);本页=移动身份卡范式
 * 组成:身份卡(头像/姓名/角色/退出)+ 账号档案只读行 + 修改密码折叠表单
 * 口径:与桌面 profile.tsx 同源(/auth/me + /auth/admin/change-password + 改密策略)
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Input } from '@yyc3-deepstack/ui'
import { toast } from 'sonner'
import { BadgeCheck, ChevronDown, ChevronRight, ChevronUp, KeyRound, LogOut, ShieldCheck, Store, UserCircle2, CalendarDays, Users } from 'lucide-react'
import { req } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { YYC3LogoSvg } from '@/components/ai-assistant/YYC3LogoSvg'

interface MeProfile {
  name: string
  username?: string
  phone?: string
  roleName?: string | null
  permCodes: string[]
  storeId?: number
  createdAt?: string
}

/** 只读信息行(窄屏:提示语整行换行,值列全宽) */
function InfoRow({ icon: Icon, label, value, extra }: {
  icon: typeof UserCircle2
  label: string
  value: string
  extra?: string
}): React.JSX.Element {
  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-3 py-2.5 border-b border-[rgba(0,212,255,0.06)] last:border-b-0">
      <Icon className="w-4 h-4 text-[#00d4ff] shrink-0" />
      <span className="text-xs text-fg-muted w-20 shrink-0">{label}</span>
      <span className="text-sm text-[var(--lm-fg)] truncate flex-1 min-w-0">{value}</span>
      {extra !== undefined && <span className="text-[10px] text-fg-muted shrink-0 text-right basis-full grow sm:basis-auto sm:grow-0">{extra}</span>}
    </div>
  )
}

export default function MProfilePage(): React.JSX.Element {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const name = useAuthStore((s) => s.name)
  const logout = useAuthStore((s) => s.logout)
  const login = useAuthStore((s) => s.login)
  const [me, setMe] = useState<MeProfile | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  /** 我的客资数(listCustomers 按 viewer 过滤;pageSize=1 只取 total) */
  const [leadCount, setLeadCount] = useState<number | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const r = await fetch('/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + (token ?? '') } })
      const json = (await r.json()) as { code: number; data?: MeProfile }
      if (json.code === 0 && json.data !== undefined) setMe(json.data)
    } catch { /* 静默 */ }
  }, [token])

  useEffect(() => {
    void load()
    void req<{ rows: unknown[]; total: number }>('GET', '/customers?page=1&pageSize=1')
      .then((r) => { setLeadCount(r.total) })
      .catch(() => undefined)
  }, [load])

  function policyError(pwd: string, old: string): string | null {
    if (pwd.length < 8 || pwd.length > 64) return '新密码须为 8-64 位'
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return '新密码须同时包含字母与数字'
    if (pwd === old) return '新密码不能与原密码相同'
    return null
  }

  async function submitPassword(): Promise<void> {
    if (oldPassword === '' || newPassword === '' || confirm === '') {
      toast.error('请填写原密码/新密码/确认')
      return
    }
    const err = policyError(newPassword, oldPassword)
    if (err !== null) { toast.error(err); return }
    if (newPassword !== confirm) { toast.error('两次输入的新密码不一致'); return }
    setBusy(true)
    try {
      const r = await fetch('/api/v1/auth/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token ?? '') },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const json = (await r.json()) as {
        code: number
        msg: string
        data?: { accessToken: string; name: string; permCodes: string[]; mustChangePassword: boolean }
      }
      if (json.code !== 0 || json.data === undefined) { toast.error(json.msg); return }
      login({ token: json.data.accessToken, name: json.data.name, permCodes: json.data.permCodes, mustChangePassword: false })
      setOld('')
      setNew('')
      setConfirm('')
      toast.success('密码已更新,全端下次登录生效')
    } catch {
      toast.error('修改失败,请检查网络')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* 身份卡 */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--lm-card)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_20px_rgba(0,180,255,0.3)] overflow-hidden shrink-0">
            <YYC3LogoSvg size={52} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold text-[var(--lm-fg)] truncate max-w-full">{name}</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border shrink-0"
                style={{ color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.08)' }}
              >
                <BadgeCheck className="w-3 h-3" />
                {me?.roleName ?? '管理员'}
              </span>
            </div>
            <div className="text-[11px] text-fg-muted mt-1">YYC³ 品牌标识 · 全端统一;定期修改密码更安全</div>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <LogOut className="w-4 h-4 mr-1" />
          退出登录
        </Button>
      </div>

      {/* 账号档案(只读) */}
      <div className="rounded-2xl p-3" style={{ background: 'var(--lm-card)' }}>
        <div className="flex items-center gap-2 px-1 pb-2">
          <UserCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-[var(--lm-fg)]">账号档案</span>
          <span className="ml-auto text-[10px] text-fg-muted">🔒 系统只读 · 全端同步</span>
        </div>
        <div className="rounded-xl border border-line overflow-hidden">
          <InfoRow icon={UserCircle2} label="姓名" value={me?.name ?? name} />
          <InfoRow icon={KeyRound} label="登录账号" value={me?.username ?? me?.phone ?? '—'} extra="用户名/手机号均可登录" />
          <InfoRow icon={KeyRound} label="手机号" value={me?.phone ?? '—'} extra="🔒 更换需联系管理员" />
          <InfoRow icon={ShieldCheck} label="角色" value={me?.roleName ?? '—'} extra={String(me?.permCodes.length ?? 0) + ' 项功能码'} />
          <InfoRow icon={Store} label="所属门店" value={me?.storeId !== undefined ? '门店 #' + String(me.storeId) : '—'} />
          <InfoRow icon={CalendarDays} label="创建时间" value={me?.createdAt !== undefined ? me.createdAt.slice(0, 10) : '—'} />
        </div>
      </div>

      {/* 我的客资入口(2026-11-17:销售经理角色直达本人归属客资;后端 listCustomers 已按 viewer 过滤) */}
      <button
        className="rounded-2xl p-4 w-full flex items-center gap-3 text-left"
        style={{ background: 'var(--lm-card)' }}
        onClick={() => { navigate('/m/customers') }}
      >
        <Users className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--lm-fg)]">我的客资{leadCount !== null ? <span className="ml-1.5 text-primary">{String(leadCount)}</span> : ''}</div>
          <div className="text-[11px] text-fg-muted mt-0.5">跟进/待办/超期 · 管理端全量,销售端仅本人归属</div>
        </div>
        <ChevronRight className="w-4 h-4 text-fg-muted shrink-0" />
      </button>

      {/* 修改密码(折叠) */}
      <div className="rounded-2xl p-3" style={{ background: 'var(--lm-card)' }}>
        <button className="flex items-center gap-2 w-full px-1 py-1" onClick={() => setPwOpen(!pwOpen)}>
          <KeyRound className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-[var(--lm-fg)]">修改密码</span>
          <span className="ml-auto">
            {pwOpen ? <ChevronUp className="w-4 h-4 text-fg-muted" /> : <ChevronDown className="w-4 h-4 text-fg-muted" />}
          </span>
        </button>
        {pwOpen && (
          <div className="space-y-2 pt-2">
            <Input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} placeholder="原密码" />
            <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="新密码(8-64 位,含字母+数字)" />
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="确认新密码" />
            <Button className="w-full" disabled={busy} onClick={() => { void submitPassword() }}>更新密码</Button>
            <div className="text-[10px] text-fg-muted">改密后其它设备下次登录需用新密码</div>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-fg-muted pt-1 pb-2">YYC³ LeisureManage · 移动端</div>
    </div>
  )
}
