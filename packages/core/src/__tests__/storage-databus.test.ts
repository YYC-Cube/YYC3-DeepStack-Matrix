/**
 * @file: storage.test.ts
 * @description: yyc3-storage (IndexedDB) + create-local-store + data-bus + db-queries + backgroundSync 用例
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ALL_STORES,
  LOCALSTORAGE_KEYS,
  idbPut,
  idbPutMany,
  idbGet,
  idbGetAll,
  idbDelete,
  idbClear,
  idbCount,
  onStorageChange,
  exportAllData,
  importAllData,
  getStorageStats,
  clearAllLocalStorage,
  clearAllStorage,
} from '../yyc3-storage';
import { createLocalStore } from '../create-local-store';
import { dataBus, mergeNodes, editNode, disconnectDataSync, connectDataSync } from '../data-bus';
import {
  addDbModel,
  updateDbModel,
  deleteDbModel,
  addDbAgent,
  updateDbAgent,
  deleteDbAgent,
  addDbNode,
  updateDbNode,
  deleteDbNode,
  resetDbModels,
  resetDbAgents,
  resetDbNodes,
  exportDbData,
  importDbData,
  getActiveModels,
  getRecentLogs,
  getModelStats,
  getNodesStatus,
  getActiveAgents,
  getAllAgents,
  getModelById,
  getNodeById,
} from '../db-queries';
import {
  addToSyncQueue,
  getSyncQueue,
  processSyncQueue,
  clearSyncQueue,
  getSyncQueueStats,
  registerBackgroundSync,
} from '../backgroundSync';
import type { NodeData } from '../types';

const NODE_A: NodeData = { id: 'n1', name: 'node-a', gpu: 10, mem: 20, temp: 30, tasks: 1, status: 'active', model: 'm1' } as unknown as NodeData;
const NODE_B: NodeData = { id: 'n2', name: 'node-b', gpu: 40, mem: 50, temp: 60, tasks: 2, status: 'idle', model: 'm2' } as unknown as NodeData;

beforeEach(() => {
  localStorage.clear();
});

describe('yyc3-storage / IndexedDB CRUD', () => {
  it('put/get/getAll/delete/count 全链路（真实 fake-indexeddb）', async () => {
    await idbPut('queryHistory', { id: 'q1', sql: 'select 1' });
    await idbPut('queryHistory', { id: 'q2', sql: 'select 2' });
    expect(await idbCount('queryHistory')).toBe(2);
    expect((await idbGet<{ id: string }>('queryHistory', 'q1'))?.sql).toBe('select 1');
    expect((await idbGetAll('queryHistory')).length).toBe(2);
    await idbDelete('queryHistory', 'q1');
    expect(await idbCount('queryHistory')).toBe(1);
    await idbClear('queryHistory');
    expect(await idbCount('queryHistory')).toBe(0);
  });

  it('putMany 批量写 + import/export + stats', async () => {
    await idbPutMany('operationLogs', [
      { id: 'o1' },
      { id: 'o2' },
      { id: 'o3' },
    ]);
    expect(await idbCount('operationLogs')).toBe(3);

    const exported = await exportAllData();
    expect(Object.keys(exported)).toHaveLength(ALL_STORES.length);
    expect(exported.operationLogs).toHaveLength(3);

    const res = await importAllData({ reports: [{ id: 'r1' }], alertRules: [] });
    expect(res.imported).toBe(1);
    expect(res.stores).toEqual(['reports']);

    const stats = await getStorageStats();
    expect(stats.stores).toHaveLength(ALL_STORES.length);
    expect(stats.totalRecords).toBeGreaterThanOrEqual(4);
  });

  it('onStorageChange 跨标签页广播（BroadcastChannel 不回环 — 以第二实例模拟远端写入）', async () => {
    const events: unknown[] = [];
    const unsub = onStorageChange((e) => events.push(e));
    // 同标签页写入不会回环通知自己
    await idbPut('diagnosisHistory', { id: 'd1' });
    await new Promise((r) => setTimeout(r, 20));
    expect(events).toHaveLength(0);
    // 远端标签页经同名新实例广播变更事件
    const remote = new BroadcastChannel('yyc3_storage_sync');
    remote.postMessage({ store: 'queryHistory', action: 'put', key: 'q9', timestamp: Date.now() });
    await new Promise((r) => setTimeout(r, 20));
    expect(events).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((events[0] as any).store).toBe('queryHistory');
    remote.close();
    unsub();
  });

  it('clearAllLocalStorage 清注册键与前缀键', () => {
    localStorage.setItem(LOCALSTORAGE_KEYS.session, 'x');
    localStorage.setItem('yyc3-custom-key', 'y');
    localStorage.setItem('other-app', 'z');
    clearAllLocalStorage();
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.session)).toBeNull();
    expect(localStorage.getItem('yyc3-custom-key')).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('z');
  });

  it('clearAllStorage 双层清空', async () => {
    await idbPut('errorLog', { id: 'e1' });
    localStorage.setItem(LOCALSTORAGE_KEYS.session, 'x');
    await clearAllStorage();
    expect(await idbCount('errorLog')).toBe(0);
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.session)).toBeNull();
  });
});

describe('create-local-store', () => {
  interface Item { id: string; name: string; n?: number }
  const defaults: Item[] = [{ id: 'd1', name: 'default' }];

  it('首次加载写默认值 + add/update/remove', () => {
    const store = createLocalStore<Item>('t-key', defaults, 'it');
    expect(store.count()).toBe(1);
    expect(localStorage.getItem('t-key')).toBeTruthy();

    const added = store.add({ name: 'x' });
    expect(added.id).toMatch(/^it-/);
    expect(store.getById(added.id)?.name).toBe('x');

    expect(store.update(added.id, { n: 5 })?.n).toBe(5);
    expect(store.update('nope', { n: 1 })).toBeNull();

    expect(store.remove(added.id)).toBe(true);
    expect(store.remove(added.id)).toBe(false);

    expect(store.getAll()[0].id).toBe('d1');
  });

  it('validator 拦截 add/update/import', () => {
    const validator = (item: Partial<Item>) =>
      typeof item.name === 'string' && item.name.length > 0
        ? { valid: true, errors: [] }
        : { valid: false, errors: ['name 必填'] };
    const store = createLocalStore<Item>('t-key2', defaults, 'it', { validator });
    expect(() => store.add({ name: '' })).toThrow(/Validation failed/);
    const ok = store.add({ name: 'ok' });
    expect(() => store.update(ok.id, { name: '' })).toThrow(/Validation failed/);
    expect(store.validate({ name: '' }).valid).toBe(false);
    expect(store.validate({ name: 'a' }).valid).toBe(true);
    expect(store.importData(JSON.stringify([{ id: 'i1', name: '' }]))).toBe(false);
  });

  it('无 validator 时 validate 恒真', () => {
    const store = createLocalStore<Item>('t-key3', defaults);
    expect(store.validate({}).valid).toBe(true);
  });

  it('removeBatch / reset / export / import', () => {
    const store = createLocalStore<Item>('t-key4', defaults, 'it');
    const a = store.add({ name: 'a' });
    const b = store.add({ name: 'b' });
    expect(store.removeBatch([a.id, b.id, 'ghost'])).toBe(2);
    expect(store.count()).toBe(1);

    const exported = store.exportData();
    expect(exported).toContain('"_key"');
    expect(store.importData(exported)).toBe(true);
    expect(store.count()).toBe(1);

    expect(store.importData(JSON.stringify({ data: [{ id: 'z1', name: 'z' }] }))).toBe(true);
    expect(store.importData(JSON.stringify({ data: 'noarray' }))).toBe(false);
    expect(store.importData('notjson')).toBe(false);
    expect(store.importData(JSON.stringify([{ id: '', name: 'x' }]))).toBe(false);
    expect(store.importData(JSON.stringify([{ id: 'dup', name: 'x' }, { id: 'dup', name: 'y' }]))).toBe(false);

    expect(store.reset()).toHaveLength(1);
    expect(store.count()).toBe(1);
  });

  it('缓存统计 + clearCache', () => {
    const store = createLocalStore<Item>('t-key5', defaults);
    store.getAll();
    store.getAll();
    const stats = store.getCacheStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    store.clearCache();
    expect(store.getCacheStats().hits).toBe(stats.hits); // clearCache 不重置计数
  });

  it('事务 commit/rollback/已提交保护', () => {
    const store = createLocalStore<Item>('t-key6', defaults, 'it');
    const tx = store.transaction();
    // remove/removeBatch 对不存在的 id 不记 change（findIndex<0 直接跳过）
    tx.add({ name: 'tx1' }).update('d1', { n: 9 }).remove('ghost').removeBatch(['ghost2']);
    expect(tx.getChanges()).toHaveLength(2);
    tx.rollback();
    expect(store.count()).toBe(1);

    // remove 存在 id → 记 change
    const tx1b = store.transaction();
    tx1b.update('d1', { n: 1 }).remove('d1');
    expect(tx1b.getChanges()).toHaveLength(2);
    tx1b.rollback();

    const tx2 = store.transaction();
    tx2.add({ name: 'tx2' });
    expect(tx2.commit()).toBe(true);
    expect(store.count()).toBe(2);
    expect(tx2.commit()).toBe(false);

    const tx3 = store.transaction();
    tx3.commit();
    expect(() => tx3.add({ name: 'late' })).toThrow(/already committed/);
    expect(() => tx3.update('d1', {})).toThrow(/already committed/);
    expect(() => tx3.remove('d1')).toThrow(/already committed/);
    expect(() => tx3.removeBatch(['d1'])).toThrow(/already committed/);
    expect(() => store.transaction().rollback()).not.toThrow();
  });

  it('maxCacheSize FIFO 淘汰', () => {
    const store = createLocalStore<Item>('t-key7', [], 'it', { maxCacheSize: 2 });
    store.add({ name: '1', id: 'i1' });
    store.add({ name: '2', id: 'i2' });
    store.add({ name: '3', id: 'i3' });
    expect(store.getAll().map((i) => i.id)).toEqual(['i2', 'i3']);
  });
});

describe('data-bus', () => {
  it('subscribe/publish + 事件历史', () => {
    const events: unknown[] = [];
    const unsub = dataBus.subscribe('nodes', (e) => events.push(e));
    dataBus.publish({ entity: 'nodes', action: 'update', source: 'simulation', timestamp: Date.now(), payload: 1 });
    expect(events).toHaveLength(1);
    unsub();
    dataBus.publish({ entity: 'nodes', action: 'update', source: 'simulation', timestamp: Date.now(), payload: 2 });
    expect(events).toHaveLength(1);
    expect(dataBus.getEventHistory().length).toBeGreaterThanOrEqual(2);
    expect(dataBus.getEntityHistory('nodes').every((e) => e.entity === 'nodes')).toBe(true);
    expect(dataBus.getEventHistory(1)).toHaveLength(1);
    expect(dataBus.getMergeLog()).toEqual([]);
  });

  it('mergeNodeData 各策略 + 新增节点', () => {
    dataBus.clearUserEdits('n1');
    const wsPriority = dataBus.mergeNodeData([NODE_A], [{ ...NODE_A, gpu: 99 }], 'websocket', 'ws_priority');
    expect(wsPriority[0].gpu).toBe(99);

    const userPriority = dataBus.mergeNodeData([NODE_A], [{ ...NODE_A, gpu: 77 }], 'websocket', 'user_priority');
    expect(userPriority[0].gpu).toBe(77); // 未编辑 → 跟随远端遥测

    const tsWin = dataBus.mergeNodeData([NODE_A], [{ ...NODE_A, gpu: 66 }], 'websocket', 'timestamp_win');
    expect(tsWin[0].gpu).toBe(66);

    const shallow = dataBus.mergeNodeData([NODE_A], [{ ...NODE_A, gpu: 55 }], 'websocket', 'shallow_replace');
    expect(shallow[0].gpu).toBe(55);

    const withNew = dataBus.mergeNodeData([NODE_A], [NODE_B], 'initialization');
    expect(withNew).toHaveLength(2);
  });

  it('用户编辑保护: ws_priority 保留编辑字段', () => {
    const edited = editNode([NODE_A], 'n1', { status: 'paused', model: 'm9' });
    expect(edited[0].status).toBe('paused');
    expect(dataBus.getUserEditedFields('n1').has('status')).toBe(true);
    expect(dataBus.getAllUserEditedNodeIds()).toContain('n1');

    const merged = dataBus.mergeNodeData(edited, [{ ...NODE_A, gpu: 88, status: 'active' }], 'websocket', 'ws_priority');
    expect(merged[0].status).toBe('paused'); // 编辑保留
    expect(merged[0].gpu).toBe(88); // 遥测跟随

    dataBus.clearUserEdits('n1', ['status']);
    expect(dataBus.getUserEditedFields('n1').has('status')).toBe(false);
    dataBus.clearUserEdits('n1');
    expect(dataBus.getAllUserEditedNodeIds()).not.toContain('n1');
  });

  it('mergeArrayData', () => {
    const merged = dataBus.mergeArrayData([{ id: 'a', v: 1 } as never], [{ id: 'a', v: 2 } as never, { id: 'b' } as never], 'models');
    expect(merged).toHaveLength(2);
  });

  it('replaceNodes + 便捷函数', () => {
    expect(mergeNodes([NODE_A], [NODE_B], 'db_restore')).toHaveLength(2);
    const replaced = dataBus.replaceNodes([NODE_B], 'simulation');
    expect(replaced[0].id).toBe('n2');
  });

  it('sendWS 离线队列 / 外部 sender / ingest', () => {
    dataBus.registerWSSender(() => false);
    expect(dataBus.isWSConnected()).toBe(true); // external sender 视为连接
    expect(dataBus.sendWS({ type: 'log_entry', data: { x: 1 } })).toBe(false); // sender 拒绝且未开离线队列
    dataBus.unregisterWSSender();

    expect(dataBus.isWSConnected()).toBe(false);
    dataBus.disconnectWS();
    expect(dataBus.getWSState()).toBe('disconnected');

    // ingest: node_update 数组 → publish nodes merge
    const got: unknown[] = [];
    const unsub = dataBus.subscribe('nodes', (e) => got.push(e));
    dataBus.ingestWSMessage({ type: 'node_update', data: [NODE_A] });
    expect(got).toHaveLength(1);
    // metrics_update with entity
    dataBus.ingestWSMessage({ type: 'metrics_update', entity: 'gpu-metrics', data: { v: 1 } });
    // log_entry
    dataBus.ingestWSMessage({ type: 'log_entry', data: {} });
    // heartbeat → 自动 ack（无连接 → false）
    dataBus.ingestWSMessage({ type: 'heartbeat', data: { time: 1 } });
    // 未知类型
    dataBus.ingestWSMessage({ type: 'mystery', data: null });
    // null 输入 → 同步抛 TypeError（源码未做入参守卫）
    expect(() => dataBus.ingestWSMessage(null as never)).toThrow();
    unsub();
    expect(dataBus.getOfflineQueueSize()).toBe(0);
  });

  it('onWSStateChange + connectDataSync deprecated + disconnectDataSync', () => {
    const states: string[] = [];
    const unsub = dataBus.onWSStateChange((s) => states.push(s));
    disconnectDataSync();
    expect(states).toContain('disconnecting');
    expect(states).toContain('disconnected');
    unsub();
    void connectDataSync({ url: 'ws://x' }).then((ok) => expect(ok).toBe(false));
  });
});

describe('db-queries', () => {
  it('models CRUD', () => {
    resetDbModels();
    const added = addDbModel({ name: 'NewModel', provider: 'Test', tier: 'primary', avg_latency_ms: 10, throughput: 100, created_at: 'now' } as never);
    expect(added.id).toMatch(/^m-/);
    expect(updateDbModel(added.id, { throughput: 999 })?.throughput).toBe(999);
    expect(updateDbModel('ghost', {})).toBeNull();
    expect(deleteDbModel(added.id)).toBe(true);
    expect(deleteDbModel(added.id)).toBe(false);
  });

  it('agents CRUD', () => {
    resetDbAgents();
    const added = addDbAgent({ name: 'A', name_cn: '甲', role: 'ops', description: '', is_active: true } as never);
    expect(added.id).toMatch(/^a-/);
    expect(updateDbAgent(added.id, { is_active: false })?.is_active).toBe(false);
    expect(updateDbAgent('ghost', {})).toBeNull();
    expect(deleteDbAgent(added.id)).toBe(true);
  });

  it('nodes CRUD', () => {
    resetDbNodes();
    const added = addDbNode({ hostname: 'h', gpu_util: 1, mem_util: 1, temp_celsius: 1, model_deployed: '', active_tasks: 0, status: 'active' } as never);
    expect(added.id).toMatch(/^n-/);
    expect(updateDbNode(added.id, { gpu_util: 50 })?.gpu_util).toBe(50);
    expect(updateDbNode('ghost', {})).toBeNull();
    expect(deleteDbNode(added.id)).toBe(true);
  });

  it('查询族 + 导入导出', async () => {
    resetDbModels();
    resetDbAgents();
    resetDbNodes();
    const models = await getActiveModels();
    expect(models.data.length).toBeGreaterThanOrEqual(5);
    expect(models.error).toBeNull();

    const logs = await getRecentLogs(30);
    expect(logs.data).toHaveLength(30);
    expect(['success', 'error', 'timeout']).toContain(logs.data[9].status);

    const stats = await getModelStats('m1');
    expect(stats.data?.avgLatency).toBeGreaterThan(0);
    expect((await getModelById('m1')).data?.name).toBe('LLaMA-70B');
    expect((await getModelById('ghost')).data).toBeNull();
    expect((await getModelStats('ghost')).data).toBeNull();

    expect((await getNodesStatus()).data.length).toBeGreaterThanOrEqual(5);
    expect((await getActiveAgents()).data.every((a) => a.is_active)).toBe(true);
    expect((await getAllAgents()).data.length).toBeGreaterThanOrEqual(5);
    expect((await getNodeById('n1')).data?.hostname).toBe('GPU-A100-01');
    expect((await getNodeById('ghost')).data).toBeNull();

    const json = exportDbData();
    expect(importDbData(json)).toBe(true);
    expect(importDbData('broken')).toBe(false);
  });
});

describe('backgroundSync', () => {
  it('registerBackgroundSync 无 SW 支持 → false', async () => {
    expect(await registerBackgroundSync()).toBe(false);
  });

  it('队列 add/process/stats/clear + 上限裁剪', async () => {
    clearSyncQueue();
    const item = addToSyncQueue({ type: 'addModel', data: { name: 'm' } } as never);
    expect(item.id).toBeTruthy();
    expect(item.retries).toBe(0);
    expect(getSyncQueue()).toHaveLength(1);

    const stats = getSyncQueueStats();
    expect(stats.total).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.retrying).toBe(0);
    expect(stats.oldestTimestamp).toBeTruthy();

    const result = await processSyncQueue();
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(getSyncQueue()).toHaveLength(0);

    expect(await processSyncQueue()).toEqual({ success: 0, failed: 0 });
    clearSyncQueue();
    expect(getSyncQueue()).toHaveLength(0);
  });
});
