---
file: README.md
description: YYC³ CloudPivot Intelli-Matrix — 云枢多维智能运维矩阵项目自述文件
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-10-05
updated: 2026-10-05
status: stable
tags: [readme],[overview],[quickstart]
category: project
language: zh-CN
audience: developers,managers,stakeholders
complexity: beginner
project: yyc3-cloudpivot-intelli-matrix
---

<div align="center">

# YYC³ CloudPivot Intelli-Matrix

### 云枢多维智能运维矩阵

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

**版本** v1.0.0 · **许可证** MIT · **包管理** pnpm 11 · **状态** Active Development

</div>

---

## 📋 目录

- [项目简介](#项目简介)
- [功能全景](#功能全景)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [脚本命令](#脚本命令)
- [目录结构](#目录结构)
- [测试与质量](#测试与质量)
- [环境变量](#环境变量)
- [文档体系](#文档体系)
- [贡献与支持](#贡献与支持)

---

## 项目简介

**YYC³ CloudPivot Intelli-Matrix（云枢多维智能运维矩阵）** 是 YanYuCloudCube 团队面向智能运维（AIOps）场景打造的统一前端工作台，将数据监控、巡检、运营、AI 诊断、AI 家族助手、开发工具与系统管理整合进一个可主题定制、双语、PWA 就绪的单页应用。

| 属性 | 值 |
| ---- | -- |
| **业务定位** | 多维智能运维矩阵（监控 · 运维 · AI · 开发 · 管理） |
| **用户群体** | 运维工程师 / 系统管理员 |
| **功能规模** | 37 条路由 · 6 大功能域 · 80+ 业务组件 |
| **质量基线** | TS Strict 0 错误 · 1865 单元测试 · 依赖 0 高危漏洞 |

## 功能全景

```text
云枢智能运维矩阵
├── 📊 monitor  监控域    数据监控大盘 · 性能监控 · 告警规则
├── 🔧 ops      运维域    运营中心 · 巡检看板 · 安全监控 · 数据库管理
├── 🤖 ai       智能域    AI 建议 · AI 诊断 · 模型提供方管理
├── 👨‍👩‍👧 ai-family 家族群   对话 · 语音 · 成长 · 学习 · 活动 · 音乐
├── 🛠 dev      开发域    CLI 终端 · IDE 面板 · 架构审计 · 主题定制 · 设计系统
└── ⚙️ admin    管理域    用户管理 · 系统设置 · 操作审计 · 报表导出 · 环境配置
```

完整路由清单见 [routes.ts](routes.ts)。

## 技术栈

| 层级 | 技术 | 版本 |
| ---- | ---- | ---- |
| 构建 | Vite | ^6.0 |
| 框架 | React + react-router (Hash) | ^18.3 / ^7.1 |
| 语言 | TypeScript (strict) | ^5.7 |
| 样式 | Tailwind CSS | ^4.0 |
| 组件 | Radix UI + shadcn/ui 惯例 + lucide-react | latest |
| 状态 | Zustand | ^5.0 |
| 数据 | Supabase 客户端（当前内置 Mock 实现） | - |
| AI | Ollama 本地推理 + 多模型面板 | - |
| 测试 | Vitest + React Testing Library + Playwright | ^3.2 |
| 包管理 | pnpm | 11.10 |

## 快速开始

> **开发服务器端口：3030 起** 🚨（YYC³ 团队规范）

```bash
# 1. 安装依赖（要求 Node.js ≥ 18, pnpm ≥ 9）
pnpm install

# 2. 启动开发服务器（http://localhost:3030）
pnpm dev

# 3. 生产构建（含 tsc 类型门禁）
pnpm build

# 4. 预览构建产物
pnpm preview
```

首次进入会展示登录页；演示环境下可使用「幽灵登录」直接进入（生产部署前须按 [SECURITY.md](SECURITY.md) 禁用）。

## 脚本命令

| 命令 | 说明 |
| ---- | ---- |
| `pnpm dev` | 启动开发服务器（端口 3030，host 模式） |
| `pnpm build` | 类型检查 + Vite 生产构建 |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm test` | 运行全部单元测试（Vitest, jsdom） |
| `pnpm test:watch` | 监听模式运行测试 |
| `pnpm test:e2e` | 运行 Playwright 端到端测试 |

## 目录结构

```text
app/
├── App.tsx               # 应用根组件：认证状态机 + 全局错误分层
├── routes.ts             # 路由表（37 条，Hash Router）
├── main.tsx              # 入口
├── components/           # 业务组件（80+，含 ai-family/design-system/ide/theme/ui 子域）
├── lib/                  # 核心库（supabaseClient / error-handler / authContext 等 17 个模块）
├── hooks/                # 自定义 Hooks（30 个，含 useI18n / useYYC3Head）
├── store/                # Zustand 状态切片
├── stores/               # 领域数据存储
├── i18n/                 # 语言包（zh-CN / en-US）
├── __tests__/            # 单元测试（117 文件）+ e2e/
├── public/               # 静态资源（PWA 图标等）
├── docs/                 # 团队规范 + 会话归档文档
└── reports/              # Logo 审计截图等产物
```

## 测试与质量

| 门禁 | 命令 | 当前基线 |
| ---- | ---- | -------- |
| 类型检查 | `npx tsc --noEmit` | ✅ 0 错误 |
| 单元测试 | `pnpm test` | 1849/1865（99.1%） |
| 依赖安全 | `pnpm audit --prod` | ✅ 0 漏洞 |
| 构建 | `pnpm build` | ✅ 通过（主包体积治理中） |

测试规范与验收标准详见团队文档：[docs/YYC3-团队资产-标准规范/YYC3-项目闭环-验收系统](docs/YYC3-团队资产-标准规范/YYC3-项目闭环-验收系统/)。

## 环境变量

复制 `.env.local` 按需配置（**禁止提交真实密钥**）：

| 变量 | 说明 |
| ---- | ---- |
| `VITE_YYC3_ENABLE_MOCK` | 启用 Mock 数据层 |
| `VITE_YYC3_ENABLE_DEBUG` | 启用调试日志 |
| `VITE_YYC3_OLLAMA_BASE_URL` | Ollama 服务地址（AI 功能） |

## 文档体系

| 文档 | 说明 |
| ---- | ---- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南（提交规范 / 开发循环 / 门禁） |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 行为准则 |
| [SECURITY.md](SECURITY.md) | 安全政策（漏洞报告流程） |
| [LICENSE](LICENSE) | MIT 许可证 |
| [docs/YYC3-团队资产-标准规范/](docs/YYC3-团队资产-标准规范/) | 五维驱动机制 · 开发标准 · 验收体系 · 开发者指南 |

## 贡献与支持

- **问题反馈**：<admin@0379.email>
- **贡献流程**：阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 后提交 PR
- **安全漏洞**：请勿公开披露，按 [SECURITY.md](SECURITY.md) 私密上报

---

<div align="center">

**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**

> 「**_YanYuCloudCube_**」言启象限 | 语枢未来
> 「**_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**」

</div>
