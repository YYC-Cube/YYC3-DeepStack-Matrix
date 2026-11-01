/**
 * 登录页:手机号+密码 → JWT(后端连错 5 次锁 15 分钟)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { LeisureError } from '@yyc3/leisure-core'
import { useAuthStore } from '@/stores/auth'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const token = useAuthStore((s) => s.token)
  const [phone, setPhone] = useState('13103790379')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(): Promise<void> {
    if (phone === '' || password === '') {
      toast.error('请输入手机号与密码')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const json = (await r.json()) as { code: number; msg: string; data?: { accessToken: string; name: string; permCodes: string[] } }
      if (json.code !== 0 || json.data === undefined) {
        toast.error(json.msg)
        return
      }
      login({ token: json.data.accessToken, name: json.data.name, permCodes: json.data.permCodes })
      toast.success('欢迎回来,' + json.data.name)
      navigate('/')
    } catch (e) {
      toast.error(e instanceof LeisureError ? e.message : '登录失败,请检查网络')
    } finally {
      setBusy(false)
    }
  }

  // 已登录直接进(开发友好)
  if (token !== null && token !== '') {
    void navigate('/')
  }

  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)' }}
    >
      <Card className="w-[380px] p-8 flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#00d4ff]">YYC³ LeisureManage</h1>
          <p className="text-xs text-[#8b9bb4] mt-1">艺人管理系统 · Web 管理端</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#8b9bb4]">手机号</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#8b9bb4]">密码</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
          />
        </div>
        <Button disabled={busy} onClick={() => void submit()}>
          {busy ? '登录中…' : '登录'}
        </Button>
        <p className="text-[10px] text-[#8b9bb4] text-center">连续失败 5 次将锁定 15 分钟</p>
      </Card>
    </div>
  )
}
