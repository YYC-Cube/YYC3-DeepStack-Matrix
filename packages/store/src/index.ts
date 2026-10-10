/**
 * @file: index.ts
 * @description: @yyc3/store · Zustand Slices 统一入口（源: 三端 store/slices 16 件 L0 上收）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [store],[zustand],[barrel]
 *
 * @brief: 16 件共有 Slices 单源 re-export（ide-settings-slice 留端侧随 M4-7 ide 域；family-* 13 件随 M4-6 ai-family 域）
 *
 * @details:
 * - 每 Slice 为独立 create() 模块级单例（M4-3 勘察：无单根，barrel 零消费）
 * - 宿主端 store/index.ts 组合本包 re-export + 端侧专属 Slice
 */

// ── 核心 Slices ──
export { useNodeSlice } from './node-slice';
export { useMetricsSlice } from './metrics-slice';
export type { ModelPerfEntry, ModelDistEntry, RadarEntry } from './metrics-slice';
export { useAppSlice } from './app-slice';
export { useLogSlice } from './log-slice';
export { useDbConnSlice } from './db-conn-slice';
export type { PoolConfig } from './db-conn-slice';
export { useUserMgmtSlice } from './user-mgmt-slice';
export { useNetworkSlice } from './network-slice';
export { useFollowUpSlice } from './follow-up-slice';
export { useModelSlice } from './model-slice';
export { useProviderSlice } from './provider-slice';
export { useAISuggestionSlice } from './ai-suggestion-slice';
export { useOfflineSlice } from './offline-slice';
export { useFSSlice } from './fs-slice';
export { useSDKSessionSlice } from './sdk-session-slice';
export { useSettingsSSOT } from './settings-ssot-slice';
export type { SettingsSSOTSlice, SettingsToggles, SettingsValues, RuntimeConfig } from './settings-ssot-slice';
export { useUIPrefsSlice } from './ui-prefs-slice';
export type { AlertThresholds } from './ui-prefs-slice';
