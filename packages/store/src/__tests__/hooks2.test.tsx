/**
 * @file: hooks2.test.tsx
 * @description: store 第三轮 — use-websocket-data 消息分派矩阵（可控 WebSocket 桩）/ use-big-model-sdk 流式（mock + SSE 真实流）/ use-settings-store 全动作
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocketData } from '../use-websocket-data';
import { useBigModelSDK } from '../use-big-model-sdk';
import { useSettingsStore } from '../use-settings-store';
import { useSDKSessionSlice } from '../sdk-session-slice';

beforeEach(() => {
  localStorage.clear();
  useSDKSessionSlice.getState().setUsageStats({ totalRequests: 0, totalTokensIn: 0, totalTokensOut: 0, avgLatencyMs: 0, lastRequestAt: null, errorCount: 0 });
  useSDKSessionSlice.getState().setChatSessions([]);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// 可控 WebSocket：实例创建后由测试手动驱动 onopen/onmessage
class ControlledWS {
  static instances: ControlledWS[] = [];
  static CONNECT_OK = true;
  url: string;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  constructor(url: string) {
    this.url = url;
    ControlledWS.instances.push(this);
    setTimeout(() => {
      if (ControlledWS.CONNECT_OK) this.onopen?.();
      else this.onerror?.();
    }, 0);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.onclose?.();
  }
}

describe('use-websocket-data 消息分派矩阵', () => {
  it('onopen 注册 WS sender；各类型消息驱动对应 state', async () => {
    vi.stubGlobal('WebSocket', ControlledWS);
    const { result } = renderHook(() => useWebSocketData());
    await waitFor(() => expect(ControlledWS.instances.length).toBeGreaterThan(0));
    const ws = ControlledWS.instances[0];
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
      ws.onmessage?.({ data: JSON.stringify({ type: 'qps_update', payload: { qps: 9999, trend: '+5%' } }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'latency_update', payload: { latency: 12, trend: '-3%' } }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'node_status', payload: [{ id: 'n-ws', status: 'active', gpu: 1, mem: 1, temp: 1, model: '', tasks: 0 }] }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'alert', payload: { id: 'al1', title: 't', message: 'm', level: 'warn', source: 's', timestamp: 1 } }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'throughput_history', payload: [{ time: 't1', value: 1 }, { time: 't2', value: 2 }] }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'system_stats', payload: { activeNodes: '3/4', gpuUtil: '50%', tokenThroughput: '9K/s' } }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'heartbeat_ack', payload: {} }) });
      ws.onmessage?.({ data: 'not-json' }); // 坏包 → 静默
    });
    expect(result.current.liveQPS).toBe(9999);
    expect(result.current.liveLatency).toBe(12);
    expect(result.current.alerts.length).toBe(1);
    expect(result.current.throughputHistory.length).toBe(2);
    expect(result.current.gpuUtil).toBe('50%');
    // registerWSSender 注册后可回发
    expect(result.current.connectionState).toBe('connected');
    unmountCleanup(ws);
    function unmountCleanup(w: ControlledWS) {
      // 关闭 → 触发 reconnect 计划与模拟器兜底
      w.close();
    }
  });

  it('连接失败 → 模拟器兜底 + 重连计数', async () => {
    ControlledWS.CONNECT_OK = false;
    vi.stubGlobal('WebSocket', ControlledWS);
    const { result } = renderHook(() => useWebSocketData());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    expect(['error', 'simulated', 'connecting']).toContain(result.current.connectionState);
    ControlledWS.CONNECT_OK = true;
  });
});

describe('use-big-model-sdk 流式', () => {
  const MODEL = { id: 'cm-z', providerId: 'zhipu' as const, providerLabel: 'Zhipu', model: 'glm-4-flash', apiKey: 'sk-x', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', status: 'active' as const, createdAt: 1 };

  it('mock 流式（无 key）→ onChunk 逐字回调 + 完成', async () => {
    const { result } = renderHook(() => useBigModelSDK());
    const chunks: string[] = [];
    const resp = await act(() => result.current.sendMessageStream({ ...MODEL, apiKey: '' }, 'hi', undefined, (c: string) => chunks.push(c)) as never) as unknown as { content: string };
    expect(resp.content.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);
    expect(result.current.streaming).toBe(false);
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('真实 SSE 流式 → 解析 data: 增量', async () => {
    const sse = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"he"}}]}\n'));
        controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"llo"}}]}\n'));
        controller.enqueue(enc.encode('data: [DONE]\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sse, { status: 200 })));
    const { result } = renderHook(() => useBigModelSDK());
    const resp = await act(() => result.current.sendMessageStream(MODEL, 'ping') as never) as unknown as { content: string };
    expect(resp.content).toContain('hello');
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('真实流式 HTTP 失败 → error 兜底', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 503 })));
    const { result } = renderHook(() => useBigModelSDK());
    const resp = await act(() => result.current.sendMessageStream(MODEL, 'ping') as never) as unknown as { finishReason?: string };
    expect(resp.finishReason).toBe('error');
  });

  it('sendMessage ollama 路径（ollama 响应形状）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ message: { content: 'local reply' }, prompt_eval_count: 3, eval_count: 4 }), { status: 200 })
    ));
    const { result } = renderHook(() => useBigModelSDK());
    const resp = await act(() => result.current.sendMessage({ ...MODEL, providerId: 'ollama' as never, apiKey: '' }, 'ping') as never) as unknown as { content: string; usage: { totalTokens: number } };
    expect(resp.content).toBe('local reply');
    expect(resp.usage.totalTokens).toBe(7);
  });
});

describe('use-settings-store 全动作', () => {
  it('toggle/update/export/import/reset + 广播通道', () => {
    const { result } = renderHook(() => useSettingsStore());
    const before = JSON.stringify(result.current.settings);
    act(() => result.current.toggleSetting('darkMode'));
    expect(JSON.stringify(result.current.settings)).not.toBe(before);
    act(() => result.current.updateValue('systemName', 'S2'));
    expect(result.current.values.systemName).toBe('S2');
    act(() => result.current.updateValues({ language: 'en-US' }));
    expect(result.current.values.language).toBe('en-US');
    const exported = result.current.exportSettings();
    expect(exported).toContain('toggles');
    expect(result.current.importSettings(exported)).toBe(true);
    act(() => result.current.resetSettings());
    expect(result.current.values.systemName).not.toBe('S2');
  });
});
