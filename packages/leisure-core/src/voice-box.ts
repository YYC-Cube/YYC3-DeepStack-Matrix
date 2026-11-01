/**
 * YYC³ LeisureManage · 硬件语音盒子联动(单源传输抽象)
 * 钟房叫钟 CALLED → 播报文本 → 盒子(店内 IP 喇叭 / TTS 网关);大屏 Web Speech 为并行通道,盒子失败不阻断叫钟
 * 安全:URL 模板只允许 http/https 且主机为私网/环回/局域网(盒子在店内),避免被配置成外网请求跳板
 */

export interface VoiceBoxResult {
  ok: boolean
  /** 未配置或被禁用时 true(不算失败) */
  skipped?: boolean
  status?: number
  error?: string
}

export interface VoiceBoxTransport {
  announce(text: string): Promise<VoiceBoxResult>
}

/** 最小 fetch 形状(不引 DOM lib;Node18+/浏览器/Taro 适配器均可注入) */
export type VoiceBoxFetch = (
  url: string,
  init: { method: 'GET' | 'POST'; signal?: AbortSignal; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number }>

export interface HttpVoiceBoxOptions {
  /** URL 模板,须含 {text} 占位(自动 encodeURIComponent),如 http://192.168.1.50/tts?text={text} */
  urlTemplate: string
  /** 缺省 GET;POST 时 {text} 仍替换进 URL,并同时以 JSON {text} 作请求体 */
  method?: 'GET' | 'POST'
  /** 缺省 3000ms;盒子无响应不拖住叫钟流转 */
  timeoutMs?: number
  /** 注入 fetch(便于单测/小程序适配);缺省 globalThis.fetch */
  fetchImpl?: VoiceBoxFetch
}

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
]

/** 主机是否为私网/环回/局域网(盒子部署位置的合法范围) */
export function isPrivateHost(hostRaw: string): boolean {
  const host = hostRaw.trim().toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.lan')) return true
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true
  return PRIVATE_V4.some((re) => re.test(host))
}

/** 模板校验:含 {text} · http/https · 私网主机 */
export function validateVoiceBoxUrl(template: string): { ok: true } | { ok: false; reason: string } {
  if (!template.includes('{text}')) return { ok: false, reason: 'URL 模板缺少 {text} 占位' }
  let u: URL
  try {
    u = new URL(template.replace('{text}', 'x'))
  } catch {
    return { ok: false, reason: 'URL 模板不合法' }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: '仅允许 http/https' }
  if (!isPrivateHost(u.hostname)) return { ok: false, reason: '盒子地址须为店内私网/局域网主机' }
  return { ok: true }
}

/** HTTP 盒子传输:超时/网络错误均转为 ok=false 结果(不抛),由调用方记审计 */
export class HttpVoiceBoxTransport implements VoiceBoxTransport {
  private readonly template: string
  private readonly method: 'GET' | 'POST'
  private readonly timeoutMs: number
  private readonly fetchImpl: VoiceBoxFetch

  constructor(opts: HttpVoiceBoxOptions) {
    const verdict = validateVoiceBoxUrl(opts.urlTemplate)
    if (!verdict.ok) throw new Error('voice box url invalid: ' + verdict.reason)
    this.template = opts.urlTemplate
    this.method = opts.method ?? 'GET'
    this.timeoutMs = opts.timeoutMs ?? 3000
    const g = (globalThis as { fetch?: unknown }).fetch
    const fallback = typeof g === 'function' ? (g as unknown as VoiceBoxFetch) : undefined
    const impl = opts.fetchImpl ?? fallback
    if (impl === undefined) throw new Error('voice box: no fetch implementation')
    this.fetchImpl = impl
  }

  async announce(text: string): Promise<VoiceBoxResult> {
    const trimmed = text.trim()
    if (trimmed === '') return { ok: false, error: 'empty text' }
    const url = this.template.replace('{text}', encodeURIComponent(trimmed))
    const ctrl = typeof AbortController === 'function' ? new AbortController() : undefined
    const timer = ctrl !== undefined ? setTimeout(() => { ctrl.abort() }, this.timeoutMs) : undefined
    try {
      const res = await this.fetchImpl(url, {
        method: this.method,
        ...(ctrl !== undefined ? { signal: ctrl.signal } : {}),
        ...(this.method === 'POST'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }) }
          : {}),
      })
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: 'http ' + String(res.status) }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'network error' }
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }
}

/** 未配置盒子时的占位传输:skipped=true,不算失败 */
export class NoopVoiceBoxTransport implements VoiceBoxTransport {
  async announce(): Promise<VoiceBoxResult> {
    return { ok: true, skipped: true }
  }
}
