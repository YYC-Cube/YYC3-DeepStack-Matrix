---
file: YYC3-远程漏洞-扫描修复闭环.md
description: YYC³ DeepStack-Matrix 远程漏洞扫描与修复闭环（OSV + registry 双源复核，uuid 实修归档）
author: YanYuCloudCube <admin@0379.email>
version: v1.1.0
created: 2026-10-15
updated: 2026-10-15
status: active
tags: [security],[audit],[vulnerability],[pnpm-audit],[osv]
category: report
related: ["YYC3-多维分析-安全加固.md", "YYC3-开发者-安全合规.md"]
---

# 🛡️ 远程漏洞扫描与修复闭环

> **不盲猜、不盲从——安全以实证为准绳。** 本台账记录 2026-10-15 全量远程漏洞扫描：
> 数据源为 **OSV 公告库实时 API**（GHSA 详情/影响范围/补丁线）与 **npm registry 实况**
> （dist-tags / versions / 依赖声明），修复策略逐条实证裁决。

## 一、扫描方法

```bash
pnpm audit --audit-level low          # registry 公告库全量比对（含 ignoreGhsas 豁免面）
pnpm audit --json                     # 结构化清单（advisories + metadata）
# 逐条 GHSA 远程复核（实时公告详情：affected ranges / fixed events / CVSS）：
curl https://api.osv.dev/v1/vulns/GHSA-xxxx
# 消费链取证：
pnpm why <pkg>                        # 依赖链逐跳还原
pnpm view <pkg> dist-tags --json      # 上游版本线实况
```

## 二、扫描结果总览（2026-10-15）

- **依赖面**：total 1337（direct 284 / dev 1037 / optional 161）
- **命中公告**：4 条（2 HIGH + 2 MODERATE），**0 critical**
- **全部位于 dev-only 工具链传递依赖**（@lhci/cli / electron-builder），运行时产物零触达

| GHSA | CVE | 等级 | 包 | 消费链 |
| ---- | ---- | ---- | ---- | ---- |
| GHSA-jmr9-qjv8-65gv | CVE-2026-56876 | HIGH | extract-zip 2.0.1 | @puppeteer/browsers 2.13.2 ← puppeteer-core 24 ← lighthouse 12.6.1 ← @lhci/cli |
| GHSA-7pqw-9j4j-h8q3 | CVE-2026-19693 | HIGH | extract-zip 2.0.1（同上） | 同上 |
| GHSA-hp3w-g68c-fv3c | CVE-2026-97058 | MODERATE | sprintf-js 1.0.3 / 1.1.3 | ① @lhci/utils→js-yaml@3→argparse；② electron-builder→@electron/get→global-agent→roarr |
| GHSA-w5hq-g745-h8pq | CVE-2026-41907 | MODERATE | uuid 8.3.2 | @lhci/cli 直接依赖 |

## 三、逐条裁决与修复

### 3.1 uuid 8.3.2 —— ✅ 实修（豁免移除）

- **远程实证**：OSV 公告 fixed 事件明确——`11.1.1+ / 12.0.1+ / 13.0.1+` 修复（registry dist-tags：legacy-11=11.1.1 / legacy-13=13.0.2 / latest=14.0.3）
- **修复**：[pnpm-workspace.yaml](../../../pnpm-workspace.yaml) overrides 增 `"uuid@^8.3.1": "^11.1.1"`（@lhci/cli 声明范围 ^8.3.1 定向覆盖）
- **版本线仲裁**：选 legacy-11 而非 latest 14——8→11 为最小 API 距离补丁线（CJS require + v4 命名导出兼容）；13/14 线 ESM 化，对 CJS 工具链风险高
- **运行时冒烟**：@lhci/cli require 上下文实测 `uuid 11.1.1` + `v4()` 正常出号 + `lhci --version` 启动正常

### 3.2 extract-zip 2.0.1 —— ⚠️ 登记豁免（上游无补丁，链路双重不触达）

- **远程实证**：OSV 两条公告 affected 范围均 `last_affected: 2.0.1` **无 fixed 事件**；registry latest 仍 2.0.1，上游未发布任何补丁版本
- **链内摘除评估**：@puppeteer/browsers 3.x 已彻底移除 extract-zip（deps 仅 yargs + modern-tar），但 puppeteer-core **24 线全程捆绑 browsers 2.13.2**（线内升级不可行）；lighthouse@12.6.1 锚定 puppeteer-core ^24.10.0，跨入 25 大版本线将波及 Lighthouse CI 门禁（perf ≥0.9 断言基线）
- **不触达论证**：漏洞代码路径仅在 @puppeteer/browsers **下载浏览器 zip** 时执行；本仓 CI（GitHub runner 预装 Chrome）与本地开发（系统 Chrome）均走 chrome-launcher 系统解析，下载路径不触达；且 zip 源为官方 Chromium CDN

### 3.3 sprintf-js 1.0.3 / 1.1.3 —— ⚠️ 登记豁免（上游无补丁，格式串不可控）

- **远程实证**：OSV affected `last_affected: 1.1.3` 无 fixed 事件；registry versions 终止于 1.1.3（1.0.3 同在受影响范围），**两条版本线均无补丁**
- **不触达论证**：双链消费方（LHCI 内部 yaml 解析、electron-builder 日志库 roarr）传给 sprintf 的格式串均为**工具内部常量**，无攻击者可控入口；漏洞本质是 DoS（CVSS A:L），且全部为构建期工具链

## 四、修复后状态

```text
修复前：4 ignored (2 moderate | 2 high)
修复后：3 ignored (1 moderate | 2 high)   ← uuid 公告连根消失（非豁免，是已修复）
```

- 复扫命令：`pnpm audit --audit-level low` → 命中公告仅剩 3 条已登记豁免
- **豁免台账**：[pnpm-workspace.yaml](../../../pnpm-workspace.yaml) `auditConfig.ignoreGhsas`（每条附 CVE 编号 + 复核日期 + 不触达论证）
- 豁免纪律：**上游发布补丁即移除豁免并复扫**；本台账与豁免登记同步更新

## 五、复扫 SOP（下次执行）

1. `pnpm audit --audit-level low` 取全量清单（含豁免面）
2. 对每条豁免 GHSA 拉 `https://api.osv.dev/v1/vulns/<GHSA>` 查 fixed 事件
3. 有补丁 → 加 overrides 定向覆盖（最小 API 距离版本线）→ 冒烟 → 移除豁免
4. 无补丁 → 刷新豁免登记的复核日期与证据
5. `pnpm install --no-frozen-lockfile` + `pnpm gates:quick` + 受影响工具链冒烟
6. 更新本台账 + 提交（锁文件与 workspace.yaml 同 commit）

---

**维护方**: YanYuCloudCube
**反馈渠道**: <admin@0379.email>（安全漏洞私密报告见 [SECURITY.md](../../SECURITY.md)）

> 「***YanYuCloudCube***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
