/**
 * 修改密码(P0-1 首登必改):默认口令账号登录后被强制引导至此;改密成功换发新 token 后进入系统
 * 策略与后端一致:8-64 位、含字母与数字、不与原密相同、非弱口令
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

function policyError(pwd: string, old: string): string | null {
  if (pwd.length < 8 || pwd.length > 64) return '新密码须为 8-64 位'
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return '新密码须同时包含字母与数字'
  if (pwd === old) return '新密码不能与原密码相同'
  return null
}

export default function ChangePasswordPage(): React.JSX.Element {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const name = useAuthStore((s) => s.name)
  const mustChange = useAuthStore((s) => s.mustChangePassword)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  if (token === null || token === '') {
    void navigate('/login')
  }

  async function submit(): Promise<void> {
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
      toast.success('密码已更新')
      navigate('/')
    } catch {
      toast.error('修改失败,请检查网络')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)' }}
    >
      <Card className="w-[400px] p-8 flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#00d4ff]">修改密码</h1>
          <p className="text-xs text-[#8b9bb4] mt-1">
            {mustChange ? '首次登录须先修改默认密码后方可使用系统' : name + ' · 修改登录密码'}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#8b9bb4]">原密码</label>
          <Input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#8b9bb4]">新密码(8-64 位,含字母与数字)</label>
          <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#8b9bb4]">确认新密码</label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
          />
        </div>
        <Button disabled={busy} onClick={() => void submit()}>
          {busy ? '提交中…' : '确认修改'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          退出登录
        </Button>
      </Card>
    </div>
  )
}
