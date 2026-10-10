/**
 * @file: index.ts
 * @description: YYC³ Unified Store · Zustand 根 Store + 全部 Slices 统一入口
 * @author: YanYuCloudCube Team
 * @version: v1.1.0
 * @created: 2026-04-15
 * @updated: 2026-10-10
 * @status: active
 * @tags: [store],[root]
 *
 * @brief: 全应用唯一状态入口，组合 @yyc3/store 16 件 + 端侧专属 Slice
 *
 * @details:
 * - 16 件共有 Slices 已上收 @yyc3/store（M4-3），此处 re-export 保持符号不变
 * - ide-settings-slice 留端侧（依赖 ide-types，随 M4-7 @yyc3/ide）
 * - family-* 13 件留端侧 slices/（随 M4-6 @yyc3/ai-family 上收）
 */

// ── @yyc3/store 16 件（M4-3 上收）──
export {
  useNodeSlice,
  useMetricsSlice,
  useAppSlice,
  useLogSlice,
  useDbConnSlice,
  useUserMgmtSlice,
  useNetworkSlice,
  useFollowUpSlice,
  useModelSlice,
  useProviderSlice,
  useAISuggestionSlice,
  useOfflineSlice,
  useFSSlice,
  useSDKSessionSlice,
  useSettingsSSOT,
  useUIPrefsSlice,
} from '@yyc3/store';
export type {
  PoolConfig,
  AlertThresholds,
  SettingsSSOTSlice,
  SettingsToggles,
  SettingsValues,
  RuntimeConfig,
  ModelPerfEntry,
  ModelDistEntry,
  RadarEntry,
} from '@yyc3/store';

// ── 端侧专属：IDE 设置（依赖 ide-types，随 M4-7 @yyc3/ide 上收）──
export { useIDESettingsSlice } from './slices/ide-settings-slice';

// ── family 域（随 M4-6 @yyc3/ai-family 上收）──
export { useFamilyMemberSlice } from '@yyc3/ai-family/store/family-member-slice';
export { useFamilyMessageSlice } from '@yyc3/ai-family/store/family-message-slice';
export { useFamilySettingsSlice } from '@yyc3/ai-family/store/family-settings-slice';
export type { VoiceProfile, VoiceConversation, FamilyMessage, FamilyUIConfig, MemberModelAssignment, CreatedWork } from '@yyc3/ai-family/store/family-settings-slice';

// ── 共享类型 ──
export type { NodeData } from '../types';

import { useNodeSlice } from '@yyc3/store';
import { useMetricsSlice } from '@yyc3/store';
import { useAppSlice } from '@yyc3/store';
import { useFamilyMemberSlice } from '@yyc3/ai-family/store/family-member-slice';
import { useFamilyMessageSlice } from '@yyc3/ai-family/store/family-message-slice';

/**
 * 组合 Hook — 一次性获取多个 Slice 状态（按需使用）
 *
 * 用法：
 * const { nodes, derived, modelPerf, alerts } = useUnifiedStore();
 */
export function useUnifiedStore() {
  const nodeState = useNodeSlice();
  const metricsState = useMetricsSlice();
  const appState = useAppSlice();
  const familyState = useFamilyMemberSlice();
  const messageState = useFamilyMessageSlice();

  return {
    ...nodeState,
    ...metricsState,
    ...appState,
    members: familyState.members,
    messages: messageState.messages,
  };
}
