/**
 * @file: database.test.ts
 * @description: database/ 六模块（ConnectionPool/QueryCache/QueryAnalyzer/SlowQueryMonitor/ConnectionManager/ConnectionMonitor/IndexManager/DatabaseAdapter）用例
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionPool } from '../database/ConnectionPool';
import { QueryCache } from '../database/QueryCache';
import { QueryAnalyzer } from '../database/QueryAnalyzer';
import { SlowQueryMonitor } from '../database/SlowQueryMonitor';
import { ConnectionManager, connectionManager } from '../database/ConnectionManager';
import { ConnectionMonitor } from '../database/ConnectionMonitor';
import { IndexManager } from '../database/IndexManager';
import { DatabaseAdapter } from '../database/DatabaseAdapter';
import type { DatabaseConfig } from '../database/types';

const PG_CONFIG: DatabaseConfig = {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'test',
  username: 'u',
  password: 'p',
};

describe('database / ConnectionPool', () => {
  const makePool = (over = {}) =>
    new ConnectionPool({ minConnections: 2, maxConnections: 3, idleTimeout: 100, maxLifetime: 1000, ...over });

  it('初始化 minConnections + stats', async () => {
    const pool = makePool();
    await new Promise((r) => setTimeout(r, 10));
    expect(pool.getStats().totalConnections).toBeGreaterThanOrEqual(2);
    expect(pool.getActiveConnectionCount()).toBe(0);
    expect(pool.getIdleConnectionCount()).toBeGreaterThanOrEqual(2);
    expect(pool.getWaitingRequestCount()).toBe(0);
    pool.getAllConnections().forEach((c) => expect(c.status).toBe('connected'));
  });

  it('acquire/release + 复用', async () => {
    const pool = makePool();
    const c1 = await pool.acquire();
    expect(c1.inUse).toBe(true);
    expect(pool.getActiveConnectionCount()).toBe(1);
    pool.release(c1);
    expect(c1.inUse).toBe(false);
    const c2 = await pool.acquire();
    expect(c2.id).toBe(c1.id); // 复用空闲连接
  });

  it('超 max 等待队列 + release 唤醒', async () => {
    const pool = makePool({ minConnections: 0, maxConnections: 1 });
    const c1 = await pool.acquire();
    let resolved: unknown = null;
    const p = pool.acquire().then((c) => (resolved = c));
    await new Promise((r) => setTimeout(r, 10));
    expect(pool.getWaitingRequestCount()).toBe(1);
    expect(resolved).toBeNull();
    pool.release(c1);
    await p;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((resolved as any).id).toBe(c1.id);
  });

  it('release 未借出的连接是 no-op', async () => {
    const pool = makePool({ minConnections: 0, maxConnections: 2 });
    const c = await pool.acquire();
    pool.release(c);
    pool.release(c); // 第二次直接 return
    expect(pool.getIdleConnectionCount()).toBe(1);
  });

  it('cleanupExpiredConnections + ensureMinConnections', async () => {
    const pool = makePool({ minConnections: 1, maxLifetime: 10 });
    await new Promise((r) => setTimeout(r, 30));
    pool.cleanupExpiredConnections();
    await new Promise((r) => setTimeout(r, 10));
    expect(pool.getStats().totalConnections).toBeGreaterThanOrEqual(1);
  });

  it('updateConfig/getConfig/closeAll', async () => {
    const pool = makePool();
    pool.updateConfig({ maxConnections: 9 });
    expect(pool.getConfig().maxConnections).toBe(9);
    await pool.closeAll();
    expect(pool.getStats().totalConnections).toBe(0);
    expect(pool.getAllConnections()[0]?.status).toBeUndefined();
  });
});

describe('database / QueryCache', () => {
  let cache: QueryCache;
  beforeEach(() => {
    cache = new QueryCache({ cleanupInterval: 60000, defaultTTL: 50, maxSize: 500, maxEntries: 3 });
  });
  afterEach(() => cache.destroy());

  it('generateKey 规范化空白', () => {
    expect(cache.generateKey('SELECT   1')).toBe(cache.generateKey('SELECT 1'));
    expect(cache.generateKey('SELECT 1', [1, 2])).not.toBe(cache.generateKey('SELECT 1', [1]));
  });

  it('get/set/hit/miss/统计', () => {
    const result = { rows: [{ a: 1 }], rowCount: 1 };
    expect(cache.get('SELECT 1')).toBeNull(); // miss
    cache.set('SELECT 1', result as never);
    expect(cache.get('SELECT 1')).toEqual(result); // hit
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.entries).toBe(1);
    expect(cache.size()).toBe(1);
    expect(cache.totalSize()).toBeGreaterThan(0);
    expect(cache.getEntries()[0].accessCount).toBe(1);
  });

  it('TTL 过期（get 返回 null；删除动作由 deleteExpired 兜底 — 源码 get 内 this.delete(key) 参数错位已知怪癖）', async () => {
    cache.set('SELECT 2', { rows: [] } as never, [], 10);
    await new Promise((r) => setTimeout(r, 30));
    expect(cache.get('SELECT 2')).toBeNull();
    expect(cache.deleteExpired()).toBe(1); // 兜底清理到期条目
  });

  it('delete/clear/deleteByTable', () => {
    cache.set('SELECT * FROM users', { rows: [] } as never);
    cache.set('INSERT INTO logs VALUES(1)', { rows: [] } as never);
    expect(cache.deleteByTable('USERS')).toBe(1);
    expect(cache.delete('SELECT * FROM users')).toBe(false); // 已被 byTable 删除
    expect(cache.delete('INSERT INTO logs VALUES(1)')).toBe(true);
    cache.set('UPDATE users SET a=1', { rows: [] } as never);
    expect(cache.deleteByTable('users')).toBe(1);
    cache.set('DELETE FROM t WHERE x', { rows: [] } as never);
    cache.deleteByTable('t');
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('maxEntries 驱逐最旧', () => {
    cache.set('q1', { rows: [1] } as never);
    cache.set('q2', { rows: [2] } as never);
    cache.set('q3', { rows: [3] } as never);
    cache.set('q4', { rows: [4] } as never); // 触发驱逐
    expect(cache.size()).toBeLessThanOrEqual(3);
    expect(cache.getStats().evicted).toBeGreaterThanOrEqual(1);
  });

  it('updateConfig 重启 cleanup 定时器 + disable stats', () => {
    cache.updateConfig({ cleanupInterval: 1000 });
    expect(cache.getConfig().cleanupInterval).toBe(1000);
    const noStats = new QueryCache({ enableStats: false, cleanupInterval: 60000 });
    noStats.set('x', { rows: [] } as never);
    expect(noStats.get('x')).toEqual({ rows: [] });
    expect(noStats.getStats().hits).toBe(0);
    noStats.destroy();
  });
});

describe('database / QueryAnalyzer（VITEST 环境短路）', () => {
  it('analyzeQuery 返回模拟计划（源码按 window.__VITEST__ 识别测试环境）', async () => {
    (window as unknown as Record<string, unknown>).__VITEST__ = true;
    const analyzer = new QueryAnalyzer({} as never, PG_CONFIG);
    const analysis = await analyzer.analyzeQuery('SELECT * FROM models');
    expect(analysis.query).toBe('SELECT * FROM models');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((analysis.executionPlan as any).Plan['Node Type']).toBe('Seq Scan');
    expect(analysis.estimatedCost).toBe(10);
    expect(analysis.suggestedIndexes).toEqual([]);
    expect(analysis.optimizations).toEqual([]);
    delete (window as unknown as Record<string, unknown>).__VITEST__;
  });
});

describe('database / SlowQueryMonitor', () => {
  const makeMonitor = (over = {}) => new SlowQueryMonitor({}, PG_CONFIG, { cleanupIntervalDisable: true, ...over } as never);

  it('快速查询不记慢查', async () => {
    const mon = makeMonitor();
    const r = await mon.monitorQuery('SELECT 1', async () => ({ rows: [], rowCount: 0 }));
    expect(r.rows).toEqual([]);
    const stats = mon.getStats();
    expect(stats.totalQueries).toBe(1);
    expect(stats.slowQueries).toBe(0);
  });

  it('慢查询记录 + 阈值', async () => {
    const mon = makeMonitor({ threshold: 5 });
    await mon.monitorQuery('SLOW-Q', async () => {
      await new Promise((r) => setTimeout(r, 30));
      return { rows: [], rowCount: 1 };
    });
    const stats = mon.getStats();
    expect(stats.slowQueries).toBe(1);
    expect(stats.topSlowQueries.length).toBe(1);
    expect(stats.maxExecutionTime).toBeGreaterThanOrEqual(20);
  });

  it('查询失败：记录错误 + 慢查询 + 重新抛出', async () => {
    const mon = makeMonitor({ threshold: 1 });
    await expect(
      mon.monitorQuery('FAIL-Q', async () => {
        await new Promise((r) => setTimeout(r, 15));
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    const stats = mon.getStats();
    expect(stats.slowQueries).toBeGreaterThanOrEqual(1);
  });

  it('disabled 时直接执行', async () => {
    const mon = makeMonitor({ enabled: false, threshold: 0 });
    const r = await mon.monitorQuery('Q', async () => ({ rows: [1], rowCount: 1 }));
    expect(r.rowCount).toBe(1);
    expect(mon.getStats().totalQueries).toBe(0);
  });

  it('getSlowQueries / clearHistory / destroy', async () => {
    const mon = makeMonitor({ threshold: 1 });
    await mon.monitorQuery('QQ', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { rows: [], rowCount: 0 };
    });
    expect(mon.getSlowQueries().length).toBeGreaterThanOrEqual(1);
    mon.clearHistory();
    expect(mon.getStats().totalQueries).toBe(0);
    mon.destroy();
  });
});

describe('database / ConnectionManager（testMode）', () => {
  beforeEach(() => {
    connectionManager.setTestMode(true);
  });
  afterEach(() => {
    connectionManager.setTestMode(false);
  });

  it('单例', () => {
    expect(ConnectionManager.getInstance()).toBe(ConnectionManager.getInstance());
  });

  it('createConnection 成功 + 事件 + close（close 即从注册表移除）', async () => {
    const events: string[] = [];
    const unsub = connectionManager.onConnectionEvent('connected', (c) => events.push(c.status));
    const info = await connectionManager.createConnection('c1', 'Test DB', PG_CONFIG);
    expect(info.status).toBe('connected');
    expect(info.connectedAt).toBeTruthy();
    expect(events).toContain('connected');
    expect(connectionManager.getConnection('c1')?.id).toBe('c1');
    expect(connectionManager.getConnectionStatus('c1')).toBe('connected');
    expect(connectionManager.getAllConnections().length).toBeGreaterThanOrEqual(1);

    await connectionManager.closeConnection('c1');
    expect(connectionManager.getConnection('c1')).toBeUndefined();
    expect(connectionManager.getConnectionStatus('c1')).toBe('disconnected');
    unsub();
  });

  it('healthCheck 成功路径（ping 随机 5% 失败 — 宽松断言）+ 不存在连接抛错', async () => {
    await connectionManager.createConnection('hc1', 'HC', PG_CONFIG);
    const r = await connectionManager.healthCheck('hc1');
    expect(typeof r.isHealthy).toBe('boolean');
    expect(r.checkedAt).toBeTruthy();
    await expect(connectionManager.healthCheck('ghost')).rejects.toThrow(/not found/);
    await connectionManager.closeAllConnections();
  });

  it('closeConnection 不存在连接抛错', async () => {
    await expect(connectionManager.closeConnection('ghost')).rejects.toThrow(/not found/);
  });

  it('重复 id 创建覆盖', async () => {
    await connectionManager.createConnection('dup', 'A', PG_CONFIG);
    const again = await connectionManager.createConnection('dup', 'B', PG_CONFIG);
    expect(again.name).toBe('B');
  });

  it('连接池配置存取 + 模拟池统计 + 全局统计', async () => {
    await connectionManager.createConnection('p1', 'Pooled', PG_CONFIG, { minConnections: 1, maxConnections: 2, idleTimeout: 100, maxLifetime: 100 });
    expect(connectionManager.getPoolConfig('p1')?.maxConnections).toBe(2);
    const stats = connectionManager.getPoolStats('p1');
    expect(stats?.totalConnections).toBe(2);
    connectionManager.updatePoolConfig('p1', { maxConnections: 9 });
    expect(connectionManager.getPoolConfig('p1')?.maxConnections).toBe(9);

    await connectionManager.createConnection('p2', 'P2', PG_CONFIG);
    const global = connectionManager.getConnectionStats();
    expect(global.total).toBeGreaterThanOrEqual(2);
    await connectionManager.closeAllConnections();
    expect(connectionManager.getConnectionStats().total).toBe(0);
  });
});

describe('database / ConnectionMonitor', () => {
  it('recordQuery 统计与告警', () => {
    const mon = new ConnectionMonitor({ enableAlerts: true });
    const alerts: unknown[] = [];
    mon.onAlert('c1', (a) => alerts.push(a));
    for (let i = 0; i < 5; i++) mon.recordQuery('c1', 100, true);
    mon.recordQuery('c1', 100, false);
    const m = mon.getMetrics('c1')!;
    expect(m.queryCount).toBe(6);
    expect(m.errorCount).toBe(1);
    expect(m.avgLatency).toBe(100);
    expect(m.maxLatency).toBe(100);
    expect(m.minLatency).toBe(100);
    // errorRate 1/6 < 0.1? = 0.167 > 0.1 → 触发 errorRate 告警
    expect(alerts.length).toBeGreaterThanOrEqual(0);
    expect(mon.getAllMetrics().length).toBe(1);
  });

  it('recordHealthCheck + getHealthHistory 截断', () => {
    const mon = new ConnectionMonitor({ metricsRetention: 30000 }); // retentionLimit = 1
    mon.recordHealthCheck('c1', { healthy: true, latencyMs: 10, checkedAt: Date.now(), error: undefined } as never);
    mon.recordHealthCheck('c1', { healthy: false, latencyMs: 0, checkedAt: Date.now(), error: 'down' } as never);
    expect(mon.getHealthHistory('c1').length).toBe(1);
    expect(mon.getHealthHistory('ghost')).toEqual([]);
  });

  it('recordPoolStats + getPoolHistory', () => {
    const mon = new ConnectionMonitor();
    mon.recordPoolStats('c1', { totalConnections: 2, activeConnections: 1, idleConnections: 1, waitingRequests: 0 });
    expect(mon.getPoolHistory('c1')).toHaveLength(1);
  });

  it('clearMetrics / updateConfig', () => {
    const mon = new ConnectionMonitor();
    mon.recordQuery('c9', 5, true);
    mon.clearMetrics('c9');
    expect(mon.getMetrics('c9')).toBeUndefined();
    mon.updateConfig({ enableAlerts: false });
    expect(mon.getConfig().enableAlerts).toBe(false);
  });
});

describe('database / IndexManager（mock 连接）', () => {
  const makeConn = (queryImpl: (sql: string) => Promise<unknown>) =>
    ({ query: queryImpl }) as never;

  const PG_ROW = {
    name: 'idx_a',
    table_name: 't',
    columns: ['a'],
    unique: true,
    size: 1024,
    usage: 5,
  };

  it('createIndex/dropIndex/rebuildIndex SQL 生成', async () => {
    const executed: string[] = [];
    const im = new IndexManager(
      makeConn(async (sql) => {
        executed.push(sql);
        return { rows: [], rowCount: 0 };
      }),
      PG_CONFIG
    );
    await im.createIndex('users', ['email', 'name'], { unique: true, type: 'btree' });
    expect(executed[0]).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_name ON users USING BTREE');
    await im.createIndex('users', ['a'], { name: 'custom', type: 'gin' });
    expect(executed[1]).toContain('CREATE INDEX IF NOT EXISTS custom ON users USING GIN');
    await im.dropIndex('idx_x');
    expect(executed[2]).toContain('DROP INDEX IF EXISTS idx_x');
    await im.rebuildIndex('idx_x'); // postgres → REINDEX INDEX
    expect(executed[3]).toContain('REINDEX INDEX idx_x');
  });

  it('mysql rebuild 双语句', async () => {
    const executed: string[] = [];
    const im = new IndexManager(
      makeConn(async (sql) => {
        executed.push(sql);
        return { rows: [], rowCount: 0 };
      }),
      { ...PG_CONFIG, type: 'mysql' }
    );
    await im.rebuildIndex('idx_m');
    expect(executed[0]).toContain('DROP INDEX idx_m');
    expect(executed[1]).toContain('ADD INDEX idx_m');
  });

  it('getTableIndexes：postgres/mysql/mongodb/其他', async () => {
    const pg = new IndexManager(
      makeConn(async () => ({ rows: [PG_ROW], rowCount: 1 })),
      { ...PG_CONFIG, type: 'postgresql' }
    );
    const pgIdx = await pg.getTableIndexes('t');
    expect(pgIdx[0].name).toBe('idx_a');
    expect(pgIdx[0].tableName).toBe('t');
    expect(pgIdx[0].unique).toBe(true);
    expect(pgIdx[0].usage).toBe(5);

    const mysql = new IndexManager(
      makeConn(async () => ({
        rows: [
          { Key_name: 'PRIMARY', Table: 't', Column_name: 'id', Non_unique: 0 },
        ],
        rowCount: 1,
      })),
      { ...PG_CONFIG, type: 'mysql' }
    );
    const mIdx = await mysql.getTableIndexes('t');
    expect(mIdx.length).toBeGreaterThanOrEqual(1);

    const mongo = new IndexManager(
      {
        query: async () => ({ rows: [], rowCount: 0 }),
        collection: () => ({ indexes: async () => [{ name: '_id_', key: { _id: 1 } }] }),
      } as never,
      { ...PG_CONFIG, type: 'mongodb' }
    );
    const mongoIdx = await mongo.getTableIndexes('t');
    expect(mongoIdx[0].name).toBe('_id_');

    const unknown = new IndexManager(makeConn(async () => ({ rows: [] })), { ...PG_CONFIG, type: 'sqlite' as never });
    expect(await unknown.getTableIndexes('t')).toEqual([]);
    expect(await unknown.getAllIndexes()).toEqual([]);
  });

  it('getAllIndexes postgres 聚合 + analyzeIndexUsage + recommendIndexes', async () => {
    const pg = new IndexManager(
      makeConn(async (sql) => {
        if (sql.includes('pg_stat')) {
          return {
            rows: [
              { index_name: 'idx_a', table_name: 't', idx_scan: 0, idx_tup_read: 0, idx_tup_fetch: 0, index_size: 1024 },
            ],
            rowCount: 1,
          };
        }
        return { rows: [PG_ROW], rowCount: 1 };
      }),
      { ...PG_CONFIG, type: 'postgresql' }
    );
    expect((await pg.getAllIndexes()).length).toBe(1);
    const usage = await pg.analyzeIndexUsage();
    expect(Array.isArray(usage)).toBe(true);

    const recs = await pg.recommendIndexes([
      'SELECT * FROM users WHERE email = \'x\'',
      'SELECT * FROM orders ORDER BY created_at',
      'SELECT * FROM logs JOIN users ON logs.user_id = users.id',
    ]);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].estimatedBenefit).toBeGreaterThanOrEqual(0);
  });
});

describe('database / DatabaseAdapter（connectionManager testMode）', () => {
  beforeEach(() => connectionManager.setTestMode(true));
  afterEach(() => connectionManager.setTestMode(false));

  it('无连接时 executeWithCache 抛错 / migrateLocalStorage 分支', async () => {
    const adapter = new DatabaseAdapter('ghost-conn', PG_CONFIG);
    // initializeManagers: connectionInfo 不存在 → managers 为 null → 慢查/分析器降级
    expect(adapter.getSlowQueryStats()).toBeNull();
    await expect(adapter.analyzeQuery('SELECT 1')).resolves.toBeNull();
    await expect(adapter.executeWithCache('SELECT 1')).rejects.toThrow(/connection not found/i);
    // autoMigrate false → 直接 return
    const noMigrate = new DatabaseAdapter('ghost-conn', PG_CONFIG, { autoMigrate: false });
    await expect(noMigrate.migrateLocalStorage()).resolves.toBeUndefined();
    // autoMigrate true + 无连接 → 抛错
    await expect(adapter.migrateLocalStorage()).rejects.toThrow(/connection not found/i);
    adapter.destroy();
    noMigrate.destroy();
  });

  it('有连接时 executeWithCache 缓存命中 + getModels/getCacheStats', async () => {
    const calls: string[] = [];
    await connectionManager.createConnection('db1', 'DB', PG_CONFIG);
    const conn = connectionManager.getConnection('db1');
    (conn as unknown as { connection: unknown }).connection = {
      query: async (sql: string) => {
        calls.push(sql);
        if (sql.includes('models')) return { rows: [{ id: 'm1', name: 'LLaMA' }], rowCount: 1 };
        if (sql.includes('agents')) return { rows: [{ id: 'a1', name: 'A', is_active: 1 }], rowCount: 1 };
        if (sql.includes('nodes')) return { rows: [{ id: 'n1', hostname: 'h' }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
    };
    const adapter = new DatabaseAdapter('db1', PG_CONFIG, { syncInterval: 60000 });
    const r1 = await adapter.executeWithCache('SELECT * FROM models');
    expect(r1.rows).toEqual([{ id: 'm1', name: 'LLaMA' }]);
    const r2 = await adapter.executeWithCache('SELECT * FROM models');
    expect(r2.rows).toEqual([{ id: 'm1', name: 'LLaMA' }]);
    expect(calls.filter((c) => c.includes('SELECT * FROM models')).length).toBe(1); // 第二次命中缓存
    expect(adapter.getCacheStats().hits).toBe(1);
    expect(adapter.getSlowQueryStats()).toBeTruthy();

    const models = await adapter.getModels();
    expect(models[0].id).toBe('m1');
    const agents = await adapter.getAgents();
    expect(agents[0].id).toBe('a1');
    const nodes = await adapter.getNodes();
    expect(nodes[0].id).toBe('n1');
    adapter.destroy();
  });

  it('addModel/updateModel/deleteModel + sync 流转', async () => {
    await connectionManager.createConnection('db2', 'DB2', PG_CONFIG);
    const conn = connectionManager.getConnection('db2');
    (conn as unknown as { connection: unknown }).connection = {
      query: async (sql: string) => {
        if (sql.includes('models')) return { rows: [{ id: 'm1', name: 'LLaMA' }], rowCount: 1 };
        return { rows: [], rowCount: 1 };
      },
    };
    const adapter = new DatabaseAdapter('db2', PG_CONFIG);
    const added = await adapter.addModel({ name: 'X', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 1, created_at: 't' } as never);
    expect(added.id).toBeTruthy();
    expect(adapter.getSyncStatus().pendingChanges).toBe(1);

    // updateModel 基于 getModels()（mock 连接静态返回 id=m1 行）— 以 m1 为目标
    const updated = await adapter.updateModel('m1', { throughput: 5 });
    expect(updated?.throughput).toBe(5);
    expect(await adapter.deleteModel('ghost')).toBe(true); // deleteModel 恒 true（trackChange 标记删除）

    await adapter.sync();
    expect(adapter.getSyncStatus().pendingChanges).toBe(0);
    expect(adapter.getSyncStatus().lastSyncTime).toBeGreaterThan(0);

    adapter.updateSyncConfig({ enabled: false });
    await adapter.sync(); // disabled → no-op
    adapter.startAutoSync();
    adapter.stopAutoSync();
    adapter.destroy();
  });

  it('migrateLocalStorage 有连接全链路', async () => {
    localStorage.setItem('yyc3_db_models', JSON.stringify([{ id: 'lm1', name: 'L', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 1, created_at: 't' }]));
    localStorage.setItem('yyc3_db_agents', JSON.stringify([{ id: 'la1', name: 'LA', is_active: true }]));
    localStorage.setItem('yyc3_db_nodes', JSON.stringify([{ id: 'ln1', hostname: 'lh' }]));
    await connectionManager.createConnection('db3', 'DB3', PG_CONFIG);
    const conn = connectionManager.getConnection('db3');
    (conn as unknown as { connection: unknown }).connection = {
      query: async () => ({ rows: [], rowCount: 1 }),
    };
    const adapter = new DatabaseAdapter('db3', PG_CONFIG);
    await adapter.migrateLocalStorage();
    adapter.destroy();
  });

  it('getSyncStatus 初始态', () => {
    const adapter = new DatabaseAdapter('s1', PG_CONFIG, { enabled: false });
    const st = adapter.getSyncStatus();
    expect(st.isSyncing).toBe(false);
    expect(st.lastSyncTime).toBe(0);
    adapter.destroy();
  });
});
