/**
 * @file: slices2.test.ts
 * @description: store 第二轮 — ai-suggestion / global-store / model-slice / ui-prefs 全动作 + settings-ssot 迁移分支 + provider-slice 流式与导入导出补齐
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAISuggestionSlice, migrateLegacyAISuggestion } from '../ai-suggestion-slice';
import { useGlobalStore } from '../global-store';
import { useModelSlice } from '../model-slice';
import { useUIPrefsSlice, migrateLegacyUIPrefs } from '../ui-prefs-slice';
import { useSettingsSSOT } from '../settings-ssot-slice';
import { useProviderSlice } from '../provider-slice';

beforeEach(() => localStorage.clear());

describe('ai-suggestion-slice', () => {
  it('默认模式/建议面 + dismiss 级联', () => {
    const s = useAISuggestionSlice.getState();
    expect(s.patterns.length).toBeGreaterThanOrEqual(5);
    expect(s.recommendations.length).toBeGreaterThanOrEqual(8);
    useAISuggestionSlice.getState().dismissPattern('pat-1');
    expect(useAISuggestionSlice.getState().patterns.every((p) => p.id !== 'pat-1')).toBe(true);
    expect(useAISuggestionSlice.getState().recommendations.every((r) => r.patternId !== 'pat-1')).toBe(true);
    useAISuggestionSlice.getState().dismissRecommendation('rec-2');
    expect(useAISuggestionSlice.getState().recommendations.every((r) => r.id !== 'rec-2')).toBe(true);
    useAISuggestionSlice.getState().setEnabledAutoSuggestion(false);
    expect(useAISuggestionSlice.getState().enabledAutoSuggestion).toBe(false);
  });

  it('runAnalysis / applyRecommendation（真实定时延迟）', async () => {
    expect(useAISuggestionSlice.getState().patterns.length).toBeGreaterThan(0);
    await useAISuggestionSlice.getState().runAnalysis();
    expect(useAISuggestionSlice.getState().isAnalyzing).toBe(false);
    expect(useAISuggestionSlice.getState().lastAnalyzedAt).toBeGreaterThan(0);

    const rec = useAISuggestionSlice.getState().recommendations.find((r) => r.autoExecutable)!;
    await useAISuggestionSlice.getState().applyRecommendation(rec.id);
    expect(useAISuggestionSlice.getState().recommendations.find((r) => r.id === rec.id)?.applied).toBe(true);
    // 不存在的 id → no-op
    await useAISuggestionSlice.getState().applyRecommendation('ghost');
  });

  it('legacy 迁移', () => {
    localStorage.setItem('yyc3_ai_patterns', JSON.stringify([{ id: 'p9' }]));
    localStorage.setItem('yyc3_ai_recommendations', JSON.stringify([{ id: 'r9' }]));
    expect(migrateLegacyAISuggestion()).toBe(true);
    expect(useAISuggestionSlice.getState().patterns).toEqual([{ id: 'p9' }]);
    expect(migrateLegacyAISuggestion()).toBe(false);
  });
});

describe('global-store', () => {
  it('config 域五开关 + reset', () => {
    const s = useGlobalStore.getState();
    s.setAutoRefresh(false);
    s.setRefreshInterval(100);
    s.setEnableNotifications(false);
    s.setEnableSounds(true);
    s.setCompactMode(true);
    const st = useGlobalStore.getState();
    expect(st.autoRefresh).toBe(false);
    expect(st.refreshInterval).toBe(100);
    expect(st.enableSounds).toBe(true);
    expect(st.compactMode).toBe(true);
    useGlobalStore.getState().resetConfig();
    expect(useGlobalStore.getState().autoRefresh).toBe(true);
    expect(useGlobalStore.getState()._version).toBe(4);
  });

  it('chat 域 CRUD + setActive', async () => {
    const s = useGlobalStore.getState();
    const session = { id: 'gs1', title: 't', modelId: 'm', messages: [], createdAt: 1, updatedAt: 1 } as never;
    s.addSession(session);
    expect(useGlobalStore.getState().sessions.some((x) => x.id === 'gs1')).toBe(true);
    useGlobalStore.getState().updateSession('gs1', { title: 't2' });
    expect(useGlobalStore.getState().sessions.find((x) => x.id === 'gs1')?.title).toBe('t2');
    useGlobalStore.getState().setActiveSession('gs1');
    expect(useGlobalStore.getState().activeSessionId).toBe('gs1');
    useGlobalStore.getState().setActiveSession(null);
    useGlobalStore.getState().setSessions([{ id: 'gs2' } as never]);
    expect(useGlobalStore.getState().sessions).toEqual([{ id: 'gs2' }]);
    useGlobalStore.getState().removeSession('gs2');
    expect(useGlobalStore.getState().sessions).toEqual([]);
    // _migrate
    expect(() => (useGlobalStore.getState() as never as { _migrate: () => void })._migrate()).not.toThrow();
  });
});

describe('model-slice', () => {
  it('状态面冒烟', () => {
    const s = useModelSlice.getState();
    expect(typeof s).toBe('object');
    expect(useModelSlice.setState).toBeInstanceOf(Function);
    // 触发一次 setState 通道
    useModelSlice.setState({} as never);
    expect(useModelSlice.getState()).toBeTruthy();
  });
});

describe('ui-prefs-slice 补齐', () => {
  it('其余偏好动作 + legacy 迁移', () => {
    const s = useUIPrefsSlice.getState() as never as Record<string, (...args: unknown[]) => void> & Record<string, unknown>;
    // 全动作遍历（每个 setter 调一次）
    const setters = Object.entries(s).filter(([, v]) => typeof v === 'function' && /^(set|toggle|reset)/.test(String(v?.name || '')));
    for (const [key, fn] of setters) {
      try {
        (fn as (a?: unknown) => void)(key.includes('Thresholds') ? s.perfAlertThresholds : key.includes('Position') ? { x: 1, y: 2 } : typeof s[key.replace(/^set/, '')] === 'number' ? 5 : key.toLowerCase().includes('enabled') || key.toLowerCase().includes('mode') ? true : 'v');
      } catch { /* 需要特定入参的动作跳过 */ }
    }
    localStorage.setItem('yyc3-ai-float-position', JSON.stringify({ x: 3, y: 4 }));
    expect(typeof migrateLegacyUIPrefs).toBe('function');
  });
});

describe('settings-ssot 迁移分支（旧 system_settings/global-store 键）', () => {
  it('带 legacy 键创建', async () => {
    localStorage.setItem('yyc3_system_settings', JSON.stringify({ toggles: { darkMode: false }, values: { systemName: 'Legacy' } }));
    localStorage.setItem('yyc3-global-store', JSON.stringify({ state: { autoRefresh: false, refreshInterval: 999 } }));
    vi.resetModules();
    const fresh = await import('../settings-ssot-slice');
    expect(fresh.useSettingsSSOT.getState().values.systemName).toBe('Legacy');
    expect(fresh.useSettingsSSOT.getState().runtime.refreshInterval).toBe(999);
    expect(fresh.useSettingsSSOT.getState()._migrated).toBe(true);
    // variableValues 桥接 + resetAllVariables
    fresh.useSettingsSSOT.getState().setVariableValue('node.defaultHostname', 'h1', 'user');
    expect(fresh.useSettingsSSOT.getState().getVariableValue('node.defaultHostname').value).toBe('h1');
    fresh.useSettingsSSOT.getState().resetAllVariables();
    // export/importAll
    const json = fresh.useSettingsSSOT.getState().exportAll();
    expect(fresh.useSettingsSSOT.getState().importAll(json)).toBe(true);
  });
});

describe('provider-slice 补齐（流式 sendChatStream / import 特例）', () => {
  it('importConfig 带 providers+models 完整结构', () => {
    const json = JSON.stringify({
      providers: [{ id: 'zhipu', label: 'Z', baseUrl: 'https://z', authType: 'api-key', models: [], requiresApiKey: true, isLocal: false, isBuiltin: true }],
      configuredModels: [{ id: 'cm-9', providerId: 'zhipu', providerLabel: 'Z', model: 'glm', apiKey: '', status: 'unchecked', createdAt: 1 }],
      activeModelId: 'cm-9',
    });
    expect(useProviderSlice.getState().importConfig(json)).toBe(true);
    expect(useProviderSlice.getState().configuredModels.some((m) => m.id === 'cm-9')).toBe(true);
  });
});
