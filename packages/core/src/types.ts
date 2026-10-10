/**
 * @file: types.ts
 * @description: @yyc3/core 按需类型声明 — 供包内 lib 件消费的最小类型面（结构化兼容自 app types/ 分件）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [core],[types]
 *
 * @note: 源件为 apps 下各端 src/app/types/ 的 8 个分件
 *        （node,storage,auth,error,common,model-provider,network,model-agent -types.ts，Phase 2 勘察实证三端同构）。
 *        app 端 types/ 仍为全量真源；本文件 Phase 4 随 types 体系单源收敛。
 */

// ── 通用（源: common-types.ts）──
export type BaseSeverity = "info" | "warning" | "error" | "critical";

// ── 节点与集群（源: node-types.ts）──
export type NodeStatusType = "active" | "warning" | "inactive";

/** 实时节点数据（WebSocket 推送 / 前端展示） */
export interface NodeData {
  id: string;
  status: NodeStatusType;
  gpu: number;       // GPU 利用率 0-100
  mem: number;       // 内存利用率 0-100
  temp: number;      // 温度 °C
  model: string;     // 当前部署模型
  tasks: number;     // 活跃任务数
}

/** 数据库节点状态（PostgreSQL Schema: infra.nodes） */
export interface NodeStatusRecord {
  id: string;
  hostname: string;
  gpu_util: number;
  mem_util: number;
  temp_celsius: number;
  model_deployed: string;
  active_tasks: number;
  status: NodeStatusType;
}

// ── 存储（源: storage.ts）──
/** IndexedDB store 名称（RF-004: 新增 store 需同步 yyc3-storage.ts ALL_STORES） */
export type StoreName =
  | "alertRules"
  | "alertEvents"
  | "patrolHistory"
  | "loopHistory"
  | "operationTemplates"
  | "operationLogs"
  | "diagnosisHistory"
  | "reports"
  | "errorLog"
  | "dashboardSnapshots"
  | "fileVersions"
  | "dbConnections"
  | "queryHistory"
  | "committedChanges"
  | "agent_memories"
  | "agent_tasks"
  | "mcp_contexts"
  | "inference_cache"
  | "family_messages"
  | "family_activities"
  | "family_memories"
  | "family_broadcasts"
  | "music_library"
  | "comm_stations";

/** 存储变更事件 (BroadcastChannel) */
export interface StorageChangeEvent {
  store: StoreName;
  action: string;
  key: string;
  timestamp: number;
}

// ── 认证（源: auth-types.ts）──
export type UserRole = "admin" | "developer";

/** 认证用户 */
export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/** 认证会话 */
export interface AppSession {
  user: AppUser;
  token: string;
  expiresAt: number;
}

// ── 错误处理（源: error-types.ts）──
export type ErrorCategory =
  | "NETWORK"
  | "PARSE"
  | "AUTH"
  | "RUNTIME"
  | "VALIDATION"
  | "STORAGE"
  | "UNKNOWN";

/** 错误严重级别 — RF-005: BaseSeverity 别名 */
export type ErrorSeverity = BaseSeverity;

/** 应用级错误 */
export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  detail?: string;
  source?: string;
  stack?: string;
  timestamp: number;
  resolved: boolean;
  userAction?: string;
}

/** 错误统计 */
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  unresolvedCount: number;
  lastErrorTime: number | null;
}

// ── 模型提供商（源: model-provider-types.ts）──
/** 服务商标识 — string 以支持自定义服务商 */
export type ModelProviderId = string;

/** 服务商定义 */
export interface ModelProviderDef {
  id: ModelProviderId;
  label: string;
  baseUrl: string;
  authType: "bearer" | "api-key" | "none";
  models: string[];
  requiresApiKey: boolean;
  isLocal: boolean;
  isBuiltin?: boolean;
  isCustom?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/** 已配置的模型实例 */
export interface ConfiguredModel {
  id: string;
  providerId: ModelProviderId;
  providerLabel: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  proxyUrl?: string;
  createdAt: number;
  lastUsed: number | null;
  status: "active" | "error" | "unchecked";
  lastTestResult?: {
    steps: Array<{ label: string; status: string; detail: string; latencyMs?: number }>;
    suggestion?: string;
    totalLatencyMs: number;
    testedAt: number;
  };
}

// ── 网络（源: network-types.ts）──
/** 后端 API 端点配置 */
export interface APIEndpoints {
  /** 文件系统 API 基地址 */
  fsBase: string;
  /** 数据库管理 API 基地址 */
  dbBase: string;
  /** WebSocket 地址 */
  wsEndpoint: string;
  /** AI 推理 API 基地址 */
  aiBase: string;
  /** 集群管理 API 基地址 */
  clusterBase: string;
  /** 是否启用后端 API (false = 纯前端 Mock) */
  enableBackend: boolean;
  /** API 请求超时 (ms) */
  timeout: number;
  /** 最大重试次数 (指数退避, 0 = 不重试) */
  maxRetries: number;
}

// ── 模型与 Agent（源: model-agent-types.ts）──
export type ModelTier = "primary" | "secondary" | "standby";

/** 模型配置（DB Schema: core.models） */
export interface Model {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  avg_latency_ms: number;
  throughput: number;
  created_at: string;
}

/** Agent 配置（DB Schema: core.agents） */
export interface Agent {
  id: string;
  name: string;
  name_cn: string;
  role: string;
  description: string;
  is_active: boolean;
}

export type InferenceStatus = "success" | "error" | "timeout";

/** 推理日志（DB Schema: telemetry.inference_logs） */
export interface InferenceLog {
  id: string;
  model_id: string;
  agent_id: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  status: InferenceStatus;
  created_at: string;
}

/** 模型性能统计（聚合查询结果） */
export interface ModelStats {
  avgLatency: number;
  totalRequests: number;
  totalTokens: number;
  successRate: number;
}
