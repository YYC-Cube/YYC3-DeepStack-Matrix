---
file: 01-P5-壳层专项与ops二包方案.md
description: Phase 5 壳层专项 — @yyc3/shell 建包（12 壳件 + IntegratedTerminal + 壳 hooks 3）+ NavRegistry 单源 + 智慧酒店结案实证 + ops 暂缓件二包（7 件 + full-backup）
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.1.0
created: 2026-10-10
updated: 2026-10-10（实测回填：@yyc3/shell 12 包 + ops 19 组件终态 + NavRegistry 单源 + 智慧酒店结案 + 十二包/四端全零全绿第三轮；偏差 #27）
status: active
tags: [phase5],[shell],[domain-package],[nav-registry],[ops-second-pack],[closure]
category: plan
---

# Phase 5 壳层专项 + ops 暂缓件二包方案

> 上游：Phase 4 交接（Phase 5 壳层专项 + 可选 ops 二包/dev 定性）+ M4-5 D4（壳层留端 Phase 5 同窗）。

## 1. 勘察实证

### 1.1 壳层 12 件三方仲裁

| 级别 | 件 | 备注 |
| -- | -- | ---- |
| L0 三端全同 | LanguageSwitcher / Login / NotFound | 纯机械 |
| L1 纯路径差（4~11d） | AIAssistant(4)/BottomNav(10)/CommandPalette(9)/ConnectionStatus(4)/ErrorBoundary(4)/OfflineIndicator(4)/Sidebar(7)/TopBar(11) | import 深度差 |
| L1 含 1 处行为差 | Layout(22d) | **P1 首页沉浸式时钟环**（`pathname === "/"` 无 padding——主文档 v1.2 记录）vs P3/P4 仅 ai-family；取 P1 版为基线（功能最全） |
| P2 | 全 12 件均有但大异构（Layout 74d/TopBar 253d） | **P2 壳层留端**（沙箱独立壳层演进） |

### 1.2 壳层依赖闭包

- **IntegratedTerminal 544L**（Layout 唯一跨域障碍件）：依赖全通（@yyc3/ide/hooks/use-terminal + core×3 + view-context 桥）；P1 独走（P3/P4 旧版）→ P1 版随包，端侧 dev/ 留壳
- **壳层 hooks 3 件三端 L0**：useMobileView/useKeyboardShortcuts/useOfflineMode——壳层外消费各 6~7 处 → **入 `@yyc3/core`**（通用 hook 语义，useClock 先例）
- **NavRegistry 落点**：Sidebar 导出 `navItems`/`NAV_CATEGORIES`（TopBar 消费）→ 随 shell 包化**自然单源化**（包内 nav 数据唯一定义）

### 1.3 智慧酒店 L1 融合结案实证

HotelDashboard 三端 md5 **已全同**（M4-6 MEMBERS_MAP 破环 + 三端统一切包时实质收敛）——M4-2b D4 登记的「双版本 L1 视觉融合（density="compact"）」工程面已达成，**结案**（视觉走查归 69 截图对照专项）。

### 1.4 ops 暂缓件二包面（障碍复核全通）

| 件 | 三端 | P1-P3 diff | 障碍复核 |
| -- | ---- | ---- | ---- |
| LocalFileManager 294L | P3=P4 同 | 4d | 已通（view-context 桥） |
| HostFileManager 666L | P3=P4 同 | 6d | 已通 |
| DatabaseConnectionPanel 661L | P3=P4 同 | 8d | 已通 |
| ServiceConnectionTest 1272L | P3=P4 同 | 8d | 已通（M4-5 复核） |
| ConfigExportCenter 447L | P3=P4 同 | 4d | full-backup 三端 L0 随包即通 |
| DatabaseManager 986L | **P3≠P4** | 667d | P1 独走新版为基线随包（P3/P4 旧版弃，FamilyCommCenter/FamilyPhone 同模式） |
| ConnectionMonitorPanel 355L | P3=P4 同 | 15d | **仍引 src/database 引擎层 → 留端**（引擎层包化专项） |
| full-backup 190L | 三端 L0 | 0 | 随 ops 入包 |

### 1.5 dev 域定性（不执行）

9 件消费面全为 routes 级 lazy；ArchitectureAudit/RefactoringReport P1=P3 同，CLITerminal/DevGuidePage/IntegratedTerminal（本批随 shell 入包后 dev/ 不再含）/ThemeCustomizer 异构——**定性：dev 域为端侧开发者文档/工具页，与壳层路由强绑定，留端终态**（IntegratedTerminal 随 shell 走后 dev/ 剩 8 件纯 routes 级）。

## 2. 方案

| 批 | 内容 |
| -- | ---- |
| Z1 hooks 入 core | 壳层 hooks 3 件三端 L0 git mv 入 core（exports +3）+ 三端消费方切引 |
| Z2 建包 @yyc3/shell | 壳层 12 件 + IntegratedTerminal（13 件）git mv + 包内路径修正（`../../types` 具名分流 core/types、`../dev/IntegratedTerminal` 同包、hooks 切 core）+ exports 显式（Layout/Sidebar/nav 单源） |
| Z3 三端切换 | P1 routes/App/Layout 互引 + barrel；P3/P4 routes + 删副本 26 件；P2 零触碰（壳层留端） |
| W4 ops 二包 | 6 件 + DatabaseManager（P1 基线）+ full-backup → `@yyc3/ops` 扩容（exports +7）+ 三端切引 + P3/P4 删副本；ConnectionMonitorPanel 留端 |
| Z5 验证收官 | 十二包 tsc + 四端零基线 + build + vitest + 文档 + 提交 |

## 3. 决策表

| # | 决策 | 依据 |
| -- | ---- | ---- |
| D1 | 壳层包名 `@yyc3/shell`（独立包非 business 域） | 壳层横切语义（Layout 族 + 导航单源），与 business/ui/core 正交 |
| D2 | Layout 取 P1 版基线（首页沉浸式时钟环保留） | P1/P4 功能最全双源先例 + 主文档 v1.2 记录的 P1 特性 |
| D3 | 壳 hooks 入 core 非随包 | 三端 L0 + 壳层外消费 6~7 处/件（通用 hook，useClock 先例） |
| D4 | P2 壳层全留端 | 大异构（74~253d）沙箱独立演进；P2 引 @yyc3/core 不引 shell |
| D5 | IntegratedTerminal 随 shell（P1 版） | Layout 组合依赖闭环；P3/P4 旧版弃（IDE 域 @yyc3/ide 已承载新终端体系） |
| D6 | DatabaseManager P1 独走基线随包 | 986L 新版 vs P3/P4 旧版（667d）；P3/P4 随包升级（L1 取全先例） |
| D7 | ConnectionMonitorPanel 留端 + full-backup 随 ops | src/database 引擎层依赖未解；full-backup 三端 L0 唯一消费方在 ops |
| D8 | dev 域 8 件留端终态 | routes 级消费 + 端侧文档/工具页语义 |
| D9 | 智慧酒店 L1 结案 | 三端 md5 全同实证（M4-6 实质达成） |

## 4. 实施实测回填（2026-10-10）

### 4.1 结果总览

| 批 | 结果 |
| -- | ---- |
| Z1 壳 hooks | useMobileView/useKeyboardShortcuts 三端 L0 入 core（exports 46→48 条；**core peer 首扩 react-router/sonner**；RegisteredShortcut/CommandCategory 补录 types 1608L）；**useOfflineMode 改判 `@yyc3/store`**（引 offline-slice 触发 core→store 循环警报——偏差 #11 useWebSocketData 同族防复发，store exports +1）；三端消费方切引 |
| Z2 建包 | **`@yyc3/shell` 13 件**（壳层 12 + IntegratedTerminal 544L P1 版）+ exports **14 条显式**；**NavRegistry 单源达成**（Sidebar `export NAV_CATEGORIES` + navItems 双导出，barrel 统一出）；dep 5 包（core/ide/store/ui/**admin**——Layout 引 PWAInstallPrompt 实扫补）；包内 `../../types`→core/types 具名分流；**shell tsc=0** |
| Z3 三端切换 | 34+38+38 文件两段法（零 UNKNOWN）+ 补刀 3 处（P1 dev/routes `../shared/ErrorBoundary` 无 modules 段 / dev barrel 单引号 `'./IntegratedTerminal'`——偏差 #22 同族再现 / P1 admin 域 `../ops/X` 跨域形态）；P3/P4 删壳层副本 26 件；**P1 modules/shared 目录整域清空**；三端 tsc 全 0 |
| W4 ops 二包 | 6 件 L1（4~8d 纯路径差）+ **DatabaseManager 986L P1 独走基线随包**（P3/P4 旧版弃，667d）+ full-backup 190L 三端 L0 → `@yyc3/ops` 终态 **19 组件 + 6 hooks + 1 lib**（exports 17→24 条）；**ops dep +admin/+ide**（DatabaseManager 引 inline-editable-table/code-editor 实扫）；ConnectionMonitorPanel（src/database 引擎层）留端独守 P1 modules/ops barrel v2.0.0；三端切引 12+10+10 + admin 留端件同目录 `./X` 形态补刀 4 处 |
| Z5 验证 | **十二包 tsc=0**（+shell）；**四端 tsc=0 / build 全绿**（849/748/774ms + P2）——连续第三轮全零全绿；P1 抽测 116/116 绿（Layout 17 修复 IntegratedTerminal 失效 vi.mock + TopBar/Sidebar/ErrorBoundary/DatabaseManager/LocalFileManager 等）+ Layout.test 失效 mock 尾刀 1 处；**vi.mock STALE=0 复测归零**；P2 vitest 1808 通过 / 57 失败**全存量实证**（P2 本批零改动 git diff=0 + HEAD 干净树同跑 4 新现文件 5 失败逐字一致） |

### 4.2 偏差登记（#27）

| # | 事项 | 处置 |
| -- | ---- | ---- |
| 27 | **P2 vitest 失败文件数 52→57 表观回归**：Sidebar/SystemSettings/ThemeCustomizer/YYC3Logo 4 文件 5 例新现 | **存量实证非回归**：本批 P2 零改动（git diff=0）+ HEAD 干净树同跑 4 文件 5 失败逐字一致（全量跑时的测试顺序/并发差异致此前计数掩盖）；教训：**vitest 失败文件集对比需固定文件级运行而非全量跑差异推断** |

### 4.3 终态

- **@yyc3/shell**：13 件 / exports 14 条 / dep 5——第十二包达成；**NavRegistry 单源**（NAV_CATEGORIES/navItems 包内唯一定义）
- **@yyc3/ops**：19 组件 + 6 hooks + full-backup / exports 24 条——ops 域终态（唯 ConnectionMonitorPanel 留端引擎层专项）
- **@yyc3/core**：34 件 + 2 hooks（exports 48 条，types 1608L）；**@yyc3/store**：+useOfflineMode
- **端侧终态**：P1 modules 剩 6 域（admin/ai-family/business/dev/monitor/ops）且 ops 仅 2 件；P3/P4 components 平铺层仅剩域归属未定件；P2 独立壳层留端（@yyc3/core + ai-family + ide 引用格局）
- **智慧酒店 L1 融合**：三端 md5 全同实证（M4-6 实质达成）——**结案**
- **dev 域定性**：8 件（IntegratedTerminal 随 shell 走后）留端终态（routes 级消费 + 端侧文档/工具页语义）
- **十二包 / 四端 tsc=0 / build 全绿连续第三轮**——Phase 5 工程面主体达成
