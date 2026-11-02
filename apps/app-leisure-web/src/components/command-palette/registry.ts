/**
 * 命令面板注册表:MENU 扁平化(分组名作分组标题)+ 固定操作区(退出登录)
 * 权限过滤与 Sidebar 一致(permCodes 不含的条目不进面板);数据源只读 import,不改 Sidebar
 */
import { LogOut, type LucideIcon } from 'lucide-react'
import { MENU } from '@/app/layout/Sidebar'

export interface PaletteCommand {
  id: string
  label: string
  /** react-router 路径(hash 模式) */
  path: string
  /** 分组标题 */
  group: string
  icon: LucideIcon
  /** II 期占位角标 */
  badge?: string
  /** 固定操作:logout = 清空认证后跳登录页 */
  action?: 'logout'
}

export interface PaletteCommandGroup {
  group: string
  commands: PaletteCommand[]
}

/** 由 MENU + 当前权限构建面板条目(导航分组 + 固定「操作」分组) */
export function buildPaletteCommands(permCodes: string[]): PaletteCommandGroup[] {
  const navGroups: PaletteCommandGroup[] = MENU.map((g) => ({
    group: g.label,
    commands: g.items
      .filter((i) => permCodes.includes(i.perm))
      .map((i) => ({
        id: `nav-${i.key}`,
        label: i.label,
        path: i.path,
        group: g.label,
        icon: g.icon,
        badge: i.badge,
      })),
  })).filter((g) => g.commands.length > 0)

  const actionGroups: PaletteCommandGroup[] = [
    {
      group: '操作',
      commands: [
        {
          id: 'action-logout',
          label: '退出登录',
          path: '/login',
          group: '操作',
          icon: LogOut,
          action: 'logout',
        },
      ],
    },
  ]

  return [...navGroups, ...actionGroups]
}
