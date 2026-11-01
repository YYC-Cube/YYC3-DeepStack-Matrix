/**
 * A15 报备现场屏(大屏模式,阶段4 交付):
 * - 左:全屏二维码(scene 60s 时间窗轮换=防截屏;倒计时自动刷新;WX 凭据就绪后出真小程序码)
 * - 右:实时签到流(10s 轮询最新报备,新签到置顶高亮)
 * - 全屏按钮(requestFullscreen);大字号适配电视/平板横置
 * 依据:05 文档 A15 + 需求全集 §模块5
 */
import { useCallback, useEffect, useState } from 'react'
import { Maximize, RefreshCw } from 'lucide-react'
import { Button, Card } from '@yyc3/ui'
import { REPORT_TYPES } from '@yyc3/leisure-core'
import { client, req, toastError } from '@/lib/api'
import { fmtTime } from '@/lib/format'
import { usePolling } from '@/components/kit'

interface QrcodeView {
  scene: string
  businessDate: string
  refreshAfterSeconds: number
  qrcodeType: 'WX_MP' | 'PENDING_CREDENTIALS'
  qrcodeImage: string | null
}
interface ReportRow {
  id: number
  stageName?: string | null
  badgeNo?: string | null
  type: string
  reportTime: string
}
const TYPE_LABEL: Record<string, string> = Object.fromEntries(REPORT_TYPES.map((t) => [t.code, t.label]))

export default function AttendanceScreenPage() {
  const [qr, setQr] = useState<QrcodeView | null>(null)
  const [countdown, setCountdown] = useState(60)
  const [feed, setFeed] = useState<ReportRow[]>([])
  const [latestId, setLatestId] = useState<number>(0)

  const loadQr = useCallback(async (): Promise<void> => {
    try {
      const res = await req<QrcodeView>('GET', '/attendance/qrcode')
      setQr(res)
      setCountdown(res.refreshAfterSeconds)
    } catch (e) {
      toastError(e, '签到码获取失败')
    }
  }, [])

  const loadFeed = useCallback(async (): Promise<void> => {
    try {
      const res = await client.attendance.reports({ businessDate: qr?.businessDate ?? '', pageSize: 10 })
      const rows = (res.rows as ReportRow[]) ?? []
      // 新签到置顶高亮判定放在 updater 之外(updater 须纯函数)
      const top = rows[0]
      setLatestId((prevTop) => (top !== undefined && top.id > prevTop ? top.id : prevTop))
      setFeed(rows)
    } catch {
      // 静默:现场屏不弹错误打断展示
    }
  }, [qr?.businessDate])

  useEffect(() => {
    void loadQr()
  }, [loadQr])
  // 首次拿到营业日后再拉签到流
  useEffect(() => {
    if (qr !== null) void loadFeed()
  }, [qr, loadFeed])
  usePolling(() => void loadFeed(), 10_000)

  // 倒计时自动换码(防截屏语义)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          void loadQr()
          return 60
        }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [loadQr])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col md:flex-row gap-4 p-4"
      style={{ background: 'linear-gradient(160deg, #060e1f 0%, #081430 100%)' }}
    >
      {/* 左:二维码区 */}
      <div className="flex-[3] flex flex-col items-center justify-center gap-4 min-w-0">
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-[#e0f0ff]">请使用微信扫码 · 签到 / 签退</h1>
          <p className="text-sm md:text-base text-[#8b9bb4] mt-1">
            营业日 {qr?.businessDate ?? '—'} · 签到码 <span className="text-[#00d4ff]">{String(countdown)}s</span> 后自动刷新
          </p>
        </div>
        <Card className="p-6 md:p-10 flex items-center justify-center" style={{ minHeight: 280, minWidth: 280 }}>
          {qr !== null && qr.qrcodeImage !== null ? (
            <img src={qr.qrcodeImage} alt="签到二维码" className="w-64 h-64 md:w-80 md:h-80" />
          ) : (
            <div className="w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[rgba(0,212,255,0.25)] rounded-lg text-center p-4">
              <RefreshCw className="w-10 h-10 text-[#00d4ff] opacity-60" />
              <p className="text-sm text-[#8b9bb4]">
                带参小程序码待微信凭据配置(阶段5)
                <br />
                接口已就绪,届时本区自动显示真码
              </p>
            </div>
          )}
        </Card>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadQr()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            立即刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void document.documentElement.requestFullscreen().catch(() => undefined)
            }}
          >
            <Maximize className="w-4 h-4 mr-1" />
            全屏
          </Button>
          <span className="text-[10px] text-[#8b9bb4] font-mono max-w-[200px] truncate">{qr?.scene ?? ''}</span>
        </div>
      </div>

      {/* 右:实时签到流 */}
      <div className="flex-[2] flex flex-col min-w-0 gap-2">
        <p className="text-sm text-[#8b9bb4]">实时签到流(10s 刷新)</p>
        <Card className="flex-1 p-0 overflow-y-auto">
          {feed.length === 0 && <p className="text-center text-[#8b9bb4] py-10 text-sm">暂无报备记录</p>}
          {feed.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,212,255,0.08)]"
              style={r.id === latestId ? { background: 'rgba(0,255,136,0.08)' } : undefined}
            >
              <div className="min-w-0">
                <p className="text-sm text-[#e0f0ff] truncate">
                  {r.stageName ?? '—'}
                  <span className="text-[#8b9bb4] ml-2 text-xs">{r.badgeNo ?? ''}</span>
                </p>
                <p className="text-xs text-[#8b9bb4]">{fmtTime(r.reportTime)}</p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full border shrink-0"
                style={{
                  color: r.type === 'CHECKIN' ? '#00ff88' : '#00d4ff',
                  borderColor: (r.type === 'CHECKIN' ? '#00ff88' : '#00d4ff') + '44',
                }}
              >
                {TYPE_LABEL[r.type] ?? r.type}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
