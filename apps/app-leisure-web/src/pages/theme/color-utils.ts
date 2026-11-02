/**
 * @file: color-utils.ts
 * @description: 主题页极简取色工具(HEX/RGB 解析 + 透明色合成)· 仅取用到的函数,不引第三方颜色库
 *               适配移植自 YYC3-Cloud-Matrix src/app/modules/dev/theme/color-utils.ts
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-02
 * @status: active
 * @tags: [theme, color]
 */

/** 解析 hex(3/6 位)或 rgb()/rgba() 字符串 → [r,g,b,a];不合法返回 null */
export function parseColor(v: string): [number, number, number, number] | null {
  const s = v.trim()
  const hex6 = s.match(/^#([0-9a-f]{6})$/i)
  if (hex6 !== null) {
    const h = hex6[1]
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ]
  }
  const hex3 = s.match(/^#([0-9a-f]{3})$/i)
  if (hex3 !== null) {
    const h = hex3[1]
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
      1,
    ]
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
  if (rgb !== null) {
    return [
      Math.min(255, Number(rgb[1])),
      Math.min(255, Number(rgb[2])),
      Math.min(255, Number(rgb[3])),
      rgb[4] === undefined ? 1 : Math.min(1, Number(rgb[4])),
    ]
  }
  return null
}

/** 主题页可绑定的合法颜色值(hex/rgb/rgba) */
export function isValidColor(v: string): boolean {
  return parseColor(v) !== null
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** 半透明色按背景合成不透明色(供 input[type=color] 显示 rgba 变量) */
export function compositeOver(r: number, g: number, b: number, a: number, bg: string): string {
  const p = parseColor(bg) ?? [6, 14, 31, 1]
  const br = p[0]
  const bgg = p[1]
  const bb = p[2]
  return rgbToHex(r * a + br * (1 - a), g * a + bgg * (1 - a), b * a + bb * (1 - a))
}

/** 任意 CSS 颜色 → input[type=color] 可用的 #rrggbb(rgba 按当前背景合成) */
export function colorToHexInput(v: string, bg: string): string {
  const p = parseColor(v)
  if (p === null) return '#000000'
  if (p[3] >= 1) return rgbToHex(p[0], p[1], p[2])
  return compositeOver(p[0], p[1], p[2], p[3], bg)
}

/** hex → 'r,g,b' 三元组(拼 rgba() 字符串用) */
export function hexToRgbTriple(hex: string): string {
  const p = parseColor(hex)
  if (p === null) return '0,0,0'
  return `${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])}`
}

/* ═══════════════════════════════════════════════════════════════
 *  OKLch 亮度调节(主题页 5 区;感知均匀,调亮度不偏色相)
 *  实现:Björn Ottosson OKLab 标准矩阵(sRGB 线性化 ↔ OKLab ↔ OKLch)
 * ═══════════════════════════════════════════════════════════════ */

const c1 = 0.8304804463
const c2 = 0.2104542553
const c3 = 0.793617785
const c4 = 0.0040720468

function srgbToLinear(u: number): number {
  const v = u / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function linearToSrgb(v: number): number {
  const u = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(u * 255)))
}

/** hex → OKLch(L 0-1, C 0-0.4, H 0-360);解析失败返回 null */
export function hexToOklch(hex: string): { l: number; c: number; h: number } | null {
  const p = parseColor(hex)
  if (p === null) return null
  const r = srgbToLinear(p[0])
  const g = srgbToLinear(p[1])
  const b = srgbToLinear(p[2])
  const l0 = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m0 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s0 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = c2 * l0 + c3 * m0 + c4 * s0
  const a = 1.9779984951 * l0 - 2.428592205 * m0 + 0.4505937099 * s0
  const bb = 0.0259040371 * l0 + 0.7827717662 * m0 - 0.808675766 * s0
  const C = Math.sqrt(a * a + bb * bb)
  let H = (Math.atan2(bb, a) * 180) / Math.PI
  if (H < 0) H += 360
  return { l: L, c: C, h: H }
}

/** OKLch → hex(C/H 原路逆变换) */
export function oklchToHex(l: number, c: number, h: number): string {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const bb = c * Math.sin(hr)
  const l0 = l + 0.3963377774 * a + 0.2158037573 * bb
  const m0 = l - 0.1055613458 * a - 0.0638541728 * bb
  const s0 = l - 0.0894841775 * a - 1.291485548 * bb
  const L = l0 * l0 * l0
  const M = m0 * m0 * m0
  const S = s0 * s0 * s0
  return rgbToHex(
    linearToSrgb(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    linearToSrgb(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    linearToSrgb(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  )
}

/** 亮度调节:hex 原色 → OKLch L 增减 dL(-0.3~0.3 建议)→ 回 hex;C/H 保持不偏色 */
export function adjustLightness(hex: string, dL: number): string {
  const o = hexToOklch(hex)
  if (o === null) return hex
  const l = Math.max(0.05, Math.min(0.98, o.l + dL))
  return oklchToHex(l, o.c, o.h)
}
