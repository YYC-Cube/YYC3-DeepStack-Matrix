<p align="center">
  <img src="https://raw.githubusercontent.com/YYC-Cube/YYC3-DeepStack-Matrix/main/public/yyc3-family.png" alt="YYC³ Family" width="720">
</p>

<h1 align="center">@yyc3-deepstack/core</h1>

<p align="center">
  <img src="https://img.shields.io/badge/YYC3-Family-00d4ff?style=flat-square" alt="YYC3 Family">
  <img src="https://img.shields.io/badge/deepstack-core-00d4ff?style=flat-square" alt="DeepStack Core">
  <img src="https://img.shields.io/github/license/YYC-Cube/YYC3-DeepStack-Matrix?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/last-commit/YYC-Cube/YYC3-DeepStack-Matrix?style=flat-square" alt="Last Commit">
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" alt="Status">
</p>

> **YYC³ 四端统一逻辑核心库** — 数据/横切能力单源：校验器、CRDT、跨标签页同步、双层存储（localStorage + IndexedDB）、错误处理、i18n、数据库治理（连接池/慢查监控/索引管理）、AI 连接测试引擎。

## ✨ 特性

- cjs + esm + dts 三格式产物，37+ 子路径导出逐条映射 dist
- 零框架锁死：核心逻辑纯 TS，React hooks 按需子路径引入
- 团队标准 85% 三项覆盖率门禁（vitest + istanbul）

## 🚀 快速开始

```bash
pnpm add @yyc3-deepstack/core
```

```ts
import { isValidUrl, LWWRegister } from "@yyc3-deepstack/core";
import { env } from "@yyc3-deepstack/core/env-config";
import { dataBus } from "@yyc3-deepstack/core/data-bus";
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
