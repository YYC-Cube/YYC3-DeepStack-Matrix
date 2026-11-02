/**
 * 主题定制页(设置域):预设色调 chip + 语义变量编辑(input[type=color] + hex 文本双绑定,不引第三方颜色库)
 * + 品牌区(系统名称/标语,仅 localStorage)+ 实时预览(直接消费 var(--lm-*))
 * 适配移植自 YYC3-Cloud-Matrix src/app/modules/dev/ThemeCustomizer.tsx
 * 权限:页面不做 @RequirePerm,菜单挂接收尾时统一处理
 */
import { useCallback, useEffect, useState } from 'react'
import { Check, Eye, Palette, RotateCcw, Save, Store } from 'lucide-react'
import { Button, Card, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { PageHeader } from '@/components/kit'
import {
  applyTheme,
  DEFAULT_BRAND,
  ensureThemeApplied,
  loadBrand,
  loadSavedTheme,
  resetTheme,
  saveBrand,
  saveTheme,
  type BrandConfig,
} from './theme/applier'
import {
  DEFAULT_THEME_VARS,
  THEME_PRESETS,
  THEME_VAR_GROUPS,
  type ThemePreset,
  type ThemeVars,
} from './theme/presets'
import { colorToHexInput, isValidColor } from './theme/color-utils'

/* ── 语义变量编辑行:取色器 + 文本框双绑定 ── */
function ColorVarRow({ label, varKey, value, bgValue, onChange }: {
  label: string
  varKey: string
  value: string
  bgValue: string
  onChange: (v: string) => void
}) {
  const [text, setText] = useState(value)
  useEffect(() => {
    setText(value)
  }, [value])
  const valid = isValidColor(text)
  return (
    <div className="flex items-start gap-2">
      <input
        type="color"
        aria-label={`${label}取色器`}
        title={`${label}(${varKey})`}
        value={colorToHexInput(value, bgValue)}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 mt-4 shrink-0 rounded-md border border-[rgba(0,212,255,0.2)] bg-transparent cursor-pointer p-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#8b9bb4] leading-4">{label}</div>
        <input
          type="text"
          value={text}
          spellCheck={false}
          aria-label={label}
          onChange={(e) => {
            setText(e.target.value)
            if (isValidColor(e.target.value)) onChange(e.target.value)
          }}
          className={`w-full h-7 px-2 rounded-md bg-[rgba(0,40,80,0.5)] border text-xs font-mono text-[#e0f0ff] outline-none focus:border-[#00d4ff] transition-colors ${
            valid ? 'border-[rgba(0,212,255,0.2)]' : 'border-[#ff3366]'
          }`}
        />
      </div>
    </div>
  )
}

export default function ThemeCustomizerPage() {
  const [vars, setVars] = useState<ThemeVars>(() => loadSavedTheme() ?? { ...DEFAULT_THEME_VARS })
  const [activePreset, setActivePreset] = useState<string>(() =>
    loadSavedTheme() === null ? 'base' : 'custom',
  )
  const [brand, setBrand] = useState<BrandConfig>(() => loadBrand())

  // App 启动应用一次(无保存则保持 tokens.css 默认);主会话收尾可将 ensureThemeApplied 接入 main/AppLayout
  useEffect(() => {
    ensureThemeApplied()
  }, [])

  // 实时预览:变量改动即时写入 :root,预览卡与全应用同步换肤
  useEffect(() => {
    applyTheme(vars)
  }, [vars])

  const setVar = useCallback((key: string, value: string) => {
    setVars((prev) => ({ ...prev, [key]: value }))
    setActivePreset('custom')
  }, [])

  const applyPreset = useCallback((p: ThemePreset) => {
    setVars({ ...p.vars })
    setActivePreset(p.id)
  }, [])

  function handleSave(): void {
    saveTheme(vars)
    toast.success('主题已保存,下次启动自动应用')
  }

  function handleReset(): void {
    resetTheme()
    setVars({ ...DEFAULT_THEME_VARS })
    setActivePreset('base')
    toast.success('已重置回 tokens 默认主题')
  }

  function handleSaveBrand(): void {
    saveBrand(brand)
    toast.success('品牌信息已保存(仅本地,不接后端)')
  }

  const activePresetName = THEME_PRESETS.find((p) => p.id === activePreset)?.name ?? '自定义'

  return (
    <div className="space-y-4">
      <PageHeader
        title="主题定制"
        desc="语义变量 · 预设色调 · 实时预览"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[440px_1fr]">
        {/* ── 左列:品牌区 + 预设色调 + 语义变量 ── */}
        <div className="space-y-4 min-w-0">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm text-[#e0f0ff]">品牌区</span>
              <span className="ml-auto text-xs text-[#8b9bb4]">仅本地保存</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#8b9bb4] text-xs">系统名称</Label>
              <Input
                value={brand.name}
                onChange={(e) => setBrand((p) => ({ ...p, name: e.target.value }))}
                placeholder={DEFAULT_BRAND.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#8b9bb4] text-xs">标语</Label>
              <Input
                value={brand.tagline}
                onChange={(e) => setBrand((p) => ({ ...p, tagline: e.target.value }))}
                placeholder={DEFAULT_BRAND.tagline}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveBrand}>
              保存品牌
            </Button>
          </Card>

          <Card className="p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm text-[#e0f0ff]">预设色调</span>
              <span className="ml-auto text-xs text-[#8b9bb4]">{activePresetName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`应用${p.name}主题`}
                  onClick={() => applyPreset(p)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all ${
                    activePreset === p.id
                      ? 'border-[rgba(0,212,255,0.4)] bg-[rgba(0,212,255,0.06)]'
                      : 'border-[rgba(0,212,255,0.12)] bg-[rgba(6,14,31,0.6)] hover:border-[rgba(0,212,255,0.3)]'
                  }`}
                >
                  <span className="flex gap-0.5 shrink-0">
                    {[
                      p.vars['--lm-primary'],
                      p.vars['--lm-bg'],
                      p.vars['--lm-success'],
                      p.vars['--lm-danger'],
                    ].map((c, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-sm border border-[rgba(255,255,255,0.08)]"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-[#c0dcf0] truncate">{p.name}</span>
                  {activePreset === p.id && <Check className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm text-[#e0f0ff]">语义变量</span>
              <span className="ml-auto text-xs font-mono text-[#8b9bb4]">--lm-*</span>
            </div>
            {THEME_VAR_GROUPS.map((g) => (
              <div key={g.title} className="space-y-2">
                <div className="text-xs text-[#44546e] uppercase tracking-wider">{g.title}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {g.items.map((it) => (
                    <ColorVarRow
                      key={it.key}
                      label={it.label}
                      varKey={it.key}
                      value={vars[it.key] ?? ''}
                      bgValue={vars['--lm-bg'] ?? '#060e1f'}
                      onChange={(v) => setVar(it.key, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-[#8b9bb4]">
              发光阴影 --lm-glow-sm/md/lg 随预设与主色派生,不单独编辑;半透明值在取色器中按当前背景合成显示。
            </p>
          </Card>
        </div>

        {/* ── 右列:实时预览(直接消费当前变量;高度与左列一致) ── */}
        <Card className="p-4 min-w-0 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[#00d4ff] opacity-60" />
            <span className="text-sm text-[#c0dcf0]">实时预览</span>
            <span className="ml-auto text-xs text-[#8b9bb4]">{activePresetName}</span>
          </div>

          <div
            className="rounded-xl overflow-hidden border flex-1"
            style={{ background: 'var(--lm-panel)', borderColor: 'var(--lm-border)' }}
          >
            {/* 预览头部:系统名称/标语 */}
            <div
              className="px-4 py-3 flex items-center gap-3 border-b"
              style={{ borderColor: 'var(--lm-border)', boxShadow: 'var(--lm-glow-sm)' }}
            >
              <div className="min-w-0">
                <div
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--lm-primary)' }}
                >
                  {brand.name}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--lm-text-muted)' }}>
                  {brand.tagline}
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* 统计卡三枚 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '包厢', val: '12/13', color: 'var(--lm-primary)' },
                  { label: '开工率', val: '87%', color: 'var(--lm-success)' },
                  { label: '延迟', val: '1.2s', color: 'var(--lm-warning)' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg px-3 py-2 border"
                    style={{ background: 'var(--lm-card)', borderColor: 'var(--lm-border)' }}
                  >
                    <div className="text-[11px]" style={{ color: 'var(--lm-text-muted)' }}>
                      {s.label}
                    </div>
                    <div className="text-lg font-semibold" style={{ color: s.color }}>
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* 主要/次要/破坏性按钮 */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--lm-primary)', color: 'var(--lm-primary-fg)' }}
                >
                  主要操作
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs border"
                  style={{
                    background: 'var(--lm-secondary)',
                    color: 'var(--lm-fg)',
                    borderColor: 'var(--lm-border)',
                  }}
                >
                  次要操作
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--lm-danger)', color: '#ffffff' }}
                >
                  破坏性
                </button>
              </div>

              {/* 告警示例 */}
              <div
                className="rounded-lg px-3 py-2 border-l-2"
                style={{ background: 'var(--lm-muted)', borderLeftColor: 'var(--lm-warning)' }}
              >
                <div className="text-xs" style={{ color: 'var(--lm-fg)' }}>
                  ⚠ 12 号包厢空调异常,延迟 1.2s 超过阈值
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--lm-muted-fg)' }}>
                  已自动生成报修单 · 建议现场核查
                </div>
              </div>

              {/* 变量色带(20 契约变量中 17 个颜色一览) */}
              <div>
                <div className="text-[11px] mb-1" style={{ color: 'var(--lm-text-muted)' }}>
                  语义变量色带
                </div>
                <div className="flex gap-1">
                  {[
                    '--lm-bg',
                    '--lm-card',
                    '--lm-panel',
                    '--lm-secondary',
                    '--lm-muted',
                    '--lm-accent',
                    '--lm-line',
                    '--lm-border',
                    '--lm-ring',
                    '--lm-primary',
                    '--lm-primary-fg',
                    '--lm-fg',
                    '--lm-muted-fg',
                    '--lm-text-muted',
                    '--lm-success',
                    '--lm-warning',
                    '--lm-danger',
                  ].map((k) => (
                    <div
                      key={k}
                      className="flex-1 h-4 rounded-sm"
                      title={k}
                      style={{ background: `var(${k})`, border: '1px solid rgba(255,255,255,0.06)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
