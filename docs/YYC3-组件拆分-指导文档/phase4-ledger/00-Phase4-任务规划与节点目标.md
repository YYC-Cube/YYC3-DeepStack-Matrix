---
file: 00-Phase4-任务规划与节点目标.md
description: Phase 4 @yyc3/business 业务域模块化 — 三端仲裁实证与分批策略
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase4],[business],[arbitration],[pilot]
category: plan
---

# 📋 Phase 4 任务规划与节点目标 · @yyc3/business 业务域

> 规划总则：执行有规划，规划有节点，节点有目标，目标可评估。
> 上游输入：主文档 §10 Phase 4（v1.7.0）+ Phase 2/3 未完登记（视觉对照、ide 引擎、types 单源、zustand、i18n）。

## 一、勘察实证（M4-0，2026-10-10）

### 1.1 三端结构实况

| 端 | 业务组件位置 | 形态 |
| -- | ---- | ---- |
| P1 | `src/app/modules/` 8 域（admin 21 / ai 6 / ai-family ~35 / business 3 / dev ~46 / monitor 22 / ops 19 / shared 17） | **域制分层** |
| P3 | `src/app/components/` 平铺 ~95 件 + 5 子目录（ai-family/design-system/figma/ide/theme） | **无域制** |
| P4 | 同 P3 平铺（子目录同名） | **无域制** |

**P2 参与度**：P2 无业务域组件迁移诉求（沙箱孤儿资产定性沿用 Phase 0 台账），仲裁范围 = P1×P3×P4 三方。

### 1.2 三端同名件仲裁分布（md5 实测 193 件）

| 级别 | 件数 | 定性 | 处置 |
| ---- | ---- | ---- | ---- |
| L0 三方全同 | 28 | 纯机械迁移 | git mv 一份 + git rm 两份 |
| L1「P3=P4 同、P1 独走」 | 126 | **小异级**（TOP 差异仅 20 行，多数 ≤16 行） | 逐件 diff 审读取基线 + 合流他版修复 |
| L1 单方缺失 | 1 | 双方仲裁 | 按优先级取基线 |
| 真全异 | **3** | CreateRuleModal（P4≈P1 新、P3 落后 174 行）、DatabaseManager（P4≈P1、P3 落后 506 行）、OperationChain（P4≈P1、P3 落后 72 行） | 取 P1/P4 新版为基线，P3 旧版 git log 佐证后废弃 |
| P1 独有 | 33 | ai-family 24（store 14+hooks 4+types 3+lib 1+顶层 2）+ 其余 9 | 直接入包无需仲裁；ai-family 部分随特深域走 |
| 反向独有（P3/P4 有 P1 无） | 5 | CodeEditor / DataFlowDiagram / DesignSystemEditor / ImageWithFallback / UnifiedModelManager | 逐件定性：入包 or 留端 |

> ⚠️ **主文档仲裁规则修正实证**：原「L2 异构 → 双 API 并存 + adapter 融合」在 131 件「疑似 L2」上**不适用**——实测 126/131 为 P3=P4 同源近亲（二元仲裁），真全异仅 3 件且均为版本滞后而非异构演进。Phase 4 实际是 **L0 28 + L1 130 + 特例 3** 的合流工程，无双 API 场景。

### 1.3 依赖面（域包边界约束）

| 依赖 | 总量 | 域分布 | 含义 |
| ---- | ---- | ---- | ---- |
| modules→store(slices) | 66 处 | ai-family 29 / admin 10 / monitor 10 / dev 7 / ops 7 / shared 3 / **ai 0** | store 归属是 admin/monitor/ops 前置题 |
| modules→hooks | 109 处 | dev 24 / admin 19 / monitor 16 / shared 14 / ops 14 / ai-family 13 / ai 7 / business 2 | 域内 hooks 随域走；通用 hooks 留端 |
| modules→services | 2 处 | admin 2 | services/ 仅 1 件，轻 |

### 1.4 试点域选定：**ai 域**

理由：① 体量最小（6 件）② **store 依赖 0**（无需等待 zustand 上收）③ hooks 依赖仅 7 处 ④ 三端同名件仲裁面小。

## 二、分批策略（里程碑）

| 批次 | 内容 | 前置 | 状态 |
| ---- | ---- | ---- | ---- |
| M4-2 | **ai 域试点**（6 件 + 关联 hooks 定性） | 无 | ⬜ |
| M4-3 | business 域（3 件，智慧酒店双版本 = 主文档动作 4 的 L1 仲裁样板） + ops 域（19 件） | store 上收方案定型（ops 依赖 7 处） | ⬜ |
| M4-4 | admin 域（21 件） + monitor 域（22 件） | 同上（各依赖 10 处） | ⬜ |
| M4-5 | shared 域定性（17 件——部分属 Phase 5 壳层：Layout/Sidebar/TopBar/CommandPalette） | Phase 5 边界对齐 | ⬜ |
| M4-6 | 特深域单列 `@yyc3/ai-family`（24 独有件 + FamilyMusic/成就/曲库全链） | M4-2~4 | ⬜ |
| M4-7 | 特深域单列 `@yyc3/ide`（P1 根 ide/ SDK + modules/dev/ide 29 件合并去重 + theme-presets 引擎，Phase 2 登记项） | M4-2~4 | ⬜ |
| M4-8 | 反向独有 5 件定性 + NavRegistry 单源 + PageShell 七型谱沉淀 | M4-2~5 | ⬜ |

**登记不闭环项**（跨阶段）：69 张视觉对照与 a11y 全量（Phase 2 登记，需逐页人工走查）；types 单源收敛；i18n 语言包上收；zustand 单根 store（M4-3 前定型）。

## 三、关键决策

| # | 决策 | 依据 |
| -- | ---- | ---- |
| 1 | 仲裁基线优先级实证修正：**P1/P4 为功能最全双源**（真全异 3 件均 P1≈P4 新版；L1 小异需逐件 diff 判断方向，不盲从 P4>P3>P1>P2 字面序） | M4-0 md5+diff 实证 |
| 2 | 「L2 双 API 并存」规则本轮无适用对象（0 件），如后续出现按主文档原规则执行 | 131 疑似 L2 实为 126 二元 + 5 误判 |
| 3 | 试点域 = ai（store 依赖 0 破除 store 前置依赖死锁） | §1.3/1.4 |
| 4 | 反向独有 5 件默认**留端**（P3/P4 特有功能，P1 无消费面），待 M4-8 逐件定性 | 依赖单向性 |
| 5 | 域包暂定 `packages/business` 单包多域入口（exports `/monitor` `/ops` `/admin` `/ai`），特深域 ai-family/ide 独立包——与主文档结构一致 | 主文档 §10 动作 1/5 |

## 四、变更记录

| 日期 | 变更内容 | 原因 |
| ---- | ---- | ---- |
| 2026-10-10 | 初版落盘 | M4-0 勘察完成 |
