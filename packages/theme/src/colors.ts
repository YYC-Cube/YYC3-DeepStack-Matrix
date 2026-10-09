/**
 * @file: colors.ts
 * @description: 设计系统颜色快捷导出 — C 单源为 colors.generated.ts（CSS 变量），本文件仅附加 alpha 运行时工具
 * @author: YanYuCloudCube Team
 * @version: v1.1.0
 * @created: 2026-04-20
 * @updated: 2026-10-10
 * @status: active
 * @tags: [config],[design-system],[colors]
 *
 * @usage: import { C } from "@yyc3/theme"; C.primary
 */

import { C as TOKENS } from "./colors.generated";

/** 语义色快捷对象（token 值单源自 theme.css :root，alpha 为纯函数扩展） */
export const C = {
  ...TOKENS,
  /** 16进制 → rgba 转换 */
  alpha(hex: string, a: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  },
} as const;
