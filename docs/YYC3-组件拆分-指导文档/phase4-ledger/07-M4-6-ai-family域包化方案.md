---
file: 07-M4-6-ai-family域包化方案.md
description: M4-6 @yyc3/ai-family 特深域扩容 — 死副本清障 + 75 件建包 + hotel-bridge/MEMBERS_MAP 破环 + P1 48 错/P2 断链同窗修复
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.1.0
created: 2026-10-10
updated: 2026-10-10（实测回填：86 件建包 exports 90 条 + 死副本清障 38 + 四端 tsc/build 双全零全绿首态 + P2 build 首绿；偏差 #23-#25）
status: active
tags: [phase4],[ai-family],[domain-package],[dead-code],[p2-repair],[hotel]
category: plan
---

# M4-6 @yyc3/ai-family 特深域包化方案

> 上游：Phase 4 规划 M4-6 + M4-2b D4/D7 移交（HotelDashboard/hotel-bridge/智慧酒店 L1）+ M4-5 交接（P1 剩 48 错/P2 routes 断链同窗）。

## 1. 勘察实证

### 1.1 P1 双层结构错链诊断（P1 48 错根源）

- P1 存在 **modules/ai-family/components（活层 36 件）与 components/ai-family（死副本 36 件）同名双副本**
- **死副本 ≡ P3/P4 md5 逐字节全同**（36/36，引用按 P3/P4 结构写：`../../store/slices/`、`../../hooks/`——在 P1 落空）→ 历史迁移残留死代码
- **死副本零外部引用**（routes 只引 modules 层；测试/业务零引用）→ P1 48 错（TS2307 断引 13 + 连锁 TS7006/7053 35）**全部来自死副本**

### 1.2 组件层三方仲裁（36+1 件，P1 modules 版为活源）

| 级别 | 件数 | 明细 |
| -- | ---- | ---- |
| L0 全同 | 8 | ai-family-local/AIFamilyRouter/AudioVisualizer/FadeIn/FamilyLearn/FamilyPageHeader/LazyWrap/VinylPhotoPlayer |
| L1 纯路径差（4~16 行） | 25 | 含 FamilyMusic/FamilyVoiceSystem 16d、FamilyAnnouncer/FamilyModelSettings 10d 等 |
| P1 独走新版（P3=P4 同源滞后） | 2 | FamilyCommCenter（646 vs 549L，+97）/ FamilyPhone（571 vs 422L，+149）——P1 版为基线随包，P3/P4 随包升级 |
| P1 独有 | 1 | AgentSkills.ts（709L） |
| AIFamilyPage | — | P3=P4 同 732L；P1 独走但 diff 仅 import 路径差 → L1 纯路径差 |

### 1.3 slices/hooks/lib/types 层

- **family-\* 13 slices**（P1 modules/ai-family/store vs P3/P4 store/slices）：11 L0 + 2 L1（family-member/message 4 行纯深度差）
- **hooks 4 件**（P1 modules/ai-family/hooks vs P3/P4 app/hooks）：useAudioEngine L0 + useAIFamilyNav/useEmotionMusic/useMusicPlayer L1（4~8 行路径差）
- **lib 20 件**（P1 app/lib → 随包）：19 件 ai-family 域 lib 三端共有（13 L0 + 6 L1 纯路径差）+ family-data-accessor（modules/ai-family/lib）+ **hotel-bridge 137L 三端 L0 全同**（唯一消费方 FamilyHotel 域内组件）
- **types**：modules/ai-family/types/（family-member/family-message/index）——UnifiedFamilyMember 真源在 family-member.ts（app/types/index.ts 为 re-export 桥）；lib/ai-family.types.ts（三端 L0）
- **useClock**（AIFamilyPage 唯一端侧 hook 依赖）：三端 md5 全同 → 入 `@yyc3/core/use-clock`

### 1.4 MEMBERS_MAP 破环实证（M4-2b D4 障碍解除）

shared.ts L230-238 已内置 **store-backed 重建机制**（`Object.keys(MEMBERS_MAP).forEach(delete)` + `useFamilyMemberSlice` 订阅重建 + getDynamicMembersMap）——slices 与 shared 同包后 **MEMBERS_MAP 闭环包内自洽**，原「运行时可变触点」障碍实测不成立。

### 1.5 P2 断链诊断（P2 7 错同源）

- P2 `components/ai-family/` **空目录**但 routes.ts 引 `./components/ai-family/AIFamilyRouter`（TS2307×1 + 15 条路由引用）
- P2 AIFamilyCenterPage 引 `./ai-family/shared`（TS2307）+ 连锁 implicit any ×5——**AIFamilyCenterPage/AIFamilyDesignDoc 零消费方**（routes/App 均不引）→ P2 死代码
- P2 AIFamilyPage（823L）引 P2 本地 useI18n → **P2 独走异构版留端**；AIFamilyRouter 切包修复

## 2. 方案

| 批 | 内容 |
| -- | ---- |
| X1 清障 | P1 死副本 36 件 git rm（P1 tsc 48→0 预期）；P2 死件 AIFamilyCenterPage/AIFamilyDesignDoc 删（P2 tsc 7→1） |
| X2 useClock 入 core | 三端 L0 → git mv + exports +1；三端消费方切引（除 ai-family 外的端侧消费同步） |
| X3 建包 | `@yyc3/ai-family`：P1 modules/ai-family 全量 git mv（AIFamilyPage/routes/index/components 37/store 13/hooks 4/types 3/lib 1）+ app/lib 20 件 mv（19 域 lib + hotel-bridge）+ 包内路径修正（`../../../types`→包 types、`../../../lib/X`→`../lib/X`、`../../hooks/useClock`→core、routes.tsx 壳层 ErrorBoundary 引改内联）+ exports 显式逐条 |
| X4 三端切换 | P1：routes.tsx 2 lazy + store/index.ts + lib 消费方（MusicEventBus 4/VoiceCommandParser 3/EmotionMusicBridge 2 等 15 件）+ 测试件 ~20 + HotelDashboard 切 `@yyc3/ai-family/shared`；P3/P4：routes + 删副本（组件 37+slices 13+hooks 4+lib 20+Page）+ 消费方/测试切引 |
| X5 P2 修复 | package.json + `@yyc3/ai-family`；routes AIFamilyRouter 切包（P2 tsc 7→0 预期） |
| X6 验证收官 | 十包 tsc + 四端基线 + build + vitest + 文档 + 提交 |

## 3. 决策表

| # | 决策 | 依据 |
| -- | ---- | ---- |
| D1 | P1 死副本 36 件直接删（非切引） | 死副本≡P3/P4 全同 + 零外部引用 + 48 错全源于此 |
| D2 | P2 AIFamilyCenterPage/DesignDoc 删、AIFamilyPage 留端、Router 切包 | P2 死代码零消费方；Page 独走异构（引本地 useI18n）；Router 三端同源可切 |
| D3 | useClock 入 core（非随包） | 三端 md5 全同 + 通用时钟 hook 语义；ai-family 包引 core 合法 |
| D4 | lib 20 件全随包 `lib/`（含 hotel-bridge） | 域专属语义（hotel-engines 先例）；hotel-bridge 唯一消费方在域内 |
| D5 | FamilyCommCenter/FamilyPhone 取 P1 版基线，P3/P4 随包升级（滞后 97/149 行） | M4-0 仲裁基线「P1/P4 功能最全双源」+ P1 独走新版实证 |
| D6 | types 随包（family-member/message/index + ai-family.types） | UnifiedFamilyMember 真源；端侧 app/types 桥保留 re-export |
| D7 | routes.tsx 随包，ErrorBoundary 引用改内联 fallback | aiFamilyRoutes 零端侧消费；壳层 ErrorBoundary 留端 Phase 5 不可引 |
| D8 | 智慧酒店 L1 视觉融合（density="compact"）不阻工程面 | 视觉走查类归 Phase 5 专项；本批完成 HotelDashboard 切包破环 |

## 4. 实施实测回填（2026-10-10）

### 4.1 结果总览

| 批 | 结果 |
| -- | ---- |
| X1 清障 | P1 死副本 36 件删（**tsc 48→0 一次归零**，错链全源于死副本实锤）；P2 死件 2 件删（7→1） |
| X2 useClock | 三端 L0 入 `@yyc3/core/useClock`（exports 45→46 条）+ 三端 10 文件切引 |
| X3 建包 | **`@yyc3/ai-family` 86 件**（组件 37 + Page + slices 13+index + hooks 5 + types 3 + lib 26 + index）+ exports **90 条显式**；peer 7 项（react/lucide/motion/react-router/zustand/clsx/@mlc-ai/web-llm——按实扫）；dep 4 包（core/store/ui/business）；包内路径修正三层（`../../../types`→包 types、`../../../lib/`→`../lib/`、lib 旧 modules 路径→包内相对）；inference 6 类型并入 core/types（1583L）；ai-service-manager/inference-engine 改引 core/types；routes.tsx 删（aiFamilyRoutes 零消费）；**ai-family tsc=0** |
| X4 三端切换 | 36+55+53 文件主切 + 补刀 3 轮（`./modules/ai-family/lib/` 无 modules 段形态 ×2、store barrel `./slices/` 形态、HotelDashboard `./ai-family/shared` 单层）；P3/P4 删副本 96 件（components 37+Page+DesignDoc+CenterPage + slices 13 + hooks 5 + lib 26 ×2 端）；**三端 tsc 全 0**（P1 48→0、P3/P4 保持 0） |
| X5 P2 | package.json + `@yyc3/ai-family` + routes AIFamilyRouter 切包；**P2 tsc 1→0 史上首零**；**P2 build 存量 7 错基线首次归零全绿** |
| X6 验证 | **十包 tsc=0**（theme/core/store/ui/business/ai/ops/admin/monitor/**ai-family**）；**四端 build 全绿**（P1 813/P3 776/P4 779ms/P2 首绿）；P2 vitest **1813 通过**（rf-phase2 29/29 含 RF-011 修复，52 失败全存量实证）；P1 ai-family 抽测 136 例绿（含 DesignDoc 失效 vi.mock 修复 27/27） |

### 4.2 偏差登记（#23–#25）

| # | 事项 | 处置 |
| -- | ---- | ---- |
| 23 | **perl 捕获组错位**（#17 同族第五犯）：lib 切换脚本规则 1 `(\.\./)+lib/(ALT)` 中 `$1` 指向前缀组而非 ALT 组（$2）→ 56 文件产出 `@yyc3/ai-family/lib/../`（ALT 内容被丢弃） | 判据检出（grep `ai-family/lib/\.\./`）→ checkout 恢复 56 件 → 修复版 `$2` 重切一次归零；教训：**多捕获组替换前先数一遍组序，前缀组+目标组结构必须 `$2` 起用** |
| 24 | **首轮 grep 筛选断言误写**：`yyc3-cluster | zhipu-ai-service)"` 中 `yyc3-cluster` 后紧跟 `"`断言——`yyc3-cluster.types"` 因 `.` 不匹配漏筛（yyc3-cluster.test 39 错三端） | 精确 ALT 全名重跑；教训：**筛选 pattern 的候选项与断言边界须逐字对齐，前缀关系候选（X 与 X.types）必须全列** |
| 25 | **相对无段形态三漏**：`./modules/ai-family/lib/`（App.tsx）、`../ai-family/`（modules 互引无 modules 段）、`./slices/`（store barrel 内引）三种无 `modules/`/`store/` 段形态漏切 | 三轮补刀归零；教训固化（#6/#8 族）：**路径形态枚举需覆盖「同目录单层/上级无段/barrel 内引」三类无段形态** |

### 4.3 遗留技术债登记

- **失效 vi.mock 残留**（M4-5 品牌删除 + 本批 mv 后失联但测试静默通过）：TabBar/CLITerminal/Sidebar/TopBar/PatrolDashboard 等 `vi.mock("../modules/shared/GlassCard|YYC3Logo")`、`vi.mock("../lib/view-context")` 等——vi.mock 对不存在路径静默不生效，组件渲染真包件仍绿。登记 M4-7/M4-8 清扫（本批已修 AIFamilyDesignDoc 1 处因断言失败暴露者）

### 4.4 终态

- **@yyc3/ai-family**：86 件 / exports 90 条 / peer 7 / dep 4——特深域单列包达成
- **@yyc3/core**：src 34 件（+useClock）+ inference 6 类型并入（types 1583L）/ exports 46 条
- **端侧清空**：P1 modules/ai-family 整域迁移 + components/ai-family 死副本清空；P3/P4 components/ai-family + slices 13 + hooks 5 + lib 26 全清；P2 仅 AIFamilyPage 独走留端 + Router 切包
- **四端 tsc=0 / build 全绿**——Phase 4 首次全零全绿状态；P1 基线 67→48→0、P2 基线 7→0 双清零
