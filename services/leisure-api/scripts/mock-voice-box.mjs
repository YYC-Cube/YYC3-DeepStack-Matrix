/**
 * 语音盒子 mock(dev 联调):模拟店内 IP 喇叭/TTS 网关
 * 用法:node scripts/mock-voice-box.mjs [端口=3999]
 * 配套:.env 设 VOICE_BOX_URL=http://127.0.0.1:3999/tts?text={text}
 * 行为:GET /tts?text=... / POST /tts(JSON {text})→ 打印收到的播报文本并返回 200
 * 仅本机回环监听,非生产件;真机联调时替换为盒子实际接口
 */
import http from 'node:http'

const port = Number(process.argv[2] ?? 3999)

const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    let text = url.searchParams.get('text') ?? ''
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
        if (typeof body.text === 'string') text = body.text
      } catch {
        /* 忽略坏体 */
      }
    }
    const at = new Date().toISOString().slice(11, 19)
    if (url.pathname === '/tts') {
      console.log('[' + at + '] 🔊 盒子收到播报: ' + (text === '' ? '(空)' : text))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, played: text }))
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'not found' }))
    }
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log('mock voice box listening on http://127.0.0.1:' + String(port) + '/tts')
})
