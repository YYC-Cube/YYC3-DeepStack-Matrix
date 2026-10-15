---
file: SECURITY.md
description: YYC³ CloudPivot Intelli-Matrix 安全政策与漏洞报告流程
author: YanYuCloudCube <admin@0379.email>
version: v1.0.0
created: 2026-10-15
updated: 2026-10-15
status: active
tags: [security],[policy],[vulnerability]
category: governance
---

# 安全政策（Security Policy）

> **不盲猜、不盲从——安全以实证为准绳。** 本文档定义受支持版本、漏洞报告渠道与响应承诺。

## 受支持版本

本项目为单主干发布模式（`main` + tag `v*`），仅对最新发布线提供安全支持：

| 版本 | 支持状态 |
| ---- | -------- |
| latest（`main` / 最新 tag） | ✅ 支持 |
| 历史版本 / 旧 tag | ❌ 请升级 |

## 报告漏洞

**请勿通过公开 GitHub Issue 报告安全漏洞。**

### 推荐渠道：GitHub 私密漏洞报告

[Security 标签页](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix/security) → **Report a vulnerability**（私密披露流程，支持附件与后续沟通）。

### 备用渠道：邮件

**<admin@0379.email>**——标题注明 `[Security]`，正文包含：

1. 漏洞类型（XSS / 注入 / RCE / 越权 / 依赖链 / 供应链等）
2. 影响范围（哪一端 / 哪个包 / 哪条代码路径）
3. 复现步骤或 PoC（最小化，勿附破坏性载荷）
4. 你的评估（严重程度 + 理由）

### 响应承诺

| 阶段 | 时限 |
| ---- | ---- |
| 确认收到 | ≤ 3 个工作日 |
| 初步评估（定级 + 影响面） | ≤ 7 个工作日 |
| 修复发布 | 高危（Critical/High）以最快通道出 patch 版本；中低危随下个常规版本 |

修复前我们会在安全 advisory 中协调披露节奏；报告人可要求署名（或匿名）。

## 安全基线（持续运行）

本仓库的自动化安全防线：

| 防线 | 机制 | 触发 |
| ---- | ---- | ---- |
| SAST | CodeQL 静态扫描 | 每次 push/PR（[code-scanning](https://github.com/YYC-Cube/YYC3-DeepStack-Matrix/security/code-scanning)） |
| 依赖审计 | `pnpm audit --audit-level high` | CI 安装步骤（`|| true` 记录态，高危即跟踪修复） |
| 门禁 | `verify-gates.sh` G1-G6 | 本地 + CI 双跑（strict tsc / build / mock / i18n / 复用率） |
| 锁文件 | `pnpm install --frozen-lockfile` | CI 强制（杜绝锁文件漂移注入） |

### 贡献者安全纪律

- 无硬编码密钥/Token；敏感信息走环境变量
- 依赖新增须说明用途与维护活跃度（最小依赖原则）
- 用户输入校验在系统边界完成（表单 / API / 文件上传）
- 错误信息不泄露内部细节（路径、栈、连接串）

## 已知范围说明

- 本项目为**本地闭环看盘系统**：默认无远端服务端，数据面以本地存储（localStorage / IndexedDB）与 Electron 沙箱为边界
- Electron 打包默认关闭自动签名发现（`CSC_IDENTITY_AUTO_DISCOVERY=false`），发布前请自行评估分发渠道的完整性校验

---

**维护方**: YanYuCloudCube
**反馈渠道**: <admin@0379.email>

> 「***YanYuCloudCube***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
