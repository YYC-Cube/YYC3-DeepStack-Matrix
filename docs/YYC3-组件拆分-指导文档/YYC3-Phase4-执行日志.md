---
file: YYC3-Phase4-执行日志.md
description: Phase 4 @yyc3/business — M4-0 勘察仲裁实证 + M4-1 分批规划 + i18n 上收 + M4-3 store 上收 + M4-2b business 域包化 + M4-2/3 ai/ops 域包化 + M4-4 admin/monitor 域包化 + M4-5 shared 域定性 + M4-6 ai-family 特深域包化达成
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.7.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase4],[business],[i18n],[store],[arbitration],[domain-package],[ai],[ops],[admin],[monitor],[shared],[ai-family],[handoff]
category: report
---

# 📒 Phase 4 执行日志 · @yyc3/business 业务域

> 规划输入：[`phase4-ledger/00-Phase4-任务规划与节点目标.md`](./phase4-ledger/00-Phase4-任务规划与节点目标.md)

## 本会话达成（2026-10-10）

| 节点 | 状态 | 结果 |
| ---- | ---- | ---- |
| M4-0 勘察 | ✅ | 三端 193 件 md5+diff 仲裁实证 + 依赖面测绘 + **主文档仲裁规则修正** |
| M4-1 规划 | ✅ | 分批策略 M4-2~8 落盘，试点域 = ai |
| M4-2a i18n 上收 | ✅ | `@yyc3/core/i18n` 达成（4 件 L0 + 三端切换 ~220 处）；**Phase 3 登记「i18n 语言包上收」兑现** |
| M4-2b ai 域包化 | ⏸ | 重新定性：与 zustand store 上收绑定（见偏差 #2），随 M4-3 |
| **M4-3 store 上收** | ✅ | **`@yyc3/store` 新包达成**（16 件 L0 + 依赖链两 lib 入 core + 27 类型补录 + 三端切换 232 处）；**五域包化硬前置解除** |
| **M4-2b business 域包化** | ✅ | **`@yyc3/business` 新包达成**（hotel-engines 5 lib + comm-station-panel + usePersistedState 入 core；切引 69 文件 + 删源件 16）；HotelDashboard/hotel-bridge 暂缓 M4-6（D4/D7） |
| **M4-2/3 ai 域包化** | ✅ | **`@yyc3/ai` 新包达成**（4 组件 + 3 hooks 上收 store + view-context/types 桥接入 core；133 文件 +751/−6164）；websocket-data 因 node-slice 归 store（防 core→store 循环） |
| **M4-2/3 ops 域包化** | ✅ | **`@yyc3/ops` 新包达成**（首批 9 组件 + 6 域 hooks 随包 + core/types ops 段 +37 类型；暂缓 9 件跨域障碍定性留端侧）；**M4-0「真全异」定性翻转：OperationChain/DatabaseManager 实为 P1≡P4 同源 + P3 单端滞后**；OperationChain 随包即 P3 升级 |
| **M4-4 admin+monitor 域包化** | ✅ | **`@yyc3/admin` + `@yyc3/monitor` 双新包达成**（10+20 组件、4+3 域 hooks 随包 + core/types admin/monitor 段 +54 类型 + store 收编 useSettingsStore/useBigModelSDK/global-store + useCopyFeedback 入 core）；**M4-0「真全异」归零**（CreateRuleModal 翻转 P1≡P4 同源）；三端切换 123 文件 + 端侧删 38 件/端；七包 tsc=0 + P1=67 基线 + build 三绿 |
| **M4-5 shared 域定性** | ✅ | **品牌 3 件消重（= @yyc3/ui 逐字节同）+ ops 二次包化 4 件（OperationCenter/ServiceLoopPanel 解锁 + QuickActionGrid/DataFlowDiagram）+ Phase 3 漏网 5 lib 收编 core + P2 同窗仲裁（切 2 留 3）**；DataFlowDiagram「反向独有」误登修正 4→3；九包 tsc=0 + P1 67→48（品牌断引修复正向）+ P2 基线逐字同 + build 三绿 |
| **M4-6 ai-family 特深域包化** | ✅ | **`@yyc3/ai-family` 新包达成（86 件 / exports 90 条：组件 37 + Page + slices 13 + hooks 5 + types 3 + lib 26 含 hotel-bridge）** + P1 死副本 36 件清障（tsc 48→0）+ P2 断链修复（tsc 7→0 + build 首绿）+ useClock 入 core + inference 6 类型并入 + MEMBERS_MAP 破环（store-backed 闭环包内）+ HotelDashboard 切包；**四端 tsc=0 / build 全绿——Phase 4 首次全零全绿** |

## M4-6 ai-family 特深域关键实证（2026-10-10 第八轮，方案 [`phase4-ledger/07`](./phase4-ledger/07-M4-6-ai-family域包化方案.md)）

### 死副本错链诊断（P1 48 错 + P2 7 错同窗根因）

- **P1 双层同名副本**：modules/ai-family/components（活层）与 components/ai-family（死副本 36 件）——**死副本 ≡ P3/P4 md5 逐字节全同**（引用按 P3/P4 结构写 `../../store/slices/` 在 P1 落空）且**零外部引用** → P1 48 错（TS2307×13 + 连锁×35）全源于死代码，git rm 后 **tsc 一次归零**
- **P2 断链**：`components/ai-family/` 空目录被 routes 引（AIFamilyRouter TS2307 + 15 条路由）；AIFamilyCenterPage/DesignDoc 引 `./ai-family/shared` 断链但**零消费方**（死代码删）；P2 AIFamilyPage 823L 引本地 useI18n = **P2 独走异构留端**，Router 切包

### 建包与四层仲裁落地

- **组件 37**：L0×8 + L1 纯路径差×25 + P1 独有 AgentSkills + P1 独走新版×2（FamilyCommCenter +97L/FamilyPhone +149L，P3/P4 随包升级——P1/P4 功能最全双源基线再现）；AIFamilyPage L1 纯路径差
- **slices 13**（11 L0 + 2 纯深度差）+ **hooks 5**（含新暴露 useResponsive）+ **lib 26**（19 域 lib 三端 13 L0/6 L1 + family-data-accessor + hotel-bridge 137L L0 + 新暴露 canvasPerfRegistry/yyc3-cluster×2/AchievementSystem 四件 L0 零外部消费随包）
- **MEMBERS_MAP 破环实证**：shared.ts L230 已内置 store-backed 重建机制（订阅 useFamilyMemberSlice + Object.keys 清重建 + getDynamicMembersMap）——slices 与 shared 同包后闭环包内自洽，M4-2b D4「运行时可变触点」障碍实测不成立；HotelDashboard 三端切 `@yyc3/ai-family/shared`
- **useClock 三端 L0 入 core**（AIFamilyPage 唯一端侧 hook 依赖）；**inference 6 类型并入 core/types**（1458→1583L，inference-types.ts 三端 L0）；ai-service-manager/inference-engine 改引 `@yyc3/core/types`；routes.tsx 删（aiFamilyRoutes 零端侧消费，壳层 ErrorBoundary 依赖随解）
- **peer 按实扫**：react/lucide-react/motion/react-router/zustand + clsx + **@mlc-ai/web-llm**（inference-engine 动态 import 运行时可选）；dep core/store/ui/business 四包（hotel-engines 单向无环）

### 验证矩阵与偏差（#23-#25）

- **十包 tsc=0**（theme/core/store/ui/business/ai/ops/admin/monitor/ai-family）；**四端 tsc=0**（P1 48→0 / P3=P4=0 保持 / P2 7→0）；**四端 build 全绿**（813/776/779ms + **P2 存量 7 错基线首次归零**——routes 断链为唯一 build 阻断源实锤）
- P2 vitest 1813 通过（rf-phase2 29/29 全绿含 RF-011 断链连带修复；52 失败全存量：Layout jsdom/DesignSystemPage/DevGuidePage/ModelProviderPanel/PWAStatusPanel 零本批改动）；P1 ai-family 抽测 136 例绿
- 偏差 #23 **perl 捕获组错位**（#17 同族第五犯：`(\.\./)+lib/(ALT)` 的 `$1` 指前缀组 → 56 文件 `lib/../` 损坏，checkout 恢复 + `$2` 修复版重切）；#24 grep 筛选断言误写（`yyc3-cluster|` 候选与 `"` 断言不匹配 `.types` 后缀漏筛 39 错三端）；#25 相对无段形态三漏（`./modules/ai-family/lib/`、`../ai-family/` 无 modules 段、`./slices/` barrel 内引——#6/#8 族教训固化：无段形态三类必枚举）
- **技术债登记**：失效 vi.mock 残留（M4-5 品牌删 + 本批 mv 后失联静默通过，TabBar/CLITerminal/Sidebar/TopBar 等 ~6 处）→ M4-7/M4-8 清扫

## M4-5 shared 域定性关键实证（2026-10-10 第七轮，方案 [`phase4-ledger/06`](./phase4-ledger/06-M4-5-shared域定性方案.md)）

### shared 域 17 件终局定性

- **品牌重复 3 件**：GlassCard/YYC3Logo/YYC3LogoSvg 与 `@yyc3/ui/brand` **md5 逐字节同**（Phase 2 收编后端侧残留副本）→ 三端删 9 件 + 切引 `@yyc3/ui`（barrel）171 文件
- **ops 域 4 件二包**：QuickActionGrid（L1 纯路径差）+ **DataFlowDiagram（L0 三端全同 140L——「反向独有」误登修正 4→3，M4-0 取样框漏检 app/components 平铺层）** + OperationCenter/ServiceLoopPanel（P3=P4 同 + P1 纯路径差 3 处，障碍随 QuickActionGrid/DataFlowDiagram 入包全解除）→ `@yyc3/ops` 13 组件 + 6 hooks / exports 17 条
- **壳层 9 + 路由级 3 留端 Phase 5**：Layout/Sidebar/TopBar/BottomNav/CommandPalette（壳层本体，Layout 引 dev/IntegratedTerminal 跨域障碍实锤）+ AIAssistant/ConnectionStatus/LanguageSwitcher/OfflineIndicator（消费面绑定壳层）+ Login/NotFound/ErrorBoundary（消费面 = App.tsx/routes/Layout 全端侧）——避免 Phase 5 壳层方案定型前二次切引
- **ServiceConnectionTest（1272L）复核**：原暂缓理由「DataFlowDiagram 跨域障碍」实测不成立（其自身依赖 core/store 已通）——定性随下批 ops 域清空

### Phase 3 漏网 5 lib 收编（P2 同窗仲裁兑现）

- **三端 L0 全同实证**：authContext/backgroundSync/local-knowledge-base/network-utils/yyc3-icons 三端 md5 全同（Phase 3 首批仅收 20 件字节级同名件，此 5 件漏网）→ P1 版 git mv 入 core（exports +5 至 45 条）+ P3/P4 删 10 副本 + core/types +65L（+10 类型：AuthContextValue/Sync 族 4/Network 族 4，UserRole/DataFlowNode/Edge 已有复用）
- **P2 侧仲裁（切 2 留 3）**：authContext（纯 JSDoc 注释差）/backgroundSync（风格差 + P2 测试无 console 断言实证）切包 + 两件删；local-knowledge-base（真异构 567L↔160L 类型名不同）/network-utils（默认 IP localhost↔192.168.3.45，**P2 测试 L60/68/72 显式断言**——偏差 #11 同款行为契约）/yyc3-icons（资源路径 yyc3-badge-icons↔yyc3-icons 契约）留端；**P2 lib 终态 5 件全为行为异构留端**
- **M3-P2 断言对齐补漏 3 例**：rf-phase2 ALL_STORES 14→24 / settings-model DEFAULT_AI_MODEL gpt-4o→codegeex4:latest / e2e-integration SYSTEM_NAME+VERSION ×2——11 专测清单外文件，本批 P2 vitest 全量复核暴露

### 验证矩阵与偏差（#19-#22）

- 九包 tsc=0（core/store/ui/business/ai/ops/admin/monitor）；P3=P4=0；P2 tsc 7 错逐字同基线；build 三绿 858/831/812ms + P2 build 7 错基线
- **P1 tsc 67→48 正向偏离**：品牌切引顺带修复 ai-family `../GlassCard` 断引 19 处（67−19=48 精确吻合；剩余 48 = ai-family store 路径断引 + 连锁 implicit any，归 M4-6）
- **P2 vitest 1811 通过 / 54 失败全存量实证**（7 失败文件 git diff 零改动 + 最后修改 = M3-P2 提交；Layout jsdom + 包组件 React18 渲染 + rf-phase2 routes 断链连带）；本批相关 backgroundSync 10/10 全绿，**净回归 0**
- 偏差 #19：DataFlowDiagram 反向独有误登（取样框漏检平铺层）；#20：**perl `-i -p` 与脚本内嵌 while 双重循环致 13 文件首行错位**（检出判据 `diff 含 ^-/\*\*$` → checkout 恢复 → 裸语句脚本重切）；#21：交替组前缀吞尾（YYC3Logo|YYC3LogoSvg → `@yyc3/uiSvg` 13 处）；#22：单引号盲区三犯（HotelDashboard ×3 手工切）

## M4-4 admin+monitor 域关键实证（2026-10-10 第六轮，方案 [`phase4-ledger/05`](./phase4-ledger/05-M4-4-admin-monitor域包化方案.md)）

### 勘察仲裁（40 件终局 + hooks 三向收编）

- **40 件 md5 终局**：L0 全同 ×3（VariableCenter/UserManagement/SDKChatPanel）+ L1 纯路径差 ×36（2~15 行）+ **CreateRuleModal 翻转**（P1≡P4 同源仅 1 行 types 路径差、P3 滞后 176 行）→ **「真全异」3→0 归零**；UnifiedModelManager 复判「三端均有、P1 独走版」→ **反向独有 5→4**
- **12 hooks 三端 md5 全 L0**：域内随包 7（admin 4：useSecurityMonitor/usePWAManager/useInstallPrompt/useValidation；monitor 3：usePatrol/useAlertRules/useAISuggestion）+ 跨域入 store 3（useSettingsStore 带 @deprecated / useBigModelSDK / global-store 组合层）+ 跨域入 core 1（useCopyFeedback）+ 留端 2（usePageConfig/useNetworkConfig 带 config/network-utils 障碍）
- **跨域障碍九分法 +2 形态**：storageManager 引 src/database 引擎层（→StorageManager/StorageSyncStatus 暂缓）、config 跨域消费（→ConfigCenter/PageConfigEditor 暂缓）；暂缓终值 10 件（admin 9 + monitor 1）
- **types 传递闭包**：44 直缺 → 终值 **+54**（SecurityMonitorState 全族 18 + StorageConfig→DatabaseConfig 链等；撞名 13 候选复核全复用不重定义）

### 决策落地（phase4-ledger/05 D1-D10）

| 决策 | 落地 |
| ---- | ---- |
| D1/D2 双包 | @yyc3/admin exports 15 条（10 组件 kebab + 4 hooks）；@yyc3/monitor exports 24 条（20 组件 + 3 hooks） |
| D3 包依赖 | admin dep core+store+ui；monitor dep core+store+ui+**ops**（FollowUpCard/FollowUpDrawer 引 operation-chain） |
| D4 types +54 | core/types.ts 1023→1458L，admin/monitor 语义段追加（alert 9/patrol 6/followup 3/security 18/pwa 4/sdk 5/database 3/network 1/storage 5） |
| D5 hooks 三向 | 见上；store exports +3、core exports +./use-copy-feedback |
| D6 切引 | P1 routes 13（暂缓 7 保留）+ 测试件 57 文件 41 条映射；P3/P4 routes 13/端 + 测试件 51/52 文件 + 端侧删 38 件/端 |
| D7 barrel | P1 端双 index.ts 改写：admin 9 件 + monitor 21 件转包 re-export、暂缓件保持本地导出（**端侧 barrel = 第四消费形态**） |
| D8 暂缓件切引 | 暂缓件留端但依赖被收编的 hooks 切包引（端→包方向合法）：SystemSettings/DataEditorPanel/UnifiedSettingsPanel/AISuggestionPanel/DatabaseManager 等 |
| D9 ui 补导 | barrel 补 `./brand/YYC3LogoSvg`（包内 SDKChatPanel 消费） |
| D10 peer 实扫 | admin +recharts/zustand；monitor +react-dom/react-router/react-swipeable/zustand（组件实扫定 peer，不凭域想象） |

### 验证矩阵（全绿）

- 七包 tsc=0：core / store / ui / ops / ai / **admin** / **monitor**
- P1 tsc = **67 基线精确持平**（101→67 回落过程暴露并修复 barrel/切引残留，见偏差 #15-#17）；P3 = P4 = 0
- build 三绿：P1 844ms / P3 792ms / P4 807ms；P2 = 7 错基线（零涉及 ✅）
- 切引总量：三端 123 文件（P1 72 + P3 51 + P4 52 口径含重叠，实测 perl 处理 129 次文件写入）

## M4-2/3 关键实证（2026-10-10 第四轮，方案 [`phase4-ledger/03`](./phase4-ledger/03-M4-2-3-ai域包化方案.md)）

### ai 域仲裁（三度再现全 L0 实质同源模式）

- **组件 4 件**（AIDiagnostics 551L / ModelProviderPanel 557L / AddModelModal 456L / ProviderEditorModal 372L）：P3=P4 md5 同、P1 diff 全为相对路径深度差（14/10/4/4 行）→ **L0 纯路径差**
- **hooks 3 件 + view-context**：useModelProvider 169L（provider-slice 纯 wrapper）/ useAIDiagnostics 259L / useWebSocketData 310L / view-context 24L——**三端 md5 逐字节全同**
- **types 3 文件**：diagnostic-types 114L（自包含零撞名）/ websocket-types 80L（AlertLevel/AlertData/NodeData 与 core 逐字段同）/ layout-types 26L——三端 md5 全同
- ModelProviderPanel→AddModelModal/ProviderEditorModal 唯一消费闭环；P1 modules/ai/index.ts barrel **零消费方**；P2 零涉及

### 决策落地（phase4-ledger/03 D1-D9，含 1 项执行中修订）

| 决策 | 落地 |
| ---- | ---- |
| D1 `@yyc3/ai` 建包 | 4 组件全量包化（view-context 桥接解除唯一卡点，不裁断）；exports 5 条 + barrel |
| D2 diagnostic-types 13 类型入 core/types | 自包含零撞名，追加聚合段 |
| D3 websocket-types 5 新类型入 core | AlertLevel/AlertData/NodeData 删重定义（core 已同定义）；app 侧具名 re-export 桥 |
| D4 layout-types 全 3 类型入 core | （微调：原计划摘 2，文件仅 26L 全并入更净）Breakpoint/ViewState/ErrorBoundaryLevel |
| D5 view-context 上收 `@yyc3/core/view-context` + 桥 | app/lib/view-context.ts × 3 改 `export *` 桥 → **60+ 消费方零切换** |
| D6 hooks 上收（**执行中修订**） | useModelProvider/useAIDiagnostics/useWebSocketData **均归 `@yyc3/store`**（原计划 websocket-data 归 core，实测其引 node-slice——**core→store 循环依赖警报**，改判 store；store peer +react） |
| D7 包依赖 | peer react/lucide-react + dep @yyc3/core + @yyc3/store + @yyc3/ui |
| D8 切引 | routes × 3（2 lazy/端）+ hooks 消费方（import 42 处含测试 + vi.mock 34 处）+ 组件测试 7 处切包路径 |
| D9 pattern 纪律 | 双引号类 + 深度同批枚举（本轮仍中招一次，见偏差 #10） |

### 三端切换实测

- **core 扩容**：types.ts 516→695L（+21 类型）+ view-context 24L + exports +1
- **store 扩容**：+3 hooks（use-model-provider/use-ai-diagnostics/use-websocket-data）+ peer react + exports +3
- **删源件 23**：P1 modules/ai 6 文件（4 mv + index.ts 删 + DEV-GUIDE.md mv 包根）+ P3/P4 组件 × 8 + 三端 hooks × 9 + view-context/useWebSocketData P3/P4 × 4（并入前述计数口径为 27 文件减项，git stat 133 文件 +751/−6164）
- 桥文件 12：view-context/diagnostic-types/websocket-types/layout-types × 3 端（app 内消费者零切换）
- P1 tsc = 67 基线精确持平、P3/P4 = 0、P2 build = 7 基线（零涉及 ✅）、build 三绿（824/773/771ms）
- **偏差 #10**：hooks 切引深度 1 pattern 笔误（`\./hooks/` 写成当前目录，应为 `\.\./hooks/` 上级）→ 首轮 P3/P4 残留 15 处 → 补刀归零（**偏差 #8 同族三犯：深度枚举纪律升级为「先 grep 实际形态再写 pattern」**）

## M4-2/3 ops 域关键实证（2026-10-10 第五轮，方案 [`phase4-ledger/04`](./phase4-ledger/04-M4-2-3-ops域包化方案.md)）

### ops 域仲裁（18 件 9+9 分拣 + M4-0 定性翻转）

- 16 件 P3=P4 同、P1 差 4~17 行纯路径差（第五域「纯路径差 = L0 实质同源」）
- **OperationChain/DatabaseManager 定性翻转**：原 M4-0 登记「真全异」经 diff 实证为 **P1≡P4 同源 + P3 单端滞后**（OperationChain P1-P4 仅 1 行 types 路径差；DatabaseManager P1-P4 仅 6 行路径差 + 2 处等价类型注解；P3 分别滞后 128L 旧版视觉 / 227 行功能）；「真全异」仅剩 CreateRuleModal 待 M4-4 复验
- 跨域障碍 9 件定性（CodeEditor→dev/ide、DataFlowDiagram→design-system、QuickActionGrid→dev、useSettingsStore/full-backup→admin、InlineEditableTable→admin 文件、src/database→引擎层）→ D7 暂缓留端侧 + 二次包化路线绑定
- 6 域 hooks 仅本域消费 → **随包不走 store**（与 ai 域差异点：消费面单域）；P1/P3/P4 三端 hooks md5「全异」实为包内改引后 types import 路径一行差（删除安全确认）

### 决策落地（phase4-ledger/04 D1-D10）

| 决策 | 实测 |
| ---- | ---- |
| D1 9+9 分拣 | 首批 9 组件（FileBrowser/LogViewer/LoopStageCard/OperationCategory/OperationChain/OperationLogStream/OperationTemplate/ReportGenerator/ReportExporter）入包 |
| D4 hooks 随包 | 6 hooks 入 `@yyc3/ops/hooks/*`（exports 16 条） |
| D5 types 扩容 | core/types.ts 695→1025L（+37 类型六语义段；撞名 7 个 core 已有同定义复用；toConnectionInfo 桥接函数留端侧） |
| D3 OperationChain 升级 | P3 随包弃 128L 旧版（无 CSS 变量动态色）；FollowUpCard/Drawer（monitor 域）跨域消费同步切包 |

### 三端切换实测

- routes 三端仅 ReportExporter 为 routes 级（1 处/端）；其余 8 组件消费方为三端暂缓件（12 处/端形态 `./X` + `../hooks/`）+ P1 monitor 域 FollowUpCard/Drawer
- 测试切引：P1 17 件 + P3/P4 各 13 件（组件 9 + hooks 测试与暂缓件内 mock；`from`/`vi.mock(`/动态 `import(` 三形态枚举）
- 端侧删除 30 文件（P3/P4 组件 9×2 + hooks 6×2）；P1 modules/ops 留 9 暂缓件 + index.ts 改写（v1.1.0 仅暂缓件导出）

### 本轮偏差（#12-14）

- **偏差 #12**：perl 替换串 `@` 插值陷阱（`@yyc3` 被当空数组 → 22 处写成 `from "/core/..."`）→ `\@` 转义补刀；教训：**perl 替换串中 `@` 必须写 `\@`**
- **偏差 #13**：P3/P4 hooks 测试件漏测绘（勘察只数组件测试 9 件）→ tsc +31/+31 一次捕获 → 补切归零；教训：测绘需 `from`+`vi.mock(`+动态 `import(` 三形态枚举
- **偏差 #14**：vi.mock 形态漏 `(`（13 处残留）→ 补刀归零（#8 同族第四犯，纪律再升级：**先贴实际行再写 pattern**）

## M4-3 关键实证（2026-10-10 第二轮）

### store 30 件仲裁（远优于总体分布）

- **17 件共有**：16 件 L0 三端逐字节同；仅 ide-settings-slice「纯路径差」2 行（ide-types 源文件 md5 全同）
- **13 件 family-\***：11 件 L0；family-member/message「纯深度差」各 4 行（`../types` vs `../../types`）
- **结论：30 件逻辑内容三端 100% 同源**——193 件总体 126 件 L1 的「小异」在 store 域完全消失

### 单根范式评估（D6：不做合并）

- 每 slice 独立 `create<T>()(persist(devtools(immer(...))))` 模块级单例，无单根组合
- **主 barrel 消费面：P3/P4 零引用、P1 仅 ai-family/index.ts 引自身** —— barrel 为名义入口
- 独立 create 迁移零语义风险；单根合并改动巨大且无消费收益

### 决策落地（phase4-ledger/01 D1-D6）

| 决策 | 落地 |
| ---- | ---- |
| D1 独立 `@yyc3/store` 包 | 新建 packages/store（zustand/immer/sonner peer + @yyc3/core dep；exports 16 条显式逐条） |
| D2 16 件上收、ide-settings 暂缓 | ide-types（227L）拽 M4-7 `@yyc3/ide`，斩断域类型拖拽链 |
| D3 family 13 件不动 | 留端侧，随 M4-6 `@yyc3/ai-family` |
| D4 两 lib 上收 core | connection-test-engine（522L 零 import 自包含）+ variable-center（869L 仅引 core/api-config）git mv 入 core，exports +2 条 |
| D5 类型按需复制 | core/types.ts +27 类型（store 域 19 + 依赖链 AnomalyPatternType/PatternSeverity/FileItemType/DatabaseType/DBConnectionStatus/ChatMessage + OllamaModel/OllamaTagsResponse） |
| D6 不做单根合并 | 见上 |

### 三端切换实测

- **232 处引用切换**（45 处单引号首轮 + **159 处双引号补杀** + 28 处两 lib 切引）
- P3/P4 各删 16 件 slices（剩 14：ide-settings + 13 family）
- 三端 store/index.ts 重写：16 件从 `@yyc3/store` re-export + ide-settings 端侧 + family 原路径 + useUnifiedStore 组合 hook 保留
- P1 tsc = 67 基线精确持平、P3/P4 = 0、P2 build = 7 基线；P1/P3/P4 build 三绿（617/686/595ms）

## M4-2b 关键实证（2026-10-10 第三轮，方案 [`phase4-ledger/02`](./phase4-ledger/02-M4-2b-business域包化方案.md)）

### business 域仲裁（再现全 L0 实质同源模式）

- **两组件**：HotelDashboard 885L × 3 / CommStationPanel 249L × 3——P3=P4 md5 同、P1 独走，但 **diff 全为 import 相对路径差**（P1 深一层 modules/business/）→ **L0 实质同源**
- **hotel-engines 6 lib**（含 C 批新发现的 hotel-bridge）：三端 md5 全同；除 bridge 引 app types 外，其余 **5 lib 零外部 import**（manager 仅引包内 types）
- **usePersistedState 112L**：三端 md5 全同，消费 6 域 hooks/端（ops/monitor/admin 前置件）

### 决策落地（phase4-ledger/02 D1-D7）

| 决策 | 落地 |
| ---- | ---- |
| D1 usePersistedState 入 core | `@yyc3/core/use-persisted-state`（StoreName 已在 core/types，零补录） |
| D2 `@yyc3/business` 建包 | hotel-engines 5 lib + comm-station-panel；exports 6 条显式 + export * 主 barrel |
| D3 包依赖 | peer react/lucide-react/sonner + dep @yyc3/core + @yyc3/ui（GlassCard） |
| **D4 HotelDashboard 暂缓 M4-6** | MEMBERS_MAP 是唯一 ai-family 触点（运行时可变·store 回流）；**智慧酒店双版本 L1 视觉融合样板一并移交 M4-6** |
| D5 vite-env augmentation 迁移 | declare module 目标同步包路径（interface merging 模块标识一致） |
| D6 barrel re-export | P1 modules/business/index.ts 改引包；routes × 3 lazy import 切包路径 |
| **D7 hotel-bridge 暂缓 M4-6** | 引 UnifiedFamilyMember 类型体系（P1/P3P4 定义位置还不同），补录会拖整棵 family 类型树；与 ai-family types 仲裁同窗 |

### 三端切换实测

- **A 批 43 文件**（usePersistedList 切 `@yyc3/core/use-persisted-state`）+ **C 批 23 文件**（5 lib 切 `@yyc3/business/hotel-engines/*` + vite-env augmentation + routes/测试）+ 删源件 **16**（P3/P4 CommStationPanel + 5 lib × 3 端 - P1 已 mv）
- P3/P4 tsc = 0、P1 tsc = 67 基线精确持平、P2 build = 7 基线（零涉及 ✅）、build 三绿（789/811/768ms）
- **偏差 #8**：zhipu-ai-service 同目录引 `./ai-family-hotel.types` 漏切（pattern 只覆盖 `../lib/` 形态）→ 三端 +2 回归 → 补刀修复归零
- **偏差 #9**：新包 pnpm install 遇 `ERR_PNPM_OUTDATED_LOCKFILE`（frozen-lockfile 默认 true）→ `--no-frozen-lockfile` 解决

## 关键实证（M4-0）

### 三端仲裁分布（193 件）

| 级别 | 件数 | 要点 |
| ---- | ---- | ---- |
| L0 三方全同 | 28 | 机械迁移 |
| L1「P3=P4 同、P1 独走」 | 126 | 小异级（TOP 差异 20 行）——**主文档原判 L2 大部分降级为 L1** |
| 真全异 | 3 | CreateRuleModal/DatabaseManager/OperationChain——**全是 P1≈P4 新版、P3 版本滞后**（落后 72~506 行），非异构演进 |
| P1 独有 | 33 | ai-family 24 件为绝对主力（store 14 + hooks 4 + types 3 + lib 1 + 顶层 2） |
| 反向独有 | 5 | CodeEditor/DataFlowDiagram/DesignSystemEditor/ImageWithFallback/UnifiedModelManager（P3/P4 有 P1 无） |

> **修正主文档仲裁规则**：原「L2 异构 → 双 API 并存 + adapter 融合」实测 **0 件适用**——131 件疑似 L2 中 126 件为 P3=P4 同源二元仲裁、5 件为取样错位（其中 2 件实测 diff=0）。Phase 4 实为 L0+L1 合流工程。仲裁基线实证：**P1/P4 为功能最全双源**（P3 三件真全异均为滞后版）。

### 依赖面测绘（域包边界约束）

| 依赖 | 总量 | 分布 |
| ---- | ---- | ---- |
| modules→store(slices) | 66 处 | ai-family 29 / admin 10 / monitor 10 / dev 7 / ops 7 / shared 3 / **ai 0** |
| modules→hooks | 109 处 | dev 24 / admin 19 / monitor 16 / shared 14 / ops 14 / ai-family 13 / ai 7 / business 2 |

**结论**：域包化被 hooks→store 链约束（useModelProvider→provider-slice、useWebSocketData→node-slice 均拽 zustand）。**ai 域虽 store 直引 0，但其域 hooks（useModelProvider/useAIDiagnostics/useWebSocketData）拽 store 链**——域包化前置 = zustand store 上收方案定型（原规划 M4-3 前置，实际更硬）。

## 关键动作明细（M4-2a i18n 上收）

- **L0 实证**：`i18n/{zh-CN 1399L, en-US 1379L, index 14L}` + `hooks/useI18n.ts 135L` 四件三方 md5 全同 → git mv 自 P1 + git rm P3/P4 副本（历史保留）
- **包配置**：core exports +`./i18n` `./i18n/zh-CN` `./i18n/en-US`；**core 首次引入 react peer**（`react: ^18||^19` peer + `@types/react` devDep）——useI18n 为 React Context hooks
- **类型上收**：Locale/LocaleInfo/I18nContextValue 入 `core/src/types.ts`（Phase 3 按需类型模式延续）；TranslationKeys 随 zh-CN 源
- **barrel 出口**：i18n/index.ts 显式导出 useI18n/useI18nProvider/I18nContext/SUPPORTED_LOCALES（无 I18nProvider——原文档 @notes 与实际导出不符，已核删）
- **三端切换**（perl 三轮，引号闭合防误伤）：`(\.\./)+i18n`（目录 4 处/端）+ `(\.\./)+hooks/useI18n` 与 `./hooks/useI18n`、`./useI18n`（hook 主体 ~65 处/端）+ `(\.\./)+i18n/(zh-CN|en-US)`（测试深层引用 ~14 处/端）；残留 grep 归零
- P2 零触碰（不在处理范围、无 @yyc3/core 依赖）

## DoD 核验矩阵

| DoD 项 | 结果 | 证据 |
| ------ | ---- | ---- |
| core 包独立 tsc | ✅ | 0 错（i18n + react peer 后复验） |
| type-check 零回归 | ✅ | P1 = 67 精确持平；P3 = 0；P4 = 0 |
| build 三绿 | ✅ | P4 781ms / P3 735ms / P1 745ms，UNRESOLVED 归零 |
| P2 基线持平 | ✅ | build = 7 错逐字同基线 |
| i18n 残留归零 | ✅ | 旧相对引用 grep = 0（目录/hook/深层三模式全覆盖） |
| 语言包单源 | ✅ | zh-CN 为 TranslationKeys 类型源（主文档动作 4 机制落地） |

## 偏差与未完登记

| # | 事项 | 处置 |
| -- | ---- | ---- |
| 1 | **主文档 Phase 4 仲裁规则 L2 条款 0 适用**（126 疑似 L2 实为二元仲裁） | 规划文档决策 #2 登记；真 L2 出现时按原规则 |
| 2 | **ai 域包化与 store 上收绑定**：域 hooks 拽 zustand 链（原以为 ai 域 store 0 直引可先行） | M4-2b 并入 M4-3（zustand 上收方案先行）；试点域改判：**i18n 上收为 Phase 4 首个达成件** |
| 3 | i18n/index.ts 原文 @notes 提及 I18nProvider 但无此导出 | 核删 barrel 引用；I18nProvider 包装逻辑实际由 useI18nProvider + app 端 Provider 承担（后续上收时补齐） |
| 4 | `./hooks/useI18n` 单层前缀首轮漏杀（模式只覆盖 `../` 深度） | 补刀脚本；教训：**切换模式必须枚举 `./` 与 `../` 两种深度**（Phase 3 同类教训 #6 再现） |
| 5 | **引用勘察 grep 只匹配单引号**：`from '...'` 模式漏掉 modules/components 层全部双引号引用（50 行 vs 实际 200+ 处） | 补杀 159 处；教训：**引用面勘察 pattern 必须含 `["']` 双引号类**（prettier 格式化端/modules 层全为双引号） |
| 6 | **多行 import 具名提取漏**：类型清单 grep 单行 sed 提取漏 OllamaModel/OllamaTagsResponse（多行 import 块） | tsc TS2305 暴露后补录；教训：**具名清单提取需 awk 多行态或以 tsc 错误闭环** |
| 7 | zsh 终端间歇性 PATH 污染（cp/md5 触发 `__safe_rm_realpath` 钩子 → dirname not found） | 绕过：Write 工具直写文件；教训：**shell 异常时优先工具链替代，勿反复重试同一命令** |
| 8 | **zhipu-ai-service 同目录引漏切**（勘察已见 `./ai-family-hotel.types`，切引 pattern 只覆盖 `\.\./lib/` 形态）→ 三端 +2 回归 | 补刀 pattern `(["'])\./ai-family-hotel\.types\1` 三端修复；教训：**偏差 #4 同族再现——同目录 `./` 与上层 `../` 深度必须同批枚举** |
| 9 | 新包 pnpm install 报 `ERR_PNPM_OUTDATED_LOCKFILE`（frozen-lockfile 在本环境默认 true） | `pnpm install --no-frozen-lockfile`；教训：**workspace 新增包首次 install 必带此 flag** |
| 10 | hooks 切引深度 1 pattern 笔误（`\./hooks/` 写成当前目录，实需 `\.\./hooks/` 上级）→ 首轮三端残留 15 处（P3/P4 tsc +3/+3 捕获） | 补刀归零；**偏差 #8 同族三犯，纪律升级：写 pattern 前先 grep 实际形态清单** |
| 11 | useWebSocketData 原计划入 core，实施发现其引 `@yyc3/store/node-slice`——core→store 循环依赖 | **D6 执行中修订**：改归 `@yyc3/store`（引 node-slice 决定归属）；教训：hooks 归属按其依赖实测定，不按语义预判 |
| 12 | perl 替换串 `@` 插值陷阱：`s{}{from "@yyc3/..."}` 的 `@yyc3` 被当空数组插值 → 22 处写成 `from "/core/types"` | `\@` 转义补刀归零；教训：**perl 替换串中 `@` 必须写 `\@`** |
| 13 | P3/P4 hooks 测试件漏测绘（勘察口径只数 9 组件测试）→ 三端 tsc +31/+31 | 补切（from/vi.mock(/动态 import 三形态）归零；教训：**消费面测绘按三形态枚举，文件名清单 ≠ 消费面** |
| 14 | vi.mock pattern 漏 `(`（`vi\.mock"` 未匹配 `vi.mock(`，13 处残留） | 补刀 `vi\.mock\(` 归零；**#8 同族第四犯，纪律再升级：先贴实际行再写 pattern** |
| 15 | 新包配置半抄先例：tsconfig 抄了但 package.json devDependencies 漏抄 → 双包首验 TS7016/TS7026（@types/react 未解析） | 对照 ops 先例补齐 devDeps（@types/node/@types/react/typescript + peer 本地化）；教训：**新包四件套必须整抄先例 + peer 按组件实扫** |
| 16 | P1 端 barrel（modules/admin\|monitor/index.ts）未列入 D 批切引清单 → 移走件后 29 错爆发 | 双 index.ts 改写（admin 9 + monitor 21 转包 re-export）；教训：**端侧 barrel 是第四消费形态（静态路由/vi.mock/动态引之外），域包化必查** |
| 17 | perl 替换串手写包裹引号 → `""@yyc3/…""`（57 文件）；修复轮 $1 已含前缀又手补 `\@yyc3/` → `@yyc3/@yyc3/`（117 处） | 两轮修复归零；教训：**替换串一律 `$1…$1` 直拼不加工；修复串不得重复添加捕获组已含的前缀**（#12 同族：替换串必须原样直拼，任何手写装饰都是坑） |
| 18 | `?raw` 后缀路径（rf-phase2.test.ts 源码审计引）不在路径映射覆盖内 | 单点手工切 `@yyc3/monitor/hooks/use-alert-rules?raw`；教训：**`?query` 后缀路径是 pattern 盲区，勘察时需单独枚举** |
| 19 | **DataFlowDiagram「反向独有」误登**（M4-0 取样框为 modules/ 漏检 P1 app/components 平铺副本；实测三端均有且 L0 全同 140L） | 反向独有 4→3；本批随 ops 入包；教训：**取样框需覆盖 app/components 平铺层** |
| 20 | **perl `-i -p` 与脚本内嵌 `while(<>){print;}` 双重循环**：13 文件首行 `/**` 错位丢失（P3/P4 各 6 + P1 UnifiedModelManager，tsc 爆 100/100/20 语法错） | 判据检出（diff 含 `^-/\*\*$`）→ checkout 恢复 → 裸语句脚本重切一次成型；教训：**-p 脚本内严禁 while/print，替换逻辑裸语句化** |
| 21 | 交替组前缀吞尾：`(GlassCard\|YYC3Logo\|YYC3LogoSvg)` 匹配 YYC3Logo 后剩余 Svg → `@yyc3/uiSvg` 13 处 | `s{\@yyc3/uiSvg}{\@yyc3/ui}g` 定长修复；教训：**交替组含前缀关系时长名优先或加边界** |
| 22 | **单引号引用盲区三犯**（#5 同族）：HotelDashboard `from './GlassCard'` 漏切 | 手工切 3 处；教训固化：**pattern 引号类 `["']` 枚举或双轮跑** |
| 23 | **perl 捕获组错位**（#17 同族第五犯）：`s{(\.\./)+lib/(ALT)}{\@yyc3/ai-family/lib/$1}` 的 $1 指向前缀组而非 ALT 组 → 56 文件产出 `@yyc3/ai-family/lib/../`（ALT 内容丢弃），三端 tsc 75/49/49 爆发 | 判据检出（grep `ai-family/lib/\.\./`）→ checkout 恢复 56 件 → `$2` 修复版重切归零；教训：**多捕获组替换前先数组序，前缀组+目标组结构从 $2 起用** |
| 24 | **grep 筛选断言误写**：首轮清单 pattern `yyc3-cluster\|zhipu-ai-service)"` 中 `yyc3-cluster` 后 `"` 断言不匹配 `.types` 后缀 → yyc3-cluster.test 首轮漏筛，mv 后 39 错/端 | 精确 ALT 全名重切；教训：**前缀关系候选（X 与 X.types）必须全列，断言边界逐字对齐** |
| 25 | **相对无段形态三漏**（#6/#8 族）：`./modules/ai-family/lib/`（App.tsx 单点）、`../ai-family/`（modules 互引无 modules 段：HotelDashboard/AISuggestionPanel）、`./slices/`（P3/P4 store barrel 内引） | 三轮补刀归零；教训固化：**路径形态枚举必含「同目录单层 / 上级无段 / barrel 内引」三类无段形态** |

## 后续登记

- **M4-2/3 ops 域包化**：✅ 已达成（第五轮）——首批 9 组件 + 6 hooks 入 `@yyc3/ops`；**暂缓 9 件二次包化路线已绑定**：OperationCenter/ServiceLoopPanel→M4-5（QuickActionGrid/DataFlowDiagram）、LocalFileManager/HostFileManager/DatabaseConnectionPanel→M4-7 或 ui 扩容（CodeEditor）、DatabaseManager（双障碍+P3 滞后 227 行定性；M4-4 已切 `@yyc3/admin/inline-editable-table`）/ConfigExportCenter→M4-4、ConnectionMonitorPanel→src/database 引擎层专项
- **M4-4 admin+monitor 域**：✅ 已达成（第六轮）——`@yyc3/admin`（10 组件 + 4 hooks）+ `@yyc3/monitor`（20 组件 + 3 hooks）双包达成；暂缓 10 件留端（admin 9 + AISuggestionPanel，含端侧 barrel re-export 衔接）；「真全异」归零、反向独有 5→4
- **M4-5 shared 域定性**：✅ 已达成（第七轮）——品牌 3 件消重 + ops 二包 4 件（OperationCenter/ServiceLoopPanel 解锁）+ Phase 3 漏网 5 lib 收编 core + P2 切 2 留 3；壳层 9 + 路由级 3 留端 Phase 5；反向独有 4→3
- **M4-6 ai-family 特深域**：✅ 已达成（第八轮）——`@yyc3/ai-family` 86 件 / exports 90 条；P1 死副本 36 清障（48→0）+ P2 断链修复（7→0 + build 首绿）+ MEMBERS_MAP 破环 + HotelDashboard 切包 + useClock 入 core + inference 6 类型并入；P2 AIFamilyPage 独走留端；智慧酒店 L1 视觉融合（density="compact"）归 Phase 5 专项
- **M4-7 `@yyc3/ide`**：ide-settings-slice + ide-types 227L + Phase 2 theme-presets 引擎登记项（useWebSocketData 已入 store，ide-mock-data 注解引用不阻）+ **失效 vi.mock 清扫（M4-6 技术债）**
- **M4-8**：反向独有 3 件定性（CodeEditor/DesignSystemEditor/ImageWithFallback；DataFlowDiagram 经 M4-5 修正随 ops 入包）+ NavRegistry 单源 + PageShell 七型谱
- **69 视觉对照 + a11y**（Phase 2 登记，跨阶段）
- **types 单源收敛**（app 28 分件 vs core 按需 +141 件（M4-3 +27 / M4-2/3 ai +21 诊断·websocket·layout 系 / M4-2/3 ops +37 六语义段 + ChainEvent / M4-4 admin·monitor +54 九语义段），Phase 3 登记；桥接模式已立（diagnostic/websocket/layout/view-context 四桥），收敛=桥原地翻正）

## 交接快照

```bash
# 复验矩阵（M4-6 后：四端全零全绿首态）
cd packages/theme && pnpm exec tsc --noEmit       # 0 错
cd packages/core && pnpm exec tsc --noEmit        # 0 错（useClock 入包后 34 件 + i18n）
cd packages/store && pnpm exec tsc --noEmit       # 0 错
cd packages/ui && pnpm exec tsc --noEmit          # 0 错
cd packages/business && pnpm exec tsc --noEmit    # 0 错
cd packages/ai && pnpm exec tsc --noEmit          # 0 错
cd packages/ops && pnpm exec tsc --noEmit         # 0 错
cd packages/admin && pnpm exec tsc --noEmit       # 0 错
cd packages/monitor && pnpm exec tsc --noEmit     # 0 错
cd packages/ai-family && pnpm exec tsc --noEmit   # 0 错（M4-6 新包 86 件）
cd apps/app-web-full && pnpm exec tsc --noEmit    # 0（48→0 死副本清障）
cd apps/app-desktop && pnpm exec tsc --noEmit     # 0
cd apps/app-web-classic && pnpm exec tsc --noEmit # 0
cd apps/app-sandbox-lite && pnpm exec tsc --noEmit # 0（7→0 断链修复，史上首零）
# build：P1 813ms / P3 776ms / P4 779ms / P2 全绿（存量 7 错基线首零）——四端 build 全绿
# P2 vitest：1813 通过（rf-phase2 29/29）；P1 ai-family 抽测 136 例绿

# 包拓扑（M4-6 后：十包）
# @yyc3/ai-family：86 件（组件 37 + Page + slices 13 + hooks 5 + types 3 + lib 26），exports 90 条
#   peer：react/lucide-react/motion/react-router/zustand/clsx/@mlc-ai/web-llm；dep：core/store/ui/business
# @yyc3/core：34 件 + i18n，exports 46 条（+useClock），types 1583L（+inference 6）
# 端侧：P1 modules/ 目录 ai-family 整域消失；P3/P4 components/ai-family 清空；P2 AIFamilyPage 独走留端

# 下次会话起点
# → M4-7 @yyc3/ide（ide-settings-slice + ide-types + theme-presets 引擎 + 失效 vi.mock 清扫）
# → M4-8 反向独有 3 件 + NavRegistry + PageShell
# → Phase 5 壳层（shared 留端 12 件 + 智慧酒店 L1 视觉融合）
```

---

**会话状态**: ✅ 正常结束
**Phase 4 定性**: 勘察/规划/i18n 上收/store 上收/business 域包化/ai 域包化/ops 域包化/**admin+monitor 双域包化**达成；「组件件 + lib 束 + 通用 hooks（域内随包/跨域入 store 二分）+ 桥接 types」四形态域包化工艺定型并经第六轮再现验证；M4-0 仲裁定性终局（真全异归零/反向独有 4）；批量域包化主体完成，剩 shared 定性与特深域扩容
