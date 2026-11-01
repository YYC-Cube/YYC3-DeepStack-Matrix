/**
 * useIsMobile / usePWAInstall(PWA 阶段4)
 * 注:@yyc3/admin 的 usePWAManager 为 mock 实现(SW/缓存假数据),不可用于真实安装流;
 * 此处自建轻量版:beforeinstallprompt 捕获 + standalone 检测 + iOS 手动指引判定。
 * 离线 Service Worker 为 II 期 P0(离线计时兜底),不在本期。
 */
import { useEffect, useState } from 'react'

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
