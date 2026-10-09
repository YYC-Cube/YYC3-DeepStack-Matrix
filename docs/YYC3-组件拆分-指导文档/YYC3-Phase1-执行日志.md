---
file: YYC3-Phase1-执行日志.md
description: YYC³ 四项目统一拆分 - Phase 1 Monorepo 底座（M1）执行日志
author: AI Tutor <YanYuCloudCube>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: stable
tags: [phase1],[monorepo],[m1],[pnpm-workspace]
category: log
---

# 🏗️ Phase 1 执行日志 - M1 Monorepo 底座

## 一、目标与达成

> **总目标**：四项目迁入单一 pnpm workspace，端口合规，根安装一锁统管，DoD 与 Phase 0 基线零回归。

**结论：✅ M1 达成（里程碑 M1 通过）**，DoD 与 Phase 0 基线完全一致，零回归。

## 二、动作清单（7/7 完成）

### M1-1 结构重组 ✅

- `git mv` 四项目 → `apps/{app-web-full, app-sandbox-lite, app-desktop, app-web-classic}`，git 历史保留（rename 检测）。
- 映射：P1→app-web-full、P2→app-sandbox-lite、P3→app-desktop、P4→app-web-classic。

### M1-2 根座搭建 ✅

- 根 [package.json](../../../package.json)：`@yyc3/monorepo`，engines node>=22 / pnpm>=9，聚合脚本 build / type-check / test / dev:web-full 等。
- 根 `pnpm-workspace.yaml`：`apps/*`、`packages/*`、`tools/*`。
- 删除 P2 残件 `apps/app-sandbox-lite/pnpm-workspace.yaml`（pnpm11 `allowBuilds` 残留，**缺陷 A 消解**）。

### M1-3 改名消歧 ✅

- 四 app package.json name 统一为 `@yyc3/app-web-full` / `@yyc3/app-sandbox-lite` / `@yyc3/app-desktop` / `@yyc3/app-web-classic`（原全部同名 `yyc3-cloudpivot-intelli-matrix`，差异 #12 消解）。

### M1-4 端口合规 ✅

| App | vite port | electron wait-on | 其他引用 |
| --- | --- | --- | --- |
| P1 app-web-full | 3030（已合规） | 3218→**3030**（修复遗漏，原 wait-on 指向已废弃端口会导致 electron:dev 永久挂起） | 注释同步 |
| P2 app-sandbox-lite | 3030→**3031** | 无 electron | — |
| P3 app-desktop | 3218→**3032** | →3032（package.json + package-electron.json） | playwright ×2、lighthouserc |
| P4 app-web-classic | 3218→**3033** | →3033 | 注释同步 |

- **不改**：部署层 3118/8080（.env、docker-compose、release.yml）；`variable-center.ts` 的 `node.defaultPort`（节点通信业务配置）；`connection-test-engine.ts` SSR fallback；`docs/*.ts` 历史文案；11434（Ollama 代理目标）。

### M1-5 根安装 ✅

- 删除四份旧 `pnpm-lock.yaml` → 根目录 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ pnpm install` → **EXIT=0**。
- 根 `pnpm-lock.yaml` 567KB 一锁统管 5 个 workspace 项目。
- P1/P3/P4 的 `pnpm.overrides`（安全钉版，三份完全一致）**上移根座**；app 级残件暂留（仅警告噪音，Phase 4 清理）。
- electron postinstall 经镜像完成，无 GitHub 直连问题。

### M1-6 DoD 验证 ✅（偏差登记制）

终版矩阵（证据：`phase1-ledger/attachments/`）：

| App | `pnpm -r build` | `pnpm -r type-check` | 与 Phase 0 基线对比 |
| --- | --- | --- | --- |
| P1 app-web-full | ✅ Done 4.44s | ❌ **67 错**（游离副本 ai-family 存量） | 持平（67=67） |
| P2 app-sandbox-lite | ❌ tsc **7 错**（缺陷 B 存量） | ⚠️ 无独立 type-check 脚本（并入 build） | 持平（7=7） |
| P3 app-desktop | ✅ Done 4.41s | ✅ Done 0 错 | 持平（0=0） |
| P4 app-web-classic | ✅ Done 2.73s | ✅ Done 0 错 | 持平（0=0） |

**判定：零回归，DoD 以「存量偏差登记」达成**（P1=67、P2=7 均为 Phase 0 冻结前既有，Phase 4 专项修复）。

### M1-7 文档同步 ✅

- 本日志 + 主文档进度标记 + git 提交。

## 三、关键技术发现：双 React 大版本混栖的提升层穿透（重要存档）

### 3.1 现象

根安装后 P2 build 的 tsc 错误从基线 7 暴涨至 **2398**（TS2786/TS2339/TS2322 为主）。

### 3.2 根因链（实证）

1. workspace 中 P2 为 **React 18 栈**（react@18.3.1 + @types/react@18.3.31），P1/P3/P4 为 **React 19 栈**（@types/react@19.3.0）。
2. pnpm 隐藏提升层 `node_modules/.pnpm/node_modules/` 每个「包名」只保留一个版本，`@types/react`、`react-dom`、`vitest` 均被 **19 栈版本抢占**。
3. 一批**未声明 @types peer 的 phantom-typed 包**（lucide-react@0.469.0、react-router@7、@testing-library/jest-dom@6、recharts、framer-motion、motion、cmdk、vaul、sonner、@uiw/react-codemirror 等）的组合目录内**没有 @types 链接**，其 .d.ts 的 `import('react')` 沿目录树解析时穿透到提升层 → 绑定到错误大版本。
4. 症状三类：TS2786（JSX 组件签名大版本不符）、TS2339（jest-dom 断言增强绑定 vitest@4 而 P2 测试运行在 vitest@3.2.7）、TS2322/TS2344 级联。

### 3.3 修复：根座 `pnpm.packageExtensions`（27 条）

为全部 phantom-typed 包补声明 peer（`'*'` 范围，双栈各自按 importer 语境实例化正确大版本），如：

```json
"packageExtensions": {
  "lucide-react@0.469.0": { "peerDependencies": { "@types/react": "^18.3.18" } },
  "react-router@7": { "peerDependencies": { "@types/react": "*", "@types/react-dom": "*" } },
  "@testing-library/jest-dom@6": { "peerDependencies": { "vitest": "*" } }
}
```

- 修复轨迹：2398 → 995（lucide）→ 152（react-router + jest-dom）→ **9 → 7**（批量扩展 + codemirror）。
- **7 错精确复原 Phase 0 基线**，且 P1/P3/P4 的 19 栈 type-check 保持全绿（peer `'*'` 使 19 组合同样实例化 @types/react@19.3.0）。

### 3.4 经验

- 双大版本混栖的 pnpm workspace，`pnpm.packageExtensions` 是系统性兜底手段；逐包升级（P2→React19，lucide@0.469→1.x）留待 Phase 4 一并治理。
- 锁文件重建（删旧锁）会让「靠旧提升层侥幸成立」的类型解析暴露，属于**预期的债显形**而非新缺陷。

## 四、偏差与遗留登记

| # | 项 | 性质 | 处置 |
| --- | --- | --- | --- |
| 1 | P1 type-check 67 错 | Phase 0 既有存量 | Phase 4 专项（游离副本清理） |
| 2 | P2 缺陷 B 7 错（ai-family 半成品：`./ai-family/shared`、`AIFamilyRouter` 缺失 + 隐式 any） | Phase 0 既有存量 | Phase 4 修复 |
| 3 | P2 无 `type-check` 独立脚本（tsc 内嵌 build） | 一致性缺失 | Phase 4 补脚本 |
| 4 | peer 警告：`@vitest/coverage-v8@4.1.11` vs P2 `vitest@3.2.7`（P2 manifest 自相矛盾）；`eslint-plugin-react` vs eslint@10 | 依赖声明错位 | Phase 4 调齐（coverage-v8 应为 ^3.2.7） |
| 5 | app 级 `pnpm.overrides` 残件警告（×3） | 已被根 overrides 取代 | Phase 4 删除 app 级字段 |
| 6 | Turborepo 暂缓 | 风险规避（native 二进制下载），`pnpm -r` 已满足 DoD | 偏差登记，暂不引入 |

## 五、下次会话启动指南 🚀

```bash
cd /Users/yanyu/Downloads/YYC3-CloudPivot-Matrix-集成
export PATH=/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Users/yanyu/Library/pnpm:$PATH
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 四端并行开发（端口：3030/3031/3032/3033）
pnpm dev:web-full & pnpm dev:sandbox-lite & pnpm dev:desktop & pnpm dev:web-classic

# DoD 快速复核
pnpm -r build ; pnpm -r type-check
```

- 下一步：主流程 §10 **Phase 2**（共享层抽packages/，依据 Phase 0 ui 台账 L0/L0* 先行迁移）。
- 最紧急 TOP3：① Phase 2 共享层抽取；② P2 coverage-v8 版本调齐；③ app 级 overrides 残件清理。

---
**会话状态**: ✅ M1 正常收束
**证据目录**: `docs/YYC3-组件拆分-指导文档/phase1-ledger/attachments/`（4 份）
