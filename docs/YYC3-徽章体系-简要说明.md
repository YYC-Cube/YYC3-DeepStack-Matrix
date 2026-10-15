---
file: docs/YYC3-徽章体系-简要说明.md
description: YYC³ CloudPivot Intelli-Matrix README 徽章体系说明
author: YanYuCloudCube <admin@0379.email>
version: v1.0.0
created: 2026-10-15
updated: 2026-10-15
status: active
tags: [readme],[badges],[ci],[quality-gates]
category: guide
---

# 🏷️ README 徽章体系简要说明

> **定位**：README 顶部徽章是本仓库质量状态的「仪表盘」——实时状态自动刷新，门禁基线实证快照，技术栈静态标识。本文档说明四组徽章的来源、刷新机制与维护规范。

## 一、总览

| 分组 | 数量 | 数据来源 | 刷新方式 |
| ---- | ---- | -------- | -------- |
| ① 实时状态 | 2 | GitHub Actions 直出 | push 自动刷新 |
| ② 质量门禁基线 | 5 | 本地 gates 实证快照 | 手动维护 |
| ③ 技术栈 | 6 | package.json 依赖声明 | 依赖大版本变更时手动同步 |
| ④ 工程与安全 | 7 | CI 配置 + 仓库元数据 | 稀疏手动维护 |

合计 **20 枚**，全部使用 shields.io 静态徽章或 GitHub Actions 原生徽章，零第三方统计服务、零追踪脚本。

## 二、分组明细

### ① 实时状态（GitHub Actions 直出）

| 徽章 | 数据源 | 说明 |
| ---- | ------ | ---- |
| CI 质量门禁 | `.github/workflows/ci.yml` | 主干门禁（gates:quick + CodeQL + Lighthouse），push/PR 自动触发 |
| 发布管线 | `.github/workflows/release.yml` | Electron 三平台 + Docker GHCR 发布流水线 |

**刷新机制**：GitHub 原生 `badge.svg`，每次 workflow 运行后自动更新为最新结论（passing / failing / no status）。无需任何人工干预。

### ② 质量门禁基线（本地 gates 实证快照）

| 徽章 | 数值 | 实证来源 |
| ---- | ---- | -------- |
| 门禁 G1-G6 | 全绿 | [scripts/verify-gates.sh](../scripts/verify-gates.sh) |
| tsc | 12 pkgs + 4 apps · 0 errors | G1（十二包）+ G2（四端）严格模式编译 |
| 三端净承接率 | 83.5% · DoD≥80% | [scripts/reuse-report.mjs](../scripts/reuse-report.mjs) 双口径报表 |
| i18n 裸键 | 0 · 1220 keys | [scripts/i18n-bare-key-scan.mjs](../scripts/i18n-bare-key-scan.mjs) |
| 视觉基线 | 61 张 · diff≤0.5% | [docs/YYC3-组件拆分-指导文档/](./YYC3-组件拆分-指导文档/) 四端快照台账 |

**刷新机制**：静态徽章，数值为最近一次全量门禁的实证快照。**数值漂移时必须同步更新**（如承接率报表重跑后变化、快照基线张数增减），防止徽章失真。

### ③ 技术栈（静态标识）

React 19 · TypeScript strict · Vite 8 · Electron 41 · Tailwind CSS · shadcn/ui + Radix

**刷新机制**：跟随根 [package.json](../package.json) 与各端依赖声明。大版本升级时手动同步徽章版本号（如 Vite 8 → 9）。

### ④ 工程与安全

| 徽章 | 跳转/含义 |
| ---- | --------- |
| Node ≥22 | engines 约束（根 package.json） |
| pnpm workspace 12 | packageManager 字段（`pnpm@12.11.2`，corepack 锚定） |
| Vitest 分片 | 测试基础设施标识 |
| SAST CodeQL | [Security 标签页](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix/security/code-scanning) 静态扫描 |
| Lighthouse perf≤0.9 · 实测0.94 | [ci.yml](../.github/workflows/ci.yml) Lighthouse CI 门禁 |
| License MIT | [LICENSE](../LICENSE) |
| PRs welcome | 贡献入口 |

## 三、维护规范

### 3.1 何时更新哪组

| 触发事件 | 动作 |
| -------- | ---- |
| 门禁脚本重跑且数值变化 | 同步 ② 组对应徽章 URL 中的数值段 |
| 依赖大版本升级（React/Vite/Electron/Tailwind） | 同步 ③ 组版本号 |
| workflow 文件改名/增删 | 同步 ① 组 badge.svg 路径 |
| pnpm / Node 版本要求调整 | 同步 ④ 组徽章 |

### 3.2 编辑注意

1. **URL 编码**：中文与特殊字符（空格、`≥`、`·`）在 shields.io URL 中需百分号编码，直接改 badge 文本易破坏渲染——建议复制既有徽章行改值再整体替换。
2. **可点击性**：凡有实证产物的徽章（② 组全部、CodeQL/Lighthouse）必须携带 `[![...](...)](目标)` 跳转链接；纯标识类（③ 组）不强制。
3. **分组注释**：README 中以 `<!-- ━━ ① ━━ -->` 注释分隔四组，新增徽章须归入对应分组并保持注释锚点不变。
4. **零追踪底线**：禁止引入需要远端动态渲染的私有徽章服务；现有 shields.io / GitHub 原生两类来源之外的引入需评审。

### 3.3 与门禁体系的关系

徽章是「展示层」，门禁是「证据层」：

```
scripts/verify-gates.sh (G1-G6)  ──实证──▶  ② 组徽章数值
.github/workflows/ci.yml         ──直出──▶  ① 组实时状态
依赖声明 + engines/packageManager ──标识──▶  ③④ 组
```

徽章数值必须能在本地复现（`pnpm gates:quick`），任何「徽章绿了但门禁跑不出该数值」的状态都视为失真，需回溯修复。

---

**维护方**: YanYuCloudCube
**反馈渠道**: <admin@0379.email>

> 「***YanYuCloudCube***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
