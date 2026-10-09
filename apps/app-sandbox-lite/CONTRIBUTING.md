---
file: CONTRIBUTING.md
description: YYC³ CloudPivot Intelli-Matrix 贡献指南 — 流程、规范与门禁
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-10-05
updated: 2026-10-05
status: stable
tags: [contributing],[workflow],[standards]
category: guide
language: zh-CN
audience: developers
complexity: intermediate
---

# 贡献指南（Contributing to YYC³ CloudPivot Intelli-Matrix）

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_

---

> **核心理念**：执行有规划，规划有节点，节点有目标，目标可评估。
> 先读代码、再谈方案；先过门禁、再提合并。

## 目录

- [环境准备](#环境准备)
- [开发循环（PDCA+）](#开发循环pdca)
- [分支与提交规范](#分支与提交规范)
- [质量门禁](#质量门禁)
- [代码规范](#代码规范)
- [文档规范](#文档规范)
- [PR 评审流程](#pr-评审流程)
- [Issue 与任务](#issue-与任务)

---

## 环境准备

| 依赖 | 最低版本 | 说明 |
| ---- | -------- | ---- |
| Node.js | 18 | 推荐 LTS |
| pnpm | 9 | 项目锁定 `pnpm@11.10.0`（见 package.json `packageManager`） |

```bash
# 克隆并安装（请先确认远端仓库地址）
git clone <REPO_URL> && cd app
pnpm install

# 启动开发服务器 — 团队规范：端口从 3030 起
pnpm dev   # http://localhost:3030
```

> 团队规范：开发服务器端口 **3030 起**，禁止随意占用 3000-3029（受限段，参见《YYC3-团队规范-开发标准》）。

## 开发循环（PDCA+）

每次贡献应遵循 YYC³ 开发循环：

```text
Plan  规划   → 明确目标与验收标准，分析影响面与依赖
Do    执行   → 最小定点修改，关键操作前确认
Check 检查   → 对照门禁自检（tsc / test / audit / build）
Act   处理   → 通过则提交；不通过则回归 Plan
Archive 归档 → 更新执行日志与总结文档，沉淀上下文
```

跨会话开发请按团队《AI 协同开发文档》在 `docs/` 下建立会话目录并归档四件套文档（00 审核 / 01 规划 / 02 日志 / 03 总结）。

## 分支与提交规范

### 分支模型

```text
main      生产分支（受保护）
develop   开发集成分支
feature/* 功能分支    bugfix/* 修复分支    refactor/* 重构分支
hotfix/*  热修复分支  release/* 发布分支
```

### 提交信息（Conventional Commits）

```text
<type>(<scope>): <subject>

type:  feat | fix | docs | style | refactor | perf | test | build | ci | chore
scope: 组件/模块名，如 monitor, sidebar, supabase, i18n
```

示例：

```bash
git commit -m "feat(monitor): 新增告警规则阈值滑块"
git commit -m "fix(supabase): 幽灵登录增加生产环境守卫"
git commit -m "test(layout): 修复侧边栏响应式断言漂移"
```

**红线**：禁止提交 `.env.local`、密钥、Token、真实凭据；禁止使用 `--no-verify` 跳过校验。

## 质量门禁

所有变更在提交前必须通过以下门禁（当前项目暂无 CI 强制，**靠自觉 + PR 评审兜底**，CI 建设中）：

| 门禁 | 命令 | 通过标准 |
| ---- | ---- | -------- |
| 类型检查 | `npx tsc --noEmit` | 0 errors |
| 单元测试 | `pnpm test` | 全部通过（存量失败清单见 docs 会话归档，不得新增失败） |
| 依赖安全 | `pnpm audit --prod` | 0 高危 |
| 构建 | `pnpm build` | exit 0 |
| E2E（视范围） | `pnpm test:e2e` | 涉及核心链路时必跑 |

**失败判定**：任一门禁失败即阻断合并；确需降级发布的，须在 PR 中说明降级策略并获维护者批准。

## 代码规范

- **TypeScript strict 模式**，新代码禁止 `any`（确需时注释理由）
- 组件文件使用 PascalCase 命名；hooks 使用 `use*` 前缀；lib 模块使用 kebab-case
- UI 构建优先复用 [components/ui](components/ui)（shadcn/ui + Radix 惯例），禁止绕过主题直接硬编码颜色
- 状态管理：全局共享状态进 Zustand，组件局部状态用 hooks；新增状态请放入既有目录结构（`store/`），勿再新建平行目录
- 错误处理：页面级组件使用 `ErrorBoundary` 包裹；全局错误走 [lib/error-handler.ts](lib/error-handler.ts)，禁止裸 `console.error` 吞错
- i18n：面向用户的文案必须走 [hooks/useI18n.ts](hooks/useI18n.ts)，语言包放 [i18n/](i18n/)（zh-CN 与 en-US 同步维护）
- 样式：Tailwind v4 语义类；**CSS 注释内禁用 `xxx-*/yyy-*` 写法**（`*/` 会截断注释引发级联报错，历史教训见 docs 会话归档 20260916）

## 文档规范

所有新增/修改的 Markdown 文档须包含 YYC³ YAML Front Matter 标头（file/description/author/version/created/updated/status/tags/category/language）与品牌标头块。完整模板见 [docs/YYC3-团队资产-标准规范/YYC3-团队通用-标规文档/YYC3-团队规范-开发标准.md](docs/YYC3-团队资产-标准规范/YYC3-团队通用-标规文档/YYC3-团队规范-开发标准.md)。

## PR 评审流程

1. **自检**：门禁全绿 + 自述变更范围与影响
2. **评审人**：至少 1 名维护者（当前：<admin@0379.email>）
3. **通过标准**：功能正确 · 门禁通过 · 符合五维评估（性能/安全/可维护性无回退）
4. **合并策略**：feature → develop 使用 squash；develop → main 由维护者执行
5. **评审时效**：维护者承诺 48 小时内首次响应

## Issue 与任务

- **Bug 报告**：标题 `[Bug]` + 复现步骤 / 期望 vs 实际 / 环境信息 / 相关日志
- **功能建议**：标题 `[Feature]` + 场景描述 / 量化目标 / 对齐「五高五标五化」哪一项
- **问题分级**：P0 致命（阻断主流程）> P1 严重 > P2 一般 > P3 优化
- **响应时效**：P0 24h / P1 48h / P2 5 天 / P3 排期

---

**感谢你的贡献！** 每一次高质量的提交都在推动「万象归元于云枢」的愿景落地。

<div align="center">

**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**

</div>
