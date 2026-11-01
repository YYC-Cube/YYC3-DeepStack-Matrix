/**
 * 语音盒子传输层单测:模板校验(私网白名单)/文本编码/超时与错误不抛/Noop 占位
 */
import { describe, expect, it } from 'vitest'
import {
  HttpVoiceBoxTransport,
  NoopVoiceBoxTransport,
  isPrivateHost,
  validateVoiceBoxUrl,
  type VoiceBoxFetch,
} from '../src/voice-box.js'

describe('voice-box · 模板校验', () => {
  it('私网/环回/局域网域名放行,公网拒绝', () => {
    expect(isPrivateHost('192.168.1.50')).toBe(true)
    expect(isPrivateHost('10.0.0.8')).toBe(true)
    expect(isPrivateHost('172.20.3.4')).toBe(true)
    expect(isPrivateHost('localhost')).toBe(true)
    expect(isPrivateHost('speaker.local')).toBe(true)
    expect(isPrivateHost('8.8.8.8')).toBe(false)
    expect(isPrivateHost('example.com')).toBe(false)
    expect(isPrivateHost('172.32.0.1')).toBe(false)
  })
  it('缺 {text} / 非 http / 公网主机 → 拒', () => {
    expect(validateVoiceBoxUrl('http://192.168.1.50/tts').ok).toBe(false)
    expect(validateVoiceBoxUrl('ftp://192.168.1.50/tts?text={text}').ok).toBe(false)
    expect(validateVoiceBoxUrl('http://evil.example.com/tts?text={text}').ok).toBe(false)
    expect(validateVoiceBoxUrl('http://192.168.1.50/tts?text={text}').ok).toBe(true)
  })
})

describe('voice-box · HttpVoiceBoxTransport', () => {
  it('文本 URL 编码并命中模板;2xx → ok', async () => {
    const seen: string[] = []
    const fetchImpl: VoiceBoxFetch = async (url) => {
      seen.push(url)
      return { ok: true, status: 200 }
    }
    const t = new HttpVoiceBoxTransport({ urlTemplate: 'http://192.168.1.50/tts?text={text}', fetchImpl })
    const r = await t.announce('请小美到A01包厢')
    expect(r.ok).toBe(true)
    expect(seen[0]).toBe('http://192.168.1.50/tts?text=' + encodeURIComponent('请小美到A01包厢'))
  })
  it('非 2xx / 网络异常 → ok=false 且不抛', async () => {
    const bad = new HttpVoiceBoxTransport({
      urlTemplate: 'http://10.0.0.8/say?t={text}',
      fetchImpl: async () => ({ ok: false, status: 503 }),
    })
    expect((await bad.announce('x')).ok).toBe(false)
    const boom = new HttpVoiceBoxTransport({
      urlTemplate: 'http://10.0.0.8/say?t={text}',
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED')
      },
    })
    const r = await boom.announce('x')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('ECONNREFUSED')
  })
  it('POST 模式带 JSON 体;空文本直接拒', async () => {
    let body = ''
    const t = new HttpVoiceBoxTransport({
      urlTemplate: 'http://192.168.0.2/api?text={text}',
      method: 'POST',
      fetchImpl: async (_u, init) => {
        body = init.body ?? ''
        return { ok: true, status: 200 }
      },
    })
    await t.announce('hello')
    expect(JSON.parse(body)).toEqual({ text: 'hello' })
    expect((await t.announce('   ')).ok).toBe(false)
  })
  it('公网模板构造即抛', () => {
    expect(() => new HttpVoiceBoxTransport({ urlTemplate: 'http://1.2.3.4/t?x={text}', fetchImpl: async () => ({ ok: true, status: 200 }) })).toThrow()
  })
  it('Noop:skipped=true 不算失败', async () => {
    const r = await new NoopVoiceBoxTransport().announce()
    expect(r.ok).toBe(true)
    expect(r.skipped).toBe(true)
  })
})
