---
@file: YYC3-团队文档-命名规范.md
@description: YYC³ CloudPivot Intelli-Matrix 项目现状分析与团队命名规范综合报告
@author: YanYuCloudCube Team
@version: v4.0.0
@created: 2026-03-27
@updated: 2026-03-31
@status: published
@tags: YYC³, 分析报告, 命名规范, 架构建议
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

# YYC³ CloudPivot Intelli-Matrix — 项目现状分析与团队规范综合报告

---

# 第一部分：项目现状深度分析

## 1. 项目概览

| 维度 | 详情 |
|------|------|
| **项目名称** | YYC³ CloudPivot Intelli-Matrix (CP-IM) |
| **项目定位** | 企业级智能监控与运维平台 |
| **目标用户** | YYC³ Family 内部 AI 研发与运维团队 |
| **运行模式** | 纯前端 SPA（当前 Mock 模式，已预留后端 API 接口） |
| **部署形态** | Web (PWA) + Electron 桌面端 + Docker |
| **版本** | v1.0.0 |

## 2. 技术栈全景

### 2.1 核心框架与语言

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.4 | UI 框架 |
| TypeScript | 5.9.3 | 类型安全 |
| Vite | 7.3.1 | 构建工具 & 开发服务器 |
| React Router DOM | 7.13.1 | 客户端路由 (HashRouter) |

### 2.2 状态管理与数据层

| 技术 | 版本 | 用途 |
|------|------|------|
| Zustand | 5.0.12 | 全局状态管理 |
| IndexedDB | 浏览器原生 | 离线持久化存储 |
| localStorage | 浏览器原生 | CRUD 数据持久化 |
| BroadcastChannel | 浏览器原生 | 跨标签页实时同步 |
| Supabase Client | 2.98.0 | 预留后端数据库 & 认证 |

### 2.3 UI 组件与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| Material UI (MUI) | 7.3.8 | 主 UI 组件库 |
| Radix UI | latest | 无障碍原子组件 |
| Tailwind CSS | 4.2.1 | 工具类样式 |
| Recharts | 3.7.0 | 数据可视化图表 |
| Lucide React | latest | 图标库 |
| Motion | 12.34.5 | 动画库 |
| React Hook Form | 7.71.2 | 表单管理 |

### 2.4 开发工具链

| 工具 | 用途 |
|------|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Vitest | 单元测试 |
| Husky | Git Hooks |
| CodeMirror 6 | 代码编辑器 |
| pnpm | 包管理器 |

### 2.5 桌面端与部署

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 28.0.0 | 桌面应用框架 |
| Electron Builder | latest | 应用打包 |
| Docker + Nginx | alpine | 容器化部署 |

---

## 3. 项目目录结构

```
YYC3-CloudPivot-Intelli-Matrix/
├── src/
│   ├── main.tsx                      # 应用入口
│   ├── app/
│   │   ├── App.tsx                   # 根组件
│   │   ├── routes.ts                 # 路由配置 (36 条路由)
│   │   ├── components/               # 组件层 (80+ 组件)
│   │   │   ├── Layout.tsx            # 主布局
│   │   │   ├── TopBar.tsx            # 顶部导航
│   │   │   ├── Sidebar.tsx           # 侧边栏
│   │   │   ├── BottomNav.tsx         # 移动端底栏
│   │   │   ├── ide/                  # IDE 子模块 (20+ 文件)
│   │   │   ├── ai-family/            # AI 家族子模块 (20+ 文件)
│   │   │   ├── design-system/        # 设计系统
│   │   │   ├── figma/                # Figma 集成
│   │   │   ├── theme/                # 主题系统
│   │   │   └── ui/                   # 通用 UI 组件
│   │   ├── hooks/                    # 自定义 Hooks (29 个)
│   │   ├── lib/                      # 工具库 (17 个)
│   │   ├── stores/                   # Zustand Store
│   │   ├── types/                    # 类型定义 (index.ts 1914 行)
│   │   ├── i18n/                     # 国际化
│   │   └── docs/                     # 应用内文档
│   └── styles/                       # 全局样式
│       ├── index.css
│       ├── tailwind.css
│       ├── theme.css
│       └── fonts.css
├── electron/                         # Electron 主进程
├── docs/                             # 项目文档 (15 个阶段目录)
├── scripts/                          # 工具脚本
├── public/                           # 静态资源
├── deploy/                           # 部署配置
├── env-config.ts                     # 环境变量管理
├── vite.config.ts                    # Vite 配置
├── tsconfig.json                     # TypeScript 配置
├── Dockerfile                        # Docker 构建
└── package.json                      # 项目配置
```

---

## 4. 路由体系分析

项目使用 `createHashRouter`，当前共 **36 条路由**：

### 4.1 核心业务路由

| 路径 | 组件 | 功能域 |
|------|------|--------|
| `/` (index) | `DataMonitoring` | 实时数据监控仪表盘 |
| `/follow-up` | `FollowUpPanel` | 一键跟进系统 |
| `/patrol` | `PatrolDashboard` | 智能巡查仪表盘 |
| `/operations` | `OperationCenter` | 操作中心 |
| `/loop` | `ServiceLoopPanel` | 服务闭环 (监测→优化) |
| `/alerts` | `AlertRulesPanel` | 智能告警规则 |

### 4.2 AI 功能路由

| 路径 | 组件 | 功能域 |
|------|------|--------|
| `/ai` | `AISuggestionPanel` | AI 智能建议 |
| `/ai-diagnostics` | `AIDiagnostics` | AI 辅助诊断 |
| `/ai-family` | `AIFamilyPage` | AI 家族入口 |
| `/ai-family/*` | `AIFamilyRouter` | AI 家族子路由 (14 个子页面) |
| `/ai-family-home` | `FamilyHome` | 家族首页 |
| `/ai-family-center` | `AIFamilyCenterPage` | 家族中心 |
| `/ai-family-design` | `AIFamilyDesignDoc` | 家族设计文档 |
| `/model-provider` | `ModelProviderPanel` | 模型服务商管理 |
| `/ollama-config` | `OllamaConfigPanel` | Ollama 本地配置 |

### 4.3 开发工具路由

| 路径 | 组件 | 功能域 |
|------|------|--------|
| `/ide` | `IDEPanel` | IDE 面板 |
| `/cli` | `CLITerminal` | CLI 终端 |
| `/files` | `LocalFileManager` | 本地文件管理 |
| `/host-files` | `HostFileManager` | 宿主机文件系统 |
| `/database` | `DatabaseManager` | 数据库管理 |
| `/db-connection` | `DatabaseConnectionPanel` | 数据库连接 |
| `/data-editor` | `DataEditorPanel` | 数据编辑器 |

### 4.4 系统管理路由

| 路径 | 组件 | 功能域 |
|------|------|--------|
| `/settings` | `SystemSettings` | 系统设置 |
| `/users` | `UserManagement` | 用户管理 |
| `/security` | `SecurityMonitor` | 安全监控 |
| `/audit` | `OperationAudit` | 操作审计 |
| `/env-config` | `EnvConfigEditor` | 环境变量编辑 |
| `/architecture` | `ArchitectureAudit` | 架构审计 |
| `/performance` | `PerformanceMonitor` | 性能监控 |
| `/refactoring` | `RefactoringReport` | 重构报告 |

### 4.5 工具与文档路由

| 路径 | 组件 | 功能域 |
|------|------|--------|
| `/design-system` | `DesignSystemPage` | 设计系统 |
| `/dev-guide` | `DevGuidePage` | 开发指南 |
| `/theme` | `ThemeCustomizer` | 主题定制 |
| `/pwa` | `PWAStatusPanel` | PWA 状态 |
| `/reports` | `ReportExporter` | 报表导出 |
| `/service-test` | `ServiceConnectionTest` | 服务连接测试 |

---

## 5. API 端点与数据互通分析

### 5.1 当前架构：纯前端 Mock 模式

当前 `enableBackend: false`，所有数据来自 localStorage + 模拟数据生成器。项目已完整预留后端 API 对接能力。

### 5.2 预设 API 端点配置 (`src/app/lib/api-config.ts`)

| 端点组 | 基地址 | 预设操作 |
|--------|--------|----------|
| **文件系统** | `/api/fs` | list, read, write, delete, rename, upload, search |
| **数据库** | `/api/db` | detect, connect, query, tables, backup, restore, test |
| **WebSocket** | `ws://localhost:3113/ws` | qps_update, latency_update, node_status, alert, throughput_history, system_stats, heartbeat_ack |
| **AI 推理** | `https://api.openai.com/v1` | chat/completions (OpenAI 兼容协议) |
| **集群管理** | `/api/cluster` | 节点管理, 模型部署 |

### 5.3 数据流架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    浏览器 / Electron                          │
│                                                               │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐     │
│  │ React UI │◄──│ React Context│◄──│ Zustand Store    │     │
│  │ 组件层   │   │  (Auth/i18n/ │   │ (useSettingsStore│     │
│  │ 80+组件  │   │   WebSocket/ │   │  dashboard-stores│     │
│  │          │   │   View)      │   │  FamilyStore)    │     │
│  └────┬─────┘   └──────┬───────┘   └────────┬─────────┘     │
│       │                │                     │               │
│  ┌────▼────────────────▼─────────────────────▼─────────┐    │
│  │               Custom Hooks (29 个)                    │    │
│  │  useWebSocketData / useModelProvider / usePatrol /   │    │
│  │  useAIDiagnostics / useLocalDatabase / ...           │    │
│  └────┬─────────────────────────────────────────────────┘    │
│       │                                                      │
│  ┌────▼─────────────────────────────────────────────────┐    │
│  │              Data Access Layer                        │    │
│  │                                                       │    │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │    │
│  │  │ localStorage │  │ IndexedDB  │  │  WebSocket   │  │    │
│  │  │ CRUD Factory │  │ (14 Store) │  │  Client      │  │    │
│  │  │ (7 Store)    │  │            │  │  + Fallback  │  │    │
│  │  └──────────────┘  └────────────┘  └──────────────┘  │    │
│  │                                                       │    │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │    │
│  │  │ API Config   │  │ Broadcast  │  │ Service      │  │    │
│  │  │ Gateway      │  │ Channel    │  │ Worker       │  │    │
│  │  └──────────────┘  └────────────┘  └──────────────┘  │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   External APIs    │
                    │  (Mock/Real 切换)   │
                    │                    │
                    │  /api/fs  /api/db  │
                    │  /api/cluster      │
                    │  ws://localhost    │
                    │  AI OpenAI 兼容    │
                    └────────────────────┘
```

### 5.4 数据持久化层详解

#### localStorage CRUD 工厂 (`createLocalStore`)

7 个独立数据仓库，统一 CRUD 接口：

| Store Key | 数据类型 | ID 前缀 | 用途 |
|-----------|----------|---------|------|
| `yyc3_nodes` | NodeData | node | GPU 集群节点 |
| `yyc3_model_perf` | ModelPerfEntry | mp | 模型性能 |
| `yyc3_model_dist` | ModelDistEntry | md | 模型分布 |
| `yyc3_recent_ops` | RecentOpEntry | op | 最近操作 |
| `yyc3_radar` | RadarEntry | rd | 雷达对比 |
| `yyc3_logs` | LogEntry | log | 系统日志 |
| `yyc3_db_conn` | DBConnection | db | 数据库连接 |

#### IndexedDB 持久化 (14 个 Store)

| Store 名称 | 用途 |
|------------|------|
| `alertRules` | 告警规则 |
| `alertEvents` | 告警事件 |
| `patrolHistory` | 巡查历史 |
| `loopHistory` | 服务闭环记录 |
| `operationTemplates` | 操作模板 |
| `operationLogs` | 操作日志 |
| `diagnosisHistory` | 诊断历史 |
| `reports` | 导出报告 |
| `errorLog` | 错误日志 |
| `dashboardSnapshots` | 仪表盘快照 |
| `fileVersions` | 文件版本 |
| `dbConnections` | 数据库连接 |
| `queryHistory` | 查询历史 |
| `committedChanges` | 已提交变更 |

### 5.5 跨组件通信机制

| 机制 | 实现方式 | 应用场景 |
|------|----------|----------|
| **React Context** | AuthContext, I18nContext, WebSocketContext, ViewContext | 全局状态 (认证/语言/实时数据/视口) |
| **Zustand Store** | useSettingsStore, dashboard-stores, FamilyStore | 持久化可编辑状态 |
| **Props Drilling** | 标准父子组件传参 | 局部 UI 状态 |
| **BroadcastChannel** | getSharedChannel("yyc3_api_config") | 跨标签页配置同步 |
| **WebSocket** | ws://localhost:3113/ws | 服务端实时推送 |
| **Custom Events** | 键盘快捷键 / 面板事件 | 用户交互 |

---

## 6. 类型系统分析

### 6.1 规模

`src/app/types/index.ts` 共 **1914 行**，定义了 **38 个业务域**的类型。

### 6.2 类型命名模式

| 模式 | 示例 | 说明 |
|------|------|------|
| `XxxType` (联合类型) | `NodeStatusType`, `DatabaseType`, `LogLevel` | 有限值集合 |
| `XxxState` (状态接口) | `WebSocketDataState`, `SecurityMonitorState` | 复合状态快照 |
| `XxxResult` (结果接口) | `ConnectionTestResult`, `QueryResult` | 操作返回值 |
| `XxxConfig` (配置接口) | `NetworkConfig`, `ReportConfig` | 配置数据 |
| `XxxEntry` (条目接口) | `TerminalHistoryEntry`, `ResourceEntry` | 列表项 |
| `XxxLevel` (级别别名) | `AlertLevel = BaseSeverity` | RF-005 统一 |
| DB Schema | `NodeStatusRecord` (snake_case 字段) | 数据库行映射 |
| 前端展示 | `NodeData` (camelCase 字段) | UI 渲染优化 |

### 6.3 命名双标准

```typescript
// 前端 UI 层: camelCase (高频渲染优化)
interface NodeData {
  gpu: number;
  mem: number;
  temp: number;
}

// DB 层: snake_case (与 PostgreSQL 列名一致)
interface NodeStatusRecord {
  gpu_util: number;
  mem_util: number;
  temp_celsius: number;
}

// 转换函数: toNodeData(record) → NodeData
```

---

## 7. 组件架构分析

### 7.1 组件分类统计

| 类别 | 数量 | 示例 |
|------|------|------|
| **页面组件** | 36 | DataMonitoring, PatrolDashboard, OperationCenter |
| **IDE 子模块** | 20+ | IDELayout, FileExplorer, GitPanel, PanelManager |
| **AI Family 子模块** | 20+ | FamilyHome, FamilyChat, FamilyLearn, FamilyStore |
| **设计系统** | 4 | DesignSystemPage, ComponentShowcase, DesignTokens |
| **通用 UI** | 10+ | GlassCard, AlertBanner, ErrorBoundary, CodeEditor |
| **浮动覆盖层** | 5 | AIAssistant, CommandPalette, IntegratedTerminal, PWAInstallPrompt, OfflineIndicator |

### 7.2 组件命名模式

| 模式 | 示例 | 说明 |
|------|------|------|
| **PascalCase 功能名** | `DataMonitoring` | 页面/面板组件 |
| **XxxPanel** | `AISuggestionPanel`, `ServiceLoopPanel` | 侧面板组件 |
| **XxxPage** | `DesignSystemPage`, `DevGuidePage` | 完整页面 |
| **XxxModal** | `AddModelModal`, `CreateRuleModal` | 弹窗组件 |
| **XxxCard** | `FollowUpCard`, `GlassCard`, `LoopStageCard` | 卡片组件 |
| **XxxDrawer** | `FollowUpDrawer` | 抽屉组件 |
| **XxxManager** | `DatabaseManager`, `HostFileManager` | 管理类组件 |
| **XxxEditor** | `CodeEditor`, `EnvConfigEditor` | 编辑器组件 |
| **XxxBanner** | `AlertBanner` | 横幅组件 |
| **XxxMonitor** | `SecurityMonitor`, `PerformanceMonitor` | 监控组件 |
| **XxxTable** | `DataEditorTables`, `InlineEditableTable` | 表格组件 |
| **FamilyXxx** | `FamilyChat`, `FamilyHome` | AI Family 前缀 |

### 7.3 Hook 命名模式 (29 个)

| 模式 | 示例 | 用途 |
|------|------|------|
| `useXxxData` | `useWebSocketData` | 数据获取 |
| `useXxxConfig` | `useNetworkConfig` | 配置管理 |
| `useXxxStore` | `useSettingsStore` | Zustand 状态 |
| `useXxxMode` | `useOfflineMode`, `useMobileView` | 模式检测 |
| `useIsXxx` | 无（使用 `useMobileView` 替代） | — |
| `useXxxManager` | 无（通过 Store 替代） | — |

完整 Hook 列表：

```
useAIDiagnostics        useAISuggestion         useAlertRules
useBigModelSDK          useFollowUp             useHostFileSystem
useI18n                 useInstallPrompt        useKeyboardShortcuts
useLocalDatabase        useLocalFileSystem      useMobileView
useModelProvider        useNetworkConfig        useOfflineMode
useOperationCenter      usePatrol               usePerformanceMonitor
usePersistedState       usePushNotifications    usePWAManager
useReportExporter       useSecurityMonitor      useServiceLoop
useSettingsStore        useTerminal             useValidation
useWebSocketData        useYYC3Head
```

---

## 8. 关键架构特征

### 8.1 优势

| 特征 | 说明 |
|------|------|
| **类型安全** | 1914 行类型定义，38 个业务域全覆盖，前后端双命名标准 |
| **模块化** | IDE/AI Family/设计系统独立子目录，边界清晰 |
| **Mock → Real 平滑切换** | `enableBackend` 开关 + API Gateway 模式，零改动切后端 |
| **离线优先** | PWA + Service Worker + IndexedDB，支持离线操作 |
| **跨平台** | Web + Electron + Docker 三形态部署 |
| **响应式** | 桌面侧栏 + 移动底栏，`useMobileView` 统一管理 |
| **错误边界** | 三级 ErrorBoundary (page/module/widget) |
| **国际化** | zh-CN + en-US 双语言，模板变量插值 |
| **实时数据** | WebSocket + 模拟数据 Fallback + 节流 |
| **跨标签同步** | BroadcastChannel 单例工厂 |

### 8.2 当前约束

| 约束 | 原因 | 影响 |
|------|------|------|
| **静态导入** | Figma iframe 沙箱对动态 import() 有限制 | Bundle 体积增大，牺牲代码分割 |
| **无后端** | 当前 `enableBackend: false` | 所有数据为 Mock，无真实持久化 |
| **单包结构** | 非 monorepo，全部在单一 src/app | 大型团队协作可能有冲突 |
| **组件平铺** | 80+ 组件在同一目录 | 查找成本随增长上升 |

---

# 第二部分：问题分析与优化建议

## 9. 当前存在的问题与风险

### 9.1 【高优先级】组件目录结构扁平化

**现状**: `src/app/components/` 下 80+ 组件平铺，仅有 `ide/`、`ai-family/`、`design-system/`、`ui/` 四个子目录。

**风险**: 随功能增长，组件查找、代码审查、团队分工将变得困难。

**建议**: 按业务域重组目录结构（详见第三部分规范）。

### 9.2 【高优先级】代码分割缺失

**现状**: 因 Figma 沙箱限制，36 条路由全部静态导入，所有代码打入主 Bundle。

**影响**: 首屏加载时间随功能增长线性增加。

**建议**: 部署到独立 Vite/Node 环境后，恢复 `React.lazy` + `Suspense` 动态导入。

### 9.3 【中优先级】类型定义文件过大

**现状**: `types/index.ts` 单文件 1914 行，38 个业务域。

**建议**: 按域拆分，通过 `index.ts` 统一 re-export。

### 9.4 【中优先级】Hook 文件数量膨胀

**现状**: 29 个 Hook 文件平铺在 `hooks/` 目录。

**建议**: 按业务域分组或合并相关 Hook。

### 9.5 【建议】缺少统一的 API Service 层

**现状**: API 调用分散在各 Hook 和组件中，无统一 Service 抽象。

**建议**: 建立 `src/app/services/` 层，统一封装 API 调用、错误处理、重试逻辑。

---

# 第三部分：团队命名规范

## 10. 文档命名规范

### 10.1 项目级文档 (`/docs/`)

#### 目录命名

**格式**: `{序号}-YYC3-CP-IM-{阶段}-{子阶段}`

```
00-YYC3-CP-IM-项目总览-目录索引/
01-YYC3-CP-IM-项目规划-启动阶段/
02-YYC3-CP-IM-项目规划-设计阶段/
03-YYC3-CP-IM-项目开发-实施阶段/
...
```

**规则**:
- 序号: 2 位数字 (00-99)，连续递增
- 阶段: 项目规划 | 项目开发 | 项目测试 | 项目部署 | 项目运营 | 项目合规 | 项目整合 | 项目资产 | 项目模版 | 智能演进 | 用户指南
- 子阶段: 可选，进一步细分

#### 文件命名

**格式**: `{序号}-CP-IM-{功能}-{描述}.md`

```
001-CP-IM-项目总览索引-项目总览手册.md
002-CP-IM-项目总览索引-快速开始指南.md
```

**规则**:
- 序号: 3 位数字 (001-999)
- 项目: CP-IM
- 功能 + 描述: 中文，连字符分隔

#### 标准规范文档

**格式**: `YYC3-{层级}-{功能}-{描述}.md`

```
YYC3-团队文档-命名规范.md
YYC3-项目规范-封装指南.md
YYC3-项目规范-代码标准.md
YYC3-CP-IM-代码标头规范标准.md
```

### 10.2 应用级文档 (`/src/app/docs/`)

**格式**: `{功能}-{类型}.ts`

```
API-REFERENCE.ts
COMPONENT-REFERENCE.ts
DEVELOPER-HANDOFF.ts
TESTING-GUIDE.ts
ALIGNMENT-PLAN.ts
FINAL-AUDIT-REPORT.ts
```

**类型枚举**: REFERENCE | GUIDE | HANDOFF | REPORT | TEST | PLAN | AUDIT

---

## 11. 代码命名规范

### 11.1 文件命名

| 层级 | 规则 | 示例 |
|------|------|------|
| **组件文件** | PascalCase.tsx | `DataMonitoring.tsx`, `AIFamilyPage.tsx` |
| **Hook 文件** | camelCase (use 前缀) | `useWebSocketData.ts`, `usePatrol.ts` |
| **Store 文件** | kebab-case | `dashboard-stores.ts`, `useSettingsStore.ts` |
| **工具/库文件** | kebab-case | `api-config.ts`, `error-handler.ts`, `env-config.ts` |
| **类型文件** | index.ts (集中导出) | `types/index.ts` |
| **样式文件** | 小写 | `theme.css`, `fonts.css`, `tailwind.css` |
| **路由文件** | 小写 | `routes.ts` |
| **常量文件** | kebab-case | `navigation-config.ts`, `storage-keys.ts` |

### 11.2 组件命名

| 模式 | 格式 | 示例 | 何时使用 |
|------|------|------|----------|
| **功能面板** | `XxxPanel` | `AISuggestionPanel` | 侧面板/可切换面板 |
| **完整页面** | `XxxPage` | `DesignSystemPage` | 独立路由页面 |
| **仪表盘** | `XxxDashboard` | `PatrolDashboard` | 数据可视化页面 |
| **弹窗** | `XxxModal` | `AddModelModal` | 对话框/弹窗 |
| **抽屉** | `XxxDrawer` | `FollowUpDrawer` | 侧滑抽屉 |
| **卡片** | `XxxCard` | `FollowUpCard` | 卡片容器 |
| **横幅** | `XxxBanner` | `AlertBanner` | 顶部横幅 |
| **管理器** | `XxxManager` | `DatabaseManager` | CRUD 管理界面 |
| **编辑器** | `XxxEditor` | `CodeEditor` | 内容编辑器 |
| **监控器** | `XxxMonitor` | `SecurityMonitor` | 实时监控面板 |
| **表格** | `XxxTable(s)` | `DataEditorTables` | 数据表格 |
| **子模块前缀** | `ModuleXxx` | `FamilyChat`, `IDELayout` | 子模块内组件 |

**规则**:
- 组件名 = PascalCase
- 导出名与文件名一致: `export function DataMonitoring()` 或 `export const DataMonitoring = () =>`
- 一个文件一个主组件
- 辅助组件可放在同文件，使用 `_` 前缀: `_InternalHelper`

### 11.3 Hook 命名

| 模式 | 格式 | 示例 |
|------|------|------|
| 数据获取 | `useXxxData` | `useWebSocketData` |
| 配置管理 | `useXxxConfig` | `useNetworkConfig` |
| 状态管理 | `useXxxStore` | `useSettingsStore` |
| 模式检测 | `useXxxMode` | `useOfflineMode`, `useMobileView` |
| CRUD 操作 | `useXxx` (实体名) | `usePatrol`, `useFollowUp` |
| 系统功能 | `useXxx` | `useI18n`, `useTerminal` |

**规则**:
- 文件名 = Hook 名: `useWebSocketData.ts` → `export function useWebSocketData()`
- 返回值类型命名: `useXxx` 返回 `XxxState` 或 `XxxResult`
- 禁止在 Hook 外部直接操作 Store

### 11.4 类型命名

| 类型 | 格式 | 示例 |
|------|------|------|
| **联合类型** | `XxxType` | `NodeStatusType`, `DatabaseType`, `LogLevel` |
| **状态接口** | `XxxState` | `WebSocketDataState`, `ViewState` |
| **结果接口** | `XxxResult` | `ConnectionTestResult`, `QueryResult` |
| **配置接口** | `XxxConfig` | `NetworkConfig`, `ReportConfig` |
| **条目接口** | `XxxEntry` | `TerminalHistoryEntry`, `ResourceEntry` |
| **数据接口** | `XxxData` | `NodeData`, `AlertData` |
| **DB 映射** | `XxxRecord` | `NodeStatusRecord` |
| **级别别名** | `XxxLevel = BaseSeverity` | `AlertLevel`, `ErrorSeverity` |
| **枚举常量** | UPPER_SNAKE_CASE | `"NETWORK"`, `"VALIDATION"` |

**规则**:
- 前端 UI 层: `camelCase` 字段 (`gpu`, `mem`, `temp`)
- DB 层: `snake_case` 字段 (`gpu_util`, `mem_util`, `temp_celsius`)
- 转换函数: `toXxx(record)` (`toNodeData`)
- 同一概念只定义一次，全局引用

### 11.5 Store 命名

| 层级 | 格式 | 示例 |
|------|------|------|
| localStorage Store | `xxxStore` | `nodeStore`, `modelPerfStore` |
| localStorage Key | `yyc3_xxx` | `yyc3_nodes`, `yyc3_model_perf` |
| Zustand Store | `useXxxStore` | `useSettingsStore` |
| IndexedDB Store | camelCase | `alertRules`, `patrolHistory` |
| ID 前缀 | 短前缀 | `node`, `mp`, `md`, `op`, `rd`, `log`, `db` |

### 11.6 路由命名

| 规则 | 说明 | 示例 |
|------|------|------|
| kebab-case | 全小写，连字符分隔 | `/follow-up`, `/ai-diagnostics` |
| 嵌套路由 | 父路径前缀 | `/ai-family`, `/ai-family-home` |
| 通配符 | 子模块路由 | `/ai-family/*` |

### 11.7 CSS 命名

| 规则 | 说明 | 示例 |
|------|------|------|
| CSS 变量 | `--yyc3-xxx` | `--yyc3-bg-primary`, `--yyc3-text-accent` |
| Tailwind 类 | 标准工具类 | `bg-[#060e1f]`, `text-[#00d4ff]` |
| 主题色 | 赛博朋克体系 | 主背景 `#060e1f`，强调色 `#00d4ff` |

### 11.8 常量命名

| 规则 | 说明 | 示例 |
|------|------|------|
| 全局常量 | UPPER_SNAKE_CASE | `DEFAULTS`, `STORAGE_KEY` |
| 枚举字符串 | 小写连字符 | `"active"`, `"warning"`, `"critical"` |
| 配置前缀 | `yyc3_` | `yyc3_nodes`, `yyc3_api_endpoints` |

---

## 12. 建议的目录重组方案

### 12.1 组件目录重组

```
src/app/components/
├── layout/                 # 布局组件
│   ├── Layout.tsx
│   ├── TopBar.tsx
│   ├── Sidebar.tsx
│   └── BottomNav.tsx
├── monitoring/             # 监控模块
│   ├── DataMonitoring.tsx
│   ├── DataFlowDiagram.tsx
│   └── Dashboard.tsx
├── patrol/                 # 巡查模块
│   ├── PatrolDashboard.tsx
│   ├── PatrolHistory.tsx
│   ├── PatrolReport.tsx
│   └── PatrolScheduler.tsx
├── operations/             # 操作模块
│   ├── OperationCenter.tsx
│   ├── OperationAudit.tsx
│   ├── OperationCategory.tsx
│   ├── OperationChain.tsx
│   ├── OperationLogStream.tsx
│   └── OperationTemplate.tsx
├── follow-up/              # 跟进模块
│   ├── FollowUpPanel.tsx
│   ├── FollowUpCard.tsx
│   └── FollowUpDrawer.tsx
├── alerts/                 # 告警模块
│   ├── AlertBanner.tsx
│   ├── AlertRulesPanel.tsx
│   └── CreateRuleModal.tsx
├── ai/                     # AI 模块
│   ├── AISuggestionPanel.tsx
│   ├── AIDiagnostics.tsx
│   ├── AIAssistant.tsx
│   ├── ActionRecommender.tsx
│   ├── PatternAnalyzer.tsx
│   ├── ai-family/          # AI Family 子模块
│   └── ModelProviderPanel.tsx
├── database/               # 数据库模块
│   ├── DatabaseManager.tsx
│   ├── DatabaseConnectionPanel.tsx
│   ├── DataEditorPanel.tsx
│   ├── DataEditorTables.tsx
│   └── InlineEditableTable.tsx
├── files/                  # 文件管理
│   ├── LocalFileManager.tsx
│   ├── HostFileManager.tsx
│   ├── FileBrowser.tsx
│   └── ReportExporter.tsx
├── system/                 # 系统管理
│   ├── SystemSettings.tsx
│   ├── UserManagement.tsx
│   ├── SecurityMonitor.tsx
│   ├── EnvConfigEditor.tsx
│   ├── ArchitectureAudit.tsx
│   ├── PerformanceMonitor.tsx
│   └── RefactoringReport.tsx
├── tools/                  # 开发工具
│   ├── CLITerminal.tsx
│   ├── IntegratedTerminal.tsx
│   ├── CommandPalette.tsx
│   ├── CodeEditor.tsx
│   └── ConfigExportCenter.tsx
├── networking/             # 网络配置
│   ├── NetworkConfig.tsx
│   ├── ConnectionStatus.tsx
│   ├── ServiceConnectionTest.tsx
│   └── OllamaConfigPanel.tsx
├── pwa/                    # PWA 支持
│   ├── PWAStatusPanel.tsx
│   ├── PWAInstallPrompt.tsx
│   └── OfflineIndicator.tsx
├── ide/                    # IDE 集成 (保持现有结构)
├── design-system/          # 设计系统 (保持现有结构)
├── ui/                     # 通用 UI 组件 (保持现有结构)
├── shared/                 # 共享组件
│   ├── GlassCard.tsx
│   ├── ErrorBoundary.tsx
│   ├── NodeDetailModal.tsx
│   ├── LogViewer.tsx
│   └── QuickActionGrid.tsx
├── auth/                   # 认证相关
│   └── Login.tsx
└── dev/                    # 开发辅助
    ├── DevGuidePage.tsx
    └── YYC3Logo.tsx
```

### 12.2 类型文件重组建议

```
src/app/types/
├── index.ts                # 统一 re-export
├── auth.ts                 # #1 用户与认证
├── cluster.ts              # #2 节点与集群
├── model.ts                # #3 模型与 Agent
├── websocket.ts            # #4 WebSocket 通信
├── network.ts              # #5 网络配置
├── sync.ts                 # #6 后台同步
├── error.ts                # #7 错误处理
├── layout.ts               # #8 响应式布局
├── ui.ts                   # #9 UI 公共 Props
├── follow-up.ts            # #10 跟进系统
├── operation.ts            # #11 操作中心
├── terminal.ts             # #12 终端集成
├── filesystem.ts           # #13 文件系统
├── ai-decision.ts          # #15 AI 决策
├── command-palette.ts      # #16 命令面板
├── pwa.ts                  # #17 PWA
├── i18n.ts                 # #18 国际化
├── service-loop.ts         # #19 服务闭环
├── model-provider.ts       # #20 模型提供商
├── sdk.ts                  # #21 SDK 集成
├── host-fs.ts              # #22 宿主文件系统
├── database.ts             # #23 数据库管理
├── patrol.ts               # #24 巡查模式
├── security.ts             # #25 安全监控
├── alert-rules.ts          # #31 告警规则
├── report.ts               # #32 报表导出
├── diagnostics.ts          # #33 AI 诊断
├── storage.ts              # #35 存储基础设施
├── api.ts                  # #36 API 端点
├── design-system.ts        # #37 设计系统
└── family.ts               # #38 AI Family
```

---

# 第四部分：开发规范速查表

## 13. 新增功能开发检查清单

新增一个业务模块时，需创建以下文件：

```
1. src/app/types/xxx.ts              # 类型定义
2. src/app/hooks/useXxx.ts           # 自定义 Hook
3. src/app/components/xxx/XxxPage.tsx # 页面组件
4. src/app/routes.ts                  # 添加路由 (如需)
5. src/app/i18n/                      # 国际化文案 (如需)
```

## 14. 命名速查

| 我要创建... | 文件名 | 导出名 | 路由路径 |
|-------------|--------|--------|----------|
| 监控页面 | `DataMonitoring.tsx` | `DataMonitoring` | `/data-monitoring` |
| AI 面板 | `AISuggestionPanel.tsx` | `AISuggestionPanel` | `/ai-suggestion` |
| 设置页面 | `SystemSettings.tsx` | `SystemSettings` | `/settings` |
| 弹窗组件 | `AddModelModal.tsx` | `AddModelModal` | — |
| 数据 Hook | `useWebSocketData.ts` | `useWebSocketData` | — |
| 类型定义 | `websocket.ts` | `WSMessage`, `WebSocketDataState` | — |
| 工具函数 | `api-config.ts` | `getAPIConfig`, `setAPIConfig` | — |
| Store | `dashboard-stores.ts` | `nodeStore`, `modelPerfStore` | — |

---

## 15. 版本更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-03-27 | v3.0.0 | 初始命名规范文档 |
| 2026-03-31 | v4.0.0 | 全面升级：新增项目现状分析、API 路由分析、数据互通分析、类型系统分析、组件架构分析、问题与优化建议、目录重组方案、开发速查表 |

---

**最后更新**: 2026-03-31
**维护者**: YYC³ 团队
