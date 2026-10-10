---
file: 00-Phase3-任务规划与节点目标.md
description: Phase 3 @yyc3/core 逻辑核心库 — 勘察实证与里程碑规划
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase3],[core-package],[planning]
category: plan
---

# 📋 Phase 3 任务规划 · @yyc3/core 逻辑核心库

> 规划总则：执行有规划，规划有节点，节点有目标，目标可评估

## 一、勘察实证（2026-10-10）

| # | 结论 | 证据 |
| - | ---- | ---- |
| 1 | **主文档 13 项 + 增收 7 件 = 20 件 lib 在 P1/P3/P4 三端 md5 全同（L0）** | data-bus 644L / crdt 157L / yyc3-storage 543L / create-local-store 377L / broadcast-channel 195L / cross-tab-sync 94L / db-queries 326L / supabaseClient 173L / supabaseClientReal 319L / error-handler 486L / figma-error-filter 90L / env-config 262L / validators 446L / config-validator 247L / ollama-url 99L / GitService 746L / migrate-storage 81L / music-storage 214L / api-config 375L / dmusic-resources（增收：api-config 系 env-config 依赖闭合所需、dmusic-resources 系 music-storage type 依赖、migrate-storage、config-validator） |
| 2 | **types/index.ts 为 207 行纯类型件（32 exports），三端待全同验证**，7 件 lib 以 `import type` 消费（NodeData/AppUser/AppSession/ErrorCategory/ModelProviderDef/APIEndpoints 等） | 全库消费面 P1=124 处 → 收编 + app 端 re-export shim 零改消费面 |
| 3 | **P2 lib 17 件全部异构**（轻量独立实现，活代码被 P2 业务/200+ 测试消费） | 本 Phase 不动 P2；其 i18n 三件套 + hooks/useI18n 上收登记后续 |
| 4 | **外部依赖极小**：`@supabase/supabase-js` ×1（多行 import）+ `zod` ×1（config-validator）；GitService 的 electron 为 `window.electronAPI?` 可选探测（web 安全） | 包 deps 声明两项即可 |
| 5 | **storageManager（722L 三端同构）依赖外溢**（app 级 `database/DatabaseAdapter`、`ConnectionManager`、`types/storage`） | 本 Phase 不收编，随 db-adapter 深化或 Phase 4 |
| 6 | 引用面：P1=90 行/29 文件、P3=90/28、P4=88/27（业务非测试，不含 lib 内部互引） | sed 批量重写 + 测试文件同步 |
| 7 | lib 件互依赖仅包内闭合 6 处（db-queries→supabaseClient、error-handler→figma-error-filter、ollama-url→env-config、yyc3-storage→broadcast-channel、api-config→broadcast-channel、env-config→api-config）+ music-storage→dmusic-resources(type) | git mv 后包内相对路径天然保持，零修改 |
| 8 | zustand 单根 store（主文档动作 3）与 i18n 运行时上收（动作 4）体量大（P1 ide 26 store） | 本 Phase 先完成 create-local-store 收编（即 P2 语义载体）；单根 store 与 i18n 登记后续会话 |

## 二、里程碑

| 阶段 | 名称 | 目标 | 交付物 | 状态 |
| ---- | ---- | ---- | ------ | ---- |
| M3-1 | core 包骨架 + 收编 | 21 件入包、包独立 tsc 0 错 | packages/core（20 lib + types.ts + barrel + db-adapter 最小注册表） | ⬜ |
| M3-2 | 四端切换 | P1/P3/P4 lib 引用改 @yyc3/core；types shim 兜住 124 处 | sed 重写 + 残留归零 | ⬜ |
| M3-3 | 验证 | build/type-check 矩阵零回归（P1=67、P2=7 基线持平；P1/P3/P4 build 三绿） | DoD 核验矩阵 | ⬜ |
| M3-4 | 文档 + 提交 | Phase3 执行日志 + 主文档进度 + git 提交 | 纯本地 commit | ⬜ |

## 三、关键决策

1. **文件名保持原名**（supabaseClient.ts/GitService.ts 驼峰不 kebab 化）——sed 重写规则最简、diff 最小；
2. **types 收编 + shim**：`types/index.ts` → `core/src/types.ts`，app 端原位 `export * from "@yyc3/core"` re-export——124 处消费零改动；
3. **P2 本 Phase 不动**：异构活代码，强切风险大；Adapter 注册表的 P2 语义吸收点（createLocalStore）已由 P1 版同构件承载；
4. **db-adapter 最小实现**：注册表 + 环境自动选择（`VITE_YYC3_ENABLE_MOCK` / `electronAPI` 检测）+ 默认注册 supabase mock/real——真接入四端冒烟留后续；
5. **exports 源码直出**同 Phase 2（internal package 免构建链）。

## 四、变更记录

| 日期 | 变更内容 | 原因 |
| ---- | -------- | ---- |
| 2026-10-10 | 初版 | Phase 2 完成后续接 |
