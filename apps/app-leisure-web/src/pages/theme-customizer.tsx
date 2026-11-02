/**
 * 主题定制页(设置域):预设色调 chip + 语义变量编辑(input[type=color] + hex 文本双绑定,不引第三方颜色库)
 * + 品牌区(系统名称/标语,仅 localStorage)+ 实时预览(直接消费 var(--lm-*))
 * 适配移植自 YYC3-Cloud-Matrix src/app/modules/dev/ThemeCustomizer.tsx
 * 权限:页面不做 @RequirePerm,菜单挂接收尾时统一处理
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  Frame,
  Palette,
  PieChart,
  RotateCcw,
  Save,
  Store,
  Sun,
  Type,
  Upload,
  type LucideIcon,
} from 'lucide-react'
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
import { colorToHexInput, isValidColor, adjustLightness, hexToRgbTriple } from './theme/color-utils'

/* ── 折叠分组(对照 CP-IM 主题定制:N. 标题 + chevron) ── */
function CollapsibleSection({ index, icon: Icon, title, defaultOpen = false, children }: {
  index: number
  icon: LucideIcon
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[rgba(0,212,255,0.04)] transition-colors"
      >
        <Icon className="w-4 h-4 text-[#00d4ff]" />
        <span className="text-sm text-[#e0f0ff]">{String(index)}. {title}</span>
        <ChevronDown
          className={`ml-auto w-4 h-4 text-[#8b9bb4] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[rgba(0,212,255,0.08)]">{children}</div>}
    </Card>
  )
}

/* ── 字体家族编辑行:文本框 + 家族示例 ── */
function FontVarRow({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-20 text-xs text-[#8b9bb4] shrink-0">{label}</span>
        <input
          type="text"
          value={value}
          spellCheck={false}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-7 px-2 rounded-md bg-[rgba(0,40,80,0.5)] border border-[rgba(0,212,255,0.2)] text-xs font-mono text-[#e0f0ff] outline-none focus:border-[#00d4ff] transition-colors"
        />
      </div>
      <div className="pl-[5.5rem] text-sm text-[#c0dcf0] truncate" style={{ fontFamily: value }}>
        字体示例 The quick brown fox 123
      </div>
    </div>
  )
}

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
  const fileRef = useRef<HTMLInputElement | null>(null)
  // 5 区亮度调节基准:当前预设的主色(切预设即重置基准与滑杆)
  const [basePrimary, setBasePrimary] = useState<string>('#00d4ff')
  const [lightDelta, setLightDelta] = useState<number>(0)

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
    setBasePrimary(p.vars['--lm-primary'] ?? '#00d4ff')
    setLightDelta(0)
  }, [])

  // 5 区 OKLch 亮度调节:基于当前预设主色,调 L 不偏 C/H;发光阴影按新主色 rgb 同步派生
  function handleLightness(deltaPercent: number): void {
    const dL = deltaPercent / 100
    const next = adjustLightness(basePrimary, dL)
    const p = hexToRgbTriple(next)
    setVars((prev) => ({
      ...prev,
      '--lm-primary': next,
      '--lm-glow-sm': `0 0 15px rgba(${p}, 0.05)`,
      '--lm-glow-md': `0 0 30px rgba(${p}, 0.1)`,
      '--lm-glow-lg': `0 0 40px rgba(${p}, 0.15)`,
      '--lm-ring': `rgba(${p}, 0.5)`,
    }))
    setActivePreset('custom')
  }

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

  /** 导出主题:当前变量 + 品牌信息 → JSON 文件下载(采纳自抽取包 ThemeCustomization 导出范式) */
  function handleExportTheme(): void {
    const payload = {
      app: 'leisure-manage',
      type: 'theme',
      version: 1,
      exportedAt: new Date().toISOString(),
      vars,
      brand,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leisure-theme-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('主题已导出为 JSON 文件')
  }

  /** 导入主题:仅接受 --lm-* 变量(与保存同约束);品牌可选;导入后未保存,点「保存」才持久化 */
  function handleImportFile(file: File): void {
    void file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as {
          vars?: Record<string, unknown>
          brand?: { name?: unknown; tagline?: unknown }
        }
        const incoming: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed.vars ?? {})) {
          if (k.startsWith('--lm-') && typeof v === 'string' && v.trim() !== '') {
            incoming[k] = v
          }
        }
        if (Object.keys(incoming).length === 0) {
          toast.error('导入失败:文件中没有有效的 --lm-* 主题变量')
          return
        }
        setVars((prev) => ({ ...prev, ...incoming }))
        const b = parsed.brand
        if (typeof b === 'object' && b !== null) {
          setBrand((p) => ({
            name: typeof b.name === 'string' && b.name !== '' ? b.name : p.name,
            tagline: typeof b.tagline === 'string' ? b.tagline : p.tagline,
          }))
        }
        toast.success('主题已导入并即时应用;点「保存」才会持久化')
      })
      .catch(() => toast.error('导入失败:JSON 解析错误'))
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
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTheme}>
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f !== undefined) handleImportFile(f)
                e.target.value = ''
              }}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[440px_1fr]">
      {/* ── 左列:品牌区 + 折叠组 1-5(语义/图表/字体/圆角阴影/亮度) ── */}
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

          <CollapsibleSection index={1} icon={Palette} title="语义变量 · 核心色" defaultOpen>
            <div className="text-xs font-mono text-[#8b9bb4]">--lm-*</div>
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
          </CollapsibleSection>

          <CollapsibleSection index={2} icon={PieChart} title="环形区域 · 图表 / 侧边栏">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const key = `--lm-chart-${n}`
                return (
                  <ColorVarRow
                    key={key}
                    label={`图表色 ${n}`}
                    varKey={key}
                    value={vars[key] ?? ''}
                    bgValue={vars['--lm-bg'] ?? '#060e1f'}
                    onChange={(v) => setVar(key, v)}
                  />
                )
              })}
            </div>
            <p className="text-xs text-[#8b9bb4]">
              图表/趋势线取 chart-1~5;侧边栏与卡片底色由 1 区「面板层级」(--lm-panel/--lm-card)驱动,此处不重复编辑。
            </p>
          </CollapsibleSection>

          <CollapsibleSection index={3} icon={Type} title="字体排版 · 字体家族">
            <FontVarRow label="展示字体" value={vars['--lm-font-display'] ?? ''} onChange={(v) => setVar('--lm-font-display', v)} />
            <FontVarRow label="正文字体" value={vars['--lm-font-body'] ?? ''} onChange={(v) => setVar('--lm-font-body', v)} />
            <FontVarRow label="等宽字体" value={vars['--lm-font-mono'] ?? ''} onChange={(v) => setVar('--lm-font-mono', v)} />
            <p className="text-xs text-[#8b9bb4]">
              字体栈未安装时按 fallback 逐级回退;如需内嵌字体文件,放置 public/fonts 并补 @font-face。
            </p>
          </CollapsibleSection>

          <CollapsibleSection index={4} icon={Frame} title="阴影 / 圆角 · 透明度">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-[#8b9bb4] shrink-0">全局圆角</span>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={Math.round(parseFloat(vars['--lm-radius'] ?? '0.75') * 16) || 0}
                  aria-label="全局圆角"
                  onChange={(e) => {
                    const rem = (Number(e.target.value) / 16).toFixed(3).replace(/\.?0+$/, '')
                    setVar('--lm-radius', rem + 'rem')
                  }}
                  className="flex-1 accent-[#00d4ff]"
                />
                <span className="w-14 text-right text-xs font-mono text-[#e0f0ff]">{vars['--lm-radius'] ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-[#8b9bb4] shrink-0">发光阴影</span>
                <div className="flex-1 flex gap-2">
                  {(['sm', 'md', 'lg'] as const).map((k) => (
                    <div
                      key={k}
                      className="flex-1 h-6 rounded-md bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[10px] text-[#8b9bb4]"
                      style={{ boxShadow: `var(--lm-glow-${k})` }}
                    >
                      glow-{k}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#8b9bb4]">
              圆角作用于预览面板与 --lm-radius 消费点;发光随 5 区主色亮度派生;面板/分隔线透明度在 1 区「面板层级」编辑。
            </p>
          </CollapsibleSection>

          <CollapsibleSection index={5} icon={Sun} title="主题色 OKLch · 亮度调节">
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-[#8b9bb4] shrink-0">亮度偏移</span>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={lightDelta}
                aria-label="主色亮度偏移"
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setLightDelta(v)
                  handleLightness(v)
                }}
                className="flex-1 accent-[#00d4ff]"
              />
              <span className="w-12 text-right text-xs font-mono text-[#e0f0ff]">
                {lightDelta > 0 ? '+' : ''}
                {String(lightDelta)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-[#8b9bb4] shrink-0">基准 → 当前</span>
              <span className="flex items-center gap-2 text-xs font-mono">
                <span
                  className="inline-block w-6 h-6 rounded-md border border-[rgba(255,255,255,0.08)]"
                  style={{ backgroundColor: basePrimary }}
                />
                →
                <span
                  className="inline-block w-6 h-6 rounded-md border border-[rgba(255,255,255,0.08)]"
                  style={{ backgroundColor: vars['--lm-primary'] ?? '#00d4ff' }}
                />
              </span>
            </div>
            <p className="text-xs text-[#8b9bb4]">
              OKLch 感知亮度:只动 L,不偏色相/饱和;发光阴影与焦点环随新主色同步派生。切换预设即归零重调。
            </p>
          </CollapsibleSection>
        </div>

        {/* ── 右列:实时预览 + 预设色调(对齐 CP-IM 右栏布局) ── */}
        <div className="flex flex-col gap-4 min-w-0">
          <Card className="p-4 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[#00d4ff] opacity-60" />
            <span className="text-sm text-[#c0dcf0]">实时预览</span>
            <span className="ml-auto text-xs text-[#8b9bb4]">{activePresetName}</span>
          </div>

          <div
            className="rounded-xl overflow-hidden border flex-1"
            style={{
              background: 'var(--lm-panel)',
              borderColor: 'var(--lm-border)',
              borderRadius: 'var(--lm-radius)',
              boxShadow: 'var(--lm-glow-md)',
            }}
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
                    style={{
                      background: 'var(--lm-card)',
                      borderColor: 'var(--lm-border)',
                      borderRadius: 'var(--lm-radius)',
                    }}
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

              {/* 图表颜色(chart-1~5,2 区编辑) */}
              <div>
                <div className="text-[11px] mb-1" style={{ color: 'var(--lm-text-muted)' }}>
                  图表颜色
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="flex-1 h-3.5 rounded-full"
                      title={`--lm-chart-${n}`}
                      style={{ background: `var(--lm-chart-${n})` }}
                    />
                  ))}
                </div>
              </div>

              {/* 字体家族示例(3 区编辑) */}
              <div className="space-y-1">
                <div
                  className="text-base font-semibold"
                  style={{ fontFamily: 'var(--lm-font-display)', color: 'var(--lm-fg)' }}
                >
                  Display · 主题排版示例
                </div>
                <div className="text-sm" style={{ fontFamily: 'var(--lm-font-body)', color: 'var(--lm-fg)' }}>
                  Body · 正文字体示例 The quick brown fox
                </div>
                <div className="text-xs" style={{ fontFamily: 'var(--lm-font-mono)', color: 'var(--lm-text-muted)' }}>
                  Mono · 0123456789 --lm-font-mono
                </div>
              </div>

              {/* 输入框示例 */}
              <input
                type="text"
                readOnly
                placeholder="搜索节点…"
                aria-label="输入框样式预览"
                className="w-full h-8 px-3 rounded-md bg-transparent border text-xs outline-none"
                style={{ borderColor: 'var(--lm-border)', color: 'var(--lm-fg)' }}
              />
            </div>
          </div>
        </Card>

        {/* 预设色调(实时预览下方;对齐 CP-IM 右栏) */}
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
                  {[p.vars['--lm-primary'], p.vars['--lm-bg'], p.vars['--lm-success'], p.vars['--lm-danger']].map((c, i) => (
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
        </div>
      </div>
    </div>
  )
}
