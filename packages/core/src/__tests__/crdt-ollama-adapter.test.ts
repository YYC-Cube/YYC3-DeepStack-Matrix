/**
 * @file: crdt.test.ts
 * @description: crdt + ollama-url + db-adapter + migrate-storage 用例
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { LWWRegister, GCounter, mergeState } from '../crdt';
import {
  isLocalDeployment,
  shouldUseProxy,
  getOllamaChatUrl,
  getOllamaTagsUrl,
  getOllamaUrl,
  getOllamaEndpointInfo,
} from '../ollama-url';
import {
  registerBackend,
  getRegisteredBackends,
  detectBackend,
  createBackend,
} from '../db-adapter';
import {
  migrateKey,
  migrateKeyWithMerge,
  migrateKeyAsArray,
  migrateRawString,
} from '../migrate-storage';
import { closeAllChannels } from '../broadcast-channel';

afterEach(() => {
  localStorage.clear();
  closeAllChannels();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('crdt / LWWRegister', () => {
  it('set/get/export 基础流', () => {
    const reg = new LWWRegister('a', 'node-1');
    expect(reg.value).toBe('a');
    expect(reg.nodeIdDefined).toBeUndefined();
    reg.set('b');
    expect(reg.value).toBe('b');
    const exported = reg.export();
    expect(exported.value).toBe('b');
    expect(exported.nodeId).toBe('node-1');
  });

  it('merge 时间戳大者胜', async () => {
    const reg = new LWWRegister('local');
    const oldTs = reg.timestamp - 10;
    expect(reg.merge({ value: 'old', timestamp: oldTs, nodeId: 'n2' })).toBe(false);
    expect(reg.value).toBe('local');

    await new Promise((r) => setTimeout(r, 5));
    expect(reg.merge({ value: 'new', timestamp: Date.now() + 1000, nodeId: 'n2' })).toBe(true);
    expect(reg.value).toBe('new');
    expect(reg.timestamp).toBeGreaterThan(oldTs);
  });

  it('static import 恢复', () => {
    const reg = LWWRegister.import({ value: 42, timestamp: 123, nodeId: 'n9' });
    expect(reg.value).toBe(42);
    expect(reg.timestamp).toBe(123);
  });
});

describe('crdt / GCounter', () => {
  it('increment/value/merge/export', () => {
    const a = new GCounter('a');
    a.increment();
    a.increment(4);
    expect(a.value).toBe(5);

    a.merge(new Map([['b', 7], ['a', 1]]));
    expect(a.value).toBe(12); // max(5,1) + 7

    const exported = a.export();
    expect(exported.get('a')).toBe(5);
    expect(exported.get('b')).toBe(7);
  });
});

describe('crdt / mergeState 策略', () => {
  const local = { a: 1, b: 2 } as Record<string, unknown>;
  const remote = { a: 9, c: 3 } as Record<string, unknown>;

  it('lww 按时间戳', () => {
    expect(mergeState(local, remote, 'lww', 100, 200)).toEqual(remote);
    expect(mergeState(local, remote, 'lww', 200, 100)).toEqual(local);
    expect(mergeState(local, remote, 'lww')).toEqual(local);
  });
  it('merge-deep 远端覆盖', () => {
    expect(mergeState(local, remote, 'merge-deep')).toEqual({ a: 9, b: 2, c: 3 });
  });
  it('prefer-local 本地优先仅补缺', () => {
    expect(mergeState(local, remote, 'prefer-local')).toEqual({ a: 1, b: 2, c: 3 });
  });
  it('未知策略回退本地', () => {
    expect(mergeState(local, remote, 'unknown' as never)).toEqual(local);
  });
});

describe('ollama-url', () => {
  it('非浏览器环境（window undefined）→ 非本地部署', () => {
    vi.stubGlobal('window', undefined);
    expect(isLocalDeployment()).toBe(false);
    expect(shouldUseProxy()).toBe(false);
    expect(getOllamaChatUrl()).toBe('http://localhost:11434/api/chat');
  });

  it('localhost/内网 → proxy 模式（jsdom 默认 localhost origin）', () => {
    expect(isLocalDeployment()).toBe(true);
    expect(shouldUseProxy()).toBe(true);
    expect(getOllamaChatUrl()).toBe('/api/v1/llm/ollama/chat');
    expect(getOllamaTagsUrl()).toBe('/api/v1/llm/ollama/tags');
    expect(getOllamaUrl('show')).toBe('/api/v1/llm/ollama/show');
    expect(getOllamaUrl('/generate')).toBe('/api/v1/llm/ollama/generate');
    const info = getOllamaEndpointInfo();
    expect(info.mode).toBe('proxy');
    expect(info.chatUrl).toContain('/chat');
  });

  it('内网 IP 段（192.168./10./172.）→ proxy 模式', () => {
    vi.stubGlobal('window', { location: { hostname: '192.168.3.45' } });
    expect(isLocalDeployment()).toBe(true);
    vi.stubGlobal('window', { location: { hostname: '10.0.0.2' } });
    expect(isLocalDeployment()).toBe(true);
    vi.stubGlobal('window', { location: { hostname: '172.16.1.1' } });
    expect(isLocalDeployment()).toBe(true);
    vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
    expect(isLocalDeployment()).toBe(true);
  });

  it('公网域名 → direct 模式', () => {
    vi.stubGlobal('window', { location: { hostname: 'app.example.com' } });
    expect(isLocalDeployment()).toBe(false);
    expect(shouldUseProxy()).toBe(false);
    expect(getOllamaChatUrl()).toBe('http://localhost:11434/api/chat');
    expect(getOllamaTagsUrl()).toBe('http://localhost:11434/api/tags');
    expect(getOllamaUrl('embeddings')).toBe('http://localhost:11434/api/embeddings');
    expect(getOllamaEndpointInfo().mode).toBe('direct');
  });
});

describe('db-adapter', () => {
  it('注册/枚举/实例化', () => {
    registerBackend('mock', () => ({ kind: 'mock' }));
    expect(getRegisteredBackends()).toContain('mock');
    const db = createBackend<{ kind: string }>('mock');
    expect(db.kind).toBe('mock');
  });

  it('未注册后端抛错', () => {
    expect(() => createBackend('supabase')).toThrow(/未注册后端/);
  });

  it('detectBackend: electronAPI → electron-ipc', () => {
    vi.stubGlobal('window', { electronAPI: {} });
    expect(detectBackend()).toBe('electron-ipc');
  });

  it('detectBackend: 默认 supabase（VITE_YYC3_ENABLE_MOCK 分支为构建期 env 快照，stubEnv 无法注入运行期键）', () => {
    expect(detectBackend()).toBe('supabase');
  });
});

describe('migrate-storage', () => {
  it('migrateKey 成功迁移并删除', () => {
    localStorage.setItem('k1', JSON.stringify({ v: 1 }));
    let received: unknown = null;
    expect(migrateKey('k1', (v) => (received = v))).toBe(true);
    expect(received).toEqual({ v: 1 });
    expect(localStorage.getItem('k1')).toBeNull();
  });

  it('migrateKey 无键/坏 JSON', () => {
    expect(migrateKey('missing', () => {})).toBe(false);
    localStorage.setItem('bad', '{nope');
    expect(migrateKey('bad', () => {})).toBe(false);
  });

  it('migrateKeyWithMerge 合并默认值', () => {
    localStorage.setItem('k2', JSON.stringify({ a: 9 }));
    let received: unknown = null;
    expect(migrateKeyWithMerge('k2', { a: 1, b: 2 }, (v) => (received = v))).toBe(true);
    expect(received).toEqual({ a: 9, b: 2 });
  });

  it('migrateKeyAsArray 类型校验', () => {
    localStorage.setItem('k3', JSON.stringify([1, 2]));
    let received: unknown = null;
    expect(migrateKeyAsArray('k3', (v) => (received = v))).toBe(true);
    expect(received).toEqual([1, 2]);

    localStorage.setItem('k4', JSON.stringify({ not: 'array' }));
    expect(migrateKeyAsArray('k4', () => {})).toBe(false);
  });

  it('migrateRawString 原样读取', () => {
    localStorage.setItem('k5', 'raw-text');
    let received: unknown = null;
    expect(migrateRawString('k5', (v) => (received = v))).toBe(true);
    expect(received).toBe('raw-text');
    expect(migrateRawString('nope', () => {})).toBe(false);
  });
});
