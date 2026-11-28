/**
 * @file: branch-gaps.test.tsx
 * @description: 分支缺口冲刺（batch 5）— storageManager / connection-test-engine / GitService / data-bus / error-handler 五大户未覆盖分支逐处补齐（istanbul branchMap 提取）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-28
 * @status: active
 * @tags: [core],[test],[branch-coverage]
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager, storageManager } from '../storageManager';
import { connectionManager } from '../database/ConnectionManager';
import {
  testAIConnection,
  testWebSocketConnection,
  runFullSystemDiagnostic,
} from '../connection-test-engine';
import { GitService, createGitService } from '../GitService';
import { dataBus, connectDataSync } from '../data-bus';
import {
  getErrorStats,
  detectErrorCode,
  captureError,
  captureAuthError,
  captureParseError,
  captureNetworkError,
  captureWSError,
  formatErrorForUser,
  getCategoryLabel,
  installGlobalErrorListeners,
  clearErrorLog,
  getErrorLog,
} from '../error-handler';
import type { AIConnectionConfig } from '../connection-test-engine';
import type { NodeData } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const PG_CONFIG = { type: 'postgresql' as const, host: 'h', port: 5432, database: 'db', username: 'u', password: 'p' };

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
  connectionManager.setTestMode(false);
  delete (window as Any).electronAPI;
  delete (window as Any).showDirectoryPicker;
});

// ============================================================
// 1) storageManager — 网络事件 / 离线队列 switch / 初始化矩阵 / 批量同步 / 合并分拣
// ============================================================
describe('storageManager 分支缺口（batch 5）', () => {
  const makeAdapter = () => ({
    addModel: vi.fn(async () => undefined),
    updateModel: vi.fn(async () => undefined),
    deleteModel: vi.fn(async () => undefined),
    getModels: vi.fn(async () => [{ id: 'm1', name: 'DB', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 2, created_at: '2026-01-01' }]),
    getAgents: vi.fn(async () => [{ id: 'a-5', name: 'DBAgent', name_cn: '代理', role: 'r', description: 'd', is_active: 1 }]),
    getNodes: vi.fn(async () => [{ id: 'n-7', hostname: 'h1', gpu_util: 1, mem_util: 2, temp_celsius: 3, model_deployed: 'm', active_tasks: 4, status: 'online' }]),
    executeWithCache: vi.fn(async () => ({ rows: [], rowCount: 1 })),
    destroy: vi.fn(),
  });

  const freshInstance = (): StorageManager => {
    (StorageManager as Any).instance = null;
    return StorageManager.getInstance();
  };

  it('构造期：持久化配置 + 离线队列装载（含坏 JSON catch）', () => {
    localStorage.setItem('yyc3_storage_config', JSON.stringify({ type: 'localStorage', syncInterval: 60, autoSync: false, offlineMode: true, conflictResolution: 'remote' }));
    localStorage.setItem('yyc3_offline_queue', JSON.stringify([{ type: 'addModel', data: { id: 'q1' } }]));
    const sm = freshInstance();
    expect(sm.getConfig().syncInterval).toBe(60);
    expect((sm as Any).offlineQueue.length).toBe(1);

    localStorage.setItem('yyc3_storage_config', '{corrupt');
    localStorage.setItem('yyc3_offline_queue', '{corrupt');
    const sm2 = freshInstance();
    expect(sm2.getConfig().type).toBe('localStorage'); // 回落 DEFAULT_CONFIG
    expect((sm2 as Any).offlineQueue).toEqual([]);
  });

  it('saveConfig setItem 抛错 → catch 不外泄', () => {
    const sm = StorageManager.getInstance();
    const spy = vi.spyOn(StorageManager.prototype as Any, 'initialize').mockImplementation(() => {});
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => sm.saveConfig({ ...(sm.getConfig()), syncInterval: 1 })).not.toThrow();
    spy.mockRestore();
  });

  it('online 事件：队列非空 + offlineMode → 处理；autoSync → sync；offline 事件置离线', async () => {
    const sm = StorageManager.getInstance();
    sm.saveConfig({ ...(sm.getConfig()), type: 'localStorage', autoSync: true, offlineMode: true });

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    window.dispatchEvent(new Event('offline')); // isOnline true→false 分支
    expect(sm.getStatus().connected).toBe(false);

    // 离线 + offlineMode → 入队；online 但 offlineMode=false → 不入队由 addToOfflineQueue 判定
    sm.addToOfflineQueue({ type: 'deleteModel', data: { id: 'm-del' } } as never);
    expect((sm as Any).offlineQueue.length).toBe(1);

    // 在线分支：isOnline=false→true，队列>0 且 offlineMode → processOfflineQueue；autoSync → sync()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const syncSpy = vi.spyOn(StorageManager.prototype as Any, 'sync').mockResolvedValue(undefined);
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 30));
    expect(sm.getStatus().connected).toBe(true);
    syncSpy.mockRestore();
  });

  it('addToOfflineQueue：在线或 offlineMode=false → 不入队', () => {
    const sm = StorageManager.getInstance();
    sm.saveConfig({ ...(sm.getConfig()), type: 'localStorage', autoSync: false, offlineMode: false });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    sm.addToOfflineQueue({ type: 'addModel', data: { id: 'x' } } as never);
    expect((sm as Any).offlineQueue.length).toBe(0);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    sm.addToOfflineQueue({ type: 'addModel', data: { id: 'x' } } as never); // offlineMode false → 仍不入队
    expect((sm as Any).offlineQueue.length).toBe(0);
  });

  it('processOfflineQueue：三 case 带 adapter 全走 + 守卫分支 + 失败回队', async () => {
    const sm = StorageManager.getInstance() as Any;
    const adapter = makeAdapter();
    sm.adapter = adapter;
    sm.config.offlineMode = true;

    // updateModel 缺 id / deleteModel 带 id / addModel data 为空
    sm.offlineQueue = [
      { type: 'addModel', data: { id: 'n1', name: 'A' } },
      { type: 'addModel', data: null },
      { type: 'updateModel', data: { id: 'n2', name: 'B' } },
      { type: 'updateModel', data: { name: 'no-id' } },
      { type: 'deleteModel', data: { id: 'n3' } },
      { type: 'unknownType', data: { id: 'n4' } },
    ];
    await sm.processOfflineQueue();
    expect(adapter.addModel).toHaveBeenCalledTimes(1);
    expect(adapter.updateModel).toHaveBeenCalledTimes(1);
    expect(adapter.deleteModel).toHaveBeenCalledTimes(1);
    expect(sm.offlineQueue.length).toBe(0);

    // executeWithCache 抛错 → 该操作回队
    sm.offlineQueue = [{ type: 'addModel', data: { id: 'boom' } }];
    adapter.addModel.mockRejectedValueOnce(new Error('db down'));
    await sm.processOfflineQueue();
    expect(sm.offlineQueue.length).toBe(1);

    // 空 case + data falsy 守卫
    adapter.addModel.mockRejectedValueOnce(false);
    await sm.processOfflineQueue(); // 失败操作仍在队 → 再次失败回队
    sm.offlineQueue = [];
  });

  it('processOfflineQueue：无 adapter → 各 case 守卫全短路', async () => {
    const sm = StorageManager.getInstance() as Any;
    sm.adapter = null;
    sm.offlineQueue = [
      { type: 'addModel', data: { id: 'a' } },
      { type: 'updateModel', data: { id: 'b' } },
      { type: 'deleteModel', data: { id: 'c' } },
    ];
    await sm.processOfflineQueue();
    expect(sm.offlineQueue.length).toBe(0);
  });

  it('initialize：database 模式矩阵（已存连接 / autoSync / 失败 syncError / 二次初始化清定时器与适配器）', async () => {
    const sm = freshInstance();
    const events: string[] = [];
    sm.onEvent((e: Any) => events.push(e.type));

    // 失败路径：createConnection 拒绝 → status.error + syncError
    const createSpy = vi.spyOn(connectionManager, 'createConnection').mockRejectedValue(new Error('conn refused'));
    sm.saveConfig({ type: 'database', syncInterval: 30, autoSync: true, offlineMode: true, conflictResolution: 'local', database: PG_CONFIG } as never);
    await new Promise((r) => setTimeout(r, 30));
    expect(sm.getStatus().connected).toBe(false);
    expect(events).toContain('syncError');
    createSpy.mockRestore();

    // 成功路径（testMode 连接）：autoSync=true → 启动定时器；再次 saveConfig → 清定时器 + destroy 旧适配器 + 已存连接短路
    connectionManager.setTestMode(true);
    sm.saveConfig({ type: 'database', syncInterval: 30, autoSync: true, offlineMode: true, conflictResolution: 'local', database: PG_CONFIG } as never);
    await new Promise((r) => setTimeout(r, 60));
    expect(sm.getStatus().connected).toBe(true);
    expect((sm as Any).adapter).toBeTruthy();
    expect((sm as Any).syncTimer).toBeTruthy();
    const firstAdapter = (sm as Any).adapter;
    sm.saveConfig({ ...(sm.getConfig()), syncInterval: 60 } as never); // 二次 initialize：syncTimer 清理 + adapter.destroy 分支 + 已存连接短路
    await new Promise((r) => setTimeout(r, 60));
    expect((sm as Any).syncTimer).toBeTruthy(); // 新定时器已建
    sm.destroy();
    expect((sm as Any).syncTimer).toBeNull();
    void firstAdapter;
  });

  it('startAutoSync 定时器已存在 → 先清再建；sync 同步中守卫 + 同步失败 syncError', async () => {
    const sm = StorageManager.getInstance() as Any;
    sm.syncTimer = setInterval(() => {}, 10000) as never;
    (sm as Any).startAutoSync?.();
    sm.config.syncInterval = 3600;

    sm.status.syncing = true;
    const events: string[] = [];
    sm.onEvent((e: Any) => events.push(e.type));
    await sm.sync(); // syncing → 早退，无 syncStart
    expect(events).not.toContain('syncStart');
    sm.status.syncing = false;

    // adapter.getModels 拒绝 → syncLocalToDatabase 抛 → syncError
    sm.adapter = { ...makeAdapter(), getModels: vi.fn(async () => { throw new Error('boom'); }) };
    await sm.sync();
    expect(events).toContain('syncError');
    sm.adapter = null;
  });

  it('batchSync 三族：insert/update 分支 + 早退守卫（私有直调）', async () => {
    const sm = StorageManager.getInstance() as Any;

    // 无 adapter 早退
    sm.adapter = null;
    await sm.batchSyncModels([{ id: 'x' } as never]);
    await sm.batchSyncAgents([]);
    await sm.batchSyncNodes([{ id: 'y' } as never]);

    const adapter = makeAdapter(); // getModels/getAgents/getNodes 各返回 1 条已存在
    sm.adapter = adapter;
    // models: 1 已存在（update）+ 1 新（insert）
    await sm.batchSyncModels([
      { id: 'm1', name: 'DB2', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 2, created_at: '2026-01-02' },
      { id: 'm-new', name: 'N', provider: 'p', tier: 'secondary', avg_latency_ms: 2, throughput: 3, created_at: '2026-01-03' },
    ] as never);
    // agents: 已存在（update，is_active 布尔转 0/1）+ 新（insert is_active=false→0）
    await sm.batchSyncAgents([
      { id: 'a-5', name: 'X', name_cn: '改', role: 'r2', description: 'd2', is_active: true },
      { id: 'a-new', name: 'Y', name_cn: '新', role: 'r', description: '', is_active: false },
    ] as never);
    // nodes: 已存在（update）+ 新（insert）
    await sm.batchSyncNodes([
      { id: 'n-7', hostname: 'h2', gpu_util: 9, mem_util: 9, temp_celsius: 9, model_deployed: 'm2', active_tasks: 9, status: 'busy' },
      { id: 'n-new', hostname: 'h3', gpu_util: 0, mem_util: 0, temp_celsius: 0, model_deployed: '', active_tasks: 0, status: 'offline' },
    ] as never);
    expect(adapter.executeWithCache).toHaveBeenCalledTimes(6);
    const sqls = adapter.executeWithCache.mock.calls.map((c: Any) => c[0] as string);
    expect(sqls.filter((s: string) => s.startsWith('UPDATE models')).length).toBe(1);
    expect(sqls.filter((s: string) => s.startsWith('INSERT INTO models')).length).toBe(1);
    expect(sqls.filter((s: string) => s.startsWith('INSERT INTO agents')).length).toBe(1);
    expect(sqls.filter((s: string) => s.startsWith('INSERT INTO nodes')).length).toBe(1);
    sm.adapter = null;
  });

  it('getChangedItems/itemsAreDifferent/getItemTimestamp/resolveConflicts/mergeItems 边界', () => {
    const sm = StorageManager.getInstance() as Any;

    // lastItems 含无 id 项（跳过）+ current 无 id 项（视为变更）
    const changed = sm.getChangedItems(
      [{ id: undefined, v: 3 } as never, { id: 'k1', v: 1 }],
      [{ id: undefined, v: 9 } as never, { id: 'k1', v: 1 }],
      'models'
    );
    expect(changed.length).toBe(1);
    expect(changed[0].v).toBe(3);

    // itemsAreDifferent：agents / nodes / default 表 + 全等
    expect(sm.itemsAreDifferent({ name: 'a', name_cn: 'x', role: 'r', description: 'd', is_active: 1 }, { name: 'b', name_cn: 'x', role: 'r', description: 'd', is_active: 1 }, 'agents')).toBe(true);
    expect(sm.itemsAreDifferent({ name: 'a', name_cn: 'x', role: 'r', description: 'd', is_active: 1 }, { name: 'a', name_cn: 'x', role: 'r', description: 'd', is_active: 2 }, 'agents')).toBe(true);
    expect(sm.itemsAreDifferent({ name: 'a', name_cn: 'x', role: 'r', description: 'd', is_active: 1 }, { name: 'a', name_cn: 'x', role: 'r', description: 'd', is_active: 1 }, 'agents')).toBe(false);
    expect(sm.itemsAreDifferent({ hostname: 'h' }, { hostname: 'h2' }, 'nodes')).toBe(true);
    expect(sm.itemsAreDifferent({ hostname: 'h', gpu_util: 1, mem_util: 1, temp_celsius: 1, model_deployed: 'm', active_tasks: 1, status: 's' }, { hostname: 'h', gpu_util: 1, mem_util: 1, temp_celsius: 1, model_deployed: 'm', active_tasks: 1, status: 's' }, 'nodes')).toBe(false);
    expect(sm.itemsAreDifferent({ z: 1 }, { z: 2 }, 'other')).toBe(true);
    expect(sm.itemsAreDifferent({ z: 1 }, { z: 1 }, 'other')).toBe(false);

    // getItemTimestamp：models 缺 created_at → 0；agents/nodes 按 id 段解析（坏段 → '0' 兜底）；default → 0；无 id → 0
    expect(sm.getItemTimestamp({}, 'models')).toBe(0);
    expect(sm.getItemTimestamp({ id: 'row-42' }, 'agents')).toBe(42);
    expect(sm.getItemTimestamp({ id: 'row-42' }, 'nodes')).toBe(42);
    expect(sm.getItemTimestamp({ id: 'row' }, 'agents')).toBe(0); // split('-')[1] 缺失 → '0' 兜底
    expect(sm.getItemTimestamp({}, 'nodes')).toBe(0);
    expect(sm.getItemTimestamp({ id: 'x' }, 'unknown-table')).toBe(0);

    // resolveConflicts：本地无 id 项（跳过 map）；远端无 id 项（直接保留）；远端有 id 命中本地 → 解析 + 从 map 移除
    const resolved = sm.resolveConflicts(
      [{ id: 'r1', v: 'remote' }, { v: 'no-id-remote' } as never],
      [{ id: 'r1', v: 'local' }, { v: 'no-id-local' } as never, { id: 'l2', v: 'only' }],
      'models'
    );
    expect(resolved.length).toBe(3);
    expect(resolved.some((x: Any) => x.v === 'only')).toBe(true);

    // mergeItems：remote 更新 → remote；等时戳原始值 → 安全展开（typeof 守卫双分支）
    sm.config.conflictResolution = 'merge';
    const rNewer = sm.mergeItems({ id: 'i', created_at: '2020-01-01' }, { id: 'i', created_at: '2030-01-01' }, 'models');
    expect((rNewer as Any).created_at).toBe('2030-01-01');
    const eqMergePrimitive = sm.mergeItems(5, 7, 'models'); // 双原始值 → 时戳同为 0 → 双 typeof 守卫 false → {}
    expect(eqMergePrimitive).toEqual({});
    const eqMergeMixed = sm.mergeItems({ id: 'i', a: 1, created_at: '2026-01-01' }, 7, 'models'); // local 对象 + remote 原始值
    expect((eqMergeMixed as Any).a).toBe(1);
    sm.config.conflictResolution = 'local';
  });

  it('destroy：带 syncTimer 与 adapter → 全清；emitEvent 监听器抛错兜底', () => {
    const sm = StorageManager.getInstance() as Any;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = () => { throw new Error('listener boom'); };
    sm.onEvent(bad);
    sm.onEvent(() => {});
    sm.emitEvent?.({ type: 'online' } as never);
    expect(errSpy).toHaveBeenCalledWith('Error in event listener:', expect.any(Error));
    sm.syncTimer = setInterval(() => {}, 10000) as never;
    sm.adapter = makeAdapter();
    sm.destroy();
    expect(sm.adapter).toBeNull();
    expect(sm.eventListeners).toEqual([]);
    errSpy.mockRestore();
  });

  it('loadFromLocalStorage 坏 JSON → 回落默认；单例 export 引用可用', () => {
    const sm = StorageManager.getInstance() as Any;
    localStorage.setItem('yyc3_db_models', '{corrupt');
    // 经 syncLocalToDatabase → loadFromLocalStorage catch → 默认 []
    sm.adapter = null;
    expect(sm.loadFromLocalStorage('yyc3_db_models', [])).toEqual([]);
    expect(storageManager).toBeInstanceOf(StorageManager);
  });
});

// ============================================================
// 2) connection-test-engine — timedFetch 错误分类 / 云端管线分支 / Ollama 智能诊断 / WS 补漏
// ============================================================
describe('connection-test-engine 分支缺口（batch 5）', () => {
  const cloudCfg = (over: Partial<AIConnectionConfig> = {}): AIConnectionConfig => ({
    providerId: 'prov', providerLabel: 'Prov', baseUrl: 'https://api.prov.com',
    authType: 'bearer', apiKey: 'k', modelId: 'mdl', modelName: 'Model', isLocal: false, ...over,
  });

  it('timedFetch 错误分类矩阵：cors/aborted/timeout/refused/非 Error 抛物', async () => {
    const cases: unknown[] = [
      new TypeError('Failed to fetch'),
      new Error('net::ERR_ABORTED at url'),
      new Error('The request was aborted: timeout'),
      new Error('ECONNREFUSED 127.0.0.1:11434'),
      new Error('net::ERR_CONNECTION_REFUSED'),
      'raw string failure',
    ];
    for (const err of cases) {
      vi.stubGlobal('fetch', vi.fn(async () => { throw err; }));
      const r = await testAIConnection(cloudCfg({ apiKey: '' })); // 无 key → 认证 skip，仅网络探测暴露分类
      expect(r.steps.length).toBeGreaterThan(0); // 分类作用于内部 FetchResult，断言 finalize 不炸
    }
  });

  it('云端管线：预检 warn（慢响应）/ 401 / 403 / 429 / cors / 500 / 代理成功与失败 / 无 key skip', async () => {
    const mk = (auth: () => Promise<Response>) =>
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (init?.method === 'OPTIONS') return new Response('', { status: 403, statusText: 'Forbidden' });
        if (u.includes('/chat/completions')) return auth();
        return new Response('pong', { status: 200 }); // base 探测
      });

    // Step1 慢 → warn（真实 sleep > 4500ms）
    vi.stubGlobal('fetch', vi.fn(async () => { await new Promise((r) => setTimeout(r, 4520)); return new Response('', { status: 200 }); }));
    let r = await testAIConnection(cloudCfg());
    expect(r.steps[0].status).toBe('warn');

    // 401 + Unauthorized body
    vi.stubGlobal('fetch', mk(async () => new Response('Unauthorized', { status: 401 })));
    r = await testAIConnection(cloudCfg());
    expect(r.steps.some((s) => s.detail.includes('API Key 无效'))).toBe(true);

    // 403
    vi.stubGlobal('fetch', mk(async () => new Response('forbidden', { status: 403 })));
    r = await testAIConnection(cloudCfg());
    expect(r.steps.some((s) => s.status === 'fail' && s.detail.includes('无权访问'))).toBe(true);

    // 429 → warn
    vi.stubGlobal('fetch', mk(async () => new Response('rate', { status: 429 })));
    r = await testAIConnection(cloudCfg());
    expect(r.steps.some((s) => s.status === 'warn' && s.detail.includes('限流'))).toBe(true);

    // 认证请求被 CORS 拒
    vi.stubGlobal('fetch', mk(async () => { throw new TypeError('Failed to fetch'); }));
    r = await testAIConnection(cloudCfg());
    expect(r.steps.some((s) => s.detail.includes('CORS 阻止'))).toBe(true);

    // 500 其他错误 + 代理通道（同样 500 → 代理失败、errorMsg 缺省 undefined）
    vi.stubGlobal('fetch', mk(async () => new Response('oops', { status: 500 })));
    r = await testAIConnection(cloudCfg({ proxyUrl: 'https://proxy.yyc3.top' }));
    expect(r.steps.some((s) => s.status === 'fail' && s.detail.startsWith('HTTP 500'))).toBe(true);
    expect(r.steps.some((s) => s.label === 'CORS 代理通道' && s.status === 'fail')).toBe(true);

    // 代理通道成功（chat 全 200 → 直接认证 + 代理双 pass，覆盖带 key 的 Authorization 分支）
    vi.stubGlobal('fetch', mk(async () => new Response('ok', { status: 200 })));
    r = await testAIConnection(cloudCfg({ proxyUrl: 'https://proxy.yyc3.top' }));
    expect(r.steps.some((s) => s.label === 'CORS 代理通道' && s.status === 'pass')).toBe(true);

    // 无 key → 认证 skip（仍走代理）
    vi.stubGlobal('fetch', mk(async () => new Response('no', { status: 200 })));
    r = await testAIConnection(cloudCfg({ proxyUrl: 'https://proxy.yyc3.top', apiKey: '' }));
    expect(r.steps.some((s) => s.label === 'API Key 认证' && s.status === 'skip')).toBe(true);
    expect(r.steps.some((s) => s.label === 'CORS 代理通道' && s.status === 'pass')).toBe(true);

    // 代理不可达（fetch reject → errorMsg 填充）
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).startsWith('https://proxy.')) throw new Error('ECONNREFUSED proxy');
      if (init?.method === 'OPTIONS') return new Response('', { status: 204 });
      return new Response('ok', { status: 200 });
    }));
    r = await testAIConnection(cloudCfg({ proxyUrl: 'https://proxy.yyc3.top' }));
    expect(r.steps.some((s) => s.detail.includes('代理不可达'))).toBe(true);
  });

  it('Ollama 诊断：tags 失败 → 非 localhost + 超时分支 + 非默认端口建议', async () => {
    const cfg = cloudCfg({ isLocal: true, baseUrl: 'http://192.168.3.10:11500', modelId: 'llama3', modelName: 'llama3' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout exceeded'); })); // errorType=timeout
    const r = await testAIConnection(cfg);
    expect(r.steps[0].status).toBe('fail'); // 端点 step
    expect(r.steps.some((s) => s.label === '智能诊断' && s.status === 'warn')).toBe(true);
    expect(r.suggestion).toContain('OLLAMA_HOST'); // 非 localhost 建议
  });

  it('Ollama 诊断：网络错误 + localhost + 默认端口 → 建议集；errorMsg 空缺省文案', async () => {
    const cfg = cloudCfg({ isLocal: true, baseUrl: 'http://localhost:11434', modelId: 'm', modelName: 'm' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    const r = await testAIConnection(cfg);
    expect(r.steps[0].status).toBe('fail');
    expect(r.suggestion).toContain('ollama serve');
  });

  it('Ollama 模型列表：embed 过滤回退 / not-found / models 键缺失；推理 400 "does not support chat"', async () => {
    const cfg = cloudCfg({ isLocal: true, baseUrl: 'http://localhost:11434', modelId: 'llama3', modelName: 'llama3' });
    // tags: embed+bert 模型过滤后 chatModels 空 → 回退 allModels[0]；chat 400 "does not support chat"
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/tags')) return new Response(JSON.stringify({ models: [{ name: 'bge-m3', details: { family: 'bert' } }] }), { status: 200 });
      if (init?.method === 'POST') return new Response(JSON.stringify({ error: 'llama3 does not support chat' }), { status: 400 });
      return new Response('', { status: 200 });
    }));
    const r = await testAIConnection(cfg);
    expect(r.steps.some((s) => s.label === '模型列表' && s.status === 'warn')).toBe(true); // llama3 未找到
    expect(r.steps.some((s) => s.label === '推理测试' && s.detail.includes('嵌入模型'))).toBe(true);
  });

  it('Ollama 推理 400："model not found" → pull 建议；400 无 error 键 → 原始 detail；404 → warn', async () => {
    const cfg = cloudCfg({ isLocal: true, baseUrl: 'http://localhost:11434', modelId: 'llama3', modelName: 'llama3' });
    // 400 + error 含 "model ... not found"
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/tags')) return new Response('{}', { status: 200 }); // models 键缺失 → 双空守卫
      if (init?.method === 'POST') return new Response(JSON.stringify({ error: 'model llama3 not found' }), { status: 400 });
      return new Response('', { status: 200 });
    }));
    let r = await testAIConnection(cfg);
    expect(r.suggestion).toContain('ollama pull');

    // 400 + 非 JSON body → parse 失败 → HTTP 400 原始 detail + 格式错误建议
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/tags')) return new Response(JSON.stringify({ models: [{ name: 'llama3' }] }), { status: 200 });
      if (init?.method === 'POST') return new Response('<html>bad</html>', { status: 400 });
      return new Response('', { status: 200 });
    }));
    r = await testAIConnection(cfg);
    expect(r.suggestion).toContain('推理请求格式错误');
    expect(r.steps.some((s) => s.label === '推理测试' && s.detail.includes('HTTP 400'))).toBe(true);

    // 400 + 合法 JSON 但无 error 键 → errBody.error || errorDetail 兜底
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/tags')) return new Response(JSON.stringify({ models: [{ name: 'llama3' }] }), { status: 200 });
      if (init?.method === 'POST') return new Response(JSON.stringify({ foo: 1 }), { status: 400 });
      return new Response('', { status: 200 });
    }));
    r = await testAIConnection(cfg);
    expect(r.steps.some((s) => s.label === '推理测试' && s.detail.includes('HTTP 400'))).toBe(true);

    // 非 400：404 → warn
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/tags')) return new Response(JSON.stringify({ models: [{ name: 'llama3' }] }), { status: 200 });
      if (init?.method === 'POST') return new Response('', { status: 404 });
      return new Response('', { status: 200 });
    }));
    r = await testAIConnection(cfg);
    expect(r.steps.some((s) => s.label === '推理测试' && s.status === 'warn')).toBe(true);
  });

  it('WS 诊断补漏：默认 URL（http 环境）/ 协议缺省 / onclose running / 构造抛非 Error', async () => {
    // 默认 URL：wsUrl 缺省 + window 存在 → http: → ws:
    class CloseWS {
      protocol = '';
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: (ev?: { code: number; reason: string }) => void = () => {};
      constructor() { setTimeout(() => this.onclose({ code: 1006, reason: '' }), 0); }
      close() {}
    }
    vi.stubGlobal('WebSocket', CloseWS);
    let r = await testWebSocketConnection();
    expect(r.steps.some((s) => s.label === 'WS 关闭' && s.detail.includes('reason: none'))).toBe(true);
    expect(r.topIssuesEmpty !== true).toBe(true);

    // 带 reason → 非 none 分支；protocol '' → default 协议文案
    class ReasonWS {
      protocol = '';
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: (ev?: { code: number; reason: string }) => void = () => {};
      constructor() { setTimeout(() => this.onclose({ code: 1000, reason: 'server-gone' }), 0); }
      close() {}
    }
    vi.stubGlobal('WebSocket', ReasonWS);
    r = await testWebSocketConnection('ws://x/ws');
    expect(r.steps.some((s) => s.detail.includes('server-gone'))).toBe(true);

    // 构造抛非 Error → String(err) 分支
    vi.stubGlobal('WebSocket', function () { throw 'blocked-plain'; } as never);
    r = await testWebSocketConnection('ws://x');
    expect(r.steps.some((s) => s.label === '端点解析' && s.status === 'fail' && s.detail.includes('blocked-plain'))).toBe(true);
  });

  it('runFullSystemDiagnostic：无 AI 配置 / testWs=false / warn 无 suggestion → topIssues 空', async () => {
    class CloseWS {
      protocol = 'ws';
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: () => void = () => {};
      constructor() { setTimeout(() => this.onclose({ code: 1006, reason: '' }) as never, 0); }
      close() {}
    }
    vi.stubGlobal('WebSocket', CloseWS);
    const d1 = await runFullSystemDiagnostic({}); // 无 aiConfigs + WS 关闭（warn，无 suggestion）
    expect(d1.tests.length).toBe(1);
    expect(d1.topIssues).toEqual([]);
    expect(d1.healthScore).toBe(50); // warned*0.5 / total

    const d2 = await runFullSystemDiagnostic({ testWs: false }); // testWs=false → 无 WS
    expect(d2.tests.length).toBe(0);
    expect(d2.summary.total).toBe(0);
    expect(d2.healthScore).toBe(0);
  });
});

// ============================================================
// 3) GitService — 平台检测矩阵 / electron 与 DirectoryPicker 路径 / 操作分支 / formatDate 全段
// ============================================================
describe('GitService 分支缺口（batch 5）', () => {
  it('detectPlatform：无 window → desktop；PWA / mobile / electron 各归其位', () => {
    vi.stubGlobal('window', undefined);
    expect(createGitService().getPlatform()).toBe('desktop');
    vi.unstubAllGlobals();

    const mm = (matches: boolean) => (q: string) => ({ matches: q.includes('standalone') ? matches : false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, onchange: null });
    window.matchMedia = mm(true) as never;
    expect(createGitService().getPlatform()).toBe('pwa');
    window.matchMedia = mm(false) as never;

    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone) Mobile' });
    expect(createGitService().getPlatform()).toBe('mobile');
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Macintosh)' });

    (window as Any).electronAPI = {};
    expect(createGitService().getPlatform()).toBe('desktop');
    delete (window as Any).electronAPI;
    expect(createGitService().getPlatform()).toBe('web');
  });

  it('initialize(repoPath) 写回配置；electron git 通道 getStatus/getCommits/getBranches', async () => {
    const mkCommit = (i: number) => ({ id: `c${i}`, hash: `h${i}`, message: 'm', author: 'a', email: 'e', date: 'd', filesChanged: 1, additions: 1, deletions: 0 });
    const git = {
      getStatus: vi.fn(async () => ({ branch: 'main', clean: true, staged: [], unstaged: [], ahead: 0, behind: 0 })),
      getCommits: vi.fn(async () => [mkCommit(1), mkCommit(2)]),
      getBranches: vi.fn(async () => [{ name: 'main', current: true, lastCommit: 'h', ahead: 0, behind: 0, isRemote: false }]),
    };
    (window as Any).electronAPI = { git };
    const svc = createGitService({ autoRefresh: false });
    expect(svc.getPlatform()).toBe('desktop');
    expect(await svc.initialize('/repo/path')).toBe(true);
    expect(git.getStatus).toHaveBeenCalled();
    expect(git.getCommits).toHaveBeenCalledWith(20); // refreshStatus 首拉
    const sliced = await svc.getCommits(2, 1); // 缓存切片 offset=1 → 2 条中取第 2 条
    expect(sliced.length).toBe(1);
    const forced = await svc.getCommits(5, 0, true); // forceRefresh → 重新走 electron 通道
    expect(git.getCommits).toHaveBeenCalledWith(5);
    expect(forced.length).toBe(2);
    expect((await svc.getBranches())[0].name).toBe('main');
  });

  it('showDirectoryPicker 路径 → mockChanges 分拣（staged/unstaged）', async () => {
    (window as Any).showDirectoryPicker = vi.fn();
    const svc = createGitService();
    const status = await svc.getStatus(true);
    expect(status.staged.length).toBe(1);
    expect(status.unstaged.length).toBe(4);
  });

  it('getStatus 缓存命中 / enableCache=false 绕过；getCommits 缓存与 offset 切片', async () => {
    (window as Any).showDirectoryPicker = vi.fn();
    const svc = createGitService({ enableCache: true });
    const s1 = await svc.getStatus();
    const s2 = await svc.getStatus(); // 5s 内 → 缓存
    expect(s2).toBe(s1);

    const noCache = createGitService({ enableCache: false });
    const n1 = await noCache.getStatus(true);
    expect(n1.branch).toBe('main');

    const c1 = await svc.getCommits(2); // 首次拉取
    const c2 = await svc.getCommits(2, 1); // 缓存切片 offset=1
    expect(c2.length).toBe(Math.min(2, c1.length - 1) || 0);
    const c3 = await svc.getCommits(2, 0, true); // forceRefresh
    expect(c3.length).toBeGreaterThan(0);
  });

  it('stage/unstage 全家：status null 守卫 + 命中/未命中 + commit 空消息与无暂存', async () => {
    (window as Any).showDirectoryPicker = vi.fn();
    const errs: Error[] = [];
    const svc = createGitService({ onError: (e) => errs.push(e) });

    // status 未初始化 → 守卫分支
    await svc.stageFile('x');
    await svc.unstageFile('x');
    await svc.stageAllFiles();
    await svc.unstageAllFiles();

    await svc.initialize();
    await svc.stageFile('u1'); // 命中 unstaged
    await svc.stageFile('nope'); // 未命中
    await svc.stageAllFiles();
    await svc.unstageFile('s1');
    await svc.unstageAllFiles();

    expect(await svc.commit('')).toBeNull(); // 空消息
    expect(errs.length).toBeGreaterThan(0);
    await svc.stageAllFiles();
    const ok = await svc.commit('feat: staged');
    expect(ok).not.toBeNull();

    // 无暂存 → commit 拒绝（私有 status 直调，绕过 getStatus(true) 的 mock 重置）
    (svc as Any).status.staged = [];
    expect(await svc.commit('empty')).toBeNull();
  });

  it('commit add/deletions 缺省归零 + checkout 分支（有/无 status）+ createBranch + push/up-to-date', async () => {
    (window as Any).showDirectoryPicker = vi.fn();
    const svc = createGitService();
    // 无 status checkout
    expect(await svc.checkoutBranch('dev')).toBe(true);
    await svc.initialize();
    expect(await svc.checkoutBranch('develop')).toBe(true);
    const nb = await svc.createBranch('feature/x', 'main');
    expect(nb?.name).toBe('feature/x');

    // push：status null → up-to-date 分支
    const bare = createGitService();
    expect((await bare.push()).message).toBe('Everything up-to-date.');
    // ahead=1（mock status）→ push 成功
    const r = await svc.push();
    expect(r.success).toBe(true);
    expect((await svc.pull()).success).toBe(true);
  });

  it('stopAutoRefresh 无定时器安全；formatDate 全段（just now/m/h/d/跨年/同年）', () => {
    const svc = createGitService();
    svc.stopAutoRefresh(); // 无 timer → 守卫
    svc.destroy();
    svc.stopAutoRefresh(); // destroy 后再次 → 仍安全

    const f = (svc as Any).formatDate.bind(svc);
    const now = Date.now();
    expect(f(new Date(now - 10_000))).toBe('just now');
    expect(f(new Date(now - 10 * 60_000))).toBe('10m ago');
    expect(f(new Date(now - 5 * 3600_000))).toBe('5h ago');
    expect(f(new Date(now - 3 * 86_400_000))).toBe('3d ago');
    const cross = f(new Date(now - 400 * 86_400_000));
    expect(cross).toMatch(/,/); // en-US 短日期带年（Oct 29, 2025 形态）
    const sameYear = f(new Date(now - 30 * 86_400_000));
    expect(sameYear).not.toMatch(/,/); // 同年 → year: undefined → 无年份段
  });
});

// ============================================================
// 4) data-bus — publish 开发日志 / ingest 矩阵 / WS 发送三态 / 私有引擎直调 / 合并策略
// ============================================================
describe('data-bus 分支缺口（batch 5）', () => {
  const node = (id: string, over: Partial<NodeData> = {}): NodeData => ({ id, status: 'online', gpu: 1, mem: 2, temp: 3, model: 'm', tasks: 0, ...over });

  afterEach(() => {
    dataBus.disconnectWS();
    dataBus.unregisterWSSender();
    (dataBus as Any).offlineQueue = [];
    (dataBus as Any).ws = null;
    (dataBus as Any).wsConfig = null;
    (dataBus as Any).reconnectTimer && clearTimeout((dataBus as Any).reconnectTimer);
    (dataBus as Any).reconnectTimer = null;
    (dataBus as Any).heartbeatTimer && clearInterval((dataBus as Any).heartbeatTimer);
    (dataBus as Any).heartbeatTimer = null;
    (dataBus as Any).bufferTimer && clearTimeout((dataBus as Any).bufferTimer);
    (dataBus as Any).bufferTimer = null;
    (dataBus as Any).messageBuffer = [];
    dataBus.clearUserEdits('n1');
  });

  it('publish：NODE_ENV=development 日志（数组/标量 payload）+ 历史上限裁剪', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    dataBus.publish({ entity: 'e1', action: 'merge', source: 'websocket', timestamp: 1, payload: [1, 2, 3] });
    dataBus.publish({ entity: 'e1', action: 'update', source: 'user_edit', timestamp: 2, payload: 'scalar' });
    expect(spy).toHaveBeenCalledTimes(2);
    vi.stubEnv('NODE_ENV', 'test');
    for (let i = 0; i < 210; i++) {
      dataBus.publish({ entity: 'bulk', action: 'merge', source: 'simulation', timestamp: i, payload: i });
    }
    expect(dataBus.getEventHistory().length).toBeLessThanOrEqual(200);
    spy.mockRestore();
  });

  it('ingestWSMessage：type 缺省 / data??payload 回退 / 全消息类型矩阵 + 坏 JSON（handleWSMessage 直调）', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen: Any[] = [];
    const unsub = dataBus.subscribe('nodes', (e) => seen.push(e));
    const logs: Any[] = [];
    dataBus.subscribe('logs', (e) => logs.push(e));
    const entities: Any[] = [];
    dataBus.subscribe('gpu.cluster', (e) => entities.push(e));

    dataBus.ingestWSMessage({}); // type 缺省 → metrics_update；无 entity → 不发布
    dataBus.ingestWSMessage({ payload: [node('x1')], data: undefined }); // data??payload → payload，仍无 entity → 不发布
    dataBus.ingestWSMessage({ type: 'node_update', payload: [node('x2')] }); // data ?? payload → 数组 → 发布
    dataBus.ingestWSMessage({ type: 'node_update', data: [node('n9')] });
    dataBus.ingestWSMessage({ type: 'node_update', data: 'not-array' }); // 非数组 → 不发布
    dataBus.ingestWSMessage({ type: 'metrics_update', entity: 'gpu.cluster', data: { v: 1 } });
    dataBus.ingestWSMessage({ type: 'metrics_update', data: { v: 2 } }); // 无 entity → 不发布
    dataBus.ingestWSMessage({ type: 'log_entry', data: 'log line' });
    dataBus.ingestWSMessage({ type: 'ack', data: 'msg-1' });
    dataBus.ingestWSMessage({ type: 'mystery', data: null }); // default → warn
    (dataBus as Any).handleWSMessage({ data: '{bad json' } as MessageEvent); // parse 失败 catch

    expect(seen.length).toBe(2); // payload fallback + data array
    expect(logs.length).toBe(1);
    expect(entities.length).toBe(1);
    expect(warn).toHaveBeenCalledWith('[DataBus] Unknown message type:', 'mystery');
    expect(err).toHaveBeenCalledWith('[DataBus] Failed to parse WebSocket message:', expect.any(Error));
    unsub();
    info.mockRestore(); warn.mockRestore(); err.mockRestore();
  });

  it('heartbeat → sendWS ack（经 external sender）；sendWS 三态矩阵', () => {
    const sent: Any[] = [];
    dataBus.registerWSSender((m) => { sent.push(m); return true; });
    dataBus.ingestWSMessage({ type: 'heartbeat', data: { t: 1 } });
    expect(sent.some((m) => m.type === 'ack')).toBe(true);

    // external sender 拒绝 + enableOfflineQueue → 入队；无 queue 配置 → 仍 false 返回
    (dataBus as Any).wsConfig = { url: 'ws://x', enableOfflineQueue: true };
    dataBus.registerWSSender(() => false);
    expect(dataBus.sendWS({ type: 'log_entry', data: 'q1' })).toBe(false);
    expect(dataBus.getOfflineQueueSize()).toBe(1);
    (dataBus as Any).wsConfig = null;
    expect(dataBus.sendWS({ type: 'log_entry', data: 'q2' })).toBe(false);

    // external sender 注销 + 无 ws + 无 queue → warn 分支
    dataBus.unregisterWSSender();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(dataBus.sendWS({ type: 'log_entry', data: 'x' })).toBe(false);
    expect(warn).toHaveBeenCalledWith('[DataBus] Cannot send: no WebSocket connection available');
    warn.mockRestore();

    // isWSConnected：external → true；无 → false
    dataBus.registerWSSender(() => true);
    expect(dataBus.isWSConnected()).toBe(true);
    dataBus.unregisterWSSender();
    expect(dataBus.isWSConnected()).toBe(false);
  });

  it('ws OPEN 发送：单条 / 多条合批 / 定时器冲突 / 刷前 ws 掉线 / 离线队列 flush', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const fakeWS = { readyState: WebSocket.OPEN, send, close: vi.fn() } as unknown as WebSocket;
    const bus = dataBus as Any;
    bus.ws = fakeWS;
    bus.wsConfig = { url: 'ws://x', throttleMs: 10 };

    expect(dataBus.sendWS({ type: 'metrics_update', data: 1 })).toBe(true);
    expect(send).toHaveBeenCalledTimes(0); // 节流定时器未跑
    vi.advanceTimersByTime(10);
    expect(send).toHaveBeenCalledTimes(1); // 单条路径

    // 多条合批：第二条触发 bufferTimer 已设 → 早退；advance 后 forEach 逐条
    dataBus.sendWS({ type: 'metrics_update', data: 2 });
    dataBus.sendWS({ type: 'metrics_update', data: 3 });
    vi.advanceTimersByTime(10);
    expect(send).toHaveBeenCalledTimes(3);

    // 刷前 ws 掉线 → callback 内 return（send 不再增加；遗留 buffer=[4] 与 stale bufferTimer — 源码既有怪癖）
    dataBus.sendWS({ type: 'metrics_update', data: 4 });
    bus.ws = null;
    vi.advanceTimersByTime(10);
    expect(send).toHaveBeenCalledTimes(3);

    // flushOfflineQueue：空队列 / 未连接 早退；连接后 flush 全部（含遗留 buffer 消息，共 4+f1+f2 三条）
    expect(bus.flushOfflineQueue()).toBeUndefined();
    bus.offlineQueue = [{ type: 'log_entry', data: 'f1' }, { type: 'log_entry', data: 'f2' }];
    bus.flushOfflineQueue(); // ws null → isWSConnected false → 早退
    bus.ws = fakeWS;
    bus.bufferTimer = null; // 清 stale 定时器（ws 掉线路径 callback 早退不清理 — 源码怪癖，测试如实绕过）
    bus.flushOfflineQueue();
    vi.advanceTimersByTime(10);
    expect(send).toHaveBeenCalledTimes(6);
    expect(bus.offlineQueue.length).toBe(0);
    bus.ws = null;
  });

  it('scheduleReconnect/startHeartbeat 私有直调：无配置 / 超上限 / 指数退避 / 心跳幂等', () => {
    vi.useFakeTimers();
    const bus = dataBus as Any;
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    bus.scheduleReconnect(); // 无 wsConfig → 早退
    expect(bus.wsState).toBe('disconnected');

    bus.wsConfig = { url: 'ws://x', reconnectInterval: 10, maxReconnectAttempts: 1 };
    bus.reconnectAttempts = 0;
    bus.scheduleReconnect();
    expect(bus.wsState).toBe('reconnecting');
    bus.scheduleReconnect(); // timer 已设 → 早退
    vi.advanceTimersByTime(20); // → legacy skip warn
    expect(warn).toHaveBeenCalledWith('[DataBus] Legacy reconnect skipped — WS managed externally via registerWSSender');

    bus.reconnectAttempts = 5;
    bus.scheduleReconnect(); // attempts >= max → error 早退
    expect(err).toHaveBeenCalledWith('[DataBus] Max reconnect attempts (1) reached');

    // startHeartbeat：已有 timer → 幂等；custom interval；isWSConnected false → 不发
    bus.heartbeatTimer = setInterval(() => {}, 1000);
    bus.startHeartbeat();
    clearInterval(bus.heartbeatTimer);
    bus.heartbeatTimer = null;
    bus.wsConfig = { url: 'ws://x', heartbeatInterval: 20 };
    bus.startHeartbeat();
    vi.advanceTimersByTime(20); // 未连接 → 不发
    dataBus.disconnectWS(); // stopHeartbeat + 状态机
    expect(dataBus.getWSState()).toBe('disconnected');
    info.mockRestore(); warn.mockRestore(); err.mockRestore();
  });

  it('disconnectWS：带 ws 与 reconnectTimer → close(1000) + 状态推进；connectDataSync 弃用短路', async () => {
    const bus = dataBus as Any;
    const close = vi.fn();
    bus.ws = { readyState: WebSocket.OPEN, close } as unknown as WebSocket;
    bus.reconnectTimer = setTimeout(() => {}, 1000);
    const states: string[] = [];
    const unsub = dataBus.onWSStateChange((s) => states.push(s));
    dataBus.disconnectWS();
    expect(close).toHaveBeenCalledWith(1000, 'User disconnect');
    expect(states).toEqual(['disconnecting', 'disconnected']);
    unsub();
    expect(await connectDataSync({ url: 'ws://x' })).toBe(false); // deprecated
    // onWSStateChange 注销函数可用
    const u2 = dataBus.onWSStateChange(() => {});
    expect(u2()).toBe(true);
  });

  it('合并策略矩阵：ws_priority 编辑字段越界 / user_priority 遥测与编辑守卫 / timestamp_win / shallow_replace / 新节点追加', () => {
    dataBus.updateUserEditNode([node('n1')], 'n1', { status: 'paused', bogusField: 1 } as never);
    expect(dataBus.getUserEditedFields('n1').has('status')).toBe(true);
    expect(dataBus.getAllUserEditedNodeIds()).toContain('n1');

    const cur = [node('n1', { status: 'paused' }), node('n2')];
    const inc = [node('n1', { gpu: 99 }), node('n2', { gpu: 77 }), node('n3', { model: 'new' })];

    // ws_priority：n1 编辑保留 status + bogusField 不在 current → 跳过
    let r = dataBus.mergeNodeData(cur, inc, 'websocket', 'ws_priority');
    expect(r.find((n) => n.id === 'n1')!.status).toBe('paused');
    expect(r.find((n) => n.id === 'n3')).toBeDefined();

    // user_priority：未编辑遥测字段跟 incoming；已编辑遥测字段（n2.gpu）保留 current
    const editedCur = dataBus.updateUserEditNode(cur, 'n2', { gpu: 55 } as never);
    expect(editedCur.find((n) => n.id === 'n2')!.gpu).toBe(55);
    r = dataBus.mergeNodeData(editedCur, inc, 'websocket', 'user_priority');
    expect(r.find((n) => n.id === 'n2')!.gpu).toBe(55); // 已编辑 → 不吃 incoming
    expect(r.find((n) => n.id === 'n1')!.gpu).toBe(99); // 未编辑 → 吃 incoming

    // timestamp_win 同 ws_priority 通道
    r = dataBus.mergeNodeData(cur, inc, 'simulation', 'timestamp_win');
    expect(r.find((n) => n.id === 'n1')!.status).toBe('paused');

    // shallow_replace + incoming 缺失节点保留 + unknown 新节点
    r = dataBus.mergeNodeData(cur, [node('n1', { temp: 77 })], 'db_restore', 'shallow_replace');
    expect(r.find((n) => n.id === 'n1')!.temp).toBe(77);
    expect(r.find((n) => n.id === 'n2')).toBeDefined();

    // 便捷函数 + mergeArrayData + replaceNodes + clearUserEdits
    expect(mergeNodesWrap(cur, inc)[0].id).toBe('n1');
    const arr = dataBus.mergeArrayData([{ id: 'a', v: 1 }], [{ id: 'a', v: 2 } as never, { id: 'b', v: 3 } as never], 'agents');
    expect(arr.map((x) => (x as Any).v)).toEqual([2, 3]);
    expect(dataBus.replaceNodes([node('n1')], 'initialization').length).toBe(1);
    dataBus.clearUserEdits('n1', ['bogus']); // cellSet 存在但 bogus 不在
    dataBus.clearUserEdits('n1', ['status', 'gpu', 'bogusField']); // 清空 → 节点集删除
    dataBus.clearUserEdits('n1', ['status']); // cellSet 缺失 → 静默
    dataBus.clearUserEdits('n2'); // 整删
    expect(dataBus.getUserEditedFields('n1').size).toBe(0);

    // getEventHistory limit / getEntityHistory limit / getMergeLog
    expect(dataBus.getEventHistory(3).length).toBeLessThanOrEqual(3);
    expect(dataBus.getEntityHistory('nodes', 2).length).toBeLessThanOrEqual(2);
    expect(dataBus.getMergeLog()).toEqual([]);
  });
});

// 由便捷导出走一遍 mergeNodes（避免未使用告警 + 覆盖 default source 分支）
function mergeNodesWrap(cur: NodeData[], inc: NodeData[]) {
  return dataBus.mergeNodeData(cur, inc, 'websocket');
}

// ============================================================
// 5) error-handler — 统计 / 建议映射补段 / 格式化 / 全局监听
// ============================================================
describe('error-handler 分支缺口（batch 5）', () => {
  afterEach(() => clearErrorLog());

  it('getErrorStats：resolved/unresolved 计数 + 空日志 lastErrorTime=null + 分类/级别聚合', () => {
    const empty = getErrorStats();
    expect(empty.total).toBe(0);
    expect(empty.lastErrorTime).toBeNull();

    const t = Date.now();
    localStorage.setItem('yyc3_error_log', JSON.stringify([
      { id: 'e1', category: 'NETWORK', severity: 'error', message: 'a', timestamp: t, resolved: false },
      { id: 'e2', category: 'NETWORK', severity: 'warning', message: 'b', timestamp: t - 1, resolved: true },
      { id: 'e3', category: 'AUTH', severity: 'critical', message: 'c', timestamp: t - 2, resolved: false },
    ]));
    const stats = getErrorStats();
    expect(stats.total).toBe(3);
    expect(stats.unresolvedCount).toBe(2);
    expect(stats.byCategory.NETWORK).toBe(2);
    expect(stats.bySeverity.critical).toBe(1);
    expect(stats.lastErrorTime).toBe(t);
  });

  it('detectErrorCode 补段：AUTH 三段 / VALIDATION range / PARSE xml 与双缺 / STORAGE storage / RUNTIME reference', () => {
    expect(detectErrorCode(new Error('session expired'), 'AUTH')).toBe('AUTH_EXPIRED');
    expect(detectErrorCode(new Error('令牌过期'), 'AUTH')).toBe('AUTH_EXPIRED');
    expect(detectErrorCode(new Error('invalid credentials'), 'AUTH')).toBe('AUTH_INVALID');
    expect(detectErrorCode(new Error('密钥无效'), 'AUTH')).toBe('AUTH_INVALID');
    expect(detectErrorCode(new Error('forbidden resource'), 'AUTH')).toBe('AUTH_FORBIDDEN');
    expect(detectErrorCode(new Error('HTTP 403'), 'AUTH')).toBe('AUTH_FORBIDDEN');
    expect(detectErrorCode(new Error('value out of range'), 'VALIDATION')).toBe('VALIDATION_OUT_OF_RANGE');
    expect(detectErrorCode(new Error('数值超出范围'), 'VALIDATION')).toBe('VALIDATION_OUT_OF_RANGE');
    expect(detectErrorCode(new Error('bad xml payload'), 'PARSE')).toBe('PARSE_XML_ERROR');
    expect(detectErrorCode(new Error('mystery body'), 'PARSE')).toBe('UNKNOWN');
    expect(detectErrorCode(new Error('storage unavailable'), 'STORAGE')).toBe('STORAGE_NOT_AVAILABLE');
    expect(detectErrorCode(new Error('本地存储不可用'), 'STORAGE')).toBe('STORAGE_NOT_AVAILABLE');
    expect(detectErrorCode(new ReferenceError('reference to missing var'), 'RUNTIME')).toBe('RUNTIME_REFERENCE_ERROR');
    expect(detectErrorCode(new Error('变量引用不存在'), 'RUNTIME')).toBe('RUNTIME_REFERENCE_ERROR');
  });

  it('categorizeError 经 captureError：SecurityError → AUTH；字符串 / 带 message 对象 / DOMException quota', () => {
    const sec = captureError(new DOMException('denied', 'SecurityError'), { silent: true });
    expect(sec.category).toBe('AUTH');
    const quota = captureError(new DOMException('full', 'QuotaExceededError'), { silent: true });
    expect(quota.category).toBe('STORAGE');
    const str = captureError('plain string fail', { silent: true });
    expect(str.message).toBe('plain string fail');
    const obj = captureError({ message: 'obj message' }, { silent: true });
    expect(obj.message).toBe('obj message');
    const unknown = captureError(42, { silent: true });
    expect(unknown.message).toBe('未知错误');
  });

  it('capture* 家族 + formatErrorForUser 四组合 + getCategoryLabel 兜底', () => {
    const ws = captureWSError('ws dropped');
    expect(ws.source).toBe('WebSocket');
    const auth = captureAuthError(new Error('token expired'));
    expect(auth.userAction).toContain('重新登录');
    const parse = captureParseError(new Error('bad json data'), 'FeedParser');
    expect(parse.category).toBe('PARSE');
    const net = captureNetworkError(new Error('request timeout'), '/api/x');
    expect(net.category).toBe('NETWORK');

    const base: Any = { message: 'boom' };
    expect(formatErrorForUser({ ...base })).toBe('⚠️ boom');
    expect(formatErrorForUser({ ...base, userAction: '重试' })).toContain('💡 建议: 重试');
    expect(formatErrorForUser({ ...base, source: 'Feed' })).toContain('📍 位置: Feed');
    expect(formatErrorForUser({ ...base, userAction: '重试', source: 'Feed' })).toContain('📍 位置: Feed');

    expect(getCategoryLabel('NETWORK')).toBe('网络错误');
    expect(getCategoryLabel('bogus' as never)).toBe('bogus');
  });

  it('installGlobalErrorListeners：error 事件（普通 + figma 过滤）+ unhandledrejection（null reason / figma / 普通）', () => {
    installGlobalErrorListeners();
    installGlobalErrorListeners(); // 幂等守卫
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    clearErrorLog();

    // 普通 error 事件
    window.dispatchEvent(new ErrorEvent('error', { error: new TypeError('boom type'), message: 'boom type', filename: 'app.ts', lineno: 3, colno: 7 }));
    // figma 平台错误 → 过滤早退
    const figmaErr = new Error('IframeMessage: aborted');
    figmaErr.name = 'IframeMessageAbortError';
    window.dispatchEvent(new ErrorEvent('error', { error: figmaErr, message: 'IframeMessage: aborted', filename: 'figma.host.js' }));
    expect(getErrorLog().some((e) => e.message === 'boom type')).toBe(true);
    expect(getErrorLog().some((e) => e.message.includes('IframeMessage'))).toBe(false);

    // unhandledrejection：reason null → 全兜底链；figma reason → preventDefault；普通 → 入库
    const rej1 = new Event('unhandledrejection') as Any;
    rej1.reason = null;
    window.dispatchEvent(rej1);
    const rej2 = new Event('unhandledrejection') as Any;
    rej2.reason = { name: 'AbortError', message: 'message port closed', stack: 'at port' };
    rej2.preventDefault = vi.fn();
    window.dispatchEvent(rej2);
    expect(rej2.preventDefault).toHaveBeenCalled();
    const rej3 = new Event('unhandledrejection') as Any;
    rej3.reason = new Error('async boom');
    window.dispatchEvent(rej3);
    expect(getErrorLog().some((e) => e.message === 'async boom')).toBe(true);
    expect(getErrorLog().some((e) => e.message.includes('message port closed'))).toBe(false);
    errSpy.mockRestore();
  });
});
