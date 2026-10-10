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

// ── 国际化（源: i18n-types.ts，随 i18n 上收 @yyc3/core/i18n）──
export type Locale = "zh-CN" | "en-US";

export interface LocaleInfo {
  code: Locale;
  label: string;
  nativeLabel: string;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locales: LocaleInfo[];
}

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

// ── Store 域类型（源: apps 下各端 src/app/types/ 7 个分件，随 M4-3 store 上收按需复制）──
// 重复定义待「types 单源收敛」阶段清理（phase4-ledger/01 决策 D5）

// dashboard-types.ts
/** 模型性能评估条目 */
export interface ModelPerfEntry {
  id: string;
  model: string;
  accuracy: number;
  speed: number;
  memory: number;
  cost: number;
}

/** 模型分布条目 */
export interface ModelDistEntry {
  id: string;
  name: string;
  value: number;
}

/** 雷达图数据条目 */
export interface RadarEntry {
  id: string;
  metric: string;
  A: number;
  B: number;
}

/** 持久化日志条目 */
export interface StoredLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
}

/** 已部署模型条目 */
export interface DeployedModel {
  id: string;
  name: string;
  version: string;
  size: string;
  status: "deployed" | "deploying" | "standby" | "error";
  gpu: string;
}

/** WiFi 网络条目 */
export interface WifiNetwork {
  id: string;
  ssid: string;
  signal: number;
  security: string;
  connected: boolean;
  password?: string;
  lastConnectedAt?: number;
}

/** 用户管理记录 */
export interface UserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: "online" | "offline";
  lastLogin: string;
  sessions: number;
  apiCalls: number;
  locked: boolean;
}

/** WiFi 自动重连设置 */
export interface WifiAutoReconnectSettings {
  id: string;
  enabled: boolean;
  preferStrongestSignal: boolean;
  intervalSeconds: number;
  maxRetries: number;
  preferredSsid: string;
  lastUpdatedAt: number;
}

/** 跟进任务记录 */
export interface FollowUpRecord {
  id: string;
  taskId: string;
  taskName: string;
  assignee: string;
  assigneeName: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueDate: number;
  completedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  category: "maintenance" | "optimization" | "security" | "feature" | "bugfix";
}

// filesystem-types.ts
/** 文件类型 */
export type FileItemType = "file" | "directory";

/** 文件条目 */
export interface FileItem {
  id: string;
  name: string;
  type: FileItemType;
  size?: number;
  modifiedAt: number;
  path: string;
  extension?: string;
  children?: FileItem[];
}

/** 日志级别 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/** 最近访问文件 */
export interface RecentFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  accessedAt: number;
}

// ai-analysis-types.ts
/** 异常模式类型 */
export type AnomalyPatternType =
  | "latency_spike"
  | "memory_pressure"
  | "gpu_overheat"
  | "throughput_drop"
  | "error_burst"
  | "storage_near_full";

/** 异常模式严重级别 */
export type PatternSeverity = "low" | "medium" | "high" | "critical";

/** 检测到的异常模式 */
export interface DetectedPattern {
  id: string;
  type: AnomalyPatternType;
  severity: PatternSeverity;
  title: string;
  description: string;
  source: string;
  metric: string;
  detectedAt: number;
  occurrences: number;
  trend: "rising" | "stable" | "declining";
}

/** AI 推荐操作 */
export interface AIRecommendation {
  id: string;
  patternId: string;
  action: string;
  description: string;
  impact: "low" | "medium" | "high";
  confidence: number;
  autoExecutable: boolean;
  applied?: boolean;
}

// sdk-types.ts（ChatMessage 源: ui-types.ts，依赖 ModelProviderId 已在上方）
/** 聊天会话 */
export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** SDK 使用统计 */
export interface SDKUsageStats {
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgLatencyMs: number;
  lastRequestAt: number | null;
  errorCount: number;
}

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: ModelProviderId;
  tokens?: { input: number; output: number };
}

// websocket-types.ts（AlertLevel = BaseSeverity 别名，BaseSeverity 已在上方）
/** 告警严重级别 — RF-005: BaseSeverity 别名 */
export type AlertLevel = BaseSeverity;

/** 告警通知数据 */
export interface AlertData {
  id: string;
  level: AlertLevel;
  message: string;
  source: string;
  timestamp: number;
}

// database-types.ts
/** 数据库类型 */
export type DatabaseType = "postgresql" | "mysql" | "sqlite" | "redis" | "mongodb" | "custom";

/** 数据库连接状态 */
export type DBConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "testing" | "reconnecting";

/** 数据库连接配置 */
export interface DBConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  /** 加密存储, 前端仅做 mask 展示 */
  password: string;
  status: DBConnectionStatus;
  lastConnected?: number | null;
  lastTestAt?: number;
  createdAt?: number;
  color?: string;
  options?: string;
}

// model-provider-types.ts
/** Ollama 本地模型条目（/api/tags） */
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/** Ollama /api/tags 响应 */
export interface OllamaTagsResponse {
  models: OllamaModel[];
}

// diagnostic-types.ts（M4-2/3: 自 @yyc3/ai 域上收，自包含零撞名）
/** 诊断状态 */
export type DiagnosticStatus = "idle" | "analyzing" | "complete" | "error";

/** 模式类型 */
export type PatternType = "recurring" | "gradual" | "spike" | "correlation" | "seasonal";

/** 置信度等级 */
export type ConfidenceLevel = "high" | "medium" | "low";

/** 操作优先级 */
export type ActionPriority = "urgent" | "recommended" | "optional";

/** 诊断检测模式 */
export interface DiagnosticPattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  confidence: ConfidenceLevel;
  affectedNodes: string[];
  detectedAt: number;
  dataPoints: number[];
  metric: string;
  /** RF-005: 使用 BaseSeverity 子集 */
  severity: "critical" | "warning" | "error" | "info";
}

/** 异常记录 */
export interface AnomalyRecord {
  id: string;
  timestamp: number;
  nodeId: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  rootCause: string;
  relatedPatternId?: string;
}

/** AI 建议操作 */
export interface SuggestedAction {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  estimatedImpact: string;
  confidence: ConfidenceLevel;
  steps: string[];
  autoExecutable: boolean;
  relatedPatternId: string;
}

/** 预测性预报 */
export interface PredictiveForecast {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  trend: "up" | "down" | "stable";
  riskLevel: "safe" | "warning" | "danger";
  explanation: string;
}

/** 诊断会话 */
export interface DiagnosticSession {
  id: string;
  startedAt: number;
  completedAt: number | null;
  status: DiagnosticStatus;
  patterns: DiagnosticPattern[];
  anomalies: AnomalyRecord[];
  actions: SuggestedAction[];
  forecasts: PredictiveForecast[];
  summary: string;
}

/** WebSocket 节点快照 (诊断用) */
export interface WsNodeSnapshot {
  id: string;
  gpu: number;
  mem: number;
  temp: number;
  status: string;
}

/** 诊断选项 */
export interface DiagnosticsOptions {
  liveNodes?: WsNodeSnapshot[];
  liveQPS?: number;
  liveLatency?: number;
}

/** 诊断历史条目 */
export interface DiagnosticHistoryEntry {
  id: string;
  time: number;
  patterns: number;
  actions: number;
}

/** 诊断视图类型 */
export type DiagnosticView = "patterns" | "anomalies" | "actions" | "forecasts";

// websocket-types.ts（M4-2/3: AlertLevel/AlertData/NodeData 已在上方定义，此处仅增量 5 类型）
/** WebSocket 连接状态 */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "simulated";

/** 吞吐量历史数据点 */
export interface ThroughputPoint {
  time: string;
  qps: number;
  latency: number;
  tokens: number;
}

/** 系统总览指标 */
export interface SystemStats {
  activeNodes: string;
  gpuUtil: string;
  tokenThroughput: string;
  storageUsed: string;
}

/** WebSocket 消息类型联合 */
export type WSMessage =
  | { type: "qps_update"; payload: { qps: number; trend: string } }
  | { type: "latency_update"; payload: { latency: number; trend: string } }
  | { type: "node_status"; payload: NodeData[] }
  | { type: "alert"; payload: AlertData }
  | { type: "throughput_history"; payload: ThroughputPoint[] }
  | { type: "system_stats"; payload: SystemStats }
  | { type: "heartbeat_ack" };

/** useWebSocketData Hook 返回的完整数据状态 */
export interface WebSocketDataState {
  connectionState: ConnectionState;
  isSimulated: boolean;
  reconnectCount: number;
  lastSyncTime: string;
  liveQPS: number;
  qpsTrend: string;
  liveLatency: number;
  latencyTrend: string;
  activeNodes: string;
  gpuUtil: string;
  tokenThroughput: string;
  storageUsed: string;
  nodes: NodeData[];
  throughputHistory: ThroughputPoint[];
  alerts: AlertData[];
  manualReconnect: () => void;
  clearAlerts: () => void;
}

// layout-types.ts（M4-2/3: 全 3 类型上收）
/** 响应式断点 */
export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

/** 视口状态 */
export interface ViewState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  isTouch: boolean;
}

/** ErrorBoundary 级别 */
export type ErrorBoundaryLevel = "page" | "module" | "widget";
