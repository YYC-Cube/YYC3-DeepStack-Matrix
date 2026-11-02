/**
 * 共享组件套件:DataTable / PageHeader / MoneyText / StatusBadge / Field / ConfirmButton / PagePlaceholder / EmptyState / StatCard
 * 铁律 8:危险操作二次确认,文案具体化(如「确认扣费 ¥200」)
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@yyc3/ui'
import { fmtMoney, num } from '@/lib/format'

/* ── 页头 ── */

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold text-[#e0f0ff]">{title}</h1>
        {desc !== undefined && <p className="text-sm text-[#8b9bb4] mt-1">{desc}</p>}
      </div>
      {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ── 数据表(分页) ── */

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

export function DataTable<T extends object>(p: {
  columns: Array<Column<T>>
  rows: T[] | undefined
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  emptyText?: string
}) {
  const rows = p.rows ?? []
  const total = p.total ?? rows.length
  const pageSize = p.pageSize ?? 20
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-[rgba(0,212,255,0.12)]">
            {p.columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {p.loading === true && (
            <TableRow>
              <TableCell colSpan={p.columns.length} className="text-center text-[#8b9bb4] py-10">
                加载中…
              </TableCell>
            </TableRow>
          )}
          {p.loading !== true && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={p.columns.length} className="text-center text-[#8b9bb4] py-10">
                {p.emptyText ?? '暂无记录'}
              </TableCell>
            </TableRow>
          )}
          {p.loading !== true &&
            rows.map((row, i) => (
              <TableRow key={i} className="border-b border-[rgba(0,212,255,0.06)] transition-colors hover:bg-white/[0.02]">
                {p.columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render !== undefined ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {p.onPageChange !== undefined && total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 text-sm text-[#8b9bb4]">
          <span>
            共 {String(total)} 条 · 第 {String(p.page ?? 1)}/{String(pageCount)} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(p.page ?? 1) <= 1}
              onClick={() => p.onPageChange?.((p.page ?? 1) - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(p.page ?? 1) >= pageCount}
              onClick={() => p.onPageChange?.((p.page ?? 1) + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ── 金额(负数红,铁律:对齐实测未收款红字风格) ── */

export function MoneyText({ v, signed }: { v: string | number | null | undefined; signed?: boolean }) {
  const n = num(v)
  const text = (signed && n > 0 ? '+' : '') + fmtMoney(n)
  return <span className={n < 0 ? 'text-[#ff3366] font-medium' : 'text-[#e0f0ff]'}>{text}</span>
}

/* ── 状态徽标 ── */

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border"
      style={{ color, borderColor: color + '44', background: color + '11' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

/* ── 表单字段 ── */

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[#8b9bb4] text-xs">
        {label}
        {required === true && <span className="text-[#ff3366] ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

/* ── 下拉(受控简装) ── */

export function SelectBox({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? 'w-full'}>
        <SelectValue placeholder={placeholder ?? '请选择'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ── 危险确认按钮(文案具体化) ── */

export function ConfirmButton({
  confirmTitle,
  confirmDesc,
  confirmText = '确认',
  onConfirm,
  children,
  variant = 'destructive',
  disabled,
}: {
  confirmTitle: string
  confirmDesc: string
  confirmText?: string
  onConfirm: () => void
  children: ReactNode
  variant?: 'destructive' | 'outline' | 'default'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={variant} size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#8b9bb4]">{confirmDesc}</p>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setOpen(false)
              onConfirm()
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 定时轮询(卸载清理;实时看板/轮询类页面用) */
export function usePolling(fn: () => void, ms: number): void {
  useEffect(() => {
    const timer = setInterval(fn, ms)
    return () => clearInterval(timer)
  }, [fn, ms])
}

/* ── 空态(居中大图标 + 标题 + 弱化描述 + 行动点) ── */

export function EmptyState({ icon, title, desc, action }: {
  icon?: ReactNode
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 px-6 py-14 rounded-xl border border-[rgba(0,212,255,0.12)] bg-[rgba(6,14,31,0.6)]">
      <div className="mb-1">{icon ?? <Inbox className="w-12 h-12 text-[#44546e]" />}</div>
      <div className="text-sm font-medium text-[#e0f0ff]">{title}</div>
      {desc !== undefined && <div className="text-xs text-[#8b9bb4] max-w-xs">{desc}</div>}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* ── 统计卡(tone 色点小标签 + 大数字 + 可选 hint) ── */

const STAT_TONE_COLOR: Record<'primary' | 'success' | 'warning' | 'danger', string> = {
  primary: '#00d4ff',
  success: '#00ff88',
  warning: '#ffaa00',
  danger: '#ff3366',
}

export function StatCard({ label, value, tone = 'primary', hint }: {
  label: string
  value: ReactNode
  tone?: 'primary' | 'success' | 'warning' | 'danger'
  hint?: string
}) {
  const color = STAT_TONE_COLOR[tone]
  return (
    <div className="rounded-xl border border-[rgba(0,212,255,0.12)] bg-[rgba(6,14,31,0.6)] px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-[#8b9bb4]">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
        {label}
      </div>
      <div className="text-[1.5rem] leading-8 font-semibold text-[#e0f0ff] mt-1">{value}</div>
      {hint !== undefined && <div className="text-[11px] text-[#8b9bb4] mt-0.5">{hint}</div>}
    </div>
  )
}
