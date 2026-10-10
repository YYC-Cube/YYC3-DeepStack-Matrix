/**
 * file: index.ts
 * description: OPS 运维模块（暂缓件）— 跨域障碍件端侧保留（详见 phase4-ledger/04 方案 D7）
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-07-25
 * updated: 2026-10-10
 * status: active
 * tags: [ops],[module]
 *
 * brief: OPS 模块 Barrel 导出（M4-2/3 第二批后仅暂缓件；首批 9 组件 + 6 hooks 已迁 @yyc3/ops）
 *
 * exports: OperationCenter, DatabaseManager, HostFileManager, ConfigExportCenter, etc.
 */

// 文件管理（暂缓: CodeEditor 跨域障碍 → M4-7 ide/ui 扩容后随批）
export { HostFileManager } from './HostFileManager';
export { LocalFileManager } from './LocalFileManager';

// 数据库（暂缓: CodeEditor + InlineEditableTable + src/database 引擎障碍 → M4-4/M4-7 随批）
export { DatabaseConnectionPanel } from './DatabaseConnectionPanel';
export { DatabaseManager } from './DatabaseManager';

// 服务连接测试（1272L 大件，M4-5 复核依赖障碍已解除——view-context 桥切包引即净；随下批 ops 域清空）
export { ServiceConnectionTest } from './ServiceConnectionTest';

// 报告导出（暂缓: useSettingsStore + full-backup 跨域障碍 → M4-4 admin 后随批）
export { ConfigExportCenter } from './ConfigExportCenter';

// 监控（暂缓: src/database 引擎层障碍 → 引擎层包化专项）
export { ConnectionMonitorPanel } from './ConnectionMonitorPanel';
