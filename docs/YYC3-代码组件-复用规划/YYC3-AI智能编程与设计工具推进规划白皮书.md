---
file: YYC³-AI智能编程与设计工具推进规划白皮书.md
description: YYC³ AI 智能编程助手 + Figma AI 设计工具 — 后续工作推进规划白皮书（含双仓一体化融合方案）
author: YYC³ 总控工程师导师 (Intelligent Application Implementation Expert)
version: V1.3
created: 2026-05-28
updated: 2026-06-20
status: updated (对齐 YYC3-UI-MONO v2.2.0 + YYC3-π³ v1.4.0 · 双仓融合 + 6大冲突精准解决)
tags: [whitepaper],[ai-programming],[figma-ai],[planning],[roadmap],[dual-repo-integration],[conflict-resolution]
category: whitepaper
language: zh-CN
---

# YYC³ AI 智能编程与设计工具推进规划白皮书

**版本：V1.2（2026.06.20）｜对齐：YYC3-UI-MONO v2.2.0 + YYC3-π³ v1.4.0 ｜定位：团队专用 · 非商用 · 专项技术栈 · 资产驱动 · 双仓一体化**

> 核心理念：不造通用轮子，聚焦 YYC³ 专项技术栈 (Next.js 16 + React 19 + Tailwind 4 + Radix UI)，以 **YYC3-UI-MONO（UI 资产底座：251 应用 + 2,061 组件 + 20 主题 + 22 样板）** + **YYC3-π³（AI 智能中枢：11 npm 包 + 840+ 测试 + 82% 覆盖率）** 为双仓知识底座，构建"言启千行代码，语枢万物智能"的私有 AI 编程 + 设计助手。

---

## 目录

| 章节　　 | 主题　　　　　　　　　　　　　　　　　　　　　　|
| ----------| -------------------------------------------------|
| 第一章　 | 现状盘点：双仓资产基座 (YYC3-UI-MONO + YYC3-π³) |
| 第二章　 | 目标定义：AI 智能编程 + Figma AI　　　　　　　　|
| 第三章　 | 技术架构：三层 AI 能力体系　　　　　　　　　　　|
| 第四章　 | 模型选型：五维评估匹配　　　　　　　　　　　　　|
| 第五章　 | Phase 1：组件级 AI 生成　　　　　　　　　　　　 |
| 第六章　 | Phase 2：页面级 AI 组装　　　　　　　　　　　　 |
| 第七章　 | Phase 3：项目级 AI 脚手架　　　　　　　　　　　 |
| 第八章　 | Phase 4：Figma ↔ Code 双向桥　　　　　　　　　　|
| 第九章　 | 落地路线图 (16 周)　　　　　　　　　　　　　　　|
| 第十章　 | 五维驱动映射　　　　　　　　　　　　　　　　　　|
| 第十一章 | 双仓一体化融合方案 (Phase 0)　　　　　　　　　　|
| 第十二章 | 风险与应对　　　　　　　　　　　　　　　　　　　|
| 第十三章 | 6 大红色冲突精准解决方案 (Phase 0 实施)　　　　 |

---

# 第一章 现状盘点：已有资产基座

## 1.1 资产全景

YYC³ 经过前阶段全量标准化复用工作，已建立以下资产基座：

| 资产类别　　　　　　　| 数量　　　　　　　　　　　　 | 说明　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| -----------------------| ------------------------------| -------------------------------------------------------------------------------------------------------------------------|
| 精品项目　　　　　　　| 173 个 (>100 源文件)　　　　 | 可提取代码模式，Top5: yyc3-xy-ai(3117), yyc3-jgyw(1689), yyc3-audio(1645), yyc3-app-suite(1599), yyc3-family-ai(1596)　 |
| 全部应用　　　　　　　| 251 个　　　　　　　　　　　 | 统一 `@yyc3/{name}` 命名，100% 包名唯一　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| TSX 组件　　　　　　　| 2,061 个 (apps/*/components) | 零依赖组件、UI 基础组件　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| npm 包 (packages)　　 | 7 包　　　　　　　　　　　　 | @yyc3/base, @yyc3/theme, @yyc3/ui, @yyc3/yyc3-industry-platform, @yyc3/yyc3-npm-arch, yyc3_cube, yyc3-learning-platform |
| CLI/工具 (tools)　　　| 5 个　　　　　　　　　　　　 | yyc3-cli v2.0.0, yyc3-claw, yyc3-mcp, @yyc3/yyc3-scripts, @yyc3/yyc3-skills　　　　　　　　　　　　　　　　　　　　　　 |
| 视觉主题　　　　　　　| 20 套 (U01-U20)　　　　　　　| CSS 变量体系，亮/暗切换，位于 templates/themes/　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 场景样板 (Blueprints) | 22 套 (T01-T22)　　　　　　　| 完整可部署应用模板，位于 templates/blueprints/　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 设计文档　　　　　　　| 1,694 篇 (.md)　　　　　　　 | 含管理文档 355 篇 + 项目文档 1,317 篇 + 架构/组件/主题/教程　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 知识库 (PostgreSQL)　 | 182,050 条　　　　　　　　　 | 100% 向量嵌入，外部 PG 服务　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 总仓库大小　　　　　　| 4.0G (198,542 文件)　　　　　| 已清理 1.2G 冗余（node_modules/dist/.pnpm-store/DS_Store）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|

## 1.2 技术栈锁定（双仓统一）

```
┌──────────────────────────────────────────────────────────────────────┐
│  YYC³ 专项技术栈 (双仓统一 · 非通用，团队锁定)                          │
├──────────────────────────────────────────────────────────────────────┤
│  框架:      Next.js 16 (App Router · Turbopack)                     │
│  UI:        React 19 + Radix UI + shadcn/ui                         │
│  样式:      Tailwind CSS 4 + CSS Variables + CVA                     │
│  类型:      TypeScript 5.3+                                          │
│  构建:      tsup (包) + Next.js (应用)                                │
│  包管:      pnpm Workspace Monorepo (双仓)                           │
│  动效:      Framer Motion + @yyc3/motion + @yyc3/effects             │
│  AI 能力:   @yyc3/core (技能/MCP) + @yyc3/ai-hub (Agent)             │
│             + @yyc3/mcp-servers v3.0 + @yyc3/cli v1.1               │
│  国际化:    @yyc3/i18n-core v2.4 (10 语言)                           │
│  情感:      @yyc3/emotion v1.0                                       │
│  IDE:       @yyc3/ide v1.0                                           │
│  模型:      Qwen3.6-27B-FP8 (主) + 14B (前端)                         │
│  资产:      251 apps + 2,117 组件 + 22 主题 + 22 样板 + 11 npm 包    │
│  CI/CD:     GitHub Actions + changesets + husky                       │
│  测试:      840+ 用例 / 82% 覆盖率                                    │
│  npm 发布:  10 个已发布包 (π³ 流水线)                                  │
└──────────────────────────────────────────────────────────────────────┘
```

> **为什么限定技术栈？** AI 编程助手的代码生成质量取决于训练/检索域的聚焦度。限定到 YYC³ 专项栈后，组件生成准确率可从通用的 ~40% 提升至 ~85%。双仓统一后，资产总量从 251 应用 + 20 主题扩展至 2,117 组件 + 11 npm 包 + 840 测试用例，知识底座密度提升 3.5x。

## 1.3 YYC3-π³ (Family-PAI) — AI 智能中枢现状

YYC3-π³ 是已发布到 npm 的完整 AI 智能体生态 Monorepo（`/Volumes/Max/YYC3-π³`），与 YYC3-UI-MONO 形成"AI 能力层 + UI 资产层"的双仓互补架构。

### 1.3.1 包全景（10 个已发布 + 1 个私有 = 11 包）

| # | 包名 | 版本 | 类型 | 说明 |
| --- | ------ | ------ | ------ | ------ |
| 1 | `@yyc3/core` | 1.4.0 | 已发布 | 核心引擎 — 统一认证 / MCP 协议 / 技能系统 / 8位 AI 家人智能体 / 多模态处理 |
| 2 | `@yyc3/ai-hub` | 1.4.2 | 已发布 | AI 集成中心 — 8位拟人化 AI 家人 / Family Compass 时钟罗盘 / 多 Agent 协作 |
| 3 | `@yyc3/ui` | 2.0.2 | 已发布 | UI 组件库 — 56 shadcn/ui 标准组件 + 22 套主题 + 品牌/布局/行业组件 |
| 4 | `@yyc3/effects` | 1.0.0 | 已发布 | 特效组件库 — 38+ 特效 (赛博朋克/液态玻璃/3D/粒子/视差/微交互) |
| 5 | `@yyc3/plugins` | 1.4.2 | 已发布 | 插件集合 — LSP 语言服务器 + 内容处理插件 |
| 6 | `@yyc3/i18n-core` | 2.4.0 | 已发布 | 国际化框架 — 10 语言 / ICU 格式化 / AI 翻译 / 零外部依赖 |
| 7 | `@yyc3/emotion` | 1.0.0 | 已发布 | 情感引擎 — 多模态情感融合 / 音乐桥接 / 事件总线 |
| 8 | `@yyc3/mcp-servers` | 3.0.0 | 已发布 | MCP 服务器集合 — 8 个即插即用的 Model Context Protocol Server |
| 9 | `@yyc3/motion` | 1.0.0 | 已发布 | 动效引擎 — CSS / Web Animations API / Framer Motion 三层渐进式架构 |
| 10 | `@yyc3/cli` | 1.1.1 | 已发布 | 智能编程库 CLI — 12 命令 / 3 套主题预设 / MCP Server |
| 11 | `@yyc3/ide` | 1.0.0 | 私有 | IDE 智能开发环境 — AI 管道 / 协作面板 / 60+ 组件 |

### 1.3.2 关键指标

| 指标 | 数值 |
| ------ | ------ |
| 测试用例 | 840+ passed |
| 代码覆盖率 | 82% |
| 文档闭环 | 5 件套标准 (README/CHANGELOG/MAINTENANCE/LICENSE/COMPLIANCE) |
| 多语言文档站 | 10+ 语言 VitePress |
| CI/CD | GitHub Actions + changesets + husky |
| 构建工具 | tsup (统一) |
| 类型系统 | TypeScript 5.3+ |

### 1.3.3 双仓对比与冲突识别

| 维度 | YYC3-UI-MONO | YYC3-π³ | 冲突/差异 |
| ------ | ------------- | --------- | ---------- |
| 定位 | UI 资产底座 | AI 智能中枢 | 互补，需融合 |
| React | 18 | 19 | ⚠️ UI-MONO 需升级 |
| Next.js | 14 | 15 (目标) | ⚠️ UI-MONO 需升级 |
| Tailwind | 3 | 4 | ⚠️ UI-MONO 需升级 |
| `@yyc3/ui` | v1.0.0 (private) | v2.0.2 (published) | 🔴 包名冲突，需合并 |
| CLI | `yyc3-cli` v2.0.0 | `@yyc3/cli` v1.1.1 | 🔴 双 CLI 工具，需统一 |
| 主题数 | 20 套 (U01-U20) | 22 套 (内置 @yyc3/ui) | ⚠️ 主题体系需合并 |
| 组件数 | 2,061 TSX (apps/) | 56 shadcn + 38 effects + 自定义 | 互补，需归类迁移 |
| MCP 工具 | `yyc3-mcp` v1.7.0 | `@yyc3/mcp-servers` v3.0.0 | 🔴 MCP 工具体系需统一 |
| 技能系统 | `@yyc3/yyc3-skills` | `@yyc3/core` skills | 🔴 技能系统需统一 |
| npm 发布 | 全部 private | 10 个已发布 | π³ 已建立发布流水线 |

---

# 第二章 目标定义

## 2.1 目标一：AI 智能编程助手（类 Vercel v0）

**定位**：团队私有的 AI 前端编程助手，基于 YYC³ 资产库生成符合团队标准的代码。

| 能力　　　　　　| 说明　　　　　　　　　　　　　　　　　　　　　　　　　　 |     |
| -----------------| ----------------------------------------------------------| -----|
| 自然语言 → 组件 | 输入"创建一个赛博朋克风格的用户卡片"，输出完整 TSX + CSS |     |
| 组件 → 页面　　 | 选择多个组件，AI 自动组装为完整页面 (layout + routing)　 |     |
| 页面 → 项目　　 | 选择主题 + 页面集合，AI 生成完整 Next.js 项目骨架　　　　|     |
| 主题切换　　　　| 一键切换 20 套主题，实时预览　　　　　　　　　　　　　　 |     |
| 代码审查　　　　| AI 基于团队标准审查代码质量、风格一致性　　　　　　　　　|     |
| 组件搜索　　　　| 自然语言搜索 2,061+ 组件库中的匹配组件　　　　　　　　　 |     |

**定位**：Figma 设计稿 → YYC³ 标准代码 的 AI 桥接工具。

| 能力 | 说明 |
| ------ | ------ |
| Figma → Code | 识别设计稿中的组件/布局/颜色，生成 TSX + Tailwind |
| Code → Figma | 反向：代码生成 Figma 设计 token |
| 设计系统同步 | 20 套 YYC³ 主题 ↔ Figma Design Tokens |
| 组件映射 | Radix UI / shadcn 组件 ↔ Figma 组件库 |
| 风格迁移 | 保持布局，切换 20 套视觉风格 |

---

# 第三章 技术架构：三层 AI 能力体系

```
┌─────────────────────────────────────────────────────────────┐
│                     用户交互层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Web IDE  │  │  CLI     │  │ Figma    │  │ VS Code  │    │
│  │ Playground│  │ @yyc3/cli│  │ Plugin   │  │ Extension│    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
├───────┼──────────────┼──────────────┼──────────────┼─────────┤
│       │       AI 编排层 (Orchestration)           │         │
│  ┌────┴─────────────────────────────────────────┴────┐      │
│  │              Prompt Engine                         │      │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐           │      │
│  │  │Template │ │ Context  │ │ RAG      │           │      │
│  │  │Selector │ │ Builder  │ │ Retriever│           │      │
│  │  └─────────┘ └──────────┘ └──────────┘           │      │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐           │      │
│  │  │Theme    │ │Component │ │Code      │           │      │
│  │  │Injector │ │ Assembler│ │ Validator│           │      │
│  │  └─────────┘ └──────────┘ └──────────┘           │      │
│  └──────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    知识底座层 (Knowledge Base · 双仓)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 应用资产 │  │ 主题系统 │  │ 设计文档 │  │ 样板模板 │             │
│  │ 251 个   │  │ 22 套    │  │ 1,694篇  │  │ 22 套    │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 精品项目 │  │ npm 包   │  │ PG向量库 │  │ 模型权重 │             │
│  │ 173 个   │  │ 18 个    │  │ 182K条   │  │ 27B+14B  │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ π³ AI引擎│  │ 特效组件 │  │ 国际化   │  │ 情感引擎 │             │
│  │ core/ai-h│  │ 38+ 特效 │  │ 10 语言  │  │ emotion  │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ MCP Server│ │ 动效引擎 │  │ LSP 插件 │  │ IDE 环境 │             │
│  │ 8 个Server│ │ motion   │  │ plugins  │  │ @yyc3/ide│             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

# 第四章 模型选型：五维评估

基于《YYC³ 大模型选型量化科学论证 v2.0.0》，按五维评估体系选型：

| 评估维度 | 权重 | Qwen3-14B | Qwen3.6-27B-FP8 | 说明 |
| ---------- | :----: | :---------: | :----------------: | ------ |
| 业务一致性 | 40% | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 27B 代码生成+推理更强 |
| 许可合规 | 20% | Apache 2.0 | Apache 2.0 | 均完全合规 |
| 部署可行性 | 20% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 14B DGX Spark 单节点 |
| 成本效率 | 20% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 14B 推理成本更低 |

### 推荐分层部署

| 层级　　　　| 模型　　　　　　　| 用途　　　　　　　　　　　　　 | 部署方式　　　　　 |
| -------------| -------------------| --------------------------------| --------------------|
| L1 前端高频 | YYC3-Family-Coder | 组件搜索、快速补全、简单生成　 | Docker 常驻 API　　|
| L2 核心推理 | Qwen3.6-27B-FP8　 | 页面组装、代码审查、Figma 解析 | DGX Spark FP8 加速 |
| L3 重型任务 | Qwen3.6-35B-A3B　 | 复杂项目生成、架构设计　　　　 | 按需加载　　　　　 |

---

# 第五章 Phase 1：组件级 AI 生成 (Week 1-3)

## 5.1 目标

用户输入自然语言描述，AI 从 2,117+ 组件中检索匹配组件，或基于组件模式生成新组件。

## 5.2 核心功能

```
用户输入: "赛博朋克风格的数据统计卡片，带霓虹边框和数字动画"
                    ↓
        ┌─── Prompt Engine ───┐
        │  1. 解析意图         │
        │     style=cyberpunk  │
        │     type=stat-card   │
        │     features=neon,anim│
        │  2. RAG 检索组件     │
        │     @yyc3/effects/NeonCard
        │     @yyc3/effects/TiltCard
        │     docs/scripts/cyberpunk/*
        │  3. 注入主题变量     │
        │     --primary: #00f0ff
        │     --neon-glow: ...
        │  4. 组装输出         │
        └─────────────────────┘
                    ↓
输出: StatCard.tsx + StatCard.css (完整可运行代码)
```

## 5.3 实现路径

1. **组件向量索引**: 将 2,061+ 组件 + 1,694 文档向量化存入 PG 向量库
2. **Prompt 模板库**: 基于代码模式提取 50+ 生成模板
3. **主题注入器**: 自动将 20 套主题变量注入生成代码
4. **代码验证器**: AST 解析 + TypeScript 编译检查

---

# 第六章 Phase 2：页面级 AI 组装 (Week 4-6)

## 6.1 目标

用户选择主题 + 组件列表，AI 自动组装为完整页面 (layout + components + routing + data flow)。

## 6.2 核心功能

```
用户选择:
  Theme: aurora (U03)
  Components: [Header, Sidebar, DataTable, Chart, Modal]
  Layout: dashboard
                    ↓
        ┌─── Page Assembler ───┐
        │  1. 检索样板模式      │
        │     app-dashboard/* 模式匹配
        │  2. 组件排列优化      │
        │     基于 Radix UI 布局规则
        │  3. 状态管理生成      │
        │     React hooks + store
        │  4. 路由生成          │
        │     Next.js App Router
        │  5. 主题注入          │
        │     aurora CSS 变量
        └──────────────────────┘
                    ↓
输出: app/dashboard/page.tsx + layout.tsx + components/
```

---

# 第七章 Phase 3：项目级 AI 脚手架 (Week 7-9)

## 7.1 目标

用户描述项目需求，AI 生成完整 Next.js 项目骨架 (含主题、页面、组件、配置、API routes)。

## 7.2 升级 yyc3-cli

```bash
# 当前能力 (v2.0.0)
yyc3 create my-app --theme cyberpunk --scenes ai-chat,dashboard

# Phase 3 增强能力 (v3.0)
yyc3 create my-app \
  --theme aurora \
  --description "AI学习平台，含课程列表、视频播放、进度追踪、用户中心" \
  --from "智能描述"
```

AI 自动从描述中提取：

- 所需页面: 课程列表页、视频播放页、进度页、用户中心
- 所需组件: CourseCard、VideoPlayer、ProgressBar、UserProfile
- 适配主题: aurora (U03) CSS 变量
- 数据模型: Course、User、Progress

---

# 第八章 Phase 4：Figma ↔ Code 双向桥 (Week 10-12)

## 8.1 Figma → Code

```
Figma 设计稿
    ↓ Figma REST API
设计 Token 提取 (颜色、间距、圆角、阴影)
    ↓ AI 识别
组件映射 (shadcn/Radix 组件匹配)
    ↓ 模式匹配
布局分析 (Grid/Flex 自动推断)
    ↓ Code Generator
TSX + Tailwind CSS 代码生成
    ↓ 主题注入
YYC³ 标准组件 (含 CSS 变量)
```

## 8.2 Code → Figma

```
TSX 源代码
    ↓ AST 解析
组件树 + Props 提取
    ↓ 设计 Token 映射
20 套主题 → Figma Design Tokens (JSON)
    ↓ Figma Plugin API
自动创建/更新 Figma 组件库
```

## 8.3 Figma Plugin 架构

```
┌─────────────────────────────────┐
│        Figma Plugin UI          │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │主题选择│ │组件库 │ │预览区 │ │
│  │U01-U20│ │shadcn │ │实时   │ │
│  └───┬───┘ └───┬───┘ └───┬───┘ │
├──────┼─────────┼─────────┼─────┤
│      │   Plugin Backend  │     │
│  ┌───┴───────────────────┴───┐ │
│  │  YYC³ Theme Sync Engine   │ │
│  │  ┌─────────┐ ┌─────────┐ │ │
│  │  │Token    │ │Component│ │ │
│  │  │Mapper   │ │Matcher  │ │ │
│  │  └─────────┘ └─────────┘ │ │
│  └──────────────────────────┘ │
│           ↕ API                │
│  ┌──────────────────────────┐ │
│  │  YYC³ Backend (DGX)      │ │
│  │  Qwen3.6-27B + RAG       │ │
│  └──────────────────────────┘ │
└─────────────────────────────────┘
```

---

# 第九章 落地路线图 (16 周 · 双仓融合)

```
Week  1  2  3  4  5  6  7  8  9  10  11  12  13  14  15  16
      ├──┤                                            Phase 0: 双仓一体化融合
      │ 仓 │ 技术栈升级 │ @yyc3/ui 合并 │ CLI 统一 │ MCP 统一 │
      │ 融合│ React 19  │ 主题合并      │ 技能统一 │ 知识库融合│
      ├──────┤                                        Phase 1: 组件级 AI 生成
      │ 向量化 │ Prompt模板 │ 主题注入 │
      │ 2,117组件│ 50+ 模板 │ 验证器 │
             ├──────┤                                Phase 2: 页面级 AI 组装
             │ 页面模式 │ 布局优化 │ 路由生成 │
                    ├──────┤                       Phase 3: 项目级 AI 脚手架
                    │ CLI增强 │ 项目模板 │ 部署脚本 │
                           ├──────┤                Phase 4: Figma ↔ Code
                           │ Token映射 │ Plugin │ 双向同步 │
                                                   ↓
                                              全链路闭环
```

## 里程碑

| 节点 | 时间 | 交付物 |
| ------ | ------ | -------- |
| M0 | Week 2 | 双仓融合完成 (统一技术栈 + 统一包体系 + 统一知识库) |
| M1 | Week 5 | 组件生成 Playground (Web) + 2,117 组件向量索引 |
| M2 | Week 8 | 页面组装器 + 10 套样板验证 |
| M3 | Week 11 | yyc3-cli v3.0 (AI 驱动 + 双仓统一) |
| M4 | Week 16 | Figma Plugin + 双向同步 + 全链路闭环 |

---

# 第十章 五维驱动映射

### ⏱ 时间维 — 阶段节奏

- Phase 1-4 按 3 周迭代周期推进
- 每阶段结束输出验证报告
- 模型微调数据持续积累

### 💾 空间维 — 资产布局

| 存储 | 内容 |
| ------ | ------ |
| DGX Spark (Docker) | Qwen3-14B 常驻 API |
| DGX Spark (FP8) | Qwen3.6-27B 推理引擎 |
| PostgreSQL + pgvector | 182K+ 向量知识库 |
| YYC3-UI-MONO | UI 资产底座 (251 apps + 2,117 组件 + 22 主题 + 22 样板) |
| YYC3-π³ | AI 智能中枢 (11 npm 包 + 840 测试 + 82% 覆盖率) |
| NAS | 模型权重 + 冷数据 |

### 🏷 属性维 — 组件分类标签

```
组件标签 = { domain: ai|medical|education|...
             style: cyberpunk|aurora|futuristic|...
             type: card|form|table|chart|layout|...
             complexity: simple|medium|complex
             dependency: zero|radix|motion|three }
```

### 📝 事件维 — 生成生命周期

```
用户请求 → 意图解析 → RAG 检索 → 模板匹配 → 主题注入 →
代码生成 → AST 验证 → TypeScript 编译 → 用户反馈 → 模板优化
```

### 🔗 关联维 — 系统联动

```
AI 编程助手 ←→ @yyc3/cli (命令行接口)
AI 编程助手 ←→ Figma Plugin (设计接口)
AI 编程助手 ←→ PG 向量库 (知识检索)
AI 编程助手 ←→ packages/* (组件/主题/底座)
```

---

# 第十一章 双仓一体化融合方案 (Phase 0 · Week 1-2)

## 11.1 融合目标

将 YYC3-UI-MONO（UI 资产底座）与 YYC3-π³（AI 智能中枢）融合为统一的知识-能力体系，消除冗余、统一版本、建立一体化发布流水线。

## 11.2 融合策略总览

```
┌──────────────────────────────────────────────────────────────────┐
│                    双仓融合架构 (Phase 0)                          │
│                                                                   │
│  YYC3-UI-MONO                    YYC3-π³                         │
│  /Volumes/Max/.../YYC3-UI-MONO   /Volumes/Max/YYC3-π³            │
│  ┌──────────────────────┐       ┌──────────────────────┐         │
│  │ apps/     251 应用    │       │ packages/core  1.4.0 │         │
│  │ packages/ 7 包       │       │ packages/ai-hub 1.4.2│         │
│  │ tools/    5 工具     │       │ packages/ui    2.0.2 │         │
│  │ themes/   20 主题    │       │ packages/effects    │         │
│  │ templates/22 样板    │       │ packages/plugins    │         │
│  │ docs/     1,694 篇   │       │ packages/i18n-core  │         │
│  └──────────┬───────────┘       │ packages/emotion    │         │
│             │                    │ packages/mcp-servers│         │
│             │    融合策略        │ packages/motion     │         │
│             └────────┬───────────┘ packages/cli        │         │
│                      │             packages/ide        │         │
│                      ▼             └──────────────────────┘         │
│  ┌──────────────────────────────────────────────────────┐         │
│  │              统一知识-能力体系 (Unified)                │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│         │
│  │  │UI 资产层 │ │AI 能力层 │ │工具链层  │ │知识库层  ││         │
│  │  │2,117组件 │ │8 Agent   │ │CLI+MCP   │ │182K向量  ││         │
│  │  │22 主题   │ │840+测试  │ │LSP+IDE   │ │1,694文档 ││         │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│         │
│  └──────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

## 11.3 五大融合任务

### 任务 1：技术栈升级 — UI-MONO 追平 π³

| 项目 | 当前 (UI-MONO) | 目标 (对齐 π³) | 操作 |
| ------ | --------------- | --------------- | ------ |
| React | 18 | 19 | 升级所有 package.json |
| Next.js | 14.1.4 | 16.x (Turbopack) | 升级框架 + middleware→proxy + async API 适配 |
| Tailwind CSS | 3 | 4 | 升级配置 + CSS 变量迁移 |
| TypeScript | 5.x | 5.3+ | 统一 tsconfig |
| 构建工具 | 混用 | tsup | 统一到 tsup |

### 任务 2：核心包合并 — 消除冲突

| 合并项 | 保留 | 淘汰 | 原因 |
| -------- | ------ | ------ | ------ |
| `@yyc3/ui` | π³ v2.0.2 (已发布) | UI-MONO v1.0.0 (private) | π³ 版本完整、已发布、有 56 shadcn 组件 |
| CLI | `@yyc3/cli` v1.1.1 → v2.0 融合版 | `yyc3-cli` v2.0.0 | 融合双方能力，以 π³ 发布流水线为准 |
| MCP | `@yyc3/mcp-servers` v3.0.0 | `yyc3-mcp` v1.7.0 | π³ 版本更高、8 个 Server 更完整 |
| 技能系统 | `@yyc3/core` skills | `@yyc3/yyc3-skills` | 统一到 core 的技能系统 |
| 主题 | 合并 → 统一主题库 | 各自维护 | 去重合并，最终 22 套主题 |

### 任务 3：组件迁移 — 建立统一组件库

```
UI-MONO apps/ (2,061 TSX 组件)
        │
        ├──→ 提取为独立组件 ──→ @yyc3/ui 2.x 组件库
        ├──→ 保留为应用模板 ──→ templates/blueprints/ 样板
        └──→ 归档为参考代码 ──→ docs/examples/ 示例

YYC3-π³ @yyc3/ui 2.0.2 (56 shadcn + 自定义)
        │
        └──→ 作为基础组件库 ←── 合并 UI-MONO 提取的组件
```

### 任务 4：知识库融合 — 统一向量索引

```
UI-MONO 知识资产                    π³ 知识资产
┌──────────────────┐              ┌──────────────────┐
│ 1,694 篇文档      │              │ 多语言文档站      │
│ 182K 向量索引     │              │ 840+ 测试用例     │
│ 20 主题文档       │              │ API 文档          │
│ 22 样板文档       │              │ 技能文档          │
└────────┬─────────┘              └────────┬─────────┘
         │                                  │
         └────────────┬─────────────────────┘
                      ▼
         ┌───────────────────────┐
         │  统一 PG 向量知识库     │
         │  200K+ 向量索引        │
         │  双仓文档 + 代码模式    │
         └───────────────────────┘
```

### 任务 5：流水线统一 — 一体化发布

```
统一 CI/CD 流水线:
  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ Lint    │───→│ Test    │───→│ Build   │───→│ Publish │
  │ ESLint  │    │ 840+   │    │ tsup    │    │ changeset│
  │ Prettier│    │ 82%    │    │ Next.js │    │ npm      │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                        │
                   GitHub Actions
                   (统一 .github/workflows/)
```

## 11.4 融合后的一体化架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    一体化 YYC³ 知识-能力体系                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    应用层 (Apps Layer)                        │ │
│  │  251 应用 + 22 样板 + 173 精品项目                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    组件层 (Component Layer)                   │ │
│  │  @yyc3/ui v2.x (56 shadcn + 提取组件) + @yyc3/effects (38+)  │ │
│  │  + @yyc3/motion (动效) = 2,117+ 组件                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    AI 能力层 (AI Capability Layer)            │ │
│  │  @yyc3/core (认证/MCP/技能) + @yyc3/ai-hub (8 Agent)         │ │
│  │  + @yyc3/mcp-servers (8 Server) + @yyc3/emotion (情感)       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    工具链层 (Toolchain Layer)                 │ │
│  │  @yyc3/cli v2.0 + @yyc3/plugins (LSP) + @yyc3/ide            │ │
│  │  + @yyc3/i18n-core v2.4 (10 语言)                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    知识库层 (Knowledge Layer)                 │ │
│  │  PG 向量库 (200K+) + 1,694 文档 + 22 主题 + 多语言文档站     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

# 第十二章 风险与应对

| 风险 | 等级 | 应对策略 |
| ------ | ------ | ---------- |
| 双仓融合包名冲突 | 高 | 以 π³ 已发布包为准，UI-MONO 私包归档；逐一验证依赖兼容性 |
| 技术栈升级兼容性 | 高 | React 18→19 / Tailwind 3→4 逐包升级，冒烟测试全覆盖 |
| 模型生成代码质量不稳定 | 高 | 建立验证流水线 (AST + TS编译 + 视觉回归) |
| 组件迁移遗漏 | 中 | 建立组件清单 XLSX，逐包迁移 + diff 对比 |
| 主题体系合并冲突 | 中 | 去重对比 20 vs 22 套，合并为统一主题库 |
| RAG 检索召回率不足 | 中 | 扩充向量库至 200K+，优化 Embedding 模型 |
| Figma API 限制 | 中 | 使用 Plugin 本地处理 + 缓存机制 |
| CLI 双线并行混乱 | 中 | 统一为 @yyc3/cli v2.0，废弃 yyc3-cli |
| 模型推理延迟 | 低 | 14B 常驻 + 27B 按需分层 |

---

# 第十三章 6 大红色冲突精准解决方案 (Phase 0 实施)

> 基于双仓实际代码核查（2026-06-20），对第一章 1.3.3 节识别的 6 个红色冲突给出代码级、可执行的解决方案。
> **落地执行手册**：《YYC³-双仓融合-6大冲突解决实施方案.md》(V1.0) — 文件级操作步骤 + 代码变更 + 验证命令 + 回滚方案。

## 13.1 冲突全景与解决总览

```
┌──────────────────────────────────────────────────────────────────┐
│                  6 大红色冲突解决决策矩阵                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  冲突1 (🔴) @yyc3/ui 包名冲突                                      │
│  ├─ UI-MONO: @yyc3/ui v1.0.0 (private, ./index.ts)               │
│  ├─ π³:      @yyc3/ui v2.0.2 (published, dist/)                  │
│  └─ 决策: 保留 π³ v2.0.2，UI-MONO 提取差异化组件 → @yyc3/ui v2.1   │
│                                                                   │
│  冲突2 (🔴) CLI 双线并行                                           │
│  ├─ UI-MONO: @yanyucloud/cli v1.0.0 (yyc3-cli bin)               │
│  ├─ π³:      @yyc3/cli v1.1.1 (yyc3 + create-yyc3-app bin)        │
│  └─ 决策: 以 π³ @yyc3/cli 为基线 v2.0，吸收 @yanyucloud/cli 能力    │
│                                                                   │
│  冲突3 (🔴) MCP 工具双体系                                         │
│  ├─ UI-MONO: claude-prompts-root v1.7.0 (private)                │
│  ├─ π³:      @yyc3/mcp-servers v3.0.0 (8 Server, published)       │
│  └─ 决策: 以 π³ @yyc3/mcp-servers 为唯一标准                       │
│                                                                   │
│  冲突4 (🔴) 技能系统双线                                           │
│  ├─ UI-MONO: @yyc3/yyc3-skills v0.0.1 (空壳 private)              │
│  ├─ π³:      @yyc3/core skills v1.4.0 (完整实现)                  │
│  └─ 决策: 统一到 @yyc3/core/skills，废弃 yyc3-skills                │
│                                                                   │
│  冲突5 (🔴) 主题体系分裂                                           │
│  ├─ UI-MONO: U01-U20 标准化主题 (templates/themes/)               │
│  ├─ UI-MONO: yyc3-assets/themes/ 海量项目级主题 (100+)              │
│  ├─ π³:      @yyc3/ui 内置主题                                     │
│  └─ 决策: U01-U20 提升为 @yyc3/theme v2.0，assets 降级为参考        │
│                                                                   │
│  冲突6 (🔴) 技术栈代差                                             │
│  ├─ UI-MONO: React 18 + Next 14 + Tailwind 3                      │
│  ├─ π³:      React 18/19 兼容 + Tailwind 4 + tsup                 │
│  └─ 决策: UI-MONO 升级追平 (React 19 + Next 16 + Tailwind 4)       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 13.2 冲突 1：`@yyc3/ui` 包名冲突

### 实际状态核查

| 维度 | UI-MONO `packages/ui` | π³ `packages/ui` |
| ------ | ---------------------- | ------------------ |
| name | `@yyc3/ui` | `@yyc3/ui` |
| version | `1.0.0` | `2.0.2` |
| private | `true` | `false` (已发布 npm) |
| main | `./index.ts` (源码直出) | `./dist/index.js` (tsup 构建) |
| exports | `./` + `./*` (通配) | `.` + `./core` + `./components` + `./themes` + `./shadcn` |
| React | `^18.2.0` (peer) | `>=18.0.0 \|\| >=19.0.0` (peer，双兼容) |
| 构建 | 无 (源码即入口) | tsup + vitest + size-limit |
| 组件来源 | `packages/base/app/components/ui/*` (53 个 shadcn) | `src/shadcn/*` (56 个 shadcn) |

### 根因分析

1. UI-MONO 的 `@yyc3/ui` 是 workspace 内部包，`main: ./index.ts` 意味着直接消费源码，无构建步骤
2. π³ 的 `@yyc3/ui` 已发布到 npm，有完整构建链、测试、size-limit
3. 两者组件来源不同：UI-MONO 在 `packages/base/app/components/ui/`，π³ 在 `packages/ui/src/shadcn/`

### 解决方案：π³ 为基线 + UI-MONO 差异化组件回流

**Step 1**：以 π³ `@yyc3/ui` v2.0.2 为唯一标准包
**Step 2**：提取 UI-MONO `packages/base/app/components/ui/` 中 π³ 缺失的组件
**Step 3**：合并到 π³ `packages/ui/src/` 并发布 v2.1.0

```bash
# Step 1: 对比组件清单
diff <(ls YYC3-UI-MONO/packages/base/app/components/ui/ | sed 's/.tsx//' | sort) \
     <(ls YYC3-π³/packages/ui/src/shadcn/ | sed 's/.tsx//' | sort)

# Step 2: 提取 UI-MONO 独有组件 (预期: empty.tsx, field.tsx, input-group.tsx,
#         input-otp.tsx, item.tsx, kbd.tsx, spinner.tsx)
# 这些组件需迁移到 π³ packages/ui/src/shadcn/ 并补充测试

# Step 3: 升级 UI-MONO 的 package.json 指向 npm 包
# UI-MONO/packages/ui/package.json:
#   "name": "@yyc3/ui-internal",  ← 重命名避免冲突
#   "private": true,
#   或直接删除，workspace 依赖改为 " @yyc3/ui": "^2.1.0"
```

**迁移后验证**：

- UI-MONO `packages/base/package.json` 的依赖从 `workspace:*` 改为 `^2.1.0`
- 运行 `pnpm why @yyc3/ui` 确认无重复安装
- 运行 `pnpm --filter @yyc3/base build` 确认无类型错误

---

## 13.3 冲突 2：CLI 双线并行

### 实际状态核查

| 维度 | UI-MONO `tools/yyc3-cli` | π³ `packages/cli` |
| ------ | ------------------------- | ------------------- |
| name | `@yanyucloud/cli` | `@yyc3/cli` |
| version | `1.0.0` | `1.1.1` |
| bin | `yyc3-cli` | `yyc3` + `create-yyc3-app` |
| 语言 | JavaScript (CommonJS) | TypeScript (ESM, tsup) |
| commander | `^9.4.1` | `^12.0.0` |
| node | `>=14.0.0` | `>=18.0.0` |
| 测试 | jest | vitest |
| MCP | 无 | `@modelcontextprotocol/sdk ^1.12.0` |
| 子命令 | init/create/add (基础) | init/create/add/build/diff/docs/info/mcp/migrate/search/view (12命令) |

### 根因分析

1. UI-MONO 的 CLI 是早期 JavaScript 版本，包名 `@yanyucloud/cli`，bin 名 `yyc3-cli`
2. π³ 的 CLI 是完整重写的 TypeScript 版本，包名 `@yyc3/cli`，bin 名 `yyc3`
3. UI-MONO CLI 有独特的 `config/defaults/`、`config/environments/`、`config/security/` 配置体系
4. π³ CLI 有完整的 registry/preset/migrations/preflights 架构

### 解决方案：π³ `@yyc3/cli` v2.0 吸收 UI-MONO 配置体系

**Step 1**：以 π³ `@yyc3/cli` 为基线升级到 v2.0.0
**Step 2**：迁移 UI-MONO CLI 的独特资产到 π³

```bash
# 迁移清单 (UI-MONO 独有 → π³):
# 1. config/defaults/       → π³ packages/cli/src/templates/configs/
# 2. config/environments/   → π³ packages/cli/src/templates/env/
# 3. config/security/       → π³ packages/cli/src/commands/security.ts (新增)
# 4. YYC3-欢迎信息/         → π³ packages/cli/src/templates/welcome/
# 5. grafana/dashboard.json → π³ packages/cli/src/templates/observability/
# 6. k8s/                   → π³ packages/cli/src/templates/deploy/
```

**Step 3**：UI-MONO 的 `tools/yyc3-cli/` 标记为 DEPRECATED

```json
// UI-MONO/tools/yyc3-cli/packages/yyc3-cli/package.json
{
  "name": "@yanyucloud/cli",
  "version": "1.0.0",
  "description": "[DEPRECATED] 已迁移至 @yyc3/cli v2.0.0 (YYC3-π³)",
  "deprecated": true
}
```

**Step 4**：统一 bin 名称

```json
// π³ packages/cli/package.json (v2.0.0)
{
  "bin": {
    "yyc3": "./dist/bin.js",
    "yyc3-cli": "./dist/bin.js",           // ← 兼容旧用户
    "create-yyc3-app": "./dist/create-app.js"
  }
}
```

---

## 13.4 冲突 3：MCP 工具双体系

### 实际状态核查

| 维度 | UI-MONO `tools/yyc3-mcp` | π³ `packages/mcp-servers` |
| ------ | ------------------------ | --------------------------- |
| name | `claude-prompts-root` | `@yyc3/mcp-servers` |
| version | `1.7.0` | `3.0.0` |
| private | `true` | `false` (已发布) |
| 定位 | Claude Code 提示词根 + git hooks | 完整 MCP Server 实现 (8 Server) |
| Server 列表 | 无独立 Server | brave-search, claude-prompts, docker, filesystem, github, postgresql, yyc3cn |
| 测试 | 无 | vitest (adapter-ide, brave-search, cli, filesystem, prompt-registry, registry, server) |

### 根因分析

1. UI-MONO 的 `tools/yyc3-mcp` 实际是 `claude-prompts-root`，管理 Claude Code 的提示词和 git hooks，不是真正的 MCP Server
2. π³ 的 `@yyc3/mcp-servers` 是完整的 MCP 协议实现，含 8 个可即插即用的 Server
3. 两者定位完全不同，但都涉及"MCP"关键词造成混淆

### 解决方案：明确职责，π³ 为唯一 MCP 标准包

**Step 1**：UI-MONO `tools/yyc3-mcp` 重命名澄清职责

```json
// UI-MONO/tools/yyc3-mcp/package.json
{
  "name": "@yyc3/claude-prompts-root",
  "version": "1.7.0",
  "private": true,
  "description": "Claude Code 提示词根 + git hooks 工作区 (非 MCP Server)"
}
```

**Step 2**：将 UI-MONO 的 claude-prompts 资产贡献给 π³

```bash
# UI-MONO 的提示词资产 → π³ mcp-servers 的 claude-prompts Server
# π³ 已有: packages/mcp-servers/src/registry/servers/claude-prompts.ts
# 需将 UI-MONO 的提示词内容补充到 π³ 的 claude-prompts Server
```

**Step 3**：所有 MCP 能力调用统一通过 `@yyc3/mcp-servers`

```typescript
// 统一导入路径
import { createMCPServer, registry } from '@yyc3/mcp-servers'

// 获取可用 Server 列表
const servers = registry.list()
// ['brave-search', 'claude-prompts', 'docker', 'filesystem',
//  'github', 'postgresql', 'yyc3cn']
```

---

## 13.5 冲突 4：技能系统双线

### 实际状态核查

| 维度 | UI-MONO `tools/yyc3-skills` | π³ `@yyc3/core/skills` |
| ------ | --------------------------- | ------------------------ |
| name | `@yyc3/yyc3-skills` | `@yyc3/core` (skills 子模块) |
| version | `0.0.1` | `1.4.0` |
| private | `true` | `false` |
| 实现 | 空壳 (仅 package.json) | 完整实现 (8 个文件) |
| 文件 | 无 src/ | builtin.ts, industry-skills.ts, manager.ts, skill-composer.ts, skill-learner.ts, skill-quality-gates.ts, skill-recommender.ts |
| 测试 | 无 | skill-system.test.ts, skills.test.ts |

### 根因分析

1. UI-MONO 的 `@yyc3/yyc3-skills` 是空壳包，version 0.0.1，无任何源码
2. π³ 的技能系统是 `@yyc3/core` 的子模块，有完整实现 + 测试
3. 这是"占位符 vs 实现"的冲突，直接废弃占位符即可

### 解决方案：废弃空壳，统一到 `@yyc3/core/skills`

**Step 1**：UI-MONO `tools/yyc3-skills/` 标记为 DEPRECATED 并删除

```bash
# UI-MONO/tools/yyc3-skills/package.json 修改为:
{
  "name": "@yyc3/yyc3-skills",
  "version": "0.0.1",
  "private": true,
  "description": "[DEPRECATED] 已迁移至 @yyc3/core/skills (YYC3-π³)",
  "deprecated": true
}
```

**Step 2**：所有技能调用统一通过 `@yyc3/core/skills`

```typescript
// 统一导入路径
import {
  SkillManager,
  SkillComposer,
  SkillLearner,
  SkillRecommender,
  SkillQualityGates
} from '@yyc3/core/skills'

// 同理处理 @yyc3/yyc3-scripts
```

**Step 3**：核查 `@yyc3/yyc3-scripts` 同样处理

```bash
# UI-MONO/tools/yyc3-scripts/ 同样核查
# 若为空壳 → 废弃
# 若有实现 → 迁移到 π³ 对应包
```

---

## 13.6 冲突 5：主题体系分裂

### 实际状态核查

| 维度 | UI-MONO 标准主题 | UI-MONO assets 主题 | π³ 主题 |
| ------ | ----------------- | -------------------- | --------- |
| 位置 | `templates/themes/U01-U20` | `templates/code/01-Core/yyc3-assets/themes/` | `packages/ui/src/themes/` |
| 数量 | 20 套 (U01-U20) | 100+ 套 (项目级) | 内置于 @yyc3/ui |
| 命名 | `U01-cyberpunk-neon` 等 | 按业务分类 (ai-intelligent/medical-health 等) | 未明确编号 |
| 规范 | 统一 globals.css + app/globals.css | 各项目自带 globals.css | TypeScript 主题对象 |

### 根因分析

1. UI-MONO 有三层主题：标准化 U01-U20、项目级 yyc3-assets、无编号的 π³ 内置
2. U01-U20 是精心设计的标准化主题，有统一结构
3. yyc3-assets/themes/ 是从实际项目收集的海量主题，质量参差
4. π³ 的主题是代码级 TS 对象，与 CSS 变量体系不同

### 解决方案：三层归一，U01-U20 提升为 `@yyc3/theme` v2.0

**Step 1**：提取 U01-U20 为标准化主题包

```bash
# 新建 π³ packages/theme/ (或提升 UI-MONO packages/theme/)
# 结构:
# packages/theme/
# ├── src/
# │   ├── themes/
# │   │   ├── U01-cyberpunk-neon.css
# │   │   ├── U02-professional-dark.css
# │   │   ├── ...
# │   │   └── U20-social-warm.css
# │   ├── index.ts          # 主题注册器
# │   └── types.ts          # 主题类型定义
# └── package.json
```

**Step 2**：yyc3-assets/themes/ 降级为参考素材库

```bash
# UI-MONO/templates/code/01-Core/yyc3-assets/themes/
# → 重命名为 docs/theme-references/ (非标准化参考)
# 用于 AI 训练素材，不作为生产主题
```

**Step 3**：π³ @yyc3/ui 内置主题与 U01-U20 对齐

```typescript
// π³ packages/ui/src/themes/index.ts
import { themeRegistry } from '@yyc3/theme'

// U01-U20 作为标准主题注入 @yyc3/ui
export const themes = {
  ...themeRegistry.getAll(),  // U01-U20
  // π³ 原有内置主题保留为 U21-U22 (补充)
}
```

**Step 4**：主题命名最终统一

```
U01-cyberpunk-neon      ← UI-MONO 原有
U02-professional-dark   ← UI-MONO 原有
...
U20-social-warm         ← UI-MONO 原有
U21-aurora-π³           ← π³ 新增 (π³ 默认主题)
U22-family-compass      ← π³ 新增 (AI Family 主题)
= 22 套统一主题
```

---

## 13.7 冲突 6：技术栈代差

### 实际状态核查

| 维度 | UI-MONO | π³ | 差距 |
| ------ | --------- | ----- | ------ |
| React | `^18.2.0` | `>=18.0.0 \|\| >=19.0.0` | UI-MONO 锁定 18 |
| Next.js | `14.1.4` (精确版本) | 无直接依赖 (库包) | UI-MONO 需升级 |
| Tailwind | `^3.4.1` (@yyc3/theme) | `^3.0.0` (tailwind-merge) | 两者都在 3.x |
| TypeScript | `^5` | `^5.0.0` - `^5.8.0` | 基本对齐 |
| 构建 | 源码直出 (无构建) | tsup 统一 | UI-MONO 需补构建 |
| 测试 | 无 | vitest (840+ 用例) | UI-MONO 需补测试 |
| packageManager | `pnpm@9.0.0` | pnpm >=8.0.0 | 基本对齐 |

### 根因分析

1. UI-MONO 是应用导向，直接消费源码，无独立构建步骤
2. π³ 是库导向，每个包都有 tsup 构建 + vitest 测试
3. React 18→19 是 breaking change，需逐包验证
4. Tailwind 3→4 涉及配置体系变化

### 解决方案：分阶段升级，UI-MONO 追平 π³

**Phase A：React 18 → 19 (最高优先级)**

```bash
# UI-MONO 根 package.json
# "packageManager": "pnpm@9.0.0" ← 保持

# 逐包升级 React (使用 pnpm 的 workspace 过滤)
pnpm -r --filter "@yyc3/*" exec pnpm add react@^19.0.0 react-dom@^19.0.0
pnpm -r --filter "@yyc3/*" exec pnpm add -D @types/react@^19.0.0 @types/react-dom@^19.0.0

# 验证: React 19 主要 breaking changes
# 1. useFormStatus (新增)
# 2. <Context> 直接可用 (无需 Context.Provider)
# 3. ref 作为 prop (无需 forwardRef)
# 4. use() hook (新增)
# 5. Actions (新增)
```

**Phase B：Next.js 14 → 16**

```bash
# UI-MONO/packages/base/package.json
# "next": "14.1.4" → "^16.0.0"

# Next 16 适配 (Turbopack 默认):
# 1. middleware.ts → proxy.ts (破坏性重命名)
# 2. cookies()/headers()/params/searchParams 全异步 (await)
# 3. 检查 generateMetadata 签名变化
# 4. 检查 caching 默认行为变化 (默认 no-store)
# 5. next lint 移除 → ESLint CLI + flat config
```

**Phase C：Tailwind 3 → 4**

```bash
# UI-MONO/packages/theme/package.json
# "tailwindcss": "^3.4.1" → "^4.0.0"

# Tailwind 4 主要变化:
# 1. CSS-first 配置 (@theme 替代 tailwind.config.js)
# 2. Oxide 引擎 (性能提升)
# 3. 自动内容检测
# 4. CSS 变量原生支持
# 需迁移 tailwind.config.ts → @theme {} CSS 块
```

**Phase D：补充构建链 (对齐 π³)**

```bash
# 为 UI-MONO 的 packages/* 补充构建配置
# UI-MONO/packages/ui/ 新增:
# ├── tsup.config.ts
# ├── vitest.config.ts
# └── package.json (main: ./dist/index.js)

# UI-MONO/packages/theme/ 新增:
# ├── tsup.config.ts
# └── package.json (main: ./dist/index.js)
```

---

## 13.8 实施时间表与验证清单

### 实施顺序 (依赖关系驱动)

```
Week 1:
  Day 1-2: 冲突4 (技能系统) ← 最简单，空壳废弃
  Day 3-4: 冲突3 (MCP 工具)  ← 重命名澄清
  Day 5:   冲突1 (ui 包名)   ← 组件清单对比

Week 2:
  Day 1-2: 冲突2 (CLI 统一)  ← 资产迁移
  Day 3-4: 冲突5 (主题合并)  ← U01-U20 提取
  Day 5:   冲突6 (技术栈)    ← 开始 React 19 升级

Week 3-4: 冲突6 深度升级 + 全链路验证
```

### 验证清单 (每个冲突解决后执行)

```bash
# 通用验证 (每个冲突)
pnpm install                  # 依赖安装无冲突
pnpm -r run typecheck         # 类型检查通过
pnpm -r run build             # 构建成功
pnpm -r run test              # 测试通过
pnpm why @yyc3/ui             # 无重复安装
pnpm why @yyc3/cli            # 无重复安装

# 冲突1 专属验证
ls YYC3-π³/packages/ui/src/shadcn/*.tsx | wc -l  # 组件数 ≥ 56
diff <(ls UI-MONO/.../ui/) <(ls π³/.../shadcn/)   # 差异已消除

# 冲突6 专属验证
grep '"react"' UI-MONO/packages/*/package.json    # 全部 ^19.0.0
grep '"next"' UI-MONO/packages/*/package.json     # 全部 ^15.0.0
grep '"tailwindcss"' UI-MONO/packages/theme/package.json  # ^4.0.0
```

### 回归保障

| 保障措施 | 说明 |
| ---------- | ------ |
| Git 分支策略 | 每个 conflict-N 独立分支，PR 合并到 `phase0/integration` |
| 冒烟测试 | 每个冲突解决后运行 `pnpm -r run build && pnpm -r run test` |
| 视觉回归 | U01-U20 主题升级后截图对比 (Playwright) |
| 发布锁定 | Phase 0 期间冻结 npm 发布，完成后统一发布 v2.0.0 |

---

## 附录：与已有资产的关系

```
已有资产 (双仓)                          推进规划产物
────────────────────────────────       ──────────────────────────
【YYC3-UI-MONO · UI 资产底座】
yyc3-cli v2.0.0                   ──→  @yyc3/cli v2.0 (融合版)
@yyc3/ui v1.0.0 (private)         ──→  @yyc3/ui v2.x (合并到 π³)
@yyc3/base v1.0.0                 ──→  基础组件模式库
@yyc3/theme v1.0.0                ──→  主题注入引擎
yyc3-mcp v1.7.0                   ──→  @yyc3/mcp-servers v3.0 (合并)
@yyc3/yyc3-skills v0.0.1          ──→  @yyc3/core skills (统一)
@yyc3/yyc3-scripts v0.0.1         ──→  自动化脚本工具集
20 套主题 (U01-U20)               ──→  统一主题注入引擎 (22 套)
22 套样板 (T01-T22)               ──→  页面模式模板库
2,061+ TSX 组件 (apps/)           ──→  组件生成训练集 (2,117+)
173 精品项目 (251 apps)           ──→  代码模式提取底座
1,694 篇设计文档                  ──→  RAG 知识检索底座
182K 向量知识库                   ──→  统一 PG 向量库 (200K+)

【YYC3-π³ · AI 智能中枢】
@yyc3/core v1.4.0                 ──→  统一认证/MCP/技能引擎
@yyc3/ai-hub v1.4.2               ──→  8 Agent 多智能体协作
@yyc3/ui v2.0.2                   ──→  统一组件库 (56 shadcn + 提取)
@yyc3/effects v1.0.0              ──→  特效组件注入引擎
@yyc3/plugins v1.4.2              ──→  LSP 语言服务器
@yyc3/i18n-core v2.4.0            ──→  AI 国际化 (10 语言)
@yyc3/emotion v1.0.0              ──→  情感引擎
@yyc3/mcp-servers v3.0.0          ──→  MCP 编排层 (8 Server)
@yyc3/motion v1.0.0               ──→  动效引擎
@yyc3/cli v1.1.1                  ──→  @yyc3/cli v2.0 (融合版)
@yyc3/ide v1.0.0                  ──→  IDE 智能开发环境
840+ 测试用例 / 82% 覆盖率        ──→  验证流水线
多语言文档站 (10+ 语言)           ──→  AI 知识检索增强

【基础设施】
Qwen3.6-27B-FP8                   ──→  核心推理引擎
Qwen3-14B-YYC3-merged             ──→  前端高频 API
DGX Spark                         ──→  Docker 部署 + FP8 加速
GitHub Actions + changesets       ──→  统一 CI/CD 发布流水线
```

---

*本白皮书由 YYC³ 总控工程师导师基于五维驱动全域模型矩阵体系编制*
*适用于: YYC³ 团队内部 · 非商用 · 专项技术栈*
*关联文档: 《YYC³-双仓融合-6大冲突解决实施方案.md》(V1.0 · Phase 0 落地执行手册) 《YYC³ 五维驱动全域模型矩阵白皮书》《YYC³ 大模型选型量化科学论证 v2.0.0》《YYC³ 基座模型全链路分析规划定版》*
