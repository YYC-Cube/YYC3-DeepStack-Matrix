---
file: 05-M4-4-admin-monitor域包化方案.md
description: Phase 4 M4-4 admin+monitor 两域包化 — 勘察实证与决策（@yyc3/admin + @yyc3/monitor + hooks 三向收编）
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.1.0
created: 2026-10-10
updated: 2026-10-10
status: active
tags: [phase4],[admin],[monitor],[domain-packaging]
category: plan
---

# 📐 M4-4 admin+monitor 域包化方案

> 上游输入：主文档 §10 Phase 4（v1.12.0）+ 执行日志 v1.4.0 交接快照 + 04 号方案工艺定型（四形态域包化）。
> 工艺基线：组件件 + lib 束 + 通用 hooks（域内随包/跨域入 store·core 二分）+ 桥接 types。

## 一、勘察实证（2026-10-10）

### 1.1 三端同名件仲裁（40 件，md5 全表 + diff 抽验）

| 级别 | 件数 | 明细 |
| ---- | ---- | ---- |
| L0 三方全同 | 3 | VariableCenter(admin) / DataMonitoring(monitor) / QuickActionGroup(monitor) |
| L1「P3=P4 同、P1 独走」 | 36 | diff 2~15 行，抽验 SystemSettings/UnifiedSettingsPanel/SDKChatPanel **全为纯路径差 + 2 处等价类型注解**（`ModelProviderDef` 显式注解、`onChange` 参数注解）——L0 实质同源 |
| 表面三方各异 | 1 | **CreateRuleModal：P1-P4 仅 1 行 types 路径差 + P3 滞后 176 行** |

### 1.2 M4-0 定性再翻转（两项登记修正）

| 件 | 原登记 | 实证翻转 | 处置 |
| -- | ------ | -------- | ---- |
| CreateRuleModal | 真全异（3 件之一） | **P1≡P4 同源 + P3 单端滞后**（OperationChain 同模式） | 取 P1≡P4 新版基线，P3 弃 176L 旧版 |
| UnifiedModelManager | 反向独有（P3/P4 有 P1 无） | **三端均有、P1 独走版**（P1 md5 09f8… ≠ P3=P4 cac3…） | 随 SystemSettings 暂缓，M4-8 定性 |

→ **「真全异」归零**（M4-0 三件全翻转）；反向独有 5→4（剩 CodeEditor/DataFlowDiagram/DesignSystemEditor/ImageWithFallback）。

### 1.3 hooks 依赖面（12 hooks 三端 md5 **全部 L0 全同**，机械迁移）

| 去向 | hooks | 依据 |
| ---- | ----- | ---- |
| admin 随包 4 | useSecurityMonitor(326L)/usePWAManager(157L)/useInstallPrompt(74L)/useValidation(228L) | 依赖仅 react/sonner/`../types`；消费件 SecurityMonitor/PWAStatusPanel/PWAInstallPrompt 入包、DataEditorPanel 暂缓件可切引包（端→包合法） |
| monitor 随包 3 | usePatrol(341L)/useAlertRules(405L)/useAISuggestion(81L 零 import) | usePatrol/useAlertRules 已引 `@yyc3/core/use-persisted-state`；消费件入包或暂缓件切引 |
| 留端 2 | usePageConfig(95L)/useNetworkConfig(125L) | 前者引端侧 config（page-config.ts 999L 属 M4-8 NavRegistry 资产），后者引 lib/network-utils（dev 域 2 件 + docs 4 件跨域消费）——**消费件 NetworkConfig 连带转暂缓** |
| 入 store 2 | useSettingsStore(329L，**自带废弃迁移注记**) / useBigModelSDK(775L) | 前者自包含（react+localStorage+BroadcastChannel，已引 core/api-config+broadcast-channel），注记指明新代码用 useSettingsSSOT、三消费方迁移后可废弃；后者已引 core/ollama-url + store/sdk-session-slice |
| 入 core 1 | useCopyFeedback(43L 纯 react) | 五域消费（admin/ai-family/dev/monitor/shared 各 6~8 处/端）——usePersistedState 先例 |
| 组合层入 store 1 | stores/global-store.ts（三端 md5 全同 0e3e…） | 内部已引 @yyc3/store 三 slices（db-conn/follow-up/provider），导出 useChat/useAlerts/useDatabase/exportStoreData/importStoreData；useAlerts 跨 admin+monitor 消费 |

### 1.4 跨域障碍定性（暂缓件 10 件：admin 9 + monitor 1）

| 暂缓件 | 障碍 | 解锁批次 |
| ------ | ---- | -------- |
| ConfigCenter + PageConfigEditor | 引端侧 config（getAllPages 运行时；page-config 999L 归 M4-8 NavRegistry 单源） | M4-8 |
| DataEditorPanel | 引 ops/ConfigExportCenter（ops 暂缓件） | M4-7 链 |
| StorageConfigPanel | 引 ops/DatabaseConnectionPanel（暂缓件）+ src/database 引擎层 types | M4-7 链 |
| StorageManager + StorageSyncStatus | 引 services/storageManager → **storageManager 引 src/database 引擎层**（DatabaseAdapter/ConnectionManager），服务留端 | M4-7 或引擎层专项 |
| NetworkConfig | 消费 useNetworkConfig（留端，network-utils 跨域） | M4-7（dev 域时定性 network-utils） |
| SystemSettings | 引 dev 域 2 件（DesignSystemPage/ThemeCustomizer）+ components/UnifiedModelManager（P1 独走版） | M4-7 + M4-8 |
| UnifiedSettingsPanel | 引 lib/crypto-vault + lib/full-backup + stores/global-store 部分导出 + types/model-provider-types（4 项端侧依赖） | M4-5/M4-7 定性 |
| AISuggestionPanel(monitor) | 引 ai-family/hooks/useAIFamilyNav | M4-6 |

### 1.5 types 缺口终值 **44**（组件 41 具名 ∪ hooks 36 具名 = 64 并集，core 已有 20）

语义段（源均在 P1 types/ 子文件，全部无撞名）：alert-rules 8（AlertSeverity/AlertMetric/AlertCondition/EscalationLevel/AlertThreshold/EscalationPolicy/AlertRule/AlertEvent）、patrol 6（CheckStatus/PatrolInterval/PatrolCheckItem/PatrolResult/PatrolSchedule/PatrolStatus）、followup 3（FollowUpSeverity/FollowUpStatus/FollowUpItem）、security 3（SecurityTab/RiskLevel/VitalRating）+ 监控状态族（SecurityMonitorState/DataManagementState/CSPResult/SensitiveDataResult/MemoryResult/PerformanceResult/WebVital/BrowserInfo/DeviceInfo/NetworkInfo/CacheEntry/CookieResult）、sdk 族（SDKConnectionStatus/SDKCapability/SDKChatResponse/SDKProviderCapabilities/SDKUsageStats + ChatMessage/ChatRole/ChatSession/ConfiguredModel/ModelProviderId）、pwa 族（PWAState/SWStatus/BeforeInstallPromptEvent）、database 2（EditableCellChange/CommittedChange）、network 1（TestStatus）、storage 3（StorageConfig/StorageStatus/StorageEvent，入包件消费面）。**实施时以 core/types tsc 编译通过为准，撞名复用。**

### 1.6 消费面测绘

- routes 级（P1）19 处：admin 12 + monitor 7；暂缓件 4 处（SystemSettings/DataEditorPanel/ConfigCenter/UnifiedSettingsPanel）不切 → **切 15 处/端**
- 测试件三端：P1 53 / P3 42 / P4 42 件（含 `vi.mock("../modules/admin/X"`、`vi.mock("../hooks/useX"`、动态 `import(` 三形态）
- 壳层：shared/Layout.tsx 引 admin/PWAInstallPrompt → 切包引（端→包合法）
- 入包组件内 `@yyc3` 直引已就绪 72 处（core 24 / ui 28 / store 20）+ `@yyc3/ops/operation-chain` 2 处（ops 批已切）
- shared 品牌件切 @yyc3/ui：GlassCard 25 + YYC3Logo 2 + YYC3LogoSvg 1（ui 包 brand barrel 已导出三件）

### 1.7 入包清单终值

- **@yyc3/admin**：组件 10（DataEditorTables/EnvConfigEditor/InlineEditableTable/OperationAudit/PerformanceMonitor/PWAInstallPrompt/PWAStatusPanel/SecurityMonitor/UserManagement/VariableCenter）+ hooks 4 + 无 lib（storageManager 留端）
- **@yyc3/monitor**：组件 20（ActionRecommender/AlertBanner/AlertRulesPanel/CreateRuleModal/Dashboard/DataMonitoring/FollowUpCard/FollowUpDrawer/FollowUpEditDialog/FollowUpManager/FollowUpPanel/NodeDetailModal/PatrolDashboard/PatrolHistory/PatrolReport/PatrolScheduler/PatternAnalyzer/QuickActionGroup/SDKChatPanel/UnifiedModelSelector）+ hooks 3
- 共 30 组件 + 7 hooks + store 收编 3 件（useSettingsStore/useBigModelSDK/global-store）+ core 收编 1 件（useCopyFeedback）+ core/types +44

## 二、决策

| # | 决策 | 依据 |
| -- | ---- | ---- |
| D1 | 一域一包延续：新建 `@yyc3/admin` + `@yyc3/monitor` 独立包 | ai/ops 先例；域语义清晰；exports 显式管理 |
| D2 | hooks 三向收编：7 域内随包 + 2 入 store + 1 入 core + 组合层 global-store 入 store；usePageConfig/useNetworkConfig 留端 | 1.3 定性表；「域内随包/跨域入 store·core」二分工艺 |
| D3 | useSettingsStore 入 store 带 `@deprecated` 标注 + 迁移注记保留 | 文件头自证待废弃（新代码用 useSettingsSSOT）；暂缓件/壳层消费方切引 @yyc3/store |
| D4 | CreateRuleModal 取 P1≡P4 基线（1 行路径差），P3 弃 176L 旧版视觉 | 1.2 翻转实证；OperationChain 先例 |
| D5 | 暂缓 10 件端侧形态：P1 域目录原地保留 + index.ts 导引改写；P3/P4 原地保留 | ops 批先例；障碍九分法 |
| D6 | core/types +44 分语义段尾部追加，撞名以 tsc 为准复用 | 1.5；ops 批 +37 先例 |
| D7 | routes 切包 15 处/端（动态 import 形态 `import("@yyc3/admin/x")`） | 1.6；ReportExporter 先例 |
| D8 | 端侧删除：P3/P4 各删 30 组件 + 3 hooks + global-store + services/storageManager? **否——storageManager 留端不删**；删 30 组件 + 7 hooks（4+3）+ 跨域 3 hooks + global-store，共 41 件/端 | 入包面；留端件保留 |
| D9 | services/storageManager 三端留端（引擎层依赖） | 1.4 |
| D10 | 暂缓件切引范围仅限「依赖被收编」项：useValidation/useAISuggestion/useSettingsStore/useCopyFeedback/useBigModelSDK/useAlerts/global-store 消费点 | 端→包方向合法；其余引用不动 |

## 三、批次计划

| 批次 | 内容 |
| ---- | ---- |
| A | core/types +44（语义段追加）+ core 收 useCopyFeedback（`./use-copy-feedback`）+ store 收 useSettingsStore/useBigModelSDK/global-store（`use-settings-store`/`use-big-model-sdk`/`global-store` exports） |
| B | 建 @yyc3/admin + @yyc3/monitor 包（package.json/tsconfig/index.ts/DEV-GUIDE git mv + 30 组件 git mv + 7 hooks git mv + 包内改引） |
| C | `pnpm install --no-frozen-lockfile`（两新包首装） |
| D | 三端切换：routes 15 处/端 + 壳层 Layout 1 + 测试件三形态 + 暂缓件收编依赖切引 + 收编 hooks 全端消费点切引 + 端侧删除（P3/P4 各 41 件）+ P1 域 index.ts 导引改写 |
| E | 验证矩阵：core/store/admin/monitor tsc 0 + P1 tsc=67 基线 + P3/P4=0 + build 三绿 + P2=7 基线 |
| F | 方案回填 + 执行日志 v1.5.0 + 主文档 v1.13.0 + git 提交 |

## 四、风险登记

| 风险 | 缓解 |
| ---- | ---- |
| 44 类型批量追加撞名（ChatMessage 等 ai 族） | 先 grep 复核再追加；tsc 兜底；撞名复用不重定义 |
| global-store 入 store 后端侧 10 处消费切引遗漏 | 消费面按 `from` 全枚举后逐端切 |
| monitor 组件互引密度高（Dashboard 聚合 10+ 件） | 包内全改相对路径 `./X`；barrel 只导出顶层组件 |
| 测试件 vi.mock 三形态漏杀（偏差 #13/#14 教训） | 先贴实际行再写 pattern；from + vi.mock( + 动态 import( 三形态枚举 |
| perl `@` 插值陷阱（偏差 #12 教训） | 替换串 `@yyc3` 一律写 `\@` |

## 五、执行实测回填（F 批落盘，2026-10-10）

### 5.1 结果总览

| 项 | 实测值 |
| ---- | ---- |
| 双包规模 | @yyc3/admin 10 组件 + 4 hooks（exports 15 条）；@yyc3/monitor 20 组件 + 3 hooks（exports 24 条，dep 含 @yyc3/ops） |
| core 扩容 | types.ts 1023→1458L（+54 类型，传递闭包终值）；新增 `./use-copy-feedback` export |
| store 扩容 | +3 exports（use-settings-store 带 @deprecated / use-big-model-sdk / global-store） |
| ui 补导 | barrel 补 `./brand/YYC3LogoSvg`（monitor 包内 SDKChatPanel 消费） |
| P1 切换 | routes 13 处动态引切包（暂缓 7 处保留）+ Layout 1 + 主代码 15 文件 + 测试件 57 文件（41 条映射）+ 双 barrel 改写（admin 9 re-export / monitor 21 re-export） |
| P3/P4 切换 | 各 routes 13 + 留端件 15 文件 + 测试件（P3 51/P4 52 文件）+ 端侧删除 38 件/端（30 组件 + 7 hooks + global-store） |
| 验证矩阵 | 七包 tsc=0（core/store/ui/ops/ai/admin/monitor）+ P1 tsc=67 基线精确持平 + P3=P4=0 + build 三绿 844/792/807ms + P2=7 错基线无扰 ✅ |

### 5.2 偏差记录

| # | 偏差 | 处置 | 教训 |
| ---- | ---- | ---- | ---- |
| 1 | 双包首验 TS7016/TS7026（@types/react 未解析） | 对照 ops 先例补 devDependencies（@types/node/@types/react/typescript + peer 本地化） | 新包四件套必须整抄先例，tsconfig 单抄不够 |
| 2 | admin 缺 recharts/zustand、monitor 缺 react-router/react-swipeable/zustand/react-dom | peer+dev 双补（Monitor 的 process 报错由 @types/node 解） | peer 清单按组件实扫，不凭域想象 |
| 3 | admin barrel 误导出不存在的 `DataEditorTables` 具名 | 实际导出 ModelTable/NodeTable/AgentTable 三子件，barrel 修正 | barrel 导出名以 tsc 实测为准 |
| 4 | useAISuggestion 残留 `../types`（原文件深度不同致 perl 盲区） | 手工切 `@yyc3/core/types` | hooks 收编后逐文件残留检查不可省 |
| 5 | 测试件 perl 替换串多包引号 → `""@yyc3/…""`（57 文件）；修复轮又重复加前缀 → `@yyc3/@yyc3/`（117 处） | 两轮修复归零 | 替换串一律 `$1…$1` 直拼；修复串不加前缀（$1 已含）——两坑同源：替换串手写包裹物 |
| 6 | P1 端 barrel（modules/admin\|monitor/index.ts）未及时改写 → 29 错爆发 | admin 9 件 + monitor 21 件转包 re-export，暂缓件保持本地导出 | 端侧 barrel 是「第四消费形态」，D 批必查 |
| 7 | rf-phase2.test.ts `?raw` 源码审计引未被路径映射覆盖 | 切 `@yyc3/monitor/hooks/use-alert-rules?raw`（断言语句在包内源码仍成立） | `?raw`/`?query` 后缀路径是 pattern 盲区，需单独枚举 |

### 5.3 包拓扑终态（M4-4 后）

```
P1 app-web-full(3030) / P3 app-desktop(3032) / P4 app-web-classic(3033)
  → @yyc3/theme + ui + core + store + ops + ai + business + admin + monitor（9 包）
P2 app-sandbox-lite(3031)：无 @yyc3 依赖（基线隔离）

@yyc3/admin  peer: react/lucide-react/recharts/sonner/zustand   dep: core+store+ui
@yyc3/monitor peer: react/react-dom/lucide/react-router/react-swipeable/recharts/sonner/zustand
              dep: core+store+ui+ops（operation-chain 消费）
```

### 5.4 后续登记更新

- M4-0 定性终局：真全异 3→0 归零（CreateRuleModal 翻转）；反向独有 5→4（UnifiedModelManager 归 M4-8）
- 跨域障碍九分法新增 2 形态：storageManager 引引擎层（→StorageManager/StorageSyncStatus 暂缓）、config 跨域消费（→ConfigCenter/PageConfigEditor 暂缓）
- types 单源收敛累计：+87（M4-2/3）→ +141（M4-4 本批 +54）
- P1 存量基线 67 构成实测：ai-family components 平铺目录 ~65 + setup.ts MockIntersectionObserver 1 + 1（未逐条，总量精确持平）
- 下次起点：M4-5 shared 域定性（GlassCard/YYC3Logo/YYC3LogoSvg/empty-state 已在 @yyc3/ui，端侧 shared/ 剩余件清点）
