/**
 * file: index.ts
 * description: OPS 模块（仅剩引擎层障碍件）— P5 ops 二包后端侧保留（详见 phase5-ledger/01 方案 W4）
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-07-25
 * updated: 2026-10-10
 * status: active
 * tags: [ops],[module]
 *
 * brief: P5 后 @yyc3/ops 已收 19 组件 + 6 hooks + full-backup；本 barrel 仅剩 src/database 引擎层障碍件
 */

// 监控（暂缓: src/database 引擎层障碍 → 引擎层包化专项）
export { ConnectionMonitorPanel } from './ConnectionMonitorPanel';
