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
