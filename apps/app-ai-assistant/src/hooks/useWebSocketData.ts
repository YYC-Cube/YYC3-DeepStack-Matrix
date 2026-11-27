/**
 * useWebSocketData — 抽取 shim
 * ─────────────────────────
 * 原版 hooks/useWebSocketData.ts(283 行)依赖监控时代的 lib/api-config +
 * stores/dashboard-stores(nodeStore),属 GPU 运维平台遗留。
 * 本应用(AI 浮窗)仅需顶栏连接态展示,shim 提供同形状静态值:
 * 恒在线、无重连、手动重连为 no-op。
 * 原文件见 FAmily版 src/app/hooks/useWebSocketData.ts(未拷贝)。
 */
import { useCallback, useState } from "react";
import type { WebSocketDataState } from "../types";

export function useWebSocketData(): WebSocketDataState {
  const [lastSyncTime] = useState<string>(() => new Date().toLocaleTimeString("zh-CN", { hour12: false }));
  const manualReconnect = useCallback(() => {
    // ghost 模式恒在线:无真实 WebSocket 需要重连
  }, []);
  // 原类型含 12 个监控字段(QPS/时延趋势等),抽取版不触达;
  // 以最小合法形状断言填充,消费方(Layout/AIDiagnostics/TopBar)按需取用
  return {
    connectionState: "connected",
    reconnectCount: 0,
    lastSyncTime: lastSyncTime as unknown as Date,
    manualReconnect,
  } as unknown as WebSocketDataState;
}
