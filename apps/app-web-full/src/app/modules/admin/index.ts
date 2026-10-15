/**
 * file: index.ts
 * description: Admin 管理模块 Barrel —— M4-4 后首批 9 件转 @yyc3/admin re-export；暂缓 9 件保持端内导出
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * updated: 2026-10-10
 * status: active
 * tags: [admin],[module]
 *
 * brief: Admin 模块 Barrel 导出（包化衔接版）
 */

// —— 已入包 @yyc3/admin（M4-4 首批，re-export 衔接）——
export { OperationAudit } from '@yyc3/admin';
export { UserManagement } from '@yyc3/admin';
export { SecurityMonitor } from '@yyc3/admin';
export { PWAStatusPanel } from '@yyc3/admin';
export { PWAInstallPrompt } from '@yyc3/admin';
// InlineEditableTable 已迁至 @yyc3/ops（断 admin↔ops 循环依赖），本桥保持出口不变
export { InlineEditableTable } from '@yyc3/ops';
export { PerformanceMonitor } from '@yyc3/admin';
export { EnvConfigEditor } from '@yyc3/admin';
export { VariableCenter } from '@yyc3/admin';

// —— 暂缓留端（storage/config/page/network 障碍，见 phase4-ledger/05）——
export { SystemSettings } from './SystemSettings';
export { UnifiedSettingsPanel } from './UnifiedSettingsPanel';
export { DataEditorPanel } from '@yyc3/admin/data-editor-panel';
export { StorageManager } from '@yyc3/admin/storage-manager';
export { StorageConfigPanel } from '@yyc3/admin/storage-config-panel';
export { StorageSyncStatus } from '@yyc3/admin/storage-sync-status';
export { ConfigCenter } from './ConfigCenter';
export { PageConfigEditor } from './PageConfigEditor';
export { NetworkConfig } from '@yyc3/admin/network-config';
