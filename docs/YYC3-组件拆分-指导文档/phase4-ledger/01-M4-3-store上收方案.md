---
file: 01-M4-3-store上收方案.md
description: Phase 4 M4-3 zustand store 上收方案（勘察实证 + 决策定型 + 实施清单）
author: AI Tutor <GLM-4.7>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [store],[zustand],[package-extraction],[m4-3]
category: plan
---

# 📦 M4-3 zustand store 上收方案

## 一、勘察实证（2026-10-10）

### 1.1 三端 store 结构

| 端 | slices 数 | 结构特征 |
| --- | --- | --- |
| P1 app-web-full | 17 平铺 + 13 family（在 `modules/ai-family/store/`） | family 独立 barrel |
| P3 app-desktop | 30 全平铺（`store/slices/`） | family 混入 |
| P4 app-web-classic | 30 全平铺（`store/slices/`） | 同 P3 |

### 1.2 30 件 md5 仲裁

- **17 件共有**：16 L0 三端逐字节同；仅 `ide-settings-slice` L1（diff 仅 2 行 import 路径：P1 引 `modules/dev/ide/ide-types`，P34 引 `components/ide/ide-types`，两类型源文件 md5 全同）
- **13 件 family-\***：11 L0；`family-member-slice`/`family-message-slice` 2 件 diff 各 4 行（仅 `../types` vs `../../types` 深度差）
- **结论：30 件逻辑内容三端 100% 同源，全量可 L0 机械迁移**（远优于 193 件总体的 126 件 L1 分布）

### 1.3 单根范式评估

- 每 slice 独立 `create<T>()(persist(devtools(immer(...))))` 模块级单例，**无单根组合 store**
- `store/index.ts` 仅为 barrel + `useUnifiedStore` 组合 hook
- **主 barrel 消费面：P3/P4 零引用、P1 仅 ai-family/index.ts 引自身 `./store`** —— barrel 近乎死代码面
- **决策：不做单根合并**。独立 create 范式迁移零语义风险；单根合并改动巨大且无消费收益

### 1.4 依赖面测绘（17 件共有）

| 依赖 | 处数 | 处置 |
| --- | --- | --- |
| zustand / middleware / immer | 17+16+2 | @yyc3/store peer |
| app types（19 类型名） | 13 处 | 18 类型按需复制入 `@yyc3/core/types`（NodeData 已在） |
| @yyc3/core/\*（migrate-storage 7、env-config 2、api-config、data-bus、error-handler、ollama-url） | 12 处 | 已通 ✅ |
| ide-types + ide-layout-types（227L） | 1 件 | ide-settings-slice 暂缓，随 M4-7 `@yyc3/ide` |
| config/variable-center（869L） | settings-ssot 引 5 具名（功能性） | 先上收 `@yyc3/core` |
| lib/connection-test-engine（522L） | provider 引 2 具名（功能性） | 先上收 `@yyc3/core` |
| sonner | ai-suggestion 引 toast | @yyc3/store peer |

family 13 件依赖：zustand + ai-family types + lucide-react（1 处图标）→ 留 M4-6。

### 1.5 两 lib 上收可行性（L0 实证）

- `connection-test-engine.ts`(522L)：**零 import 自包含**，三端 md5 同 → 无摩擦入 core
- `variable-center.ts`(869L)：仅 1 import `@yyc3/core/api-config`（已在 core），三端 md5 同 → 无摩擦入 core

### 1.6 19 类型分布（core/types 补录清单）

| 分件 | 类型 |
| --- | --- |
| dashboard-types.ts | ModelPerfEntry, UserRecord, ModelDistEntry, RadarEntry, StoredLogEntry, DeployedModel, WifiNetwork, WifiAutoReconnectSettings, FollowUpRecord（9） |
| filesystem-types.ts | FileItem, LogLevel, RecentFile（3） |
| ai-analysis-types.ts | DetectedPattern, AIRecommendation（2） |
| sdk-types.ts | ChatSession, SDKUsageStats（2） |
| websocket-types.ts | AlertData（1） |
| database-types.ts | DBConnection（1） |
| node-types.ts | NodeData（1，已在 core） |

## 二、决策定型

| # | 决策 | 理由 |
| --- | --- | --- |
| D1 | 新建独立 `@yyc3/store` 包，**不并入 core** | zustand/immer/sonner 依赖面与 core「逻辑核心」定位不符 |
| D2 | **16 件上收**（ide-settings-slice 暂缓） | ide-types 拽 M4-7 `@yyc3/ide`，斩断域类型拖拽链 |
| D3 | family 13 件不动 | 归属 M4-6 `@yyc3/ai-family` |
| D4 | connection-test-engine + variable-center 上收 `@yyc3/core` | L0 自包含、store 拖拽链之根、组件/hooks 直引的跨域共享件 |
| D5 | 18 类型按需复制 core/types.ts | Phase 3「按需类型声明」范式沿用；重复定义留给「types 单源收敛」阶段清理 |
| D6 | 不做单根合并 | 独立 create 为模块级单例已满足；barrel 零消费证明统一入口是名义需求 |

## 三、实施清单

### A. 前置上收 @yyc3/core

1. `connection-test-engine.ts` git mv P1 → `packages/core/src/`（零改动）
2. `variable-center.ts` git mv P1 → `packages/core/src/`（零改动）
3. `packages/core/package.json` exports + `./connection-test-engine`、`./variable-center` 两条
4. `packages/core/src/types.ts` 追加 18 类型
5. 三端删除原 `lib/connection-test-engine.ts`、`config/variable-center.ts` + 引用切换（engine：P1 5 处 / P3、P4 类似；variable-center：P1 5 处）

### B. 新建 @yyc3/store

1. `packages/store/{package.json,tsconfig.json}`：internal package 源码直出、exports **16 条显式逐条**（Phase 3 教训：通配不解析）
2. 16 件 slices git mv P1 → `packages/store/src/`；内部 import 改：
   - `../../types` → `@yyc3/core/types`
   - `../../lib/connection-test-engine` → `@yyc3/core/connection-test-engine`
   - `../../config/variable-center` → `@yyc3/core/variable-center`
3. `src/index.ts` barrel：16 件 hooks + 类型 re-export
4. deps：peer `zustand ^5 / immer ^11 / sonner ^2`；dep `@yyc3/core workspace:*`；devDeps 三者 + `@types/react`

### C. 三端切换

1. 三端 package.json + `"@yyc3/store": "workspace:*"`
2. P1 引用切换 16 处、P3/P4 各 14 处（`store/slices/件名` → `@yyc3/store/件名`）
3. 三端删除已上收 16 件 slices（P3/P4 各留 14 件：ide-settings + 13 family；P1 留 1 + 13）
4. 三端 `store/index.ts` 更新：ide-settings 本地导出 + 16 件从 `@yyc3/store` re-export + family 引用不变

### D. 验证

- core/store tsc 双 0 错
- P1 tsc=67 基线精确持平、P3=0、P4=0、P2 build=7 错逐字同
- 三端 build 绿
- 测试文件 import 已切（tsc 覆盖）

### E. 文档 + 提交

- 本方案文档 + Phase4 执行日志 M4-3 段 + 主文档进度标记
- 纯本地 git commit

## 四、风险登记

| 风险 | 缓解 |
| --- | --- |
| exports 通配不解析（Phase 3 教训） | 16 条显式逐条 |
| frozen-lockfile 静默失败（Phase 3 教训） | install 后验证 `node_modules/@yyc3/store` 链接 |
| sonner 实装版本 1.7.4 与 2.0.8 双版本并存 | peer 声明 `^1.7 || ^2` 兜底 |
| useUnifiedStore 组合 hook 在 P1 barrel 内引用已上收 hooks | barrel re-export 保持符号不变 |
