/**
 * @file: index.ts
 * @description: @yyc3/monitor barrel — M4-4 首批 20 组件 + 3 hooks（暂缓 1 件 AISuggestionPanel 见 phase4-ledger/05）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-10-10
 * @status: active
 * @tags: [monitor],[barrel]
 */

// 组件（首批入包 20 件）
export { ActionRecommender } from "./ActionRecommender";
export { AlertBanner } from "./AlertBanner";
export { AlertRulesPanel } from "./AlertRulesPanel";
export { CreateRuleModal } from "./CreateRuleModal";
export { Dashboard } from "./Dashboard";
export { DataMonitoring } from "./DataMonitoring";
export { FollowUpCard } from "./FollowUpCard";
export { FollowUpDrawer } from "./FollowUpDrawer";
export { FollowUpEditDialog } from "./FollowUpEditDialog";
export { FollowUpManager } from "./FollowUpManager";
export { FollowUpPanel } from "./FollowUpPanel";
export { NodeDetailModal } from "./NodeDetailModal";
export { PatrolDashboard } from "./PatrolDashboard";
export { PatrolHistory } from "./PatrolHistory";
export { PatrolReport } from "./PatrolReport";
export { PatrolScheduler } from "./PatrolScheduler";
export { PatternAnalyzer } from "./PatternAnalyzer";
export { QuickActionGroup } from "./QuickActionGroup";
export { SDKChatPanel } from "./SDKChatPanel";
export { UnifiedModelSelector } from "./UnifiedModelSelector";

// 域内 hooks（随包 3 件）
export { usePatrol } from "./hooks/usePatrol";
export { useAlertRules } from "./hooks/useAlertRules";
export { useAISuggestion } from "./hooks/useAISuggestion";
