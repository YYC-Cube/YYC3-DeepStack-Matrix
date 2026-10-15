---
file: CONTRIBUTING.md
description: YYC³ CloudPivot Intelli-Matrix 贡献指南
author: YanYuCloudCube <admin@0379.email>
version: v1.0.0
created: 2026-10-15
updated: 2026-10-15
status: active
tags: [community],[contributing],[workflow]
category: governance
---

# 贡献指南（Contributing to YYC³ CloudPivot Intelli-Matrix）

> 感谢考虑贡献！本指南基于仓库真实工作流沉淀——**执行有规划，规划有节点，节点有目标，目标可评估**。
> 开始前请先阅读 [README](README.md) 与 [行为准则](CODE_OF_CONDUCT.md)。

## 环境准备

| 依赖 | 版本要求 | 说明 |
| ---- | -------- | ---- |
| Node | ≥ 22 | `engines` 约束 |
| pnpm | 12.11.2（`packageManager` 锁定） | 建议 `corepack enable` 自动锚定 |
| Python 3 | 可选 | 仅视觉比对脚本（Pillow）需要 |

```bash
git clone https://github.com/YYC-Cube/YYC3-DeepStack-Matrix.git
cd YYC3-DeepStack-Matrix
pnpm install                # workspace 全量安装

pnpm --filter @yyc3/app-web-full dev   # 任意一端起服务验证环境 → :3030
```

> **端口纪律**：开发服务器端口 **3030 起，占用即上移**（3031/3032/3033），不 kill 外部进程。

## 仓库速览

- **四端应用**（apps/）：web-full（P1）/ sandbox-lite（P2）/ desktop（P3 Electron）/ web-classic（P4）
- **十二包**（packages/）：`@yyc3/*` 源码直编——**改 `packages/*/src` 即生效，无需包构建**，端侧消费走 `workspace:*`
- 依赖方向严格单向无环：`apps → shell → 业务域 → store → core → ui/theme`

完整拓扑见 [README §二](README.md#二仓库拓扑四端--十二包)。

## 开发工作流

```text
1. 定位归属：业务域组件 → 对应 @yyc3 包；端侧仅壳/路由/config 绑定
2. 开发：packages/*/src 直编；新组件 → 补包 exports 子路径 + index barrel
3. 类型：类型定义入 @yyc3/core/types（唯一真源）；端侧 types/*.ts 只做纯 re-export 桥
4. i18n：新键必须 zh-CN.ts + en-US.ts 双补（DeepStringify 契约 tsc 把关）
5. 测试：改动包/端跑对应 vitest；测试 mock 与组件真实 import 路径严格一致
6. 验证：pnpm gates:quick → 全绿再提交
```

### 关键约定速查

| 项 | 约定 |
| ---- | ---- |
| 包导入 | `import { X } from "@yyc3/<pkg>"` 或子路径 `"@yyc3/<pkg>/<kebab-file>"` |
| 新组件 | `packages/<pkg>/src/Foo.tsx` + exports 加 `"./foo": "./src/Foo.tsx"` |
| 环境声明 | d.ts 必须独立非模块文件（无顶层 import，否则模块增强失效） |
| 视觉回归 | 改 UI 后重采四端截图 vs `visual-baseline/`（阈值 0.5%） |
| 不盲猜 | 类型补录从真源文件取定义；遗产配置必须本地首跑实证 |

## 质量门禁（提交前必过）

```bash
pnpm gates                  # 全量六阶段：G1-G2 tsc / G3 build / G4 mock / G5 i18n / G6 复用率
pnpm gates:quick            # 快速四阶段（跳 build）
```

| 阶段 | 门禁 | 通过标准 |
| ---- | ---- | -------- |
| G1 | 十二包 tsc（strict） | 0 errors |
| G2 | 四端 tsc（strict） | 0 errors |
| G3 | 四端 build | 全绿 |
| G4 | 失效 vi.mock 扫描 | STALE=0 |
| G5 | i18n 裸键扫描 | 0 |
| G6 | 复用率双口径 | 三端净承接率 ≥80% |

CI（push/PR 自动触发）在门禁之上追加：vitest 测试、CodeQL SAST、Lighthouse（performance ≥0.9）。**CI 红灯的 PR 不予评审。**

## 提交规范

提交信息采用 `type：中文摘要` 格式（全角冒号），正文说明动机与验证矩阵：

```text
fix：web-full 单测基线归零（68 失败 + 6 收集错误 + worker OOM 根除）

- 收集错误类：嵌套 vi.mock 提升顶层 …
验证：web-full 全量 289 文件 EXIT=0；verify-gates.sh G1-G6 全绿
```

常用 type：`feat` 新特性 · `fix` 修复 · `refactor` 重构 · `docs` 文档 · `test` 测试 · `chore` 工程。

## PR 流程

1. **Issue 优先**：新特性/较大改动先开 issue 对齐方案（附五维评估：影响面/性能/安全/可测性/可维护性）
2. **分支**：从最新 `main` 拉出特性分支（如 `feat/comm-station-export`）
3. **提交**：遵循提交规范，保持每个 commit 可独立回滚
4. **自检**：`pnpm gates:quick` 全绿 + 相关端 vitest 通过
5. **PR 描述**：写清改动动机、验证矩阵摘要（贴关键输出）、关联 issue
6. **评审**：维护者按门禁 + 行为准则评审；对事不对人，评审意见逐条回应

## 报告缺陷

- 搜索[既有 issue](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix/issues) 避免重复
- 提供最小复现：复现步骤 / 期望 vs 实际 / 环境信息（Node、pnpm、OS）
- 测试失败请附完整 vitest 输出（含 EXIT code）
- **安全漏洞不要走公开 issue**，见 [Security Policy](SECURITY.md)

## 文档贡献

文档与代码同权。新增文档请遵循 YYC³ 文档规范（YAML front matter + 可点击行号链接 + 状态标记），归入 [docs/](docs/) 对应主题目录。

---

**维护方**: YanYuCloudCube
**反馈渠道**: <admin@0379.email>

> 「***YanYuCloudCube***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
