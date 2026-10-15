---
file: YYC3-组件库建设-上下文衔接文档.md
description: YYC³ 组件库建设项目上下文衔接文档 - 从现状分析到组件库建设的完整过渡指南
author: YYC³ 总控工程师导师
version: v1.0
created: 2026-07-24
updated: 2026-07-24
status: active
tags: [context-bridge],[component-library],[handover],[roadmap]
category: guidance
language: zh-CN
---

# YYC³ 组件库建设 - 上下文衔接文档

> **文档定位**：从"现状分析阶段"过渡到"组件库建设阶段"的知识桥梁
> **核心目标**：保持分析成果连续性，指导组件库建设落地

---

## 第一部分：已完成的分析成果

### 1.1 目录资产盘点

```
/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-设计工具-组件插件/
│
├── YYC3-UI-MONO/                    ⭐ 核心资产 (4.0G, 198,542 文件)
│   ├── apps/                        (251 应用, 159 Next.js + 75 React)
│   ├── packages/
│   │   ├── ui/                      ⭐⭐⭐ 组件库源头 (80+ 组件文件)
│   │   ├── theme/                   (主题系统)
│   │   └── base/                    (Next.js 底座)
│   └── templates/
│       ├── themes/                  (22 套主题 U01-U22)
│       └── blueprints/              (22 套样板 T01-T22)
│
├── YYC3-CLI/                        (CLI 工具 + 自动化脚本)
├── YYC3-Public-Icons/               (24 图标集)
├── YYC³-AI智能编程与设计工具推进规划白皮书.md  (战略规划)
└── YYC3-可视化架构文档.html         (架构文档)
```

### 1.2 关键决策结论

| 决策项 | 结论 | 依据 |
|--------|------|------|
| **组件库基础** | YYC3-UI-MONO/packages/ui | 80+组件，Radix UI封装，与22主题兼容 |
| **不推荐基础** | YYC3-AI-PAI | 它是AI应用，非组件库 |
| **技术栈** | React 19 + Next.js 15 + Tailwind 4 + Radix UI | 需从当前版本升级 |
| **架构模式** | Monorepo (pnpm workspace) | YYC3-UI-MONO 已验证 |

### 1.3 待执行升级任务

```bash
# 技术栈版本现状 vs 目标
┌─────────────┬──────────────┬──────────────┐
│ 依赖        │ 现状版本      │ 目标版本      │
├─────────────┼──────────────┼──────────────┤
│ React       │ 18.2.0       │ 19.x         │
│ Next.js     │ 14.1.4       │ 15.x         │
│ Tailwind    │ 3.x          │ 4.x          │
│ TypeScript  │ ^5           │ ^5.9         │
└─────────────┴──────────────┴──────────────┘
```

---

## 第二部分：组件库建设目标

### 2.1 建设范围

```
YYC3-Component-Library/                    (新建组件库项目)
├── packages/
│   ├── ui/                                (基础组件库 - 从 UI-MONO/ui 迁移)
│   ├── theme/                             (主题系统 - 从 UI-MONO/theme 迁移)
│   ├── business/                          (业务组件 - 新建)
│   ├── layouts/                           (布局组件 - 新建)
│   └── icons/                             (图标库 - 从 Public-Icons 整合)
├── templates/
│   ├── themes/                            (22 套主题模板)
│   └── blueprints/                        (22 套样板)
├── apps/
│   ├── storybook/                         (组件文档站点)
│   └── playground/                        (在线演练场)
└── docs/                                  (使用文档)
```

### 2.2 建设阶段

| 阶段 | 任务 | 预计周期 | 状态 |
|------|------|----------|------|
| **Phase 0** | 资产迁移与项目初始化 | 1-2天 | 🔴 待开始 |
| **Phase 1** | 基础组件库 (ui) 完善 | 3-5天 | 🔴 待开始 |
| **Phase 2** | 主题系统 (theme) 统一 | 2-3天 | 🔴 待开始 |
| **Phase 3** | 业务组件 (business) 构建 | 5-7天 | 🔴 待开始 |
| **Phase 4** | Storybook 文档站点 | 3-4天 | 🔴 待开始 |
| **Phase 5** | 在线演练场 (playground) | 2-3天 | 🔴 待开始 |

---

## 第三部分：迁移路径

### 3.1 目标路径

```
主要工作目录：
/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library/

源资产目录：
/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-设计工具-组件插件/YYC3-UI-MONO/
```

### 3.2 迁移脚本

```bash
#!/bin/bash
# YYC3-Component-Library 初始化脚本

# 定义路径
SOURCE_DIR="/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-设计工具-组件插件/YYC3-UI-MONO"
TARGET_DIR="/Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library"

# 创建目标结构
mkdir -p "$TARGET_DIR"/{packages,templates,apps,docs}

# 迁移核心包
echo "📦 迁移 packages/ui..."
cp -r "$SOURCE_DIR/packages/ui" "$TARGET_DIR/packages/ui"

echo "📦 迁移 packages/theme..."
cp -r "$SOURCE_DIR/packages/theme" "$TARGET_DIR/packages/theme"

echo "🎨 迁移 templates/themes..."
cp -r "$SOURCE_DIR/templates/themes" "$TARGET_DIR/templates/themes"

echo "📋 迁移 templates/blueprints..."
cp -r "$SOURCE_DIR/templates/blueprints" "$TARGET_DIR/templates/blueprints"

# 初始化项目
cd "$TARGET_DIR"
pnpm init

# 创建 Monorepo 配置
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'templates/*'
  - 'apps/*'
EOF

# 创建根 package.json
cat > package.json << 'EOF'
{
  "name": "yyc3-component-library",
  "version": "1.0.0",
  "private": true,
  "description": "YYC³ 统一组件库 - 企业级 React 组件集合",
  "scripts": {
    "dev": "pnpm --filter storybook dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "type-check": "pnpm -r type-check",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.9",
    "prettier": "^3",
    "eslint": "^9"
  }
}
EOF

echo "✅ YYC3-Component-Library 初始化完成！"
echo "📍 工作目录: $TARGET_DIR"
```

---

## 第四部分：快速启动命令

### 4.1 进入组件库工作目录

```bash
# 方式一：直接进入
cd /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library

# 方式二：使用别名（推荐）
# 在 ~/.zshrc 中添加：
alias yyc3-lib='cd /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library'
# 然后使用: yyc3-lib
```

### 4.2 执行迁移

```bash
# 复制上面的迁移脚本到:
# /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library/init.sh

# 执行:
chmod +x init.sh
./init.sh
```

### 4.3 安装依赖

```bash
cd /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library
pnpm install
```

### 4.4 升级技术栈

```bash
# 升级核心依赖到目标版本
pnpm add -w react@19 next@15 tailwindcss@4
pnpm add -w -D typescript@5.9
```

---

## 第五部分：知识链接

### 5.1 相关文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 白皮书 | `/Volumes/Max/.../YYC³-AI智能编程与设计工具推进规划白皮书.md` | 战略规划 |
| UI-MONO README | `/Volumes/Max/.../YYC3-UI-MONO/README.md` | Monorepo 说明 |
| 可视化架构 | `/Volumes/Max/.../YYC3-可视化架构文档.html` | 架构视图 |
| 分类报告 | `/Volumes/Max/.../yyc3-classification.txt` | 项目分类 |

### 5.2 核心资产位置速查

```
组件源码:
/Volumes/Max/.../YYC3-UI-MONO/packages/ui/*.tsx

主题资源:
/Volumes/Max/.../YYC3-UI-MONO/templates/themes/U01-U22/

图标资源:
/Volumes/Max/.../YYC3-Public-Icons/

自动化脚本:
/Volumes/Max/.../YYC3-CLI/scripts/
```

---

## 第六部分：待办事项清单

### 6.1 立即执行 (今日)

- [ ] 创建 `/Volumes/Max/.../YYC3-Component-Library/` 目录
- [ ] 执行迁移脚本
- [ ] 安装依赖 `pnpm install`
- [ ] 升级技术栈版本

### 6.2 Phase 1 任务 (本周)

- [ ] 审查 `packages/ui` 现有组件
- [ ] 统一组件导出结构
- [ ] 添加组件 TypeScript 类型定义
- [ ] 组件 Storybook 文档

### 6.3 Phase 2 任务 (下周)

- [ ] 统一 22 套主题配置
- [ ] 建立主题切换机制
- [ ] OKLCH 色彩空间迁移

---

## 第七部分：命令速查

```bash
# === 目录切换 ===
cd /Volumes/Max/YanYuCloudCube/YanYuCloud/YYC3-Component-Library

# === 依赖管理 ===
pnpm install                    # 安装所有依赖
pnpm add <package>              # 添加依赖
pnpm remove <package>           # 移除依赖

# === 开发命令 ===
pnpm dev                        # 启动 Storybook
pnpm build                      # 构建所有包
pnpm lint                       # 代码检查
pnpm type-check                 # 类型检查

# === 清理命令 ===
pnpm clean                      # 清理构建产物
rm -rf node_modules             # 深度清理
pnpm install                    # 重新安装

# === Git 操作 ===
git init                        # 初始化仓库
git add .                       # 添加所有文件
git commit -m "feat: 初始化组件库"  # 提交
```

---

## 附录：关键决策回顾

### A.1 为什么选择 YYC3-UI-MONO/packages/ui 作为基础？

1. ✅ 已有 80+ 组件文件，无需从零开始
2. ✅ 完整的 Radix UI 封装，可访问性有保障
3. ✅ 与 22 套主题完美兼容
4. ✅ TypeScript 类型完整
5. ✅ 已在 Monorepo 中验证过架构

### A.2 为什么不选择 YYC3-AI-PAI？

1. ❌ 它是 AI 编程助手**应用**，不是组件库
2. ❌ 组件耦合业务逻辑，难以复用
3. ❌ 缺少设计系统基础
4. ❌ 无独立文档站点

### A.3 技术栈为什么要升级？

| 依赖 | 升级原因 |
|------|----------|
| React 18→19 | YYC3-π³ 已使用 React 19，需保持一致 |
| Next.js 14→15 | App Router 特性完善，性能提升 |
| Tailwind 3→4 | 新版 CSS 变量支持更好 |
| TS 5→5.9 | 类型系统增强 |

---

**文档状态**: 🟢 活跃 | **最后更新**: 2026-07-24 | **负责人**: YYC³ 导师

---

> 💡 **提示**: 请在每次进入组件库建设工作前，先阅读本文档相关章节，确保上下文连续性。
