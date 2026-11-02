/**
 * useIsMobile / usePWAInstall / SW 注册与更新流 / 在线状态(PWA 完整版)
 * 注:@yyc3/admin 的 usePWAManager 为 mock 实现(SW/缓存假数据),不可用于真实安装流;
 * 此处自建轻量版:beforeinstallprompt 捕获 + standalone 检测 + iOS 手动指引判定。
 * Service Worker:public/sw.js(离线壳);仅生产注册,localhost 不注册避免干扰 dev。
 */
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/** 移动断点(768):@yyc3/ui/use-mobile 的 .ts 子路径导出 Rolldown 无法解析,故本地实现(同口径) */
const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`)
    const onChange = (): void => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [])
  return isMobile
}

/* ── 在线状态(离线横幅用) ── */

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    const on = (): void => setOnline(true)
    const off = (): void => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/* ── Service Worker 注册 + 更新流(PWA 完整版) ── */

/**
 * 生产环境注册 SW;新版本安装完成且页面已被旧 SW 接管时,toast 提示刷新。
 * controllerchange 自动重载(带 once 守卫,防首访循环)。
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return

  let refreshing = false
  let hadController = navigator.serviceWorker.controller !== null

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    if (hadController) window.location.reload()
  })

  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const sw = registration.installing
        if (sw === null) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && hadController) {
            toast.info('发现新版本,即将自动刷新', { duration: 2500 })
          }
        })
      })
    })
    .catch(() => {
      /* SW 注册失败不阻断应用(HTTPS/浏览器兼容问题) */
    })
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let capturedPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    capturedPrompt = e as BeforeInstallPromptEvent
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    capturedPrompt = null
    listeners.forEach((fn) => fn())
  })
}

export function usePWAInstall(): {
  canInstall: boolean
  isStandalone: boolean
  isIOS: boolean
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
} {
  const [, bump] = useState(0)
  useEffect(() => {
    const fn = (): void => bump((n) => n + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true)
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !isStandalone

  return {
    canInstall: capturedPrompt !== null,
    isStandalone,
    isIOS,
    install: async () => {
      if (capturedPrompt === null) return 'unavailable'
      await capturedPrompt.prompt()
      const choice = await capturedPrompt.userChoice
      if (choice.outcome === 'accepted') capturedPrompt = null
      return choice.outcome
    },
  }
}
