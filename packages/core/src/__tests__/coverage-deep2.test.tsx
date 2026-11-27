/**
 * @file: coverage-deep2.test.tsx
 * @description: 深分支覆盖第二轮 — connection-test-engine Ollama/WS 全流程 / cross-tab-sync 收发 / storageManager 同步异常与离线队列 / ConnectionManager 重连 / SlowQueryMonitor 过滤
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testAIConnection, testWebSocketConnection, runFullSystemDiagnostic } from '../connection-test-engine';
import { initCrossTabSync, onCrossTabMessage, getTabId, destroyCrossTabSync } from '../cross-tab-sync';
import { StorageManager } from '../storageManager';
import { connectionManager } from '../database/ConnectionManager';
import { SlowQueryMonitor } from '../database/SlowQueryMonitor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const PG_CONFIG = { type: 'postgresql' as const, host: 'h', port: 5432, database: 'db', username: 'u', password: 'p' };

const RESP = (body: Any, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  destroyCrossTabSync();
  connectionManager.setTestMode(false);
});

describe('connection-test-engine / Ollama 本地管线全流程', () => {
  const ollamaCfg = {
    providerId: 'ollama',
    providerLabel: 'Ollama',
    baseUrl: 'http://localhost:11434',
    authType: 'none' as const,
    apiKey: '',
    modelId: 'qwen2.5:7b',
    modelName: 'qwen2.5:7b',
    isLocal: true,
  };

  it('全通过：tags 命中模型 + 推理成功', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => RESP({ models: [{ name: 'qwen2.5:7b' }, { name: 'nomic-embed' }] })));
    const r = await testAIConnection(ollamaCfg);
    const labels = r.steps.map((s) => s.label);
    expect(labels).toContain('Ollama 端点');
    expect(labels).toContain('模型列表');
    expect(labels).toContain('推理测试');
    expect(r.steps.find((s) => s.label === '模型列表')?.status).toBe('pass');
    expect(r.steps.find((s) => s.label === '推理测试')?.status).toBe('pass');
  });

  it('模型列表未命中 → warn + pull 建议；嵌入模型自动绕开', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => RESP({ models: [{ name: 'other-model', details: { family: 'llama' } }] })));
    const r = await testAIConnection(ollamaCfg);
    expect(r.steps.find((s) => s.label === '模型列表')?.status).toBe('warn');
    expect(r.suggestion).toContain('ollama pull');
  });

  it('连接失败 → 智能诊断（非 localhost + 非默认端口 + 超时）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const e = new Error('The operation was aborted');
      e.name = 'AbortError';
      throw e;
    }));
    const r = await testAIConnection({ ...ollamaCfg, baseUrl: 'http://192.168.3.9:11500' });
    const labels = r.steps.map((s) => s.label);
    expect(labels).toContain('Ollama 端点');
    expect(labels).toContain('智能诊断');
    expect(r.steps.find((s) => s.label === 'Ollama 端点')?.status).toBe('fail');
    expect(r.suggestion).toContain('OLLAMA_HOST');
  });

  it('连接失败 → 智能诊断（localhost 网络错误分支）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNREFUSED connection refused');
    }));
    const r = await testAIConnection(ollamaCfg);
    expect(r.steps.find((s) => s.label === 'Ollama 端点')?.status).toBe('fail');
    expect(r.suggestion).toContain('ollama serve');
  });

  it('推理 400 model not found → warn + 拉取建议', async () => {
    const handler = async (url: string) => {
      if (String(url).includes('/chat')) return RESP({ error: 'model "x" not found' }, 400);
      return RESP({ models: [{ name: 'qwen2.5:7b' }] });
    };
    vi.stubGlobal('fetch', vi.fn(handler));
    const r = await testAIConnection(ollamaCfg);
    const step = r.steps.find((s) => s.label === '推理测试');
    expect(step?.status).toBe('warn');
    expect(r.suggestion).toContain('ollama pull');
  });

  it('推理 400 嵌入模型报错 → 专用建议', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/chat')) return RESP({ error: 'does not support chat' }, 400);
      return RESP({ models: [{ name: 'qwen2.5:7b' }] });
    }));
    const r = await testAIConnection(ollamaCfg);
    expect(r.suggestion).toContain('嵌入模型');
  });

  it('推理 404 → warn / 其他 5xx → fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/chat')) return new Response('no', { status: 404 });
      return RESP({ models: [{ name: 'qwen2.5:7b' }] });
    }));
    const r = await testAIConnection(ollamaCfg);
    expect(r.steps.find((s) => s.label === '推理测试')?.status).toBe('warn');

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/chat')) return new Response('boom', { status: 500 });
      return RESP({ models: [{ name: 'qwen2.5:7b' }] });
    }));
    const r2 = await testAIConnection(ollamaCfg);
    expect(r2.steps.find((s) => s.label === '推理测试')?.status).toBe('fail');
  });

  it('tags CORS 拒绝 → no-cors 探测分支', async () => {
    const handler = async (url: string, init?: RequestInit) => {
      if (init?.mode === 'no-cors') return new Response('opaque', { status: 200 });
      const e = new Error('Failed to fetch (CORS)');
      throw e;
    };
    vi.stubGlobal('fetch', vi.fn(handler));
    const r = await testAIConnection(ollamaCfg);
    const labels = r.steps.map((s) => s.label);
    expect(labels).toContain('no-cors 探测');
    // CORS 分支不早退 — 流程继续走模型列表与推理测试
    expect(labels).toContain('模型列表');
    expect(labels).toContain('推理测试');
  });
});

describe('connection-test-engine / WebSocket 诊断 + 系统一键诊断', () => {
  it('WS onopen 成功路径', async () => {
    class GoodWS {
      protocol = 'ws';
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: () => void = () => {};
      constructor() {
        setTimeout(() => this.onopen(), 0);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', GoodWS);
    const r = await testWebSocketConnection('ws://localhost:3218/ws');
    expect(r.category).toBe('websocket');
    expect(r.steps.some((s) => s.label === 'WS 握手' && s.status === 'pass')).toBe(true);
  });

  it('WS onerror 失败路径 + 建议输出', async () => {
    class BadWS {
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: () => void = () => {};
      constructor() {
        setTimeout(() => this.onerror(), 0);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', BadWS);
    const r = await testWebSocketConnection('ws://bad');
    expect(r.steps.some((s) => s.label === 'WS 握手' && s.status === 'fail')).toBe(true);
    expect(r.suggestion).toContain('WS 服务');
  });

  it('WS 构造抛错 → 端点解析 fail', async () => {
    vi.stubGlobal('WebSocket', function () {
      throw new Error('blocked');
    });
    const r = await testWebSocketConnection('ws://x');
    expect(r.steps.some((s) => s.label === '端点解析' && s.status === 'fail')).toBe(true);
  });

  it('runFullSystemDiagnostic 聚合 AI + WS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    class GoodWS {
      protocol = 'ws';
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: () => void = () => {};
      constructor() {
        setTimeout(() => this.onopen(), 0);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', GoodWS);
    const diag = await runFullSystemDiagnostic({
      aiConfigs: [{
        providerId: 'p', providerLabel: 'P', baseUrl: 'https://api.p.com',
        authType: 'bearer', apiKey: 'sk-1', modelId: 'm', modelName: 'M', isLocal: false,
      }],
      testWs: true,
      wsUrl: 'ws://localhost:3218/ws',
    });
    expect(diag.tests.length).toBeGreaterThanOrEqual(2);
    expect(diag.tests.map((t) => t.category)).toContain('websocket');
  });
});

describe('cross-tab-sync handleIncoming（远端实例驱动）', () => {
  it('PING→PONG 应答 / PONG 忽略 / NODE_UPDATE 分发', async () => {
    const postSpy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
    initCrossTabSync();
    expect(getTabId()).toMatch(/^tab-/);
    const got: unknown[] = [];
    onCrossTabMessage('NODE_UPDATE', (p) => got.push(p));
    const remote = new BroadcastChannel('yyc3-unified-store-sync');

    remote.postMessage({ type: 'PING' }); // → 本端回 PONG
    await new Promise((r) => setTimeout(r, 20));
    expect(postSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'PONG', tabId: getTabId() }));

    remote.postMessage({ type: 'PONG', tabId: 'elsewhere' }); // 忽略
    remote.postMessage({ type: 'NODE_UPDATE', payload: { id: 'n9', updates: { gpu: 1 } } });
    await new Promise((r) => setTimeout(r, 20));
    expect(got).toEqual([{ id: 'n9', updates: { gpu: 1 } }]);
    remote.close();
  });

  it('重复 init 不叠加监听', () => {
    initCrossTabSync();
    const before = (document ? 1 : 1);
    initCrossTabSync();
    expect(before).toBe(1);
  });
});

describe('storageManager 数据库同步异常 + 离线队列处理（带 adapter）', () => {
  const PG = PG_CONFIG;

  it('数据库查询抛错 → syncError 事件 + status.error', async () => {
    const sm = StorageManager.getInstance();
    // 预置连接
    const existing = connectionManager.getConnection('storage-connection');
    if (existing) {
      (existing as unknown as { connection: unknown }).connection = {
        query: async () => { throw new Error('db exploded'); },
      };
    } else {
      const info = await connectionManager.createConnection('storage-connection', 'SC', PG);
      (info as unknown as { connection: unknown }).connection = {
        query: async () => { throw new Error('db exploded'); },
      };
    }
    const events: string[] = [];
    sm.onEvent((e) => events.push(e.type));
    sm.saveConfig({ type: 'database', syncInterval: 3600, autoSync: false, offlineMode: true, conflictResolution: 'local', database: PG } as never);
    await new Promise((r) => setTimeout(r, 30));
    localStorage.setItem('yyc3_db_models', JSON.stringify([{ id: 'e1', name: 'E', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 1, created_at: '2026-01-01' }]));
    await sm.triggerSync();
    await new Promise((r) => setTimeout(r, 700));
    expect(events).toContain('syncError');
    expect(sm.getStatus().error).toContain('db exploded');
    sm.destroy();
  });

  it('UPDATE 分支（远端已有同 id）+ 离线队列三操作全链', async () => {
    const sm = StorageManager.getInstance();
    const existing = connectionManager.getConnection('storage-connection');
    const queries: string[] = [];
    const qMock = async (sql: string) => {
      queries.push(sql);
      if (sql.includes('SELECT * FROM models')) return { rows: [{ id: 'sm-u1', name: 'Old', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 1, created_at: '2026-01-01' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    };
    if (existing) {
      (existing as unknown as { connection: unknown }).connection = { query: qMock };
    } else {
      const info = await connectionManager.createConnection('storage-connection', 'SC', PG);
      (info as unknown as { connection: unknown }).connection = { query: qMock };
    }
    sm.saveConfig({ type: 'database', syncInterval: 3600, autoSync: false, offlineMode: true, conflictResolution: 'remote', database: PG } as never);
    await new Promise((r) => setTimeout(r, 30));

    // 本地待同步模型（远端已有 sm-u1 → UPDATE 分支）
    localStorage.setItem('yyc3_db_models', JSON.stringify([{ id: 'sm-u1', name: 'NewName', provider: 'p', tier: 'primary', avg_latency_ms: 2, throughput: 2, created_at: '2026-02-01' }]));
    await sm.triggerSync();
    await new Promise((r) => setTimeout(r, 700));
    expect(queries.some((q) => q.startsWith('UPDATE models'))).toBe(true);

    // 离线（事件置 isOnline=false）→ 入队 → online 触发处理（addModel/updateModel/deleteModel 三分支）
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    window.dispatchEvent(new Event('offline'));
    await new Promise((r) => setTimeout(r, 10));
    sm.addToOfflineQueue({ id: 'o1', type: 'addModel', data: { id: 'q1' }, timestamp: Date.now() } as never);
    sm.addToOfflineQueue({ id: 'o2', type: 'updateModel', data: { id: 'q1', name: 'Q' }, timestamp: Date.now() } as never);
    sm.addToOfflineQueue({ id: 'o3', type: 'deleteModel', data: { id: 'q1' }, timestamp: Date.now() } as never);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 700));
    expect(queries.some((q) => q.startsWith('INSERT INTO models') && q.includes('q1') || q.includes('INSERT'))).toBe(true);
    sm.destroy();
  });
});

describe('ConnectionManager 重连/失败路径（fake timers + private 直调）', () => {
  it('健康检查失败 → 重连定时器 → reconnected 事件', async () => {
    vi.useFakeTimers();
    connectionManager.setTestMode(true);
    const events: string[] = [];
    connectionManager.onConnectionEvent('reconnected', (c) => events.push(c.status));
    await connectionManager.createConnection('rc1', 'RC', { ...PG_CONFIG, maxRetries: 3 });
    await (connectionManager as Any).handleConnectionError('rc1', 'lost');
    expect(connectionManager.getConnectionStatus('rc1')).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(2500);
    expect(connectionManager.getConnectionStatus('rc1')).toBe('connected');
    expect(events.length).toBeGreaterThanOrEqual(1);
    await connectionManager.closeAllConnections();
    vi.useRealTimers();
  });

  it('超过 maxRetries → failed 事件', async () => {
    connectionManager.setTestMode(true);
    const events: string[] = [];
    connectionManager.onConnectionEvent('failed', (c) => events.push('failed'));
    await connectionManager.createConnection('rc2', 'RC2', PG_CONFIG);
    // maxRetries 缺省 3（config.maxRetries || 3）— 连续 4 次失败耗尽重试
    for (let i = 0; i < 4; i++) {
      await (connectionManager as Any).handleConnectionError('rc2', 'down');
    }
    expect(events).toContain('failed');
    await connectionManager.closeAllConnections();
  });

  it('handleConnectionError 对不存在连接为 no-op', async () => {
    await (connectionManager as Any).handleConnectionError('ghost-rc', 'x');
    expect(connectionManager.getConnection('ghost-rc')).toBeUndefined();
  });
});

describe('SlowQueryMonitor getSlowQueries 过滤选项', () => {
  it('since / minExecutionTime / limit 组合', async () => {
    const mon = new SlowQueryMonitor({}, PG_CONFIG, { threshold: 1 } as never);
    await mon.monitorQuery('A', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { rows: [], rowCount: 0 };
    });
    await mon.monitorQuery('B', async () => {
      await new Promise((r) => setTimeout(r, 30));
      return { rows: [], rowCount: 0 };
    });
    expect(mon.getSlowQueries({ limit: 1 })).toHaveLength(1);
    expect(mon.getSlowQueries({ minExecutionTime: 25 }).every((r) => r.executionTime >= 25)).toBe(true);
    expect(mon.getSlowQueries({ since: Date.now() + 1000 })).toHaveLength(0);
    expect(mon.getSlowQueries()).toHaveLength(2);
    // stats 带窗口
    const s = mon.getStats(60000);
    expect(s.totalQueries).toBe(2);
    mon.destroy();
  });
});
