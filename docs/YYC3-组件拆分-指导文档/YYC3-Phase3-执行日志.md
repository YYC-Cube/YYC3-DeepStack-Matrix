---
file: YYC3-Phase3-执行日志.md
description: Phase 3 @yyc3/core 逻辑核心库 — 20 件收编 + db-adapter + 四端切换零回归（types B' 方案修订）
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase3],[core-package],[db-adapter],[l0-arbitration],[handoff]
category: report
---

# 📒 Phase 3 执行日志 · @yyc3/core 逻辑核心库

> 规划输入：[`phase3-ledger/00-Phase3-任务规划与节点目标.md`](./phase3-ledger/00-Phase3-任务规划与节点目标.md)

## 本会话达成（2026-10-10）

| 节点 | 状态 | 结果 |
| ---- | ---- | ---- |
| M3-0 勘察 | ✅ | 20 件 lib **L0 全同仲裁**（md5 三端字节级全同）→ 纯机械迁移；P2 异构轻量版隔离不动 |
| M3-1 core 骨架 | ✅ | `packages/core` 21 件（20 lib + db-adapter 注册表）+ 按需 types.ts；独立 tsc 0 错 |
| M3-2 四端切换 | ✅ | 三模式 perl 重写（主面 + lib 内互引 + 深层动态引用）；残留 grep 归零 |
| M3-3 验证矩阵 | ✅ | core tsc 0 错；P1=67 精确持平、P3=0、P4=0；build 三绿；P2=7 基线逐字同、零误伤 |
| M3-4 文档提交 | ✅ | 本日志 + 主文档 v1.7.0 + git 本地提交 |

## 关键动作明细

### M3-0 勘察定性

- **L0 全同仲裁**：20 件 lib（P1 `src/app/lib/`）对 P3/P4 副本 md5 对比**字节级全同** → git mv 一份 + git rm 两份（rename 历史保留）
- **P2 异构隔离**：P2 顶层 `lib/` 17 件为异构轻量活代码（内部 `./` 互引密集）→ 本 Phase 零触碰（终验零 `@yyc3/core` 引用实证）
- **依赖面闭合**：仅 `@supabase/supabase-js` + `zod`（config-validator 唯一使用方）；GitService electron 为**可选探测**（try-import，不硬依赖）
- **包内互依赖 6 处 + music-storage→dmusic-resources(type)** 全部随迁闭合；app 侧 lib 内互引实测 **3 文件 4 处**（inference-engine→ollama-url/env-config、family-ai-service→api-config、full-backup→yyc3-storage——规划时登记 2 处为漏计，见偏差 #6）

### M3-1 包骨架

- **internal package 源码直出**：exports **显式逐条**（`.` + `./types` + `./db-adapter` + 20 件子路径）——与 `@yyc3/theme` 已验证路线对齐（首版 `./*` 通配 fallback 在 bundler resolution 下 TS2307，见偏差 #3/#4）
- **db-adapter 最小注册表**（`src/db-adapter/index.ts`）：`registerBackend(kind, factory)` / `createBackend(kind?)` / `detectBackend()`（electronAPI→electron-ipc；`VITE_YYC3_ENABLE_MOCK`→mock；默认 supabase）——三态后端切换的 Phase 3 最小面
- **types 方案 B'**（偏差 #1 修订）：app 端 `types/`（28 分件 barrel）**留端为真源零改动**；core 建 `src/types.ts` 按需类型声明 23 个（覆盖 8 件 lib 全部 `import type` 需求），头部注明 Phase 4 随 types 体系单源收敛
- **barrel TS2308 命名空间隔离**（偏差 #7）：`crdt.MergeStrategy`（"lww"…）与 `data-bus.MergeStrategy`（"ws_priority"…）语义不同不可仲裁；`supabaseClient`（纯 mock）与 `supabaseClientReal`（运行时切换）双实现并存 → 4 件 `export * as` 隔离，其余 16 件 star-export；**子路径直引不受影响**

### M3-2 三模式重写（perl，BSD sed 无 lookahead 弃用）

| 模式 | 范围 | 规则 | 覆盖 |
| ---- | ---- | ---- | ---- |
| A 主面 | 三端全 src `.ts/.tsx` | `(?:\.\.?/)+lib/(20件名)(?=["'])` → `@yyc3/core/$1` | 业务 + 测试 ~130 处/端 |
| B lib 内互引 | 三端 `lib/*.ts` | `from ["']./(件名)["']` → `@yyc3/core/件名` | 4 处/端 |
| C 深层补杀 | 三端 `lib/` 树 | `["']\.\.?/(件名)["']` → `@yyc3/core/件名` | 动态 `import("./broadcast-channel")` + `lib/mcp/` 的 `../data-bus` |

- 残留验证：三端 `["'](\.\.?/)+lib/(20件名)["']` grep **归零**；缺 `@` 残留（偏差 #2 产物）归零
- 三端 package.json dependencies + `"@yyc3/core": "workspace:*"`

## DoD 核验矩阵

| DoD 项 | 结果 | 证据 |
| ------ | ---- | ---- |
| core 包独立 tsc | ✅ | `packages/core` `tsc --noEmit` 0 错（types.ts 修复后 api-config TS2538 连带消失） |
| type-check 零回归 | ✅ | P1 = 67 存量**精确持平**；P3 = 0；P4 = 0 |
| build 三绿 | ✅ | P4 776ms / P3 724ms / P1 748ms 全绿、UNRESOLVED_IMPORT 归零 |
| P2 基线持平 | ✅ | P2 build = 7 错**逐字同基线**；P2 全树 0 处 `@yyc3/core`（零误伤实证） |
| 残留归零 | ✅ | 三模式重写后旧相对引用 grep = 0 |
| db-adapter 注册表 | ✅ | 三态 kind + detect 探测链落盘，消费接线留后续阶段 |

## 偏差与未完登记

| # | 事项 | 处置 |
| -- | ---- | ---- |
| 1 | **types 全目录收编失败**：`types/index.ts` 实为 28 分件 re-export barrel 非纯类型自包含（grep `^import\|const\|function\|class` 抓不到 `export * from` 行致误判）；三端本就异构（P1=207L vs P3/P4=210L）且 P1 独有 ai-family 跨域 → tsc 28 个 TS2307 | 全量回退（git mv 返回 P1 + checkout 恢复 P3/P4）；改 **B' 方案** core 按需类型声明；规划文档决策 #2 同步作废登记 |
| 2 | **perl 数组插值吞 `@`**：主模式替换文本 `@yyc3/core/$1` 中 `@yyc3` 被插值为空数组 → 全部产物成 `yyc3/core/件名` | 二次修复脚本 `s{(["'])yyc3/core/}{$1\@yyc3/core/}`（`\@` 转义）；教训：替换文本含 `@` 必须写脚本文件转义 |
| 3 | **frozen-lockfile 静默失败**：`pnpm install --reporter=silent` exit 0 但实际 ERR_PNPM_OUTDATED_LOCKFILE 被吞 → `node_modules/@yyc3/core` 链接未建 → tsc TS2307 误导向 exports 写法排查 | 非 silent 重跑暴露真因；`--no-frozen-lockfile` 重装三端链接就位；教训：**静默 reporter 会吞 install 失败**，改包依赖后必须验证链接存在 |
| 4 | **exports `./*` 通配 fallback 不解析**：bundler resolution 下 `"./*": "./src/*.ts"` TS2307（theme 包显式逐条成功） | core exports 改 23 条显式逐条（显式契约，新增件需登记——符合"不盲猜"理念） |
| 5 | **JSDoc 内 `apps/*/src` 提前终止注释**：`*/` 恰为块注释结束符 → types.ts 头部 TS1005 连锁 16 错 | 注释改写避开 `*/` 序列 |
| 6 | **勘察漏计 app 侧互引**：登记 2 处实际 3 文件 4 处（漏 full-backup→yyc3-storage）；且 `lib/mcp/` 子目录 `../data-bus` 无 `lib/` 段主模式漏网 | 模式 C 补杀；教训：**引用面勘察必须覆盖动态 import 与子目录相对深度** |
| 7 | **barrel TS2308 四处歧义**（同 Phase 2 theme 包教训再现） | 命名空间 `export * as` 隔离 4 件（语义不同/双实现不可仲裁）；theme 包当时用单源收敛——两手法按冲突性质选用 |

## 后续登记（Phase 4 及以后）

- **types 体系单源收敛**：app 端 28 分件 barrel vs core 按需 types.ts 双轨 → Phase 4 定单源归属（含 ai-family 跨域处置）
- **zustand 单根 store 上收**：P1 ide 26 store 体量大，登记专项评估
- **i18n 运行时上收**：随 ui/theme 消费面定
- **storageManager 收编**：依赖外溢 `database/`，不满足 L0 闭环，留待依赖面收敛
- **P2 lib 对接**：17 件异构轻量版逐件比对，达 L0 后切换
- **db-adapter 消费接线**：`createBackend()` 在 app 侧 DatabaseProvider/bridge 层接入三态

## 交接快照

```bash
# 复验矩阵（全绿状态可复现）
cd packages/core && pnpm exec tsc --noEmit          # 0 错
cd apps/app-web-full    && pnpm exec tsc --noEmit   # 67（基线持平）
cd apps/app-desktop     && pnpm exec tsc --noEmit   # 0
cd apps/app-web-classic && pnpm exec tsc --noEmit   # 0
# build：三端 pnpm build 全绿；P2 build=7 错为基线

# 下次会话起点
# → 主文档 Phase 4（ide 域包 / types 单源收敛 / 视觉对照与 a11y 专项）
```

---

**会话状态**: ✅ 正常结束
**Phase 3 定性**: 工程面全达成（代码/构建/验证/文档闭环），视觉走查类继续留 Phase 4 专项
