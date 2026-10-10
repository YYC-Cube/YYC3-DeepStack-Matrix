---
file: 04-P6-像素比对与axe首扫台账.md
description: Phase 6 — 像素级视觉比对（61/61 全 PASS 基线可复现性实证）+ axe-core a11y 全量首扫基线（8 规则存量登记）+ 四件 L0 包化复用率达标实录
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.0.0
created: 2026-10-11
updated: 2026-10-11
status: active
tags: [phase6],[pixel-diff],[axe],[a11y-baseline],[l0-packaging],[reuse-80]
category: report
---

# 像素级视觉比对 + axe 首扫 + 复用率达标

## 一、像素级比对（vs 基线 61 张，2026-10-11）

| 项 | 结果 |
| ---- | ---- |
| 工艺 | 四端并行起服（P1=3034/P2=3031/P3=3032/P4=3033）GHOST 全权重采 → Pillow ImageChops 灰度 diff vs `visual-baseline/` |
| 判定 | **PASS 61/61（100%）**——显著差像素（>30 灰阶）占比全部 <0.5% |
| DYNAMIC/REVIEW | 0 / 0（含首页时钟环——animations disabled + 分钟级粒度下稳定） |
| 结论 | **基线可复现性实证**：同 HEAD 两次独立采集逐像素稳定，`toHaveScreenshot` 式门禁（阈值 0.5%）可直接落地 |

> 工艺备注：脚本 `/tmp/p6-visual-diff-axe.py`（重采+比对+axe 三合一）；比对报表 `/tmp/p6-diff-summary.json`。

## 二、axe-core a11y 全量首扫基线（61 页）

**注入方式**：Playwright `add_script_tag`（本地 `axe-core@4.14.0`，免外网）；扫描面 = 四端 61 路由全量。

| 规则（impact） | nodes | 修复方向（后续专项） |
| ---- | ---- | ---- |
| region (moderate) | 1681 | 嵌套滚动区补 `role`/`aria-label`（GlassCard 容器族） |
| **button-name (critical)** | **536** | 图标按钮补 `aria-label`（影响最大——Lighthouse button-name 同源项） |
| landmark-one-main (moderate) | 61 | Layout 补 `<main>` 地标（每页 1） |
| page-has-heading-one (moderate) | 44 | 页面补 h1（PageShell 型谱层统一） |
| label-title-only (serious) | 6 | 表单 label 关联改造 |
| svg-img-alt (serious) | 5 | 装饰 svg 补 title/aria-hidden |
| select-name (critical) | 2 | 下拉补关联 label |
| scrollable-region-focusable (serious) | 1 | 滚动区 tabindex 补 |

**定性**：a11y 存量基线登记（不阻断）——button-name/landmark/page-has-heading-one 三项为修复优先级 TOP3，与 a11y 基线清单（phase5-ledger/02 二节）对照闭环；全量明细 `/tmp/p6-diff-summary.json`。

## 三、四件 L0 包化（复用率 79→83.5 达标实录）

**审计**：三端遗留 50 件 md5 同一性扫描 → 三端全同 L0 ×4（零相对引用障碍）：

| 件 | 行数 | 归属包 | 依赖判定 |
| ---- | ---- | ---- | ---- |
| HotelDashboard | 885L | `@yyc3/ai-family/hotel-dashboard` | 消费 business/hotel-engines + ai-family/shared——ai-family→business 单向已有（business 只依赖 core/ui，反向则循环，归属唯一解） |
| UnifiedModelManager | 465L | `@yyc3/admin/unified-model-manager` | 唯一相对引 `../types` 的 ConfiguredModel 真源在 core/types → 改包引即净 |
| ArchitectureAudit | 725L | `@yyc3/ide/architecture-audit` | routes lazy 消费，import 已全包引 |
| RefactoringReport | 861L | `@yyc3/ide/refactoring-report` | 同上 |

**执行**：cp 入包 ×4 + exports 子路径 ×4 条 + barrel ×2（ai-family/admin index）→ 消费方切换 9 处（三端 routes ×3 + SystemSettings ×3）+ 残余清扫 10 处（端侧测试 ×8 + P1 business/dev barrel ×2）→ **git rm 三端 12 副本**。

**验证**：三包 tsc=0 一次过（源码直编 + import 全包引的 L0 红利）；三端 tsc=0；抽测 P1 25/25 + P3 6/6 + P4 19/19（P3/P4 SystemSettings mock 存量补 GlassCard——P5b P1 修法三端补齐）。

**复用率终值**：

| 口径 | 包化前 | 包化后 |
| ---- | ---- | ---- |
| [B] 四端承接率 | 54.5% | 57.0%（188→192 件，遗留 157→145） |
| **[B'] 三端净承接率** | 79.0% | **83.5% ✅ DoD ≥80% 达标**（192/230） |
| 端侧遗留（三端） | 50 | 38（P1 modules 12/P3 13/P4 13——ConfigCenter/PageConfigEditor/SystemSettings/UnifiedSettingsPanel config 域绑定 + dev 文档域 + design-system P3≡P4 版本差） |

## 四、执行结论

- **像素门禁可落地**：61/61 <0.5% 稳定，Playwright 快照门禁（toHaveScreenshot maxDiff 0.5%）具备接入条件
- **a11y 基线立账**：8 规则存量 + TOP3 修复方向（button-name 536 / landmark 61 / h1 44）——后续按 `@yyc3/ui` 原语层统一修
- **复用率 DoD 达标**：四件 L0 包化（2937L 迁移）推三端净 79.0→83.5%，超线 3.5 点；端侧 38 件全为定性留端（config 域绑定/dev 文档语义/routes 级）
- **包化纪律再证**：md5 三端全同 + 依赖方向判定（HotelDashboard 循环规避）+ 相对引用真源核验（ConfiguredModel）——L0 工艺三查全过才动手
