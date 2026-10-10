---
file: 06-M4-5-shared域定性方案.md
description: M4-5 shared 域 17 件终局定性 + ops 二次包化 4 件解锁 + Phase 3 漏网 5 lib 收编 core + P2 同窗仲裁
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.1.0
created: 2026-10-10
updated: 2026-10-10（实测回填：品牌 3 消重 + ops 二包 4 件 + 5 lib 收编 + P2 切 2 件；九包 tsc=0 / P1 67→48 / P2 基线同 / build 三绿；偏差 #19-#22）
status: active
tags: [phase4],[shared],[qualification],[ops],[core],[p2-arbitration]
category: plan
---

# M4-5 shared 域定性方案（含 ops 二次包化 + Phase 3 漏网 lib 收编）

> 上游：Phase 4 执行日志「后续登记」M4-5 项 + Phase 3 执行日志第二轮「余 5 件随 M4-5 定性」。
> 任务：① shared 域 17 件终局定性；② 解锁 OperationCenter/ServiceLoopPanel 二次包化；③ P2 余 5 件 lib 同窗仲裁。

## 1. 勘察实证

### 1.1 shared 域 17 件三端 md5 仲裁

| 件 | P1 | P3=P4 | 仲裁 | 依赖面 |
| -- | -- | -- | -- | -- |
| GlassCard | 44L | 同 | **L0 全同 = @yyc3/ui/brand（md5 逐字节同）** | 无业务依赖 |
| YYC3Logo | 80L | 同 | **L0 全同 = @yyc3/ui/brand** | 无 |
| YYC3LogoSvg | 75L | 同 | **L0 全同 = @yyc3/ui/brand** | 无 |
| QuickActionGrid | 128L | 同（P1 差 1 行 types 路径） | L1 纯路径差 | types（OperationItem/OperationStatus 已在 core） |
| DataFlowDiagram | 140L | 同 | **L0 三端全同** | types（DataFlowNode/Edge 已在 core L802/820） |
| Layout | 193L | 同 | L1 纯路径差 | TopBar/Sidebar/BottomNav/AIAssistant/OfflineIndicator/ErrorBoundary/CommandPalette + @yyc3/admin + **../dev/IntegratedTerminal** + store + useMobileView |
| Sidebar | 431L | 同 | L1 纯路径差 | core/i18n + YYC3Logo |
| TopBar | 690L | 同 | L1 纯路径差 | core×3 + ConnectionStatus/LanguageSwitcher/YYC3Logo + types(ConnectionState 已在 core) |
| BottomNav | 364L | 同 | L1 纯路径差 | motion + react-router + core/i18n |
| CommandPalette | 289L | 同 | L1 纯路径差 | **../../hooks/useKeyboardShortcuts**（端侧 hook） |
| AIAssistant | 1210L | 同 | L1 纯路径差 | core×2 + store×4 + **types CommandCategory（端侧 ui-types，core 未收）** |
| ConnectionStatus | 130L | 同 | L1 纯路径差 | types(ConnectionState 已在 core) |
| LanguageSwitcher | 87L | 同 | **L0 全同** | core/i18n |
| Login | 316L | 同 | **L0 全同** | core/supabaseClient + YYC3Logo |
| NotFound | 163L | 同 | **L0 全同** | react-router + core/i18n |
| OfflineIndicator | 80L | 同 | L1 纯路径差 | **../../hooks/useOfflineMode**（端侧 hook） |
| ErrorBoundary | 312L | 同 | L1 纯路径差 | core×2 + YYC3LogoSvg + types(AppError/ErrorBoundaryLevel 均已在 core) |

**OperationCenter/ServiceLoopPanel**（P1 modules/ops 暂缓件）：P3=P4 同 + P1 纯路径差 3 处（GlassCard/QuickActionGrid/view-context 相对深度）→ L0 实质同源，依赖全通（GlassCard 切 ui、QuickActionGrid/DataFlowDiagram 随包、ops 包内 5 件已就绪、core×2）。

### 1.2 M4-0 登记修正（偏差 #19）

- **DataFlowDiagram「反向独有」误登**：实测三端均有（P1 位于 `src/app/components/`，M4-0 取样框为 modules/ 漏检）且 **L0 三端全同** → 反向独有 **4→3**（剩 CodeEditor/DesignSystemEditor/ImageWithFallback）

### 1.3 Phase 3 漏网 5 lib（P2 同窗仲裁主对象）

P2 余 5 件 lib **并非 P2 独有——三端 lib 均有同名件且三端 md5 全同**（Phase 3 首批仅收 20 件字节级全同名件，此 5 件漏网）：

| 件 | 三端 | P1↔P2 diff | P2 定性 |
| -- | -- | -- | -- |
| authContext (21L/16L) | L0 全同 | 仅 JSDoc 头差异，逻辑逐行同 | **✅ 切包**（L1 纯注释差） |
| backgroundSync (113L/111L) | L0 全同 | console.info/log + as any/unknown 严类型 + 括号风格 | **✅ 切包**（P2 测试无 console 断言，行为等价实证） |
| local-knowledge-base (567L/160L) | L0 全同 | **真异构**：DevKnowledgeArticle↔KnowledgeArticle 类型名不同、P1 全量结构化管理 ↔ P2 AI 助手 Mock 检索 | ❌ 留端（GitService 同款 L1 反向特化） |
| network-utils (198L/196L) | L0 全同 | 默认服务器 **localhost ↔ 192.168.3.45** + any 类型；P2 测试 L60/68/72 **显式断言 192.168.3.45** | ❌ 留端（偏差 #11 同款：默认值行为契约，切包必挂） |
| yyc3-icons (348L/338L) | L0 全同 | 资源路径契约 **yyc3-badge-icons ↔ yyc3-icons**（public 目录名 + CDN URL） | ❌ 留端（运行时图标 404 风险） |

### 1.4 core/types 补录闭包（7 个）

AuthContextValue（UserRole 已在 core L98）+ SyncItem/SyncQueueStats/SyncProcessResult + NetworkInterface/NetworkConfig/ConnectionTestResult；local-knowledge-base/yyc3-icons 自包含零补录。

## 2. 定性终局与处置

| 组 | 件 | 处置 |
| -- | -- | -- |
| 品牌重复 3 | GlassCard/YYC3Logo/YYC3LogoSvg | **三端删 + 切 @yyc3/ui**（纯重复消除） |
| ops 域件 4 | QuickActionGrid/DataFlowDiagram/OperationCenter/ServiceLoopPanel | **→ @yyc3/ops 二次包化**（exports +4） |
| 壳层 5 | Layout/Sidebar/TopBar/BottomNav/CommandPalette | **留端 Phase 5 壳层专项**（Layout 引 dev/IntegratedTerminal 跨域障碍实锤；CommandPalette 引端侧 useKeyboardShortcuts） |
| 壳层依附 4 | AIAssistant/ConnectionStatus/LanguageSwitcher/OfflineIndicator | **留端 Phase 5 同窗**（消费面 = Layout/TopBar 壳层自身；AIAssistant 另有 CommandCategory 端类型障碍；OfflineIndicator 引 useOfflineMode） |
| 路由级 3 | Login/NotFound/ErrorBoundary | **留端 Phase 5 同窗**（消费面 = App.tsx/routes.tsx/Layout 全端侧；L0 同源但无跨端包化收益，避免二次切引） |
| Phase 3 漏网 5 lib | authContext/backgroundSync/local-knowledge-base/network-utils/yyc3-icons | **P1 版 git mv 入 core**（三端 L0 去重）+ exports +5；P2 侧 authContext/backgroundSync 切包、余 3 件行为异构留端 |

## 3. 决策表

| # | 决策 | 依据 |
| -- | -- | -- |
| D1 | 品牌三件按「重复件删除」处理而非重新包化 | md5 与 @yyc3/ui/brand 逐字节同（Phase 2 已收编，端侧残留副本） |
| D2 | QuickActionGrid/DataFlowDiagram 归 @yyc3/ops（非 ui/shared 包） | 消费主面 OperationCenter/ServiceLoopPanel/ops barrel；语义为 ops 域展示件；dev/design-system 消费方切包引 |
| D3 | OperationCenter/ServiceLoopPanel 随批二次包化 | 障碍 QuickActionGrid/DataFlowDiagram 本批解除；依赖面全通 |
| D4 | 壳层 9 件（5+4）+ 路由级 3 件定性留端 Phase 5 | 消费面绑定端侧壳层/路由；Phase 5 壳层方案定型前单独包化致二次切引 |
| D5 | 5 lib 以 P1 版为源收编 core | 三端 L0 全同（md5 实证）；P2 版 3 件行为异构留端、2 件切包 |
| D6 | core/types 补录 7 类型 | 5 lib 编译闭包；UserRole/DataFlowNode/Edge 等已有复用 |
| D7 | M4-0 反向独有登记修正 4→3 | DataFlowDiagram 取样错位（P1 位于 app/components 非 modules） |

## 4. 实施批次

| 批 | 内容 | 切引面预估 |
| -- | -- | -- |
| A | 品牌三件三端删 + 切 @yyc3/ui/brand | P1 ~108 文件（GlassCard 87 + Logo 12 + Svg 9，含重叠）+ P3/P4 同构 |
| B | ops 二包 4 件：git mv + exports +4 + 三端切引 + 端侧删 | 三端 routes + dev/design-system 消费方 + 测试件 + P1 shared/ops barrel 改写 |
| C | 5 lib 收编：git mv + types 补录 + exports +5 + 三端切引 + P3/P4 删 + P2 切 2 件 | 三端 2-7 文件/件 + P2 7 文件 |
| D | 验证矩阵：九包 tsc + 四端基线 + P2 vitest + build | — |

## 5. 执行实测回填（2026-10-10）

### 5.1 结果总览

| 项 | 结果 |
| -- | ---- |
| A 批品牌切引 | 三端 71+51+51 文件切 `@yyc3/ui`（barrel）+ uiSvg 替换缺陷修复 13 文件 + 单引号盲区 3 处（HotelDashboard ×3 端）+ 品牌件 9 删（三端 ×3） |
| B 批 ops 二包 | 4 件 git mv 入 `@yyc3/ops` + exports +4（13→17 条）+ barrel +4；P1 routes×2/barrels×2/4 测试件；P3/P4 routes×2/4 测试件/端；P3/P4 副本 8 件删；ServiceLoopPanel.test **失效 vi.mock 修正**（`../modules/dev/DataFlowDiagram` 路径不存在 → `@yyc3/ops/data-flow-diagram`） |
| C 批 lib 收编 | 5 件 git mv 入 core + exports +5（40→45 条）+ core/types +65L（+10 类型）；三端切引 12×3 文件 + lib 内互引补刀 3 处（ai-family-intelligence）+ 动态 import/require 补刀（rf001/types.test/useTerminal）；P3/P4 副本 10 件删；**P2 切包 authContext/backgroundSync**（5 文件）+ P2 两件删 |
| 验证矩阵 | **九包 tsc=0**；P1 tsc **67→48**（品牌断引 19 处顺带修复——正向偏离，剩 48 = ai-family store 路径断引存量归 M4-6）；P3=P4=0；P2 tsc 7 错**逐字同基线**；build 三绿 858/831/812ms + P2 build 7 错基线 |
| P2 vitest | 1811 通过 / 54 失败全存量实证（7 失败文件零改动 git diff + 最后修改 = M3-P2 提交）；本批相关 backgroundSync **10/10 全绿**；**净回归 0** |

### 5.2 偏差登记（#19–#22）

| # | 事项 | 处置 |
| -- | ---- | ---- |
| 19 | **DataFlowDiagram「反向独有」误登**：M4-0 取样框为 modules/ 漏检 P1 `app/components/` 平铺副本，实测三端均有且 L0 全同（140L） | 反向独有 **4→3**（剩 CodeEditor/DesignSystemEditor/ImageWithFallback）；本批随 ops 入包，三端消费方切包引；教训：**取样框需覆盖 app/components 平铺层** |
| 20 | **perl `-i -p` 与脚本内嵌 `while(<>){print;}` 双重循环**：首行被外层读走后内层吞其余行——13 文件首行 `/**` 错位/丢失（P3/P4 6+6 + P1 UnifiedModelManager，tsc 爆语法错 100/100/20） | 全量检出（判据 diff 含 `^-/\*\*$`）→ git checkout 13 件恢复 → 修复版脚本（仅 s/// 语句供 -p 用）重切一次成型；教训：**perl -p 模式脚本内严禁再写 while/print——替换逻辑裸语句化** |
| 21 | **品牌替换前缀吞尾**：`(GlassCard | YYC3Logo | YYC3LogoSvg)` 交替匹配 `YYC3Logo` 前缀后剩余 `Svg` → `@yyc3/uiSvg` 13 处 | 定长修复 `s{\@yyc3/uiSvg}{\@yyc3/ui}g`；教训：**交替组含前缀关系时须按长名优先或加边界断言** |
| 22 | **单引号引用盲区三犯**（#5 同族）：HotelDashboard `from './GlassCard'` 单引号漏切（grep/perl 均双引号 pattern） | 手工切 3 处；教训固化：**pattern 引号类必须 `["']` 枚举或双轮跑** |

### 5.3 M3-P2 断言对齐补漏（3 例）

- rf-phase2 ALL_STORES 14→24；settings-model DEFAULT_AI_MODEL `gpt-4o`→`codegeex4:latest`；e2e-integration SYSTEM_NAME/VERSION 旧值两处 → core 契约（Cloud Intelli-Matrix/3.4.1）——M3-P2 时 11 专测清单外文件，本批 P2 vitest 全量复核暴露
- rf-phase2 RF-011 ×2 余败 = routes.ts 断链连带（P2 tsc 基线第 7 错同源，M4-6 ai-family 扩容修复，不硬改断言掩盖）

### 5.4 终态与后续

- **shared 域终态**：品牌 3 件消重 + QuickActionGrid 迁 ops + 壳层 9 件（5+4）+ 路由级 3 件留端 Phase 5；P1 shared/ 剩 13 件（index + 12）
- **@yyc3/ops 终态**：13 组件 + 6 hooks，exports 17 条；P1 modules/ops 剩 7 暂缓件（ServiceConnectionTest 依赖障碍已解除随下批清空）
- **core 终态**：src 32 件 + i18n，exports 45 条，types 1525L
- **P2 lib 终态**：7→5 件（GitService/supabaseClient/local-knowledge-base/network-utils/yyc3-icons 均为行为异构留端）；@yyc3/core 引用 12 件
- **P1 tsc 基线更新**：67→48（品牌断引修复 19 处正向偏离；剩余 48 = ai-family store 路径断引 + 连锁 implicit any，M4-6 处理）
- 后续：ServiceConnectionTest/ConfigExportCenter 等暂缓件清空随 M4-6/下批；壳层 12 件 Phase 5
