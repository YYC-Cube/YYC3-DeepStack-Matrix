# YYC3-UI 归档索引

> 旧资产归档记录 — 保留历史，不丢数据
> 最后更新：2026-06-08 | 状态：✅ 物理归档完成

## 归档概览

| 项目 | 状态 | 说明 |
|------|------|------|
| 原始源项目 | 21 个目录 | ✅ 已通过符号链接归档至 `archive/source/` |
| 分类脚本 | 4 个文件 | ✅ 已复制至 `archive/scripts/` |
| MD5 去重记录 | 2 个文件 | ✅ 已保留 |
| 项目分类 | 373 个原始项目 | 已知分类（COMPLETE_NEXT/REACT/DOCS 等） |
| Monorepo 去重 | 306 个文件 | ✅ 已通过符号链接去重（apps 间） |

## 归档目录结构

```
archive/
├── INDEX.md              # 本文件
├── source/               # 原始源项目（符号链接，共 21 个）
│   ├── Call-UI/          → 原始 Call-UI 项目
│   ├── docs/             → 原始文档库
│   ├── kb-prep/          → 知识库准备
│   ├── Kolors-master/    → Kolors 项目
│   ├── Management/       → 管理后台
│   ├── Public/           → 公共资源
│   ├── Raptor-UI-prompt-hub/ → Raptor UI 提示词中心
│   ├── scripts/          → 原始脚本
│   ├── shadcn-ui.tnasdownload/ → shadcn UI 下载
│   ├── YYC3 AI Management/ → AI 管理
│   ├── YYC3-π³/          → YYC3 π³（5.3G）
│   ├── YYC3-CLI/         → YYC3 CLI 工具
│   ├── yyc3-mono/        → 旧 Mono 尝试
│   ├── YYC3-Nexus-Portal/ → Nexus 门户
│   ├── YYC3-Public-Icons/ → 公共图标库
│   ├── YYC3-Templates/   → 模板集合
│   ├── YYC3-Templates-Code-Applicatuons/ → 模板代码应用（3.6G）
│   ├── YYC3-UI/          → 原始 UI 库（2.9G）
│   ├── yyc3-ui-organized/ → 已组织的 UI
│   ├── YYC3-UI-Templates/ → UI 模板（1.4G）
│   └── yyc3-zero-ui-base/ → zero UI 底座
├── scripts/              # 原始脚本和分类数据
│   ├── yyc3-classify.sh
│   ├── yyc3-classification.txt
│   ├── yyc3-md5-all.txt
│   └── yyc3-dup-hashes.txt
└── *.dedup-bak           # 去重备份文件（分布在 apps/ 中）
```

## 源项目大小

| 项目 | 大小 |
|------|------|
| YYC3-π³ | 5.3G |
| YYC3-Templates-Code-Applicatuons | 3.6G |
| docs | 3.6G |
| YYC3-UI | 2.9G |
| Management | 1.8G |
| YYC3-UI-Templates | 1.4G |
| 其他 15 个项目 | ~2.5G |
| **总计** | **~25G** |

## Monorepo 去重统计

- 扫描 apps 文件：2,786 个 TS/TSX 文件
- 跨 app 重复组：115 组
- 已建立符号链接：306 个
- 去重后文件数：2,480 个
- Monorepo 内去重率：11.0%（文件级）

## 提取成果

| 产出 | 路径 | 说明 |
|------|------|------|
| 唯一底座 | `packages/base/` | Next.js 14 通用底座 |
| 组件库 | `packages/ui/` | 统一组件库 |
| 主题系统 | `packages/theme/` | CSS 变量主题系统 |
| 10 套样板 | `apps/` | 独立风格样板，全部可启动 |
| 文档库 | `docs/` | 结构化文档 |
| 复用脚本 | `tools/` | 6 个工具脚本 |
| 去重工具 | `tools/dedup-apps.js` | apps 交叉去重工具 |