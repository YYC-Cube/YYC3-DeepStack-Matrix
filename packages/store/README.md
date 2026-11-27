<p align="center">
  <img src="https://raw.githubusercontent.com/YYC-Cube/YYC3-DeepStack-Matrix/main/public/yyc3-family.png" alt="YYC³ Family" width="720">
</p>

<h1 align="center">@yyc3-deepstack/store</h1>

<p align="center">
  <img src="https://img.shields.io/badge/YYC3-Family-00d4ff?style=flat-square" alt="YYC3 Family">
  <img src="https://img.shields.io/badge/deepstack-store-00d4ff?style=flat-square" alt="DeepStack Store">
  <img src="https://img.shields.io/github/license/YYC-Cube/YYC3-DeepStack-Matrix?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/last-commit/YYC-Cube/YYC3-DeepStack-Matrix?style=flat-square" alt="Last Commit">
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" alt="Status">
</p>

> **YYC³ 四端统一状态库** — Zustand Slices 单源：节点/指标/日志/连接池/用户/网络/跟进/模型/供应商/离线/SDK 会话/设置 SSOT 等 16+ Slice，persist + immer + devtools 全家桶。

## ✨ 特性

- 每 Slice 独立 `create()` 模块级单例，按需子路径引入
- persist 自动落盘 + legacy localStorage 迁移助手
- 依赖 `@yyc3-deepstack/core`（workspace:* 随 monorepo 发布）

## 🚀 快速开始

```bash
pnpm add @yyc3-deepstack/store
```

```ts
import { useNodeSlice } from "@yyc3-deepstack/store";
import { useProviderSlice } from "@yyc3-deepstack/store/provider-slice";
```

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
