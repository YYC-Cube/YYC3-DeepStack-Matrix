/**
 * @file: applier.ts
 * @description: 主题应用/持久化 · applyTheme 逐项 setProperty('--lm-…'),重置=移除内联变量回 tokens.css 默认
 *               localStorage: 'leisure-theme-v1'(变量名→值) / 'leisure-brand-v1'(系统名称/标语,不接后端)
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-02
 * @status: active
 * @tags: [theme, storage]
 */
import { DEFAULT_THEME_VARS, type ThemeVars } from './presets'

/** 主题持久化 key(JSON:--lm- 变量名 → 值) */
export const THEME_STORAGE_KEY = 'leisure-theme-v1'
/** 品牌信息持久化 key(JSON:系统名称/标语) */
export const BRAND_STORAGE_KEY = 'leisure-brand-v1'

/** 全量变量契约(20 个 --lm-*,与 tokens.css 一字不差;来源 styles/tokens.ts 镜像) */
const CONTRACT_VARS = Object.keys(DEFAULT_THEME_VARS)

function isBrowser(): boolean {
  return typeof document !== 'undefined'
}

/**
 * 应用主题:逐项 setProperty;未提供的契约变量移除内联值(applyTheme({}) 即整体回到 tokens.css 默认)
 * 仅接受 --lm- 前缀键,防止越权写其他变量
 * 过渡动画:换肤瞬间给 <html> 挂 lm-theme-anim 类(tokens.css 定义色彩过渡),350ms 后摘除
 */
export function applyTheme(vars: ThemeVars): void {
  if (!isBrowser()) return
  const el = document.documentElement
  el.classList.add('lm-theme-anim')
  for (const key of CONTRACT_VARS) {
    const value = vars[key]
    if (typeof value === 'string' && value.trim() !== '') {
      el.style.setProperty(key, value.trim())
    } else {
      el.style.removeProperty(key)
    }
  }
  window.setTimeout(() => el.classList.remove('lm-theme-anim'), 350)
}

/** 读取已保存主题(JSON 校验 + 仅 --lm- 键);无/损坏返回 null */
export function loadSavedTheme(): ThemeVars | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const out: ThemeVars = {}
    let count = 0
    for (const [k, v] of Object.entries(parsed)) {
      if (k.startsWith('--lm-') && typeof v === 'string') {
        out[k] = v
        count += 1
      }
    }
    return count > 0 ? out : null
  } catch {
    return null
  }
}

/** 写入 localStorage */
export function saveTheme(vars: ThemeVars): void {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(vars))
}

/** 清除已保存主题(不改变当前内联变量) */
export function clearSavedTheme(): void {
  localStorage.removeItem(THEME_STORAGE_KEY)
}

/**
 * App 启动应用一次:读 'leisure-theme-v1' 并应用;无保存或损坏则保持 tokens.css 默认
 * 由主题页 useEffect 调用;主会话收尾可将其接入 main/AppLayout(本文件不改启动链)
 */
export function ensureThemeApplied(): boolean {
  if (!isBrowser()) return false
  const saved = loadSavedTheme()
  if (saved === null) return false
  applyTheme(saved)
  return true
}

/** 重置:清 storage + 移除全部内联变量(applyTheme({}))回到 tokens.css 默认 */
export function resetTheme(): void {
  clearSavedTheme()
  applyTheme({})
}

/* ── 品牌区(系统名称/标语):仅表单 + localStorage,不接后端 ── */

export interface BrandConfig {
  name: string
  tagline: string
}

export const DEFAULT_BRAND: BrandConfig = {
  name: 'LeisureManage',
  tagline: '休闲会所运营 · Web 管理端',
}

export function loadBrand(): BrandConfig {
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_BRAND }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_BRAND }
    const p = parsed as Record<string, unknown>
    return {
      name: typeof p.name === 'string' && p.name.trim() !== '' ? p.name : DEFAULT_BRAND.name,
      tagline: typeof p.tagline === 'string' ? p.tagline : DEFAULT_BRAND.tagline,
    }
  } catch {
    return { ...DEFAULT_BRAND }
  }
}

export function saveBrand(brand: BrandConfig): void {
  localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand))
}
