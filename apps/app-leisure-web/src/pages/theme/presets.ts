/**
 * @file: presets.ts
 * @description: 主题预设色调 · --lm-* 变量契约(20 变量一字不差,默认值直接取自 styles/tokens.ts)
 *               适配移植自 YYC3-Cloud-Matrix src/app/modules/dev/theme/theme-presets.ts
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-02
 * @status: active
 * @tags: [theme, design-token]
 */
import { type LmTokenKey, LM_CSS_VARS, LM_TOKENS } from '@/styles/tokens'
import { hexToRgbTriple } from './color-utils'

/** CSS 变量名 → 值(键为 --lm-* 全称) */
export type ThemeVars = Record<string, string>

export interface ThemePreset {
  id: string
  name: string
  nameEn: string
  vars: ThemeVars
}

/** tokens.css 默认值(经 tokens.ts 镜像,保证与 :root 一字不差) */
export const DEFAULT_THEME_VARS: ThemeVars = Object.fromEntries(
  (Object.entries(LM_CSS_VARS) as Array<[LmTokenKey, string]>).map(([k, cssVar]) => [
    cssVar,
    LM_TOKENS[k],
  ]),
)

/** 预设种子:主色/底色/状态色 + 卡片面板 rgb 三元组,其余半透明变量由主色派生 */
interface PresetSeed {
  id: string
  name: string
  nameEn: string
  primary: string
  primaryFg: string
  bg: string
  fg: string
  mutedFg: string
  textMuted: string
  danger: string
  success: string
  warning: string
  /** 卡片底 rgb 三元组(如 '16,12,40') */
  card: string
  /** 面板底 rgb 三元组 */
  panel: string
}

/** 由种子生成完整变量集(20 核心变量按主色派生;图表色/字体/圆角继承 tokens 默认) */
function buildVars(seed: PresetSeed): ThemePreset {
  const p = hexToRgbTriple(seed.primary)
  return {
    id: seed.id,
    name: seed.name,
    nameEn: seed.nameEn,
    vars: {
      ...DEFAULT_THEME_VARS,
      '--lm-bg': seed.bg,
      '--lm-fg': seed.fg,
      '--lm-primary': seed.primary,
      '--lm-primary-fg': seed.primaryFg,
      '--lm-secondary': `rgba(${p}, 0.15)`,
      '--lm-muted': `rgba(${p}, 0.2)`,
      '--lm-muted-fg': seed.mutedFg,
      '--lm-accent': `rgba(${p}, 0.1)`,
      '--lm-danger': seed.danger,
      '--lm-border': `rgba(${p}, 0.2)`,
      '--lm-ring': `rgba(${p}, 0.5)`,
      '--lm-card': `rgba(${seed.card}, 0.7)`,
      '--lm-panel': `rgba(${seed.panel}, 0.7)`,
      '--lm-line': `rgba(${p}, 0.12)`,
      '--lm-success': seed.success,
      '--lm-warning': seed.warning,
      '--lm-text-muted': seed.textMuted,
      '--lm-glow-sm': `0 0 15px rgba(${p}, 0.05)`,
      '--lm-glow-md': `0 0 30px rgba(${p}, 0.1)`,
      '--lm-glow-lg': `0 0 40px rgba(${p}, 0.15)`,
    },
  }
}

/** 预设色调(base 严格复刻 tokens.css;其余适配自 YYC3-Cloud-Matrix theme-presets.ts) */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'base',
    name: '基础色调',
    nameEn: 'Base Tone',
    vars: { ...DEFAULT_THEME_VARS },
  },
  buildVars({
    id: 'cosmic-night',
    name: '宇宙之夜',
    nameEn: 'Cosmic Night',
    primary: '#7c5cfc',
    primaryFg: '#0a0618',
    bg: '#080618',
    fg: '#e8e0ff',
    mutedFg: '#9080cc',
    textMuted: '#8f86b8',
    danger: '#ff3366',
    success: '#00e8a0',
    warning: '#ffaa00',
    card: '16,12,40',
    panel: '10,8,26',
  }),
  buildVars({
    id: 'soft-pop',
    name: '柔和流行',
    nameEn: 'Soft Pop',
    primary: '#f472b6',
    primaryFg: '#1a0610',
    bg: '#140a12',
    fg: '#ffe8f4',
    mutedFg: '#cc80a0',
    textMuted: '#b090a4',
    danger: '#ff4444',
    success: '#4ade80',
    warning: '#facc15',
    card: '30,16,24',
    panel: '20,10,18',
  }),
  buildVars({
    id: 'cyberpunk',
    name: '赛博朋克',
    nameEn: 'Cyberpunk',
    primary: '#00ffaa',
    primaryFg: '#001a0e',
    bg: '#050f0a',
    fg: '#d0ffe8',
    mutedFg: '#60cc90',
    textMuted: '#7ba892',
    danger: '#ff2244',
    success: '#00ff88',
    warning: '#ffcc00',
    card: '10,30,20',
    panel: '6,16,10',
  }),
  buildVars({
    id: 'minimal',
    name: '现代极简',
    nameEn: 'Modern Minimal',
    primary: '#f8f8f8',
    primaryFg: '#0a0a0a',
    bg: '#0c0c0c',
    fg: '#e8e8e8',
    mutedFg: '#888888',
    textMuted: '#8a8a8a',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    card: '20,20,20',
    panel: '12,12,12',
  }),
  buildVars({
    id: 'future-tech',
    name: '未来科技',
    nameEn: 'Future Tech',
    primary: '#38bdf8',
    primaryFg: '#041828',
    bg: '#040c18',
    fg: '#e0f2fe',
    mutedFg: '#60a0cc',
    textMuted: '#8fa8c0',
    danger: '#f43f5e',
    success: '#34d399',
    warning: '#fbbf24',
    card: '10,24,40',
    panel: '6,14,28',
  }),
]

/** 语义变量编辑行 */
export interface ThemeVarItem {
  key: string
  label: string
}

/** 语义变量编辑分组 */
export interface ThemeVarGroup {
  title: string
  items: ThemeVarItem[]
}

/** 语义变量编辑分组(任务指定六项 背景/文字/主色/边框/成功/警告 在首组;发光阴影非颜色,不进编辑区) */
export const THEME_VAR_GROUPS: ThemeVarGroup[] = [
  {
    title: '核心语义',
    items: [
      { key: '--lm-bg', label: '背景' },
      { key: '--lm-fg', label: '文字' },
      { key: '--lm-primary', label: '主色' },
      { key: '--lm-border', label: '边框' },
      { key: '--lm-success', label: '成功' },
      { key: '--lm-warning', label: '警告' },
    ],
  },
  {
    title: '文字层级',
    items: [
      { key: '--lm-text-muted', label: '辅助文字' },
      { key: '--lm-muted-fg', label: '柔和文字' },
      { key: '--lm-primary-fg', label: '主色上文字' },
    ],
  },
  {
    title: '面板层级',
    items: [
      { key: '--lm-card', label: '卡片' },
      { key: '--lm-panel', label: '面板' },
      { key: '--lm-line', label: '分隔线' },
    ],
  },
  {
    title: '交互色',
    items: [
      { key: '--lm-secondary', label: '次要' },
      { key: '--lm-muted', label: '柔和' },
      { key: '--lm-accent', label: '强调' },
      { key: '--lm-ring', label: '焦点' },
      { key: '--lm-danger', label: '危险' },
    ],
  },
]
