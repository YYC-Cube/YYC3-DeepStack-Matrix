---
file: YYC3-MONOREPO-IMPLEMENTATION-PLAN.md
description: YYC³ Monorepo 架构落地规划
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-04-08
updated: 2026-04-08
status: planning
tags: [monorepo],[架构],[落地规划],[组件库]
category: architecture
language: zh-CN
audience: architects,developers,project-managers
complexity: advanced
---

# YYC³ Monorepo 架构落地规划

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 📊 现状分析

### 现有组件库资产盘点

基于 `yyc3-ui-organized` 目录深度分析：

| 组件库 | 文件数 | 零依赖率 | 评分 | 可复用性 |
|:-------|:-------|:---------|:-----|:---------|
| **yyc3-zero-dep-components** | 37 | 100% | ⭐⭐⭐⭐⭐ | 🥇 核心复用 |
| **yyc3-zero-ui-base** | 50+ | 100% | ⭐⭐⭐⭐⭐ | 🥇 核心复用 |
| **yyc3-zero-dependency** | 39 | 100% | ⭐⭐⭐⭐⭐ | 🥇 核心复用 |
| **yyc3-zero-ui** | 30 | 100% | ⭐⭐⭐⭐⭐ | 🥇 核心复用 |
| **yyc3-zero-deps-packages** | 11 | 91% | ⭐⭐⭐⭐⭐ | 🥇 核心复用 |
| **yyc3-ai-designer-components** | 2 | 100% | ⭐⭐⭐⭐⭐ | 🥈 专用 |
| **yyc3-ai-management-components** | 4 | 100% | ⭐⭐⭐⭐⭐ | 🥈 专用 |
| **yyc3-knowledge-base-ui-components** | 4 | 100% | ⭐⭐⭐⭐⭐ | 🥈 专用 |
| **yyc3-light-dependency** | 12 | 0% | ⭐⭐⭐⭐ | 🥉 可选 |
| **yyc3-music-vynora-components** | 2 | 100% | ⭐⭐⭐⭐⭐ | 🥈 专用 |
| **yyc3-portaisys-dashboard-components** | 2 | 100% | ⭐⭐⭐⭐⭐ | 🥈 专用 |
| **yyc3-shader-reminder-components** | 2 | 100% | ⭐⭐⭐⭐⭐ | 🥈 专用 |
| **yyc3-karbon-platform-components** | 9 | 33% | ⭐⭐⭐⭐ | 🥉 可选 |

**总计：~261 个源文件，~246 个零依赖组件**

### 核心资产分布

```
零依赖组件库资产分布
├── 基础设施层 (核心复用)
│   ├── hooks/           # 8+ 个通用 Hooks
│   ├── utils/           # 35+ 个工具函数
│   ├── types/           # 核心类型定义
│   ├── i18n/            # 国际化系统
│   ├── storage/         # IndexedDB + BroadcastChannel
│   ├── error-handling/  # 全局错误处理
│   ├── websocket/       # WebSocket 管理器
│   └── diagnostics/     # 系统诊断
│
├── UI 组件层 (核心复用)
│   ├── ui-atomic/       # 原子组件 (Button, Card, Badge...)
│   ├── data-display/    # 数据展示 (Table, Chart, Metrics...)
│   ├── feedback/        # 反馈组件 (Loading, Toast...)
│   ├── navigation/      # 导航组件 (Sidebar, Menu...)
│   └── visual-effects/  # 视觉特效 (Holographic, Particle...)
│
├── 业务组件层 (专用)
│   ├── ai/              # AI 对话组件
│   ├── music/           # 音乐播放器
│   ├── ar/              # AR 模块
│   └── effects/         # 特效组件
│
└── 类型系统层
    ├── claw-core/       # 核心类型 (Zod)
    ├── ai-family/       # AI Family 类型
    ├── mcp/             # MCP 协议类型
    └── multimodal/      # 多模态类型
```

---

## 🎯 目标架构

### Monorepo 整体架构

```
yyc3-workspace/
│
├── packages/
│   │
│   ├── core/                        # 共享核心包
│   │   ├── ui/                      # @yyc3/ui - UI 组件库
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── label.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── hooks/                   # @yyc3/hooks - 共享 Hooks
│   │   │   ├── useI18n.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   ├── useClickOutside.ts
│   │   │   ├── useToggle.ts
│   │   │   ├── useWindowSize.ts
│   │   │   ├── useResponsive.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                   # @yyc3/types - 类型定义
│   │   │   ├── core.ts
│   │   │   ├── ai.ts
│   │   │   ├── family.ts
│   │   │   ├── mcp.ts
│   │   │   ├── multimodal.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── i18n/                    # @yyc3/i18n - 国际化
│   │   │   ├── src/
│   │   │   │   ├── translator.ts
│   │   │   │   └── index.ts
│   │   │   └── locales/
│   │   │       ├── zh-CN.json
│   │   │       └── en-US.json
│   │   │
│   │   ├── utils/                   # @yyc3/utils - 工具函数
│   │   │   ├── string.ts
│   │   │   ├── date.ts
│   │   │   ├── data.ts
│   │   │   ├── color.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── storage/                 # @yyc3/storage - 存储方案
│   │   │   ├── indexed-db.ts
│   │   │   ├── broadcast-channel.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── error-handling/          # @yyc3/error-handling - 错误处理
│   │   │   ├── error-handler.ts
│   │   │   ├── platform-error-filter.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── websocket/               # @yyc3/websocket - WebSocket
│   │   │   ├── useWebSocket.ts
│   │   │   ├── manager.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── diagnostics/             # @yyc3/diagnostics - 诊断
│   │   │   ├── diagnostics.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── effects/                 # @yyc3/effects - 特效组件
│   │   │   ├── GlitchText.tsx
│   │   │   ├── ParticleCanvas.tsx
│   │   │   ├── NeonCard.tsx
│   │   │   ├── CyberpunkWidget.tsx
│   │   │   ├── 3DEffects.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── ai/                      # @yyc3/ai - AI 核心
│   │       ├── useAI.ts
│   │       ├── types.ts
│   │       ├── utils.ts
│   │       └── index.ts
│   │
│   ├── cloudpivot/                  # @yyc3/cloudpivot - 主项目
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── components/
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── Layout.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── (移除 ai-family)
│   │   │   │   ├── hooks/
│   │   │   │   ├── lib/
│   │   │   │   └── routes.ts
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── ai-family/                   # @yyc3/ai-family - AI Family 独立项目
│       ├── src/
│       │   ├── components/
│       │   │   ├── AIFamilyRouter.tsx
│       │   │   ├── FamilyContext.tsx
│       │   │   ├── FamilyStore.ts
│       │   │   ├── navigation-config.ts
│       │   │   ├── shared.ts
│       │   │   └── pages/
│       │   │       ├── FamilyHome.tsx
│       │   │       ├── FamilyChat.tsx
│       │   │       ├── FamilyPhone.tsx
│       │   │       ├── FamilyMusic.tsx
│       │   │       ├── FamilyLearn.tsx
│       │   │       ├── FamilyGrowth.tsx
│       │   │       ├── FamilyShare.tsx
│       │   │       ├── FamilyEntertainment.tsx
│       │   │       ├── FamilyActivityCenter.tsx
│       │   │       ├── FamilyModelSettings.tsx
│       │   │       ├── FamilyVoiceSystem.tsx
│       │   │       ├── FamilyDataHub.tsx
│       │   │       ├── FamilyCommCenter.tsx
│       │   │       ├── FamilyEcosystem.tsx
│       │   │       ├── FamilyUISettings.tsx
│       │   │       └── FamilyDataService.ts
│       │   ├── hooks/
│       │   ├── types/
│       │   ├── locales/
│       │   │   ├── zh-CN.json
│       │   │   └── en-US.json
│       │   ├── styles/
│       │   │   └── index.css
│       │   └── main.tsx
│       ├── public/
│       │   ├── favicon.svg
│       │   └── manifest.json
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── docs/                            # 文档
│   ├── .docs-local/
│   │   └── yyc3-ui-organized/       # 组件库文档
│   ├── API-REFERENCE.md
│   └── CONTRIBUTING.md
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .gitignore
└── README.md
```

---

## 📋 分阶段实施计划

### Phase 0: 准备阶段 (1 天)

**目标：环境准备和资产确认**

```bash
# 1. 创建 workspace 根目录
mkdir -p yyc3-workspace
cd yyc3-workspace

# 2. 初始化 Git
git init

# 3. 创建基础配置文件
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

cat > package.json << 'EOF'
{
  "name": "yyc3-workspace",
  "private": true,
  "scripts": {
    "dev:cloudpivot": "pnpm --filter @yyc3/cloudpivot dev",
    "dev:ai-family": "pnpm --filter @yyc3/ai-family dev",
    "build:all": "pnpm -r build",
    "test:all": "pnpm -r test",
    "lint:all": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
EOF

# 4. 创建目录结构
mkdir -p packages/{core,cloudpivot,ai-family}
mkdir -p packages/core/{ui,hooks,types,i18n,utils,storage,error-handling,websocket,diagnostics,effects,ai}
```

**产出物：**
- ✅ Workspace 根目录
- ✅ 基础配置文件
- ✅ 目录结构

---

### Phase 1: 核心包抽取 (2-3 天)

**目标：抽取共享核心包**

#### 1.1 UI 组件库 (@yyc3/ui)

```bash
# 从现有组件库抽取
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-ui-base/yyc3-base/ui/* packages/core/ui/
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-ui/ui-atomic/* packages/core/ui/

# 创建 package.json
cat > packages/core/ui/package.json << 'EOF'
{
  "name": "@yyc3/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./button": "./button.tsx",
    "./card": "./card.tsx",
    "./input": "./input.tsx",
    "./badge": "./badge.tsx"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.9.0"
  }
}
EOF
```

#### 1.2 Hooks 库 (@yyc3/hooks)

```bash
# 从现有组件库抽取
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/hooks/src/* packages/core/hooks/
cp docs/.docs-local/yyc3-ui-organized/yyc3-zero-dependency/hooks/*.ts packages/core/hooks/

# 创建 package.json
cat > packages/core/hooks/package.json << 'EOF'
{
  "name": "@yyc3/hooks",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./useI18n": "./useI18n.ts",
    "./useLocalStorage": "./useLocalStorage.ts",
    "./useDebounce": "./useDebounce.ts",
    "./useResponsive": "./useResponsive.ts"
  },
  "dependencies": {
    "@yyc3/types": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  }
}
EOF
```

#### 1.3 类型定义 (@yyc3/types)

```bash
# 从主项目抽取
mkdir -p packages/core/types
# 手动抽取共享类型到 packages/core/types/

cat > packages/core/types/package.json << 'EOF'
{
  "name": "@yyc3/types",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./core": "./core.ts",
    "./ai": "./ai.ts",
    "./family": "./family.ts"
  }
}
EOF
```

#### 1.4 其他核心包

```bash
# 工具函数
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/utils/src/* packages/core/utils/

# 存储
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/storage/src/* packages/core/storage/

# 错误处理
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/error-handling/src/* packages/core/error-handling/

# WebSocket
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/websocket/src/* packages/core/websocket/

# 诊断
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/diagnostics/src/* packages/core/diagnostics/

# AI
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-zero-dep-components/ai/src/* packages/core/ai/

# 特效
cp -r docs/.docs-local/yyc3-ui-organized/yyc3-light-dependency/effects/* packages/core/effects/
```

**产出物：**
- ✅ @yyc3/ui
- ✅ @yyc3/hooks
- ✅ @yyc3/types
- ✅ @yyc3/utils
- ✅ @yyc3/storage
- ✅ @yyc3/error-handling
- ✅ @yyc3/websocket
- ✅ @yyc3/diagnostics
- ✅ @yyc3/ai
- ✅ @yyc3/effects

---

### Phase 2: 主项目迁移 (2 天)

**目标：将主项目迁移到 Monorepo**

```bash
# 1. 复制主项目
cp -r /Volumes/Max/YYC3-CloudPivot-Intelli-Matrix/* packages/cloudpivot/

# 2. 删除 AI Family 模块
rm -rf packages/cloudpivot/src/app/components/ai-family

# 3. 更新 package.json
cat > packages/cloudpivot/package.json << 'EOF'
{
  "name": "@yyc3/cloudpivot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "@yyc3/ui": "workspace:*",
    "@yyc3/hooks": "workspace:*",
    "@yyc3/types": "workspace:*",
    "@yyc3/utils": "workspace:*",
    "@yyc3/storage": "workspace:*",
    "@yyc3/error-handling": "workspace:*",
    "@yyc3/websocket": "workspace:*",
    "@yyc3/ai": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "vitest": "^3.0.0"
  }
}
EOF

# 4. 更新导入路径
# 将 @/components/ui/* 替换为 @yyc3/ui
# 将 @/hooks/* 替换为 @yyc3/hooks
# 将 @/types 替换为 @yyc3/types
```

**产出物：**
- ✅ 主项目迁移完成
- ✅ 依赖更新为 workspace 包
- ✅ AI Family 模块已移除

---

### Phase 3: AI Family 独立项目 (2-3 天)

**目标：创建 AI Family 独立项目**

```bash
# 1. 创建项目结构
mkdir -p packages/ai-family/{src,public}
mkdir -p packages/ai-family/src/{components,pages,hooks,types,locales,styles}

# 2. 复制 AI Family 模块
cp -r /Volumes/Max/YYC3-CloudPivot-Intelli-Matrix/src/app/components/ai-family/* packages/ai-family/src/components/

# 3. 创建独立入口
cat > packages/ai-family/src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { FamilyProvider } from './components/FamilyContext';
import { AIFamilyRouter } from './components/AIFamilyRouter';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <FamilyProvider>
        <AIFamilyRouter />
      </FamilyProvider>
    </HashRouter>
  </React.StrictMode>
);
EOF

# 4. 创建 HTML
cat > packages/ai-family/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YYC³ AI Family</title>
  <meta name="description" content="AI 家人陪伴系统 - 8 位智能家人与你共同成长" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
EOF

# 5. 创建 package.json
cat > packages/ai-family/package.json << 'EOF'
{
  "name": "@yyc3/ai-family",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@yyc3/ui": "workspace:*",
    "@yyc3/hooks": "workspace:*",
    "@yyc3/types": "workspace:*",
    "@yyc3/utils": "workspace:*",
    "@yyc3/storage": "workspace:*",
    "@yyc3/effects": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.500.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
EOF

# 6. 创建 vite.config.ts
cat > packages/ai-family/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3219,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
EOF
```

**产出物：**
- ✅ AI Family 独立项目
- ✅ 独立入口和配置
- ✅ 独立端口 (3219)

---

### Phase 4: 集成测试 (1-2 天)

**目标：验证所有包和项目正常工作**

```bash
# 1. 安装依赖
pnpm install

# 2. 构建所有包
pnpm build:all

# 3. 测试主项目
cd packages/cloudpivot
pnpm dev
# 访问 http://localhost:3218

# 4. 测试 AI Family
cd packages/ai-family
pnpm dev
# 访问 http://localhost:3219

# 5. 运行测试
pnpm test:all

# 6. 运行 lint
pnpm lint:all
```

**产出物：**
- ✅ 所有包构建成功
- ✅ 主项目正常运行
- ✅ AI Family 正常运行
- ✅ 测试通过
- ✅ Lint 通过

---

### Phase 5: 文档和发布 (1 天)

**目标：完善文档和发布流程**

```bash
# 1. 更新 README.md
cat > README.md << 'EOF'
# YYC³ Workspace

## 项目结构

- `packages/core/` - 共享核心包
- `packages/cloudpivot/` - 主项目
- `packages/ai-family/` - AI Family 独立项目

## 快速开始

\`\`\`bash
# 安装依赖
pnpm install

# 启动主项目
pnpm dev:cloudpivot

# 启动 AI Family
pnpm dev:ai-family

# 构建所有项目
pnpm build:all
\`\`\`

## 包列表

| 包名 | 说明 |
|:-----|:-----|
| @yyc3/ui | UI 组件库 |
| @yyc3/hooks | 共享 Hooks |
| @yyc3/types | 类型定义 |
| @yyc3/utils | 工具函数 |
| @yyc3/storage | 存储方案 |
| @yyc3/error-handling | 错误处理 |
| @yyc3/websocket | WebSocket |
| @yyc3/ai | AI 核心 |
| @yyc3/effects | 特效组件 |
EOF

# 2. 创建 CI/CD 配置
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:all
      - run: pnpm test:all
EOF
```

**产出物：**
- ✅ 完整文档
- ✅ CI/CD 配置
- ✅ 发布流程

---

## 📊 资源投入估算

| 阶段 | 工作量 | 关键任务 |
|:-----|:-------|:---------|
| Phase 0 | 1 天 | 环境准备 |
| Phase 1 | 2-3 天 | 核心包抽取 |
| Phase 2 | 2 天 | 主项目迁移 |
| Phase 3 | 2-3 天 | AI Family 独立 |
| Phase 4 | 1-2 天 | 集成测试 |
| Phase 5 | 1 天 | 文档发布 |
| **总计** | **9-12 天** | - |

---

## 🎯 预期收益

| 指标 | 当前 | 目标 | 提升 |
|:-----|:-----|:-----|:-----|
| **代码复用率** | 30% | 80% | +167% |
| **构建时间** | 3 分钟 | 1.5 分钟 | -50% |
| **独立部署** | ❌ | ✅ | - |
| **跨项目复用** | ❌ | ✅ | - |
| **维护成本** | 高 | 中 | -30% |
| **开发效率** | 中 | 高 | +40% |

---

## 📚 相关文档

- [AI Family 分离分析](./AI-FAMILY-SEPARATION-ANALYSIS.md)
- [YYC3 UI 组件库](./README.md)
- [零依赖组件包](./yyc3-zero-dep-components/README.md)

---

*文档生成时间: 2026-04-08*
*作者: YYC³ Team*
