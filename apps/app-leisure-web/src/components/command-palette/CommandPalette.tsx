/**
 * ⌘K 全局命令面板
 * 条目 = MENU 扁平化(权限过滤同 Sidebar)+ 固定操作区(退出登录)
 * ⌘K / Ctrl+K 开关:window 级 keydown 在组件内部注册(输入框聚焦时仍生效)
 * 原语用 @yyc3/ui 的 Command(cmdk 为 @yyc3/ui 既有依赖,不新增);过滤自实现(shouldFilter=false),
 * 对 label/path 做不区分大小写包含匹配(中文直接匹配,不引模糊库)
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@yyc3/ui'
import { useAuthStore } from '@/stores/auth'
import { buildPaletteCommands, type PaletteCommand } from './registry'

export interface CommandPaletteProps {
  /** 受控开关;缺省由组件内部自管(⌘K / Ctrl+K 切换) */
  open?: boolean
  /** 开关回调(打开/关闭均回调) */
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ open: openProp, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const permCodes = useAuthStore((s) => s.permCodes)
  const open = openProp ?? internalOpen

  const setOpen = (v: boolean) => {
    setInternalOpen(v)
    onOpenChange?.(v)
  }

  // 全局 ⌘K / Ctrl+K 开关(window 级,输入框聚焦时事件仍冒泡至此)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // 打开时重置查询;焦点经 autoFocus 落入输入框(面板每次打开都新挂载)
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const groups = useMemo(() => buildPaletteCommands(permCodes), [permCodes])

  // 过滤:label/path 不区分大小写包含匹配
  const q = query.trim().toLowerCase()
  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          commands: g.commands.filter(
            (c) => q === '' || c.label.toLowerCase().includes(q) || c.path.toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.commands.length > 0),
    [groups, q],
  )
  const total = visibleGroups.reduce((n, g) => n + g.commands.length, 0)

  const run = (c: PaletteCommand) => {
    if (c.action === 'logout') logout()
    navigate(c.path)
    setOpen(false)
  }

  if (!open) return null

  return (
    <>
      {/* 遮罩:点击关闭 */}
      <div
        data-testid="command-palette-overlay"
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* 面板 */}
      <div
        data-testid="command-palette"
        className="fixed left-1/2 top-[15%] z-[9999] w-[90vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-[rgba(0,212,255,0.2)] bg-[rgba(6,14,31,0.95)] shadow-[0_10px_50px_rgba(0,0,0,0.5)]"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <Command
          shouldFilter={false}
          loop
          className="rounded-lg bg-transparent text-[#e0f0ff] [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:border-[rgba(0,212,255,0.2)] [&_[data-slot=command-input-wrapper]_svg]:text-[#00d4ff]"
        >
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="搜索页面或操作…"
            className="h-11 text-sm text-[#e0f0ff] placeholder:text-[#8b9bb4]"
          />
          <CommandList className="max-h-[50vh]">
            {total === 0 ? (
              <div className="py-8 text-center text-sm text-[#8b9bb4]">无匹配结果</div>
            ) : (
              visibleGroups.map((g) => (
                <CommandGroup
                  key={g.group}
                  heading={g.group}
                  className="[&_[cmdk-group-heading]]:text-[#8b9bb4]"
                >
                  {g.commands.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => run(c)}
                      className="gap-2.5 rounded-md px-3 py-2.5 text-[#e0f0ff] data-[selected=true]:bg-[rgba(0,212,255,0.12)] data-[selected=true]:text-[#00d4ff]"
                    >
                      <c.icon className="w-4 h-4 shrink-0 text-[#8b9bb4]" />
                      <span className="flex-1 truncate text-sm">
                        {c.label}
                        {c.badge !== undefined && (
                          <span className="ml-1 text-[9px] text-[#ffaa00]">{c.badge}期</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[#8b9bb4]">{c.path}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
        <div className="flex items-center justify-between border-t border-[rgba(0,212,255,0.12)] px-4 py-2 text-[10px] text-[#8b9bb4]">
          <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
          <span>{total} 项</span>
        </div>
      </div>
    </>
  )
}
