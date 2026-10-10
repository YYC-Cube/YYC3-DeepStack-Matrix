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

// ============================================================
// ops 域类型段（M4-2/3 第二批: @yyc3/ops 包化，自 app/types/ 六文件上收）
// 来源: operation-types / service-loop-types / database-types(类型段) /
//       report-export-types / filesystem-types / host-fs-types
// 注: DatabaseType/DBConnection/DBConnectionStatus/FileItem/FileItemType/
//     LogLevel/RecentFile core 已有同定义（复用不重复）；数据库桥接函数
//     toConnectionInfo/toDBConnection 留端侧（仅暂缓件 DatabaseManager 消费）
// ============================================================

// operation-types.ts
/** 操作分类 */
export type OperationCategoryType =
  | "node"
  | "model"
  | "task"
  | "system"
  | "custom";

/** 操作分类元信息 */
export interface OperationCategoryMeta {
  key: OperationCategoryType;
  label: string;
  icon: string;
  color: string;
}

/** 操作状态 */
export type OperationStatus = "pending" | "running" | "success" | "failed" | "cancelled";

/** 操作项 */
export interface OperationItem {
  id: string;
  category: OperationCategoryType;
  label: string;
  description: string;
  icon: string;
  status: OperationStatus;
  dangerous?: boolean;
}

/** 操作模板 */
export interface OperationTemplateItem {
  id: string;
  name: string;
  description: string;
  category: OperationCategoryType;
  steps: string[];
  createdAt: number;
  lastUsed?: number;
}

/** 操作日志条目 */
export interface OperationLogEntry {
  id: string;
  timestamp: number;
  category: OperationCategoryType;
  action: string;
  user: string;
  status: OperationStatus;
  detail?: string;
  duration?: number;
}

/** 操作日志筛选 */
export type LogFilterType = "all" | "byCategory" | "byUser" | "search";

// service-loop-types.ts
/** 闭环阶段 */
export type LoopStage =
  | "monitor"
  | "analyze"
  | "decide"
  | "execute"
  | "verify"
  | "optimize";

/** 阶段运行状态 */
export type StageStatus = "idle" | "running" | "completed" | "error" | "skipped";

/** 单阶段结果 */
export interface StageResult {
  stage: LoopStage;
  status: StageStatus;
  startedAt: number | null;
  completedAt: number | null;
  duration: number | null;
  summary: string;
  details: string[];
  metrics?: Record<string, number>;
}

/** 闭环运行记录 */
export interface LoopRun {
  id: string;
  startedAt: number;
  completedAt: number | null;
  trigger: "manual" | "auto" | "alert";
  currentStage: LoopStage;
  stages: StageResult[];
  overallStatus: StageStatus;
}

/** 数据流节点类型 */
export type DataFlowNodeType = "device" | "storage" | "dashboard" | "terminal";

/** 数据流连线 */
export interface DataFlowEdge {
  from: DataFlowNodeType;
  to: DataFlowNodeType;
  label: string;
  bandwidth: string;
  active: boolean;
}

/** 闭环阶段元信息 */
export interface StageMeta {
  key: LoopStage;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/** 数据流可视化节点 */
export interface DataFlowNode {
  type: DataFlowNodeType;
  label: string;
  sublabel: string;
  color: string;
}

// followup-types.ts（ChainEvent 段; FollowUpItem/QuickAction 等非 ops 消费不上收）
/** 操作链路条目类型 */
export type ChainEventType =
  | "model_load"
  | "task_start"
  | "alert_trigger"
  | "auto_action"
  | "manual_action"
  | "resolved"
  | "system_event";

/** 操作链路单条事件 */
export interface ChainEvent {
  id: string;
  time: string;           // HH:mm:ss
  type: ChainEventType;
  label: string;
  detail: string;
  isCurrent?: boolean;
}

// database-types.ts（类型段; 桥接函数留端侧）
/** 数据库列定义 */
export interface DBColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
}

/** 数据库表信息 */
export interface DBTable {
  name: string;
  schema: string;
  rowCount: number;
  sizeBytes: number;
  columns: DBColumn[];
}

/** SQL 查询结果 */
export interface QueryResult {
  id: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  executedAt: number;
  error?: string;
}

/** 数据库备份记录 */
export interface DBBackup {
  id: string;
  connectionId: string;
  connectionName: string;
  type: DatabaseType;
  fileName: string;
  sizeBytes: number;
  createdAt: number;
  status: "completed" | "failed" | "in_progress";
}

/** SQL 快速模板 */
export interface SQLTemplate {
  id: string;
  label: string;
  sql: string;
  dbType: DatabaseType | "all";
  category: string;
}

// report-export-types.ts
/** 导出报告类型 */
export type ExportReportType = "performance" | "security" | "audit" | "comprehensive";

/** 导出格式 */
export type ExportFormat = "json" | "csv" | "print";

/** 时间范围 */
export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

/** 报表指标 */
export interface ReportMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  change: string;
}

/** 性能快照 */
export interface PerformanceSnapshot {
  timestamp: number;
  cpuUsage: number;
  gpuUsage: number;
  memoryUsage: number;
  latencyP50: number;
  latencyP99: number;
  throughput: number;
  errorRate: number;
}

/** 安全快照 */
export interface SecuritySnapshot {
  timestamp: number;
  cspScore: number;
  cookieScore: number;
  sensitiveScore: number;
  overallScore: number;
  activeThreats: number;
}

/** 导出报告数据 */
export interface ReportData {
  id: string;
  type: ExportReportType;
  title: string;
  generatedAt: number;
  timeRange: { start: number; end: number; label: string };
  summary: ReportMetric[];
  performanceHistory: PerformanceSnapshot[];
  securityHistory: SecuritySnapshot[];
  recommendations: string[];
  nodeBreakdown: { nodeId: string; avgCpu: number; avgGpu: number; avgLatency: number; errorRate: number }[];
}

/** 报告历史条目 (可持久化) */
export interface ReportHistoryEntry {
  id: string;
  type: ExportReportType;
  time: number;
  range: string;
}

// filesystem-types.ts
/** 日志条目 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
}

/** 报告类型 */
export type ReportType = "performance" | "health" | "security" | "custom";

/** 报告格式 */
export type ReportFormat = "json" | "markdown" | "csv";

/** 报告配置 */
export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateRange: "today" | "week" | "month" | "custom";
  includeCharts: boolean;
  includeRawData: boolean;
}

/** 报告结果 */
export interface ReportResult {
  id: string;
  config: ReportConfig;
  generatedAt: number;
  filename: string;
  size: number;
  previewContent: string;
}

// host-fs-types.ts
/** 宿主机文件条目 (真实文件系统) */
export interface HostFileEntry {
  id: string;
  name: string;
  kind: "file" | "directory";
  path: string;
  size?: number;
  lastModified?: number;
  mimeType?: string;
  /** File System Access API handle (运行时引用, 不持久化) */
  handle?: FileSystemHandle;
  children?: HostFileEntry[];
}

/** 文件版本快照 */
export interface FileVersion {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  content: string;
  size: number;
  savedAt: number;
  label?: string;
}

// ============================================================
// admin/monitor 域类型段（M4-4，自 P1 types/ 六子文件上收，撞名复用：
// BaseSeverity/ChainEvent/ChainEventType/ChangeType/ChatMessage/ChatSession/
// ConfiguredModel/ModelProviderId/SDKUsageStats/DatabaseType）
// ============================================================

// alert-rules-types.ts
/** 告警严重级别 (规则引擎) — RF-005: 补充 'error' 级别，与 BaseSeverity 对齐 */
export type AlertSeverity = "info" | "warning" | "error" | "critical";

/** 告警指标类型 */
export type AlertMetric = "cpu" | "gpu" | "memory" | "latency" | "disk" | "network" | "error_rate" | "throughput";

/** 告警比较条件 */
export type AlertCondition = "gt" | "lt" | "gte" | "lte" | "eq" | "neq";

/** 升级等级 */
export type EscalationLevel = 1 | 2 | 3;

/** 告警阈值配置 */
export interface AlertThreshold {
  metric: AlertMetric;
  condition: AlertCondition;
  value: number;
  unit: string;
  duration: number;
}

/** 升级策略 */
export interface EscalationPolicy {
  level: EscalationLevel;
  delayMinutes: number;
  notifyChannels: string[];
  autoAction?: string;
}

/** 告警规则 */
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: AlertSeverity;
  thresholds: AlertThreshold[];
  aggregation: {
    enabled: boolean;
    windowMinutes: number;
    maxGroupSize: number;
  };
  deduplication: {
    enabled: boolean;
    cooldownMinutes: number;
  };
  escalation: EscalationPolicy[];
  targets: string[];
  createdAt: number;
  lastTriggered: number | null;
  triggerCount: number;
}

/** 告警事件 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  metric: AlertMetric;
  currentValue: number;
  threshold: number;
  nodeId: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  escalationLevel: EscalationLevel;
}

/** 告警规则 Hook 选项 */
export interface AlertRulesOptions {
  liveNodes?: { id: string; gpu: number; mem: number; temp: number; status: string }[];
  liveLatency?: number;
}

// patrol-types.ts
/** 巡查运行状态 */
export type PatrolStatus = "idle" | "running" | "completed" | "failed";

/** 巡查项状态 */
export type CheckStatus = "pass" | "warning" | "critical" | "skipped";

/** 自动巡查间隔 (分钟) */
export type PatrolInterval = 5 | 10 | 15 | 30 | 60;

/** 巡查检查项 */
export interface PatrolCheckItem {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  value: string;
  threshold?: string;
  detail?: string;
}

/** 巡查结果 */
export interface PatrolResult {
  id: string;
  timestamp: number;
  duration: number;
  status: PatrolStatus;
  healthScore: number;
  totalChecks: number;
  passCount: number;
  warningCount: number;
  criticalCount: number;
  skippedCount: number;
  checks: PatrolCheckItem[];
  triggeredBy: "manual" | "auto" | "scheduled";
}

/** 巡查计划 */
export interface PatrolSchedule {
  enabled: boolean;
  interval: PatrolInterval;
  lastRun: number | null;
  nextRun: number | null;
}

// followup-types.ts（ChainEventType/ChainEvent 已有，复用）
/** 告警 / 异常严重级别 — RF-005: BaseSeverity 别名 */
export type FollowUpSeverity = BaseSeverity;

/** 告警状态 */
export type FollowUpStatus = "active" | "investigating" | "resolved" | "ignored";

/** 跟进卡片数据 */
export interface FollowUpItem {
  id: string;
  severity: FollowUpSeverity;
  title: string;
  source: string;
  metric?: string;
  status: FollowUpStatus;
  timestamp: number;
  chain: ChainEvent[];
  relatedAlerts?: string[];
  assignee?: string;
  tags?: string[];
}

// security-types.ts（全族闭合）
/** 安全监控标签页 */
export type SecurityTab = "security" | "performance" | "diagnostics" | "dataManagement";

/** 扫描状态 */
export type ScanStatus = "idle" | "scanning" | "complete";

/** 风险等级 */
export type RiskLevel = "safe" | "warning" | "danger";

/** Web Vitals 评级 */
export type VitalRating = "good" | "needs-improvement" | "poor";

/** CSP 检测结果 */
export interface CSPResult {
  enabled: boolean;
  directives: { name: string; value: string; status: "pass" | "warn" | "fail" }[];
  inlineBlocked: boolean;
  recommendations: string[];
  score: number;
}

/** Cookie 检查结果 */
export interface CookieResult {
  count: number;
  checks: { name: string; status: "pass" | "warn" | "fail"; detail: string }[];
  score: number;
}

/** 敏感数据检测结果 */
export interface SensitiveDataResult {
  localStorage: { key: string; risk: RiskLevel; detail: string }[];
  sessionStorage: { key: string; risk: RiskLevel; detail: string }[];
  consoleRisks: number;
  totalRisks: number;
  score: number;
}

/** 资源加载条目 */
export interface ResourceEntry {
  name: string;
  type: string;
  size: number;
  loadTime: number;
  cached: boolean;
}

/** 性能分析结果 */
export interface PerformanceResult {
  resources: ResourceEntry[];
  totalResources: number;
  totalSize: number;
  pageLoadTime: number;
  imgOptimizations: string[];
  jsBundles: { name: string; size: number; gzipped: number }[];
  lazyLoadSavings: number;
}

/** 内存分析结果 */
export interface MemoryResult {
  usedJSHeap: number;
  totalJSHeap: number;
  jsHeapLimit: number;
  listeners: number;
  timers: number;
  domNodes: number;
  leakRisk: RiskLevel;
  trend: number[];
}

/** Web Vitals 指标 */
export interface WebVital {
  name: string;
  value: number;
  unit: string;
  rating: VitalRating;
  target: string;
}

/** 设备信息 */
export interface DeviceInfo {
  cpuCores: number;
  memory: number | null;
  screen: string;
  pixelRatio: number;
  touchSupport: boolean;
  gpu: string;
  platform: string;
  userAgent: string;
}

/** 网络信息 */
export interface NetworkInfo {
  type: string;
  downlink: number;
  rtt: number;
  effectiveType: string;
  isStable: boolean;
  saveData: boolean;
}

/** 浏览器特性支持 */
export interface BrowserFeature {
  name: string;
  supported: boolean;
  polyfillNeeded: boolean;
}

/** 浏览器信息 */
export interface BrowserInfo {
  name: string;
  version: string;
  features: BrowserFeature[];
  upgradeNeeded: boolean;
}

/** 存储使用情况 */
export interface StorageUsage {
  localStorage: number;
  sessionStorage: number;
  indexedDB: number;
  cacheAPI: number;
  total: number;
}

/** 数据管理状态 */
export interface DataManagementState {
  storage: StorageUsage;
  lastBackup: number | null;
  syncEnabled: boolean;
  expiredItems: number;
  cacheSize: number;
}

/** 安全监控完整状态 */
export interface SecurityMonitorState {
  activeTab: SecurityTab;
  scanStatus: ScanStatus;
  lastScanTime: number | null;
  overallScore: number;
  overallRisk: RiskLevel;
  csp: CSPResult | null;
  cookie: CookieResult | null;
  sensitive: SensitiveDataResult | null;
  performance: PerformanceResult | null;
  memory: MemoryResult | null;
  vitals: WebVital[];
  device: DeviceInfo | null;
  network: NetworkInfo | null;
  browser: BrowserInfo | null;
  dataManagement: DataManagementState | null;
}

// ui-types.ts（PWA 段；ChatMessage 已有复用）
/** Service Worker 状态 */
export type SWStatus = "idle" | "installing" | "waiting" | "active" | "error" | "unsupported";

/** 缓存条目 */
export interface CacheEntry {
  name: string;
  size: number;
  count: number;
  lastUpdated: number;
}

/** PWA 状态概览 */
export interface PWAState {
  swStatus: SWStatus;
  swVersion: string;
  isOnline: boolean;
  cacheEntries: CacheEntry[];
  totalCacheSize: number;
  offlineReady: boolean;
  lastCacheUpdate: number;
}

/** PWA beforeinstallprompt 事件接口 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// sdk-types.ts（ChatMessage/ChatSession/SDKUsageStats/ModelProviderId 已有复用）
/** SDK 连接状态 */
export type SDKConnectionStatus = "idle" | "connecting" | "connected" | "error";

/** 聊天消息角色 */
export type ChatRole = "system" | "user" | "assistant";

/** SDK 能力枚举 */
export type SDKCapability =
  | "chat"
  | "chat-stream"
  | "file-upload"
  | "knowledge-base"
  | "image-gen"
  | "tts"
  | "stt"
  | "video-gen"
  | "code-gen";

/** SDK 提供商能力映射 */
export interface SDKProviderCapabilities {
  providerId: ModelProviderId;
  capabilities: SDKCapability[];
}

/** SDK Chat Completion 响应 */
export interface SDKChatResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

// database-types.ts（ChangeType 定义随迁）
/** 变更操作类型 */
export type ChangeType = "update" | "delete";

/** 可编辑单元格变更 */
export interface EditableCellChange {
  rowIndex: number;
  column: string;
  oldValue: unknown;
  newValue: string;
  type: ChangeType;
  sql?: string;
  rollbackSQL?: string;
}

/** 已提交的变更记录 (用于 Undo, IndexedDB 持久化) */
export interface CommittedChange {
  id: string;
  tableName: string;
  changes: EditableCellChange[];
  committedAt: number;
  rolledBack: boolean;
  rolledBackIndices?: number[];
}

// network-types.ts
/** 连接测试状态 */
export type TestStatus = "idle" | "testing" | "success" | "failed";

// storage.ts（DatabaseConfig 自 database/types 引擎层上收，DatabaseType 已有复用）
export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  maxRetries?: number;
}

export type StorageType = "localStorage" | "database";

export interface StorageConfig {
  type: StorageType;
  database?: DatabaseConfig;
  syncInterval: number;
  autoSync: boolean;
  offlineMode: boolean;
  conflictResolution: "local" | "remote" | "merge";
}

export interface StorageStatus {
  connected: boolean;
  syncing: boolean;
  lastSync: number | null;
  pendingChanges: number;
  error?: string;
}

export interface StorageEvent {
  type: "syncStart" | "syncComplete" | "syncError" | "offline" | "online" | "offlineOperationAdded" | "offlineQueueProcessed";
  data?: unknown;
  error?: string;
}

// ══════════════════════════════════════════════════════════
// M4-5 语义段：auth-context / background-sync / network-utils（Phase 3 漏网 5 lib 传递闭包）
// ══════════════════════════════════════════════════════════

/** 认证上下文值（authContext.ts） */
export interface AuthContextValue {
  logout: () => void;
  userEmail: string;
  userRole: UserRole | "";
  isGhost?: boolean;
}

/** 同步项类型 */
export type SyncItemType = "config_update" | "audit_log" | "user_action";

/** 同步队列项 */
export interface SyncItem {
  id: string;
  type: SyncItemType;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

/** 同步队列统计 */
export interface SyncQueueStats {
  total: number;
  pending: number;
  retrying: number;
  oldestTimestamp: number | null;
}

/** 同步处理结果 */
export interface SyncProcessResult {
  success: number;
  failed: number;
}

/** 网络接口信息 */
export interface NetworkInterface {
  name: string;
  type: string;
  ip: string;
  status: "active" | "inactive" | "unknown";
}

/** 网络配置模式 */
export type NetworkMode = "auto" | "wifi" | "manual";

/** 网络配置项 */
export interface NetworkConfig {
  serverAddress: string;
  port: string;
  nasAddress: string;
  wsUrl: string;
  mode: NetworkMode;
}

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean;
  latency: number;
  error?: string;
}

// ══════════════════════════════════════════════════════════
// M4-6 语义段：inference 推理系（inference-types.ts 三端 L0 并入）
// ══════════════════════════════════════════════════════════

/** 推理后端类型 */
export type InferenceBackendType = "ollama" | "webgpu";

/** 模型加载进度 */
export interface ModelLoadProgress {
  stage: "downloading" | "loading" | "ready" | "error";
  /** 0 ~ 1 */
  progress: number;
  message: string;
  /** 已下载字节数 */
  loadedBytes?: number;
  /** 总字节数 */
  totalBytes?: number;
}

/** 推理配置 */
export interface InferenceConfig {
  backend: InferenceBackendType;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** 流式输出回调 */
  onChunk?: (text: string) => void;
  /** 加载进度回调 */
  onProgress?: (progress: ModelLoadProgress) => void;
  /** 中止信号 */
  signal?: AbortSignal;
}

/** 推理后端状态 */
export type InferenceBackendStatus = "idle" | "loading" | "ready" | "inferencing" | "error";

/** GPU 显存信息 */
export interface GPUDeviceInfo {
  available: boolean;
  vendor: string;
  renderer: string;
  memoryMB: number;
  webgpuSupported: boolean;
}

/** 预置 WebGPU 模型配置 */
export interface WebGPUPreset {
  id: string;
  modelId: string;
  name: string;
  size: string;
  /** 所需显存 (MB) */
  minMemoryMB: number;
  description: string;
  bilingual: boolean;
}

// ══════════════════════════════════════════════════════════
// M4-7 语义段：terminal（useTerminal 依赖，三端 ui-types L0 并入）
// ══════════════════════════════════════════════════════════

/** 终端历史条目 */
export interface TerminalHistoryEntry {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  status: "success" | "error" | "info";
}

// ══════════════════════════════════════════════════════════
// P5 语义段：shell 快捷键（useKeyboardShortcuts 依赖，三端 ui-types L0 并入）
// ══════════════════════════════════════════════════════════

/** 已注册快捷键 (用于帮助面板展示) */
export interface RegisteredShortcut {
  id: string;
  keys: string;
  description: string;
  category: string;
}

/** 命令面板分类（AIAssistant/CommandPalette 消费） */
export type CommandCategory = "cluster" | "model" | "data" | "security" | "monitor";
