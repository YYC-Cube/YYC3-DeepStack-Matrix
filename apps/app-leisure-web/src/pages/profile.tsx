/**
 * 个人信息页(设置域):账号档案(只读) + 密码修改(可编辑)
 * 头像 = YYC³ 品牌头像(全端统一;不支持自定义上传,保证多端一致与安全)
 * 数据源:GET /auth/me(管理端完整档案);改密走 POST /auth/admin/change-password
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { KeyRound, ShieldCheck, Store, UserCircle2, CalendarDays, BadgeCheck, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { YYC3LogoSvg } from '@/components/ai-assistant/YYC3LogoSvg'
import { PageHeader } from '@/components/kit'

interface MeProfile {
  sub: number
  name: string
  username: string | null
  phone: string
  storeId: number | null
  roleName: string | null
  permCodes: string[]
  createdAt: string
}

/** 只读信息行 */
function InfoRow({ icon: Icon, label, value, extra }: {
  icon: typeof UserCircle2
  label: string
  value: string
  extra?: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[rgba(0,212,255,0.06)] last:border-b-0">
      <Icon className="w-4 h-4 text-[#00d4ff] shrink-0" />
      <span className="text-xs text-fg-muted w-20 shrink-0">{label}</span>
      <span className="text-sm text-[var(--lm-fg)] truncate">{value}</span>
      {extra !== undefined && <span className="ml-auto text-[10px] text-fg-muted shrink-0">{extra}</span>}
    </div>
  )
}

export default function ProfilePage(): React.JSX.Element {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const name = useAuthStore((s) => s.name)
  const mustChange = useAuthStore((s) => s.mustChangePassword)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [me, setMe] = useState<MeProfile | null>(null)
  // 改密表单
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const r = await fetch('/api/v1/auth/me', {
        headers: { Authorization: 'Bearer ' + (token ?? '') },
      })
      const json = (await r.json()) as { code: number; data?: MeProfile }
      if (json.code === 0 && json.data !== undefined) setMe(json.data)
    } catch {
      /* 静默(顶栏已有兜底) */
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  function policyError(pwd: string, old: string): string | null {
    if (pwd.length < 8 || pwd.length > 64) return '新密码须为 8-64 位'
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return '新密码须同时包含字母与数字'
    if (pwd === old) return '新密码不能与原密码相同'
    return null
  }

  async function submitPassword(): Promise<void> {
    if (oldPassword === '' || newPassword === '') {
      toast.error('请填写原密码与新密码')
      return
    }
    const err = policyError(newPassword, oldPassword)
    if (err !== null) {
      toast.error(err)
      return
    }
    if (newPassword !== confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
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
      if (json.code !== 0 || json.data === undefined) {
        toast.error(json.msg)
        return
      }
      login({
        token: json.data.accessToken,
        name: json.data.name,
        permCodes: json.data.permCodes,
        mustChangePassword: false,
      })
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

  if (token === null || token === '') {
    void navigate('/login')
  }

  const permCount = me?.permCodes.length ?? useAuthStore.getState().permCodes.length

  return (
    <div className="p-4 space-y-4 max-w-3xl">
      <PageHeader
        title="个人信息"
        desc="账号档案与安全设置;带 🔒 的为系统只读项(全端同步,不可在此修改)"
      />

      {/* 身份卡:头像(品牌,全端一致) + 姓名 + 角色 + 退出(移动端退出口:顶栏已迁此) */}
      <Card className="p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_20px_rgba(0,180,255,0.3)] overflow-hidden shrink-0">
          <YYC3LogoSvg size={52} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-[var(--lm-fg)] truncate">{name}</span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border"
              style={{ color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.08)' }}
            >
              <BadgeCheck className="w-3 h-3" />
              {me?.roleName ?? '管理员'}
            </span>
          </div>
          <div className="text-xs text-fg-muted mt-0.5">
            头像为 YYC³ 品牌标识(全端统一);账号安全请定期修改密码
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0 text-warning"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <LogOut className="w-4 h-4 mr-1" />
          退出登录
        </Button>
      </Card>

      {/* 档案(只读) */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-[#00d4ff]">
          <UserCircle2 className="w-4 h-4" /> 账号档案
          <span className="ml-auto text-[10px] text-fg-muted">🔒 系统只读 · 全端同步</span>
        </div>
        <div className="rounded-lg border border-[rgba(0,212,255,0.08)]">
          <InfoRow icon={UserCircle2} label="姓名" value={me?.name ?? name} />
          <InfoRow icon={KeyRound} label="登录账号" value={me?.username ?? me?.phone ?? '—'} extra="用户名/手机号均可登录" />
          <InfoRow icon={KeyRound} label="手机号" value={me?.phone ?? '—'} extra="🔒 更换需联系管理员" />
          <InfoRow icon={ShieldCheck} label="角色" value={me?.roleName ?? '管理员'} extra={`${String(permCount)} 项功能码`} />
          <InfoRow icon={Store} label="所属门店" value={me?.storeId !== undefined ? `门店 #${String(me.storeId)}` : '—'} />
          <InfoRow
            icon={CalendarDays}
            label="创建时间"
            value={me?.createdAt !== undefined ? me.createdAt.slice(0, 10) : '—'}
          />
        </div>
        <p className="text-xs text-fg-muted">
          档案字段(姓名/手机号/角色)由管理员在「艺人档案 / 角色权限」中维护,个人端不可自改,保证审计链完整。
        </p>
      </Card>

      {/* 可编辑:密码 */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-[#00d4ff]">
          <KeyRound className="w-4 h-4" /> 修改密码
          <span className="ml-auto text-[10px] text-fg-muted">✏️ 可编辑 · 全端下次登录生效</span>
        </div>
        <div className="grid gap-3 max-w-md">
          <div className="space-y-1">
            <Label className="text-xs text-fg-muted">原密码</Label>
            <Input type="password" value={oldPassword} onChange={(e) => { setOld(e.target.value) }} autoComplete="current-password" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-fg-muted">新密码(8-64 位,含字母与数字)</Label>
            <Input type="password" value={newPassword} onChange={(e) => { setNew(e.target.value) }} autoComplete="new-password" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-fg-muted">确认新密码</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value) }}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Button size="sm" disabled={busy} onClick={() => { void submitPassword() }}>
              {busy ? '提交中…' : '确认修改'}
            </Button>
          </div>
        </div>
        {mustChange && (
          <p className="text-xs text-[#ffaa00]">当前账号仍使用默认口令,请立即修改。</p>
        )}
      </Card>

      {/* 会话 */}
      <Card className="p-4 flex items-center gap-3">
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="text-sm text-[#ff3366] hover:underline"
        >
          退出登录(本端)
        </button>
        <span className="text-xs text-fg-muted">退出仅影响当前设备;Web/H5/小程序 会话相互独立</span>
      </Card>
    </div>
  )
}
