/**
 * @file: index.ts
 * @description: @yyc3/core barrel — 数据/横切能力单源统一出口（Phase 3）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [core],[barrel]
 */
export * from "./types";
export * from "./db-adapter/index";
// ── 冲突件命名空间隔离（子路径直引不受影响，barrel 平铺面仅消歧）──
// crdt.MergeStrategy("lww"…) 与 data-bus.MergeStrategy("ws_priority"…) 语义不同，不可仲裁
export * as crdt from "./crdt";
export * as dataBus from "./data-bus";
export * from "./yyc3-storage";
export * from "./create-local-store";
export * from "./broadcast-channel";
export * from "./cross-tab-sync";
export * from "./db-queries";
// supabaseClient(纯 mock) 与 supabaseClientReal(运行时切换) 为双实现并存，barrel 不二选一
export * as supabaseClient from "./supabaseClient";
export * as supabaseClientReal from "./supabaseClientReal";
export * from "./error-handler";
export * from "./figma-error-filter";
export * from "./env-config";
export * from "./validators";
export * from "./config-validator";
export * from "./ollama-url";
export * from "./GitService";
export * from "./migrate-storage";
export * from "./music-storage";
export * from "./api-config";
export * from "./dmusic-resources";
