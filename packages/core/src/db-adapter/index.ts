/**
 * @file: index.ts
 * @description: DB Adapter 注册表 — mock / supabase / electron-ipc 三后端统一注册与环境自动选择（主文档 Phase 3 动作 2）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [core],[db-adapter],[registry]
 *
 * 用法:
 *   registerBackend("mock", () => createMockAdapter());
 *   const db = createBackend<MyDB>(); // 按环境自动选择
 */
export type BackendKind = "mock" | "supabase" | "electron-ipc";

export type BackendFactory<T = unknown> = () => T;

const registry = new Map<BackendKind, BackendFactory>();

/** 注册后端工厂（同名覆盖，app 端可重置默认实现） */
export function registerBackend<T>(kind: BackendKind, factory: BackendFactory<T>): void {
  registry.set(kind, factory);
}

/** 已注册后端清单（诊断用） */
export function getRegisteredBackends(): BackendKind[] {
  return [...registry.keys()];
}

/** 环境自动选择：electronAPI 存在 → electron-ipc；VITE_YYC3_ENABLE_MOCK → mock；默认 supabase */
export function detectBackend(): BackendKind {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).electronAPI) {
    return "electron-ipc";
  }
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  if (env.VITE_YYC3_ENABLE_MOCK === "true" || env.VITE_YYC3_ENABLE_MOCK === "1") {
    return "mock";
  }
  return "supabase";
}

/** 按指定种类（缺省自动检测）实例化后端 */
export function createBackend<T>(kind?: BackendKind): T {
  const k = kind ?? detectBackend();
  const factory = registry.get(k);
  if (!factory) {
    throw new Error(`[db-adapter] 未注册后端: ${k}（已注册: ${getRegisteredBackends().join(", ") || "无"}）`);
  }
  return factory() as T;
}
