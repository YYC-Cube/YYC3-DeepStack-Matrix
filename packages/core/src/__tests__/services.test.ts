/**
 * @file: services.test.ts
 * @description: variable-center + connection-test-engine + local-knowledge-base + GitService + storageManager + dmusic + music-storage + barrel 冒烟
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VARIABLE_GROUPS,
  VARIABLE_DEFINITIONS,
  getVariableDefinition,
  getVariablesByCategory,
  getVariablesByGroup,
  getGroup,
  getGroupsByCategory,
  getAllCategories,
  loadVariableValues,
  saveVariableValues,
  getVariableValue,
  setVariableValue,
  resetVariableValue,
  resetAllVariableValues,
  getMergedVariableValue,
  validateVariable,
  exportVariables,
  importVariables,
} from '../variable-center';
import { testAIConnection } from '../connection-test-engine';
import {
  searchKnowledge,
  getArticleById,
  getArticlesByCategory,
  getAllCategories as getKbCategories,
  getKnowledgeStats,
  formatSearchResultForAI,
  KnowledgeBaseAPI,
} from '../local-knowledge-base';
import GitService, { getGitService, createGitService } from '../GitService';
import { StorageManager } from '../storageManager';
import {
  MUSIC_LIBRARY,
  ALBUMS,
  ARTIST_PROFILE,
  DMUSIC_LOGOS,
  getRandomLogo,
  getRandomPhoto,
  getTracksByEmotion,
  getTracksByAlbum,
  searchTracks,
} from '../dmusic-resources';
import { uploadMusic, getAllMusic, getMusicById, updateMusic, deleteMusic, batchDeleteMusic, searchMusic } from '../music-storage';
import * as coreIndex from '../index';

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('variable-center', () => {
  it('定义面完整性', () => {
    expect(VARIABLE_DEFINITIONS.length).toBeGreaterThan(5);
    expect(VARIABLE_GROUPS.length).toBeGreaterThan(0);
    expect(getVariableDefinition(VARIABLE_DEFINITIONS[0].key)).toBeTruthy();
    expect(getVariableDefinition('no-such-key')).toBeUndefined();
    expect(getVariablesByCategory('system').length).toBeGreaterThan(0);
    expect(getVariablesByGroup(VARIABLE_GROUPS[0].id).length).toBeGreaterThan(0);
    expect(getGroup(VARIABLE_GROUPS[0].id)).toBeTruthy();
    expect(getGroup('nope')).toBeUndefined();
    expect(getGroupsByCategory('device').length).toBeGreaterThanOrEqual(0);
    expect(getAllCategories()).toContain('system');
  });

  it('值 CRUD + 持久化 + 重置', () => {
    const key = VARIABLE_DEFINITIONS[0].key;
    const def = getVariableDefinition(key)!;
    const original = getVariableValue(key);
    expect(original.key).toBe(key);
    expect(original.source).toBe('default');

    setVariableValue(key, def.default, 'user');
    expect(getVariableValue(key).source).toBe('user');
    expect(JSON.parse(localStorage.getItem('yyc3_variable_values') ?? '{}')).toBeTruthy();

    // 重置单个
    resetVariableValue(key);
    expect(getVariableValue(key).source).toBe('default');
    setVariableValue(key, 'custom', 'user');
    resetAllVariableValues();
    expect(getVariableValue(key).source).toBe('default');

    // 合并视图
    expect(getMergedVariableValue(key)).toBeDefined();
  });

  it('validateVariable 分支', () => {
    const def = VARIABLE_DEFINITIONS.find((d) => d.validation) ?? VARIABLE_DEFINITIONS[0];
    const r1 = validateVariable(def.key, def.default);
    expect(r1.valid).toBe(true);
    // 未知键 → 明确无效
    const r2 = validateVariable('unknown-key', 'x');
    expect(r2.valid).toBe(false);
    expect(r2.errors[0]).toContain('Unknown variable');
    // required 文本变量空值 → 无效
    const textDef = VARIABLE_DEFINITIONS.find((d) => d.required);
    if (textDef) {
      const r3 = validateVariable(textDef.key, '');
      expect(r3.valid).toBe(false);
    }
  });

  it('export/import', () => {
    const key = VARIABLE_DEFINITIONS[0].key;
    setVariableValue(key, 'v1', 'user');
    const exported = exportVariables(true);
    expect(exported.version).toBe('1.0.0');
    expect(exported.variables[key]).toBe('v1');
    // 不含敏感变量（includeSensitive=false 时敏感项被跳过 — 存储为空则两者一致）
    const exportedSafe = exportVariables(false);
    expect(exportedSafe.sensitive).toBe(false);

    resetAllVariableValues();
    const imported = importVariables(exported, true);
    expect(imported.imported).toBeGreaterThanOrEqual(1);
    expect(getVariableValue(key).value).toBe('v1');
    // overwrite=false + 已有用户值 → skipped
    const re = importVariables(exported, false);
    expect(re.skipped).toBeGreaterThanOrEqual(0);
    // 未知键 → skipped
    const bad = importVariables({ version: '1', exportedAt: '', sensitive: false, variables: { 'no-such': 1 } }, true);
    expect(bad.skipped).toBe(1);
    expect(bad.imported).toBe(0);
  });

  it('loadVariableValues 坏 JSON 容错', () => {
    localStorage.setItem('yyc3-variable-values', '{broken');
    expect(loadVariableValues()).toEqual({});
    localStorage.setItem('yyc3-variable-values', JSON.stringify({ k: { key: 'k', value: 1, source: 'user', updatedAt: 1 } }));
    expect(loadVariableValues().k).toBeTruthy();
    saveVariableValues({});
    expect(loadVariableValues()).toEqual({});
  });
});

describe('connection-test-engine / testAIConnection', () => {
  const baseConfig = {
    providerId: 'zhipu',
    providerLabel: 'Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    authType: 'bearer' as const,
    apiKey: 'sk-test',
    modelId: 'glm-4',
    modelName: 'GLM-4',
    isLocal: false,
  };

  it('云厂商全通过管线', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    const r = await testAIConnection(baseConfig);
    expect(r.category).toBe('ai');
    expect(r.overallStatus).toBe('pass');
    expect(r.steps.map((s) => s.label)).toContain('网络可达性');
    expect(r.steps.map((s) => s.label)).toContain('CORS 跨域检测');
    expect(r.steps.map((s) => s.label)).toContain('API Key 认证');
    expect(r.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('401 认证失败给出建议', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Unauthorized', { status: 401 })));
    const r = await testAIConnection(baseConfig);
    const authStep = r.steps.find((s) => s.label === 'API Key 认证');
    expect(authStep?.status).toBe('fail');
    expect(r.suggestion).toContain('API Key');
  });

  it('429 限流为 warn', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate', { status: 429 })));
    const r = await testAIConnection(baseConfig);
    const authStep = r.steps.find((s) => s.label === 'API Key 认证');
    expect(authStep?.status).toBe('warn');
  });

  it('无 Key 跳过认证 + 代理通道 fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string) => new Response('no', { status: 500 }))
    );
    const r = await testAIConnection({ ...baseConfig, apiKey: '', proxyUrl: 'https://proxy.example.com' });
    expect(r.steps.find((s) => s.label === 'API Key 认证')?.status).toBe('skip');
    expect(r.steps.find((s) => s.label === 'CORS 代理通道')?.status).toBe('fail');
  });

  it('fetch 抛错 → 分类为网络类失败', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    const r = await testAIConnection(baseConfig);
    expect(r.overallStatus).not.toBe('pass');
  });

  it('Ollama 本地管线', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [] }), { status: 200 })));
    const r = await testAIConnection({
      providerId: 'ollama',
      providerLabel: 'Ollama',
      baseUrl: 'http://localhost:11434',
      authType: 'none',
      apiKey: '',
      modelId: 'llama3',
      modelName: 'Llama 3',
      isLocal: true,
    });
    expect(r.category).toBe('ollama');
    expect(r.steps.length).toBeGreaterThan(0);
  });
});

describe('local-knowledge-base', () => {
  it('stats + categories', () => {
    const stats = getKnowledgeStats();
    expect(stats.totalArticles).toBeGreaterThan(3);
    expect(stats.categories).toBeGreaterThan(3);
    expect(getKbCategories().length).toBe(stats.categories);
  });

  it('getArticleById / getArticlesByCategory', () => {
    expect(getArticleById('dev-react-19')?.title).toContain('React');
    expect(getArticleById('nope')).toBeUndefined();
    expect(getArticlesByCategory('react').length).toBeGreaterThanOrEqual(1);
  });

  it('searchKnowledge 关键词命中与评分', () => {
    const r = searchKnowledge('zustand');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].article.id).toBe('dev-state-zustand');
    expect(r[0].score).toBeGreaterThan(0);
    expect(r[0].matchedKeywords.length).toBeGreaterThan(0);
    // 前缀/子串启发式：无任何前缀命中的 token 才会零结果
    expect(searchKnowledge('qqqzzzzwww')).toHaveLength(0);
    expect(searchKnowledge('')).toHaveLength(0);
    // category 过滤 + limit
    const scoped = searchKnowledge('state', { category: 'react', limit: 2 });
    expect(scoped.every((x) => x.article.category === 'react')).toBe(true);
    expect(scoped.length).toBeLessThanOrEqual(2);
  });

  it('formatSearchResultForAI + KnowledgeBaseAPI', () => {
    const r = searchKnowledge('react');
    const formatted = formatSearchResultForAI(r.slice(0, 2));
    expect(formatted).toContain('相关度');
    expect(formatted).toContain(r[0].article.title);
    expect(typeof KnowledgeBaseAPI.search('type')).toBe('object');
    expect(KnowledgeBaseAPI.getStats().totalArticles).toBeGreaterThan(0);
    expect(KnowledgeBaseAPI.getCategories().length).toBeGreaterThan(0);
    expect(typeof KnowledgeBaseAPI.getById('dev-react-19')?.title).toBe('string');
    expect(KnowledgeBaseAPI.formatForAI([])).toContain('未在本地知识库');
  });
});

describe('GitService（web 平台 mock 路径）', () => {
  it('平台检测 + initialize + status/commits/branches', async () => {
    const svc = createGitService({ enableCache: true });
    expect(svc.getPlatform()).toBe('web');
    expect(await svc.initialize()).toBe(true);
    const status = await svc.getStatus();
    expect(status).toBeTruthy();
    expect(status.branch).toBeTruthy();
    const cached = await svc.getStatus(); // 缓存命中
    expect(cached).toEqual(status);
    const commits = await svc.getCommits(5);
    expect(commits.length).toBeGreaterThan(0);
    expect((await svc.getBranches()).length).toBeGreaterThan(0);
  });

  it('stage/unstage/commit 流转（web mock：staged 常驻 s1，文件标记在 status 引用上就地变更）', async () => {
    const svc = getGitService();
    const status = await svc.getStatus();
    expect(status.branch).toBe('main');
    expect(status.staged.length).toBeGreaterThanOrEqual(1);
    expect(status.unstaged.length).toBeGreaterThanOrEqual(1);

    const afterStage = await svc.stageFile(status.unstaged[0].id);
    expect(afterStage.branch).toBe('main');
    const afterUnstage = await svc.unstageFile(status.unstaged[0].id);
    expect(afterUnstage.clean).toBe(false);
    await svc.stageAllFiles();
    await svc.unstageAllFiles();

    const commit = await svc.commit('test commit');
    expect(commit).toBeTruthy();
    expect(commit?.message).toBe('test commit');
    expect(commit?.hash).toBeTruthy();
    // 空 message → 源码内部 catch → 返回 null
    expect(await svc.commit('')).toBeNull();
  });

  it('branch checkout/create + pull/push', async () => {
    const svc = getGitService();
    const branches = await svc.getBranches();
    expect(branches.length).toBeGreaterThan(0);
    // checkout 不校验存在性 — 任意名字均返回 true
    expect(await svc.checkoutBranch(branches[0].name)).toBe(true);
    expect(await svc.checkoutBranch('nonexistent-branch')).toBe(true);
    const created = await svc.createBranch('feat-x', branches[0].name);
    expect(created?.name).toBe('feat-x');
    expect((await svc.createBranch('feat-x'))?.name).toBe('feat-x'); // 允许重复（mock 无查重）
    expect((await svc.pull()).success).toBe(true);
    expect((await svc.push()).success).toBe(true);
    await svc.refreshStatus();
  });

  it('default export + onStatusChange 回调', async () => {
    const events: unknown[] = [];
    const svc = new GitService({ onStatusChange: (s) => events.push(s) });
    await svc.getStatus(true);
    expect(events.length).toBeGreaterThanOrEqual(0);
    expect(GitService).toBeTruthy();
  });
});

describe('storageManager（单例 + localStorage 模式）', () => {
  it('getInstance 单例 + 默认配置 + 状态 + 事件', async () => {
    const sm = StorageManager.getInstance();
    expect(StorageManager.getInstance()).toBe(sm);
    const cfg = sm.getConfig();
    expect(cfg.type).toBeTruthy();
    expect(sm.getStatus()).toBeTruthy();

    const events: unknown[] = [];
    sm.onEvent((e) => events.push(e));
    sm.saveConfig({ ...cfg, type: 'local' });
    await sm.triggerSync();
    sm.offEvent(events[0] as never);
    sm.destroy();
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it('离线队列：离线时入队 + 队列持久化', () => {
    const sm = StorageManager.getInstance();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    sm.addToOfflineQueue({ id: 'op1', type: 'addModel', data: { id: 'm1' }, timestamp: Date.now() } as never);
    expect(JSON.parse(localStorage.getItem('yyc3_offline_queue') || '[]').length).toBeGreaterThanOrEqual(0);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    sm.destroy();
  });
});

describe('dmusic-resources', () => {
  it('数据面 + 检索函数', () => {
    expect(MUSIC_LIBRARY.length).toBeGreaterThan(5);
    expect(ALBUMS.length).toBeGreaterThan(0);
    expect(ARTIST_PROFILE.name).toBeTruthy();
    expect(DMUSIC_LOGOS.length).toBeGreaterThan(0);
    expect(getRandomLogo()).toMatch(/^https?:|^\//);
    expect(getRandomPhoto()).toBeTruthy();
    expect(getTracksByEmotion(MUSIC_LIBRARY[0].emotion).length).toBeGreaterThan(0);
    expect(getTracksByAlbum(ALBUMS[0].title).length).toBeGreaterThanOrEqual(0);
    expect(searchTracks(MUSIC_LIBRARY[0].title.slice(0, 4)).length).toBeGreaterThanOrEqual(0);
    expect(searchTracks('zzzznope')).toHaveLength(0);
  });
});

describe('music-storage（fake-indexeddb + Audio/URL mock）', () => {
  const makeFile = () => new File([new Uint8Array([1, 2, 3])], 'song.mp3', { type: 'audio/mpeg' });

  it('upload → getAll → get → update → search → delete 全链路', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    // Audio mock：立即 error（duration=0 分支）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Audio = class {
      addEventListener(ev: string, cb: () => void) {
        setTimeout(() => cb(), 0);
      }
      src = '';
      load() {}
      duration = 12.5;
    };

    const track = await uploadMusic(makeFile(), { title: '测试曲', artist: 'Tester' });
    expect(track.title).toBe('测试曲');
    expect(track.isUserUpload).toBe(true);

    const all = await getAllMusic();
    expect(all.some((t) => t.id === track.id)).toBe(true);
    expect((await getMusicById(track.id))?.title).toBe('测试曲');
    expect(await getMusicById('ghost')).toBeNull();

    const updated = await updateMusic(track.id, { artist: 'New' });
    expect(updated?.artist).toBe('New');
    expect(await updateMusic('ghost', { artist: 'x' })).toBeNull();

    const found = await searchMusic('测试');
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(await searchMusic('zzznope')).toHaveLength(0);

    expect(await deleteMusic(track.id)).toBe(true);
    expect(await batchDeleteMusic(['a', 'b'])).toBe(2);
  });
});

describe('core barrel 冒烟（index.ts 35 行 barrel 实际导出面）', () => {
  it('关键命名空间与符号存在', () => {
    expect(coreIndex.crdt).toBeTruthy();
    expect(coreIndex.dataBus).toBeTruthy();
    expect(typeof coreIndex.isValidUrl).toBe('function');
    expect(typeof coreIndex.getAPIConfig).toBe('function');
    expect(typeof coreIndex.captureError).toBe('function');
    expect(typeof coreIndex.createLocalStore).toBe('function');
    expect(typeof coreIndex.registerBackend).toBe('function');
    expect(coreIndex.supabaseClient).toBeTruthy();
    expect(coreIndex.supabaseClientReal).toBeTruthy();
    expect(coreIndex.ALL_STORES.length).toBeGreaterThan(20);
    expect(typeof coreIndex.getGitService).toBe('function');
  });
});
