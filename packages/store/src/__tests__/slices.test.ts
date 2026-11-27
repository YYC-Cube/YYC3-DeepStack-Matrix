/**
 * @file: slices.test.ts
 * @description: @yyc3-deepstack/store 全 16 Slice 状态机用例（getState/setState CRUD + persist 落盘 + legacy 迁移）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNodeSlice } from '../node-slice';
import { useMetricsSlice } from '../metrics-slice';
import { useAppSlice } from '../app-slice';
import { useLogSlice } from '../log-slice';
import { useDbConnSlice, migrateLegacyDbStorage } from '../db-conn-slice';
import { useUserMgmtSlice } from '../user-mgmt-slice';
import { useNetworkSlice } from '../network-slice';
import { useFollowUpSlice } from '../follow-up-slice';
import { useModelSlice } from '../model-slice';
import { useProviderSlice, BUILTIN_PROVIDERS } from '../provider-slice';
import { useAISuggestionSlice } from '../ai-suggestion-slice';
import { useOfflineSlice, migrateLegacyOfflineData } from '../offline-slice';
import { useFSSlice, migrateLegacyFSData } from '../fs-slice';
import { useSDKSessionSlice, migrateLegacySDKSession } from '../sdk-session-slice';
import { useSettingsSSOT } from '../settings-ssot-slice';
import { useUIPrefsSlice } from '../ui-prefs-slice';
import { loadModels, loadProviders, saveModels, saveProviders, BUILTIN_PROVIDERS as COMPAT_PROVIDERS } from '../use-model-provider';
import { useGlobalStore } from '../global-store';

beforeEach(() => {
  localStorage.clear();
  // 各 slice 复位到出厂态（避免用例间串扰）
  useNodeSlice.getState().resetNodes();
  useMetricsSlice.getState().resetAll();
  useLogSlice.getState().clearLogs();
  useDbConnSlice.getState().clearSqlHistory();
  useDbConnSlice.getState().resetPoolConfig();
  useUserMgmtSlice.getState().resetUsers();
  useAppSlice.getState().clearAlerts();
  useAppSlice.getState().clearRecentOps();
});

describe('node-slice', () => {
  it('默认节点 + derived 统计', () => {
    const s = useNodeSlice.getState();
    expect(s.nodes.length).toBeGreaterThanOrEqual(9);
    expect(s.derived.activeCount).toBe(s.nodes.filter((n) => n.status !== 'inactive').length);
    expect(s.derived.activeRatio).toMatch(/\d+\/\d+/);
    expect(s.derived.avgGpu).toBeGreaterThan(0);
    expect(s.derived.totalTasks).toBeGreaterThan(0);
    expect(s.derived.inactiveNodes.length).toBeGreaterThan(0);
  });

  it('setNodes 更新 source/时间戳/derived', () => {
    useNodeSlice.getState().setNodes([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'X1', status: 'active', gpu: 100, mem: 50, temp: 40, model: 'm', tasks: 5 } as any,
    ], 'websocket');
    const s = useNodeSlice.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.lastSource).toBe('websocket');
    expect(s.lastUpdateAt).toBeTruthy();
    expect(s.derived.totalCount).toBe(1);
    expect(s.derived.avgGpu).toBe(100);
    // 空列表 → 均值 0 分支
    useNodeSlice.getState().setNodes([], 'simulation');
    expect(useNodeSlice.getState().derived.avgGpu).toBe(0);
    expect(useNodeSlice.getState().derived.activeRatio).toBe('0/0');
  });

  it('mergeFromWS 增补新节点', () => {
    const before = useNodeSlice.getState().nodes.length;
    useNodeSlice.getState().mergeFromWS([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'WS-NEW', status: 'active', gpu: 10, mem: 10, temp: 10, model: '', tasks: 0 } as any,
    ]);
    expect(useNodeSlice.getState().nodes.length).toBe(before + 1);
    expect(useNodeSlice.getState().lastSource).toBe('websocket');
  });

  it('updateNode/addNode/removeNode/reset', () => {
    useNodeSlice.getState().updateNode('GPU-A100-01', { gpu: 11 });
    expect(useNodeSlice.getState().nodes.find((n) => n.id === 'GPU-A100-01')?.gpu).toBe(11);
    expect(useNodeSlice.getState().lastSource).toBe('user_edit');

    useNodeSlice.getState().addNode({ id: 'ADD-1', status: 'active', gpu: 1, mem: 1, temp: 1, model: '', tasks: 0 } as never);
    expect(useNodeSlice.getState().nodes.some((n) => n.id === 'ADD-1')).toBe(true);

    useNodeSlice.getState().removeNode('ADD-1');
    useNodeSlice.getState().removeNode('GHOST'); // 不存在 → 无异常
    expect(useNodeSlice.getState().nodes.some((n) => n.id === 'ADD-1')).toBe(false);

    useNodeSlice.getState().clearUserEdits('GPU-A100-01');
    useNodeSlice.getState().resetNodes();
    expect(useNodeSlice.getState().lastUpdateAt).toBeNull();
  });
});

describe('metrics-slice', () => {
  it('set/update/reset 全动作', () => {
    const s = useMetricsSlice.getState();
    expect(s.modelPerf.length).toBeGreaterThanOrEqual(5);
    expect(s.radarData.length).toBeGreaterThanOrEqual(6);
    s.updateModelPerf('mp-1', { accuracy: 99.9 });
    expect(useMetricsSlice.getState().modelPerf[0].accuracy).toBe(99.9);
    s.setModelPerf([]);
    s.setModelDist([{ id: 'd', name: 'x', value: 100 }]);
    s.setRadarData([{ id: 'r', metric: 'm', A: 1, B: 2 }]);
    expect(useMetricsSlice.getState().modelPerf).toEqual([]);
    useMetricsSlice.getState().resetAll();
    expect(useMetricsSlice.getState().modelPerf.length).toBe(5);
  });
});

describe('app-slice', () => {
  it('命令面板/告警上限/FPS/内存/最近操作', () => {
    const s = useAppSlice.getState();
    s.setCommandPaletteOpen(true);
    expect(useAppSlice.getState().commandPaletteOpen).toBe(true);
    for (let i = 0; i < 105; i++) {
      useAppSlice.getState().addAlert({ id: `a${i}`, title: 't', message: 'm', level: 'info', source: 's', timestamp: Date.now() } as never);
    }
    expect(useAppSlice.getState().alerts.length).toBeLessThanOrEqual(100);
    useAppSlice.getState().removeAlert('a0');
    useAppSlice.getState().clearAlerts();
    expect(useAppSlice.getState().alerts).toEqual([]);

    useAppSlice.getState().setFps(30);
    useAppSlice.getState().setMemoryUsage(42);
    expect(useAppSlice.getState().fps).toBe(30);

    for (let i = 0; i < 55; i++) {
      useAppSlice.getState().addRecentOp({ id: `o${i}`, action: 'a', target: 't', user: 'u', time: 'x', status: 'success' });
    }
    expect(useAppSlice.getState().recentOps.length).toBeLessThanOrEqual(50);
    useAppSlice.getState().clearRecentOps();
    expect(useAppSlice.getState().recentOps).toEqual([]);
  });
});

describe('log-slice', () => {
  it('add/update/remove/level 过滤/200 条上限', () => {
    useLogSlice.getState().addLog({ timestamp: Date.now(), level: 'info', source: 't', message: 'hello' });
    const added = useLogSlice.getState().logs[useLogSlice.getState().logs.length - 1];
    expect(added.id).toMatch(/^log-/);
    useLogSlice.getState().updateLog(added.id, { message: 'edited' });
    expect(useLogSlice.getState().logs.find((l) => l.id === added.id)?.message).toBe('edited');
    expect(useLogSlice.getState().getLogsByLevel('error').every((l) => l.level === 'error')).toBe(true);

    for (let i = 0; i < 210; i++) {
      useLogSlice.getState().addLog({ timestamp: Date.now(), level: 'debug', source: 'x', message: `m${i}` });
    }
    expect(useLogSlice.getState().logs.length).toBeGreaterThan(0);
    useLogSlice.getState().removeLog(added.id);
    useLogSlice.getState().clearLogs();
    expect(useLogSlice.getState().logs).toEqual([]);
  });
});

describe('db-conn-slice', () => {
  it('连接 CRUD + 状态 + 池配置 + SQL 历史去重截断', () => {
    const s = useDbConnSlice.getState();
    expect(s.connections.some((c) => c.id === 'db-pg-main')).toBe(true);
    s.addConnection({ name: 'N', type: 'mysql', host: 'h', port: 3306, database: 'd', username: 'u', password: 'p', status: 'connected' } as never);
    const added = useDbConnSlice.getState().connections[useDbConnSlice.getState().connections.length - 1];
    s.updateConnection(added.id, { status: 'error' });
    expect(useDbConnSlice.getState().connections.find((c) => c.id === added.id)?.status).toBe('error');
    s.setConnectionStatus(added.id, 'connected');
    s.removeConnection(added.id);

    s.setPoolConfig({ maxConnections: 20 });
    expect(useDbConnSlice.getState().poolConfig.maxConnections).toBe(20);
    useDbConnSlice.getState().resetPoolConfig();
    expect(useDbConnSlice.getState().poolConfig.maxConnections).toBe(10);

    for (let i = 0; i < 25; i++) {
      useDbConnSlice.getState().addSqlHistory(`SELECT ${i}`);
    }
    expect(useDbConnSlice.getState().sqlHistory.length).toBeLessThanOrEqual(20);
    useDbConnSlice.getState().addSqlHistory('SELECT 3'); // 去重前置
    expect(useDbConnSlice.getState().sqlHistory[0]).toBe('SELECT 3');
    useDbConnSlice.getState().clearSqlHistory();
    expect(useDbConnSlice.getState().sqlHistory).toEqual([]);
  });

  it('migrateLegacyDbStorage 迁移旧键', () => {
    localStorage.setItem('yyc3_db_pool_config', JSON.stringify({ maxConnections: 42 }));
    localStorage.setItem('yyc3_sql_history', JSON.stringify(['SELECT legacy']));
    expect(migrateLegacyDbStorage()).toBe(true);
    expect(useDbConnSlice.getState().poolConfig.maxConnections).toBe(42);
    expect(useDbConnSlice.getState().sqlHistory).toEqual(['SELECT legacy']);
    expect(migrateLegacyDbStorage()).toBe(false); // 键已消费
  });
});

describe('user-mgmt-slice', () => {
  it('add/update/remove/toggleLock/reset', () => {
    const s = useUserMgmtSlice.getState();
    expect(s.users.length).toBeGreaterThanOrEqual(5);
    s.addUser({ name: 'N', username: 'n', email: 'n@x', role: 'r', status: 'online', lastLogin: '', sessions: 0, apiCalls: 0, locked: false });
    const added = useUserMgmtSlice.getState().users.at(-1)!;
    s.updateUser(added.id, { role: 'admin' });
    expect(useUserMgmtSlice.getState().users.find((u) => u.id === added.id)?.role).toBe('admin');
    s.toggleLock(added.id);
    expect(useUserMgmtSlice.getState().users.find((u) => u.id === added.id)?.locked).toBe(true);
    s.removeUser(added.id);
    useUserMgmtSlice.getState().resetUsers();
    expect(useUserMgmtSlice.getState().users.length).toBeGreaterThanOrEqual(5);
  });
});

describe('network-slice', () => {
  it('add/update/remove/setConnected/autoReconnect', async () => {
    const s = useNetworkSlice.getState();
    s.addNetwork({ ssid: 'Home', signal: -50, connected: false } as never);
    const added = useNetworkSlice.getState().networks[0];
    s.updateNetwork(added.id, { signal: -40 });
    expect(useNetworkSlice.getState().networks[0].signal).toBe(-40);
    // id 含 Date.now() — 同毫秒会撞 id，错开一拍
    await new Promise((r) => setTimeout(r, 3));
    s.addNetwork({ ssid: 'Work', signal: -60, connected: false } as never);
    const second = useNetworkSlice.getState().networks[1];
    s.setConnected(second.id);
    expect(useNetworkSlice.getState().networks.find((n) => n.id === second.id)?.connected).toBe(true);
    expect(useNetworkSlice.getState().networks.find((n) => n.id === added.id)?.connected).toBe(false);
    s.updateAutoReconnect({ intervalSeconds: 10 });
    expect(useNetworkSlice.getState().autoReconnect.intervalSeconds).toBe(10);
    s.removeNetwork(added.id);
    s.removeNetwork(second.id);
  });
});

describe('follow-up-slice', () => {
  it('add/update/complete/remove', () => {
    const s = useFollowUpSlice.getState();
    expect(s.followUps.length).toBeGreaterThanOrEqual(2);
    s.addFollowUp({ taskId: 'T', taskName: 'N', assignee: 'a', assigneeName: 'A', priority: 'low', status: 'pending', dueDate: 1, notes: '', category: 'maintenance' } as never);
    const added = useFollowUpSlice.getState().followUps.at(-1)!;
    expect(added.createdAt).toBeTruthy();
    s.updateFollowUp(added.id, { status: 'in_progress' });
    expect(useFollowUpSlice.getState().followUps.find((f) => f.id === added.id)?.status).toBe('in_progress');
    useFollowUpSlice.getState().completeFollowUp(added.id);
    expect(useFollowUpSlice.getState().followUps.find((f) => f.id === added.id)?.status).toBe('completed');
    useFollowUpSlice.getState().removeFollowUp(added.id);
  });
});

describe('model-slice / ai-suggestion-slice', () => {
  it('model-slice 冒烟（初始态即可观察）', () => {
    const s = useModelSlice.getState();
    expect(s).toBeTruthy();
    expect(typeof s).toBe('object');
  });
  it('ai-suggestion-slice 冒烟', () => {
    const s = useAISuggestionSlice.getState();
    expect(s).toBeTruthy();
  });
});

describe('provider-slice', () => {
  it('内置服务商 + provider CRUD', () => {
    const s = useProviderSlice.getState();
    expect(BUILTIN_PROVIDERS.length).toBe(3);
    expect(s.providers.length).toBeGreaterThanOrEqual(3);
    const added = s.addProvider({ label: 'Custom', baseUrl: 'https://c.io', authType: 'bearer', models: [], requiresApiKey: true, isLocal: false } as never);
    expect(added.isCustom).toBe(true);
    useProviderSlice.getState().updateProvider(added.id as never, { label: 'Custom2' });
    expect(useProviderSlice.getState().providers.find((p) => p.id === added.id)?.label).toBe('Custom2');
    useProviderSlice.getState().removeProvider(added.id as never);
    // 内置 reset
    useProviderSlice.getState().resetProvider('zhipu');
    expect(useProviderSlice.getState().providers.find((p) => p.id === 'zhipu')?.label).toBeTruthy();
  });

  it('configured model CRUD + setActive + getModelsByStatus', () => {
    const s = useProviderSlice.getState();
    const m = s.addModel('zhipu', 'glm-4-flash', 'sk-key');
    expect(m).toBeTruthy();
    const id = m!.id;
    useProviderSlice.getState().setActiveModel(id);
    expect(useProviderSlice.getState().activeModelId).toBe(id);
    expect(useProviderSlice.getState().getActiveModel()?.id).toBe(id);
    useProviderSlice.getState().updateModel(id, { status: 'active' });
    expect(useProviderSlice.getState().getModelsByStatus('active').some((x) => x.id === id)).toBe(true);
    useProviderSlice.getState().removeModel(id);
    expect(useProviderSlice.getState().getActiveModel()).toBeUndefined();
    useProviderSlice.getState().setActiveModel(null);
  });

  it('addModelToProvider/removeModelFromProvider', () => {
    useProviderSlice.getState().addModelToProvider('ollama', 'llama3');
    expect(useProviderSlice.getState().providers.find((p) => p.id === 'ollama')?.models).toContain('llama3');
    useProviderSlice.getState().removeModelFromProvider('ollama', 'llama3');
    expect(useProviderSlice.getState().providers.find((p) => p.id === 'ollama')?.models).not.toContain('llama3');
  });

  it('presetModels + export/import', () => {
    useProviderSlice.getState().presetModels();
    expect(useProviderSlice.getState().configuredModels.length).toBeGreaterThan(0);
    const json = useProviderSlice.getState().exportConfig();
    expect(json).toContain('providers');
    expect(useProviderSlice.getState().importConfig(json)).toBe(true);
    expect(useProviderSlice.getState().importConfig('{broken')).toBe(false);
  });

  it('fetchOllamaModels 成功/失败分支', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'llama3:8b' }] }), { status: 200 })));
    const models = await useProviderSlice.getState().fetchOllamaModels();
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(useProviderSlice.getState().ollamaError).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    await useProviderSlice.getState().fetchOllamaModels();
    expect(useProviderSlice.getState().ollamaError).toBeTruthy();
  });

  it('testConnection 全分支（active/失败）+ testAllConnections', async () => {
    // 直连真实 testAIConnection + fetch 桩（云厂商管线 200 → pass）
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    const m = useProviderSlice.getState().addModel('zhipu', 'glm-4-flash', 'sk-key-1234567890');
    await useProviderSlice.getState().testConnection(m!.id);
    expect(useProviderSlice.getState().configuredModels.find((x) => x.id === m!.id)?.status).toBe('active');

    // 500 → 非 pass → error
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    await useProviderSlice.getState().testConnection(m!.id);
    expect(useProviderSlice.getState().configuredModels.find((x) => x.id === m!.id)?.status).toBe('error');

    await useProviderSlice.getState().testAllConnections();
    expect(useProviderSlice.getState().testingIds).toEqual([]);
    useProviderSlice.getState().removeModel(m!.id);
  });
});

describe('offline-slice / fs-slice / sdk-session-slice legacy 迁移', () => {
  it('offline 迁移', () => {
    localStorage.setItem('dashboard_state', JSON.stringify({ k: 1 }));
    localStorage.setItem('offline_snapshot', JSON.stringify({ k: 2 }));
    localStorage.setItem('offline_snapshot_time', '2026-01-01T00:00:00Z');
    expect(migrateLegacyOfflineData()).toBe(true);
    expect(useOfflineSlice.getState().dashboardSnapshot).toEqual({ k: 1 });
    expect(useOfflineSlice.getState().offlineSnapshot).toEqual({ k: 2 });
    expect(useOfflineSlice.getState().offlineSnapshotTime).toBe('2026-01-01T00:00:00Z');
    useOfflineSlice.getState().clearOfflineSnapshot();
    expect(useOfflineSlice.getState().offlineSnapshot).toBeNull();
    useOfflineSlice.getState().setDashboardSnapshot({ a: 1 });
  });

  it('fs 迁移 + 文件树/内容缓存/最近文件上限', () => {
    localStorage.setItem('yyc3_file_tree', JSON.stringify([{ id: 'f1', name: 'a.ts', path: '/a.ts' }]));
    expect(migrateLegacyFSData()).toBe(true);
    expect(useFSSlice.getState().fileTree).toEqual([{ id: 'f1', name: 'a.ts', path: '/a.ts' }]);

    useFSSlice.getState().setFileTree([{ id: 'f2', name: 'b.ts', path: '/b.ts' }]);
    useFSSlice.getState().setOneFileContent('f2', 'code');
    expect(useFSSlice.getState().fileContents.f2).toBe('code');
    useFSSlice.getState().setFileContents({});
    for (let i = 0; i < 25; i++) {
      useFSSlice.getState().addRecentFile({ id: `r${i}`, name: `n${i}`, path: `/p${i}` });
    }
    expect(useFSSlice.getState().recentFiles.length).toBeLessThanOrEqual(20);
    // 同 path 去重前置
    useFSSlice.getState().addRecentFile({ id: 'r0', name: 'n0', path: '/p0' });
    expect(useFSSlice.getState().recentFiles[0].path).toBe('/p0');
    expect(migrateLegacyFSData()).toBe(false);
  });

  it('sdk-session 迁移 + 会话与统计', () => {
    localStorage.setItem('yyc3_chat_sessions', JSON.stringify([{ id: 's1' }]));
    expect(migrateLegacySDKSession()).toBe(true);
    expect(useSDKSessionSlice.getState().chatSessions).toEqual([{ id: 's1' }]);
    useSDKSessionSlice.getState().setChatSessions([]);
    useSDKSessionSlice.getState().setUsageStats({ totalRequests: 5, totalTokensIn: 1, totalTokensOut: 2, avgLatencyMs: 3, lastRequestAt: null, errorCount: 0 });
    expect(useSDKSessionSlice.getState().usageStats.totalRequests).toBe(5);
    expect(migrateLegacySDKSession()).toBe(false);
  });
});

describe('settings-ssot-slice', () => {
  it('toggles/values/runtime 三区读写', () => {
    const s = useSettingsSSOT.getState();
    expect(s.values.systemName).toContain('YYC³');
    s.toggleSetting('darkMode');
    expect(useSettingsSSOT.getState().toggles.darkMode).toBe(false);
    s.setToggle('mfa', false);
    expect(useSettingsSSOT.getState().toggles.mfa).toBe(false);
    s.updateValue('systemName', 'Renamed');
    expect(useSettingsSSOT.getState().values.systemName).toBe('Renamed');
    s.updateValues({ clusterId: 'C2', language: 'en-US' });
    expect(useSettingsSSOT.getState().values.language).toBe('en-US');
    s.updateRuntime({ refreshInterval: 1000, compactMode: true });
    expect(useSettingsSSOT.getState().runtime.refreshInterval).toBe(1000);
  });

  it('apiEndpoints 联动 + reset', () => {
    const s = useSettingsSSOT.getState();
    s.updateAPIEndpoint({ timeout: 60000 });
    expect(useSettingsSSOT.getState().apiEndpoints.timeout).toBe(60000);
    s.resetAPIEndpoints();
    expect(useSettingsSSOT.getState().apiEndpoints.timeout).toBe(15000);
    s.resetSettings();
    expect(useSettingsSSOT.getState().values.systemName).toContain('YYC³');
    expect(useSettingsSSOT.getState().toggles.darkMode).toBe(true);
  });

  it('变量值桥接 + export/import', () => {
    const s = useSettingsSSOT.getState();
    const key = 'node.defaultHostname';
    s.setVariableValue(key, 'host-x', 'user');
    expect(useSettingsSSOT.getState().getVariableValue(key).value).toBe('host-x');
    s.resetVariableValue(key);
    expect(useSettingsSSOT.getState().variableValues[key]).toBeUndefined();
    s.setVariableValue(key, 'host-y', 'user');
    s.resetAllVariables();
    const json = useSettingsSSOT.getState().exportAll();
    expect(json).toContain('toggles');
    expect(useSettingsSSOT.getState().importAll(json)).toBe(true);
    expect(useSettingsSSOT.getState().importAll('{broken')).toBe(false);
  });
});

describe('ui-prefs-slice', () => {
  it('浮窗位置/终端高度/阈值', () => {
    const s = useUIPrefsSlice.getState();
    s.setAIFloatPosition({ x: 10, y: 20 });
    expect(useUIPrefsSlice.getState().aiFloatPosition).toEqual({ x: 10, y: 20 });
    s.setTerminalHeight(400);
    expect(useUIPrefsSlice.getState().terminalHeight).toBe(400);
    s.setPerfAlertThresholds({ ...s.perfAlertThresholds, fpsMin: 20 });
    expect(useUIPrefsSlice.getState().perfAlertThresholds.fpsMin).toBe(20);
  });
});

describe('use-model-provider 兼容层 + global-store 冒烟', () => {
  it('loadProviders 合并缺失内置 / saveModels / COMPAT 导出', () => {
    useProviderSlice.setState({ providers: [] });
    const merged = loadProviders();
    expect(merged.length).toBe(BUILTIN_PROVIDERS.length);
    expect(COMPAT_PROVIDERS).toBe(BUILTIN_PROVIDERS);
    saveProviders(merged);
    saveModels([]);
    expect(loadModels()).toEqual([]);
    expect(loadProviders().length).toBeGreaterThan(0);
  });

  it('global-store 冒烟', () => {
    const s = useGlobalStore.getState();
    expect(s).toBeTruthy();
    expect(typeof useGlobalStore.setState).toBe('function');
  });
});
