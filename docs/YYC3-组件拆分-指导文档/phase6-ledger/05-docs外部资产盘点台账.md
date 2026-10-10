---
file: 05-docs外部资产盘点台账.md
description: docs/ 外部资产实证盘点与处置（A 入库 + B 清理 + D 台账；v1.1 补范围外专项盘点）
author: AI Tutor <yyc3-matrix-session>
version: v1.1.0
created: 2026-10-11
updated: 2026-10-11
status: active
tags: [audit],[docs-assets],[disposal]
category: ledger
---

# 📦 docs/ 外部资产盘点台账（05）

> 盘点范围：用户指定的六个目录（yyc3-ui-mono / yyc3-packages / yyc3-mono / yyc3-management / yyc3-login-page / ai-assistant-dev），并入前轮已析的 yyc3-ui-organized，共 **七目录**。
> 处置决策（用户确认）：**A 精选文档入库 + B 垃圾清理 + D 本台账**；C 七目录整体外移未选，保留为未来选项。

## 一、共性铁证（七目录一致）

- **0 git 追踪**：`git ls-files docs/{七目录}` 全部计 0——从未入库
- **0 ignore 命中**：`git check-ignore` exit=1——根 .gitignore 并未排除 docs 外部目录，仅为 untracked
- **0 编译引用**：apps/packages 全量源码 rg 无任何指向 docs/ 外部目录的 import——Matrix 构建链完全不感知
- **特效族零吸收**：NeonCard/ParticleCanvas/GlitchText/LiquidGlass 在当前 packages/apps **零匹配**——ui-organized/ui-mono 中的特效实现从未进入代码库，登记为储备资产

## 二、七目录定性矩阵

| 目录 | 磁盘(盘点时) | 定性 | 关键实证 |
| --- | --- | --- | --- |
| yyc3-ui-mono | **4.0G** | 历代总坟场：「唯一主 Monorepo」自述，251 应用 + templates 2.3G + 373 项目分类账 + 21 归档源 | 17 个审计脚本（dup-check/struct-audit/cluster-audit 等）为现 scripts/ 工具链前身；[README](../../yyc3-ui-mono/README.md)、[archive/INDEX.md](../../yyc3-ui-mono/archive/INDEX.md) 入库 |
| yyc3-login-page | 450M→361M | 名不副实：440M 开源库整仓克隆（shadcn-ui×2 重复 / mui-x / ant-design / onlook / tdesign）；自研残件仅 Button/ 828K + web-ui 228K + karbon-navigation | 克隆可随时重取；Button/docs 6 份组件文档入库 |
| yyc3-mono | 254M | 项目档案库：55+ 归档 manifests + 9523 份文档提取版 md + 8 个中文命名 Next.js 残件 + create-yyc3-app.sh 脚手架 | 文档提取版有查证价值，物理不动 |
| yyc3-management | 18M | management 端完整雏形：React18+Vite SPA，56 个 shadcn UI 组件 + panels/services/settings + e2e tests + 全平台 PWA 图标族 | 与 packages/admin、monitor 职责相邻，最佳参考 |
| yyc3-ui-organized | 182M→**5.2M** | 组件资产库：effects 特效族 8 件 + claw-core（mcp/skills/multimodal/auth 定义层）+ AR ModelViewer + 蓝图文档 | 根部 7 份蓝图 md 为本项目源头孤本，全部入库 |
| yyc3-packages | 3.4M | 十二包直系前身（FamilyChat/FamilyClockHome/GlassCard 等大量同名） | STRUCTURE.md 入库；原型 GlassCard 69L → 终态 ui 包 44L |
| ai-assistant-dev | 176K | shell AIAssistant 雏形（219L → 终态 1210L，5.5 倍演进） | 归档价值，物理不动 |

## 三、B 清理执行记录（2026-10-11）

| 目标 | 大小 | 结果 |
| --- | --- | --- |
| docs/yyc3-login-page/shadcn-ui.tnasdownload | 89M | ✅ 已删（重复副本，shadcn-ui 原目录保留） |
| yyc3-zero-ui-base-organized/*/node_modules ×8（ar/base/devtools/effects/music/privacy/viz/widgets） | 176.7M | ✅ 已删 |
| docs/yyc3-packages/*/package.json.tmp ×4 | 微量 | ✅ 已删 |
| **合计回收** | **~267M** | 复测：ui-organized 5.2M、login-page 361M |

## 四、A 精选文档入库清单（17 份 + 本台账）

| 来源目录 | 入库文件 |
| --- | --- |
| yyc3-ui-organized/（根部） | AI-FAMILY-SEPARATION-ANALYSIS.md、README.md、YYC3-COMPONENT-ARCHITECTURE-DESIGN.md、YYC3-COMPONENT-LIBRARY-COMPREHENSIVE-IMPLEMENTATION-PLAN.md、YYC3-MONOREPO-IMPLEMENTATION-PLAN.md、YYC3-MONOREPO-QUICK-START-GUIDE.md、YYC3-ZERO.md |
| yyc3-packages/ | STRUCTURE.md |
| yyc3-management/ | README.md |
| yyc3-ui-mono/ | README.md、archive/INDEX.md |
| yyc3-login-page/Button/docs/ | Button.md、Form.md、Menu.md、README.md、Table.md、Toast.md |

> 入库性质标注：以上均为「外部资产快照」，仅作历史考据与蓝图溯源，**不参与构建**（构建链已实证零感知）。

## 五、储备资产登记（未来可回收）

| 资产 | 位置 | 触发条件 |
| --- | --- | --- |
| effects 特效族 8 件（GlitchText/NeonCard/ParticleCanvas/Cyberpunk/3DEffects 等） | yyc3-ui-organized 与 ui-mono 内多份副本 | 端侧需要赛博/霓虹视觉时，按 @yyc3/ui 原语规范重写吸收 |
| claw-core 定义层（mcp/skills/multimodal/auth） | yyc3-ui-organized | Matrix 引入 agent 能力层时参考 |
| management 雏形（56 UI 组件 + panels/services + PWA 图标族） | yyc3-management | admin 端扩建 / 独立管理平台立项时 |
| scripts 审计工具链前身（17 脚本） | yyc3-ui-mono/tools | 跨仓审计需求时对照增强现 scripts/ |
| 文档提取库（9523 md） | yyc3-mono/docs | 项目史考据 |
| 开源参考克隆（shadcn-ui/mui-x/ant-design/onlook/tdesign） | yyc3-login-page | 需要时重新克隆即可，不依赖本地 |

## 六、v1.1 范围外专项盘点（2026-10-11 第二轮）

> 上轮「范围外发现二」的 untracked 目录群专项定性；另：CP-IM 树 703 文件删除已获用户确认落账（提交 5ee19a8，用户自有备份）。

| 目录 | 规模 | 定性 | 处置（用户决策） |
| --- | --- | --- | --- |
| YYC3-组件拆分-标准规范 | 612K | **团队规范文档族**（21 md + 3 审计脚本）：文档格式/命名/代码规范/拆分原则/组件保存复用指南 + 6 份项目拆分分析报告——与正式指导文档同族 | 仅盘点不入库（物理不动） |
| YYC3-构建智能-复用架构 | 252K | KB 清洗/复用框架方法论（10 md + 1 js） | 同上 |
| YYC3-代码组件-复用规划 | 184K | 组件库建设方案 + AI 智能编程白皮书（4 md + 1 html） | 同上 |
| YYC3-项目主题-设计规划 | 1.6M | 设计文档/主题设计/实例项目（54 md） | 同上 |
| YYC3-项目分析-分类工具 | 64K | 运行清洗脚本说明（5 md） | 同上 |
| YYC3-项目主题-组件分类 | 12K | 组件分类单文档 | 同上 |
| docs/scripts | 5.1M | 工具库：451 代码文件，7 子域（architecture/audit/framework/kb-tools/standards/theme-system/ui-design） | 同上 |
| docs/shadcn-ui | 153M | 开源克隆第三副本（仅 ui/ 子目录，与 login-page/shadcn-ui 89M 同源） | ✅ 已删（留 login-page 89M 参考） |

**范围外共性铁证**：全部零编译引用（rg 实证）；方法论 md 合计 ≈ 91 份。
**已追踪辨析（非外部资产）**：docs/README.md、AI-Family-Agent-模块复用指导.md、YYC3-团队资产-标准规范（37 文件）均已在 git 追踪。
**磁盘终态**：docs/ 全目录 4.7G（两轮清理合计回收 ~420M：第一轮 267M + 本轮 153M）。

## 七、遗留与后续选项

- **C 外移**（未执行）：docs/ 外部资产仍占 ~4.6G（ui-mono 4.0G 为主体），未来可选整体外移仓库外使 docs/ 回归纯文档
- 储备资产吸收一律走「按现规范重写」而非直接复制（历史代码无门禁保障）
- 中文目录群 91 份方法论 md 用户决策「仅盘点不入库」——若未来需要保全，重开此账按清单 add 即可

---
**盘点结论**：七目录均为纯磁盘资产，与 Matrix 构建链零耦合；A+B+D 执行后蓝图孤本已入库保全，磁盘回收 267M，储备资产已登记。
