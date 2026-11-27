/**
 * @file: hooks-i18n-supabase.test.tsx
 * @description: i18n + React hooks（useClock/useCopyFeedback/useMobileView/usePersistedList/useNetworkConfig）+ supabase 双客户端用例
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 * @note: renderHook 需要 react-router MemoryRouter 包裹 useKeyboardShortcuts/useNetworkConfig 内部的路由依赖
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import React from 'react';
import { useClock, useClockMinutes } from '../useClock';
import { useCopyFeedback } from '../use-copy-feedback';
import { useMobileView } from '../useMobileView';
import { usePersistedList } from '../use-persisted-state';
import { useNetworkConfig } from '../useNetworkConfig';
import { useI18nProvider, useI18n, I18nContext, SUPPORTED_LOCALES } from '../i18n/useI18n';
import { zhCN, enUS } from '../i18n';
import { AuthContext } from '../authContext';
import { WebSocketContext, ViewContext } from '../view-context';

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('i18n', () => {
  it('词典完整性：zh/en 均非空且为对象', () => {
    expect(typeof zhCN).toBe('object');
    expect(typeof enUS).toBe('object');
    expect(Object.keys(zhCN).length).toBeGreaterThan(5);
    expect(Object.keys(enUS).length).toBeGreaterThan(5);
  });

  it('SUPPORTED_LOCALES', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual(['zh-CN', 'en-US']);
  });

  it('useI18nProvider 默认中文 + 切换 en + 持久化', () => {
    const { result } = renderHook(() => useI18nProvider());
    expect(result.current.locale).toBe('zh-CN');
    expect(result.current.t('common.confirm')).toBe(zhCN.common?.confirm ?? '确认');

    act(() => result.current.setLocale('en-US'));
    expect(result.current.locale).toBe('en-US');
    expect(localStorage.getItem('yyc3_locale')).toBe('en-US');
    expect(result.current.t('nonexistent.key.path')).toBe('nonexistent.key.path');
    // 模板变量
    const interpolated = result.current.t('nonexistent.key', { n: 5 });
    expect(interpolated).toBe('nonexistent.key');
  });

  it('localStorage 恢复偏好 + 坏值回退中文', () => {
    localStorage.setItem('yyc3_locale', 'en-US');
    const { result } = renderHook(() => useI18nProvider());
    expect(result.current.locale).toBe('en-US');
    localStorage.setItem('yyc3_locale', 'fr');
    const { result: r2 } = renderHook(() => useI18nProvider());
    expect(r2.current.locale).toBe('zh-CN');
  });

  it('默认 Context.t 独立工作（无 Provider）', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.locale).toBe('zh-CN');
    expect(typeof result.current.t('x.y')).toBe('string');
  });

  it('I18nContext / AuthContext / WebSocketContext / ViewContext 可独立消费', () => {
    const auth = renderHook(() => React.useContext(AuthContext));
    expect(auth.result.current.isGhost).toBe(false);
    expect(auth.result.current.logout).toBeInstanceOf(Function);
    const ws = renderHook(() => React.useContext(WebSocketContext));
    expect(ws.result.current).toBeNull();
    const view = renderHook(() => React.useContext(ViewContext));
    expect(view.result.current).toBeNull();
  });
});

describe('hooks / useClock', () => {
  it('返回 Date 且 useClockMinutes 可用', () => {
    const { result } = renderHook(() => useClock());
    expect(result.current).toBeInstanceOf(Date);
    const { result: r2 } = renderHook(() => useClockMinutes());
    expect(r2.current).toBeInstanceOf(Date);
  });
});

describe('hooks / useCopyFeedback', () => {
  it('copy 设置反馈并在 resetMs 后清除', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopyFeedback<string>(50));
    expect(result.current[0]).toBeNull();
    act(() => result.current[1]('text', 'id-1'));
    expect(result.current[0]).toBe('id-1');
    expect(writeText).toHaveBeenCalledWith('text');
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current[0]).toBeNull();
    vi.useRealTimers();
  });
});

describe('hooks / useMobileView', () => {
  it('断点判定 + resize 响应', () => {
    window.dispatchEvent(new Event('resize'));
    const { result } = renderHook(() => useMobileView());
    expect(['sm', 'md', 'lg', 'xl', '2xl']).toContain(result.current.breakpoint);
    expect(typeof result.current.isMobile).toBe('boolean');
    expect(typeof result.current.isTouch).toBe('boolean');
    expect(result.current.width).toBe(window.innerWidth);
  });
});

describe('hooks / usePersistedList', () => {
  interface Item { id: string }
  it('upsert/prepend/remove/clear/setAll + maxItems 淘汰', async () => {
    const { result } = renderHook(() =>
      usePersistedList<Item>('operationLogs', [{ id: 'seed' }], { maxItems: 3 })
    );
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.upsert({ id: 'a' });
    });
    expect(result.current.items.map((i) => i.id)).toContain('a');

    // 更新已有
    await act(async () => {
      await result.current.upsert({ id: 'a' });
    });
    expect(result.current.items.filter((i) => i.id === 'a')).toHaveLength(1);

    await act(async () => {
      await result.current.prepend({ id: 'b' });
    });
    expect(result.current.items[0].id).toBe('b');

    // 超限淘汰（prepend 到 maxItems+1）
    await act(async () => {
      await result.current.prepend({ id: 'c' });
      await result.current.prepend({ id: 'd' });
    });
    expect(result.current.items.length).toBeLessThanOrEqual(3);

    await act(async () => {
      await result.current.remove('a');
    });
    expect(result.current.items.some((i) => i.id === 'a')).toBe(false);

    await act(async () => {
      await result.current.setAll([{ id: 'x1' }, { id: 'x2' }]);
    });
    expect(result.current.items).toEqual([{ id: 'x1' }, { id: 'x2' }]);

    await act(async () => {
      await result.current.clear();
    });
    expect(result.current.items).toEqual([]);
  });
});

describe('hooks / useNetworkConfig', () => {
  it('updateConfig 自动推导 wsUrl + save/reset + detectNetwork', async () => {
    const { result } = renderHook(() => useNetworkConfig());

    act(() => result.current.updateConfig({ serverAddress: '192.168.3.10', port: '3113' }));
    expect(result.current.config.wsUrl).toBe('ws://192.168.3.10:3113/ws');
    expect(result.current.testStatus).toBe('idle');

    act(() => result.current.save());
    expect(JSON.parse(localStorage.getItem('network_config')!).serverAddress).toBe('192.168.3.10');

    act(() => result.current.reset());
    expect(result.current.config.serverAddress).toBe('localhost');

    await act(async () => {
      await result.current.detectNetwork();
    });
    expect(result.current.detecting).toBe(false);
    expect(result.current.localIP.length).toBeGreaterThan(0);
  });

  it('testConnection 走到终态', async () => {
    const { result } = renderHook(() => useNetworkConfig());
    let status: string = '';
    await act(async () => {
      const res = await result.current.testConnection();
      status = res.success ? 'success' : 'failed';
    });
    expect(['success', 'failed']).toContain(status);
  });
});

describe('supabaseClient（Mock 客户端 · 每用例独立模块实例）', () => {
  // supabaseClient 在模块加载时读取 import.meta.env 生成密码表 —
  // 用 resetModules + 动态 import 保证每个用例拿到对应 env 的实例
  async function freshSupabase() {
    vi.resetModules();
    return await import('../supabaseClient');
  }

  it('未配置密码 → 拒绝登录', async () => {
    const { supabase: sb } = await freshSupabase();
    const r = await sb.auth.signInWithPassword({ email: 'admin@cloudpivot.local', password: '' });
    expect(r.data).toBeNull();
    expect(r.error?.message).toContain('未配置');
  });

  it('配置密码后：错误密码拒绝 / 正确密码登录并持有会话', async () => {
    vi.stubEnv('VITE_MOCK_ADMIN_PASSWORD', 'secret-123');
    const { supabase: sb } = await freshSupabase();
    const bad = await sb.auth.signInWithPassword({ email: 'admin@cloudpivot.local', password: 'wrong' });
    expect(bad.error?.message).toContain('不正确');
    const ok = await sb.auth.signInWithPassword({ email: 'admin@cloudpivot.local', password: 'secret-123' });
    expect(ok.data?.session).toBeTruthy();
    const session = await sb.auth.getSession();
    expect(session.data.session?.user.email).toBe('admin@cloudpivot.local');
    const user = await sb.auth.getUser();
    expect(user.data.user?.id).toBe('usr-001');
  });

  it('会话过期清除', async () => {
    const { supabase: sb } = await freshSupabase();
    localStorage.setItem('yyc3_session', JSON.stringify({ user: {}, token: 't', expiresAt: Date.now() - 1000 }));
    const s = await sb.auth.getSession();
    expect(s.data.session).toBeNull();
    expect(localStorage.getItem('yyc3_session')).toBeNull();
  });

  it('会话坏 JSON 容错', async () => {
    const { supabase: sb } = await freshSupabase();
    localStorage.setItem('yyc3_session', '{broken');
    const s = await sb.auth.getSession();
    expect(s.data.session).toBeNull();
  });

  it('signOut + onAuthStateChange 回调', async () => {
    const { supabase: sb } = await freshSupabase();
    localStorage.setItem('yyc3_session', JSON.stringify({ user: { id: 'u' }, token: 't', expiresAt: Date.now() + 10000 }));
    const events: string[] = [];
    const sub = sb.auth.onAuthStateChange((event) => events.push(event));
    expect(events).toContain('SIGNED_IN');
    await sb.auth.signOut();
    const events2: string[] = [];
    sb.auth.onAuthStateChange((event) => events2.push(event));
    expect(events2).toContain('SIGNED_OUT');
    sub.data.subscription.unsubscribe();
  });

  it('from().select() mock 链', async () => {
    const { supabase: sb } = await freshSupabase();
    const q = sb.from('models').select().eq('id', 'm1');
    expect(q.data).toEqual([]);
    // order() 返回 mockQuery 结果对象（无链式 limit）
    expect(sb.from('models').select().order('id').count).toBe(0);
    expect(sb.from('models').select().limit(1).count).toBe(0);
  });

  it('ghostSignIn + isGhostMode（非 PROD 环境）', async () => {
    const { ghostSignIn: gs, isGhostMode: igm } = await freshSupabase();
    const session = gs();
    expect(session?.user.id).toBe('ghost-000');
    expect(igm()).toBe(true);
  });

  it('toAppUser / toAppSession / toSupabaseMetadata（supabaseClientReal 转换层）', async () => {
    vi.resetModules();
    const real = await import('../supabaseClientReal');
    expect(real.toAppUser({ id: 'u1', email: 'a@b.c', user_metadata: { role: 'admin', name: 'N' } })).toEqual({
      id: 'u1', email: 'a@b.c', role: 'admin', name: 'N',
    });
    const u2 = real.toAppUser({ id: 'u2' });
    expect(u2.email).toBe('');
    expect(u2.role).toBe('developer');
    const s = real.toAppSession({ user: { id: 'u1' }, access_token: 'tok', expires_at: Math.floor(Date.now() / 1000) + 60 });
    expect(s.token).toBe('tok');
    expect(s.expiresAt).toBeGreaterThan(Date.now());
    expect(Object.keys(real.toSupabaseMetadata({ role: 'ops', name: 'X' }))).toContain('role');
    expect(real.supabase).toBeTruthy();
    // 无 VITE_SUPABASE_URL → mock 模式
    expect(real.isMockMode()).toBe(true);
    expect(real.getAuthMode()).toBe('mock');
  });
});
