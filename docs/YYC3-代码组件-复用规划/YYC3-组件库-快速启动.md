---
file: YYC3-组件库-快速启动.md
description: YYC³ 组件库建设项目快速启动指南
author: YYC³ 导师
version: v1.0
created: 2026-07-24
tags: [quickstart],[component-library]
---

# YYC³ 组件库 - 快速启动指南

## 一键启动

```bash
# 进入工作目录
cd /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-设计工具-组件插件

# 执行初始化脚本
bash init-component-library.sh
```

## 手动步骤（如脚本执行失败）

### 步骤 1: 创建目标目录

```bash
mkdir -p /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library
cd /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library
```

### 步骤 2: 创建目录结构

```bash
mkdir -p packages/{ui,theme,business,layouts,icons}
mkdir -p templates/{themes,blueprints,code}
mkdir -p apps/{storybook,playground}
mkdir -p docs/{components,themes,guides}
```

### 步骤 3: 复制核心资产

```bash
# 定义源目录
SOURCE="/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-设计工具-组件插件/YYC3-UI-MONO"

# 复制 UI 包
cp -r "$SOURCE/packages/ui"/* packages/ui/

# 复制主题包
cp -r "$SOURCE/packages/theme"/* packages/theme/

# 复制主题模板
cp -r "$SOURCE/templates/themes"/* templates/themes/

# 复制样板
cp -r "$SOURCE/templates/blueprints"/* templates/blueprints/
```

### 步骤 4: 创建配置文件

```bash
# pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'templates/*'
  - 'apps/*'
EOF

# package.json
cat > package.json << 'EOF'
{
  "name": "yyc3-component-library",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter storybook dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.9",
    "prettier": "^3",
    "eslint": "^9"
  }
}
EOF
```

### 步骤 5: 安装依赖

```bash
pnpm install
```

### 步骤 6: 升级技术栈

```bash
pnpm add -w react@19 next@15 tailwindcss@4
pnpm add -w -D typescript@5.9
```

## 验证安装

```bash
# 检查目录结构
ls -la packages/
ls -la templates/

# 检查依赖
cat package.json

# 运行类型检查
pnpm type-check
```

## 下一步

1. 阅读 `YYC3-组件库建设-上下文衔接文档.md`
2. 开始 Phase 1: 基础组件库完善

---

**工作目录**: `/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library`
