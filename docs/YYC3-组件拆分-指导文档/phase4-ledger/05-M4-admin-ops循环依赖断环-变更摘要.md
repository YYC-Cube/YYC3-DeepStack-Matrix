---
file: 05-M4-admin-ops循环依赖断环-变更摘要.md
description: YYC³ DeepStack-Matrix admin↔ops 循环依赖断环变更摘要（ERR_PNPM_TASK_CYCLE 根除）
author: YanYuCloudCube <admin@0379.email>
version: v1.0.0
created: 2026-10-15
updated: 2026-10-15
status: stable
tags: [architecture],[dependency-graph],[cycle-break],[admin],[ops]
category: ledger
related: ["04-M4-2-3-ops域包化方案.md", "03-M4-2-3-ai域包化方案.md"]
---

# 🔗 M4 追加：admin↔ops 循环依赖断环变更摘要

> **定位**：`04-M4-2-3-ops域包化方案.md` 的后续偏差修正台账。ops 包化时引入的双向依赖在
> pnpm 12 递归任务调度下暴露为 `ERR_PNPM_TASK_CYCLE`，本台账记录根因、断环决策与全链验证。
> **对应提交**：`e704c82`（CI run 38699247789 success）

## 一、问题定性

```
Error: ERR_PNPM_TASK_CYCLE
  × The tasks form a dependency cycle: packages/admin#type-check → packages/ops#type-check → packages/admin#type-check
```

- **触发面**：`pnpm -r type-check` / `pnpm -r build` 等一切递归任务（CI 的 verify-gates.sh 十二包逐个 tsc 不受影响，故问题长期潜伏）
- **环体**：包级双向依赖，非文件级 require 环

## 二、根因定位（import 审计实证）

| 依赖边 | 真实用量 | 审计结论 |
| ---- | ---- | ---- |
| admin → ops | 2 处：[StorageConfigPanel](../../../packages/admin/src/StorageConfigPanel.tsx)→DatabaseConnectionPanel、[DataEditorPanel](../../../packages/admin/src/DataEditorPanel.tsx)→ConfigExportCenter | **保留**——与主文档层级图「业务域单向」方向一致 |
| ops → admin | 1 处：[DatabaseManager](../../../packages/ops/src/DatabaseManager.tsx)→InlineEditableTable；该组件在 admin 包内**零自用**（仅 barrel 转出） | **断环点**——组件迁入 ops |

**落点仲裁（为何不迁 @yyc3/ui）**：InlineEditableTable 运行时依赖 `@yyc3/core`（yyc3-storage / types），
而 ui 是最底层不可反向依赖 core——迁 ui 会制造第二处层级违例。ops 已依赖 core，迁移零新增依赖边。

## 三、变更清单（14 文件，+13/-15）

| 类别 | 变更 |
| ---- | ---- |
| 包结构 | [InlineEditableTable.tsx](../../../packages/ops/src/InlineEditableTable.tsx) `packages/admin/src` → `packages/ops/src`（git rename 100% 相似，历史保留） |
| 清单 | [ops/package.json](../../../packages/ops/package.json) 删 `@yyc3/admin` 依赖 + exports 增 `./inline-editable-table`；[admin/package.json](../../../packages/admin/package.json) 删 exports 项，描述 10→9 组件 |
| 包内消费 | DatabaseManager.tsx L43 改包内相对导入 `./InlineEditableTable` |
| 双 barrel | [ops index](../../../packages/ops/src/index.ts) 增转出；[admin index](../../../packages/admin/src/index.ts) 删转出留迁移注释 |
| 端侧桥件 | web-full [modules/admin/index.ts](../../../apps/app-web-full/src/app/modules/admin/index.ts) L19 改由 `@yyc3/ops` 转出——**模块出口不变，下游 import 面零变化** |
| 测试 | 3 端 × 2 文件（InlineEditableTable / DatabaseManager）`vi.mock` 与 import 路径同步改 `@yyc3/ops/inline-editable-table` |
| 锁文件 | pnpm-lock.yaml 同步刷新 |

## 四、验证矩阵（修复前 → 修复后）

| 检查项 | 修复前 | 修复后 |
| ---- | ---- | ---- |
| `pnpm -r type-check` | ❌ ERR_PNPM_TASK_CYCLE 直接失败 | ✅ EXIT=0（17 workspace 全 Done） |
| 三端受影响测试（2 文件 × 3 端） | 路径失配风险 | ✅ 3 × 49 = 147 全绿 |
| verify-gates.sh G1-G6 | — | ✅ 全绿（含 G3 四端 build、G4 mock 审计 STALE=0） |
| CI（gates + vitest + CodeQL + Lighthouse） | — | ✅ run 38699247789 success |

## 五、断环后全域依赖图（十二包 DAG）

```text
apps（四端）→ shell → 业务域包（ai-family / monitor / ops / admin / business / ai / ide）
                business ← ai-family（单向防环）
业务域 → store → core → ui / theme
admin → ops（唯一方向边，本变更固化）；ops ✗→ admin（已断）
```

**经验教训**：包化迁移时「被迁组件在原包仅剩 barrel 转出」是循环依赖的高发信号——
转出链（原包 barrel）与消费链（他包 import）并存即构成潜在环，迁移时应同步清理原包转出口。

---

**维护方**: YanYuCloudCube
**反馈渠道**: <admin@0379.email>

> 「***YanYuCloudCube***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
