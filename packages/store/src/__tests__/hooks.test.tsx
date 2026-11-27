/**
 * @file: hooks.test.tsx
 * @description: @yyc3-deepstack/store hooks 用例 — useOfflineMode / useModelProvider / useWebSocketData / useSettingsStore / useAIDiagnostics / useBigModelSDK
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineMode } from '../useOfflineMode';
import { useModelProvider, BUILTIN_PROVIDERS, PROVIDERS_KEY, MODELS_KEY, loadProviders, loadModels, saveProviders, saveModels } from '../use-model-provider';
import { useWebSocketData } from '../use-websocket-data';
import { useSettingsStore } from '../use-settings-store';
import { useAIDiagnostics } from '../use-ai-diagnostics';
import { useBigModelSDK, PROVIDER_CAPABILITIES } from '../use-big-model-sdk';
import { useProviderSlice } from '../provider-slice';
import { useOfflineSlice } from '../offline-slice';
import { useSDKSessionSlice } from '../sdk-session-slice';

beforeEach(() => {
  localStorage.clear();
  useProviderSlice.setState({ providers: [], configuredModels: [], ollamaModels: [], ollamaError: null, ollamaLoading: false });
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useOfflineMode', () => {
  it('快照保存/读取 + offline 事件落快照 + sync 清快照', async () => {
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);

    act(() => result.current.saveDashboardState({ page: 'dash' }));
    expect(useOfflineSlice.getState().dashboardSnapshot).toEqual({ page: 'dash' });
    expect(result.current.loadDashboardState()).toEqual({ page: 'dash' });

    // offline → saveOfflineSnapshot
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(useOfflineSlice.getState().offlineSnapshot).toEqual({ page: 'dash' });
    expect(result.current.getOfflineSnapshotTime()).toBeTruthy();

    // online → syncOfflineData（1s 模拟延迟）
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1200));
    });
    expect(useOfflineSlice.getState().offlineSnapshot).toBeNull();
    expect(result.current.lastSyncTime).toBeTruthy();
    expect(result.current.pendingSync).toBe(false);
  });

  it('无快照 sync → 仅刷新时间', async () => {
    const { result } = renderHook(() => useOfflineMode());
    useOfflineSlice.getState().clearOfflineSnapshot();
    await act(async () => {
      await result.current.syncOfflineData();
    });
    expect(result.current.lastSyncTime).toBeTruthy();
    expect(result.current.pendingSync).toBe(false);
  });
});

describe('useModelProvider', () => {
  it('stats/availableModels 统计 + 模态框', async () => {
    useProviderSlice.setState({
      providers: [
        { ...BUILTIN_PROVIDERS[0] },
        { id: 'custom-1', label: 'C', baseUrl: 'https://c', authType: 'bearer' as const, models: [], requiresApiKey: true, isLocal: false, isBuiltin: false, isCustom: true },
      ],
      configuredModels: [
        { id: 'cm1', providerId: 'zhipu', providerLabel: 'Zhipu', model: 'glm-4', apiKey: 'k', status: 'active', createdAt: Date.now() },
        { id: 'cm2', providerId: 'ollama', providerLabel: 'Ollama', model: 'llama3', apiKey: '', status: 'error', createdAt: Date.now() },
      ],
      ollamaModels: [{ name: 'qwen2.5:7b' } as never],
    });
    const { result } = renderHook(() => useModelProvider());
    expect(result.current.stats.total).toBe(2);
    expect(result.current.stats.active).toBe(1);
    expect(result.current.stats.ollamaCount).toBe(1);
    expect(result.current.stats.providers).toBe(2);
    expect(result.current.stats.customProviders).toBe(1);
    // 配置过 ollama llama3 + 在线 qwen → available 含 live qwen
    expect(result.current.availableModels.some((m) => m.id === 'ollama-live-qwen2.5:7b')).toBe(true);
    expect(result.current.availableModels.some((m) => m.id === 'cm1')).toBe(true);

    act(() => result.current.openModal());
    expect(result.current.modalOpen).toBe(true);
    act(() => result.current.closeModal());
    expect(result.current.modalOpen).toBe(false);
  });

  it('兼容导出面：PROVIDERS_KEY/MODELS_KEY/load/save', () => {
    expect(PROVIDERS_KEY).toBe('yyc3_model_providers');
    expect(MODELS_KEY).toBe('yyc3_configured_models');
    useProviderSlice.setState({ providers: [] });
    expect(loadProviders().length).toBe(BUILTIN_PROVIDERS.length); // 缺失内置补齐
    saveProviders([]);
    saveModels([{ id: 'x' } as never]);
    expect(loadModels()).toEqual([{ id: 'x' }]);
  });
});

describe('useWebSocketData', () => {
  it('初始态字段齐全 + 卸载无泄漏', async () => {
    const { result, unmount } = renderHook(() => useWebSocketData());
    expect(result.current.connectionState).toBeTruthy();
    expect(result.current.liveQPS).toBeGreaterThan(0);
    expect(result.current.storageUsed).toContain('TB');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    // WS 连不上 → 模拟器兜底
    expect(['simulated', 'error', 'connecting']).toContain(result.current.connectionState);
    unmount();
  });
});

describe('useSettingsStore（legacy 兼容 hook）', () => {
  it('读取默认 toggles/values + 更新通道', () => {
    const { result } = renderHook(() => useSettingsStore());
    expect(result.current.settings).toBeTruthy();
    expect(result.current.values).toBeTruthy();
    expect(typeof result.current.toggleSetting).toBe('function');
    expect(typeof result.current.importSettings).toBe('function');
    expect(result.current.importSettings('{broken')).toBe(false);
  });
});

describe('useAIDiagnostics', () => {
  it('startDiagnosis → complete + 历史入列', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useAIDiagnostics({ liveNodes: [{ id: 'n1', gpu: 99, mem: 50, temp: 90, status: 'warning' }] } as never)
    );
    expect(result.current.status).toBe('idle');
    act(() => result.current.startDiagnosis());
    expect(result.current.status).toBe('analyzing');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.status).toBe('complete');
    expect(result.current.session?.summary).toContain('实时数据流');
    expect(result.current.history.length).toBeGreaterThan(0);
    expect(result.current.activeView).toBe('patterns');
    act(() => result.current.setActiveView?.('actions' as never));
    vi.useRealTimers();
  });
});

describe('useBigModelSDK', () => {
  const MODEL = { id: 'cm-z', providerId: 'zhipu' as const, providerLabel: 'Zhipu', model: 'glm-4-flash', apiKey: 'sk-x', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', status: 'active' as const, createdAt: 1 };

  it('PROVIDER_CAPABILITIES + 会话生命周期', () => {
    expect(PROVIDER_CAPABILITIES.length).toBe(3);
    const { result } = renderHook(() => useBigModelSDK());
    expect(result.current.getCapabilities('zhipu')).toContain('chat');
    expect(result.current.getCapabilities('unknown' as never)).toEqual([]);
    expect(result.current.hasCapability('deepseek', 'chat')).toBe(true);
    expect(result.current.hasCapability('deepseek', 'video-gen' as never)).toBe(false);

    let session: { id: string } | null = null;
    act(() => {
      session = result.current.createSession('glm-4-flash', 'Test Chat');
    });
    expect(session).toBeTruthy();
    expect(result.current.sessions.some((s) => s.id === session!.id)).toBe(true);
    act(() => result.current.deleteSession(session!.id));
    expect(result.current.sessions.some((s) => s.id === session!.id)).toBe(false);
    act(() => result.current.clearSessions());
    expect(result.current.sessions).toEqual([]);
  });

  it('sendMessage mock 路径（无 key 非 ollama）→ 回复入列 + 统计更新', async () => {
    useSDKSessionSlice.getState().setUsageStats({ totalRequests: 0, totalTokensIn: 0, totalTokensOut: 0, avgLatencyMs: 0, lastRequestAt: null, errorCount: 0 });
    const { result } = renderHook(() => useBigModelSDK());
    let sessionId = '';
    act(() => {
      sessionId = result.current.createSession('glm-4-flash').id;
    });
    const resp = await act(() => result.current.sendMessage({ ...MODEL, apiKey: '' }, '你好') as never) as unknown as { content: string; usage: { totalTokens: number } };
    expect(resp.content.length).toBeGreaterThan(0);
    expect(resp.usage.totalTokens).toBeGreaterThan(0);
    await waitFor(() => {
      const s = useSDKSessionSlice.getState().chatSessions.find((x) => x.id === sessionId);
      expect(s?.messages.length).toBe(2); // user + assistant
    });
    expect(useSDKSessionSlice.getState().usageStats.totalRequests).toBe(1);
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('sendMessage 真实路径（有 key）→ fetch 桩 OpenAI 响应', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: ' pong' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      }), { status: 200 })
    ));
    const { result } = renderHook(() => useBigModelSDK());
    const resp = await act(() => result.current.sendMessage(MODEL, 'ping', (() => {
      const s = result.current.createSession('glm-4-flash').id;
      return s;
    })()) as never) as unknown as { content: string; usage: { totalTokens: number } };
    expect(resp.content).toContain('pong');
    expect(resp.usage.totalTokens).toBe(7);
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('sendMessage 真实路径 API 失败 → error 状态', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('denied', { status: 401 })));
    const { result } = renderHook(() => useBigModelSDK());
    let sid = '';
    act(() => {
      sid = result.current.createSession('glm-4-flash').id;
    });
    const resp = await act(() => result.current.sendMessage(MODEL, 'ping', sid) as never) as unknown as { finishReason?: string };
    expect(resp.finishReason).toBe('error');
    expect(result.current.error).toBeTruthy();
    expect(result.current.connectionStatus).toBe('error');
  });
});
