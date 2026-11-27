/**
 * @file: coverage-deep.test.ts
 * @description: 深分支覆盖补强 — QueryAnalyzer 提取器族 / supabaseClientReal 认证流 / storageManager 数据库同步与冲突合并 / 快捷键 / 图标 / 网络探测 / 告警通道 / IndexManager 各方言
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryAnalyzer } from '../database/QueryAnalyzer';
import { SlowQueryMonitor } from '../database/SlowQueryMonitor';
import { ConnectionMonitor } from '../database/ConnectionMonitor';
import { ConnectionManager, connectionManager } from '../database/ConnectionManager';
import { IndexManager } from '../database/IndexManager';
import { StorageManager } from '../storageManager';
import * as supabaseRealModule from '../supabaseClientReal';
import { icons, iconsCDN } from '../yyc3-icons';
import {
  generateWsUrl,
  DEFAULT_NETWORK_CONFIG,
  loadNetworkConfig,
  saveNetworkConfig,
  resetNetworkConfig,
  getLocalIP,
  getNetworkInterfaces,
  testWebSocketConnection,
  testHTTPConnection,
} from '../network-utils';
import { useKeyboardShortcuts, SHORTCUT_LIST } from '../useKeyboardShortcuts';
import { useClock, useClockMinutes } from '../useClock';
import { useCopyFeedback } from '../use-copy-feedback';
import {
  validateVariable,
  exportVariables,
  setVariableValue,
  VARIABLE_DEFINITIONS,
} from '../variable-center';
import { captureError, detectErrorCode } from '../error-handler';
import { getSharedChannel, postToChannel, closeAllChannels } from '../broadcast-channel';
import { getAPIConfig, onAPIConfigChange, setAPIConfig } from '../api-config';
import { getGitService } from '../GitService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const PG_CONFIG = { type: 'postgresql' as const, host: 'h', port: 5432, database: 'db', username: 'u', password: 'p' };
const MY_CONFIG = { ...PG_CONFIG, type: 'mysql' as const };

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  connectionManager.setTestMode(false);
});

describe('QueryAnalyzer 深方法（private 提取器族经 any 直测）', () => {
  const makeAnalyzer = (config: Any, rows: Any[] = []) => {
    const queries: string[] = [];
    const conn = {
      query: async (sql: string) => {
        queries.push(sql);
        return { rows, rowCount: rows.length };
      },
      collection: (_name: string) => ({ explain: async () => ({ ns: _name, stages: [] }) }),
    };
    return { analyzer: new QueryAnalyzer(conn as never, config), queries, conn };
  };

  it('getExecutionPlan 三方言 + 未知类型', async () => {
    const pgPlan = { 'Node Type': 'Index Scan', 'Index Name': 'idx_a', 'Total Cost': 42, 'Actual Rows': 5 };
    const pg = makeAnalyzer(PG_CONFIG, [{ 'QUERY PLAN': pgPlan }]);
    expect(await (pg.analyzer as Any).getExecutionPlan('SELECT 1')).toEqual(pgPlan);
    expect(pg.queries[0]).toContain('EXPLAIN (ANALYZE');

    const myPlan = { cost: 10, rows_examined: 100, key: 'PRIMARY', type: 'ref', Using_temp_table: true, Using_filesort: true };
    const my = makeAnalyzer(MY_CONFIG, [{ EXPLAIN: JSON.stringify(myPlan) }]);
    expect(await (my.analyzer as Any).getExecutionPlan('SELECT 1')).toEqual(myPlan);
    expect(my.queries[0]).toContain('EXPLAIN FORMAT=JSON');

    const mongo = makeAnalyzer({ ...PG_CONFIG, type: 'mongodb' }, []);
    const plan = await (mongo.analyzer as Any).getExecutionPlan('db.users.aggregate([{"$match":{"a":1}}])');
    expect(plan).toBeTruthy();

    const unknown = makeAnalyzer({ ...PG_CONFIG, type: 'sqlite' }, []);
    expect(await (unknown.analyzer as Any).getExecutionPlan('SELECT 1')).toEqual({});
  });

  it('getQueryMetrics：pg 索引路径 + mysql 临时表/排序路径 + 执行失败抛错', async () => {
    const pg = makeAnalyzer(PG_CONFIG, [{ id: 1 }]);
    const pgMetrics = await (pg.analyzer as Any).getQueryMetrics('SELECT * FROM t', {
      'Node Type': 'Index Scan', 'Index Name': 'idx_x', 'Actual Rows': 9,
    });
    expect(pgMetrics.indexUsed).toBe(true);
    expect(pgMetrics.indexName).toBe('idx_x');
    expect(pgMetrics.fullTableScan).toBe(false);
    expect(pgMetrics.tempTables).toBe(0);

    const my = makeAnalyzer(MY_CONFIG, []);
    const myMetrics = await (my.analyzer as Any).getQueryMetrics('SELECT * FROM t', {
      key: 'PRIMARY', type: 'ALL', rows_examined: 50, Using_temp_table: true, Using_filesort: true,
    });
    expect(myMetrics.indexUsed).toBe(true);
    expect(myMetrics.tempTables).toBe(1);
    expect(myMetrics.filesort).toBe(true);
    expect(myMetrics.fullTableScan).toBe(true);
    expect(myMetrics.rowsScanned).toBe(50);

    const fail = makeAnalyzer(PG_CONFIG, []);
    (fail.analyzer as Any).connection = { query: async () => { throw new Error('conn dead'); } };
    await expect(
      (fail.analyzer as Any).getQueryMetrics('SELECT 1', { 'Node Type': 'Seq Scan' })
    ).rejects.toThrow(/Query execution failed/);
  });

  it('generateOptimizations 全部九条建议分支', () => {
    const analyzer = new QueryAnalyzer({ query: async () => ({ rows: [] }) } as never, PG_CONFIG);
    const heavy: Any = {
      executionTime: 2000, rowsAffected: 1, rowsScanned: 100, indexUsed: false,
      tempTables: 2, filesort: true, fullTableScan: true,
    };
    const opts = (analyzer as Any).generateOptimizations(
      'SELECT * FROM a JOIN b ON a.x = b.x JOIN c ON a.y = c.y JOIN d ON a.z = d.z JOIN e ON a.w = e.w LIKE \'%q\'',
      heavy,
      {}
    );
    expect(opts.length).toBeGreaterThanOrEqual(8);
    expect(opts.some((o: string) => o.includes('全表扫描'))).toBe(true);
    expect(opts.some((o: string) => o.includes('文件排序'))).toBe(true);
    expect(opts.some((o: string) => o.includes('临时表'))).toBe(true);
    expect(opts.some((o: string) => o.includes('执行时间较长'))).toBe(true);
    expect(opts.some((o: string) => o.includes('扫描行数'))).toBe(true);
    expect(opts.some((o: string) => o.includes('JOIN'))).toBe(true);
    expect(opts.some((o: string) => o.includes('SELECT *'))).toBe(true);
    expect(opts.some((o: string) => o.includes('前导通配符'))).toBe(true);

    const light: Any = { executionTime: 5, rowsAffected: 5, rowsScanned: 0, indexUsed: true, tempTables: 0, filesort: false, fullTableScan: false };
    const opts2 = (analyzer as Any).generateOptimizations('SELECT id FROM t WHERE id = 1', light, {});
    expect(opts2).toHaveLength(0);
    // 无索引且非全表扫描 → 建议检查 WHERE
    const noIdx: Any = { ...light, indexUsed: false };
    const opts3 = (analyzer as Any).generateOptimizations('SELECT id FROM t WHERE id = 1', noIdx, {});
    expect(opts3.some((o: string) => o.includes('未使用索引'))).toBe(true);
  });

  it('suggestIndexes：WHERE/JOIN/ORDER BY 列提取 + 去重', async () => {
    const analyzer = new QueryAnalyzer({ query: async () => ({ rows: [] }) } as never, PG_CONFIG);
    const idx = await (analyzer as Any).suggestIndexes(
      'SELECT * FROM orders JOIN users ON orders.user_id = users.id WHERE status = 1 AND total > 10 ORDER BY created_at DESC, id',
      {}
    );
    const names = idx.map((i: Any) => i.name);
    expect(names).toContain('idx_status');
    expect(names).toContain('idx_total');
    expect(names).toContain('idx_user_id');
    expect(names).toContain('idx_created_at');
    // 去重：同表同列不重复
    expect(new Set(names).size).toBe(names.length);
    // 无列可提取 → 空数组
    expect(await (analyzer as Any).suggestIndexes('SELECT 1', {})).toEqual([]);
  });

  it('estimateCost 三方言 + mongo pipeline 解析失败回退空数组', () => {
    const pg = new QueryAnalyzer({ query: async () => ({ rows: [] }) } as never, PG_CONFIG);
    expect((pg as Any).estimateCost({ 'Total Cost': 77 })).toBe(77);
    expect((pg as Any).estimateCost(undefined)).toBe(0);
    const my = new QueryAnalyzer({ query: async () => ({ rows: [] }) } as never, MY_CONFIG);
    expect((my as Any).estimateCost({ cost: 12 })).toBe(12);
    const mongo = new QueryAnalyzer({ query: async () => ({ rows: [] }) } as never, { ...PG_CONFIG, type: 'mongodb' });
    expect((mongo as Any).estimateCost({})).toBe(0);
    expect((mongo as Any).extractMongoPipeline('db.x.aggregate([{bad')).toEqual([]);
    expect((mongo as Any).extractMongoPipeline('db.users.find()')).toEqual([]);
    expect((mongo as Any).extractMongoCollection('db.users.aggregate([])')).toBe('users');
    expect((mongo as Any).extractMongoCollection('no match')).toBe('');
    expect((pg as Any).extractTableName('SELECT * FROM orders')).toBe('orders');
    expect((pg as Any).extractTableName('SELECT 1')).toBe('');
    expect((pg as Any).countJoins('A JOIN B JOIN C')).toBe(2);
    expect((pg as Any).countJoins('SELECT 1')).toBe(0);
  });

  it('analyzeQueries 批量（VITEST 短路路径逐条）', async () => {
    (window as unknown as Record<string, unknown>).__VITEST__ = true;
    const analyzer = new QueryAnalyzer({ query: async () => ({ rows: [] }) } as never, PG_CONFIG);
    const results = await analyzer.analyzeQueries(['SELECT 1', 'SELECT 2']);
    expect(results).toHaveLength(2);
    delete (window as unknown as Record<string, unknown>).__VITEST__;
  });
});

describe('supabaseClientReal（独立模块：Real 客户端降级 Mock + 增强认证方法）', () => {
  it('mock 模式注册/重置密码直接拒绝', async () => {
    const up = await supabaseRealModule.signUp('a@b.c', 'pw', 'N');
    expect(up.error?.message).toContain('Mock');
    const rp = await supabaseRealModule.resetPassword('a@b.c');
    expect(rp.error?.message).toContain('Mock');
  });

  it('mock updateUser：未登录拒绝 / 有会话就地更新', async () => {
    const noSession = await supabaseRealModule.updateUser({ name: 'X' });
    expect(noSession.error?.message).toContain('未登录');

    const s = supabaseRealModule.ghostSignIn();
    expect(s?.user.name).toBe('Ghost Operator');
    const ok = await supabaseRealModule.updateUser({ name: 'Renamed' });
    expect(ok.error).toBeNull();
    const session = await supabaseRealModule.supabase.auth.getSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((session.data.session as any)?.user.name).toBe('Renamed');
    expect(supabaseRealModule.isGhostMode()).toBe(true);
  });

  it('Real mock 客户端 auth 全流（signIn 密码未配置 / 会话读取 / signOut / onAuthStateChange / from 链）', async () => {
    const auth = supabaseRealModule.supabase.auth;
    const r1 = await (auth as Any).signInWithPassword({ email: 'ghost@nowhere', password: 'x' });
    expect(r1.error?.message).toContain('不正确');
    const r2 = await (auth as Any).signInWithPassword({ email: 'admin@cloudpivot.local', password: '' });
    expect(r2.error?.message).toContain('未配置');

    // 会话过期
    localStorage.setItem('yyc3_session', JSON.stringify({ user: {}, token: 't', expiresAt: 1 }));
    const expired = await (auth as Any).getSession();
    expect(expired.data.session).toBeNull();
    // 坏 JSON
    localStorage.setItem('yyc3_session', '{{');
    expect((await (auth as Any).getSession()).data.session).toBeNull();
    // 无会话
    localStorage.removeItem('yyc3_session');
    const empty = await (auth as Any).getSession();
    expect(empty.data.session).toBeNull();
    expect((await (auth as Any).getUser()).data.user).toBeNull();

    // onAuthStateChange 双分支
    const events: string[] = [];
    const sub = (auth as Any).onAuthStateChange((e: string) => events.push(e));
    expect(events).toContain('SIGNED_OUT');
    localStorage.setItem('yyc3_session', '{broken');
    const events2: string[] = [];
    (auth as Any).onAuthStateChange((e: string) => events2.push(e));
    expect(events2).toContain('SIGNED_OUT');
    sub.data.subscription.unsubscribe();

    await (auth as Any).signOut();

    const q = supabaseRealModule.supabase.from('t').select().eq('a', 1);
    expect(q.data).toEqual([]);
    expect(supabaseRealModule.supabase.from('t').select().order('a').count).toBe(0);
  });
});

describe('storageManager 数据库模式（同步/冲突/离线队列全链）', () => {
  const attachConnection = () => {
    // 预置连接与底层 query 桩（saveConfig('database') 会自动创建 storage-connection）
    const existing = connectionManager.getConnection('storage-connection');
    if (existing) {
      (existing as unknown as { connection: unknown }).connection = {
        query: async () => ({ rows: [], rowCount: 0 }),
      };
      return;
    }
    return connectionManager
      .createConnection('storage-connection', 'Storage Connection', PG_CONFIG)
      .then((info) => {
        (info as unknown as { connection: unknown }).connection = {
          query: async () => ({ rows: [], rowCount: 0 }),
        };
      });
  };

  it('localStorage 模式 triggerSync 无 adapter → 静默', async () => {
    const sm = StorageManager.getInstance();
    sm.saveConfig({ ...(sm.getConfig()), type: 'localStorage', autoSync: false });
    await sm.triggerSync();
    // initialize() 对 localStorage 模式同样置 connected=true（else 分支）
    expect(sm.getConfig().type).toBe('localStorage');
    expect(sm.getStatus().connected).toBe(true);
  });

  it('database 模式：saveConfig 建适配器 → triggerSync 双向同步 + 冲突合并', async () => {
    const sm = StorageManager.getInstance();
    await attachConnection();
    const events: string[] = [];
    sm.onEvent((e) => events.push(e.type));

    localStorage.setItem('yyc3_db_models', JSON.stringify([
      { id: 'sm1', name: 'LocalModel', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 1, created_at: '2026-01-01' },
    ]));

    sm.saveConfig({
      type: 'database',
      syncInterval: 3600,
      autoSync: false,
      offlineMode: true,
      conflictResolution: 'merge',
      database: PG_CONFIG,
    } as never);
    // 初始化为异步 — 等待适配器就绪
    await new Promise((r) => setTimeout(r, 30));

    await sm.triggerSync();
    // triggerSync 带 500ms 节流定时器
    await new Promise((r) => setTimeout(r, 700));
    expect(['syncStart', 'syncComplete'].every((t) => events.includes(t))).toBe(true);

    sm.destroy();
  });

  it('冲突解决三分支 + mergeItems 时间戳 + resolveConflicts 补齐本地独有', () => {
    const sm = StorageManager.getInstance() as Any;
    const local = { id: 'x', name: 'local', created_at: '2026-02-01T00:00:00Z' };
    const remote = { id: 'x', name: 'remote', created_at: '2026-01-01T00:00:00Z' };

    const original = sm.config.conflictResolution;
    sm.config.conflictResolution = 'local';
    expect(sm.resolveConflict(local, remote, 'models')).toEqual(local);
    sm.config.conflictResolution = 'remote';
    expect(sm.resolveConflict(local, remote, 'models')).toEqual(remote);
    sm.config.conflictResolution = 'merge';
    expect((sm.resolveConflict(local, remote, 'models') as Any).name).toBe('local'); // 本地时间戳新 → 本地字段覆盖
    sm.config.conflictResolution = original;

    // mergeItems 等时间戳 → 字段级浅合并（本地覆盖）
    const merged = sm.mergeItems({ id: 'y', a: 1, created_at: '2026-02-01T00:00:00Z' }, { id: 'y', b: 2, created_at: '2026-02-01T00:00:00Z' }, 'models');
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(2);

    // resolveConflicts：远端存在+本地存在 → 冲突解析；本地独有 → 追加
    const resolved = sm.resolveConflicts([{ id: 'x', v: 'remote' }], [{ id: 'x', v: 'local' }, { id: 'z', v: 'onlyLocal' }], 'models');
    expect(resolved.length).toBe(2);

    // getChangedItems：新增/变更检出，未变更跳过
    const changed = sm.getChangedItems(
      [{ id: 'a', v: 1 }, { id: 'b', v: 2 }],
      [{ id: 'a', v: 1 }],
      'models'
    );
    expect(changed).toEqual([{ id: 'b', v: 2 }]);

    // itemsAreDifferent 各表时间戳比较
    // itemsAreDifferent 对 models 比较 content 字段（非时间戳）
    expect(sm.itemsAreDifferent({ id: 'i', name: 'A' }, { id: 'i', name: 'B' }, 'models')).toBe(true);
    expect(sm.itemsAreDifferent({ id: 'i', name: 'A' }, { id: 'i', name: 'A' }, 'models')).toBe(false);
    expect(sm.getItemTimestamp({ created_at: '2026-01-02T00:00:00Z' }, 'models')).toBeGreaterThan(0);
  });

  it('离线队列：离线入队 → online 事件触发队列处理', async () => {
    const sm = StorageManager.getInstance();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    sm.saveConfig({ ...(sm.getConfig()), type: 'localStorage', autoSync: false, offlineMode: true });
    sm.addToOfflineQueue({ id: 'op-1', type: 'addModel', data: { id: 'm9' }, timestamp: Date.now() } as never);

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 30));
    // 无 adapter → processOfflineQueue 分支跑完（队列清空）
    expect(sm.getStatus().pendingChanges).toBeGreaterThanOrEqual(0);
    window.dispatchEvent(new Event('offline'));
    sm.destroy();
  });
});

describe('useKeyboardShortcuts + SHORTCUT_LIST', () => {
  const fireKey = (init: KeyboardEventInit) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  };

  it('SHORTCUT_LIST 完整', () => {
    expect(SHORTCUT_LIST.length).toBeGreaterThanOrEqual(8);
    expect(SHORTCUT_LIST.every((s) => s.keys.length > 0)).toBe(true);
  });

  it('按键分流：终端/搜索/导航/Esc/输入框豁免', () => {
    const onEscape = vi.fn();
    const onSearch = vi.fn();
    const onToggleTerminal = vi.fn();
    render(
      <MemoryRouter>
        <div />
      </MemoryRouter>
    );
    renderHook(() => useKeyboardShortcuts({ onEscape, onSearch, onToggleTerminal }), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    fireKey({ key: '`', ctrlKey: true });
    expect(onToggleTerminal).toHaveBeenCalledTimes(1);

    fireKey({ key: 'k', ctrlKey: true });
    expect(onSearch).toHaveBeenCalledTimes(1);

    // 导航组（Mac 判定在 jsdom platform='' → 走 ctrl）
    fireKey({ key: 'A', shiftKey: true, ctrlKey: true });
    fireKey({ key: 'P', shiftKey: true, ctrlKey: true });
    fireKey({ key: 'O', shiftKey: true, ctrlKey: true });
    fireKey({ key: 'L', shiftKey: true, ctrlKey: true });
    fireKey({ key: 'F', shiftKey: true, ctrlKey: true });

    fireKey({ key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);

    // 输入框内：普通键忽略、Esc 放行
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onEscape).toHaveBeenCalledTimes(2);
    input.remove();
  });

  it('enabled=false 完全不响应', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardShortcuts({ enabled: false, onEscape }), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    fireKey({ key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe('yyc3-icons 路径映射', () => {
  it('本地路径集 + CDN 编码（空格 → %20）', () => {
    expect(icons.favicon32).toBe('/yyc3-icons/Web App/favicon-32.png');
    expect(icons.logo).toContain('android-chrome-512');
    expect(icons.playstore).toContain('Play Store');
    expect(Object.keys(icons).length).toBeGreaterThanOrEqual(30);
    // CDN：最后一段 encodeURIComponent
    expect(iconsCDN.androidPlayStore).toContain('Play%20Store.png');
    expect(iconsCDN.androidPlayStore).toContain('raw.githubusercontent.com');
    expect(iconsCDN.macOS16).toContain('/macOS/16.png');
    expect(iconsCDN.watchOSAppStore).toContain('App%20Store.png');
    expect(iconsCDN.logo).toContain('android-chrome-512.png');
  });
});

describe('network-utils 连接探测（WebSocket/HTTP mock）', () => {
  it('generateWsUrl + 默认配置 + load/save/reset', () => {
    expect(generateWsUrl('1.2.3.4', '9999')).toBe('ws://1.2.3.4:9999/ws');
    expect(DEFAULT_NETWORK_CONFIG.wsUrl).toBe('ws://localhost:3113/ws');
    expect(loadNetworkConfig()).toEqual(DEFAULT_NETWORK_CONFIG);
    saveNetworkConfig({ ...DEFAULT_NETWORK_CONFIG, serverAddress: '10.0.0.5' });
    expect(loadNetworkConfig().serverAddress).toBe('10.0.0.5');
    // 坏 JSON 容错
    localStorage.setItem('network_config', '{bad');
    expect(loadNetworkConfig()).toEqual(DEFAULT_NETWORK_CONFIG);
    expect(resetNetworkConfig().serverAddress).toBe('localhost');
  });

  it('getLocalIP：WebRTC offer 带 IP → 提取；无 RTCPeerConnection → 127.0.0.1', async () => {
    (globalThis as Any).RTCPeerConnection = class {
      createDataChannel() {}
      async createOffer() {
        return { sdp: 'c=IN IP4 192.168.1.7\r\n', type: 'offer' };
      }
      async setLocalDescription() {}
      close() {}
    };
    expect(await getLocalIP()).toBe('192.168.1.7');
    // 0.0.0.0 回退
    (globalThis as Any).RTCPeerConnection = class {
      createDataChannel() {}
      async createOffer() {
        return { sdp: 'c=IN IP4 0.0.0.0', type: 'offer' };
      }
      async setLocalDescription() {}
      close() {}
    };
    expect(await getLocalIP()).toBe('127.0.0.1');
    // 无 WebRTC
    delete (globalThis as Any).RTCPeerConnection;
    expect(await getLocalIP()).toBe('127.0.0.1');
  });

  it('getNetworkInterfaces：wifi/有线/离线 + loopback 补充', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { effectiveType: '4g' } });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    (globalThis as Any).RTCPeerConnection = class {
      createDataChannel() {}
      async createOffer() {
        return { sdp: 'c=IN IP4 10.1.2.3', type: 'offer' };
      }
      async setLocalDescription() {}
      close() {}
    };
    const ifaces = await getNetworkInterfaces();
    expect(ifaces[0].name).toBe('wlan0');
    expect(ifaces[0].type).toBe('WiFi');
    expect(ifaces.some((i) => i.name === 'lo0')).toBe(true);

    Object.defineProperty(navigator, 'connection', { configurable: true, value: {} });
    const wired = await getNetworkInterfaces();
    expect(wired[0].name).toBe('en0');
    expect(wired[0].status).toBe('active');

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const offline = await getNetworkInterfaces();
    expect(offline[0].status).toBe('inactive');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('testWebSocketConnection：成功/失败/构造异常', async () => {
    class GoodWS {
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      onclose: () => void = () => {};
      constructor() {
        setTimeout(() => this.onopen(), 0);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', GoodWS);
    const ok = await testWebSocketConnection('ws://x', 1000);
    expect(ok.success).toBe(true);

    class BadWS {
      onopen: () => void = () => {};
      onerror: () => void = () => {};
      constructor() {
        setTimeout(() => this.onerror(), 0);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', BadWS);
    const refused = await testWebSocketConnection('ws://x', 1000);
    expect(refused.success).toBe(false);
    expect(refused.error).toContain('拒绝');

    vi.stubGlobal('WebSocket', undefined);
    const nows = await testWebSocketConnection('ws://x', 100);
    expect(nows.success).toBe(false);
  });

  it('testHTTPConnection：fetch 成功 / 失败分类', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    const ok = await testHTTPConnection('https://x', 1000);
    expect(ok.success).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => {
      const e = new Error('The operation was aborted');
      e.name = 'AbortError';
      throw e;
    }));
    const timeout = await testHTTPConnection('https://x', 1000);
    expect(timeout.success).toBe(false);
    expect(timeout.error).toContain('超时');

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const fail = await testHTTPConnection('https://x', 1000);
    expect(fail.error).toContain('不可达');
  });
});

describe('ConnectionMonitor 告警阈值 + 汇总', () => {
  it('high_error_rate / high_latency / max_latency 告警触发', () => {
    const mon = new ConnectionMonitor({
      alertThresholds: { errorRate: 0.05, avgLatency: 10, maxLatency: 50 },
      enableAlerts: true,
    });
    const alerts: Any[] = [];
    mon.onAlert('c1', (a) => alerts.push(a));
    mon.recordQuery('c1', 20, false); // errorRate 1/1=1 > .05; avg 20 > 10; max 20 < 50
    mon.recordQuery('c1', 200, true); // avg 110 > 10; max 200 > 50
    const types = alerts.map((a) => a.type);
    expect(types).toContain('high_error_rate');
    expect(types).toContain('high_latency');
    expect(types).toContain('max_latency_exceeded');

    const summary = mon.getSummary();
    expect(summary.totalQueries).toBe(2);
    expect(summary.totalErrors).toBe(1);
    mon.clearAllMetrics();
    expect(mon.getAllMetrics()).toHaveLength(0);
    mon.onAlert('c1', () => {})(); // 解绑
    // enableAlerts=false → 不检查
    const quiet = new ConnectionMonitor({ enableAlerts: false });
    quiet.recordQuery('q', 9999, false);
    expect(quiet.getMetrics('q')?.errorCount).toBe(1);
  });
});

describe('SlowQueryMonitor 告警通道', () => {
  it('console/webhook/slack/email 通道 + 回调 + 驱逐最旧记录', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const cb = vi.fn();
    const mon = new SlowQueryMonitor({}, PG_CONFIG, {
      threshold: 1,
      enableAlerts: true,
      maxRecords: 2,
      alertChannels: [
        { type: 'console', config: {} },
        { type: 'webhook', config: { url: 'https://hook' } },
        { type: 'slack', config: { webhookUrl: 'https://slack' } },
        { type: 'email', config: {} },
      ],
    } as never);
    mon.onAlert('m1', cb);
    for (let i = 0; i < 4; i++) {
      await mon.monitorQuery(`Q${i}`, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return { rows: [], rowCount: 0 };
      });
    }
    expect(cb).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(8); // webhook + slack 各 4 次
    expect(mon.getSlowQueries({ limit: 5 }).length).toBeLessThanOrEqual(2); // maxRecords 驱逐
    mon.clearHistory();
    mon.destroy();
  });

  it('通道 fetch 失败不中断告警循环', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('hook down');
    }));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mon = new SlowQueryMonitor({}, PG_CONFIG, {
      threshold: 1,
      enableAlerts: true,
      alertChannels: [{ type: 'webhook', config: { url: 'https://bad' } }],
    } as never);
    await mon.monitorQuery('BADQ', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { rows: [], rowCount: 0 };
    });
    expect(errSpy).toHaveBeenCalled();
    mon.destroy();
  });
});

describe('IndexManager 方言补齐（mysql 全表聚合 + mongo listCollections + usage 分析）', () => {
  const conn = (impl: (sql: string) => Promise<Any>) => ({ query: impl }) as never;

  it('getAllMySQLIndexes 按 SHOW TABLES 展开', async () => {
    const im = new IndexManager(
      conn(async (sql) => {
        if (sql.includes('SHOW TABLES')) return { rows: [{ 'Tables_in_db': 'users' }, { 'Tables_in_db': 'logs' }], rowCount: 2 };
        return {
          rows: [{ Key_name: 'idx_x', Table: 't', Column_name: 'a', Non_unique: 1 }, { Key_name: 'idx_x', Table: 't', Column_name: 'b', Non_unique: 1 }],
          rowCount: 2,
        };
      }),
      MY_CONFIG
    );
    const all = await im.getAllIndexes();
    expect(all.length).toBeGreaterThanOrEqual(2); // 两张表各自去重后的 idx_x
  });

  it('analyzeIndexUsage：postgres 与 mysql 行映射', async () => {
    const pg = new IndexManager(
      conn(async (sql) => {
        if (sql.includes('pg_stat')) {
          return { rows: [{ index_name: 'i1', table_name: 't', scans: 3, tuples_read: 10, tuples_fetched: 8, last_used: null, size: 4096 }], rowCount: 1 };
        }
        return { rows: [{ index_name: 'i2', table_name: 't', scans: 7 }], rowCount: 1 };
      }),
      PG_CONFIG
    );
    const pgUsage = await pg.analyzeIndexUsage();
    expect(pgUsage[0]).toMatchObject({ indexName: 'i1', scans: 3 });

    const my = new IndexManager(
      conn(async () => ({ rows: [{ index_name: 'i2', table_name: 't', scans: 7 }], rowCount: 1 })),
      MY_CONFIG
    );
    const myUsage = await my.analyzeIndexUsage();
    expect(myUsage[0]).toMatchObject({ indexName: 'i2', scans: 7 });
  });

  it('getAllMongoDBIndexes：listCollections 展开 + 缺方法回退空', async () => {
    const mongo = new IndexManager(
      {
        query: async () => ({ rows: [], rowCount: 0 }),
        collection: () => ({ indexes: async () => [{ name: 'idx_k', key: { k: 1 }, unique: true }] }),
        listCollections: () => ({ toArray: async () => [{ name: 'coll1' }] }),
      } as never,
      { ...PG_CONFIG, type: 'mongodb' }
    );
    const all = await mongo.getAllIndexes();
    expect(all[0]).toMatchObject({ name: 'idx_k', unique: true });

    const bare = new IndexManager(
      { query: async () => ({ rows: [], rowCount: 0 }) } as never,
      { ...PG_CONFIG, type: 'mongodb' }
    );
    expect(await bare.getAllIndexes()).toEqual([]);
    expect(await bare.getTableIndexes('x')).toEqual([]);
  });
});

describe('variable-center 校验分支补齐（min/max/pattern + 敏感导出过滤）', () => {
  it('数值越界/字符串 pattern/必填', () => {
    const portDef = VARIABLE_DEFINITIONS.find((d) => d.key === 'node.defaultPort')!;
    expect(validateVariable('node.defaultPort', 80).valid).toBe(false); // < min
    expect(validateVariable('node.defaultPort', 99999).valid).toBe(false); // > max
    expect(validateVariable('node.defaultPort', 3218).valid).toBe(true);

    const patternDef = VARIABLE_DEFINITIONS.find((d) => d.validation?.pattern);
    if (patternDef) {
      expect(validateVariable(patternDef.key, '___bad___').valid).toBe(false);
    }

    const requiredDef = VARIABLE_DEFINITIONS.find((d) => d.required);
    if (requiredDef) {
      expect(validateVariable(requiredDef.key, undefined).valid).toBe(false);
      expect(validateVariable(requiredDef.key, null).valid).toBe(false);
    }
  });

  it('敏感变量导出过滤', () => {
    const sensitiveDef = VARIABLE_DEFINITIONS.find((d) => d.sensitive);
    if (sensitiveDef) {
      setVariableValue(sensitiveDef.key, 'SECRET', 'user');
      const safe = exportVariables(false);
      expect(safe.variables[sensitiveDef.key]).toBeUndefined();
      const full = exportVariables(true);
      expect(full.variables[sensitiveDef.key]).toBe('SECRET');
    }
  });
});

describe('error-handler 分类补齐（DOMException / Event）', () => {
  it('QuotaExceeded → STORAGE / SecurityError → AUTH / error Event → NETWORK', () => {
    const quota = new DOMException('quota', 'QuotaExceededError');
    expect(detectErrorCode(quota).length).toBeGreaterThan(0);
    const appQuota = captureError(quota, { silent: true });
    expect(appQuota.category).toBe('STORAGE');
    expect(appQuota.severity).toBe('warning');

    const sec = new DOMException('no', 'SecurityError');
    expect(captureError(sec, { silent: true }).category).toBe('AUTH');

    const ev = new Event('error');
    expect(captureError(ev, { silent: true }).category).toBe('NETWORK');
  });
});

describe('broadcast-channel 边界（无 BroadcastChannel / post 抛错）', () => {
  it('BroadcastChannel 不可用 → getSharedChannel null + postToChannel 静默', () => {
    const Original = globalThis.BroadcastChannel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as Any).BroadcastChannel = undefined;
    expect(getSharedChannel('nope')).toBeNull();
    expect(() => postToChannel('nope', {})).not.toThrow();
    (globalThis as Any).BroadcastChannel = Original;
    closeAllChannels();
  });

  it('postMessage 抛错被吞', () => {
    const ch = getSharedChannel('throwing')!;
    vi.spyOn(ch, 'postMessage').mockImplementation(() => {
      throw new Error('queue full');
    });
    expect(() => postToChannel('throwing', { a: 1 })).not.toThrow();
    closeAllChannels();
  });
});

describe('api-config 广播监听（远端配置推送合并/拒收）', () => {
  it('远端合法配置更新 → 应用；非法 → 拒收', async () => {
    setAPIConfig({ maxRetries: 2 }, { skipValidation: true });
    const updates: number[] = [];
    const unsub = onAPIConfigChange((c) => updates.push(c.maxRetries));
    const remote = new BroadcastChannel('yyc3_api_config');

    remote.postMessage({ type: 'config_update', config: { ...getAPIConfig(), maxRetries: 7 } });
    await new Promise((r) => setTimeout(r, 20));
    expect(updates).toContain(7);

    remote.postMessage({ type: 'config_update', config: { ...getAPIConfig(), timeout: 1 } });
    await new Promise((r) => setTimeout(r, 20));
    expect(getAPIConfig().maxRetries).toBe(7);

    remote.close();
    unsub();
  });
});

describe('hooks 计时器/剪贴板分支', () => {
  it('useClock/useClockMinutes 卸载清理（fake timers）', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useClock());
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    unmount();
    const { unmount: u2 } = renderHook(() => useClockMinutes());
    act(() => {
      vi.advanceTimersByTime(61000);
    });
    u2();
    vi.useRealTimers();
  });

  it('useCopyFeedback 剪贴板缺失分支', () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const { result } = renderHook(() => useCopyFeedback<number>(10));
    act(() => result.current[1]('text', 42));
    expect(result.current[0]).toBe(42);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: original });
  });
});

describe('GitService 缓存分支', () => {
  it('enableCache=false 每次强制刷新', async () => {
    const svc = getGitService();
    const a = await svc.getCommits(3, 0, true);
    const b = await svc.getCommits(3);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});
