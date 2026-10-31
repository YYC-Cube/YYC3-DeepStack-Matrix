# YYC³ Scripts 代码库

> 从 `docs/` 目录下 84 个 Markdown 文档中提取的 1,263 个代码块，按功能分类、语义化命名。

## 目录映射

```
scripts/
├── 01-architecture/       (11)  架构展示脚本 — 9包可视化、MCP Server、CLI 创建命令
├── 02-audit/               (3)  审核分析脚本 — 风格聚类 THEMES、项目审核
├── 03-framework/           (1)  框架工具 — Next+React Hooks (useRequest)
├── 04-kb-tools/           (70)  知识库工具 — 向量操作 SQL、清洗分类、复用架构
├── 05-standards/          (21)  团队标准规范 — 开发标准、文档闭环、YAML 配置、Python 模板引擎
├── 06-theme-system/        (3)  主题系统 — CLI 主题组合、场景配置
└── 07-ui-design/        (1152)  UI 设计代码库
    ├── 01-aurora/          (97)  极光风格 — 玻璃卡片、渐变动画、极光特效 CSS
    ├── 02-cyberpunk/      (256)  赛博朋克风格 — 霓虹组件、分析模块、深色主题
    ├── 03-futuristic/     (216)  未来科技风格 — AI 面板、3D 效果、科技感 CSS
    ├── 04-liquid-glass/   (239)  液态玻璃风格 — 玻璃态组件、毛玻璃效果、透光动画
    ├── 05-design-system/  (107)  设计系统 — UI-UX 系统代码、流行趋势组件
    ├── 06-custom-theme/    (23)  自定义主题 — 主题配置、品牌设置、导出工具
    ├── 07-figma-ai/        (31)  Figma AI — 组件拆分、代码生成、页面模板
    ├── 08-call-design/     (20)  Call 设计指南 — GlassCard、SmartForm、路由系统
    ├── 09-card-module/     (26)  卡片模块 — 可拖拽卡片、数据卡片、响应式网格
    ├── 10-component-core/   (8)  组件核心 — Button、Modal、Counter、独立组件
    ├── 11-component-split/ (28)  组件拆分 — 目录结构、依赖检查、Monorepo 配置
    ├── 12-navigation/      (28)  导航系统 — 标签拖拽、垂直/水平导航、虚拟列表
    ├── 13-settings/        (29)  设置页面 — 账户管理、AI 层、语言选择、通知设置
    ├── 14-homepage/        (22)  首页设计 — AI 编程页、打字机效果、消息动画
    └── 15-terminal-switch/ (18)  终端切换 — 自适应布局、编辑模式、面板切换
```

## 语言分布

| 语言 | 文件数 | 占比 | 主要分布 |
|------|--------|------|----------|
| CSS  | 728    | 57.6% | ui-design 各风格子目录 |
| TS   | 344    | 27.2% | ui-design 组件、kb-tools |
| SH   | 74     | 5.9%  | kb-tools、architecture、standards |
| JSON | 72     | 5.7%  | kb-tools 配置、主题定义 |
| JS   | 32     | 2.5%  | ui-design 工具、kb-tools |
| YAML | 8      | 0.6%  | standards 配置 |
| SQL  | 4      | 0.3%  | kb-tools 向量操作 |
| PY   | 1      | 0.1%  | standards 文档模板引擎 |

## 目录详细说明

### 01-architecture/ — 架构展示

| 文件 | 类型 | 说明 |
|------|------|------|
| create-yyc3-app.sh | Shell | CLI 创建项目命令 |
| MCP_Server_AI.sh | Shell | MCP Server AI 集成 |
| shadcn.sh | Shell | shadcn/ui 组件安装 |
| import-ai-hub.ts | TS | AI Hub 模块导入 |
| import-core.ts | TS | 核心模块导入 |
| part-*.sh | Shell | 架构辅助脚本 |

### 02-audit/ — 审核分析

| 文件 | 类型 | 说明 |
|------|------|------|
| THEMES.ts | TS | 主题分类定义 (11 主题 × 18 场景) |
| part-*.sh | Shell | 审核辅助脚本 |

### 03-framework/ — 框架工具

| 文件 | 类型 | 说明 |
|------|------|------|
| useRequest.ts | TS | Next+React 数据请求 Hook |

### 04-kb-tools/ — 知识库工具

| 文件 | 类型 | 说明 |
|------|------|------|
| create_query.sql | SQL | pgvector 表创建 |
| select_query.sql | SQL | 向量相似度查询 |
| update_query.sql | SQL | 数据更新操作 |
| program.js / program.ts | JS/TS | 清洗程序入口 |
| fs.js (×5) | JS | 文件系统操作工具 |
| TEMPLATES.ts | TS | 模板定义 |
| clean.ts | TS | 数据清洗脚本 |
| index_js.sh (×3) | Shell | 交互式分析器入口 |
| NAS.sh (×3) | Shell | NAS 存储操作 |
| *.json (×9) | JSON | 工具配置、模板数据 |
| 其他 | Shell | CLI 命令、安装脚本 |

### 05-standards/ — 团队标准

| 文件 | 类型 | 说明 |
|------|------|------|
| YYC3TemplateEngine.py | Python | 文档模板生成引擎 |
| bin_bash.sh | Shell | 开发环境初始化 |
| git-commit.sh | Shell | Git 提交规范 |
| fs.js | JS | 文件操作工具 |
| NodeData.ts | TS | 节点数据类型 |
| import-react.ts | TS | React 导入模板 |
| yaml-*.yaml (×6) | YAML | 项目配置规范 |
| config-trace_id.json | JSON | 链路追踪配置 |

### 06-theme-system/ — 主题系统

| 文件 | 类型 | 说明 |
|------|------|------|
| config-theme.json | JSON | 主题配置定义 |
| shell-script.sh | Shell | 主题生成脚本 |
| part-1.sh | Shell | 辅助脚本 |

### 07-ui-design/ — UI 设计代码库

#### 01-aurora/ (97) — 极光风格

极光渐变、玻璃态组件、光效动画。核心组件：TranslucentCard、LazyTranslucentCard、LightEffect、ToolboxPanel。

#### 02-cyberpunk/ (256) — 赛博朋克风格

霓虹发光、深色主题、科技感界面。核心组件：AnalysisModule、AppState、各种赛博风格 CSS。

#### 03-futuristic/ (216) — 未来科技风格

3D 效果、AI 面板、科技感交互。核心组件：AccessibleButton、AIInterface、ParticleSystem。

#### 04-liquid-glass/ (239) — 液态玻璃风格

毛玻璃效果、透光动画、玻璃态卡片。核心组件：TranslucentCard、LiquidCard、玻璃效果 CSS。

#### 05-design-system/ (107) — 设计系统

通用 UI-UX 设计系统代码、2025-2026 流行趋势组件、AIColorGenerator。

#### 06-custom-theme/ (23) — 自定义主题

主题配置 JSON、品牌设置、主题导出工具 (exportCurrentTheme)、BrandingStore。

#### 07-figma-ai/ (31) — Figma AI

组件拆分 (Button、FormField、Modal)、代码生成器 (CodeGenerator)、页面模板 (Dashboard、Login)。

#### 08-call-design/ (20) — Call 设计指南

GlassCard、NeonCard、MinimalCard、SmartForm、VirtualList、路由系统、数据存储。

#### 09-card-module/ (26) — 卡片模块

可拖拽卡片、数据卡片、图表卡片、可折叠卡片、响应式网格布局 CSS。

#### 10-component-core/ (8) — 组件核心

独立可复用组件：Button、Modal、Counter、UserCard、UserProfile、UserRegistrationForm。

#### 11-component-split/ (28) — 组件拆分

Monorepo 配置、依赖检查、组件性能监控 (ComponentPerformanceMonitor)、工作区配置。

#### 12-navigation/ (28) — 导航系统

标签管理 (拖拽、关闭、快捷键)、水平/垂直导航、虚拟导航列表、状态持久化。

#### 13-settings/ (29) — 设置页面

账户管理、AI 智能层、语言选择、模型设置、通知管理、搜索栏、主题选择器。

#### 14-homepage/ (22) — 首页设计

AI 编程页面、意图识别引擎、打字机效果、消息动画、页面加载器、品牌头。

#### 15-terminal-switch/ (18) — 终端切换

智能终端面板、自适应布局、编辑模式切换、面板尺寸计算、状态转换。

## 命名规范

| 模式 | 适用 | 示例 |
|------|------|------|
| `ComponentName.ext` | 组件/函数代码 | `GlassCard.ts`, `useRequest.ts` |
| `selector-name.css` | CSS 样式 | `aurora-glass.css`, `card-draggable.css` |
| `action-target.ext` | Shell 脚本 | `create-yyc3-app.sh`, `git-commit.sh` |
| `config-key.json` | JSON 配置 | `config-theme.json`, `config-framework.json` |
| `yaml-key.yaml` | YAML 配置 | `yaml-project.yaml`, `yaml-version.yaml` |
| `verb-stmt.sql` | SQL 操作 | `create_query.sql`, `select_query.sql` |
| `part-N.ext` | 未标识片段 | `part-1.css`, `part-3.sh` |

## 来源追溯

所有文件从 `docs/` 下以下文档目录提取：

- `YYC3-团队通用-标准规范/` → 01-architecture, 05-standards
- `YYC3-构建智能-复用架构/` → 04-kb-tools, 03-framework
- `YYC3-项目分析-分类工具/` → 04-kb-tools
- `YYC3-项目审核-总结文档/` → 02-audit
- `YYC3-项目主题-组件分类/` → 06-theme-system
- `YYC3-项目主题-设计规划/YYC3-前端组件-设计文档/` → 07-ui-design/*
- `YYC3-项目主题-设计规划/YYC3-页面风格-主题设计/` → 07-ui-design/*

## 统计

- **提取日期**: 2026-05-28
- **来源文档**: 84 个 Markdown 文件
- **提取代码块**: 1,263 个
- **分类目录**: 7 个顶级 + 15 个 UI 设计子目录
- **语义化命名**: 892 个文件 (70.6%)
- **总磁盘占用**: ~5.1 MB
