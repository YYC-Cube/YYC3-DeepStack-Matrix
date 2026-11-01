/**
 * 功能码守卫(06 文档 RBAC):permCodes 驱动;缺码渲染拒绝面板
 * 注:shell 的 RequireRole 为 admin/developer 角色枚举模型,与本项目功能码模型不匹配,故自建
 */
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth'

export function RequirePerm({ perm, children }: { perm: string | string[]; children: ReactNode }) {
  const permCodes = useAuthStore((s) => s.permCodes)
  const need = Array.isArray(perm) ? perm : [perm]
  const granted = need.length === 0 || need.some((c) => permCodes.includes(c))
  if (granted) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.25)]">
        <Lock className="w-7 h-7 text-[#ff3366]" />
      </div>
      <div className="text-sm text-[#8b9bb4]">权限不足(需功能码:{need.join(' / ')})</div>
    </div>
  )
}
