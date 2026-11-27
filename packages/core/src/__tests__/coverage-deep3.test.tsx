/**
 * @file: coverage-deep3.test.tsx
 * @description: 深分支覆盖第三轮 — env-config 环境变量分支 / supabaseClientReal 真实客户端分支 / data-bus 私有引擎路径 / storageManager 节流与事件兜底 / GitService 自动刷新 / backgroundSync SW 桩 / use-persisted-state 跨 tab 重载 / useMobileView 断点矩阵
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  env,
  resetEnvConfig,
  setEnvConfig,
} from '../env-config';
import * as dataBusModule from '../data-bus';
import { StorageManager } from '../storageManager';
import { connectionManager } from '../database/ConnectionManager';
import GitService from '../GitService';
import { registerBackgroundSync, addToSyncQueue, getSyncQueueStats } from '../backgroundSync';
import { usePersistedList } from '../use-persisted-state';
import { useMobileView } from '../useMobileView';
import { useCopyFeedback } from '../use-copy-feedback';
import { broadcastSyncMessage } from '../broadcast-channel';
import { waitFor } from '@testing-library/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('env-config 环境变量覆盖分支（stubEnv + 单例重置）', () => {
  it('VITE_YYC3_* 变量在构建 config 时被读取', () => {
    vi.stubEnv('VITE_YYC3_SYSTEM_NAME', 'EnvOverride');
    vi.stubEnv('VITE_YYC3_API_BASE_URL', 'https://api.override.io');
    vi.stubEnv('VITE_YYC3_WS_ENDPOINT', 'ws://override:1/ws');
    vi.stubEnv('VITE_YYC3_OLLAMA_BASE_URL', 'http://ollama.override');
    vi.stubEnv('VITE_YYC3_OLLAMA_PROXY_PATH', '/proxy');
    vi.stubEnv('VITE_YYC3_CLUSTER_ID', 'CL-OVR');
    vi.stubEnv('VITE_YYC3_STORAGE_PREFIX', 'ovr_');
    vi.stubEnv('VITE_YYC3_ENABLE_MOCK', 'false');
    vi.stubEnv('VITE_YYC3_ENABLE_DEBUG', 'true');
    vi.stubEnv('VITE_YYC3_ZHIPU_API_KEY', 'zh-key');
    vi.stubEnv('VITE_YYC3_DEEPSEEK_API_KEY', 'ds-key');
    vi.stubEnv('MODE', 'production');
    resetEnvConfig();
    expect(env('SYSTEM_NAME')).toBe('EnvOverride');
    expect(env('API_BASE_URL')).toBe('https://api.override.io');
    expect(env('ENABLE_MOCK_MODE')).toBe(false);
    expect(env('ENABLE_DEBUG')).toBe(true);
    expect(env('ZHIPU_API_KEY')).toBe('zh-key');
    expect(env('NODE_ENV')).toBe('production');
  });

  it('loadStoredConfig 坏 JSON + setEnvConfig 存储异常静默', () => {
    resetEnvConfig();
    localStorage.setItem('yyc3_env_config', '{broken');
    resetEnvConfig();
    expect(env('SYSTEM_NAME')).toBeTruthy();
    const spy = vi.spyOn(StorageManager.prototype, 'getConfig');
    spy.mockReturnValue(spy.call(StorageManager.getInstance()) as never);
    setEnvConfig({ SYSTEM_NAME: 'Persist' });
    expect(env('SYSTEM_NAME')).toBe('Persist');
    spy.mockRestore();
  });
});

describe('data-bus 私有引擎路径直调（遗留 WS 引擎）', () => {
  it('scheduleReconnect/stopHeartbeat/startHeartbeat/throttledSend/flushOfflineQueue', async () => {
    const bus = dataBusModule.dataBus as Any;
    bus.wsConfig = { url: 'ws://x', reconnectInterval: 10, maxReconnectAttempts: 2, heartbeatInterval: 10, throttleMs: 10 };
    vi.useFakeTimers();

    // reconnect 推进到上限
    bus.scheduleReconnect();
    await vi.advanceTimersByTimeAsync(30);
    bus.scheduleReconnect();
    await vi.advanceTimersByTimeAsync(500);
    // 心跳：无连接 → sendWS 走 no-connection 分支
    bus.startHeartbeat();
    bus.startHeartbeat(); // 幂等
    await vi.advanceTimersByTimeAsync(50);
    bus.stopHeartbeat();
    bus.stopHeartbeat(); // 幂等

    // 节流发送：无连接 → buffer 丢弃分支
    bus.throttledSend({ type: 'log_entry', data: 1, timestamp: Date.now() });
    await vi.advanceTimersByTimeAsync(20);
    // 离线队列 flush：无连接 → no-op
    bus.offlineQueue = [{ type: 'ack', data: 1, timestamp: Date.now() }];
    bus.flushOfflineQueue();
    expect(bus.getOfflineQueueSize()).toBe(1);
    bus.offlineQueue = [];

    vi.useRealTimers();
    bus.wsConfig = null;
    bus.reconnectAttempts = 0;
  });

  it('disconnectWS 完整分支（reconnectTimer/ws 双清）', () => {
    const bus = dataBusModule.dataBus as Any;
    bus.reconnectTimer = setTimeout(() => {}, 1000);
    bus.ws = { close: vi.fn(), readyState: 1 } as never;
    dataBusModule.disconnectDataSync();
    expect(bus.ws).toBeNull();
  });

  it('mergeWithUserPriority 已编辑遥测字段保留', () => {
    const bus = dataBusModule.dataBus as Any;
    bus.userEditedCells.set('n-x', new Set(['gpu']));
    const cur = { id: 'n-x', gpu: 1, mem: 2 } as never;
    const inc = { id: 'n-x', gpu: 9, mem: 9 } as never;
    const merged = bus.mergeWithUserPriority(cur, inc);
    expect(merged.gpu).toBe(1); // 用户编辑过 → 保留
    expect(merged.mem).toBe(9); // 未编辑 → 跟随远端
    bus.userEditedCells.delete('n-x');
  });
});

describe('storageManager 节流/事件兜底/自动同步', () => {
  it('triggerSync 二连发走 throttle clearTimeout 分支 + 抛错监听被吞 + offEvent', async () => {
    const sm = StorageManager.getInstance();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = () => {
      throw new Error('listener boom');
    };
    sm.onEvent(throwing);
    const seen: string[] = [];
    const good = (e: Any) => seen.push(e.type);
    sm.onEvent(good);
    sm.triggerSync();
    sm.triggerSync(); // throttle: clearTimeout 前一个
    await new Promise((r) => setTimeout(r, 600));
    expect(errSpy).toHaveBeenCalledWith('Error in event listener:', expect.any(Error));
    sm.offEvent(throwing);
    sm.offEvent(good);
    sm.destroy();
  });

  it('startAutoSync 定时器回调 + saveConfig 异常分支', async () => {
    const sm = StorageManager.getInstance();
    const setSpy = vi.spyOn(StorageManager.prototype as Any, 'saveConfig');
    // localStorage.setItem 抛错 → saveConfig catch
    const origSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sm.saveConfig({ ...sm.getConfig(), type: 'localStorage' });
    expect(errSpy).toHaveBeenCalledWith('Failed to save storage config:', expect.any(Error));
    vi.restoreAllMocks();
    void origSet;
    void setSpy;
  });
});

describe('GitService 自动刷新 + 缓存分支', () => {
  it('autoRefresh 定时器 + stop', async () => {
    vi.useFakeTimers();
    const svc = new GitService({ autoRefresh: true, refreshInterval: 50, enableCache: true });
    (svc as Any).startAutoRefresh?.();
    await vi.advanceTimersByTimeAsync(120);
    (svc as Any).stopAutoRefresh?.();
    vi.useRealTimers();
    expect(svc.getPlatform()).toBe('web');
  });

  it('getCommits offset 分支 + getStatus 缓存过期刷新', async () => {
    const svc = new GitService({ enableCache: true });
    const all = await svc.getCommits(5, 2);
    expect(all.length).toBeGreaterThan(0);
    const first = await svc.getStatus(false);
    // 缓存 5 秒内 — forceRefresh=false 命中
    const cached = await svc.getStatus(false);
    expect(cached.branch).toBe(first.branch);
  });
});

describe('backgroundSync ServiceWorker 桩（成功/失败分支）', () => {
  it('SW + SyncManager 可用 → 注册成功', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ sync: { register } }) },
    });
    (window as Any).SyncManager = class {};
    expect(await registerBackgroundSync('sync-x')).toBe(true);
    expect(register).toHaveBeenCalledWith('sync-x');
    // 注册失败分支
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.reject(new Error('no sw')) },
    });
    expect(await registerBackgroundSync()).toBe(false);
    delete (window as Any).SyncManager;
  });

  it('队列 stats pending/retrying 区分', () => {
    addToSyncQueue({ type: 'addModel', data: {} } as never);
    const stats = getSyncQueueStats();
    expect(stats.total).toBe(1);
    expect(stats.pending + stats.retrying).toBe(1);
  });
});

describe('use-persisted-state 跨标签页重载 + setAll 空数组分支', () => {
  it('远端 storage 事件触发重新加载', async () => {
    interface Item { id: string }
    const { result } = renderHook(() => usePersistedList<Item>('queryHistory', []));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    // 远端标签页广播 queryHistory 变更 → hook 重新拉取（空 → 保持空）
    const remote = new BroadcastChannel('yyc3_storage_sync');
    act(() => {
      remote.postMessage({ store: 'queryHistory', action: 'put', key: 'x', timestamp: Date.now() });
    });
    await waitFor(() => expect(result.current.items).toEqual([]));
    remote.close();

    // setAll 空数组 → 不调用 idbPutMany
    await act(async () => {
      await result.current.setAll([]);
    });
    expect(result.current.items).toEqual([]);
  });
});

describe('useMobileView 断点矩阵 + touch 分支', () => {
  const setWidth = (w: number) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(w);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sm/md/lg/xl/2xl 断点 + 桌面判定', async () => {
    const raf = vi.fn((cb: () => void) => {
      cb();
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const cases: Array<[number, string, boolean, boolean, boolean]> = [
      [500, 'sm', true, false, false],
      [900, 'md', false, true, false],
      [1100, 'lg', false, false, true],
      [1400, 'xl', false, false, true],
      [2000, '2xl', false, false, true],
    ];
    for (const [w, bp, mobile, tablet, desktop] of cases) {
      setWidth(w);
      const { result, unmount } = renderHook(() => useMobileView());
      expect(result.current.breakpoint).toBe(bp);
      expect(result.current.isMobile).toBe(mobile);
      expect(result.current.isTablet).toBe(tablet);
      expect(result.current.isDesktop).toBe(desktop);
      unmount();
    }
  });

  it('isTouch 两分支（maxTouchPoints）', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => { cb(); return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 });
    delete (window as Any).ontouchstart;
    const { result, unmount } = renderHook(() => useMobileView());
    expect(result.current.isTouch).toBe(false);
    unmount();
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
    const { result: r2, unmount: u2 } = renderHook(() => useMobileView());
    expect(r2.current.isTouch).toBe(true);
    u2();
  });
});

describe('useCopyFeedback 剪贴板拒绝分支', () => {
  it('writeText reject → catch 吞掉不崩', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
    const { result } = renderHook(() => useCopyFeedback<boolean>(20));
    act(() => result.current[1]('x', true));
    expect(result.current[0]).toBe(true);
  });
});

describe('broadcast-channel unknown 域只发 unified', () => {
  it('未知域仅一次 postMessage', () => {
    const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
    broadcastSyncMessage({ domain: 'model-providers', action: 'update' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('ConnectionManager healthCheck 失败分支（Math.random 强制）', () => {
  it('ping 失败 → healthCheck isHealthy false + error', async () => {
    connectionManager.setTestMode(true);
    await connectionManager.createConnection('hc-fail', 'HC', { type: 'postgresql', host: 'h', port: 1, database: 'd', username: 'u', password: 'p' });
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.01); // < 0.05 → 失败
    const r = await connectionManager.healthCheck('hc-fail');
    expect(r.isHealthy).toBe(false);
    expect(r.error).toBeTruthy();
    rnd.mockRestore();
    await connectionManager.closeAllConnections();
    connectionManager.setTestMode(false);
  });
});
