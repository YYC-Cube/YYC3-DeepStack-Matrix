/**
 * routes.tsx — app-ai-assistant 独立应用路由
 * /login → 登录门(表单/ghost);/models /settings → 系统管理页(壳内);
 * 登录态 = 模块级 store(localStorage 持久 + 订阅通知),LoginGate 与
 * Protected 共享同一份。注意:AppShell 只由 Protected 提供,路由 element
 * 里不得再包一层(否则双 header/双底栏/双浮窗)。
 */
import { useEffect, useState, type ReactNode } from "react";
import { createHashRouter, Navigate, useLocation } from "react-router";

import { Login } from "./components/Login";
import { ModelProviderPanel } from "./components/ModelProviderPanel";
import { SystemSettings } from "./components/SystemSettings";
import { AIFamilyPage } from "./components/AIFamilyPage";
import { AIFamilyRouter } from "./components/ai-family/AIFamilyRouter";
import { BottomNav } from "./components/BottomNav";
import { AIAssistant } from "./components/AIAssistant";
import { YYC3Logo } from "./components/YYC3Logo";
import { Toaster } from "sonner";

// ── 登录态迷你 store(模块级单源) ──
const AUTH_KEY = "aad_authed";
let authedFlag = localStorage.getItem(AUTH_KEY) === "1";
const authListeners = new Set<() => void>();

function loginAction(): void {
  authedFlag = true;
  localStorage.setItem(AUTH_KEY, "1");
  authListeners.forEach((l) => l());
}

function useAuthed(): boolean {
  const [v, setV] = useState(authedFlag);
  useEffect(() => {
    const l = (): void => setV(authedFlag);
    authListeners.add(l);
    return () => { authListeners.delete(l); };
  }, []);
  return v;
}

/** 应用壳:轻头部(logo/标题)+ 页面 + 自适应底部导航 + AI 浮窗;
 *  embed 态(AI 浮窗 iframe 内嵌,?embed=1)只渲染页面本体,壳/底栏/浮窗全隐藏 */
function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  const isEmbed = new URLSearchParams(useLocation().search).get("embed") === "1";
  if (isEmbed) {
    return (
      <div
        className="h-screen w-screen overflow-auto"
        style={{ background: "linear-gradient(135deg, #0c1830 0%, #101e38 30%, #0e1c3e 60%, #0a142c 100%)" }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0c1830 0%, #101e38 30%, #0e1c3e 60%, #0a142c 100%)" }}
    >
      <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(0,180,255,0.1)] bg-[rgba(0,40,80,0.12)]">
        <YYC3Logo />
        <div>
          <div className="text-[#e0f0ff] font-medium" style={{ fontSize: "0.86rem" }}>
            YYC³ AI 浮窗
          </div>
          <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.6rem" }}>
            可插拔 AI 助理 · 系统管理
          </div>
        </div>
      </header>
      {/* 家族/时钟环页自适应铺满(零内边距);系统页保留留白 */}
      <main
        className={`flex-1 overflow-auto ${
          location.pathname === "/" || location.pathname.startsWith("/ai-family")
            ? "p-0"
            : "p-4"
        } pb-[64px]`}
      >
        {children}
      </main>
      <BottomNav />
      {/* AI 浮窗:全页可用,独有系统模块 */}
      <AIAssistant isMobile={window.innerWidth < 768} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(8, 25, 55, 0.95)",
            border: "1px solid rgba(0, 180, 255, 0.2)",
            color: "#e0f0ff",
            backdropFilter: "blur(10px)",
          },
        }}
      />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }): React.JSX.Element {
  if (!useAuthed()) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function LoginGate(): React.JSX.Element {
  const authed = useAuthed();
  if (authed) return <Navigate to="/models" replace />;
  return <Login onLoginSuccess={loginAction} onGhostLogin={loginAction} />;
}

export const router = createHashRouter([
  { path: "/login", element: <LoginGate /> },
  {
    // 首页 = AI Family 时钟环(背景页);系统功能经底栏/浮窗进入
    path: "/",
    element: (
      <Protected>
        <AIFamilyPage />
      </Protected>
    ),
  },
  {
    // 主屏模型管理位 → AI Family 页(Owner 指令);模型管理本体保留于
    // /models-panel 供浮窗内嵌 iframe 使用(可插拔隔离)
    path: "/models",
    element: (
      <Protected>
        <AIFamilyPage />
      </Protected>
    ),
  },
  {
    path: "/models-panel",
    element: (
      <Protected>
        <ModelProviderPanel />
      </Protected>
    ),
  },
  {
    path: "/settings",
    element: (
      <Protected>
        <SystemSettings />
      </Protected>
    ),
  },
  {
    // AI Family 七图示域:hub 时钟环 + 16 子页(浮窗「页面」页签内嵌同一批路由)
    path: "/ai-family",
    element: (
      <Protected>
        <AIFamilyPage />
      </Protected>
    ),
  },
  {
    path: "/ai-family/:subpage",
    element: (
      <Protected>
        <AIFamilyRouter />
      </Protected>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
