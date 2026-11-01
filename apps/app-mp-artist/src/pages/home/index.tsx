/**
 * 首页(状态卡 + 三入口;未绑定自动引导 B1)
 */
import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { loadAuth, clearAuth, myToday, errText } from '../../lib/api'

interface TodayReport {
  type: string
  reportTime: string
  checkoutTime: string | null
}

export default function Home() {
  const [authed, setAuthed] = useState(true)
  const [today, setToday] = useState<TodayReport | null>(null)
  const [name, setName] = useState('')

  useDidShow(() => {
    void (async () => {
      const auth = loadAuth()
      if (auth === null) {
        // 未绑定/未登录 → B1
        setAuthed(false)
        return
      }
      setAuthed(true)
      setName(auth.name)
      try {
        const res = await myToday()
        setToday(res.report)
      } catch (e) {
        Taro.showToast({ title: errText(e), icon: 'none' })
      }
    })()
  })

  if (!authed) {
    return (
      <View className="mp-page">
        <View className="mp-card">
          <Text className="mp-title">欢迎来到 LeisureManage</Text>
          <Text className="mp-muted">首次使用请先完成档案绑定(腰牌号/手机号)。</Text>
          <Button className="mp-btn" onClick={() => Taro.navigateTo({ url: '/pages/bind/index' })}>
            去绑定
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="mp-page">
      <View className="mp-card">
        <Text className="mp-title">{name !== '' ? name : '艺人'}</Text>
        <Text className="mp-status">
          {today === null
            ? '今日未报备'
            : today.checkoutTime !== null
              ? '今日已签退'
              : '在岗中'}
        </Text>
      </View>

      <View className="mp-card">
        <Button className="mp-btn" onClick={() => Taro.switchTab({ url: '/pages/attendance/index' })}>
          扫码签到 / 签退
        </Button>
        <Button className="mp-btn-outline" onClick={() => Taro.switchTab({ url: '/pages/mine/index' })}>
          我的台费流水
        </Button>
        <Button
          className="mp-btn-outline"
          onClick={() => {
            clearAuth()
            Taro.navigateTo({ url: '/pages/bind/index' })
          }}
        >
          重新绑定 / 切换档案
        </Button>
      </View>
    </View>
  )
}
