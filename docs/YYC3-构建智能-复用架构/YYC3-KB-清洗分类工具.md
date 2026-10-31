**同一套技术模板（Next.js + Radix UI + shadcn/ui）**提前建立了 `@yyc3/*` 系列共享包和 `yyc3-cli` 工具，这为解决重复问题提供了绝佳的基础设施。

下面是一套**可直接执行的后续操作指南**，目标是将这堆项目转化为“即拉即用的可复用框架 + 一键生成业务场景”。

---

## 🎯 核心原则：从“项目克隆”转向“框架 + 场景配置”

你现有的每个项目都可以视为：

```
可复用框架 (@yyc3/core + @yyc3/ui + ...) + 场景配置 (内容、主题、路由、API)
```

因此做三件事：

1. **提炼共性** → 把所有重复的代码、依赖抽到 `@yyc3/*` 包中
2. **场景化配置** → 每个原项目变成一份 `yyc3.config.json` + 少量业务特定文件
3. **CLI 一键生成** → 通过 `yyc3 create <场景>` 即可拉起一个完整应用

---

## 📋 第一阶段：批量分析 & 聚类（1天，用现有脚本即可）

你已经有了分析报告，现在做聚类分组：

```bash
# 在项目根目录运行已有的 index.js 生成报告后，再运行一个分组脚本
node group-projects.js
```

我为你写一个简单的分组脚本（基于你的报告数据），将项目按依赖相似度聚类。你可以保存为 `group-projects.js`：

```javascript
// group-projects.js
const fs = require('fs');
const path = require('path');

// 假设你的报告在 project_analysis_report.md 中，但更直接的是从 projects 数组处理
// 这里提供一个基于 CLI 输出的 projects 数据的分组函数
function groupBySimilarity(projects, threshold = 0.85) {
    const groups = [];
    const used = new Set();

    for (let i = 0; i < projects.length; i++) {
        if (used.has(i)) continue;
        const group = [projects[i]];
        used.add(i);
        for (let j = i+1; j < projects.length; j++) {
            if (used.has(j)) continue;
            // 计算相似度（基于依赖共同包）
            const deps1 = Object.keys(projects[i].packageJson.dependencies || {});
            const deps2 = Object.keys(projects[j].packageJson.dependencies || {});
            const common = deps1.filter(d => deps2.includes(d)).length;
            const similarity = common / Math.max(deps1.length, deps2.length);
            if (similarity >= threshold) {
                group.push(projects[j]);
                used.add(j);
            }
        }
        groups.push(group);
    }
    return groups;
}

// 使用示例：假设你已经有了 projects 数组（可从之前的 index.js 导出）
// 这里只是示意，实际你可以在 index.js 最后调用这个函数并输出 JSON
console.log("按依赖相似度分组（阈值85%）：");
// groups.forEach((g,idx) => console.log(`Group ${idx+1}: ${g.map(p=>p.name).join(', ')}`));
```

**手动观察报告**，可以看出明显的簇：

- **簇A**：`YYC3-经管数字分析`, `YYC³-3`, `ZHOU_AI`, `❤️`, `娱乐管理`, `锦澜智能呼叫中心` (相似度 96%~100%)
- **簇B**：`AI-Mana`, `admin-dashboard`, `yyc3-Cloud-admin-dashboard` (相似度96%~99%) – 管理后台类
- **簇C**：`AI-Family-DveOps`, `AI-Manage`, `D-Music`, `My-mgmt` 等 (70%~80%) – 可能基础框架相同但多了音乐/家族等特定依赖

> 你可以直接根据项目名称和依赖重叠率手动分组，不需要完美算法。

---

## 🧩 第二阶段：提炼共享包（2-3天，利用现有 @yyc3/* 结构）

你已经有了 `@yyc3/core`, `@yyc3/ui`, `@yyc3/ai-hub`, `@yyc3/motion`, `@yyc3/i18n-core`, `@yyc3/emotion` 等。现在要做的是**把80多个项目中重复的组件、配置、工具函数全部迁移到这些包里**。

### 具体操作（选择一个代表项目，如 `YYC³-3`）

1. **提取 UI 组件**所有项目都用了 Radix UI + shadcn/ui，但可能各自有 `components/ui/button.tsx` 等。→ 在 `@yyc3/ui` 中统一维护一份 shadcn 组件，并导出。
2. **提取布局和通用页面**大多数项目都有相同的布局（侧边栏/顶栏/仪表盘卡片）。→ 创建 `@yyc3/layouts` 包，导出 `DashboardLayout`, `LandingLayout` 等。
3. **提取业务逻辑 hooks**大量项目都有 `useAuth`, `useApi`, `useLocalStorage` 等。→ 放入 `@yyc3/hooks` 或 `@yyc3/core`。
4. **提取主题配置**shadcn 的主题变量（`globals.css`）几乎一致。→ `@yyc3/ui` 提供 `global.css` 和主题切换能力。
5. **统一依赖版本**
   使用 pnpm catalog 锁定所有共享依赖的版本（next, react, radix-ui, tailwindcss 等）。

### 脚本辅助：批量替换导入路径

对于每个原项目，你需要把从 `@/components/ui/button` 的导入改为 `@yyc3/ui/button`。可以写一个 codemod：

```bash
# 安装 jscodeshift
pnpm add -g jscodeshift

# 创建一个转换脚本 replace-imports.js
# 内容：将 '@/components/ui/(.+)' 替换为 '@yyc3/ui/$1'
```

或者更简单：**直接删除原项目的 `components/ui` 目录，然后在项目中安装 `@yyc3/ui` 并配置路径别名**。原项目会因找不到模块而报错，然后逐个修复 —— 虽然粗暴但准确。

---

## 🚀 第三阶段：将每个项目变为“场景配置”（2-3天）

每个原项目在抽离公共代码后，剩下的应该是：

- 少量页面文件（`app/page.tsx`, `app/dashboard/page.tsx` 等）
- 配置文件（`yyc3.config.json`）定义场景名称、主题色、默认路由、API 端点等
- 可能的自定义 assets（图片、字体）

**设计 `yyc3.config.json` 示例：**

```json
{
  "name": "经济管理数字分析",
  "scene": "analytics-dashboard",
  "theme": "yyc3-dark",
  "defaultRoute": "/dashboard",
  "features": ["ai-assistant", "data-export"],
  "apiBase": "/api/v1",
  "customPages": ["reports", "forecast"]
}
```

**然后改造 `@yyc3/cli`**，增加 `create` 命令：

```bash
# 从配置文件生成完整项目
yyc3 generate --config ./yyc3.config.json --output ./my-new-project
```

生成逻辑可以是：

- 克隆一个极简模板（只有 `app/` 基础结构 + `next.config.js`）
- 根据配置注入 `theme` 覆盖
- 根据 `features` 动态添加页面和 API 路由
- 安装 `@yyc3/*` 依赖并配置好

这样，你原来的每个项目都可以**被删除**（保留配置文件和自定义页面作为备份），未来需要哪个场景，直接用 CLI 生成。

---

## 🔁 第四阶段：建立即拉即用的脚手架（1天）

你已经有了 `create-yyc3-app` 和 `@yyc3/cli`。增强它们：

```bash
# 全局安装
pnpm add -g @yyc3/cli

# 一键创建项目，可以选择场景模板
yyc3 create my-portal --template dashboard --preset enterprise

# 列出可用的场景配置（从你之前项目中收集的场景）
yyc3 list-scenes
```

在 `@yyc3/cli` 内部，可以内置一组“黄金场景配置”：

- `admin-dashboard`
- `ai-chat-hub`
- `landing-page`
- `analytics-studio`
- `e-commerce-basic`

这些配置可以直接从你分析报告中的典型项目（如 `admin-dashboard`, `YYC³-3`, `yyc3-AI-Landing-Page`）提取。

**最终效果**：
新成员或新项目只需 `yyc3 create my-xxx --scene landing-page`，几秒钟就能得到一个完整、标准、可扩展的 Next.js 应用，且所有共享组件和逻辑都来自 `@yyc3/*`，后续更新只需升级包版本。

---

## 🧹 第五阶段：清理与归档（1天）

1. **备份原项目**：将80多个项目打包压缩存档到 `archive/` 目录。
2. **提取自定义内容**：手动检查每个项目是否有独特的前端页面逻辑（非组件库内容），若有，将其迁移到 `@yyc3/scenes` 包中作为一个独立场景。
3. **更新 Monorepo**：将你的 `@yyc3/*` 包和 CLI 工具放到一个 Git 仓库中，配置 CI 自动发布到 npm。
4. **编写文档**：用 `yyc3-cli` 的 `--help` 和一份 README 说明如何即拉即用。

---

## 📌 补充建议：利用你现有的 CLI 自动执行批量操作

你的 `yyc3-cli` 已有 `init`、`add`、`mcp` 等命令。你可以新增几个子命令来辅助这次重构：

```bash
# 分析当前目录下所有项目并生成依赖矩阵
yyc3 analyze --output deps-matrix.json

# 批量将所有项目中的重复组件替换为 @yyc3/ui 引用
yyc3 refactor --replace-components --target @yyc3/ui

# 自动生成每个项目的 yyc3.config.json（基于扫描结果）
yyc3 config-generate --interactive

# 一键执行整个迁移流程（谨慎使用）
yyc3 migrate-all --dry-run   # 先预览
yyc3 migrate-all --apply
```

你可以在 `lib/commands/` 下实现这些命令。

---

## ✅ 预期成果（一周后可交付）

| 成果              | 描述                                                   |
| ----------------- | ------------------------------------------------------ |
| **一个核心框架**  | `@yyc3/*` 系列包，涵盖 UI、AI、动效、国际化等          |
| **一套 CLI 工具** | `yyc3 create`, `yyc3 add`, `yyc3 init` 等，5秒生成项目 |
| **10+ 场景配置**  | 从80+项目中提炼的典型场景，开箱即用                    |
| **文档 & 演示**   | 快速开始指南，展示如何从零拉到完整应用                 |
| **原项目归档**    | 80多个项目已替换为配置文件 + 自定义页面备份            |

**你现在最紧迫的一步**：选择一个依赖重叠最高的项目（如 `YYC³-3`），手工将它的公共部分移到 `@yyc3/*` 包中，写一份详细的迁移笔记。然后你就可以用脚本批量处理剩余项目。

如果需要我帮你编写具体的 `yyc3-cli` 新命令（例如 `yyc3 refactor` 或 `yyc3 config-generate`）的代码，请告诉我，我可以立刻提供可运行的实现。
