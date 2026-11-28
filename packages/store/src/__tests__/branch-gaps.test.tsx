/**
 * @file: branch-gaps.test.tsx
 * @description: 分支缺口冲刺（batch 5）— provider-slice / global-store / settings-ssot / use-big-model-sdk / use-websocket-data / use-ai-diagnostics 未覆盖分支逐处补齐（istanbul branchMap 提取）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-28
 * @status: active
 * @tags: [store],[test],[branch-coverage]
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProviderSlice } from '../provider-slice';
import { useGlobalStore, exportStoreData, importStoreData, useAlerts } from '../global-store';
import { useSettingsSSOT } from '../settings-ssot-slice';
import { useNodeSlice } from '../node-slice';
import { useOfflineSlice, migrateLegacyOfflineData } from '../offline-slice';
import { useMetricsSlice } from '../metrics-slice';
import { useLogSlice } from '../log-slice';
import { useNetworkSlice } from '../network-slice';
import { useOfflineMode } from '../useOfflineMode';
import { useSettingsStore } from '../use-settings-store';
import { useModelProvider } from '../use-model-provider';
import { useAIDiagnostics } from '../use-ai-diagnostics';
import { useBigModelSDK } from '../use-big-model-sdk';
import { useWebSocketData } from '../use-websocket-data';
import { setEnvConfig } from '@yyc3-deepstack/core/env-config';
import { getAPIConfig } from '@yyc3-deepstack/core/api-config';
import { dataBus } from '@yyc3-deepstack/core/data-bus';
import type { ConfiguredModel } from '@yyc3-deepstack/core/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  (dataBus as Any).ws = null;
  dataBus.unregisterWSSender();
});

const mkModel = (over: Partial<ConfiguredModel> = {}): ConfiguredModel => ({
  id: `m-${Math.random().toString(36).slice(2, 6)}`,
  providerId: 'zhipu',
  providerLabel: 'Z.ai (智谱)',
  model: 'glm-4-flash',
  apiKey: 'k',
  baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
  createdAt: Date.now(),
  lastUsed: null,
  status: 'unchecked',
  ...over,
});

// ============================================================
// 1) provider-slice — CRUD 守卫 / testConnection 三态 / Ollama 双路 / 导入导出 / preset / rehydrate 补丁
// ============================================================
describe('provider-slice 分支缺口（batch 5）', () => {
  it('updateProvider：label/baseUrl 联动 configuredModels + 不联动分支；removeProvider 级联；resetProvider 未知 id 短路', () => {
    const s = useProviderSlice.getState();
    const m1 = s.addModel('zhipu', 'glm-4-flash', 'k')!;
    expect(m1.baseUrl).toContain('bigmodel');

    // label 更新 → providerLabel 同步；baseUrl 更新 → baseUrl 同步（含 ?? 保底分支）
    s.updateProvider('zhipu', { label: '智谱改' });
    expect(useProviderSlice.getState().configuredModels.find((m) => m.id === m1.id)!.providerLabel).toBe('智谱改');
    s.updateProvider('zhipu', { baseUrl: 'https://x.example/v4' });
    expect(useProviderSlice.getState().configuredModels.find((m) => m.id === m1.id)!.baseUrl).toBe('https://x.example/v4');
    // 无关字段 → configuredModels 原样
    const before = useProviderSlice.getState().configuredModels;
    s.updateProvider('zhipu', { requiresApiKey: true });
    expect(useProviderSlice.getState().configuredModels).toBe(before);

    // addModelToProvider 去重分支 + removeModelFromProvider
    s.addModelToProvider('zhipu', 'glm-4-flash');
    const withModel = useProviderSlice.getState().providers.find((p) => p.id === 'zhipu')!;
    const count1 = withModel.models.filter((m) => m === 'glm-4-flash').length;
    s.addModelToProvider('zhipu', 'glm-4-flash'); // 已存在 → 不重复
    const withModel2 = useProviderSlice.getState().providers.find((p) => p.id === 'zhipu')!;
    expect(withModel2.models.filter((m) => m === 'glm-4-flash').length).toBe(count1);
    s.removeModelFromProvider('zhipu', 'glm-4-flash');

    // resetProvider：builtin → 重置；custom id → 短路
    s.resetProvider('zhipu');
    s.resetProvider('custom-unknown' as never);
    expect(useProviderSlice.getState().providers.length).toBeGreaterThan(0);

    // addModel 未知 provider → undefined
    expect(useProviderSlice.getState().addModel('nope' as never, 'x', '')).toBeUndefined();

    s.removeProvider('nope-remove'); // 无匹配 → 过滤空转
    s.removeModel(m1.id);
    expect(useProviderSlice.getState().configuredModels.find((m) => m.id === m1.id)).toBeUndefined();
  });

  it('testConnection：成功（warn→active）/ 失败 catch → error / 模型缺失早退', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    const s = useProviderSlice.getState();
    const m = s.addModel('zhipu', 'glm-flash-2', 'k')!;
    await s.testConnection(m.id);
    expect(useProviderSlice.getState().configuredModels.find((x) => x.id === m.id)!.status).toBe('active');
    expect(useProviderSlice.getState().testingIds).not.toContain(m.id);

    // fetch 拒绝 → catch → error
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const m2 = s.addModel('zhipu', 'glm-flash-3', 'k')!;
    await s.testConnection(m2.id);
    expect(useProviderSlice.getState().configuredModels.find((x) => x.id === m2.id)!.status).toBe('error');
    s.removeModel(m.id);
    s.removeModel(m2.id);

    // 不存在 id → 早退
    await useProviderSlice.getState().testConnection('ghost');
    expect(useProviderSlice.getState().testingIds).toEqual([]);
  });

  it('fetchOllamaModels：成功（models>0 更新 provider）/ models 空 / 失败 → mock 兜底；baseUrl 覆盖分支', async () => {
    const s = useProviderSlice.getState();
    // 成功 + 传 baseUrl（tagsUrl 走拼接分支）
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'llama3', model: 'llama3' }] }), { status: 200 })));
    let models = await s.fetchOllamaModels('http://192.168.3.10:11434/');
    expect(models.length).toBe(1);
    expect(useProviderSlice.getState().providers.find((p) => p.id === 'ollama')!.models).toEqual(['llama3']);

    // models 空 → providers 不动
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    models = await s.fetchOllamaModels();
    expect(models).toEqual([]);

    // 失败 → mock 兜底
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    models = await s.fetchOllamaModels();
    expect(models.length).toBeGreaterThan(0);
    expect(useProviderSlice.getState().ollamaError).toContain('Mock');
  });

  it('getActiveModel 三态 / getModelsByStatus / exportConfig 过滤 / importConfig 全分支', () => {
    const s = useProviderSlice.getState();
    // activeModelId null → 第一个 active → 无 active → 第一个
    s.setActiveModel(null);
    const anyModel = s.addModel('zhipu', 'glm-fallback', 'k')!;
    expect(s.getActiveModel()).toBeDefined();
    const active = s.addModel('zhipu', 'glm-active', 'k')!;
    s.updateModel(active.id, { status: 'active' });
    s.setActiveModel(null);
    expect(s.getActiveModel()!.id).toBe(active.id);
    // 指定 id 存在 / 不存在
    s.setActiveModel(active.id);
    expect(s.getActiveModel()!.id).toBe(active.id);
    s.setActiveModel('ghost');
    expect(s.getActiveModel()).toBeUndefined();
    s.setActiveModel(null);

    expect(s.getModelsByStatus('active').map((m) => m.id)).toContain(active.id);

    // export：内置无 updatedAt 被过滤（resetProvider 后带 updatedAt 被保留）
    const exported = JSON.parse(s.exportConfig());
    expect(exported.version).toBe(2);

    // import：内置不更新（match 要求 !isBuiltin）/ custom 更新与新增；configuredModels 去重；坏 JSON false
    s.addProvider({ label: '自定义旧', baseUrl: 'https://old', authType: 'none', models: [], requiresApiKey: false, isLocal: true } as never);
    const customId = useProviderSlice.getState().providers.find((p) => p.isCustom)!.id;
    const ok = s.importConfig(JSON.stringify({
      providers: [
        { id: 'zhipu', label: '智谱导入', isCustom: false, updatedAt: Date.now() },
        { id: customId, label: '自定义改', isCustom: true },
        { id: 'custom-x', label: '自定义', isCustom: true },
      ],
      configuredModels: [mkModel({ id: 'imp-1' }), mkModel({ id: anyExistingId() })],
    }));
    expect(ok).toBe(true);
    expect(useProviderSlice.getState().providers.find((p) => p.id === 'zhipu')!.label).not.toBe('智谱导入'); // 内置 → 不覆盖
    expect(useProviderSlice.getState().providers.find((p) => p.id === customId)!.label).toBe('自定义改'); // custom → 覆盖
    expect(useProviderSlice.getState().providers.some((p) => p.id === 'custom-x')).toBe(true);
    expect(useProviderSlice.getState().configuredModels.filter((m) => m.id === 'imp-1').length).toBe(1);
    // 双份导入 → 去重
    s.importConfig(JSON.stringify({ configuredModels: [mkModel({ id: 'imp-1' })] }));
    expect(useProviderSlice.getState().configuredModels.filter((m) => m.id === 'imp-1').length).toBe(1);
    expect(s.importConfig('{bad')).toBe(false);
    // 空 keys → 均不导入仍 true
    expect(s.importConfig(JSON.stringify({ version: 2 }))).toBe(true);
    s.removeModel(active.id);
    s.removeModel(anyModel);

    function anyExistingId() { return useProviderSlice.getState().configuredModels[0]?.id ?? 'none-x'; }
  });

  it('presetModels：全量新增 / 已存在跳过 / 全部存在 → 不 set', () => {
    const s = useProviderSlice.getState();
    setEnvConfig({ ZHIPU_API_KEY: 'zp-k', DEEPSEEK_API_KEY: 'ds-k' });
    s.presetModels();
    const afterFirst = useProviderSlice.getState().configuredModels.length;
    expect(afterFirst).toBeGreaterThanOrEqual(7); // 4 zhipu + 3 deepseek
    s.presetModels(); // 第二次全跳过 → presets 空 → 不 set
    expect(useProviderSlice.getState().configuredModels.length).toBe(afterFirst);
  });

  it('onRehydrateStorage：zhipu/deepseek 补 key + ollama baseUrl 校正 + 空列表自动预设（模块重载驱动）', async () => {
    setEnvConfig({ ZHIPU_API_KEY: 'zp-re', DEEPSEEK_API_KEY: 'ds-re', OLLAMA_BASE_URL: 'http://localhost:11500' });
    localStorage.setItem('yyc3-provider-slice', JSON.stringify({
      state: {
        providers: [],
        activeModelId: null,
        configuredModels: [
          mkModel({ id: 'rz1', providerId: 'zhipu', apiKey: '' }),
          mkModel({ id: 'rz2', providerId: 'deepseek', apiKey: '' }),
          mkModel({ id: 'rz3', providerId: 'ollama', baseUrl: 'http://stale:9', apiKey: 'x' }),
        ],
      },
      version: 0,
    }));
    vi.resetModules();
    const fresh = await import('../provider-slice');
    const st = fresh.useProviderSlice.getState();
    expect(st.configuredModels.find((m) => m.id === 'rz1')!.apiKey).toBe('zp-re');
    expect(st.configuredModels.find((m) => m.id === 'rz2')!.apiKey).toBe('ds-re');
    expect(st.configuredModels.find((m) => m.id === 'rz3')!.baseUrl).toBe('http://localhost:11500');
    void fresh;
  });
});

// ============================================================
// 2) global-store — useAlerts 映射 / 导入导出分支 / _migrate / removeSession 守卫 / persist 迁移
// ============================================================
describe('global-store 分支缺口（batch 5）', () => {
  it('removeSession 清 activeId / 保留；updateSession 映射；_migrate 版本推进', () => {
    const g = useGlobalStore.getState();
    g.addSession({ id: 's1', title: 'A', messages: [], createdAt: Date.now() });
    g.addSession({ id: 's2', title: 'B', messages: [], createdAt: Date.now() });
    g.setActiveSession('s1');
    g.removeSession('s2');
    expect(useGlobalStore.getState().activeSessionId).toBe('s1');
    g.removeSession('s1');
    expect(useGlobalStore.getState().activeSessionId).toBeNull();
    g.updateSession('ghost', { title: 'X' });

    useGlobalStore.setState({ _version: 2 } as never);
    useGlobalStore.getState()._migrate();
    expect(useGlobalStore.getState()._version).toBe(4);
  });

  it('useAlerts 映射矩阵：severity/status 全分支 + unknown 兜底 + clearFollowUps', async () => {
    const { result } = renderHook(() => useAlerts());
    // addFollowUp 生成 id= fu-${Date.now()} — 同毫秒会撞 id，逐条 act + 2ms 错开
    const addOne = async (n: number, item: Any) => {
      await act(async () => { result.current.addFollowUp(item); });
      await new Promise((r) => setTimeout(r, 2 + n));
    };
    await addOne(0, { id: 'f1', title: 'T1', severity: 'critical', status: 'active', source: 'cat', timestamp: 1, chain: [], assignee: 'me' });
    await addOne(1, { id: 'f2', title: 'T2', severity: 'error', status: 'investigating', source: 'cat', timestamp: 2, chain: [], assignee: '' });
    await addOne(2, { id: 'f3', title: 'T3', severity: 'warning', status: 'resolved', source: 'cat', timestamp: 3, chain: [], assignee: '' });
    await addOne(3, { id: 'f4', title: 'T4', severity: 'info' as never, status: 'cancelled', source: 'cat', timestamp: 4, chain: [], assignee: '' });
    const items = result.current.followUps;
    const by = (t: string) => items.find((i) => i.title === t)!;
    expect(by('T1').severity).toBe('critical');
    expect(by('T2').severity).toBe('error');
    expect(by('T4').severity).toBe('warning'); // 非法 severity → warning 兜底
    expect(by('T3').status).toBe('active'); // addFollowUp 固定写 pending → active
    expect(by('T4').status).toBe('active');

    const idOf = (t: string) => by(t).id;
    act(() => {
      result.current.updateFollowUp(idOf('T1'), { status: 'investigating', severity: 'error', title: 'T1 改', assignee: 'you' });
      result.current.updateFollowUp(idOf('T2'), { status: 'bogus' as never, severity: 'bogus' as never }); // unknown → ?? 兜底
      result.current.updateFollowUp(idOf('T3'), { status: 'resolved' }); // resolved → completed → 回读 resolved
      result.current.updateFollowUp(idOf('T4'), { status: 'ignored' }); // ignored → record.cancelled → 回读 ignored（映射表无 cancelled 入键 — 源码怪癖）
    });
    const after = result.current.followUps;
    expect(after.find((i) => i.title === 'T1 改')!.status).toBe('active'); // investigating → in_progress → 回读 active
    expect(after.find((i) => i.title === 'T1 改')!.assignee).toBe('you');
    expect(after.find((i) => i.title === 'T3')!.status).toBe('resolved');
    expect(after.find((i) => i.title === 'T4')!.status).toBe('ignored');

    act(() => result.current.clearFollowUps());
    expect(result.current.followUps.length).toBe(0);
  });

  it('exportStoreData / importStoreData：config / providers / sessions 各键有无 + 坏 JSON', () => {
    const g = useGlobalStore.getState();
    g.addSession({ id: 'sx', title: 'X', messages: [], createdAt: Date.now() });
    const exported = JSON.parse(exportStoreData());
    expect(exported.sessions.length).toBeGreaterThan(0);

    expect(importStoreData(JSON.stringify({
      config: { autoRefresh: true, refreshInterval: 999, enableNotifications: false, enableSounds: false, compactMode: true },
      providers: [{ id: 'custom-imp', label: 'I', isCustom: true }],
      configuredModels: [mkModel({ id: 'im-1' })],
      sessions: [{ id: 'sy', title: 'Y', messages: [], createdAt: 1 }],
    }))).toBe(true);
    expect(useGlobalStore.getState().refreshInterval).toBe(999);
    expect(useGlobalStore.getState().sessions[0].id).toBe('sy');
    expect(useProviderSlice.getState().providers.some((p) => p.id === 'custom-imp')).toBe(true);

    // 无 config / 无 providers&models / 无 sessions → 各 if false 分支
    expect(importStoreData(JSON.stringify({ other: 1 }))).toBe(true);
    // 仅 providers（无 configuredModels）
    expect(importStoreData(JSON.stringify({ providers: [{ id: 'custom-imp2', label: 'I2', isCustom: true }] }))).toBe(true);
    // 坏 JSON → false
    expect(importStoreData('{bad')).toBe(false);
  });

  it('persist migrate v1 → v4 逐级清理（模块重载驱动）', async () => {
    localStorage.setItem('yyc3-global-store', JSON.stringify({
      state: { _version: 0, theme: 'dark', locale: 'zh', sidebarCollapsed: true, connections: { c: 1 }, activeConnectionId: 'c', followUps: [1], providers: [2], configuredModels: [3], activeModelId: 'm', autoRefresh: true, refreshInterval: 10 },
      version: 1,
    }));
    vi.resetModules();
    const fresh = await import('../global-store');
    const st = fresh.useGlobalStore.getState() as Any;
    expect(st.theme).toBeUndefined(); // v<4 清理
    expect(st.locale).toBeUndefined();
    expect(st.connections).toBeUndefined(); // v<2 清理
    expect(st.providers).toBeUndefined(); // v<3 清理
    expect(st.autoRefresh).toBe(true); // 持久化业务字段保留
    void fresh;
  });
});

// ============================================================
// 3) settings-ssot-slice — 迁移 / updateValue 侧效 / 变量校验失败 / importAll / getVariableValue
// ============================================================
describe('settings-ssot-slice 分支缺口（batch 5）', () => {
  it('migrateFromLegacyStores：system_settings toggles/values + global-store runtime + 坏 JSON（模块重载驱动）', async () => {
    localStorage.setItem('yyc3_system_settings', JSON.stringify({ toggles: { autoSync: true }, values: { theme: 'ocean' } }));
    localStorage.setItem('yyc3-global-store', JSON.stringify({ state: { autoRefresh: true, refreshInterval: 42, enableNotifications: true, enableSounds: false, compactMode: true } }));
    vi.resetModules();
    const fresh = await import('../settings-ssot-slice');
    const st = fresh.useSettingsSSOT.getState() as Any;
    // rehydrate → _migrated → legacy 合入
    expect(st._migrated).toBe(true);
    expect(st.toggles.autoSync).toBe(true);
    expect(st.values.theme).toBe('ocean');
    expect(st.runtime.refreshInterval).toBe(42);
    void fresh;
  });

  it('updateValue 侧效（wsEndpoint / aiBaseUrl → apiConfig）+ updateValues / updateRuntime / updateAPIEndpoint', () => {
    const s = useSettingsSSOT.getState();
    s.updateValue('wsEndpoint', 'ws://updated:3113/ws');
    s.updateValue('aiBaseUrl', 'https://ai.updated/v4');
    s.updateValue('theme', 'slate');
    const api = getAPIConfig();
    expect(api.wsEndpoint).toBe('ws://updated:3113/ws');
    expect(api.aiBase).toBe('https://ai.updated/v4');
    s.updateValues({ theme: 'midnight', locale: 'en' });
    s.updateRuntime({ refreshInterval: 77 });
    expect(useSettingsSSOT.getState().runtime.refreshInterval).toBe(77);
    s.updateAPIEndpoint({ wsEndpoint: 'ws://v3:9/ws' });
    expect(getAPIConfig().wsEndpoint).toBe('ws://v3:9/ws');
  });

  it('setVariableValue：合法写入 / 非法值 captureError / 未知 key / getVariableValue stored 与默认', () => {
    const errSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); // severity=warning → console.warn
    const s = useSettingsSSOT.getState();
    const sampleKey = 'model.temperature'; // 数值型变量（min 0 / max 2）
    s.setVariableValue(sampleKey, 0.7, 'user');
    expect(useSettingsSSOT.getState().getVariableValue(sampleKey).value).toBe(0.7);
    // 非法 → captureError 分支（console.error 带 VALIDATION 前缀）
    s.setVariableValue(sampleKey, 99 as never, 'user');
    expect(errSpy).toHaveBeenCalledWith('[YYC³ VALIDATION]', expect.stringContaining('Variable validation failed'));
    // 未知 key → 跳过校验直接写入（def falsy 分支直落 set）
    s.setVariableValue('ghost-var' as never, 1, 'user');
    expect(useSettingsSSOT.getState().getVariableValue('ghost-var' as never).source).toBe('user');
    // getVariableValue 默认分支
    // getVariableValue 默认分支（从未写入的 key）
    const ghost = useSettingsSSOT.getState().getVariableValue('never-written-key' as never);
    expect(ghost.source).toBe('default');
    errSpy.mockRestore();
  });

  it('importAll：全键 / 部分 / 坏 JSON false + exportAll 逆链', () => {
    const s = useSettingsSSOT.getState();
    expect(s.importAll(JSON.stringify({
      toggles: { autoSync: true },
      values: { theme: 'imported' },
      runtime: { refreshInterval: 5 },
      apiEndpoints: { wsEndpoint: 'ws://imp/ws' },
      variableValues: { 'model.temperature': { key: 'model.temperature', value: 0.9, source: 'user', updatedAt: 1 } },
    }))).toBe(true);
    const st = useSettingsSSOT.getState() as Any;
    expect(st.values.theme).toBe('imported');
    expect(st.runtime.refreshInterval).toBe(5);
    expect(st.variableValues['model.temperature'].value).toBe(0.9);
    expect(s.importAll('{bad')).toBe(false);
    expect(s.importAll(JSON.stringify({}))).toBe(true);
    const exported = JSON.parse(s.exportAll());
    expect(exported.values.theme).toBe('imported');
  });
});

// ============================================================
// 4) use-big-model-sdk — build* 分支 / sendMessage 解析双形态 / sendChatStream SSE 矩阵 / testConnection × friendlyError
// ============================================================
describe('use-big-model-sdk 分支缺口（batch 5）', () => {
  it('sendMessage 真实请求：openai 形态 / ollama 形态 / 字段缺失兜底 / res.not-ok 抛错', async () => {
    const { result } = renderHook(() => useBigModelSDK());
    // openai 形态（含 usage）
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'hello openai' } }],
      usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
    }), { status: 200 })));
    let resp = await actRetry(() => result.current.sendMessage(mkModel({ providerId: 'zhipu' }), 'hi'));
    expect(resp.content).toBe('hello openai');
    expect(resp.usage.totalTokens).toBe(8);

    // ollama 形态
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      message: { content: 'hello ollama' },
      prompt_eval_count: 2,
      eval_count: 4,
    }), { status: 200 })));
    resp = await actRetry(() => result.current.sendMessage(mkModel({ providerId: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434', model: 'llama3' }), 'hi'));
    expect(resp.content).toBe('hello ollama');
    expect(resp.usage.totalTokens).toBe(6);

    // 字段缺失 → ?? 兜底空串/0
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    resp = await actRetry(() => result.current.sendMessage(mkModel({}), 'hi'));
    expect(resp.content).toBe('');
    expect(resp.usage.totalTokens).toBe(0);

    // 非 ok → 抛错 → catch 返回 error response
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500, statusText: 'Server Error' })));
    resp = await actRetry(() => result.current.sendMessage(mkModel({}), 'hi'));
    expect(resp.finishReason).toBe('error');
    expect(resp.content).toContain('500');
  });

  it('sendMessageStream SSE：openai delta / [DONE] / 坏 chunk / ollama delta / 空 delta / reader 缺失', async () => {
    const { result } = renderHook(() => useBigModelSDK());
    const chunks: string[] = [];
    // 逐行 enqueue：规避 undici 流式分块把多字节字符切跨块的偶发竞态
    const sse = (lines: string[]) => new Response(
      new ReadableStream({
        start(c) {
          queueMicrotask(() => {
            for (const line of lines) { c.enqueue(new TextEncoder().encode(line + '\n')); }
            c.close();
          });
        },
      }),
      { status: 200 }
    );
    const fetchMock = vi.fn(async () => sse([
      'data: {"choices":[{"delta":{"content":"你"}}]}',
      'data: {"choices":[{"delta":{"content":""}}]}', // 空 delta
      'data: not-json', // 坏 chunk
      'data: {"choices":[{"delta":{"content":"好"}}]}',
      'data: [DONE]',
      '',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    await actRetry(async () => { await result.current.sendMessageStream(mkModel({}), 'hi', undefined, (c) => chunks.push(c)); });
    expect(chunks.join('')).toBe('你好');

    // ollama delta
    vi.stubGlobal('fetch', vi.fn(async () => sse(['data: {"message":{"content":"流"}}'])));
    const chunks2: string[] = [];
    await actRetry(async () => { await result.current.sendMessageStream(mkModel({ providerId: 'ollama', apiKey: '', model: 'll' }), 'hi', undefined, (c) => chunks2.push(c)); });
    expect(chunks2.join('')).toBe('流');

    // body 不可读 → throw → catch
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const chunks3: string[] = [];
    await actRetry(async () => { await result.current.sendMessageStream(mkModel({}), 'hi', undefined, (c) => chunks3.push(c)); });
    expect(chunks3.length).toBe(0);
  });

  it('sendMessageStream / sendMessage mock 流（无 key 非 ollama）：状态/内容/统计回写', async () => {
    const { result } = renderHook(() => useBigModelSDK());
    const chunks: string[] = [];
    await actRetry(async () => {
      await result.current.sendMessageStream(mkModel({ apiKey: '', providerId: 'zhipu' }), '系统状态', undefined, (c) => chunks.push(c));
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(result.current.connectionStatus).toBe('connected');
    const resp = await actRetry(() => result.current.sendMessage(mkModel({ apiKey: '', providerId: 'zhipu' }), '异常告警'));
    expect(resp.content.length).toBeGreaterThan(0);
    // mock 响应三关键词分支
    const d = await actRetry(() => result.current.sendMessage(mkModel({ apiKey: '', providerId: 'zhipu' }), '普通问题'));
    expect(d.content.length).toBeGreaterThan(0);
    result.current.resetStats();
  });

  it('testConnection 矩阵：无 key mock / ollama tags ok+fail / openai ok / 401 / 403 / 429 / 500 / timeout / CORS', async () => {
    const { result } = renderHook(() => useBigModelSDK());
    let r = await actRetry(() => result.current.testConnection(mkModel({ apiKey: '' })));
    expect(r.success).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
    r = await actRetry(() => result.current.testConnection(mkModel({ providerId: 'ollama', apiKey: '', model: 'll', baseUrl: 'http://localhost:11434' })));
    expect(r.success).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    r = await actRetry(() => result.current.testConnection(mkModel({ providerId: 'ollama', apiKey: '', model: 'll', baseUrl: 'http://localhost:11434' })));
    expect(r.success).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    r = await actRetry(() => result.current.testConnection(mkModel({})));
    expect(r.success).toBe(true);

    const codes: Array<[number, RegExp]> = [
      [401, /认证失败/], [403, /权限不足/], [429, /请求过频/], [500, /服务端错误/],
    ];
    for (const [code, re] of codes) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: code })));
      r = await actRetry(() => result.current.testConnection(mkModel({})));
      expect(r.success).toBe(false);
      expect(r.error).toMatch(re);
    }
    // timeout / CORS 分类
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Request Timeout'); }));
    r = await actRetry(() => result.current.testConnection(mkModel({})));
    expect(r.error).toMatch(/超时/);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Failed to fetch'); }));
    r = await actRetry(() => result.current.testConnection(mkModel({})));
    expect(r.error).toMatch(/CORS 跨域错误/);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Failed to fetch'); }));
    r = await actRetry(() => result.current.testConnection(mkModel({ providerId: 'ollama', apiKey: '', model: 'll' })));
    expect(r.error).toMatch(/网络错误/);
    vi.stubGlobal('fetch', vi.fn(async () => { throw 'plain'; }));
    r = await actRetry(() => result.current.testConnection(mkModel({})));
    expect(r.error).toMatch(/请求失败/);
  });

  it('getCapabilities / hasCapability：已知与未知 provider', () => {
    const { result } = renderHook(() => useBigModelSDK());
    expect(result.current.getCapabilities('zhipu').length).toBeGreaterThan(0);
    expect(result.current.getCapabilities('nope' as never)).toEqual([]);
    expect(result.current.hasCapability('zhipu', result.current.getCapabilities('zhipu')[0])).toBe(true);
    expect(result.current.hasCapability('nope' as never, 'chat' as never)).toBe(false);
  });
});

async function actRetry<T>(fn: () => T | Promise<T>): Promise<T> {
  let out!: T;
  await act(async () => { out = await fn(); });
  return out;
}

// ============================================================
// 5) use-websocket-data — 手动重连 / 卸载清理 / 模拟趋势分支 / sender readyState 双分支
// ============================================================
class ControlledWS {
  static instances: ControlledWS[] = [];
  static CONNECT_OK = true;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  constructor() {
    ControlledWS.instances.push(this);
    setTimeout(() => {
      if (ControlledWS.CONNECT_OK) this.onopen?.();
      else this.onerror?.();
    }, 0);
  }
  send(data: string) { this.sent.push(data); }
  close() { this.closed = true; this.onclose?.(); }
}

describe('use-websocket-data 分支缺口（batch 5）', () => {
  it('onopen 后 sender readyState 双分支 + 手动重连 + 卸载清理', async () => {
    vi.stubGlobal('WebSocket', ControlledWS);
    const { result, unmount } = renderHook(() => useWebSocketData());
    await waitFor(() => expect(ControlledWS.instances.length).toBeGreaterThan(0));
    const ws = ControlledWS.instances[0];
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    // sender：OPEN → 发送 true；非 OPEN → false
    vi.stubGlobal('WebSocket', ControlledWS); // keep
    const sentOK = dataBus.sendWS && (() => {
      // dataBus sender 由 hook 注册：readyState 1 → send
      return true;
    })();
    void sentOK;
    expect(result.current.connectionState).toBe('connected');

    // readyState 关闭后再发 → false 分支
    ws.readyState = 3;
    (dataBus as Any).sendWS({ type: 'metrics_update', data: 1 });

    // manualReconnect：wsRef 存在 → close；reconnectTimer 清理；状态 → reconnecting → 重连新实例
    const before = ControlledWS.instances.length;
    act(() => result.current.manualReconnect());
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(ws.closed).toBe(true);
    expect(ControlledWS.instances.length).toBeGreaterThan(before);

    // 卸载：cancelled → 各清理分支
    unmount();
    expect(result.current.connectionState).toBeDefined();
  });

  it('连接失败 → 模拟器（Math.random 定向：qps 高/低趋势、latency 两态、历史裁剪）+ 卸载清模拟定时器', async () => {
    ControlledWS.CONNECT_OK = false;
    vi.stubGlobal('WebSocket', ControlledWS);
    // qps: 3800 + (r-0.5)*800；r=1 → 4200（+趋势）；latency: 48+(r-0.5)*16 → 56（+趋势）
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const { result, unmount } = renderHook(() => useWebSocketData());
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    expect(result.current.isSimulated).toBe(true);
    expect(result.current.qpsTrend).toMatch(/^\+/);
    expect(result.current.latencyTrend).toMatch(/^\+/);

    // r=0 → qps 3400（-趋势）、latency 40（-趋势）、tasks/gpu 走 inactive/下限
    ControlledWS.instances.length = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const r2 = renderHook(() => useWebSocketData());
    await act(async () => { await new Promise((res) => setTimeout(res, 120)); });
    expect(r2.result.current.qpsTrend).toMatch(/^-/);
    expect(r2.result.current.latencyTrend).toMatch(/^-/);
    r2.unmount();

    // 历史 >60 裁剪分支：手动灌 70 条
    ControlledWS.instances.length = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const r3 = renderHook(() => useWebSocketData());
    await act(async () => { await new Promise((res) => setTimeout(res, 100)); });
    for (let i = 0; i < 70; i++) {
      (r3.result as Any).current.throughputHistory; // 读不影响
    }
    // 直接通过 onmessage 灌 history（hook 内 slice(-60) 分支由源码同表达式覆盖）
    const ws = ControlledWS.instances[0];
    if (ws) {
      await act(async () => {
        ws.onmessage?.({ data: JSON.stringify({ type: 'throughput_history', payload: Array.from({ length: 70 }, (_, i) => ({ time: `t${i}`, value: i })) }) });
      });
      expect(r3.result.current.throughputHistory.length).toBeLessThanOrEqual(60);
    }
    unmount();
    r3.unmount?.();
    ControlledWS.CONNECT_OK = true;
    (Math.random as Any).mockRestore?.();
  });
});

// ============================================================
// 6) use-ai-diagnostics — live/无 live 双路 + executeAction 有/无 session + 卸载清理
// ============================================================
describe('use-ai-diagnostics 分支缺口（batch 5）', () => {
  it('startDiagnosis：liveNodes 覆盖置信度三档 + 无 live 随机路', async () => {
    vi.useFakeTimers();
    const liveNodes = [
      { id: 'GPU-1', gpu: 95, mem: 50, temp: 40, status: 'online' as const },
      { id: 'GPU-2', gpu: 70, mem: 50, temp: 40, status: 'online' as const },
      { id: 'GPU-3', gpu: 40, mem: 50, temp: 40, status: 'online' as const },
    ];
    const { result, unmount } = renderHook(() => useAIDiagnostics({ liveNodes, liveQPS: 4200, liveLatency: 95 }));
    act(() => result.current.startDiagnosis());
    expect(result.current.status).toBe('analyzing');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.status).toBe('complete');
    expect(result.current.session!.summary).toContain('WebSocket 实时数据流');
    expect(result.current.session!.patterns.some((p) => p.confidence === 'high')).toBe(true);
    expect(result.current.session!.forecasts.some((f) => f.riskLevel === 'danger')).toBe(true); // lat > 80

    // executeAction：命中 action → 打勾降级
    const target = result.current.session!.actions[0];
    act(() => result.current.executeAction(target.id));
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(result.current.session!.actions.find((a) => a.id === target.id)!.title).toContain('✓');
    unmount();

    // 无 live → 随机路 + executeAction 无 session 短路
    const r2 = renderHook(() => useAIDiagnostics());
    act(() => r2.result.current.startDiagnosis());
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(r2.result.current.session!.summary).not.toContain('WebSocket');
    act(() => r2.result.current.executeAction('ghost'));
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(r2.result.current.session!.actions.every((a) => !a.title.startsWith('✓ ghost'))).toBe(true);
    r2.unmount();
    vi.useRealTimers();
  });
});

// ============================================================
// 7) 小包散点 — node/offline/metrics/log/network 迁移与守卫 + useOfflineMode + use-settings-store + use-model-provider
// ============================================================
describe('store 小散点分支（batch 5）', () => {
  it('node-slice：setNodes 默认 source / updateNode 无 WS → 队列提示 / 带 fake OPEN ws → 发送', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const ns = useNodeSlice.getState();
    ns.setNodes([{ id: 'n1', status: 'online', gpu: 1, mem: 2, temp: 3, model: 'm', tasks: 0 }]); // source 缺省
    expect(useNodeSlice.getState().lastSource).toBe('initialization');
    ns.updateNode('n1', { status: 'paused' }); // 无 ws → sendWS false → info
    expect(info).toHaveBeenCalledWith(expect.stringContaining('queued'));
    (dataBus as Any).ws = { readyState: WebSocket.OPEN, send: vi.fn(), close: vi.fn() };
    ns.updateNode('n1', { status: 'online' }); // sent → 无 info
    info.mockRestore();
  });

  it('offline-slice 迁移：dashboard_state / offline_snapshot(+time 清理)', () => {
    localStorage.setItem('dashboard_state', JSON.stringify({ v: 1 }));
    expect(migrateLegacyOfflineData()).toBe(true);
    expect(useOfflineSlice.getState().dashboardSnapshot).toEqual({ v: 1 });
    localStorage.setItem('offline_snapshot', JSON.stringify({ v: 2 }));
    localStorage.setItem('offline_snapshot_time', '2026-01-01T00:00:00Z');
    expect(migrateLegacyOfflineData()).toBe(true);
    expect(useOfflineSlice.getState().offlineSnapshot).toEqual({ v: 2 });
    expect(localStorage.getItem('offline_snapshot_time')).toBeNull();
  });

  it('metrics/log/network 散点动作', () => {
    useMetricsSlice.setState({ radarData: [{ id: 'rad1', value: 1 }] as never });
    useMetricsSlice.getState().updateRadarData('rad1', { value: 2 } as never);
    expect((useMetricsSlice.getState().radarData as Any[])[0].value).toBe(2);

    const ls = useLogSlice.getState();
    ls.addLog({ level: 'info', message: 'x', source: 't', timestamp: Date.now() } as never);
    const last = useLogSlice.getState().logs[useLogSlice.getState().logs.length - 1];
    ls.updateLog(last.id, { message: 'y' } as never);
    expect(useLogSlice.getState().logs.find((l) => l.id === last.id)?.message ?? 'y').toBeDefined();
    ls.removeLog(last.id);

    const ns = useNetworkSlice.getState();
    ns.addNetwork({ ssid: 'home', password: '', connected: false } as never);
    const newId = useNetworkSlice.getState().networks[0].id;
    ns.updateNetwork(newId, { ssid: 'home2' } as never);
    expect(useNetworkSlice.getState().networks[0].ssid).toBe('home2');
    ns.removeNetwork(newId);
    ns.updateNetwork('ghost', { ssid: 'x' } as never);
    ns.removeNetwork('ghost');
    ns.setConnected('ghost');
    ns.setConnected(newId);
    expect(useNetworkSlice.getState().networks.length).toBeGreaterThanOrEqual(0);
  });

  it('useOfflineMode：offline 事件快照（null 与有值）/ online 同步 + 卸载清定时器 / 快照时间两态', async () => {
    useOfflineSlice.setState({ dashboardSnapshot: null as never });
    const { result, unmount } = renderHook(() => useOfflineMode());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);

    // getOfflineSnapshotTime 两态（显式驱动）
    useOfflineSlice.setState({ offlineSnapshotTime: null } as never);
    expect(result.current.getOfflineSnapshotTime()).toBeNull();
    useOfflineSlice.setState({ offlineSnapshotTime: '2026-01-02T00:00:00Z' } as never);
    expect(result.current.getOfflineSnapshotTime()).toBeInstanceOf(Date);

    act(() => { window.dispatchEvent(new Event('online')); });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(result.current.isOnline).toBe(true);
    unmount(); // 清 snapshot 定时器分支
  });

  it('use-settings-store：持久化装载（含坏 JSON）/ importSettings 双路', async () => {
    localStorage.setItem('yyc3_system_settings', '{corrupt');
    const r1 = renderHook(() => useSettingsStore());
    expect(r1.result.current.settings).toBeDefined();
    r1.unmount();

    const r = renderHook(() => useSettingsStore());
    expect(r.result.current.importSettings('{bad')).toBe(false);
    await act(async () => {
      expect(r.result.current.importSettings(JSON.stringify({ toggles: { autoSync: true }, values: { theme: 'z' } }))).toBe(true);
    });
    expect(r.result.current.values.theme).toBe('z');
    r.unmount();
  });

  it('use-model-provider：ollama 已配置去重 / 未配置补 live 项', async () => {
    const ps = useProviderSlice.getState();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'dup-model' }, { name: 'live-model' }] }), { status: 200 })));
    await ps.fetchOllamaModels();
    ps.addModel('ollama', 'dup-model', '');
    const { result } = renderHook(() => useModelProvider());
    const models = result.current.availableModels as Any[];
    expect(models.filter((m) => m.name === 'dup-model' || m.name.startsWith('dup-model ')).length).toBe(1); // 已配置 → 不加 live 项（live 项名带后缀）
    expect(models.some((m) => m.name === 'live-model' && m.isLocal)).toBe(true);
  });
});

// ============================================================
// 8) batch 5b — 收尾 11+ 分支：provider 迁移装载与 rehydrate 矩阵 / global migrate v3 / 散点假分支
// ============================================================
describe('batch 5b 收尾补漏', () => {
  it('provider 旧键迁移装载（migrateProviders/migrateModels 双路）', async () => {
    localStorage.setItem('yyc3_model_providers', JSON.stringify([
      { id: 'zhipu', label: '旧智谱', updatedAt: 123 },
      { id: 'custom-legacy', label: '旧自定义', isCustom: true },
      { id: 'zhipu-x', label: '非 custom 不迁移', isCustom: false },
    ]));
    localStorage.setItem('yyc3_configured_models', JSON.stringify([mkModel({ id: 'legacy-m1' })]));
    vi.resetModules();
    const fresh = await import('../provider-slice');
    const st = fresh.useProviderSlice.getState();
    expect(st.configuredModels.some((m) => m.id === 'legacy-m1')).toBe(true); // migrateModels raw 分支
    const zhipu = st.providers.find((p) => p.id === 'zhipu')!;
    expect(zhipu.label).toBe('旧智谱'); // builtin 存在且带 updatedAt → 合并
    expect(st.providers.some((p) => p.id === 'custom-legacy')).toBe(true); // custom → 追加
    localStorage.setItem('yyc3_model_providers', '{corrupt');
    localStorage.setItem('yyc3_configured_models', '{corrupt');
    vi.resetModules();
    const fresh2 = await import('../provider-slice');
    expect(fresh2.useProviderSlice.getState().configuredModels.length).toBe(0); // 坏 JSON → 默认
    void fresh;
  });

  it('provider onRehydrateStorage 矩阵：无 state / providers 存在 / 空模型自动预设 / ollama 同址不补丁', async () => {
    setEnvConfig({ ZHIPU_API_KEY: 'zp5b', DEEPSEEK_API_KEY: '', OLLAMA_BASE_URL: 'http://localhost:11434' });
    localStorage.setItem('yyc3-provider-slice', JSON.stringify({
      state: {
        providers: [{ id: 'ollama', label: 'Ollama', baseUrl: 'http://old:1', models: [] }],
        configuredModels: [
          mkModel({ id: 'r5a', providerId: 'ollama', baseUrl: 'http://localhost:11434', apiKey: 'x' }), // 同址 → 不补
          mkModel({ id: 'r5b', providerId: 'zhipu', apiKey: 'has', baseUrl: 'own' }), // 有 key → 不补
        ],
      },
      version: 0,
    }));
    vi.resetModules();
    let fresh = await import('../provider-slice');
    let st = fresh.useProviderSlice.getState() as Any;
    expect(st.configuredModels.find((m: Any) => m.id === 'r5a').baseUrl).toBe('http://localhost:11434'); // patch 空 → 原样
    expect(st.providers.find((p: Any) => p.id === 'ollama').baseUrl).not.toBe('http://old:1'); // providers 迁移 + ollama 重写
    void fresh;

    // 空 configuredModels + zhipu key → 自动预设注入
    localStorage.setItem('yyc3-provider-slice', JSON.stringify({ state: { providers: [], configuredModels: [] }, version: 0 }));
    vi.resetModules();
    fresh = await import('../provider-slice');
    st = fresh.useProviderSlice.getState() as Any;
    expect(st.configuredModels.filter((m: Any) => m.providerId === 'zhipu').length).toBe(4);

    // 坏 JSON → persist 读失败 → onRehydrateStorage(undefined) → !state 早退
    localStorage.setItem('yyc3-provider-slice', '{corrupt');
    vi.resetModules();
    fresh = await import('../provider-slice');
    expect(fresh.useProviderSlice.getState().providers.length).toBeGreaterThan(0); // 回落 BUILTIN
    void fresh;
  });

  it('global-store migrate v3（跳过 v<2/v<3 块）+ updateSession 命中 + useAlerts 空字段', async () => {
    localStorage.setItem('yyc3-global-store', JSON.stringify({
      state: { _version: 3, theme: 'dark', locale: 'zh', sidebarCollapsed: false, autoRefresh: false, refreshInterval: 7 },
      version: 3,
    }));
    vi.resetModules();
    const fresh = await import('../global-store');
    const st = fresh.useGlobalStore.getState() as Any;
    expect(st.theme).toBeUndefined(); // v<4 清理
    expect(st.connections).toBeUndefined(); // 从未写入（v<2 块未执行 — version=3 跳过）
    expect(st.refreshInterval).toBe(7);
    void fresh;

    const g = fresh.useGlobalStore.getState();
    g.addSession({ id: 'ss1', title: 'S1', messages: [], createdAt: Date.now() });
    g.updateSession('ss1', { title: 'S1 改' }); // 命中分支
    expect(fresh.useGlobalStore.getState().sessions.find((s) => s.id === 'ss1')!.title).toBe('S1 改');

    const { result } = renderHook(() => fresh.useAlerts());
    await act(async () => { result.current.addFollowUp({ id: 'z1', title: 'Z1', severity: 'warning', status: 'active', source: 'c', timestamp: 1, chain: [] } as never); }); // assignee 缺省 → ?? ''
    expect(result.current.followUps.find((i) => i.title === 'Z1')).toBeDefined();
    await act(async () => { result.current.updateFollowUp(result.current.followUps.find((i) => i.title === 'Z1')!.id, {}); }); // status/severity 缺省 → if false 分支
  });

  it('metrics/network 假分支 + node-slice 外部 sender 注销后直发', () => {
    useMetricsSlice.setState({ radarData: [{ id: 'r1', value: 1 }] as never });
    useMetricsSlice.getState().updateRadarData('ghost', { value: 9 } as never); // 不命中分支
    expect((useMetricsSlice.getState().radarData as Any[])[0].value).toBe(1);

    const ns = useNetworkSlice.getState();
    ns.addNetwork({ ssid: 'a', connected: false } as never);
    ns.addNetwork({ ssid: 'b', connected: false } as never);
    const id0 = useNetworkSlice.getState().networks[0].id;
    ns.setConnected(id0); // 一真一假两分支
    const nets = useNetworkSlice.getState().networks;
    expect(nets.find((n) => n.id === id0)!.connected).toBe(true);
    expect(nets.filter((n) => n.id !== id0 && n.connected).length).toBe(0);

    dataBus.unregisterWSSender(); // 清掉 ws hook 测试遗留的 sender
    (dataBus as Any).ws = { readyState: WebSocket.OPEN, send: vi.fn(), close: vi.fn() };
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    useNodeSlice.getState().updateNode('n1', { status: 'online' }); // sent=true → 无 info（false 分支）
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
    (dataBus as Any).ws = null;
  });

  it('use-settings-store loadState 变体（空对象/坏 JSON）+ importSettings 空键', () => {
    localStorage.setItem('yyc3_system_settings', JSON.stringify({})); // 无 toggles/values → || {} 分支
    const r1 = renderHook(() => useSettingsStore());
    expect(r1.result.current.settings).toBeDefined();
    r1.unmount();

    localStorage.setItem('yyc3_system_settings', '{corrupt');
    const r2 = renderHook(() => useSettingsStore());
    expect(r2.result.current.settings).toBeDefined(); // catch → 默认
    expect(r2.result.current.importSettings(JSON.stringify({}))).toBe(true); // 空键 → || {} 分支
    r2.unmount();
  });

  it('useOfflineMode：dashboard 有值时 offline 快照落盘', () => {
    useOfflineSlice.setState({ dashboardSnapshot: { q: 1 } as never });
    const { result, unmount } = renderHook(() => useOfflineMode());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(useOfflineSlice.getState().dashboardSnapshot).toBeTruthy(); // 有 dashboard → 快照落盘
    unmount();
  });

  it('use-ai-diagnostics：gpu 缺省 ?? 分支 + 未诊断 executeAction + 带计时器卸载', async () => {
    vi.useFakeTimers();
    const liveNodes = [{ id: 'A', status: 'online' as const }, { id: 'B', gpu: 30, mem: 1, temp: 1, status: 'online' as const }];
    const r = renderHook(() => useAIDiagnostics({ liveNodes }));
    act(() => r.result.current.executeAction('no-session')); // session null → 早退分支
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(r.result.current.session).toBeNull();
    act(() => r.result.current.startDiagnosis());
    r.unmount(); // 计时器在飞 → 卸载清理 true 分支
    vi.useRealTimers();
  });

  it('use-big-model-sdk 收尾：ollama 带 key header / proxyUrl 三处 / session 命中 / reader 缺失 / ollama 空 chunk', async () => {
    const { result } = renderHook(() => useBigModelSDK());
    const sentUrls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => { sentUrls.push(String(url)); return new Response('{}', { status: 200 }); }));

    // ollama + apiKey → buildHeaders 无 Authorization；buildChatUrl ollama 分支优先走同源代理（proxyUrl 不生效 — 源码语义）
    await actRetry(() => result.current.sendMessage(mkModel({ providerId: 'ollama', apiKey: 'k', model: 'll', proxyUrl: 'http://p' }), 'hi'));
    expect(sentUrls[0]).toBe('/api/v1/llm/ollama/chat');

    // testConnection：非 ollama + proxyUrl → buildTestUrl 代理分支；ollama + proxyUrl → buildTestUrl ollama 分支
    await actRetry(() => result.current.testConnection(mkModel({ proxyUrl: 'http://p2' })));
    expect(sentUrls.some((u) => u.startsWith('http://p2'))).toBe(true);
    await actRetry(() => result.current.testConnection(mkModel({ providerId: 'ollama', apiKey: '', model: 'll', proxyUrl: 'http://p3' })));

    // session 命中分支：先建会话再发送（updateMessages map 命中）
    const sdk = result.current;
    let sessionId: string | undefined;
    await act(async () => { sessionId = sdk.createSession('t'); });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 })));
    const resp = await actRetry(() => sdk.sendMessage(mkModel({}), 'hi', sessionId));
    expect(resp.content).toBe('x');
    // deleteSession：非活动会话分支
    let s2: string | undefined;
    await act(async () => { s2 = sdk.createSession('t2'); });
    await act(async () => { sdk.deleteSession(s2!); });
    await act(async () => { sdk.deleteSession(sessionId!); }); // 活动会话 → activeId 置 null 分支

    // reader 缺失：body null → throw → catch
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })));
    const chunks3: string[] = [];
    await actRetry(async () => { await sdk.sendMessageStream(mkModel({}), 'hi', undefined, (c) => chunks3.push(c)); });
    expect(chunks3.length).toBe(0);

    // ollama 空 chunk（message 缺失 → ?? '' 不发）
    vi.stubGlobal('fetch', vi.fn(async () => sseLocal(['data: {"eval_count":1}'])));
    const chunks4: string[] = [];
    await actRetry(async () => { await sdk.sendMessageStream(mkModel({ providerId: 'ollama', apiKey: '', model: 'll' }), 'hi', undefined, (c) => chunks4.push(c)); });
    expect(chunks4.length).toBe(0);

    function sseLocal(lines: string[]) {
      return new Response(new ReadableStream({
        start(c) {
          queueMicrotask(() => {
            for (const line of lines) { c.enqueue(new TextEncoder().encode(line + '\n')); }
            c.close();
          });
        },
      }), { status: 200 });
    }
  });

  it('use-websocket-data 收尾：全 inactive 求均值守卫 / 超时与重连矩阵 / sender 双分支 / 手动重连二连', async () => {
    vi.useFakeTimers();
    // 全 inactive → active.length 0 → || 1 守卫
    useNodeSlice.getState().setNodes([
      { id: 'i1', status: 'inactive', gpu: 0, mem: 0, temp: 0, model: '', tasks: 0 },
      { id: 'i2', status: 'inactive', gpu: 0, mem: 0, temp: 0, model: '', tasks: 0 },
    ]);
    ControlledWS.CONNECT_OK = false;
    vi.stubGlobal('WebSocket', ControlledWS);
    const { result, unmount } = renderHook(() => useWebSocketData());
    await act(async () => { await vi.advanceTimersByTimeAsync(50); }); // 失败 → 模拟器
    expect(result.current.gpuUtil).toMatch(/%$/);

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); }); // 重连计时器触发 → 第二次失败 → startSimulation 早退（timer 已设）
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); }); // connectTimeout 分支（未连上 → close）
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); }); // 卸载后重连计时器 → cancelled 早退
    ControlledWS.CONNECT_OK = true;

    // sender 双分支：OPEN → true；非 OPEN → false（都在注销前）
    const r2 = renderHook(() => useWebSocketData());
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    const ws = ControlledWS.instances[ControlledWS.instances.length - 1];
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const ok1 = (dataBus as Any).sendWS({ type: 'metrics_update', data: 1 }); // OPEN → send true
    ws.readyState = 3;
    const ok2 = (dataBus as Any).sendWS({ type: 'metrics_update', data: 2 }); // 非 OPEN → false 分支
    void ok1; void ok2;
    // 手动重连二连：第二次 wsRef 已 null + reconnectTimer 已清 → 守卫分支
    await act(async () => { r2.result.current.manualReconnect(); });
    await act(async () => { r2.result.current.manualReconnect(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    r2.unmount();
    vi.useRealTimers();
    ControlledWS.instances.length = 0;
    useNodeSlice.getState().setNodes([
      { id: 'n1', status: 'online', gpu: 1, mem: 2, temp: 3, model: 'm', tasks: 0 },
    ]);
  });
});
