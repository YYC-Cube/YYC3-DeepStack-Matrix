/**
 * file: index.ts
 * description: Monitor 模块 barrel —— M4-4 后首批 21 件转 @yyc3/monitor re-export；暂缓 1 件（AISuggestionPanel）保持端内导出
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * updated: 2026-10-10
 * status: active
 * tags: [module],[monitor],[barrel]
 */

// —— 已入包 @yyc3/monitor（M4-4 首批，re-export 衔接）——

// 仪表盘
export { DataMonitoring } from '@yyc3/monitor';
export { Dashboard } from '@yyc3/monitor';

// 跟进管理
export { FollowUpPanel } from '@yyc3/monitor';
export { FollowUpManager } from '@yyc3/monitor';
export { FollowUpCard } from '@yyc3/monitor';
export { FollowUpDrawer } from '@yyc3/monitor';
export { FollowUpEditDialog } from '@yyc3/monitor';

// 巡查
export { PatrolDashboard } from '@yyc3/monitor';
export { PatrolReport } from '@yyc3/monitor';
export { PatrolScheduler } from '@yyc3/monitor';
export { PatrolHistory } from '@yyc3/monitor';

// 告警
export { AlertBanner } from '@yyc3/monitor';
export { AlertRulesPanel } from '@yyc3/monitor';
export { CreateRuleModal } from '@yyc3/monitor';

// AI 建议
export { ActionRecommender } from '@yyc3/monitor';
export { PatternAnalyzer } from '@yyc3/monitor';
export { SDKChatPanel } from '@yyc3/monitor';

// 快捷操作
export { QuickActionGroup } from '@yyc3/monitor';

// 通用组件
export { NodeDetailModal } from '@yyc3/monitor';
export { UnifiedModelSelector } from '@yyc3/monitor';

// —— 暂缓留端 ——
export { AISuggestionPanel } from './AISuggestionPanel';
