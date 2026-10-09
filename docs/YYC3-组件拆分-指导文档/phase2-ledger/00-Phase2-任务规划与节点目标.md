---
file: phase2-ledger/00-Phase2-任务规划与节点目标.md
description: Phase 2 设计令牌 + @yyc3/ui — 勘察实证与里程碑规划
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase2],[planning],[ui],[theme]
category: plan
---

# 📋 Phase 2 任务规划与节点目标

## 规划输入

| 输入 | 来源 | 结论 |
| ---- | ---- | ---- |
| ui 仲裁台账 | [`YYC3-Phase0-迁移仲裁台账-ui组件.md`](../YYC3-Phase0-迁移仲裁台账-ui组件.md) | 49 件并集，L0=2/L0\*=44/L1=3/L2=0；**基线取 P1 版**（修正主文档「P4 版」） |
| 主文档 Phase 2 规格 | 主文档 §10 v1.4.0 | 动作 5 项 / DoD 3 项 |
| 提升层穿透经验 | Phase 1 日志 | ui 包必须显式声明 peer，避免 phantom 穿透 |

## 勘察实证（2026-10-10，本包开工前）

| # | 实证 | 数据 | 影响 |
| - | ---- | ---- | ---- |
| 1 | P1 ui 目录 | 49 件 = 47 tsx + use-mobile.ts + utils.ts，与台账并集完全一致 | 迁入源确认 |
| 2 | **ui 引用面** | P1=35处/9文件、P3=41处/10文件、P4=41处/10文件、**P2=0**（Figma 导出孤儿资产） | 切换仅 117 处/29 文件，批量重写可控 |
| 3 | **brand 件零依赖** | GlassCard/YYC3Logo(Svg)/page-header 仅 import react | 入包零风险 |
| 4 | **四 app 源码零 MUI 引用** | files=0（11005 为 node_modules 误计） | 删 MUI = 纯依赖删除，无代码替换 |
| 5 | P1 栈 | Tailwind v4（CSS-first @source）、React 19、Vite 8 | 需补 `@source` 扫描包路径 |

## 里程碑

| 节点 | 名称 | 目标 | 交付物 | 状态 |
| ---- | ---- | ---- | ------ | ---- |
| M2-0 | 规划落盘 | 本文档 | phase2-ledger/ | ✅ |
| M2-1 | ui 包骨架 | `packages/ui`（49 件 + brand + EmptyState） | src/ 49+5 件、package.json、tsconfig | ⬜ |
| M2-2 | 四 app 切换 | 改引 `@yyc3/ui`、删本地 ui/ | 117 处重写 + build 全绿 | ⬜ |
| M2-3 | theme 包 | `@yyc3/theme` 三层合一 | theme.css 单源 | ⬜ |
| M2-4 | 删 MUI | P1/P3/P4 去除 @mui+@emotion | `pnpm why @mui` 空 | ⬜ |
| M2-5 | DoD + 文档 | 零回归 + 日志 + 提交 | 执行日志 + 主文档 v1.5 | ⬜ |

## 关键决策

| 决策 | 选择 | 理由 |
| ---- | ---- | ---- |
| ui 包形态 | **internal package（源码直出）** | 免构建链；Vite 直接编译 TS 源；规避双 React 大版本的构建产物 peer 问题 |
| 基线版本 | P1 版（非主文档的 P4） | Phase 0 台账仲裁：P1≡P3≡P4 且 P1 处于最干净可验证状态 |
| barrel 策略 | 深路径 exports 为主（`@yyc3/ui/button`）+ 顺带 barrel | 现有 117 处引用全是深路径，映射关系 1:1 |
| EmptyState | 按 5.3.4-⑤ 新写（icon/title/hint/action 插槽） | 四项目均无此件，纯增量 |

## 风险登记

| 风险 | 应对 |
| ---- | ---- |
| P2 (React 18) 编译 ui 源码类型冲突 | peer 声明 `^18 \|\| ^19`；实测 P2 tsc 基线（7 错）不得回归 |
| Tailwind v4 扫描不到 workspace 包 | 各 app CSS 补 `@source` 指令指向 `../../packages/ui/src` |
| git mv 后 P1 残余引用 | 切换时逐 app 全量重写后 build 兜底 |

## 变更记录

| 日期 | 变更 | 原因 |
| ---- | ---- | ---- |
| 2026-10-10 | 初版 | M2-0 |
