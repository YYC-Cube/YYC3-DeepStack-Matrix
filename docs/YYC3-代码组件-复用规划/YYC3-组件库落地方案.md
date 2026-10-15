---
file: YYC3-组件库落地方案.md
description: YYC³ 自有组件库落地方案 v2.1 - 以 π³ 为事实源,三仓四地格局,当前主任务为双副本分叉收敛
author: YYC³ 总控工程师导师
version: v2.1
created: 2026-08-18
updated: 2026-08-19
status: active
tags: [component-library],[architecture],[shadcn],[radix-ui],[pnpm],[tsup],[pai-cube],[ui-mono],[fork-reconciliation]
category: solution
language: zh-CN
---

# YYC³ 组件库落地方案(v2.1)

> **文档定位**:回答「Next.js + React + Vite + shadcn/ui + Radix UI + pnpm 这套技术栈,如何协同落地成一套自有组件库」,并给出结合 π³ 双副本实测现状的可执行路径。

## 版本变更记录

**v2.1 变更**(2026-08-19,发现 π³ 第二副本后):

发现 `/Volumes/Max/YYC3-π³/` 是 π³ 的**分叉工作副本**(与 `/Users/yanyu/YYC-Cube/YYC3-Family-PAI-Cube` 同源分叉),且**一体化入库的 Phase 2-7 已在该副本执行完毕**(v2.0 曾误判为"规划未执行")。格局从"三仓"变"**三仓四地**",**当前最高优先级任务从"入库"变为"分叉收敛"**(第六部分 Phase R)。

**v2.0 变更**(2026-08-19,引入 PAI-Cube 实测):

| # | 决策项 | v1.0 结论 | v2.0 起结论 | 依据 |
|---|--------|-----------|------------|------|
| 1 | 组件库落点 | 新建独立仓库 | **π³ 为唯一事实源**,不新建仓库 | π³ 已占 @yyc3 npm scope 并发布 @yyc3/ui@2.0.2;`init-component-library.sh` 弃用 |
| 2 | 构建工具 | Vite lib mode | **tsup(ESM-only + dts)** | π³ 11 包既成标准 |
| 3 | Registry | 改造 add-component.js | **复用 π³ CLI registry 引擎** | 已符合 shadcn 官方 schema |

其余 v1.0 决策被实证加强:混合分发、peer `>=18||>=19` 双轨、零 next 依赖、不打包 CSS、ESM-only、changesets。

---

## 第一部分:三仓四地格局——先把"谁在哪"定清楚

### 1.1 全景图

```
┌──────────────────────────────────────────────────────────────────────┐
│  ① YYC3-设计工具-组件插件(/Volumes/Max/.../YYC3-设计工具-组件插件)      │
│     规划与分析层(本文档所在);资产:UI-MONO 源仓、图标库、参考副本       │
└──────────────┬───────────────────────────────────────────────────────┘
               │ 资产盘点/方案输出
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ② π³-旧副本(/Volumes/Max/YYC3-π³)          ⚠️ 分叉 A,今日仍在活跃     │
│     origin → 旧仓 git@github.com:YanYuCloudCube/YYC3-FAmily-Pai.git    │
│     @yyc3/ui = 3.0.0-alpha.2 ⭐ 含全部入库成果:                          │
│       · 40 业务组件(10 分类)全部入库,40 测试 1:1 配套                  │
│       · 28 套三层正交主题(7+11+10=770 组合)+ themes 命令 + 44 测试     │
│       · CLI 1.2.0 发包就绪;adapt-component.mjs 入库流水线               │
│       · 全仓 907 tests passed                                           │
│     缺:i18n-react 包、PAI-Cube 侧的 CI/CD 与安全修复、dependabot 更新   │
├──────────────────────────────────────────────────────────────────────┤
│  ③ π³-新副本(/Users/yanyu/YYC-Cube/YYC3-Family-PAI-Cube)  ⚠️ 分叉 B    │
│     origin → 新仓 https://github.com/YYC-Cube/YYC3-Family-PAI-Cube ⭐  │
│     @yyc3/ui = 2.0.2(已发布 npm);registry 引擎、发布链、docs-site      │
│     独有:i18n-react 0.1.0 入库、CI/CD 修复、dependabot 安全更新         │
│     缺:全部入库成果(40 业务组件、28 主题、CLI 1.2.0)                   │
└──────────────┬───────────────────────────────────────────────────────┘
               │ npm publish → 依赖安装(收敛后仅此一条通道)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ④ UI-MONO(/Volumes/Max/.../YYC3-UI-MONO)                              │
│     应用消费端:251 app(160 Next.js + 75 Vite + 2 Nuxt)                 │
│     资产货源:134 组件(已入库 40)/ 20 主题 U01-U20 / 20 样板 T01-T20    │
│     现状:10/251 消费 @yyc3/ui;160 app 内嵌副本待回收                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 分叉实证(git 考古)

两副本共同祖先 `b8610b43`(2026-06-20),之后各自演进:

| | 分叉 A(旧副本 /Volumes/Max/YYC3-π³) | 分叉 B(新副本 PAI-Cube) |
|---|---|---|
| 独占提交 | `ecb47110` 完善规范文档(8-19)→ `7cc38662` **Phase 6-7 主题统一+CLI 1.2.0**(8-19,153 文件 +25811 行)→ `378bc9db` IDE 修复(8-19,**未推送**) | `5a287de5` README 家训+CLI 完善(7-12)→ `d406e1e2` dependabot(7-12)→ `da6079a2` merge PR#1(7-15)→ `9f5cbf78` CI/CD 修复+i18n-react 入库(7-15) |
| @yyc3/ui | **3.0.0-alpha.2**(exports 16 子路径) | 2.0.2(exports 5 子路径) |
| 测试 | 907 passed | 840+ passed |
| 特征 | Trae 编辑器驱动,组件库主战场 | 指向当前有效 GitHub 组织(YYC-Cube),基础设施主战场 |

**判定**:两者互不包含,**必须 merge**;收敛目标 = 分叉 B 的远端与基础设施 + 分叉 A 的入库成果。

### 1.3 三个 @yyc3/ui 的收编(随 v2.1 更新)

| 版本 | 位置 | 处置 |
|------|------|------|
| 1.0.0 | UI-MONO packages/ui(源码直出) | 停止演进 → 转发层 → 移除 |
| 2.0.2 | π³ 分叉 B(已发 npm) | 收敛后的**发布基线** |
| **3.0.0-alpha.2** | π³ 分叉 A(未发布) | **收敛合并的对象**,合并后走 beta → 3.0.0 正式发布 |

---

## 第二部分:技术栈协同——六层模型(π³ 实证版,结论不变)

```
组织层  pnpm workspace(π³ 11+ 包 / UI-MONO 251 app)
行为层  Radix UI(统一 radix-ui@^1 单包导入)
封装模式 shadcn/ui(cva + data-slot 新版写法,56+1 组件)
样式层  Tailwind CSS 4(组件零 CSS 产物,28 套正交主题 tokens)
构建层  tsup:ESM-only + dts + splitting(全仓统一)
消费层  Next.js(160 app)+ Vite React(75 app),peer >=18||>=19 双轨
```

实证要点(继承 v2.0):tsup 优于 Vite lib mode(11 包既成标准,Vite 只做 demo/演练场);`radix-ui` 统一包导入消除版本漂移;`"use client"` 64+ 文件已标注;ui 包只依赖 tailwind-merge、宿主自带 Tailwind(CLI 注入 TW4 语法的 `tailwind.css`)。

---

## 第三部分:现状与差距(双副本视角)

### 3.1 分叉 A 的既有成果(v2.0 误判"未执行",特此修正)

对照《一体化入库规划方案》的 Phase 计划,分叉 A 完成度:

| 规划 Phase | 内容 | 实测完成度 |
|-----------|------|-----------|
| Phase 1 基础建设 | business 目录/入库标准/adapt-component.mjs/exports 扩展 | ✅(脚本与 16 子路径 exports 在) |
| Phase 2-4 组件入库 | P0 10 + P1 15 + P2 15 = 40 组件 | ✅ **40/40**,分类与规划一致(ai/enterprise/data/system/platform/charts + 扩展 security/pwa/enhanced/dialogs),每组件配 Vitest |
| Phase 6 主题统一 | 主题合并 + oklch 统一 | ✅ 超额:28 套三层正交架构(7 基础 × 11 风格 × 10 场景 = 770 组合)+ themes 命令 + 注入器 + 44 测试 |
| Phase 7 文档发布 | CLI 1.2.0 / CHANGELOG / typedoc | ✅ 发包就绪(未 tag 发布) |
| Phase 5 样板集成 | T01-T20 注册 CLI | ❌ 未见(待确认 CLI templates) |
| UI-MONO 消费切换 | 规划 7.6 | ❌ 未开始 |

### 3.2 综合缺口清单(v2.1 修订)

| # | 缺口 | 状态(v2.1) |
|---|------|------------|
| 0 | **⚠️ 双副本分叉未收敛**(新)| 最高优先级:两线各有独占提交,旧副本仍在向旧仓推送,持续分叉中 |
| 1 | 无 `components.json` | 仍缺(shadcn 官方 CLI 无法直连) |
| 2 | 宿主接入文档缺失 | 仍缺(Tailwind `@source` 指向 dist 的说明) |
| 3 | 无 React 消费端示例/demo 站 | 仍缺(examples 仅 basic-usage.ts) |
| 4 | React devDeps 分裂(18.3.1/19.x) | 仍在(有意为之,但缺双版本 CI 矩阵) |
| 5 | README 徽章与实际不符 | 仍在 |
| 6 | 元数据毛边 | 仍在:repository url 全线指向旧仓 YanYuCloudCube/YYC3-FAmily-Pai;ui 空目录;peerMeta optional 未标 |
| 7 | ~~业务组件未入库~~ | **✅ 已完成**(分叉 A,40/40 带测试) |
| 8 | ~~主题双体系未合并~~ | **✅ 已完成**(分叉 A,28 正交主题;Uxx ↔ 语义名映射表待补) |
| 9 | overrides 而非 catalog | 仍待渐进迁移 |
| 10 | 3.0.0 未发正式版 | alpha.2 困在分叉 A,收敛后推进 beta → 正式 |
| 11 | UI-MONO 消费端回收 | 未开始(160 内嵌副本,复用率 10/251) |

### 3.3 UI-MONO 侧(货源与消费端)

20 套主题(U01-U20)、20 套样板(T01-T20)、134 组件(62 基础 + 8 增强 + 64 业务)——其中 40 业务组件已入库,**剩余 94 个组件中 62 个基础组件可视为被 π³ 56 个新版覆盖(diff 对齐即可),8 个增强组件在分叉 A 的 enhanced/pwa 分类中已有对应,样板 20 套仍待注册 CLI**。`init-component-library.sh` 维持弃用。

---

## 第四部分:目标架构(不变,标注完成度)

```
       组件唯一事实源 = π³ packages/ui(收敛后 @yyc3/ui v3.x)
              │
   ┌──────────┴──────────────┬─────────────────┐
   │ npm 包通道               │ registry 通道     │ VitePress + demo 站
   ▼                         ▼                 ▼
pnpm add @yyc3/ui      yyc3 add <component>     docs.yyc3.top(API/规范)
(Next/Vite/Nuxt)       (源码复制,可改)          apps/demo(待建:RSC 验证)
```

- **v3 形态已实现**(分叉 A):`/` `/core` `/components` `/business`(+9 个分类子路径)`/themes` `/shadcn` 共 16 入口;
- 依赖铁律不变:业务向下依赖基础、零 next、UI 零网络副作用、重依赖下沉业务层;
- 跨仓消费:npm 安装为主,联调用 `pnpm link` / `npm pack` / git 依赖,消费方只吃 dist;
- 文档双轨:VitePress(已有)+ apps/demo·Next.js 15(待建,兼 RSC 哨兵)。

---

## 第五部分:关键工程问题(要点不变,补充两条)

继承 v2.0 全部结论:Tailwind 边界(组件零 CSS,宿主 `@source` 扫 dist)、RSC("use client" 规范 + demo 验证)、registry 引擎扩充(π³ CLI 已就绪,业务组件/样板/主题逐条登记,补 components.json 后官方 shadcn CLI 可直连)、版本策略(peer 双轨 + changesets + catalog 渐进)、入库标准九条。

**v2.1 补充 1——收敛后的仓库元数据统一**(一次性整改):origin/repository url/homepage/bugs 全线从 `YanYuCloudCube/YYC3-FAmily-Pai` 改为 `YYC-Cube/YYC3-Family-PAI-Cube`;旧仓标记 archived 防误推。

**v2.1 补充 2——主题双轨命名**:28 套正交主题已落地,U01-U20 作为**兼容别名**保留映射表(`U03-aurora-gradient` → `aurora-gradient` 基础层组合),服务 UI-MONO 存量引用习惯。

---

## 第六部分:落地路径(v2.1 重排:收敛优先)

### Phase R:双副本分叉收敛(🔴 当前唯一主任务,0.5-1 天)

```
# 1. 停止双线开发(分叉 A 的未推送提交 378bc9db 先处理)
git -C /Volumes/Max/YYC3-π³ push origin main        # 推到旧仓留档(或直接进 merge)

# 2. 在新副本引入分叉 A 的提交线
cd /Users/yanyu/YYC-Cube/YYC3-Family-PAI-Cube
git remote add pi3-old /Volumes/Max/YYC3-π³         # 本地 remote,免碰旧 GitHub
git fetch pi3-old
git merge pi3-old/main                              # 共同祖先 b8610b43,真三方合并
# 预期冲突点:README(家训段 vs 品牌段)、根 package.json(pnpm-workspace 包列表
#   + i18n-react)、eslint.config.mjs、cli CHANGELOG —— 全部手工合,不取单边

# 3. 合并后统一验证
pnpm install && pnpm -r build && pnpm -r test && pnpm -r typecheck
# 验收:i18n-react 与 3.0.0-alpha.2 共存;907+840 线测试全绿;16 子路径 exports 完好

# 4. 元数据与远端收口
#    · repository/homepage/bugs → YYC-Cube/YYC3-Family-PAI-Cube
#    · push 新仓 main;旧仓 GitHub 上 archive
#    · 分叉 A 本地副本:origin 改指新仓(或退役为只读归档,后续只在新副本开发)

# 5. 发 3.0.0-beta.1(changesets),npm dist-tag 保持 next 直到 Phase 0' 完成
```

**风险与注意**:合并前勿在任一副本继续功能性提交;`378bc9db`(IDE 修复)未推送,merge 源用本地副本可将其一并带入;i18n-react 与 CLI 1.2.0 的 changesets 状态需重算。

### Phase 0':补缺(收敛后,~1 周)

components.json + 宿主接入文档(缺口 1/2)→ apps/demo(Next.js 15)+ 最小 playground(缺口 3)→ React 18/19 双矩阵 CI(缺口 4)→ README 徽章/repository/空目录/peerMeta 清理(缺口 5/6)→ catalog 渐进迁移(缺口 9)。

### Phase 1-4 / 6-7:✅ 已完成(在分叉 A,随 Phase R 并入)

业务组件 40/40、28 正交主题、CLI 1.2.0——并入后只需补 demo 站条目与 registry 登记核对。

### Phase 5:样板集成(剩余项)

T01-T20 注册 CLI templates,先 5 套高频(admin-dashboard / landing-page / data-dashboard / crm-system / saas-platform)。

### Phase 7':3.0.0 正式发布

beta 验证 → 双端验证矩阵全过 → changesets 发 3.0.0(README 徽章同步修正)。

### Phase 8:UI-MONO 消费端回收(滚动)

试点 2-3 个高重复 app → 迁移脚本(import 重写 + 删内嵌副本 + `@source` 配置)→ 按 `yyc3-dup-hashes.txt` 重复度排序批量推进 → `tools/create-app.js` 新 app 默认依赖 npm 版 → UI-MONO packages/ui 转发层化。目标:复用率 10/251 → 60+。

### 6.3 双端验证矩阵(Phase 0'/7'/8 各批次必跑)

| 验证项 | 通过标准 |
|--------|----------|
| Next.js 15 消费(apps/demo RSC 页) | 构建/运行零错 |
| Vite 消费(playground) | dev/build 样式完整 |
| Tailwind 扫描(宿主仅 `@source` dist) | 类名全部生成 |
| 主题切换(≥3 套正交组合) | 变量生效,零具象色 |
| tree-shaking | 无 recharts/framer-motion 泄入 chunk |
| React 18 与 19 双轨安装 | 均可运行 |
| registry(`yyc3 add <新组件>`) | 干净项目一次拉起 |

---

## 第七部分:与 251 个存量应用的关系(结论不变)

npm 依赖消费(非 workspace);React 18/Next 14/TW3 存量先吃 2.x 线过渡,TW3 宿主配 theme 兼容变量文件或随 app 升 TW4;3.0 收紧线在主体回收后另议。详见 v2.0 第七部分(消费路径、回收节奏、版本兼容期)。

---

## 附录

### A. 决策记录(v2.1)

| 决策 | 结论 |
|------|------|
| 组件库事实源 | π³(不新建仓库,init 脚本弃用) |
| 构建工具 | tsup ESM-only |
| Registry | π³ CLI 引擎扩充 |
| 分发 | 混合(npm 包 + registry) |
| 文档 | VitePress + 待建 Next.js demo 站 |
| **收敛方向(v2.1)** | **新仓 YYC-Cube/YYC3-Family-PAI-Cube 为唯一远端;分叉 A 入库成果 merge 入分叉 B;旧仓 archive** |
| 版本 | 收敛后 3.0.0-beta.1 → Phase 0' → 3.0.0 |
| 主题 | 28 正交主题 + Uxx 别名映射 |
| UI-MONO | 货源 + 消费端;packages/ui 终态为转发层 |

### B. 三仓四地对照(实测 2026-08-19)

| 维度 | ② π³ 旧副本(分叉 A) | ③ π³ 新副本(分叉 B) | ④ UI-MONO |
|------|---------------------|---------------------|-----------|
| @yyc3/ui | 3.0.0-alpha.2,16 入口 | 2.0.2,5 入口(已发 npm) | 1.0.0 源码直出 |
| 业务组件 | 40/40 入库 + 40 测试 | 0 | 64(货源) |
| 主题 | 28 正交 + themes 命令 | 20 预设 | 20 套模板(U01-U20) |
| 独有 | 入库全套、adapt 脚本、IDE 修复 | i18n-react、CI/CD 修复、dependabot | 251 app、样板 T01-T20 |
| 远端 | 旧仓 YanYuCloudCube(应弃) | 新仓 YYC-Cube ⭐ | 无(本地) |
| 测试 | 907 | 840+ | 无 |

### C. 关键参考

| 资料 | 位置 |
|------|------|
| 一体化入库规划(上游蓝图,Phase 2-7 已执行) | π³ `docs/YYC3-UI-MONO-一体化入库规划方案.md` |
| π³ 工程规范 / 文档闭环 | π³ `AGENTS.md` / `FULLCHAIN.md` |
| registry 引擎 | π³ `packages/cli/src/registry/` |
| 本方案历史版本 | v1.0(新仓规划)、v2.0(π³ 定源)——见对话归档 |

### D. 本周执行清单(v2.1)

```
□ 1. 【今天】Phase R 分叉收敛:push 378bc9db → 新副本 merge pi3-old/main →
      冲突手工合(README/package.json/eslint/cli)→ 全仓 build/test 验证
□ 2. 元数据统一:repository url → YYC-Cube/YYC3-Family-PAI-Cube;旧仓 archive;
      分叉 A 本地副本退役或改指新仓
□ 3. changesets 发 3.0.0-beta.1(dist-tag: next)
□ 4. Phase 0' 启动:components.json + 宿主接入文档 + apps/demo 骨架
□ 5. UI-MONO 选 1 个 app 试点消费 beta 版,验证 npm 通道 + @source 扫描
```

---

**文档状态**: 🟢 活跃 | **版本**: v2.1 | **更新**: 2026-08-19 | **负责人**: YYC³ 总控工程师导师

> 💡 **提示**: 组件库主体建设已完成于分叉 A,当前一切工作让位于 Phase R 收敛——**先合并,再补缺,再发布**。在新副本完成合并之前,勿在任一副本继续功能性提交。
