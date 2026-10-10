---
file: 01-P2沙箱端core对接方案.md
description: Phase 3 后续登记兑现 — P2 app-sandbox-lite 沙箱端 @yyc3/core 对接（17 件逐件仲裁，11 件切包 / 1 件真异构保留 / 5 件 core 未收不动）
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.1.0
created: 2026-10-10
updated: 2026-10-10（v1.1：⑤ 实测回填——10 件切包/supabaseClient 二次仲裁翻转留端/79 文件/197 测试全绿/7 错基线逐字同/偏差 #8-#11）
status: active
tags: [phase3],[core-package],[p2-sandbox],[l0-arbitration],[legacy-clear]
category: plan
---

# 📋 P2 沙箱端 @yyc3/core 对接方案（M3-P2）

> 上游依据：[`YYC3-Phase3-执行日志.md`](../YYC3-Phase3-执行日志.md)「后续登记」第 5 条——**P2 lib 对接：17 件异构轻量版逐件比对，达 L0 后切换**。
> Phase 3 首轮 P1/P3/P4 三端切换零回归，P2 以「异构轻量版、内部 ./ 互引密集」隔离（M3-0 决策）；本批兑现第四端对接。

## 1. 勘察仲裁（2026-10-10，md5 + diff + 导出 API 面）

### 1.1 同名 12 件（P2 `lib/` ↔ `packages/core/src/`，md5 全异）

| #   | 件名　　　　　　　 | P2/core 行数 | 导出 API 面对比　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| 判定　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| -----| --------------------| --------------| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| -------------------------------------------------------------------------------------|
| 1   | view-context　　　 | 27/24　　　　| 相同（仅注释头、`import React` 形态、`../types`→`./types` 路径差）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | ✅ L0 切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 2   | figma-error-filter | 97/90　　　　| 相同（差异全在注释头）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | ✅ L0 切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 3   | ollama-url　　　　 | 105/99　　　 | 相同（注释头 + 一处花括号风格）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| ✅ L0 切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 4   | db-queries　　　　 | 332/326　　　| 导出集相同（8 async query + 12 本地 CRUD/导入导出）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| ✅ L0 切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 5   | yyc3-storage　　　 | 395/543　　　| 15 导出名全同；core 为超集（类型/封装扩充）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| ✅ 超集切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 6   | **supabaseClient** | 160/173　　　| 静态 API 面相同，但**运行时凭据契约冲突**：P2 固定 `admin123/dev123`（沙箱开箱登录）；core 改 env 驱动（`VITE_MOCK_ADMIN_PASSWORD`，未配置时空串）——vitest 实证 7 例 auth 全挂　 | ❌ **二次仲裁翻转：保留 P2 lib**（静态超集误判，行为契约 vitest 实证翻转，偏差 #11） |
| 7   | env-config　　　　 | 225/262　　　| P2 六符号 core 全有 + core 多 `onEnvConfigChange`　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| ✅ 超集切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 8   | api-config　　　　 | 137/375　　　| P2 五符号 core 全有 + core 多 setAPIConfigWithValidation/validateConfigUpdates 等　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| ✅ 超集切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 9   | error-handler　　　| 362/486　　　| P2 12 符号 core 全有 + core 多 detectErrorCode/formatErrorForUser/captureValidationError 等 6 符号　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | ✅ 超集切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 10  | create-local-store | 148/377　　　| P2 两符号（createLocalStore/LocalStore）core 全有 + core 多 CacheStats/StoreOptions/Transaction　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| ✅ 超集切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 11  | broadcast-channel　| 66/195　　　 | P2 四函数 core 全有 + core 多统一同步族（broadcastSyncMessage/onUnifiedSync 等）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | ✅ 超集切　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 12  | **GitService**　　 | 287/746　　　| **真异构**：P2 用 `GitServiceOptions`/`GitActionResult`/`GitFileStatus`；core 用 `GitServiceConfig`/`GitStatus` + default export + createGitService，配置/结果类型名与结构均不同 | ❌ **保留 P2 lib**　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |

### 1.2 core 未收 5 件（本批不动，留待后续域包化）

`yyc3-icons`、`local-knowledge-base`、`authContext`、`network-utils`、`backgroundSync`——三端 P1/P3/P4 亦有同名件，但均不在 @yyc3/core 现有 exports 契约内，本批不扩包（避免夹带新规划）。

### 1.3 依赖面实证（决定整组切换的关键）

- core 12 件**零外部运行时依赖**（supabaseClient 为纯 Mock，不 import @supabase/supabase-js；全包仅包根 deps 有 supabase-js/zod，本批 12 件均不触碰）→ P2 无需新增运行时依赖，仅加 workspace 包链接。
- 包内互引闭包：`ollama-url→env-config→api-config→{broadcast-channel, error-handler→{yyc3-storage→broadcast-channel, figma-error-filter}}`；`db-queries→supabaseClient`；`view-context`、`create-local-store` 独立。
- **有状态单例纪律**：env/api/error/yyc3-storage/broadcast 均为模块级有状态单例（配置中心/错误日志/IDB 元数据/频道注册表），**必须整组切**，禁止只切部分件导致「core 一份 + P2 lib 一份」双状态分裂。故 10 件一批全切。
- **supabaseClient 双单例豁免实证**：回退保留后，core db-queries 内部引 core 版（仅数据查询 `_mockQuery`，不读 auth/session），P2 登录流引端侧版；两单例 `SESSION_KEY` 同为 `yyc3_session`（localStorage 共享），db-queries.test 实证无 auth 耦合——双实例无状态分裂后果。
- 类型来源：core 11 件引 `./types`（core/types.ts 1458L），P2 业务代码引本地 `types/index.ts`（**单文件**，非 P1 的 28 分件 barrel）。结构化类型系统下字段同构即兼容；潜在不兼容点由 P2 tsc 7 错基线对账实证暴露、定点处置。

## 2. 互引面与盲区

- 引用形态三型：静态 `from ("|')(\./|\.\./|\.\./\.\./)lib/X`、动态 `import("…/lib/X")`、`vi.mock("…/lib/X")`。
- 消费规模：静态 79 处（App.tsx/components/hooks/stores + **tests**）+ 动态/vi.mock 30 处（types/rf-phase2/rf001/rf002/rf003/env-config/api-config 等测试）。
- **盲区 1（不切）**：[`components/ide/ide-mock-data.ts`](../../../apps/app-sandbox-lite/components/ide/ide-mock-data.ts) L136 模板字符串内的 IDE 演示数据 `"../lib/create-local-store"` 是**字符串数据非真实引用**，显式排除（M4-4 偏差 #18 同族：引号紧贴即命中，需人工列排除）。
- **盲区 2（不切）**：GitService 全部引用（[`components/ide/GitPanel.tsx`](../../../apps/app-sandbox-lite/components/ide/GitPanel.tsx) `../../lib/GitService`），源件保留。
- P2 消费侧适配点（预判 1 处）：[`App.tsx`](../../../apps/app-sandbox-lite/App.tsx) L138-139 `ghostSignIn().user.email` 需 null 守卫（core 版 PROD 未开 ghost 返回 null）。

## 3. 决策表

| # | 决策 | 理由 |
| -- | ---- | ---- |
| D1 | 切 10 件 / 保留 GitService + supabaseClient 2 件 / 5 件未收件不动 | md5+API 面+vitest 三层实证；GitService 类型契约真异构；supabaseClient 凭据契约冲突（偏差 #11） |
| D2 | 10 件整组一批切；supabaseClient 端侧留 | 有状态单例闭包不可拆（1.3）；双 supabaseClient 单例豁免见 1.3 |
| D3 | 不扩 core 包收件（5 未收件不动） | 最小补丁闭环，扩包属新规划另批仲裁 |
| D4 | P2 `types/index.ts` 保留不并轨，仅定点补 `isSimulated` 字段 | types 单源收敛是跨阶段项（M4 持续），本批只做引用切换，兼容性 tsc 实证 |
| D5 | 基线护栏 = P2 tsc 7 错逐字同（AIFamilyCenterPage×6 + routes.ts×1） | Phase 3 首轮基线，新错必须逐一定性修复或回退，不许带新增错收官 |
| D6 | 删 P2 lib 10 件源文件 | 切换后无残留引用即 git rm（lib 终态 7 件 = 2 异构保留 + 5 未收件） |
| D7 | env-config/yyc3-storage/api-config 默认值差异按 L1「取功能最全基线」接受 core 契约（3.4.1/24 stores/timeout 校验），P2 测试断言对齐 | 统一方向；P2 局域网/品牌特化可由 .env.local 与 UI 设置覆盖 |

## 4. 切引映射（10 条，lib 相对路径 → core 显式 exports）

| P2 `lib/X` | → 包路径 |
| ---------- | -------- |
| view-context | `@yyc3/core/view-context` |
| figma-error-filter | `@yyc3/core/figma-error-filter` |
| ollama-url | `@yyc3/core/ollama-url` |
| env-config | `@yyc3/core/env-config` |
| api-config | `@yyc3/core/api-config` |
| broadcast-channel | `@yyc3/core/broadcast-channel` |
| error-handler | `@yyc3/core/error-handler` |
| yyc3-storage | `@yyc3/core/yyc3-storage` |
| create-local-store | `@yyc3/core/create-local-store` |
| db-queries | `@yyc3/core/db-queries` |

> supabaseClient 初批曾切后回退（偏差 #11），不计入映射。

perl 正则（遵守偏差 #17 铁律：替换串 `$1…$3` 直拼不加工、`@` 写 `\@`）：

```perl
s{([\x27"])(?:\.\./)+lib/(件名交替)}{$1\@yyc3/core/$2}g;
s{([\x27"])\./lib/(件名交替)}{$1\@yyc3/core/$2}g;
```

## 5. 执行批次

| 批 | 动作 | 验收 |
| -- | ---- | ---- |
| A | P2 package.json 加 `"@yyc3/core": "workspace:*"`；`pnpm install --no-frozen-lockfile`；验证 node_modules 链接 | 链接存在（M3 偏差 #3：禁 silent reporter） |
| B | grep -rl 列命中文件（排除 ide-mock-data.ts）→ perl 批量切 11 件三型引用 → App.tsx null 守卫 → git rm lib 11 件 | grep 残留旧引用 = 0（盲区两件除外） |
| C | 验证矩阵（第 6 节）；本方案 ⑤ 实测回填；Phase3 日志追加第二轮段；主文档同步；git 提交 | 基线逐字同 + 全绿 |

## 6. 验证矩阵与回滚

- `packages/core` tsc=0（共享面复验）
- P2 `tsc --noEmit` = **7 错且逐字同基线**（AIFamilyCenterPage.tsx×6 + routes.ts×1）；任何新错逐一定点（优先 P2 消费侧适配，不改 core 源码）
- P1/P3/P4 无扰（本批仅动 P2 + lockfile；P1=67 / P3=0 / P4=0 抽查）
- 受影响专测抽跑：`__tests__/{db-queries,error-handler,env-config,api-config,yyc3-storage,create-local-store,supabaseClient,figma-error-filter}.test.*` 与 rf001/rf002/rf003
- 回滚：纯引用切换 + 源件删除，`git revert` 单提交即可整体回退。

## ⑤ 执行实测回填（2026-10-10）

### 5.1 结果总览

| 项 | 结果 |
| -- | ---- |
| 切换规模 | 79 文件 10 件 × 三型引用（静态 from / 动态 import / vi.mock），perl 脚本一次成型零异常 |
| 源件删除 | git rm lib 10 件；lib 终态 **7 件**（GitService + supabaseClient 异构保留；authContext/backgroundSync/local-knowledge-base/network-utils/yyc3-icons 未收件） |
| 盲区处置 | ide-mock-data.ts L136 模板字符串（IDE 演示数据）排除；TESTING-GUIDE 文档示例/rf-phase2 反向断言随包路径同步（守卫语义保持） |
| P2 工程配置 | package.json + `@yyc3/core: workspace:*`（零新增运行时传递依赖）；tsconfig paths 钉 react/react-dom 类型至端侧 18（偏差 #8） |
| **tsc 对账** | P2 = **7 错逐字同基线**（AIFamilyCenterPage×6 + routes.ts×1）；core=0 / P1=67 基线 / P3=0 / P4=0 |
| **vitest** | 受影响 11 专测（含 rf001/002/003）**197 例全绿**；另 6 消费/集成件 158 绿，Layout.test 15 失败经 HEAD stash 同跑实证为**存量**（jsdom location.hash，逐字同） |
| vite build | 阻断于存量断点 routes.ts→`./components/ai-family/AIFamilyRouter`（与基线 TS2307 同源）；@yyc3/core 包引用零解析错误（vitest vite 管线已先行实证） |

### 5.2 偏差记录（续 Phase3 日志编号）

| # | 偏差 | 处置/教训 |
| -- | ---- | --------- |
| 8 | **React 类型双版本**：core 源码以 @types/react@19.3 实例化 Context，P2 为 18.3.18 → TS2345/TS2786 共 33 错 | P2 tsconfig `paths` 把 react/jsx-runtime/react-dom 钉至端侧 @types 18（vite.config 无 tsconfig-paths 插件 → 运行时零影响；core 自身 tsc 不受 P2 tsconfig 影响仍 0 错）；TS5.7 弃用 baseUrl——paths 无 baseUrl 相对 tsconfig 目录即生效。教训：**workspace 源码包被异版本 React 端消费时，消费端 tsconfig paths 钉类型是零运行时风险的隔离手法** |
| 9 | **WebSocketDataState 契约缺字段**：P2 types 无 `isSimulated`（core 必填）→ TS2741 | P2 types 补字段 + useWebSocketData 派生 `connectionState === "simulated"` + 2 处测试 mock 补值。教训：Context 载体类型跨端须按 core/types 必填项对齐 |
| 10 | perl one-liner 在 shell 双引号嵌套中 `Substitution replacement not terminated`（M3 #2 / M4-4 #17 同族） | 改 perl 脚本文件（`s{}{}` + `\@` 转义），xargs -0 喂文件清单，一次成型 |
| 11 | **supabaseClient 静态超集误判 → 运行时翻转**：md5/API 面判为超集已切，vitest 实证 7 例 auth 全挂——core 凭据 env 驱动且默认空串，P2 固定 admin123/dev123 沙箱开箱登录被阻断 | 二次仲裁翻转为 L1 反向特化，源件恢复、11 处引用回切（4 源码 + 6 测试 + 1 文档示例），ghostSignIn null 守卫同步回退。教训：**md5 + 导出 API 面只能证明「形」，Mock 凭据/默认配置/校验阈值等行为契约必须 vitest 实证——静态超集不等于行为兼容** |

### 5.3 测试断言对齐（D7，L1 取全）

- env-config 6 例：SYSTEM_NAME→`YYC³ Cloud Intelli-Matrix`、VERSION→`3.4.1`、API_BASE_URL→`http://localhost:3113/api`、DEFAULT_AI_MODEL→`codegeex4:latest`、reset 同步；ENABLE_DEBUG 改 env 优先期望式（P2 `.env.local` 实设 true，core 行为正确，原断言与本地 env 耦合）
- yyc3-storage 3 例：store 数 14→24（14 运维/监控 + 10 AI family/推理/音乐/通讯主基线全集，空 store 对沙箱无害）
- api-config 1 例：监听器用例 timeout 999→15000（core 新增校验器拒绝 <1000ms）

### 5.4 终态与后续

- P2 由「core 零引用隔离」转为 **10 件接 @yyc3/core + 2 件行为异构留端**；Phase 3 后续登记第 5 条「P2 lib 对接」主体兑现。
- 后续登记更新：①GitService/supabaseClient 两异构件长期留端（如未来 core 提供「凭据可注入」Mock 工厂，supabaseClient 可再评估）；②5 未收件随 M4-5/M4-6 域包化处理；③P2 两条存量断裂（tsc 7 错：ai-family 缺件路由 + AIFamilyCenterPage）不属本批，维持登记；④types 单源收敛仍为跨阶段项。
