/**
 * A17 自助注册(/pages/register;扫码免登,2026-11-05;2026-11-18 视觉/交互规范化重写)
 * 入口:管理端「注册二维码」→ H5 /m/#/pages/register/index?t=<token>
 * 字段参照竞品「我的资料」与我们 artists 表对齐(011 §图9);提交→PENDING→门店审核
 * 免登公开页:token 验签在服务端;照片走 H5 input file(canvas 压缩 dataURL)
 * 2026-11-18 Owner 真机反馈修复:①根节点补深色背景(原白底浅字对比混乱)②Input 显式高度/边框
 * (原零样式热区塌陷=「点击无法编辑」真因)③卡片分组(基础/身材/联系与照片)+必填红星+可选灰注
 * ④行内错误+toast 双通道(表单反馈规范)⑤固定底部提交条(safe-area)
 */
import { useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Image } from '@tarojs/components'
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

/* ── 深空主题样式常量(免登页不引全局主题,显式声明) ── */
const PAGE_BG = { display: 'block', width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 40%, #081430 70%, #040c1a 100%)', padding: '14px 14px 96px', boxSizing: 'border-box' } as const
const CARD = { background: 'rgba(10,30,60,0.72)', border: '1px solid rgba(0,212,255,0.14)', borderRadius: '14px', padding: '14px', marginBottom: '12px' } as const
const CARD_TITLE = { fontSize: '13px', fontWeight: 600, color: '#00d4ff', marginBottom: '10px', display: 'block' } as const
const LABEL = { fontSize: '12px', color: '#8b9bb4', marginBottom: '4px', display: 'block' } as const
const LABEL_REQ = { fontSize: '12px', color: '#8b9bb4', marginBottom: '4px', display: 'block' } as const
const INPUT_STYLE = {
  width: '100%', height: '42px', lineHeight: '42px', padding: '0 12px', boxSizing: 'border-box',
  background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.22)', borderRadius: '10px',
  color: '#e0f0ff', fontSize: '14px',
} as const
const INPUT_NUM = { ...INPUT_STYLE, textAlign: 'center' } as const
const REQ_STAR = { color: '#ff5566', marginRight: '2px' } as const
const OPT_TAG = { fontSize: '10px', color: '#8b9bb4', background: 'rgba(139,155,180,0.12)', borderRadius: '8px', padding: '1px 6px', marginLeft: '4px' } as const

/** 必填 label(红星)/可选 label(灰注) */
function LabelReq(t: string): JSX.Element {
  return <Text style={LABEL_REQ}><Text style={REQ_STAR}>*</Text>{t}</Text>
}
function LabelOpt(t: string): JSX.Element {
  return <Text style={LABEL}>{t}<Text style={OPT_TAG}>选填</Text></Text>
}

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
          // window.Image=浏览器原生构造器(与 Taro <Image> 组件同名,避免冲突)
          const img = new window.Image()
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
    if (token === '') { setErr('链接无效:请通过门店注册二维码进入'); void Taro.showToast({ title: '链接无效', icon: 'none' }); return }
    if (form.realName.trim() === '' || form.phone.trim() === '') {
      const m = '姓名与手机号必填'
      setErr(m); void Taro.showToast({ title: m, icon: 'none' }); return
    }
    if (!/^1\d{10}$/.test(form.phone.trim())) {
      const m = '手机号格式不正确(11 位数字)'
      setErr(m); void Taro.showToast({ title: m, icon: 'none' }); return
    }
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
      .then(() => { setDone(true); void Taro.showToast({ title: '提交成功', icon: 'success' }) })
      .catch((e) => { const m = errText(e); setErr(m); void Taro.showToast({ title: m, icon: 'none' }) })
      .finally(() => setBusy(false))
  }

  if (token === '') {
    return (
      <view style={{ ...PAGE_BG, paddingTop: 80 }}>
        <view style={CARD}>
          <Text style={{ fontSize: '14px', color: '#ffaa00' }}>⚠ 链接无效</Text>
          <Text style={{ fontSize: '13px', color: '#8b9bb4', marginTop: '8px', display: 'block' }}>
            请通过门店「注册二维码」进入本页。
          </Text>
        </view>
      </view>
    )
  }

  if (done) {
    return (
      <view style={{ ...PAGE_BG, paddingTop: 90 }}>
        <view style={CARD}>
          <Text style={{ fontSize: '40px', display: 'block', textAlign: 'center' }}>✅</Text>
          <Text style={{ fontSize: '18px', fontWeight: 700, color: '#e0f0ff', display: 'block', textAlign: 'center', marginTop: '10px' }}>资料已提交</Text>
          <Text style={{ fontSize: '13px', color: '#8b9bb4', display: 'block', textAlign: 'center', marginTop: '8px' }}>
            进入「待审核」;门店管理员审核通过后即完成入职,审核结果请向门店确认。
          </Text>
        </view>
      </view>
    )
  }

  return (
    <view style={PAGE_BG}>
      {/* 页头 */}
      <View style={{ marginBottom: '12px' }}>
        <Text style={{ fontSize: '18px', fontWeight: 700, color: '#e0f0ff' }}>销售经理自助资料</Text>
        <Text style={{ fontSize: '12px', color: '#8b9bb4', display: 'block', marginTop: '4px' }}>
          填写并提交后进入「待审核」;带 <Text style={REQ_STAR}>*</Text> 为必填
        </Text>
      </View>

      {/* ① 基础信息 */}
      <view style={CARD}>
        <Text style={CARD_TITLE}>① 基础信息</Text>
        <view style={{ marginBottom: '10px' }}>
          {LabelReq('姓名')}
          <Input style={INPUT_STYLE} value={form.realName} onInput={(e) => setForm({ ...form, realName: e.detail.value })} placeholder='请输入真实姓名' placeholderStyle='color:#5a6b85' />
        </view>
        <view style={{ marginBottom: '10px' }}>
          {LabelReq('手机号')}
          <Input style={INPUT_STYLE} type='number' value={form.phone} onInput={(e) => setForm({ ...form, phone: e.detail.value })} placeholder='请输入 11 位手机号' placeholderStyle='color:#5a6b85' />
        </view>
        <view style={{ marginBottom: '10px' }}>
          {LabelOpt('艺名')}
          <Input style={INPUT_STYLE} value={form.stageName} onInput={(e) => setForm({ ...form, stageName: e.detail.value })} placeholder='舞台用名' placeholderStyle='color:#5a6b85' />
        </view>
        <view>
          <Text style={LABEL}>性别</Text>
          <view style={{ display: 'flex', gap: '8px' }}>
            {['1', '2'].map((g) => (
              <button
                key={g}
                onClick={() => setForm({ ...form, gender: g })}
                style={{
                  flex: 1, height: '40px', borderRadius: '10px', fontSize: '13px',
                  border: '1px solid ' + (form.gender === g ? '#00d4ff' : 'rgba(139,155,180,0.3)'),
                  color: form.gender === g ? '#00d4ff' : '#8b9bb4',
                  background: form.gender === g ? 'rgba(0,212,255,0.1)' : 'transparent',
                }}
              >
                {g === '1' ? '女' : '男'}
              </button>
            ))}
          </view>
        </view>
      </view>

      {/* ② 身材数据(均选填) */}
      <view style={CARD}>
        <Text style={CARD_TITLE}>② 身材数据</Text>
        <view style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <view>
            {LabelOpt('身高 cm')}
            <Input style={INPUT_NUM} type='number' value={form.heightCm} onInput={(e) => setForm({ ...form, heightCm: e.detail.value })} placeholder='—' placeholderStyle='color:#5a6b85' />
          </view>
          <view>
            {LabelOpt('体重 kg')}
            <Input style={INPUT_NUM} type='number' value={form.weightKg} onInput={(e) => setForm({ ...form, weightKg: e.detail.value })} placeholder='—' placeholderStyle='color:#5a6b85' />
          </view>
          <view>
            {LabelOpt('胸围 cm')}
            <Input style={INPUT_NUM} type='number' value={form.bustCm} onInput={(e) => setForm({ ...form, bustCm: e.detail.value })} placeholder='—' placeholderStyle='color:#5a6b85' />
          </view>
          <view>
            {LabelOpt('腰围 cm')}
            <Input style={INPUT_NUM} type='number' value={form.waistCm} onInput={(e) => setForm({ ...form, waistCm: e.detail.value })} placeholder='—' placeholderStyle='color:#5a6b85' />
          </view>
          <view>
            {LabelOpt('臀围 cm')}
            <Input style={INPUT_NUM} type='number' value={form.hipCm} onInput={(e) => setForm({ ...form, hipCm: e.detail.value })} placeholder='—' placeholderStyle='color:#5a6b85' />
          </view>
        </view>
      </view>

      {/* ③ 联系与照片 */}
      <view style={CARD}>
        <Text style={CARD_TITLE}>③ 联系与照片</Text>
        <view style={{ marginBottom: '10px' }}>
          {LabelOpt('展示微信号')}
          <Input style={INPUT_STYLE} value={form.showWechat} onInput={(e) => setForm({ ...form, showWechat: e.detail.value })} placeholder='对外展示的微信号' placeholderStyle='color:#5a6b85' />
        </view>
        <Text style={LABEL}>照片(最多 6 张;首张作头像)</Text>
        <view style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {photos.map((p, i) => (
            <Image key={i} src={p} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }} mode='aspectFill' />
          ))}
          {photos.length < 6 && (
            <button
              onClick={pickPhoto}
              style={{ width: '56px', height: '56px', borderRadius: '8px', border: '1px dashed rgba(0,212,255,0.4)', color: '#00d4ff', background: 'transparent', fontSize: '22px', lineHeight: '54px', textAlign: 'center', padding: 0 }}
            >
              +
            </button>
          )}
        </view>
      </view>

      {/* 行内错误(双通道之一;toast 并行) */}
      {err !== '' && (
        <view style={{ fontSize: '12px', color: '#ff5566', background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)', borderRadius: '10px', padding: '8px 12px', marginBottom: '10px' }}>
          ⚠ {err}
        </view>
      )}

      {/* 底部固定提交条(safe-area) */}
      <view style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'rgba(6,14,31,0.96)', borderTop: '1px solid rgba(0,212,255,0.14)', zIndex: 10 }}>
        <button
          onClick={submit}
          disabled={busy}
          style={{
            width: '100%', height: '44px', borderRadius: '12px', fontWeight: 700, fontSize: '15px',
            background: busy ? 'rgba(0,212,255,0.4)' : 'linear-gradient(135deg,#00d4ff,#0088ff)',
            color: '#04121f', border: 'none', lineHeight: '44px', padding: 0,
          }}
        >
          {busy ? '提交中…' : '提交资料'}
        </button>
      </view>
    </view>
  )
}
