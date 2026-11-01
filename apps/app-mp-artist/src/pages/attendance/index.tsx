/**
 * B2 扫码签到/签退(05 文档):选报备类型(九宫格)→ 提交(geo 可空)
 * 签退:同码再扫 → 后端校验门店级签退时限(40905 文案透出)
 * 状态卡:今日最新报备/已签退/在岗时长;scene 校验(HMAC+时间窗)
 */
import { useCallback, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { REPORT_TYPES, type ReportType } from '@yyc3/leisure-core'
import { checkin, checkout, myToday, loadAuth, errText } from '../../lib/api'

interface TodayReport {
  type: string
  reportTime: string
  checkoutTime: string | null
}

export default function Attendance() {
  const [today, setToday] = useState<TodayReport | null>(null)
  const [businessDate, setBusinessDate] = useState('')
  const [selected, setSelected] = useState<ReportType>('CHECKIN')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (): Promise<void> => {
    if (loadAuth() === null) return
    try {
      const res = await myToday()
      setToday(res.report)
      setBusinessDate(res.businessDate)
    } catch (e) {
      setMsg(errText(e))
    }
  }, [])

  useDidShow(() => {
    void load()
  })

  /** 定位(失败不拦截签到,checkinGeoOk 由后端标记) */
  async function geo(): Promise<{ lat?: number; lng?: number }> {
    try {
      const res = await Taro.getLocation({ type: 'gcj02' })
      return { lat: res.latitude, lng: res.longitude }
    } catch {
      return {}
    }
  }

  async function doCheckin(): Promise<void> {
    setBusy(true)
    setMsg('')
    try {
      const g = await geo()
      const res = await checkin({ reportType: selected, lat: g.lat, lng: g.lng })
      Taro.showToast({ title: '已签到(' + res.businessDate + ')', icon: 'success' })
      await load()
    } catch (e) {
      setMsg(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function doCheckout(): Promise<void> {
    setBusy(true)
    setMsg('')
    try {
      const g = await geo()
      const res = await checkout({ lat: g.lat, lng: g.lng })
      Taro.showToast({ title: '已签退,在岗 ' + String(res.durationMinutes) + ' 分钟', icon: 'success' })
      await load()
    } catch (e) {
      // 40905:签到未满 N 分钟(门店级配置)——文案由后端给出
      setMsg(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function scanScene(): Promise<void> {
    try {
      const res = await Taro.scanCode({})
      const scene = res.result ?? ''
      if (scene === '') return
      // scene 校验(HMAC 签名+时间窗;扩展方案①)
      const { qrcodeVerify } = await import('../../lib/api')
      const v = await qrcodeVerify(scene)
      if (v.valid) {
        Taro.showToast({ title: '现场码有效 · ' + String(v.businessDate), icon: 'success' })
      } else {
        Taro.showToast({ title: v.reason ?? '无效现场码', icon: 'none' })
      }
    } catch {
      // 用户取消扫码或环境不支持,静默
    }
  }

  const checkedIn = today !== null && today.checkoutTime === null

  return (
    <View className="mp-page">
      <View className="mp-card">
        <Text className="mp-title">报备签到 / 签退</Text>
        <Text className="mp-muted">营业日 {businessDate !== '' ? businessDate : '…'}</Text>
      </View>

      {/* 状态卡 */}
      <View className="mp-card">
        {today === null ? (
          <Text className="mp-muted">今日尚未报备,请在下方选择报备类型签到</Text>
        ) : (
          <View>
            <Text className="mp-status">
              {today.checkoutTime !== null
                ? '今日已签退'
                : '在岗中 · ' + (today.type === 'CHECKIN' ? '签到' : today.type)}
            </Text>
            <Text className="mp-muted">报备时间 {today.reportTime}</Text>
          </View>
        )}
      </View>

      {/* 九宫格报备类型(leisure-core REPORT_TYPES 单源) */}
      <View className="mp-card">
        <Text className="mp-muted">报备类型</Text>
        <View className="mp-grid">
          {REPORT_TYPES.filter((t) => t.code !== 'WEIBAO').map((t) => (
            <View
              key={t.code}
              className={'mp-grid-item' + (selected === t.code ? ' mp-grid-item-active' : '')}
              onClick={() => setSelected(t.code)}
            >
              <Text>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mp-card">
        {!checkedIn ? (
          <Button className="mp-btn" disabled={busy} loading={busy} onClick={() => void doCheckin()}>
            {busy ? '提交中…' : '签到'}
          </Button>
        ) : (
          <Button className="mp-btn-danger" disabled={busy} loading={busy} onClick={() => void doCheckout()}>
            {busy ? '提交中…' : '签退'}
          </Button>
        )}
        <Button className="mp-btn-outline" onClick={() => void scanScene()}>
          扫描现场屏二维码(校验)
        </Button>
      </View>

      {msg !== '' && (
        <View className="mp-card">
          <Text className="mp-msg">{msg}</Text>
        </View>
      )}
    </View>
  )
}
