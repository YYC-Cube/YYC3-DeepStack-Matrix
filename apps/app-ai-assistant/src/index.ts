/**
 * @yyc3/app-ai-assistant — 可插拔出口
 * ─────────────────────────
 * 宿主应用(Vite 系)直接源码消费:
 *   import { AIAssistant } from "@yyc3/app-ai-assistant/widget"
 *   import "@yyc3/app-ai-assistant/styles.css"   // tailwind v4 主题(宿主需 tailwind v4 或引此 css)
 *
 * 可插拔约定:
 * - AIAssistant 仅依赖本包内 hooks/lib/types,不依赖宿主路由
 *   (内部跳转走宿主 Router;宿主无 Router 时家族页签禁用场景自行裁剪)
 * - 系统管理页(ModelProviderPanel/SystemSettings)按需单导,宿主自行挂路由
 */
export { AIAssistant } from "./components/AIAssistant";
export { ModelProviderPanel } from "./components/ModelProviderPanel";
export { SystemSettings } from "./components/SystemSettings";
export { BottomNav } from "./components/BottomNav";
export { Login } from "./components/Login";
export { GlassCard } from "./components/GlassCard";
export { YYC3Logo } from "./components/YYC3Logo";
