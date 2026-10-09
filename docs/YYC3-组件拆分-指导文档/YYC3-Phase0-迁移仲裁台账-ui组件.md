---
file: YYC3-Phase0-迁移仲裁台账-ui组件.md
description: Phase 0 M0 — 四项目 components/ui 组件 L0/L1/L2 仲裁台账（@yyc3/ui 抽取直接输入）
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase0],[ledger],[arbitration],[ui],[baseline]
category: report
---

# 📒 Phase 0 迁移仲裁台账 · components/ui 组件

> **「以代码为准绳」**——本台账由只读脚本对四项目 ui 目录做字节 hash + 归一化 hash + 行级相似度三级比对生成，覆盖 **100%** ui 文件，作为 Phase 2 抽取 `@yyc3/ui` 的仲裁依据。

## 一、台账元信息

| 项 | 值 |
| -- | -- |
| 审计日期 | 2026-10-10 |
| 审计范围 | 四项目 `components/ui` 全量（递归，`.tsx/.ts`） |
| P1 | `YYC3 CloudPivot Intelli Matrix/`（v3.4.1，域制）→ `src/app/components/ui`，49 件 |
| P2 | `YYC3 CloudPivot Intelli-Matrix/`（v1.0.0，扁平根结构）→ `components/ui`，48 件 |
| P3 | `YYC3-CloudPivot Intelli-Matrix/`（v3.4.1）→ `src/app/components/ui`，49 件 |
| P4 | `YYC3-CloudPivot-Intelli-Matrix/`（v3.4.1）→ `src/app/components/ui`，49 件 |
| 可复算 | [`phase0-ledger/ui-audit.mjs`](./phase0-ledger/ui-audit.mjs)（零依赖 `node ui-audit.mjs`）→ [`ui-matrix.json`](./phase0-ledger/ui-matrix.json) |

**评级口径**：

| 级别 | 判据 | 处置 |
| ---- | ---- | ---- |
| **L0** | 原始字节 sha1 全同 | 任取其一入包 |
| **L0\*** | 去注释/空白归一化后 hash 全同（仅文件头、格式差异） | 任取其一 + 统一文件头/prettier |
| **L1** | 归一化行集合两两最小 Jaccard ≥ 0.85（小异） | 取功能最全者，合入他版独有修复 |
| **L1/L2?** | Jaccard 0.6~0.85 | 人工裁定 |
| **L2** | Jaccard < 0.6（异构） | 双 API + adapter，双快照护栏 |
| **缺件** | 非四项目齐备 | 补齐或登记为裁剪 |

> 口径局限：归一化为文本级（非 AST 级）等价判定，已对代表性件做原始 `diff` 人工抽检佐证；Phase 2 合入时以 `pnpm build` + 5.3.5 的 69 张视觉基线快照兜底。

## 二、总览结论

| 评级 | 件数 | 占比 |
| ---- | ---- | ---- |
| L0（字节全同） | 2 | 4% |
| L0\*（仅文件头/格式差） | **44** | **90%** |
| L1（小异） | 3 | 6% |
| L1/L2? / L2（异构） | **0** | 0% |
| UNIQUE（单项目独有） | **0** | 0% |
| **并集** | **49**（47 `.tsx` + `utils.ts` + `use-mobile.ts`） | — |

**三个关键结论**：

1. **ui 层同源度极高、零异构**：49 件并集中 46 件本质相同（L0+L0\*），**无 L2 异构件、无单项目独有件**。Phase 2 抽 `@yyc3/ui` 的仲裁成本极低。
2. **P1 ≡ P3 ≡ P4**：三者 ui 完全同源（含文件头规范）；3 件 L1 中 P1/P3/P4 两两相似度 **100%**，差异全部来自 **P2**。44 件 L0\* 中 P2 与其余三者的差异经抽检（如 `button.tsx`）确认**仅为 P2 缺少 11 行文件头注释块 + 少量代码风格**，代码逐字相同。
3. **需真正带决策合入的只有 1 件 `chart.tsx`**：P1/P3/P4 含颜色安全白名单 `SAFE_COLOR_RE`（防非法色值/注入）与 `label` 字段，P2 缺失（旧版）。其余差异均为格式或等价写法。

## 三、仲裁结论汇总

| 处置桶 | 件数 | 文件 | Phase 2 动作 |
| ------ | ---- | ---- | ----------- |
| ① 直接入包（四项目字节全同） | 1 | `resizable.tsx` | 任取 |
| ② 直接入包（仅 P1/P3/P4 有，字节同） | 1 | `page-header.tsx` | 入包并**补入 P2**（见四-②） |
| ③ 直接入包（代码逐字同，统一文件头/格式） | 44 | 见第五节清单 | 取 P1 版，过统一文件头 + prettier |
| ④ 风格小异、实质等价 | 2 | `carousel.tsx`、`sidebar.tsx` | 取 P1 版，prettier 收敛 P2 风格（见四-③） |
| ⑤ **真实功能差异** | 1 | `chart.tsx` | **取 P1/P3/P4 安全版**，P2 升级（见四-④） |

**基线选择建议：以 P1 为 `@yyc3/ui` 基线**。理由：P1=P3=P4 ui 等价取其一即可；P1 为域制架构参考项目、本轮已完成首页切换与测试归零（导航四文件 62/62）、dev 端口已合规 3030，处于最干净可验证状态。

## 四、需人工介入的 4 件明细

### ① `resizable.tsx` — L0（四项目字节全同）

四项目 sha1 完全一致，直接入包，无动作。

### ② `page-header.tsx` — 缺件（P1/P3/P4 有，P2 缺）

- P1/P3/P4 字节全同（887 B）；**P2 ui 目录无此件**（已全目录确认，P2 仅有业务 `*Page.tsx` 与 `components/ide/PanelHeader.tsx`，非同一原子件）。
- 该件为四项目共认的自研页头原子件（主文档 5.2 已录「均含自研 page-header」，P2 实况为**缺失**，据实修正）。
- **动作**：随 `@yyc3/ui` 发布后，P2 改引包即补齐；Phase 4 检查 P2 现有页面是否内联了等价页头 JSX 需收敛。

### ③ `carousel.tsx` / `sidebar.tsx` — L1（风格差，实质等价）

| 文件 | P1/P3/P4 | P2 | 最小 Jaccard |
| ---- | -------- | -- | ------ |
| `carousel.tsx` | 5836 B | 5606 B | 0.974 |
| `sidebar.tsx` | 21925 B | 21663 B | 0.990 |

原始 diff 佐证（剔除文件头后）：

- `carousel`：仅 `if (!api) {return;}` 与 `if (!api) return;` 的花括号风格差异，逻辑相同；
- `sidebar`：骨架随机宽度 P1 用模块顶层函数 `generateRandomSkeletonWidth()` + `useState` 懒初始化，P2 用内联 `useMemo(()=>…,[])`——运行结果等价（均为 50~90% 宽度、仅算一次）。

**动作**：取 P1 版入包；prettier 统一后 P2 风格差异消失，无需手工合逻辑。

### ④ `chart.tsx` — L1（唯一真实功能差异，安全加固）

| 维度 | P1/P3/P4 | P2 |
| ---- | -------- | -- |
| 字节 | 10479 B | 9997 B |
| 颜色安全 | ✅ `SAFE_COLOR_RE = /^#[0-9a-fA-F]{3,8}$\|^rgb[a]?\(...\)$/` 白名单，`color = rawColor && SAFE_COLOR_RE.test(rawColor) ? rawColor : ''` | ❌ 直接使用 `color`，无校验 |
| ChartLegend 字段 | 含 `label?: any` | 缺 `label` |

最小 Jaccard 0.981。**P2 缺少图表颜色值白名单校验（潜在非法色值/样式注入面）**。
**动作**：**以 P1/P3/P4 版为准入包**（更安全、字段更全）；P2 升级到该版。此为本台账唯一需要「带功能修复合入」的组件。

## 五、L0\* 清单（44 件，代码逐字相同，仅文件头/格式差异）

> 下列四项目归一化 hash 全同，抽检 `button.tsx` 证实差异 = P2 缺 11 行文件头注释块。入包时统一取 P1 版并套用 Phase 1 `tools` 文件头规范（顺带清除 P1 现有的 `@version v1.0.0`、`[tag1],[tag2],[tag3]` 占位符）。

```text
accordion        alert-dialog     alert            aspect-ratio     avatar
badge            breadcrumb       button           calendar         card
checkbox         collapsible      command          context-menu     dialog
drawer           dropdown-menu    form             hover-card       input-otp
input            label            menubar          navigation-menu  pagination
popover          progress         radio-group      scroll-area      select
separator        sheet            skeleton         slider           sonner
switch           table            tabs             textarea         toggle-group
toggle           tooltip          use-mobile(.ts)  utils(.ts)
```

（共 44 件；含 `use-mobile.ts`、`utils.ts` 两个工具文件）

## 六、对 Phase 2 的直接输入（可执行清单）

1. 建 `packages/ui`，以 **P1 的 49 件**为基线拷贝（已含 `page-header`）；
2. 44 件 L0\* 与 2 件 L0 无需比对逻辑，直接进；过统一文件头（去占位符）+ prettier；
3. `chart.tsx` 保留 P1 的 `SAFE_COLOR_RE` 安全白名单与 `label` 字段（P2 升级点）；
4. 发布 `@yyc3/ui@0.x`，四 app 删除本地 `components/ui` 改引包；P2 因此**自动补齐 page-header**；
5. DoD 视觉兜底：以 5.3.5 的 69 张截图为 before 基线逐页对照；`pnpm why @mui` 须为空（P1/P3/P4 删 MUI 不在本台账范围，另立）；
6. 抽样回归重点：`chart`（安全白名单）、`sidebar`（骨架宽度）、`carousel`（自动播放守卫）三件 L1 的运行行为。

## 七、未覆盖范围与 Phase 0 后续

本台账仅覆盖 `components/ui` 原子件。Phase 0 仲裁台账还需补：

- [ ] **品牌件**（不在 ui/）：`GlassCard`、`YYC3Logo/YYC3LogoSvg`、`page-header` 消费方 —— 下一份台账；
- [ ] **布局骨架**：`Layout/Sidebar(business)/TopBar/BottomNav/CommandPalette`（四项目一致但需 hash 实证）；
- [ ] **hooks / lib / store 同源度**：为 Phase 3 `@yyc3/core` 建台账；
- [ ] **业务域 L0/L1/L2**：为 Phase 4 `@yyc3/business` 建台账（智慧酒店双版本为首个 L1 样板）；
- [ ] 四项目 **build/test 基线通过率 + bundle 体积**留档（P2/P3/P4 需先 `pnpm install`）；
- [ ] **pre-unification 冻结**：四项目当前均非 git 仓库（Phase 0 动作 1 阻断项，待 git init 决策）。

---

**台账状态**：ui 原子件 100% 覆盖（49/49）· 0 件 L2 · 可复算
**下一步**：品牌件+布局骨架台账（可复用 `ui-audit.mjs` 改路径），或按 M1 推进 monorepo 底座（待 git 冻结决策）。
