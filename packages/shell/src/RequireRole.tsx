/**
 * @file: RequireRole.tsx
 * @description: 路由级角色守卫 — 管理面板权限落地（质量审核 #3 修复）
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-10-16
 * @status: active
 * @tags: [component],[auth],[guard]
 *
 * @brief: 系统已有 AppUser.role（admin/developer）角色模型与 AuthContext
 *         下发通道，但管理面板路由此前零校验（CommandPalette 可直达）。
 *         本守卫将用户/审计/环境变量/数据编辑/存储/安全等管理路由收敛为
 *         admin 专属；未登录或 developer 角色访问时渲染拒绝面板。
 */

import { Lock } from "lucide-react";
import { useContext, type ReactNode } from "react";
import { AuthContext } from "@yyc3/core/authContext";

interface RequireRoleProps {
  /** 允许访问的角色（默认仅 admin） */
  allow?: Array<"admin" | "developer">;
  children: ReactNode;
}

export function RequireRole({ allow = ["admin"], children }: RequireRoleProps) {
  const { userRole, isGhost } = useContext(AuthContext);

  // Ghost 模式为本地调试全权限通道（沿用既有设计，登录页显式开启）
  const granted = isGhost || allow.includes(userRole as "admin" | "developer");

  if (granted) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.25)]">
        <Lock className="w-7 h-7 text-[#ff3366]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-[#e0f0ff]">权限不足</h2>
        <p className="text-sm text-[#e0f0ff]/50 max-w-md leading-relaxed">
          该管理面板仅限 <span className="text-[#00ff88]">admin</span> 角色访问。
          {userRole
            ? `当前角色为 ${userRole}，如需访问请联系管理员提权。`
            : "当前未登录，请先在登录页完成认证。"}
        </p>
      </div>
    </div>
  );
}
