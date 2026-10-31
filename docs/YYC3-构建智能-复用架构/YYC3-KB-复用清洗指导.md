# YYC3-KB-复用清洗指导

## 📊 诊断结论：你的 132 个项目正在经历什么

### 核心数据

| 指标                 | 数值                                               |
| -------------------- | -------------------------------------------------- |
| 项目总数             | 132                                                |
| Next.js (App Router) | **91 (69%)**                                       |
| 重复组               | **1235 组**（🔴 严重 895, 🟠 高 301）                |
| 共享依赖重叠率       | **85%~89%**（几乎所有项目共享 55+ 个 Radix UI 包） |
| 有 Dockerfile        | 仅 7 个 (5%)                                       |
| 有 CI/CD             | 仅 10 个 (8%)                                      |
| 有 License           | 仅 5 个 (4%)                                       |

**一句话诊断**：132 个项目中，绝大多数是从同一个 "Next.js + Radix UI + shadcn/ui + pnpm" 模板复制出来，只改了业务页面代码。这就是 1235 组重复的根源。

### 你现有的基础设施

```
/Volumes/Development/YYC3-π³/
├── packages/cli/          ← @yyc3/cli（已有脚手架能力）
│   ├── src/create-app.ts   ← create-yyc3-app（4 模板 + 端口映射）
│   ├── src/templates/      ← next/vite/start/astro/laravel 模板引擎
│   ├── src/preset/         ← nova/vega/maia/lyra/mira 等主题预设
│   ├── src/commands/       ← init/add/apply/diff/migrate/search/build/mcp
│   └── registry/           ← 组件注册表（card-3d/spline-scene/spotlight）
├── packages/core/          ← @yyc3/core（AI Family + MCP + Auth）
├── packages/ai-hub/        ← @yyc3/ai-hub（Agents + Skills）
└── packages/ui/            ← @yyc3/ui（隐含在 CLI 中）
```

**关键发现**：`@yyc3/cli` 已经是一个功能完备的脚手架系统（fork 自 shadcn/ui CLI），具备：

- `create-yyc3-app` → 一键创建项目
- `yyc3 init` → 初始化 shadcn/ui + 主题预设
- `yyc3 add` → 添加组件
- 模板系统 + 注册表 + 迁移工具

---

## 🏗 实施方案：从 132 个复制体到 1 个模板体系

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    YYC³ Template System                       │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ Git Template  │   │ @yyc3/cli    │   │ 清洗工作区    │     │
│  │ Repository    │──▶│ Scaffold     │──▶│ /sandbox/     │     │
│  │               │   │              │   │               │     │
│  │ templates/    │   │ create-yyc3- │   │ 隔离、可重置   │     │
│  │ ├── dashboard │   │ app          │   │ 不污染原始项目 │     │
│  │ ├── ai-app    │   │              │   │               │     │
│  │ ├── landing   │   │ yyc3 init    │   └──────┬───────┘     │
│  │ ├── api       │   │ yyc3 add     │          │             │
│  │ ├── medical   │   │ yyc3 apply   │          ▼             │
│  │ ├── edu       │   └──────────────┘   ┌──────────────┐    │
│  │ └── ...       │                      │ YYC3-π³      │    │
│  └──────────────┘                       │ Monorepo     │    │
│                                          │ (共享核心)   │    │
│                                          └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 第一步：建立 Git 模板仓库

在 `YYC3-π³` 的 `packages/cli` 中扩展模板系统：

**目标**：将 132 个项目归纳为 6~8 个核心模板

```
# 从分析报告提取的模板归类：

Dashboard 类（4 个变体 → 1 个模板）
├── yyc3-platform-cloud-dashboard-3
├── yyc3-platform-cloud-futuristic-dashboard-3
├── yyc3-tools-devtemplate-futuristic-dashboard
└── yyc3-platform-management-admin-system-3
   → 模板: dashboard（侧边栏 + 数据表格 + 图表）

AI Platform 类（10+ 个变体 → 1 个模板）
├── yyc3-ai-application-easyvizai
├── yyc3-ai-platform-mana
├── yyc3-ai-platform-management
└── yyc3-ai-llm-ai
   → 模板: ai-platform（对话界面 + 模型管理 + 工具调用）

Landing Page 类（2 个变体 → 1 个模板）
├── yyc3-ai-application-landing-page
└── yyc3-tools-devtemplate-ai-robotics-landing-page
   → 模板: landing（品牌展示 + 3D + 动效）

Medical 类（2 个变体 → 1 个模板）
├── yyc3-other-med-01
└── yyc3-other-medical
   → 模板: medical（医疗数据 + 仪表盘）

Education 类（2 个变体 → 1 个模板）
├── yyc3-edu-learning-hub
└── yyc3-ai-application-learning-platform
   → 模板: education（课程 + 学习路径）

API Service 类（2 个变体 → 1 个模板）
├── yyc3-platform-cloud-mdy-api
└── yyc3-platform-cloud-api-3
   → 模板: api（RESTful + 认证 + 中间件）
```

### 第二步：扩展 `create-yyc3-app` 模板

修改 [create-app.ts](file:///Volumes/Development/YYC3-π³/packages/cli/src/create-app.ts)，将现有 4 个模板扩展并接入 Git 模板仓库：

```typescript
// packages/cli/src/create-app.ts 中的关键改动

const TEMPLATES = [
  { title: "Dashboard 仪表盘", value: "dashboard", description: "侧边栏+内容区+数据表格", port: 3201 },
  { title: "AI Platform AI平台", value: "ai-platform", description: "对话界面+模型管理+工具调用", port: 3300 },
  { title: "Landing Page 着陆页", value: "landing", description: "品牌展示+Spline 3D+动效", port: 3200 },
  { title: "API Service API服务", value: "api", description: "RESTful API+认证+中间件", port: 3400 },
  { title: "Medical 医疗系统", value: "medical", description: "医疗数据+仪表盘+患者管理", port: 3210 },
  { title: "Education 教育平台", value: "education", description: "课程管理+学习路径+测验", port: 3220 },
  { title: "Management 管理后台", value: "management", description: "RBAC+CRUD+审批流", port: 3230 },
  { title: "SaaS Platform SaaS平台", value: "saas", description: "多租户+订阅+计费", port: 3240 },
]
```

### 第三步：建立模板仓库的目录结构

```
Git-YY-Nexus/
└── yyc3-tools-devtemplate/          ← 已有的模板目录
    ├── _base/                        ← 新增：共享基础层
    │   ├── package.json.tpl          ← 模板化的 package.json
    │   ├── tsconfig.json
    │   ├── next.config.ts
    │   ├── postcss.config.mjs
    │   ├── tailwind.css
    │   └── .env.example
    ├── dashboard/
    │   ├── TEMPLATE.json             ← 模板元数据
    │   ├── src/app/layout.tsx.tpl
    │   ├── src/app/page.tsx.tpl
    │   ├── src/components/sidebar.tsx
    │   ├── src/components/data-table.tsx
    │   └── src/lib/chart-config.ts
    ├── ai-platform/
    │   ├── TEMPLATE.json
    │   ├── src/app/layout.tsx.tpl
    │   ├── src/components/chat-panel.tsx
    │   ├── src/components/model-selector.tsx
    │   └── src/lib/ai-client.ts
    ├── landing/
    │   ├── TEMPLATE.json
    │   ├── src/components/hero-section.tsx
    │   └── src/components/3d-scene.tsx
    └── ...
```

**TEMPLATE.json** 示例：

```json
{
  "name": "dashboard",
  "title": "Dashboard 仪表盘",
  "version": "1.0.0",
  "framework": "next-app",
  "port": 3201,
  "dependencies": {
    "recharts": "^2.12.0",
    "@tanstack/react-table": "^8.0.0"
  },
  "components": ["sidebar", "data-table", "chart-card", "header"],
  "presets": ["yyc3-dark", "yyc3-light", "yyc3-brand", "nova"]
}
```

### 第四步：在 `@yyc3/cli` 中新增 `scaffold` 命令

```
# 用户工作流（目标体验）

# 1. 一条命令创建新项目
npx create-yyc3-app my-dashboard --template dashboard --preset yyc3-dark

# 2. 或交互式选择
npx create-yyc3-app my-project
> 选择模板: Dashboard 仪表盘
> 选择预设: YYC³ Dark (Cyberpunk)
> ✅ 创建完成！端口: 3201

# 3. 在已有项目中添加组件
cd my-dashboard
yyc3 add sidebar
yyc3 add data-table
yyc3 add chart-card

# 4. 应用完整模板到清洗工作区
yyc3 scaffold dashboard --sandbox /Volumes/Sandbox/my-test
# ↑ 在隔离沙箱中生成，不影响原始项目
```

### 第五步：清洗工作区机制

```
/Volumes/Sandbox/                    ← 清洗专用根目录（可随时 rm -rf）
├── my-dashboard-test/               ← 从模板生成的测试项目
├── ai-platform-v2/                  ← 测试新版本模板
└── ...

# 一键重置
yyc3 sandbox reset                   ← 清空所有沙箱项目
yyc3 sandbox list                    ← 列出当前沙箱
```

### 实施路线图

| 阶段        | 任务                                   | 基于现有代码                                                                        |
| ----------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| **Phase 1** | 扩展 `create-app.ts` 的 TEMPLATES 数组 | [create-app.ts](file:///Volumes/Development/YYC3-π³/packages/cli/src/create-app.ts) |
| **Phase 2** | 创建 `_base/` 共享基础层 + 各模板目录  | 在 `Git-YY-Nexus/yyc3-tools-devtemplate/` 下                                        |
| **Phase 3** | 在 `@yyc3/cli` 新增 `scaffold` 命令    | 在[commands/](file:///Volumes/Development/YYC3-π³/packages/cli/src/commands) 新增   |
| **Phase 4** | 新增 `sandbox` 子命令                  | 复用 `create-project.ts` 的逻辑                                                     |
| **Phase 5** | 从 132 个项目中提取业务代码为模板      | 用分析报告指导提取                                                                  |
| **Phase 6** | 迁移现有项目到模板体系                 | 逐步替换，保留 Git 历史                                                             |

### 你现在可以立即做的事情

**最快路径**：直接扩展 `create-yyc3-app`，不需要新建任何仓库

```bash
cd /Volumes/Development/YYC3-π³/packages/cli

# 1. 编辑 create-app.ts，添加新模板类型
# 2. 在 src/templates/ 下创建对应的模板文件生成逻辑
# 3. 构建 & 测试
pnpm build
node dist/create-app.js test-project --template dashboard --preset yyc3-dark
```

需要我开始实施哪个阶段？

toolName: todo_write

status: success

Todos updated: 4 items

以上就是基于分析报告的完整诊断和 6 阶段实施方案。核心思路是：

1. **你的 `@yyc3/cli` 已经具备 80% 的脚手架能力**，只需扩展模板数量和增加 `scaffold`/`sandbox` 命令
2. **132 个项目的 1235 组重复，本质上是同一个模板的变体**，归纳为 6~8 个核心模板即可覆盖
3. **清洗工作区用 `/Volumes/Sandbox/` 隔离**，随时可 `rm -rf` 重置，不污染原始项目
