/**
 * A26-lite 门店参数(艺人设置 8 项,需求全集 §7):门店级 > env 默认
 * 改进位阈值即时生效(进行中场次按上钟快照,§6.4)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Checkbox, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { PageHeader, SelectBox } from '@/components/kit'

interface SettingsView {
  requiredProfileFields: string[]
  reportRequireReview: boolean
  checkoutMinMinutes: number
  allowSelfScanFinish: boolean
  allowStageWithoutCheckin: boolean
  ticketPurchaseEnabled: boolean
  roomBilling: {
    feeMode: 'HOURLY' | 'FLAT'
    roundingEnabled: boolean
    roundingThresholdMinutes: number
    crossDayAccumulate: boolean
  }
  stageAssignMode: 'ROTATION' | 'SELF_PICK' | 'MIXED'
}

export default function SettingsArtistPage() {
  const [s, setS] = useState<SettingsView | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      setS(await req<SettingsView>('GET', '/store-config/artist-settings'))
    } catch (e) {
      toastError(e, '参数加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    if (s === null) return
    setBusy(true)
    try {
      await req('PUT', '/store-config/artist-settings', {
        checkoutMinMinutes: s.checkoutMinMinutes,
        allowSelfScanFinish: s.allowSelfScanFinish,
        allowStageWithoutCheckin: s.allowStageWithoutCheckin,
        ticketPurchase: { enabled: s.ticketPurchaseEnabled },
        reportSettings: { requireReview: s.reportRequireReview },
        roomBilling: s.roomBilling,
        stageAssignMode: s.stageAssignMode,
      })
      toast.success('门店参数已保存(逐键审计;进行中场次按上钟快照不受影响)')
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  if (s === null) {
    return <Card className="p-10 text-center text-[#8b9bb4]">加载中…</Card>
  }

  return (
    <div>
      <PageHeader
        title="门店参数(艺人设置)"
        desc="按门店隔离:A 店配置不影响 B 店;优先级:门店级 > 全局 env 默认(需求全集 §7)"
        actions={
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? '保存中…' : '保存'}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 max-w-4xl">
        <Card className="p-4 flex flex-col gap-3">
          <p className="text-sm text-[#00d4ff]">③ 签到后多久可签退(分钟)</p>
          <Input type="number" value={String(s.checkoutMinMinutes)} onChange={(e) => setS({ ...s, checkoutMinMinutes: Number(e.target.value) })} />
          <p className="text-xs text-[#8b9bb4]">防刷考勤;不足时限签退将 40905 拒绝</p>
        </Card>
        <Card className="p-4 flex flex-col gap-3">
          <p className="text-sm text-[#00d4ff]">④ 手动扫码下钟</p>
          <label className="flex items-center gap-2 text-sm text-[#e0f0ff]">
            <Checkbox checked={s.allowSelfScanFinish} onCheckedChange={(v) => setS({ ...s, allowSelfScanFinish: v === true })} />
            艺人端支持扫码下钟(关闭=仅前台/后台下钟)
          </label>
          <p className="text-sm text-[#00d4ff]">⑤ 未签到是否可上钟</p>
          <label className="flex items-center gap-2 text-sm text-[#e0f0ff]">
            <Checkbox checked={s.allowStageWithoutCheckin} onCheckedChange={(v) => setS({ ...s, allowStageWithoutCheckin: v === true })} />
            宽松模式:未签到可直接上钟
          </label>
        </Card>
        <Card className="p-4 flex flex-col gap-3">
          <p className="text-sm text-[#00d4ff]">⑦ 包厢计费规则(§6)</p>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-[#8b9bb4] w-24">计费模式</Label>
            <SelectBox
              className="w-40"
              value={s.roomBilling.feeMode}
              onChange={(v) => setS({ ...s, roomBilling: { ...s.roomBilling, feeMode: v as 'HOURLY' | 'FLAT' } })}
              options={[{ value: 'HOURLY', label: '小时计费' }, { value: 'FLAT', label: '一口价(预留)' }]}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#e0f0ff]">
            <Checkbox
              checked={s.roomBilling.roundingEnabled}
              onCheckedChange={(v) => setS({ ...s, roomBilling: { ...s.roomBilling, roundingEnabled: v === true } })}
            />
            启用进位规则(关闭=向下取整到小时)
          </label>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-[#8b9bb4] w-24">进位阈值 N</Label>
            <Input
              type="number"
              className="w-28"
              value={String(s.roomBilling.roundingThresholdMinutes)}
              onChange={(e) => setS({ ...s, roomBilling: { ...s.roomBilling, roundingThresholdMinutes: Number(e.target.value) } })}
            />
            <span className="text-xs text-[#8b9bb4]">分钟(默认15;剩余分钟 &gt; N 进位 1 小时)</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#e0f0ff]">
            <Checkbox
              checked={s.roomBilling.crossDayAccumulate}
              onCheckedChange={(v) => setS({ ...s, roomBilling: { ...s.roomBilling, crossDayAccumulate: v === true } })}
            />
            跨天连续累计(08:00~次日 08:00 不截断)
          </label>
        </Card>
        <Card className="p-4 flex flex-col gap-3">
          <p className="text-sm text-[#00d4ff]">② 报备设置</p>
          <label className="flex items-center gap-2 text-sm text-[#e0f0ff]">
            <Checkbox checked={s.reportRequireReview} onCheckedChange={(v) => setS({ ...s, reportRequireReview: v === true })} />
            报备需主管审核
          </label>
          <p className="text-sm text-[#00d4ff]">⑥ 台票购买</p>
          <label className="flex items-center gap-2 text-sm text-[#e0f0ff]">
            <Checkbox checked={s.ticketPurchaseEnabled} onCheckedChange={(v) => setS({ ...s, ticketPurchaseEnabled: v === true })} />
            允许台票购买(台票域整体 II 期)
          </label>
          <p className="text-sm text-[#00d4ff]">⑧ 上钟模式</p>
          <SelectBox
            value={s.stageAssignMode}
            onChange={(v) => setS({ ...s, stageAssignMode: v as SettingsView['stageAssignMode'] })}
            options={[
              { value: 'ROTATION', label: '轮台' },
              { value: 'SELF_PICK', label: '自选' },
              { value: 'MIXED', label: '混合' },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
