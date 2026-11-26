# @yyc3/app-ai-assistant · YYC³ AI 浮窗独立应用

> **可插拔 AI 浮窗系统模块** — 从 FAmily版(多版本卷)抽取:AI 智能助理浮窗 + 系统管理(模型管理/系统设置) + 全局 UI/UX 组件套件(49 件 shadcn 系)+ 自适应底部导航 + 登录页。独立应用与组件库双形态。

## 双形态

| 形态 | 用法 |
| ---- | ---- |
| **独立应用** | `pnpm dev`(3120 端口)→ 登录页(demo: admin@cloudpivot.local / admin123,或 GHOST 流)→ 应用壳 |
| **可插拔组件** | 宿主 `import { AIAssistant } from "@yyc3/app-ai-assistant/widget"` + `import "@yyc3/app-ai-assistant/styles.css"`;或整包 `@yyc3/app-ai-assistant` 导出浮窗/模型管理/系统设置/底部导航/登录/GlassCard |

## 页面与模块

| 路由 | 内容 | 来源组件 |
| ---- | ---- | ---- |
| `/login` | 登录页(表单 + GHOST 流,supabase shim 本地放行) | `Login.tsx`(318 行) |
| `/models` | 模型管理:服务商注册表/已配置模型/AddModelModal/ProviderEditorModal | `ModelProviderPanel.tsx`(500 行) |
| `/settings` | 系统设置:13 项目录(通用/网络/集群/模型/存储/WS/LLM/PWA/安全/通知/环境变量/高级) | `SystemSettings.tsx`(1367 行)+ `NetworkConfig.tsx`(883 行) |
| 浮窗 | AI 智能助理:对话/命令/提示词/配置 四页签 | `AIAssistant.tsx`(746 行) |
| 底部 | 自适应底部导航(原版设计,items 裁至应用域) | `BottomNav.tsx`(344 行) |

全局 UI/UX:`components/ui/` **49 件全套**(shadcn 系,26 个 @radix-ui 包)+ `GlassCard`。

## 抽取适配(与原版差异)

1. `lib/supabaseClient.ts` 为 **shim**:`supabase.auth.signInWithPassword` 本地 ghost 放行(独立应用无云 Auth);接真云时恢复原文件装 `@supabase/supabase-js` 即可,接口面不变;
2. `BottomNav` 导航项裁至应用域(模型管理/系统设置),「更多」抽屉随空分类自然隐藏;i18n 增 `bottomNav.models/systemSettings` 双语键;
3. 登录态为模块级迷你 store(localStorage `aad_authed` + 订阅),`Protected` 提供唯一 `AppShell`——路由 element 里不得再包壳(双 header 教训);
4. vite 8(rolldown)不支持 `manualChunks` 对象形态,分包交由路由懒加载。

## AI 浮窗 · 页面页签(iframe 独控,2026-11-27 增)

浮窗页签(对话|**页面**|命令|提示词|配置):**页面**页签把系统页直接渲染进浮窗内部——点击卡片 → 浮窗自动近全屏 → 同源 iframe 加载 `#/models?embed=1` / `#/settings?embed=1`,AppShell 识别 embed 态只渲染页面本体。iframe = 独立实例,页内导航不触主屏路由(实测主屏 URL 零变化)。自动化/e2e 可用 URL 引导:`#/settings?widget=1&tab=pages` 直开面板至页面页签(注意 hash 导航不重载页面,FastRefresh 会保留旧 state,需 reload 让初始参数生效)。

## 自包含红线

本目录包含全部所用源码与资源,**零中转拉取**(详见 [docs/SELF-CONTAINED.md](docs/SELF-CONTAINED.md)):
- 字体本地化:Rajdhani + Orbitron 全权重 woff2 落 `public/fonts/`(16 文件),原 Google Fonts @import 移除;
- favicon:`public/favicon.svg`;
- 溯源脚本(应用根 `extract-copy*.sh` / `vendor-fonts*.sh`)仅为抽取清单存档,构建/运行零引用。

## 验证基线(2026-11-27)

tsc strict 0 错(90+ 文件)· vite build 绿(rolldown 213ms)· 浏览器实测:登录页 → 表单登录进壳 → 模型管理(真机 Ollama 模型列表)/系统设置(13 项)/浮窗四页签 → 底部导航切换 → **页面页签 iframe 内嵌模型管理(主屏路由零变化)** · 仓内 gates G1-G7 全绿(本应用入 G2/G3/G5 名单,G7 元门禁覆盖)。
