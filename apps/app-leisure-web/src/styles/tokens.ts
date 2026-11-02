/**
 * @file: tokens.ts
 * @description: LeisureManage 设计 token 常量 · 与 styles/tokens.css 的 --lm-* 契约一一对应
 *               供主题页后续读写(LM_CSS_VARS 提供变量名,配合 setProperty 即时换肤)
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-02
 * @status: active
 * @tags: [design-token]
 */

/** --lm-* 设计 token 值(与 tokens.css :root 声明保持同步) */
export const LM_TOKENS = {
  bg: '#060e1f',
  fg: '#e0f0ff',
  primary: '#00d4ff',
  primaryFg: '#060e1f',
  secondary: 'rgba(0,180,255,0.15)',
  muted: 'rgba(0,120,200,0.2)',
  mutedFg: '#6bb8d9',
  accent: 'rgba(0,200,255,0.1)',
  danger: '#ff3366',
  border: 'rgba(0,180,255,0.2)',
  ring: 'rgba(0,212,255,0.5)',
  card: 'rgba(10,30,60,0.7)',
  panel: 'rgba(6,14,31,0.7)',
  line: 'rgba(0,212,255,0.12)',
  success: '#00ff88',
  warning: '#ffaa00',
  textMuted: '#8b9bb4',
  glowSm: '0 0 15px rgba(0,180,255,0.05)',
  glowMd: '0 0 30px rgba(0,180,255,0.1)',
  glowLg: '0 0 40px rgba(0,180,255,0.15)',
  chart1: '#00d4ff',
  chart2: '#00ff88',
  chart3: '#ff6600',
  chart4: '#aa55ff',
  chart5: '#ffdd00',
  fontDisplay: "'Orbitron', ui-sans-serif, system-ui, sans-serif",
  fontBody: "'Rajdhani', ui-sans-serif, system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
  radius: '0.75rem',
} as const

/** token 键 → CSS 变量名(主题页按名读写 --lm-*) */
export const LM_CSS_VARS = {
  bg: '--lm-bg',
  fg: '--lm-fg',
  primary: '--lm-primary',
  primaryFg: '--lm-primary-fg',
  secondary: '--lm-secondary',
  muted: '--lm-muted',
  mutedFg: '--lm-muted-fg',
  accent: '--lm-accent',
  danger: '--lm-danger',
  border: '--lm-border',
  ring: '--lm-ring',
  card: '--lm-card',
  panel: '--lm-panel',
  line: '--lm-line',
  success: '--lm-success',
  warning: '--lm-warning',
  textMuted: '--lm-text-muted',
  glowSm: '--lm-glow-sm',
  glowMd: '--lm-glow-md',
  glowLg: '--lm-glow-lg',
  chart1: '--lm-chart-1',
  chart2: '--lm-chart-2',
  chart3: '--lm-chart-3',
  chart4: '--lm-chart-4',
  chart5: '--lm-chart-5',
  fontDisplay: '--lm-font-display',
  fontBody: '--lm-font-body',
  fontMono: '--lm-font-mono',
  radius: '--lm-radius',
} as const

export type LmTokenKey = keyof typeof LM_TOKENS
