/**
 * 交接单打印版式(/handover/:id/print;浏览器打印→存 PDF)
 * 从交接班列表数据取单条快照(生成时冻结);@media print 隐藏交互元素
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@yyc3/ui'
import { req, toastError } from '@/lib/api'
import { YYC3LogoSvg } from '@/components/ai-assistant/YYC3LogoSvg'

interface HandoverRow {
  id: number
  businessDate: string
  shiftName: string
  rechargeTotal: number
  deductTotal: number
  settleTotal: number
  orderTotal: number
  openOrders: number
  status: string
  confirmCode: string
  takenBy: number | null
  confirmedAt: string | null
  remark: string | null
}

export default function HandoverPrintPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const [row, setRow] = useState<HandoverRow | null>(null)

  useEffect(() => {
    void req<{ rows: HandoverRow[] }>('GET', '/handover')
      .then((res) => {
        setRow(res.rows.find((r) => r.id === Number(id)) ?? null)
      })
      .catch((e) => toastError(e, '交接单加载失败'))
  }, [id])

  if (row === null) {
    return <div className="p-6 text-sm text-fg-muted">加载中或未找到交接单…</div>
  }

  const rows: Array<[string, string]> = [
    ['营业日', row.businessDate],
    ['班次', row.shiftName],
    ['充值合计', '¥' + String(row.rechargeTotal)],
    ['扣费合计', '¥' + String(row.deductTotal)],
    ['关房结算合计', '¥' + String(row.settleTotal)],
    ['点单合计', '¥' + String(row.orderTotal)],
    ['未结订单数', String(row.openOrders)],
    ['状态', row.status === 'CONFIRMED' ? '接班已确认' : '待接班确认'],
  ]

  return (
    <div className="p-6 max-w-2xl print:p-0" style={{ background: 'var(--lm-bg)' }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="flex items-center gap-2 mb-4">
        <YYC3LogoSvg size={26} />
        <span className="font-semibold text-[var(--lm-fg)]">YYC³ 销售管理系统 · 交接班对账单</span>
        <Button variant="outline" size="sm" className="ml-auto no-print" onClick={() => window.print()}>
          打印 / 存 PDF
        </Button>
        <Button variant="ghost" size="sm" className="no-print" onClick={() => { navigate('/handover') }}>返回</Button>
      </div>

      <div className="border rounded-lg p-5 space-y-3 bg-white text-black">
        <div className="text-lg font-bold text-center mb-2">交接班对账单</div>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-gray-200 py-1.5">
            <span className="text-sm text-gray-600">{k}</span>
            <span className="text-sm font-medium">{v}</span>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-sm">
          <div>
            <div className="border-t border-gray-400 pt-2">交班人签字</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">接班人签字</div>
          </div>
        </div>
        {row.status === 'OPEN' && row.confirmCode !== '' && (
          <div className="border-t border-gray-200 pt-3 mt-2 text-center">
            <span className="text-xs text-gray-600 mr-3">接班码(系统确认时录入)</span>
            <span className="font-mono text-xl font-bold tracking-[0.5em]">{row.confirmCode}</span>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-3 text-center">
        金额为生成时冻结快照;系统单号 #{String(row.id)} · YYC³ 销售管理系统自动生成
      </p>
    </div>
  )
}
