/**
 * file: index.ts
 * description: @yyc3/shell — 应用壳层 barrel（Layout 族 + NavRegistry 单源 + 全局交互层）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-10
 * updated: 2026-10-10
 * status: active
 * tags: [shell],[package],[barrel]
 *
 * brief: Phase 5 壳层专项——Layout/Sidebar/TopBar/BottomNav + 路由级 Login/NotFound/ErrorBoundary
 *        + 全局交互 AIAssistant/CommandPalette/OfflineIndicator/ConnectionStatus/LanguageSwitcher
 *        + IntegratedTerminal；NavRegistry 单源 = sidebar 子路径的 navItems/NAV_CATEGORIES
 */

// 壳层骨架
export { Layout } from "./Layout";
export { Sidebar } from "./Sidebar";
export { TopBar } from "./TopBar";
export { BottomNav } from "./BottomNav";

// NavRegistry 单源（导航数据唯一定义，TopBar/Sidebar 共用）
export { navItems, NAV_CATEGORIES } from "./Sidebar";

// 路由级
export { Login } from "./Login";
export { NotFound } from "./NotFound";
export { ErrorBoundary } from "./ErrorBoundary";

// 全局交互层
export { AIAssistant } from "./AIAssistant";
export { CommandPalette } from "./CommandPalette";
export { OfflineIndicator } from "./OfflineIndicator";
export { ConnectionStatus } from "./ConnectionStatus";
export { LanguageSwitcher } from "./LanguageSwitcher";
export { IntegratedTerminal } from "./IntegratedTerminal";
