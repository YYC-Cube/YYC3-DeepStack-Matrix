/**
 * II 期/IV 期占位页(A6/A12-A15/A21-A25):明确里程碑归属,不留死链
 */
import { useParams } from 'react-router'
import { Card } from '@yyc3/ui'
import { PageHeader } from '@/components/kit'

const TITLES: Record<string, { title: string; milestone: string; reason: string }> = {
  a6: { title: '台票设置', milestone: 'II 期', reason: 'ticket 模块为 II 期范围(10-后端 §七)' },
  a12: { title: '台票购买', milestone: 'II 期', reason: 'ticket 模块为 II 期范围' },
  a13: { title: '台票购买记录', milestone: 'II 期', reason: 'ticket 模块为 II 期范围' },
  a14: { title: '台票使用记录', milestone: 'II 期', reason: 'ticket 模块为 II 期范围' },
  a21: { title: '艺人订单', milestone: 'II 期', reason: '自有订单闭环为 II 期范围' },
  a22: { title: '展示控制台', milestone: 'II 期', reason: 'showcase 投放为 II 期范围' },
  a23: { title: '服务评价', milestone: 'II 期', reason: '评价域为 II 期范围' },
  a24: { title: '预约管理', milestone: 'II 期', reason: '预约域为 II 期范围' },
  a25: { title: '报表中心(10 张)', milestone: '阶段6', reason: 'report 模块 7 张 MVP 报表在阶段6 交付(4 张含包厢房号/类型维度)' },
}

export default function TodoPage() {
  const { key } = useParams()
  const meta = TITLES[key ?? ''] ?? { title: '建设中', milestone: '后续阶段', reason: '该页面属于后续里程碑范围' }
  return (
    <div>
      <PageHeader title={meta.title} desc={'里程碑:' + meta.milestone} />
      <Card className="p-10 text-center">
        <p className="text-[#e0f0ff] mb-2">{meta.title} · 规划于 {meta.milestone}</p>
        <p className="text-sm text-[#8b9bb4]">{meta.reason}</p>
        <p className="text-xs text-[#8b9bb4] mt-4">依据:PROMPT 阶段划分 + 10-后端 §七 里程碑映射 + 需求全集 §11/§12(II/III 期参照项不入 MVP)</p>
      </Card>
    </div>
  )
}
