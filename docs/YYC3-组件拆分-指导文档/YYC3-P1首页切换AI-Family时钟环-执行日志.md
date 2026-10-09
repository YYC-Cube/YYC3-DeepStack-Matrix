---
file: YYC3-P1首页切换AI-Family时钟环-执行日志.md
description: P1 首页由 DataMonitoring 切换为 AI Family 时钟环（AIFamilyPage）— 全量改动与测试保通记录
author: Intelligent Application Implementation Expert <admin@0379.email>
version: v1.3.0
created: 2026-10-08
updated: 2026-10-09（v1.3：flaky 超时加固 + StorageSyncStatus OOM 专项定性；v1.2：T7 存量 13 例修复；v1.1：dev 走查、端口合规、Sidebar 强化）
status: stable
tags: [execution-log],[routing],[ai-family],[homepage]
category: report
---

# 📝 P1 首页切换 AI Family 时钟环 — 执行日志

> **「执行有规划，规划有节点，节点有目标，目标可评估」**

## 一、任务目标

将 P1（`YYC3 CloudPivot Intelli Matrix/` v3.4.1）的 AI Family 时钟环页面（`AIFamilyPage`）设为整个应用导航的首页（`index` 路由），原首页 DataMonitoring 迁至独立 path `/data-monitoring` 保持可达。**逐项推进、每项测试保通、文档日志同步**。

**前提分析结论**：

- `AIFamilyPage` 不依赖 `useLocation/useParams/useNavigate`，可安全作为 index 渲染；
- 时钟页需全屏沉浸式布局，`Layout.tsx` 已有 `/ai-family` 前缀免 padding 特判，首页需纳入同一分支；
- `DataMonitoring` 原本**仅有 index 路由、无独立 path**，切走首页后必须补 path，否则监控页不可达（关键发现）；
- 导航高亮基于 `getActiveCategoryId(pathname)` 严格相等匹配（`c.path === pathname`），首页 `/` 需特判归属。

## 二、推进流程与执行记录

### T1 路由层 — ✅ 完成（测试：tsc 零新增）

**改动文件**：[`src/app/routes.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/routes.tsx)

| 改动 | 内容 |
| ---- | ---- |
| index 路由 | `{ index: true, Component: withSuspense(AIFamilyPage) }` |
| DataMonitoring 补 path | `{ path: "data-monitoring", Component: withSuspense(DataMonitoring) }` |
| 保留 | `/ai-family`（L226）、`/ai-family/:subpage`（L227）原路由不动 |
| 文件头 | `@version v2.1.0`、`@updated 2026-10-08` |

**测试保通**：`pnpm type-check` 存量 70 错误全部位于游离副本 `src/app/components/ai-family/`（import 断链，改动前既有），本次改动文件零新增错误。

### T2 布局适配 — ✅ 完成（测试：tsc 零新增）

**改动文件**：[`src/app/modules/shared/Layout.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/modules/shared/Layout.tsx)（L132-137）

```tsx
location.pathname === "/" || location.pathname.startsWith("/ai-family")
  ? ""   // 首页与时钟页同为沉浸式，无 padding
  : view.isMobile ? "px-3 pt-2 pb-[72px]" : ...
```

### T3 导航五处同步 + 首页高亮 — ✅ 完成（测试：tsc 零新增 + vitest 11/11 绿）

| 文件 | 改动 |
| ---- | ---- |
| [`config/page-config.ts`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/config/page-config.ts) | `"data-monitoring"` 注册项 `path: "/"` → `"/data-monitoring"` |
| [`Sidebar.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/modules/shared/Sidebar.tsx) | dataMonitor path → `/data-monitoring`；`getActiveCategoryId` 特判 `pathname === "/" → "ai-family"`（遍历 `NAV_CATEGORIES`） |
| [`TopBar.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/modules/shared/TopBar.tsx) | 同 Sidebar 特判，但遍历对象为 **`MOBILE_NAV`**（两文件变量名不同，曾误改一致已修复）；dataMonitor path 同步 |
| [`BottomNav.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/modules/shared/BottomNav.tsx) | PRIMARY_TABS 首项改为 `{ i18nKey: "nav.aiFamily", path: "/", icon: UserCircle2 }`；MORE_CATEGORIES catMonitor 组补 `{ key: "nav.dataMonitor", path: "/data-monitoring", icon: BarChart3 }` |
| [`CommandPalette.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/modules/shared/CommandPalette.tsx) | `nav-home` → `labelKey: "nav.aiFamily", path: "/"`；新增 `nav-datamonitoring` → `/data-monitoring` |

### T4 测试修正与全量验证 — ✅ 完成

**有意行为变更引发的测试修正**（7 例，断言随行为更新）：

| 测试文件 | 修正 | 结果 |
| -------- | ---- | ---- |
| `BottomNav.test.tsx` | mock translations 补 `"nav.aiFamily"`；3 处 `监控` 断言 → `AI Family` | **9/9 绿** |
| `CommandPalette.test.tsx` | 点击 `nav.dataMonitor` 断言 navigate → `/data-monitoring` | **11/11 绿** |
| `TopBar.test.tsx` | ①导航项渲染：默认展开组改断言 `nav.catAIFamily` + `nav.aiFamilyHome`；②点击导航：`getAllByText("nav.aiFamily")[0]`；③monitor 组断言前显式 `fireEvent.click(getByText("nav.catMonitor"))` 展开 | **22/22 绿** |

**全量验证结果**：

| 检查项 | 命令 | 结果 |
| ------ | ---- | ---- |
| TopBar 单文件 | `pnpm vitest --run src/app/__tests__/TopBar.test.tsx` | ✅ 22/22 |
| build | `pnpm build`（tsc electron + vite build） | ✅ EXIT=0（built in 957ms） |
| 全量 vitest | `pnpm vitest --run` | ✅ **5038/5063**，4 文件 13 例失败全为存量 |

**13 例存量失败归因**（与本次改动零关联，未触碰相关文件）：

| 文件 | 例数 | 失败性质 |
| ---- | ---- | -------- |
| `CLITerminal.test.tsx` | 5~6 | 终端快捷命令/键盘历史导航（组件内部逻辑） |
| `ConnectionMonitorPanel.test.tsx` | 4 | 返回按钮/健康检查卡/连接池统计 |
| `DatabaseConnectionPanel.test.tsx` | 2 | SQL 执行/危险 SQL 拦截 |
| `IDEStatusBar.test.tsx` | 1 | 活动标签语言标签 |

**存量红基线（type-check）**：70 个 TS 错误全部位于游离副本目录 `src/app/components/ai-family/`（TS2307 找不到 `../GlassCard`、`../../store/slices/family-settings-slice`、`../../hooks/useMusicPlayer` 等物理不存在的模块），为改动前既有状态，属后续 Phase 4 业务域合并任务范围。

### T6 dev 启动与人工走查 — ✅ 完成（2026-10-09）

**端口合规**：[`vite.config.ts`](../../YYC3%20CloudPivot%20Intelli%20Matrix/vite.config.ts) dev server 端口 `3218` → **`3030`**（团队硬约束：端口统一 3030 起）。启动：`pnpm dev`（VITE v8.0.11，429ms ready），地址 <http://localhost:3030/> 。

**走查结论**：

| # | 检查点 | 结果 | 证据 |
| - | ------ | ---- | ---- |
| 1 | `/#/` 渲染 AI Family 时钟环（8 成员环形、全屏沉浸） | ✅ PASS | 真实 Chromium 视觉确认（清缓存后），页面标题「YYC³ Cloud Intelli-Matrix」 |
| 2 | 桌面侧栏首页 ai-family 分组高亮、monitor 不高亮 | ✅ PASS | 新增真实 DOM 断言（Sidebar.test 强化，20/20 绿）：`nav-cat-ai-family` 含激活色 `#00d4ff` + 激活指示条，`nav-cat-monitor` 为非激活色 |
| 3 | `/#/data-monitoring` 数据监控页可达可渲染 | ✅ 结构/编译保通（视觉待用户复验） | 路由已注册；Vite 转译 DataMonitoring→Dashboard(160KB) 及全部二级依赖 HTTP 200；`pnpm build` 整图通过；dev 日志零错误 |
| 4 | 命令面板含 AI Family→`/`、数据监控→`/data-monitoring` | ✅ PASS | CommandPalette 11/11（含 navigate 目标断言） |
| 5 | 移动端 BottomNav 首项 AI Family 选中、更多抽屉含数据监控、移动菜单 ai-family 组默认展开 | ✅ PASS | BottomNav 9/9 + TopBar 22/22（默认展开组断言 + monitor 需点击展开）；Chromium 中已目验 BottomNav 首项选中态 |

**走查插曲（环境问题，非应用缺陷）**：

1. 浏览器首次打开 3030 看到的是**无关旧应用**（"单一事实源直读/流水线/分镜确认/pipeline_auto.py"）——系该端口历史注册的旧 Service Worker 缓存劫持；curl 核实服务器返回正确（title `YYC³ Cloud Intelli-Matrix`），浏览器执行 `navigator.serviceWorker.getRegistrations()` 注销 + `caches.delete()` 后恢复正常。**教训：跨项目复用同一端口时，PWA SW 缓存会跨项目串味，换端口后首次走查须先清 SW。**
2. 自动化浏览器后续出现 webview 指令超时/截图不可用（IDE browser 工具侧降级，标签页实际已加载 `/#/data-monitoring`），检查点 3/5 的纯视觉复验未在自动化中完成，已由单测 + 转译/构建证据闭环；建议用户在本机浏览器直接目验一次。

### T7 存量 13 例测试失败定点修复 — ✅ 完成（2026-10-09，诊断驱动最小补丁）

**边界**：仅处理全量基线中既有、与首页改动无关的 13 例红（4 文件），不扩范围。逐文件单跑归零后再统一复查。

| 根因类 | 文件 | 例数 | 病灶 | 定点修复 |
| ------ | ---- | ---- | ---- | -------- |
| **A 测试 mock 路径错位** | [`CLITerminal.test.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/CLITerminal.test.tsx) | 6 | mock `../hooks/useTerminal`，组件实际 import `modules/dev/hooks/useTerminal`，mock 空转走真实 hook | mock 路径改 `../modules/dev/hooks/useTerminal` |
| **A 测试 mock 路径错位** | [`DatabaseConnectionPanel.test.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/DatabaseConnectionPanel.test.tsx) | 2 | mock `../modules/dev/CodeEditor`，唯一真实文件在 `components/CodeEditor`，走真实 CodeMirror 无 `sql-editor` testid | mock 路径改 `../components/CodeEditor` |
| **A 测试 mock 路径错位** | [`IDEStatusBar.test.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/IDEStatusBar.test.tsx) | 1 | 同上 CodeEditor 路径错位（`getLanguageLabel` 未拦截） | mock 路径改 `../components/CodeEditor` |
| **B 异步断言未等待** | [`ConnectionMonitorPanel.test.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/ConnectionMonitorPanel.test.tsx) | 3 | healthCheck/poolStats 在 effect `await` 后 setState，测试 render 后**同步**断言 | 3 例改 `async` + `findByText` 等待异步卡片 |
| **C 组件真 bug** | [`ConnectionMonitorPanel.tsx`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/modules/ops/ConnectionMonitorPanel.tsx)（L199-207） | 1 | 带 `connectionId` 直入详情时 `_showList` 初始 false，返回列表按钮仅 `setSelectedConnectionId(null)` 不重置 `_showList`，列表条件不满足→**回不到列表** | 返回按钮 onClick 补 `_setShowList(true)`（符合 List 图标「返回列表」语义） |

**单文件归零**：CLITerminal **14/14** · ConnectionMonitorPanel **19/19** · DatabaseConnectionPanel **23/23** · IDEStatusBar **14/14**（合计 70/70）。

**统一复查**：

- `pnpm type-check`：67 条错误**全部仍在**游离副本 `src/app/components/ai-family/`（20 文件），本次改动文件零新增；
- `pnpm build`：**EXIT=0**（4.19s）；
- 并行全量（final2）逐文件结果：**288/289 文件正常、0 断言失败**；4 个目标修复文件在全量中均 ✓（23/19/14/14）。

**2 例并行高负载 flaky — 已定点加固（保留覆盖，仅放宽超时）**：

| 文件 / 用例 | 病灶 | 加固 |
| ----------- | ---- | ---- |
| [`rf-phase2.test.ts`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/rf-phase2.test.ts)「routes.ts 导出 router 对象」 | 首次 `await import("../routes")` 需加载 routes 完整静态模块图（Layout/Suspense 等），并行冷启动偶发 >10s 默认阈值（实测 10064ms） | 单用例第三参数提至 `20000`（沿用该文件 L232 既有模式） |
| [`useBigModelSDK.test.ts`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/useBigModelSDK.test.ts)「逐字符更新流式内容」 | hook 真实定时器逐字符推送（`useBigModelSDK.ts` L456 每字 `setTimeout(15~40ms)` × 长 mock 文本），并行 worker 调度推迟墙钟，`waitFor(5000)` 偶发超时 | `waitFor` 超时 `5000 → 15000` |

两文件**串行无竞争重跑 51/51 全绿**，确证非产品缺陷、与首页改动无关。

**⚠️ 独立存量工程问题：`StorageSyncStatus.test.tsx` forks worker 堆 OOM / 收尾挂起（本轮未修，超最小补丁边界）**：

- 现象：全量时该文件 worker 不出结果行、进程不退出（T4 首跑 final.log 即有 `Timeout terminating forks worker ... StorageSyncStatus.test.tsx`，**改动前既有**）；单文件复现——原始文件（未改动）`FATAL ERROR: Ineffective mark-compacts near heap limit ... heap out of memory EXIT=1`，受控观察单 worker RSS 涨至约 **3GB** 后卡死（128GB 机器空闲 72GB，属 worker 自身堆膨胀）。
- 已排除：① 组件实例未卸载——[`setup.ts`](../../YYC3%20CloudPivot%20Intelli%20Matrix/src/app/__tests__/setup.ts) L178-189 已全局注册 `afterEach/afterAll(cleanup)`，globals:false 仍生效；② mock 失效——`../services/storageManager`、`../hooks/useI18n`、`ui/*` 路径解析与组件 import 物理一致，运行时依赖全部被 mock；③ 本轮改动引入——OOM 在对该文件做任何改动前即复现。试探性补的文件级 `cleanup()` 已确认无效并**回退**（该测试文件净改动为 0）。
- 建议专项手段（列入待办，独立任务）：`NODE_OPTIONS=--max-old-space-size=2048` 稳定复现快速 OOM → `node --inspect` 取堆快照定位增长源；`why-is-node-running`/`wtfnode` 查活动句柄；二分注释该文件 import 与用例；对比 `--pool=threads` 判断是否 forks 特有；重点查 setup 全局 `fake-indexeddb` 与某真实模块图的交互、vite 8/vitest 4 对 barrel（lucide-react）的 transform 病态。
- 备注：vitest 4.1.5 已**彻底移除** `forceExit`（CLI flag 与 `InlineConfig` 类型均无此项，临时加配置触发 TS 重载错误，已回退 vite.config 无残留）；默认 forks 机制最终会强杀挂起 worker 但耗时不可控，`--no-fileParallelism` 结果正确但 289 文件需 20+ 分钟。

### T5 文档日志同步 — ✅ 完成（本文档）

- 主文档 [`YYC3-四项目实况对比-统一拆分实施流程.md`](./YYC3-四项目实况对比-统一拆分实施流程.md) 升版 **v1.2.0**：3.1 路由骨架图同步 index 现状、4.x 页面型谱表 DataMonitoring 行加注、frontmatter 版本记录；
- 本执行日志落盘，供跨会话衔接。

## 三、行为变更清单（用户可见）

| 变更点 | 旧行为 | 新行为 |
| ------ | ------ | ------ |
| 首页 `/` | 数据监控看板 | AI Family 时钟环（8 位成员时钟布局，全屏沉浸式） |
| 数据监控入口 | 首页 | `/data-monitoring`（侧栏监控组、BottomNav「更多」抽屉、命令面板均可达） |
| 首页高亮 | monitor 组 | ai-family 组（Sidebar/TopBar 移动抽屉） |
| BottomNav 主 tab | 监控 | AI Family |
| 命令面板 | 无首页/监控分离项 | `nav.aiFamily` → `/`、`nav.dataMonitor` → `/data-monitoring` |

## 四、遇到的问题与解决方案

| 问题 | 解决方案 | 经验教训 |
| ---- | -------- | -------- |
| SearchReplace 模糊匹配把 TopBar 的 `MOBILE_NAV` 误改为 `NAV_CATEGORIES`（Sidebar 的变量名），引用未定义变量 | 立即二次 SearchReplace 改回 | **编辑前必须确认目标文件中的真实标识符名**，不得凭另一文件的印象写 old_str |
| 终端 PATH 精简，`pnpm/tail/sleep` command not found | 每条命令前置 `export PATH=/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Users/yanyu/Library/pnpm:$PATH` | 环境差异先探明再执行 |
| IDE 终端超时回收长命令（全量 vitest 两次被杀、command_id 失效） | `nohup sh -c '... > /tmp/xxx.log 2>&1; echo EXIT=$? >> /tmp/xxx.log' &` 后台化 + grep 轮询日志尾行 | 长任务一律后台化，以日志文件为唯一事实源 |
| type-check 退出码 2（70 错误） | 错误清单文件级比对 + Glob 物理验证目标模块不存在 | 非 git 仓库下以「错误文件 ∩ 本次改动文件 = ∅」判定存量基线 |

## 五、下次会话启动指南 🚀

### 快速恢复命令

```bash
# 1. 进入 P1 项目
cd "/Users/yanyu/Downloads/YYC3-CloudPivot-Matrix-集成/YYC3 CloudPivot Intelli Matrix"

# 2. 导出 PATH（每条命令都需要）
export PATH=/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Users/yanyu/Library/pnpm:$PATH

# 3. 复核本次改动相关测试（应全绿，含 Sidebar 高亮强化用例）
pnpm vitest --run src/app/__tests__/Sidebar.test.tsx src/app/__tests__/TopBar.test.tsx src/app/__tests__/BottomNav.test.tsx src/app/__tests__/CommandPalette.test.tsx

# 4. build 保通复核
pnpm build

# 5. 本地起服务人工走查（端口固定 3030；若页面串味先清站点 SW/缓存）
pnpm dev
# 浏览器打开 http://localhost:3030/#/ 与 http://localhost:3030/#/data-monitoring
```

### 当前优先级 TOP 3

1. **[P1]** `StorageSyncStatus.test.tsx` forks worker 堆 OOM/收尾挂起专项排查（堆快照 + why-is-node-running 定位句柄/增长源；当前唯一阻断「全量一键出汇总」的存量工程问题，详见 T7）
2. **[P1]** 游离副本 `src/app/components/ai-family/` 67 个 TS 错误清理（属 Phase 4 业务域合并，与 `src/app/modules/ai-family/` 双副本病灶归一）
3. **[P2]** 用户本机浏览器目验 `/data-monitoring` 视觉（自动化截图工具降级未截到，结构/编译已保通；需走查时重新 `pnpm dev`，dev server 收尾时已停）

### 断点位置

首页切换（T1~T6）与存量 13 例测试修复（T7）均已闭环，无中断点。下次直接从「优先级 TOP 3」第 1 项（OOM 专项）起步，复现命令与排查路径见 T7。

---

**会话状态**：✅ 正常结束
**验证基线（v1.3）**：
· 首页导航四文件 62/62 绿（Sidebar 20 + TopBar 22 + BottomNav 9 + CommandPalette 11）
· T7 目标四文件 70/70 绿（CLITerminal 14 + ConnectionMonitorPanel 19 + DatabaseConnectionPanel 23 + IDEStatusBar 14）
· flaky 加固两文件串行 51/51 绿
· 全量并行 288/289 文件正常、0 断言失败（唯一异常 StorageSyncStatus 为存量 OOM，独立待办）
· build EXIT=0 · tsc 67 错全在游离副本、本次改动零新增 · dev(3030) 首页视觉 PASS

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」
