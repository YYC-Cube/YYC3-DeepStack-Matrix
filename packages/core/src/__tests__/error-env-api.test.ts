/**
 * @file: error-handler-env-api-config.test.ts
 * @description: error-handler + env-config + api-config + broadcast-channel + cross-tab-sync 用例
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getErrorLog,
  clearErrorLog,
  getErrorStats,
  captureError,
  captureValidationError,
  captureNetworkError,
  captureWSError,
  captureAuthError,
  captureParseError,
  trySafe,
  trySafeSync,
  formatErrorForUser,
  getErrorIcon,
  getCategoryLabel,
  detectErrorCode,
  installGlobalErrorListeners,
  errorSuggestions,
} from '../error-handler';
import {
  env,
  getEnvConfig,
  setEnvConfig,
  resetEnvConfig,
  exportEnvConfig,
  importEnvConfig,
  onEnvConfigChange,
} from '../env-config';
import {
  getAPIConfig,
  setAPIConfig,
  setAPIConfigWithValidation,
  validateConfigUpdates,
  resetAPIConfig,
  onAPIConfigChange,
  ENDPOINT_META,
  DEFAULT_WS_ENDPOINT,
} from '../api-config';
import {
  getSharedChannel,
  broadcastSyncMessage,
  onUnifiedSync,
  postToChannel,
  closeChannel,
  closeAllChannels,
  broadcastAgentState,
  onAgentStateChange,
  broadcastInferenceState,
  UNIFIED_SYNC_CHANNEL,
} from '../broadcast-channel';
import {
  initCrossTabSync,
  onCrossTabMessage,
  broadcastNodeUpdate,
  broadcastNodeAdd,
  broadcastNodeRemove,
  getTabId,
  destroyCrossTabSync,
} from '../cross-tab-sync';

beforeEach(() => {
  localStorage.clear();
  clearErrorLog();
});

afterEach(() => {
  closeAllChannels();
  destroyCrossTabSync();
  vi.restoreAllMocks();
});

describe('error-handler', () => {
  it('captureError 分类 TypeError', () => {
    const app = captureError(new TypeError('cannot read x'), { silent: true });
    expect(app.category).toBe('RUNTIME');
    expect(app.severity).toBe('error');
    expect(app.message).toBe('cannot read x');
    expect(app.resolved).toBe(false);
    expect(app.id).toMatch(/^err_/);
    expect(getErrorLog()).toHaveLength(1);
  });

  it('captureError 字符串错误', () => {
    const app = captureError('boom', { silent: true });
    expect(app.message).toBe('boom');
    expect(app.category).toBe('UNKNOWN');
  });

  it('captureError 对象 message', () => {
    const app = captureError({ message: 'obj fail' }, { silent: true });
    expect(app.message).toBe('obj fail');
  });

  it('captureError 非 Error 对象 → 未知错误', () => {
    const app = captureError(42, { silent: true });
    expect(app.message).toBe('未知错误');
  });

  it('captureError severity/category 覆盖与 detail', () => {
    const app = captureError(new Error('x'), {
      silent: true,
      category: 'NETWORK',
      severity: 'critical',
      source: 'test',
      detail: 'more',
    });
    expect(app.category).toBe('NETWORK');
    expect(app.severity).toBe('critical');
    expect(app.source).toBe('test');
    expect(app.detail).toBe('more');
    expect(app.userAction).toBe(errorSuggestions.UNKNOWN); // "x" 无任何关键词 → UNKNOWN 兜底
  });

  it('非 silent 输出 console.error/warn/info', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    captureError(new Error('e1'));
    captureError(new Error('e2'), { severity: 'warning' });
    captureError(new Error('e3'), { severity: 'info' });
    expect(errSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it('detectErrorCode 关键词矩阵', () => {
    expect(detectErrorCode(new Error('request timeout'), 'NETWORK')).toBe('NETWORK_TIMEOUT');
    expect(detectErrorCode(new Error('网络错误'), 'NETWORK')).toBe('NETWORK_OFFLINE');
    expect(detectErrorCode(new Error('CORS policy'), 'NETWORK')).toBe('NETWORK_CORS');
    expect(detectErrorCode(new Error('token expired'), 'AUTH')).toBe('AUTH_EXPIRED');
    expect(detectErrorCode(new Error('无效凭证'), 'AUTH')).toBe('AUTH_INVALID');
    expect(detectErrorCode(new Error('403 forbidden'), 'AUTH')).toBe('AUTH_FORBIDDEN');
    expect(detectErrorCode(new Error('bad url 地址'), 'VALIDATION')).toBe('VALIDATION_INVALID_URL');
    expect(detectErrorCode(new Error('数字 number wrong'), 'VALIDATION')).toBe('VALIDATION_INVALID_NUMBER');
    expect(detectErrorCode(new Error('required field 必填'), 'VALIDATION')).toBe('VALIDATION_REQUIRED_FIELD');
    expect(detectErrorCode(new Error('out of range 范围'), 'VALIDATION')).toBe('VALIDATION_OUT_OF_RANGE');
    expect(detectErrorCode(new Error('bad json'), 'PARSE')).toBe('PARSE_JSON_ERROR');
    expect(detectErrorCode(new Error('xml broken'), 'PARSE')).toBe('PARSE_XML_ERROR');
    expect(detectErrorCode(new Error('quota exceeded 存储空间'), 'STORAGE')).toBe('STORAGE_QUOTA_EXCEEDED');
    expect(detectErrorCode(new Error('storage unavailable'), 'STORAGE')).toBe('STORAGE_NOT_AVAILABLE');
    expect(detectErrorCode(new Error('type error 类型'), 'RUNTIME')).toBe('RUNTIME_TYPE_ERROR');
    expect(detectErrorCode(new Error('reference 引用'), 'RUNTIME')).toBe('RUNTIME_REFERENCE_ERROR');
    expect(detectErrorCode(new Error('zzz'), 'UNKNOWN')).toBe('UNKNOWN');
    // 无 category 时自动分类
    expect(detectErrorCode(new SyntaxError('bad json'))).toBe('PARSE_JSON_ERROR');
  });

  it('capture 便捷函数族', () => {
    const v = captureValidationError([{ field: 'a', message: '必填', code: 'REQ' }], 'form');
    expect(v.category).toBe('VALIDATION');
    expect(v.severity).toBe('warning');
    expect(v.source).toBe('form');

    expect(captureNetworkError(new Error('timeout'), '/api').category).toBe('NETWORK');
    expect(captureWSError(new Error('ws down')).source).toBe('WebSocket');
    expect(captureAuthError(new Error('expired')).category).toBe('AUTH');
    expect(captureParseError(new Error('bad json'), 'parser').category).toBe('PARSE');
  });

  it('getErrorStats 汇总', () => {
    captureError(new Error('a'), { silent: true, severity: 'critical' });
    captureError(new Error('b'), { silent: true, category: 'AUTH' });
    const stats = getErrorStats();
    expect(stats.total).toBe(2);
    expect(stats.unresolvedCount).toBe(2);
    expect(stats.byCategory.UNKNOWN).toBe(1);
    expect(stats.byCategory.AUTH).toBe(1);
    expect(stats.bySeverity.critical).toBe(1);
    expect(stats.lastErrorTime).toBeGreaterThan(0);
    expect(getErrorStats().lastErrorTime).toBeTruthy();
  });

  it('formatErrorForUser / getErrorIcon / getCategoryLabel', () => {
    const app = captureError(new Error('msg'), { silent: true, userAction: '做点什么', source: 'loc' });
    const formatted = formatErrorForUser(app);
    expect(formatted).toContain('msg');
    expect(formatted).toContain('建议');
    expect(formatted).toContain('位置');
    expect(getErrorIcon('critical')).toBe('🚨');
    expect(getErrorIcon('error')).toBe('❌');
    expect(getErrorIcon('warning')).toBe('⚠️');
    expect(getErrorIcon('info')).toBe('ℹ️');
    expect(getErrorIcon('zzz' as never)).toBe('❓');
    expect(getCategoryLabel('NETWORK')).toBe('网络错误');
    expect(getCategoryLabel('PARSE')).toBe('解析错误');
  });

  it('trySafe / trySafeSync', async () => {
    const [ok, err] = await trySafe(async () => 42, 'src');
    expect(ok).toBe(42);
    expect(err).toBeNull();
    const [val, e2] = await trySafe(async () => {
      throw new Error('no');
    });
    expect(val).toBeNull();
    expect(e2?.message).toBe('no');
    const [ok2] = trySafeSync(() => 'yes');
    expect(ok2).toBe('yes');
    const [v2, e3] = trySafeSync(() => {
      throw new Error('sync fail');
    });
    expect(v2).toBeNull();
    expect(e3?.message).toBe('sync fail');
  });

  it('installGlobalErrorListeners 幂等 + 过滤 figma 错误', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    installGlobalErrorListeners();
    installGlobalErrorListeners(); // 第二次为 no-op
    expect(infoSpy).toHaveBeenCalledWith('[YYC³] 全局错误监听器已安装');
    // 触发 error 事件（figma 平台错误 → 被 filter 吞掉）
    const figmaEvent = new Event('error') as ErrorEvent;
    Object.defineProperty(figmaEvent, 'message', { value: 'IframeMessage abort' });
    Object.defineProperty(figmaEvent, 'filename', { value: 'https://figma.com/x.js' });
    window.dispatchEvent(figmaEvent);
    // 普通错误 → 入日志
    const normal = new Event('error') as ErrorEvent;
    Object.defineProperty(normal, 'message', { value: 'normal failure' });
    Object.defineProperty(normal, 'filename', { value: '/app/main.js' });
    window.dispatchEvent(normal);
    expect(getErrorLog().some((e) => e.message === 'normal failure')).toBe(true);
  });
});

describe('env-config', () => {
  it('env 默认值', () => {
    resetEnvConfig();
    expect(env('SYSTEM_NAME')).toBe('YYC³ Cloud Intelli-Matrix');
    expect(env('ENABLE_MOCK_MODE')).toBe(true);
    expect(env('OLLAMA_PROXY_PATH')).toBe('/api/v1/llm/ollama');
    expect(env('INFERENCE_DEFAULT_BACKEND')).toBe('ollama');
  });

  it('getEnvConfig 返回副本', () => {
    const c1 = getEnvConfig();
    const c2 = getEnvConfig();
    expect(c1).not.toBe(c2);
    expect(c1).toEqual(c2);
  });

  it('setEnvConfig 持久化 + 通知监听', () => {
    resetEnvConfig();
    const spy = vi.fn();
    const unsub = onEnvConfigChange(spy);
    const updated = setEnvConfig({ SYSTEM_NAME: 'Custom', DB_POOL_MAX: 20 });
    expect(updated.SYSTEM_NAME).toBe('Custom');
    expect(spy).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('yyc3_env_config')!).SYSTEM_NAME).toBe('Custom');
    unsub();
    setEnvConfig({ SYSTEM_NAME: 'X2' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('exportEnvConfig / importEnvConfig', () => {
    resetEnvConfig();
    setEnvConfig({ CLUSTER_ID: 'TEST-01' });
    const json = exportEnvConfig();
    expect(json).toContain('"env-config"');
    resetEnvConfig();
    expect(getEnvConfig().CLUSTER_ID).not.toBe('TEST-01');
    expect(importEnvConfig(json)).toBe(true);
    expect(getEnvConfig().CLUSTER_ID).toBe('TEST-01');
    expect(importEnvConfig('{broken')).toBe(false);
  });

  it('resetEnvConfig 清除存储', () => {
    setEnvConfig({ SYSTEM_NAME: 'Y' });
    resetEnvConfig();
    expect(localStorage.getItem('yyc3_env_config')).toBeNull();
    expect(getEnvConfig().SYSTEM_NAME).toBe('YYC³ Cloud Intelli-Matrix');
  });
});

describe('api-config', () => {
  it('默认配置', () => {
    resetAPIConfig();
    const c = getAPIConfig();
    expect(c.fsBase).toBe('/api/fs');
    expect(c.wsEndpoint).toBe(DEFAULT_WS_ENDPOINT);
    expect(c.enableBackend).toBe(false);
    expect(c.timeout).toBe(15000);
    expect(c.maxRetries).toBe(2);
  });

  it('setAPIConfig 合法更新 + 通知', () => {
    resetAPIConfig();
    const spy = vi.fn();
    const unsub = onAPIConfigChange(spy);
    const updated = setAPIConfig({ timeout: 30000, enableBackend: true });
    expect(updated.timeout).toBe(30000);
    expect(JSON.parse(localStorage.getItem('yyc3_api_endpoints')!).timeout).toBe(30000);
    expect(spy).toHaveBeenCalled();
    unsub();
  });

  it('setAPIConfig 非法更新拒绝（不静默告警）', () => {
    resetAPIConfig();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const before = getAPIConfig();
    const result = setAPIConfig({ timeout: 1 });
    expect(result).toEqual(before);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('setAPIConfig skipValidation + silent', () => {
    resetAPIConfig();
    const result = setAPIConfig({ fsBase: '/x' }, { skipValidation: true, silent: true });
    expect(result.fsBase).toBe('/x');
  });

  it('setAPIConfigWithValidation 成败两态', () => {
    resetAPIConfig();
    const ok = setAPIConfigWithValidation({ maxRetries: 5 });
    expect(ok.validation.success).toBe(true);
    expect(ok.config.maxRetries).toBe(5);
    const bad = setAPIConfigWithValidation({ timeout: 999999 });
    expect(bad.validation.success).toBe(false);
    expect(getAPIConfig().maxRetries).toBe(5);
  });

  it('validateConfigUpdates', () => {
    resetAPIConfig();
    expect(validateConfigUpdates({ timeout: 60000 }).success).toBe(true);
    expect(validateConfigUpdates({ timeout: 1 }).success).toBe(false);
  });

  it('损坏的存储配置回退默认（模块加载时校验，动态重载验证）', async () => {
    localStorage.setItem('yyc3_api_endpoints', '{"timeout": 1}');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.resetModules();
    const fresh = await import('../api-config');
    expect(fresh.getAPIConfig().timeout).toBe(15000);
    expect(warnSpy).toHaveBeenCalled();
    localStorage.removeItem('yyc3_api_endpoints');
  });

  it('坏 JSON 存储清理重载', async () => {
    localStorage.setItem('yyc3_api_endpoints', '{broken');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.resetModules();
    const fresh = await import('../api-config');
    expect(fresh.getAPIConfig().fsBase).toBe('/api/fs');
    expect(warnSpy).toHaveBeenCalled();
    localStorage.removeItem('yyc3_api_endpoints');
  });

  it('存储中含空串/null 字段被清洗并回填默认', async () => {
    localStorage.setItem(
      'yyc3_api_endpoints',
      JSON.stringify({ fsBase: '', dbBase: null, timeout: 20000, junk: 'keep?' })
    );
    vi.resetModules();
    const fresh = await import('../api-config');
    const c = fresh.getAPIConfig();
    expect(c.fsBase).toBe('/api/fs');
    expect(c.dbBase).toBe('/api/db');
    expect(c.timeout).toBe(20000);
    localStorage.removeItem('yyc3_api_endpoints');
  });

  it('ENDPOINT_META 元数据完整', () => {
    expect(ENDPOINT_META.length).toBeGreaterThanOrEqual(8);
    const keys = ENDPOINT_META.map((m) => m.key);
    expect(keys).toContain('wsEndpoint');
    expect(ENDPOINT_META.every((m) => m.labelCn.length > 0)).toBe(true);
  });

  it('resetAPIConfig 清存储', () => {
    setAPIConfig({ timeout: 25000 });
    resetAPIConfig();
    expect(localStorage.getItem('yyc3_api_endpoints')).toBeNull();
    expect(getAPIConfig().timeout).toBe(15000);
  });
});

describe('broadcast-channel', () => {
  it('getSharedChannel 单例', () => {
    const a = getSharedChannel('ch1');
    const b = getSharedChannel('ch1');
    expect(a).toBe(b);
    closeChannel('ch1');
    const c = getSharedChannel('ch1');
    expect(c).not.toBe(a);
  });

  it('postToChannel / onUnifiedSync 收发（BroadcastChannel 不回环 — 以第二实例模拟远端标签页）', async () => {
    const received: unknown[] = [];
    const unsub = onUnifiedSync((msg) => received.push(msg));
    // 远端标签页通过同名新实例投递（消息派发为异步任务）
    const remote = new BroadcastChannel(UNIFIED_SYNC_CHANNEL);
    remote.postMessage({ domain: 'settings', action: 'update' });
    remote.postMessage({ hello: 1 }); // 无 domain → 忽略
    await new Promise((r) => setTimeout(r, 20));
    expect(received.length).toBe(1);
    // 本地 post 不会回环给自己
    postToChannel(UNIFIED_SYNC_CHANNEL, { domain: 'settings', action: 'update' });
    await new Promise((r) => setTimeout(r, 20));
    expect(received.length).toBe(1);
    remote.close();
    unsub();
  });

  it('broadcastSyncMessage 域路由兼容旧通道', () => {
    const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
    broadcastSyncMessage({ domain: 'global-store', action: 'update' });
    broadcastSyncMessage({ domain: 'settings', action: 'reset' });
    broadcastSyncMessage({ domain: 'api-config', action: 'update' });
    broadcastSyncMessage({ domain: 'indexeddb', action: 'delete' });
    broadcastSyncMessage({ domain: 'node-slice', action: 'create' });
    // unified + legacy 双发（前四类有 legacy）
    expect(spy).toHaveBeenCalledTimes(9);
  });

  it('broadcastAgentState / onAgentStateChange / broadcastInferenceState', async () => {
    const received: unknown[] = [];
    const unsub = onAgentStateChange((msg) => received.push(msg));
    const remote = new BroadcastChannel(UNIFIED_SYNC_CHANNEL);
    broadcastAgentState('agent-1', 'running', 'task-9');
    // 自发消息不回环 — 由远端实例投递同构消息触发 handler
    remote.postMessage({
      domain: 'agent-state',
      agentId: 'agent-2',
      state: 'idle',
      currentTaskId: null,
      timestamp: Date.now(),
      source: 'tab-x',
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = received[0] as any;
    expect(msg.agentId).toBe('agent-2');
    expect(msg.currentTaskId).toBeNull();
    broadcastInferenceState('ollama', 'llama', 'loading');
    remote.close();
    unsub();
  });

  it('closeAllChannels 清空', () => {
    getSharedChannel('x1');
    getSharedChannel('x2');
    closeAllChannels();
    // 重开后为新实例
    expect(getSharedChannel('x1')).toBeTruthy();
  });
});

describe('cross-tab-sync', () => {
  it('init + broadcast + listener', () => {
    initCrossTabSync();
    const received: unknown[] = [];
    const unsub = onCrossTabMessage('NODE_UPDATE', (payload) => received.push(payload));
    broadcastNodeUpdate('n1', { gpu: 50 });
    broadcastNodeAdd({ id: 'n2' });
    broadcastNodeRemove('n3');
    // 自发自发（BroadcastChannel 不回环给自己——jsdom 按标准实现不同标签页隔离）
    expect(getTabId()).toMatch(/^tab-/);
    unsub();
  });

  it('destroy 后重启', () => {
    initCrossTabSync();
    destroyCrossTabSync();
    initCrossTabSync();
    destroyCrossTabSync();
  });
});
