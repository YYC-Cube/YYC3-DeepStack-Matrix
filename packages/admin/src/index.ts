/**
 * @file: index.ts
 * @description: @yyc3/admin barrel — M4-4 首批 10 组件 + 4 hooks（暂缓 9 件见 DEV-GUIDE 与 phase4-ledger/05）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-10-10
 * @status: active
 * @tags: [admin],[barrel]
 */

// 组件（首批入包 10 件）
export { ModelTable, NodeTable, AgentTable } from "./DataEditorTables";
export { EnvConfigEditor } from "./EnvConfigEditor";
export { InlineEditableTable } from "./InlineEditableTable";
export { OperationAudit } from "./OperationAudit";
export { PerformanceMonitor } from "./PerformanceMonitor";
export { PWAInstallPrompt } from "./PWAInstallPrompt";
export { PWAStatusPanel } from "./PWAStatusPanel";
export { SecurityMonitor } from "./SecurityMonitor";
export { UserManagement } from "./UserManagement";
export { VariableCenter } from "./VariableCenter";

// 域内 hooks（随包 4 件）
export { useSecurityMonitor } from "./hooks/useSecurityMonitor";
export { usePWAManager } from "./hooks/usePWAManager";
export { useInstallPrompt } from "./hooks/useInstallPrompt";
export { useValidation } from "./hooks/useValidation";
