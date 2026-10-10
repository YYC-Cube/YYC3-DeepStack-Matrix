---
file: 02-M4-2b-business域包化方案.md
description: YYC³ Phase 4 M4-2b business 域包化方案（hotel-engines 束 + comm-station + usePersistedState 上收 core）
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase4],[business],[domain-package],[survey]
category: plan
---

# 📦 M4-2b：business 域包化方案（phase4-ledger/02）

> 衔接：[00-Phase4-任务规划与节点目标](./00-Phase4-任务规划与节点目标.md) · [01-M4-3-store上收方案](./01-M4-3-store上收方案.md)
> 前置状态：M4-3 已达成——域 hooks 引 `@yyc3/store`，五域包化硬前置解除。

## 一、勘察实证（2026-10-10）

### 1.1 business 域三端形态

| 端 | 位置 | 形态 |
| -- | ---- | ---- |
| P1 (app-web-full) | `src/app/modules/business/` | 2 组件（HotelDashboard 885L / CommStationPanel 249L）+ index.ts barrel |
| P3 (app-desktop) | `src/app/components/` | 平铺，无 barrel |
| P4 (app-web-classic) | `src/app/components/` | 平铺，无 barrel |
| P2 (app-sandbox-lite) | — | **零涉及**（无任何 business/hotel 件） |

### 1.2 同源性仲裁

| 件 | 三端 md5 | 行数 | diff 实质 | 仲裁 |
| -- | -------- | ---- | --------- | ---- |
| HotelDashboard | P3=P4 同 / P1 独走 | 885 × 3 | P1 vs P3 仅 7 条 import 相对路径差（`../../lib` vs `../lib`） | **L0 实质同源**（纯路径差） |
| CommStationPanel | P3=P4 同 / P1 独走 | 249 × 3 | 同上，仅 2 条路径差 | **L0 实质同源** |

### 1.3 hotel-engines 5 lib（三端 md5 全同 L0）

| lib | 行数 | 外部 import |
| --- | ---- | ----------- |
| ai-family-hotel-manager.ts | 1251 | 仅包内 `./ai-family-hotel.types` |
| ai-family-hotel.types.ts | — | **零 import（自包含）** |
| ai-learning-engine.ts | — | **零 import** |
| hotel-knowledge-base.ts | — | **零 import** |
| hotel-voice-service.ts | — | **零 import** |

### 1.4 usePersistedState（通用 hooks）

- `hooks/usePersistedState.ts` 112L，**三端 md5 全同**（`97b25b56...`）
- 导出 `usePersistedList`；消费面：6 域 hooks/端（useAIDiagnostics/useReportExporter/useAlertRules/usePatrol/useOperationCenter/useServiceLoop）+ CommStationPanel + 2 测试件/端

### 1.5 消费网测绘

```
HotelDashboard ──→ 5 hotel-engines lib ──→ (零外部依赖)
      │                ↑
      │                ├── FamilyHotel × 4 份（P1 modules/ai-family + P1 components/ai-family 旧世界 + P3 + P4）
      │                ├── zhipu-ai-service × 3 端（仅 type: FamilyMessage/HotelStaffMember ← hotel.types）
      │                └── vite-env.d.ts × 3 端（MessageContent interface augmentation）
      ├──→ GlassCard（已在 @yyc3/ui ✅）
      ├──→ usePersistedList（→ M4-2b 上收 @yyc3/core）
      └──→ MEMBERS_MAP + FamilyMember（ai-family shared.ts，运行时可变·store 回流改写）★唯一 ai-family 触点
           消费点仅 1 处：getFamilyForMember(role) → family?.icon（员工卡片图标展示）

CommStationPanel ──→ lucide-react / react / sonner / @yyc3/core/i18n / usePersistedList / GlassCard（全包级 ✅）
```

### 1.6 引用面（每端）

| 件 | 引用点 |
| -- | ------ |
| HotelDashboard | routes.tsx lazy import × 1 + HotelDashboard.test.tsx × 1（vi.mock 5 lib 路径 × 4） |
| CommStationPanel | routes.tsx lazy import × 1 + CommStationPanel.test.tsx × 1 + P1 barrel × 1 |
| 5 lib | HotelDashboard × 5 条 + FamilyHotel × 4 条 + zhipu-ai-service × 1 + vite-env × 1 + ai-family-hotel(-scenarios).test 动态 import（P1/P4）+ HotelDashboard.test vi.mock |
| usePersistedList | 6 hooks + CommStationPanel + usePersistedState.test + CommStationPanel.test 补引 |

## 二、决策（D1–D6）

| # | 决策 | 理由 |
| - | ---- | ---- |
| **D1** | usePersistedState 上收 `@yyc3/core`（`./use-persisted-state`） | 通用 hooks 先行上收（主文档修正记录原文）；三端 L0；core 已有 react peer（i18n 先例）；解除 ops/monitor 域 hooks 包化前置 |
| **D2** | 新建 `@yyc3/business`：`hotel-engines/`（5 lib）+ `comm-station-panel.tsx`；exports 显式 6 条 + 主 barrel | 5 lib 是「酒店业务引擎」被 business/ai-family 双域共享，归 business 后 ai-family→business 单向；internal 源码直出 + 显式 exports（Phase 3 教训） |
| **D3** | CommStationPanel 包内引 `@yyc3/core`（useI18n/usePersistedList）+ `@yyc3/ui`（GlassCard）；peer: react / lucide-react / sonner | 依赖全包级，无 app 相对引 |
| **D4** | **HotelDashboard 暂缓至 M4-6**（app 端保留、其 5 lib import 切 `@yyc3/business`） | MEMBERS_MAP 是唯一 ai-family 触点且运行时可变（store 回流改写），破环需与 ai-family shared.ts 拆分同窗；智慧酒店**双版本 L1 视觉融合样板**（HotelDashboard 卡片化 vs FamilyHotel 高密度沉淀 `density="compact"`）一并移交 M4-6。本批交付**工程工艺样板**（组件件 + lib 束 + 通用 hooks 三形态） |
| **D5** | vite-env.d.ts（×3 端）`declare module` 目标同步改包路径 | interface merging 依赖 import 处与 augmentation 处模块标识一致；zhipu-ai-service 切引 `@yyc3/business/hotel-engines/ai-family-hotel.types` 后，augmentation 用同一说明符即保持合并生效 |
| **D6** | P1 `modules/business/index.ts` 改为 re-export from `@yyc3/business`；routes.tsx（×3）lazy import 切包路径；P3/P4 不新增 barrel | 名义 barrel 保留入口一致性（M4-3 同工艺） |
| **D7** | **hotel-bridge.ts 随 HotelDashboard 暂缓 M4-6** | C 批执行中发现的第 6 件 lib（三端 md5 全同 L0），但引 app 内 types 的 `UnifiedFamilyMember/MemberPresenceStatus`——该类型体系定义在 ai-family types（P1: `modules/ai-family/types/`；P3/P4: `types/family-member.ts` 位置还不同），补录 core 会拖整棵 family 类型树且需先跨端仲裁。app 内件混合引（包路径 + 相对路径）合法，零风险；与 ai-family types 仲裁同窗裁断 |

## 二·补、执行实测（2026-10-10）

| 项 | 实测 |
| -- | ---- |
| A 批切引 | perl 递归 **43 文件**（6 hooks/端 + 测试件） |
| B 批建包 | `pnpm install --no-frozen-lockfile`（首跑遇 frozen-lockfile ERR_PNPM_OUTDATED_LOCKFILE——CI 环境变量致默认 true）→ business tsc **0 错** |
| C 批切引 | **23 文件**（HotelDashboard × 3、FamilyHotel × 4、zhipu × 3、vite-env × 3、routes × 3、测试件）+ 删源件 **14**（P3/P4 CommStationPanel + 5 lib × 2 端） |
| 偏差 #8 | **zhipu-ai-service 同目录引漏切**：勘察已见 `from "./ai-family-hotel.types"`，但切引 pattern 只覆盖 `\.\./lib/` 形态 → 三端 tsc +2 回归（P1=69/P3=P4=2，TS2307 + 连锁 TS7006）→ 补 pattern `(["'])\./ai-family-hotel\.types\1` 三端修复 |
| 验证矩阵 | core tsc 0 / business tsc 0 / **P1 tsc=67 基线精确持平** / P3=0 / P4=0 / build 三绿（789/811/768ms）/ P2 build=**7 错基线**（零涉及验证 ✅） |

## 三、实施清单

### A 批：core +use-persisted-state

1. `git mv` P1 `hooks/usePersistedState.ts` → `packages/core/src/use-persisted-state.ts`
2. `packages/core/package.json` exports + `"./use-persisted-state"`
3. 三端切引：6 hooks/端 + 2 测试件（usePersistedState.test + CommStationPanel.test 补引）

### B 批：@yyc3/business 建包

1. `packages/business/package.json`：`@yyc3/business`；exports：`.` / `./comm-station-panel` / `./hotel-engines/{ai-family-hotel-manager, ai-family-hotel.types, ai-learning-engine, hotel-knowledge-base, hotel-voice-service}`；peer: react/lucide-react/sonner；deps: `@yyc3/core` + `@yyc3/ui`（workspace:*）；devDeps 补 tsc 解析用全套
2. `tsconfig.json`：复用 core/store 模式
3. `git mv` P1 5 lib → `packages/business/src/hotel-engines/`；P1 CommStationPanel → `packages/business/src/comm-station-panel.tsx`
4. 包内改引：comm-station-panel 的 usePersistedList→`@yyc3/core/use-persisted-state`、GlassCard→`@yyc3/ui`
5. 主 barrel `src/index.ts`：re-export 6 条

### C 批：三端切换 + 删源件

1. 5 lib 切引（perl File::Find 递归，双引号 pattern 教训已纳入）：HotelDashboard × 3 端 + FamilyHotel × 4 份 + zhipu-ai-service × 3 端 + 测试件（vi.mock/动态 import）
2. vite-env.d.ts × 3 端：declare module 路径 → `@yyc3/business/hotel-engines/ai-family-hotel.types`
3. CommStationPanel 消费切引：routes.tsx × 3 + P1 barrel re-export + CommStationPanel.test × 3
4. 删源件：P1 modules/business/CommStationPanel.tsx + P3/P4 components/CommStationPanel.tsx + 5 lib × 3 端 + usePersistedState.ts × 3 端（A 批后）

### D 批：验证矩阵（零回归门禁）

| 检查 | 基线 |
| ---- | ---- |
| core tsc | 0 错 |
| business tsc | 0 错（新包） |
| P1 tsc | **67 错精确持平** |
| P3/P4 tsc | 0 错 |
| build P1/P3/P4 | 三绿 |
| P2 build | **7 错基线逐字同**（零涉及验证） |

### E 批：文档 + git

- Phase4 执行日志 v1.2.0（达成段 + 偏差登记 + 交接快照）
- 主文档 v1.10（Phase 4 进度段 + D4 修正说明）
- git 纯本地提交

## 四、风险登记

| 风险 | 缓解 |
| ---- | ---- |
| vi.mock 包路径在 vitest 的可解析性 | workspace 源码直出经 node resolution；若 mock 失效则测试件改用 `vi.mock` 的 factory 前置 alias——D 批验证矩阵兜底 |
| MessageContent interface merging 模块标识漂移 | D5 同说明符原则；tsc 矩阵验证 |
| zsh 终端 PATH 污染（偏差 #7 复发） | 每命令首行 export PATH；rm 触发钩子失败时改用 DeleteFile 工具 |
| 双引号引用漏杀（偏差 #5 复发） | 切引 pattern 必含 `["']`；File::Find 递归 + 三端 tsc 兜底 |

## 五、与登记队列的衔接

- **M4-2/3（ai + ops 域包化）前置解除**：6 域 hooks 的 usePersistedList 已入 core
- **M4-4（admin/monitor）**：同上
- **M4-6（@yyc3/ai-family）新增工作项**：① 智慧酒店双版本 L1 融合（density="compact"）② HotelDashboard 包化（MEMBERS_MAP 破环：shared.ts members 静态数据模块化）③ FamilyHotel 归 ai-family 包、引 `@yyc3/business` hotel-engines

---
**审核结论**: 待 D 批验证矩阵确认
