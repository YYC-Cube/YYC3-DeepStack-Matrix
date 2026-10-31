
发现绝大多数项目只是同一套技术栈的不同“皮肤”甚至仅仅是文件夹副本，那确实需要一次彻底的**范式转换**。你现在拥有的是一个**巨型代码资产池**——这正是建立“即拉即用”框架的最佳原材料。

下面给你一套**可直接落地的多维闭环方案**。它会让你彻底走出”重复造轮子“的循环，并建立起一个**可持续演进的开发体系**。

---

## 一、核心理念：从“项目副本”到“框架 + 场景配置”

你的每个项目 = **基础框架（90%共性）** + **业务配置 + 少量定制页面（10%差异）**

所以目标不是合并代码，而是：

1. **抽取共性** → 形成一个稳定、可升级的 `@yyc3/framework` (包含核心UI、布局、工具、AI集成等)
2. **场景化配置** → 每个原项目退化为一个 `yyc3.scene.json` 文件 + 少量业务专属文件
3. **CLI 脚手架** → 用一条命令即可从场景配置生成全新项目，并支持后续增量更新

---

## 二、最终成果物（一周后可交付）

| 产出物                | 说明                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **`@yyc3/framework`** | 一个标准的 Next.js + shadcn/ui + Radix UI 应用骨架，含路由、布局、主题、API 模板、常用 hooks 等                  |
| **`@yyc3/ui`**        | 所有 shadcn/Radix 组件的统一封装，可独立发包                                                                     |
| **`@yyc3/cli`**       | 提供 `create`, `add`, `update`, `sync` 等命令                                                                    |
| **场景配置库**        | 从现有项目中提炼的 10~20 个典型场景配置文件（如：`admin-dashboard`, `landing-page`, `ai-chat`, `e-commerce` 等） |
| **代码生成器**        | 基于 `plop` 或自定义模板引擎，快速生成页面、组件、API 路由                                                       |
| **统一预览站**        | 一个 Storybook 或独立站点，展示所有可复用组件和场景                                                              |

---

## 三、分阶段执行路线图（按天/周）

### 第一阶段：底层抽象与包拆分（2天）

**目标**：将共性代码抽取到独立包中，并在一个干净的 Monorepo 中组织。

```bash
# 建议使用 pnpm workspace + turborepo 结构
yyc3-monorepo/
├── packages/
│   ├── framework/       # 核心应用骨架（含 next.config.js, 全局样式, 布局组件）
│   ├── ui/              # 组件库 (shadcn + Radix 二次封装)
│   ├── config/          # ESLint, Prettier, TS 配置
│   ├── cli/             # CLI 工具
│   └── scenes/          # 场景配置集（JSON + 定制代码）
├── apps/
│   └── storybook/       # 组件演示
└── tools/               # 代码生成脚本
```

**具体动作**：

1. 选取一个最干净、依赖最新的项目（例如 `YYC³-3`）作为**种子项目**。
2. 将 `components/ui` 目录完整复制到 `packages/ui`，并配置导出。
3. 将 `app` 目录下的通用布局（layout, dashboard-layout, landing-layout）移至 `packages/framework`。
4. 将 `lib/utils`, `hooks` 等工具函数移至 `packages/core`。
5. 使用 `pnpm catalog` 统一所有依赖版本。

**产出**：三个可发布的 npm 包（先不发布到 registry，仅在本地 workspace 引用）。

---

### 第二阶段：场景配置化（3天）

**目标**：将每个原项目转化为一个“场景定义 + 差异代码”。

#### 2.1 编写场景扫描脚本

利用你已有的分析报告，自动为每个项目生成一个初始 `yyc3.scene.json`：

```json
{
  "name": "经济管理数字分析",
  "type": "dashboard",
  "theme": "yyc3-dark",
  "defaultRoute": "/dashboard",
  "features": ["ai-assistant", "data-export"],
  "apiBase": "/api/v1",
  "customFiles": [
    "app/dashboard/page.tsx",
    "app/api/reports/route.ts"
  ]
}
```

扫描脚本逻辑：

- 读取 `package.json` 识别特有依赖。
- 遍历 `app/` 目录，记录非通用页面（对比骨架项目的页面列表）。
- 检查 `tailwind.config.js` 或 `globals.css` 的主题变体。

#### 2.2 差异代码迁移

对于每个原项目，将“通用部分”删除，只保留 `customFiles` 中列出的文件。这些文件会被放入 `packages/scenes/{sceneName}/` 下。

例如：`packages/scenes/economic-analytics/app/dashboard/page.tsx`。

#### 2.3 建立场景索引

创建 `packages/scenes/index.ts`，导出所有场景的元数据和自定义模块。

**产出**：一个场景仓库，每个场景是一个独立子包，可以被 CLI 动态引用。

---

### 第三阶段：CLI 命令实现（2天）

基于你已有的 `yyc3-cli`，新增以下命令：

| 命令                                 | 功能                                     |
| ------------------------------------ | ---------------------------------------- |
| `yyc3 new <name> --scene <scene-id>` | 创建新项目，基于指定场景                 |
| `yyc3 scene list`                    | 列出所有可用场景                         |
| `yyc3 scene create`                  | 交互式创建新场景（从现有项目提炼）       |
| `yyc3 sync`                          | 将当前项目与框架最新版本同步（合并更新） |
| `yyc3 add <component>`               | 添加 shadcn 组件（自动使用 @yyc3/ui）    |

**核心实现逻辑** (`new` 命令)：

```typescript
// 伪代码
1. 创建目标文件夹
2. 从 `packages/framework` 复制基础模板（除 `node_modules`, `.next` 等）
3. 修改 `package.json`：将 `@yyc3/*` 依赖改为本地路径或 npm 版本
4. 根据场景配置：
   - 合并 `tailwind.config.js` 的主题
   - 复制 `customFiles` 到对应位置
   - 生成环境变量文件（.env.local）
5. 执行 `pnpm install` 和 `pnpm build`
```

**同步命令 `sync`** 的妙用：当框架升级时（例如 Next.js 从 14 到 15），你可以修改框架模板，然后对每个已存在的项目运行 `yyc3 sync`，它会智能合并更新（不会覆盖业务代码）。

---

### 第四阶段：建立持续演进机制（常态化）

完成上述三步后，你不再需要手动创建新项目。但如何保证**不复旧辙**？

#### 4.1 规范

- 任何新页面/组件必须先在 `@yyc3/ui` 或 `@yyc3/framework` 中开发，并通过 Storybook 验证。
- 业务项目只允许通过 `yyc3 add` 添加组件，禁止直接复制第三方组件到项目内。
- 定期运行 `yyc3 sync` 确保所有项目依赖和框架代码一致。

#### 4.2 自动化 CI

- 在 Monorepo 中配置 GitHub Actions：push 到 `main` 时自动发布 `@yyc3/*` 包（alpha/beta）。
- 每个业务项目可配置 Renovate 自动升级框架包。
- 添加一个面板（例如 Vercel 部署的 dashboard）展示所有场景的健康状态和版本。

#### 4.3 知识沉淀

- 用 `docusaurus` 或 `vitepress` 搭建内部文档中心，收录场景设计指南、组件 API、CLI 使用教程。
- 将你之前的学习笔记整理成“架构决策记录（ADR）”。

---

## 四、落地过程中的关键注意事项

### 1. 选择性处理旧项目

- **不必一次性迁移所有 80+ 项目**。先选择 3-5 个最具代表性的（如 `YYC³-3`, `admin-dashboard`, `ai-chat`）完成整个流程，验证可行性。
- 其余项目可以**标记为“废弃”或“存档”**，等到需要使用时再通过 `yyc3 scene create` 重新生成即可。

### 2. 保留 Git 历史

- 在抽取过程中，可以用 `git filter-branch` 或 `subtree` 保留原项目的提交历史，但这不是必须的。建议直接在新 Monorepo 中重新提交干净代码。

### 3. 避免过度抽象

- 不要试图让框架满足所有历史项目的奇葩需求。如果一个定制逻辑超过 3 个项目都没有，就将其作为场景专属代码留在场景包里。

### 4. 版本管理策略

- `@yyc3/framework` 遵循语义化版本，主版本号变化意味着破坏性更新（例如升级 Next.js 主版本）。
- 每个业务项目的 `package.json` 中依赖框架的版本范围应使用 `^` 或 `~`，并通过 CI 定期测试。

---

## 五、你明天就可以开始的第一个行动

不要再盯着 80 个项目发呆了。做这件事：

1. **创建一个干净的目录** `~/yyc3-platform`
2. **初始化 pnpm workspace**，并按照上述结构创建 `packages/framework`, `packages/ui`, `packages/cli`。
3. **从你最喜欢的一个项目**（例如 `YYC³-3`）中复制 `app` 目录和 `components` 目录到 `framework` 和 `ui` 包。
4. **写一个简单的 `yyc3 new` 脚本**（可以先用 bash 或 node 脚本硬编码），尝试基于框架生成一个新项目，并确保它可以独立运行。

完成这一步，你就已经跳出了“复制粘贴”的循环。剩下的就是逐步完善工具和场景库。

---

如果你愿意，我可以为你**直接生成 `yyc3 new` 命令的完整可运行代码**（基于你已有的 CLI 框架），你只需要告诉我你希望使用模板目录的具体路径。另外，我也可以提供一份 **场景配置的 JSON Schema** 及验证脚本。请告诉我下一步需要哪方面的具体支持。
