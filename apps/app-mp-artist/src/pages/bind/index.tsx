/**
 * B1 注册/绑定(05 文档):授权登录 → 档案匹配(腰牌号/手机号)→ 完成绑定
 * 跨店唯一冲突 → 后端返回 TRANSFER_PENDING(人工工单,TRANSFER_MODE=manual)
 * 红字规则:「若微信已绑定其他门店,绑定后将转移原资料」
 */
import { useCallback, useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getStableCode, wxLogin, wxBind, saveAuth, errText } from '../../lib/api'

export default function Bind() {
  const [bindToken, setBindToken] = useState('')
  const [badgeNo, setBadgeNo] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  /** 尝试登录:OK → 存 token 回首页;NEED_BIND → 留在本页等档案匹配 */
  const tryLogin = useCallback(async (): Promise<void> => {
    try {
      const res = await wxLogin(getStableCode())
      if (res.status === 'OK') {
        saveAuth({ token: res.token, name: res.name ?? '', storeId: 1 })
        Taro.switchTab({ url: '/pages/home/index' })
      } else {
        setBindToken(res.bindToken)
        setMsg('首次使用,请输入腰牌号或手机号完成档案绑定')
      }
    } catch (e) {
      setMsg(errText(e))
    }
  }, [])

  useDidShow(() => {
    void tryLogin()
  })

  async function submit(): Promise<void> {
    if (badgeNo.trim() === '' && phone.trim() === '') {
      setMsg('腰牌号与手机号至少填一项')
      return
    }
    setBusy(true)
    try {
      const res = await wxBind({
        bindToken,
        badgeNo: badgeNo.trim() === '' ? undefined : badgeNo.trim(),
        phone: phone.trim() === '' ? undefined : phone.trim(),
        storeId: 1,
      })
      if (res.status === 'BOUND') {
        await tryLogin()
      } else if (res.status === 'TRANSFER_PENDING') {
        setMsg('该微信已绑定其他门店,已生成跨店转移工单,请双方店管理员确认(人工模式)')
      } else {
        setMsg('未知返回状态:' + res.status)
      }
    } catch (e) {
      setMsg(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="mp-page">
      <View className="mp-card">
        <Text className="mp-title">艺人注册 / 绑定</Text>
        <Text className="mp-muted">
          扫描门店「注册二维码」进入本页;绑定后可扫码签到、查看台费流水。
        </Text>
      </View>

      <View className="mp-card">
        <View className="mp-field">
          <Text className="mp-label">腰牌号</Text>
          <Input className="mp-input" value={badgeNo} onInput={(e) => setBadgeNo(e.detail.value)} placeholder="如 A1001" />
        </View>
        <View className="mp-field">
          <Text className="mp-label">手机号</Text>
          <Input className="mp-input" type="number" value={phone} onInput={(e) => setPhone(e.detail.value)} placeholder="档案预留手机号" />
        </View>
        <Button className="mp-btn" disabled={busy} loading={busy} onClick={() => void submit()}>
          {busy ? '绑定中…' : '绑定档案'}
        </Button>
      </View>

      {msg !== '' && (
        <View className="mp-card">
          <Text className="mp-msg">{msg}</Text>
        </View>
      )}

      <View className="mp-card">
        <Text className="mp-warn">若微信已绑定其他门店,绑定后将按门店策略处理(默认人工转移工单,双方确认)。</Text>
      </View>
    </View>
  )
}
