<p align="center">
  <img src="https://raw.githubusercontent.com/YYC-Cube/YYC3-DeepStack-Matrix/main/public/yyc3-family.png" alt="YYC³ Family" width="720">
</p>

<h1 align="center">@yyc3/ide</h1>

<p align="center">
  <img src="https://img.shields.io/badge/YYC3-Family-00d4ff?style=flat-square" alt="YYC3 Family">
  <img src="https://img.shields.io/badge/deepstack-ide-00d4ff?style=flat-square" alt="DeepStack IDE">
  <img src="https://img.shields.io/github/license/YYC-Cube/YYC3-DeepStack-Matrix?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/last-commit/YYC-Cube/YYC3-DeepStack-Matrix?style=flat-square" alt="Last Commit">
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" alt="Status">
</p>

> **YYC³ 四端统一 IDE 开发者域组件库** — IDE 面板系统 + 终端/代码编辑器 + 主题预设引擎（DeepStack 独立血统，`@yyc3/ide` 名字接管方）。

## ✨ 特性

- 38 子路径深导入（`@yyc3/ide/code-editor`、`@yyc3/ide/hooks/use-terminal`、`@yyc3/ide/theme/color-utils`），逐条映射 dist 同构产物
- cjs + esm + dts 三格式产物，tsup 多入口（splitting/treeshake/minify/sourcemap）
- react ^18||^19 + codemirror/xterm 全家桶共 21 项 peer 全外置，`@yyc3-deepstack/core|store|ui` workspace 依赖
- OKLCH 色彩引擎（hex ↔ oklch ↔ hsv 纯函数）+ Zustand IDE 设置切片（localStorage persist + legacy 迁移）

## 🚀 快速开始

```bash
pnpm add @yyc3/ide
```

```tsx
import { IDEPanel } from "@yyc3/ide";
import { CodeEditor } from "@yyc3/ide/code-editor";
import { useTerminal } from "@yyc3/ide/hooks/use-terminal";
import { hexToOklch, formatOklch } from "@yyc3/ide/theme/color-utils";
```

## 🧱 面板系统

`panel` / `panel-container` / `panel-content` / `panel-header` / `panel-resize-handle` / `panel-toolbar` / `tab-bar` / `layout-context` / `workspace` — 可拼装的多面板 IDE 布局骨架。

## 📚 文档

- [仓库总览](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix)
- [贡献指南](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix/blob/main/CONTRIBUTING.md)

## 📄 许可证

[MIT](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix/blob/main/LICENSE) © YanYuCloudCube Team

---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> *Words Initiate Quadrants, Language Serves as Core for Future*
> *万象归元于云枢 | 深栈智启新纪元*
