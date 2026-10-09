/**
 * @file: empty-state.tsx
 * @description: EmptyState 空状态原子件 — icon/title/hint/action 四插槽（主文档 5.3.4-⑤ 截图实证同构抽取）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [ui],[brand],[empty-state]
 */
import * as React from "react";

import { cn } from "../utils";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** 顶部插画/图标槽（如线稿大脑、齿轮、`</>` 等同构空态图形） */
  icon?: React.ReactNode;
  /** 主标题（必填，如「选择一条规则查看详情」） */
  title: React.ReactNode;
  /** 引导句（次级说明文案） */
  hint?: React.ReactNode;
  /** 行动槽（按钮/链接组） */
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, hint, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-1 text-muted-foreground/60 [&_svg]:size-12" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {hint ? (
        <div className="max-w-sm text-sm text-muted-foreground">{hint}</div>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
