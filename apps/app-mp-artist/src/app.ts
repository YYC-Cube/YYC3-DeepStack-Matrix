import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { getStableCode, wxLogin, loadAuth, saveAuth } from './lib/api'
import './app.css'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    // 启动即静默登录:已绑定→token 已存本地直接用;未绑定→B1 页走绑定流
    void (async () => {
      try {
        const auth = loadAuth()
        if (auth !== null) return
        const res = await wxLogin(getStableCode())
        if (res.status === 'OK') {
          saveAuth({ token: res.token, name: res.name ?? '', storeId: 1 })
        }
      } catch {
        // 静默失败:B1 页会再次尝试
      }
    })()
  })

  // children 为即将渲染的页面
  return children
}

export default App
