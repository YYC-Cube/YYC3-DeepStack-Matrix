/**
 * A17 自助注册(/pages/register;扫码免登,2026-11-05)
 * 入口:管理端「注册二维码」→ H5 /m/#/pages/register/index?t=<token>
 * 字段参照竞品「我的资料」与我们 artists 表对齐(011 §图9);提交→PENDING→门店审核
 * 免登公开页:token 验签在服务端;照片走 H5 input file(canvas 压缩 dataURL)
 */
import { useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Button, Input, Label } from '@tarojs/components'
import { registerSubmit, errText } from '../../lib/api'

interface FormState {
  realName: string
  stageName: string
  phone: string
  gender: string
  heightCm: string
  weightKg: string
  bustCm: string
  waistCm: string
  hipCm: string
  showWechat: string
}

const numOrNull = (v: string): number | undefined => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Number(v))

export default function RegisterPage() {
  const router = useRouter()
  const token = useMemo(() => router.params.t ?? '', [router.params])
  const [form, setForm] = useState<FormState>({
    realName: '', stageName: '', phone: '', gender: '1',
    heightCm: '', weightKg: '', bustCm: '', waistCm: '', hipCm: '', showWechat: '',
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const pickPhoto = (): void => {
    // H5:原生 input 触发(Taro H5=浏览器;小程序端 chooseImage 回落)
    if (typeof document !== 'undefined') {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const f = input.files?.[0]
        if (f === undefined) return
        const reader = new FileReader()
        reader.onload = () => {
          const img = new Image()
          img.onload = () => {
            const scale = Math.min(1, 480 / Math.max(img.width, img.height))
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
            setPhotos((s) => (s.length >= 6 ? s : [...s, dataUrl]))
          }
          img.src = String(reader.result)
        }
        reader.readAsDataURL(f)
      }
      input.click()
    } else {
      void Taro.chooseImage({ count: 1 }).then((r) => {
        const p = r.tempFilePaths[0]
        if (p !== undefined) setPhotos((s) => (s.length >= 6 ? s : [...s, p]))
      }).catch(() => undefined)
    }
  }

  const submit = (): void => {
    if (token === '') { setErr('链接无效:请通过门店注册二维码进入'); return }
    if (form.realName.trim() === '' || form.phone.trim() === '') { setErr('姓名与手机号必填'); return }
    setBusy(true)
    setErr('')
    registerSubmit({
      token,
      realName: form.realName.trim(),
      stageName: form.stageName.trim() === '' ? undefined : form.stageName.trim(),
      phone: form.phone.trim(),
      gender: Number(form.gender) || 1,
      heightCm: numOrNull(form.heightCm),
      weightKg: numOrNull(form.weightKg),
      bustCm: numOrNull(form.bustCm),
      waistCm: numOrNull(form.waistCm),
      hipCm: numOrNull(form.hipCm),
      showWechat: form.showWechat.trim() === '' ? undefined : form.showWechat.trim(),
      photos,
    })
      .then(() => setDone(true))
      .catch((e) => setErr(errText(e)))
      .finally(() => setBusy(false))
  }

  if (token === '') {
    return (
      <view className='p-6 text-sm' style={{ color: '#8b9bb4' }}>
        链接无效:请通过门店「注册二维码」进入本页。
      </view>
    )
  }

  if (done) {
    return (
      <view className='p-6 space-y-3 text-center' style={{ paddingTop: 80 }}>
        <view style={{ fontSize: 40 }}>✅</view>
        <view style={{ fontSize: 18, fontWeight: 700, color: '#e0f0ff' }}>资料已提交</view>
        <view style={{ fontSize: 13, color: '#8b9bb4' }}>门店管理员审核通过后即完成入职;审核结果请向门店确认。</view>
      </view>
    )
  }

  return (
    <view className='p-4 space-y-3' style={{ paddingBottom: 60 }}>
      <view style={{ fontSize: 18, fontWeight: 700, color: '#e0f0ff' }}>销售经理自助资料</view>
      <view style={{ fontSize: 12, color: '#8b9bb4' }}>填写并提交后进入「待审核」;带 * 为必填</view>

      <view className='space-y-2'>
        <Label className='text-xs'>姓名 *</Label>
        <Input value={form.realName} onInput={(e) => setForm({ ...form, realName: e.detail.value })} placeholder='请输入姓名' />
      </view>
      <view className='space-y-2'>
        <Label className='text-xs'>手机号 *</Label>
        <Input type='number' value={form.phone} onInput={(e) => setForm({ ...form, phone: e.detail.value })} placeholder='请输入手机号' />
      </view>
      <view className='space-y-2'>
        <Label className='text-xs'>艺名(可选)</Label>
        <Input value={form.stageName} onInput={(e) => setForm({ ...form, stageName: e.detail.value })} placeholder='请输入艺名' />
      </view>
      <view className='space-y-2'>
        <Label className='text-xs'>性别</Label>
        <view className='flex gap-2'>
          {['1', '2'].map((g) => (
            <button
              key={g}
              onClick={() => setForm({ ...form, gender: g })}
              style={{
                padding: '4px 16px', borderRadius: 999, fontSize: 12,
                border: '1px solid ' + (form.gender === g ? '#00d4ff' : 'rgba(139,155,180,0.3)'),
                color: form.gender === g ? '#00d4ff' : '#8b9bb4', background: 'transparent',
              }}
            >
              {g === '1' ? '女' : '男'}
            </button>
          ))}
        </view>
      </view>
      <view className='grid grid-cols-2 gap-2'>
        <view className='space-y-1'>
          <Label className='text-xs'>身高 cm</Label>
          <Input type='number' value={form.heightCm} onInput={(e) => setForm({ ...form, heightCm: e.detail.value })} />
        </view>
        <view className='space-y-1'>
          <Label className='text-xs'>体重 kg</Label>
          <Input type='number' value={form.weightKg} onInput={(e) => setForm({ ...form, weightKg: e.detail.value })} />
        </view>
        <view className='space-y-1'>
          <Label className='text-xs'>胸围 cm</Label>
          <Input type='number' value={form.bustCm} onInput={(e) => setForm({ ...form, bustCm: e.detail.value })} />
        </view>
        <view className='space-y-1'>
          <Label className='text-xs'>腰围 cm</Label>
          <Input type='number' value={form.waistCm} onInput={(e) => setForm({ ...form, waistCm: e.detail.value })} />
        </view>
        <view className='space-y-1'>
          <Label className='text-xs'>臀围 cm</Label>
          <Input type='number' value={form.hipCm} onInput={(e) => setForm({ ...form, hipCm: e.detail.value })} />
        </view>
        <view className='space-y-1'>
          <Label className='text-xs'>展示微信号</Label>
          <Input value={form.showWechat} onInput={(e) => setForm({ ...form, showWechat: e.detail.value })} />
        </view>
      </view>
      <view className='space-y-2'>
        <Label className='text-xs'>照片(最多 6 张;首张作头像)</Label>
        <view className='flex gap-2 flex-wrap items-center'>
          {photos.map((p, i) => (
            <img key={i} src={p} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
          ))}
          {photos.length < 6 && (
            <button onClick={pickPhoto} style={{ width: 56, height: 56, borderRadius: 8, border: '1px dashed rgba(139,155,180,0.4)', color: '#8b9bb4', background: 'transparent', fontSize: 20 }}>
              +
            </button>
          )}
        </view>
      </view>

      {err !== '' && <view style={{ color: '#ff5566', fontSize: 12 }}>{err}</view>}
      <button
        onClick={submit}
        disabled={busy}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 700,
          background: busy ? 'rgba(0,212,255,0.4)' : '#00d4ff', color: '#04121f', border: 'none', marginTop: 8,
        }}
      >
        {busy ? '提交中…' : '提交资料'}
      </button>
    </view>
  )
}
