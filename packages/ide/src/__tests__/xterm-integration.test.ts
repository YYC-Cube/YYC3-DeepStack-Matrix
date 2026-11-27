/**
 * @file: xterm-integration.test.ts
 * @description: XtermIntegration 纯逻辑用例 — 终端主题/默认选项常量 + MockTerminalBackend 状态机 + WebSocketTerminalBackend（WS 全桩）+ 工厂分流
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  YYC3_TERMINAL_THEME,
  DEFAULT_XTERM_OPTIONS,
  MockTerminalBackend,
  WebSocketTerminalBackend,
  createTerminalBackend,
} from '../XtermIntegration';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  binaryType = 'blob';
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: unknown[] = [];
  closed = false;

  constructor(public url: string) {
    if (url === 'ws://boom') { throw new Error('invalid url'); }
    FakeWebSocket.instances.push(this);
  }

  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.(); }
  emit(data: string) { this.onmessage?.({ data }); }
  fail() { this.onerror?.(); }
}

describe('终端常量与默认选项', () => {
  it('YYC3_TERMINAL_THEME 全 21 色槽齐备且为 hex/rgba 值', () => {
    for (const key of ['background', 'foreground', 'cursor', 'red', 'green', 'brightWhite'] as const) {
      expect(YYC3_TERMINAL_THEME[key], key).toMatch(/^(#|rgba)/);
    }
    expect(Object.keys(YYC3_TERMINAL_THEME)).toHaveLength(21);
  });

  it('DEFAULT_XTERM_OPTIONS 与主题对齐（滚动/光标/EOL）', () => {
    expect(DEFAULT_XTERM_OPTIONS.theme).toBe(YYC3_TERMINAL_THEME);
    expect(DEFAULT_XTERM_OPTIONS.cursorBlink).toBe(true);
    expect(DEFAULT_XTERM_OPTIONS.convertEol).toBe(true);
    expect(DEFAULT_XTERM_OPTIONS.scrollback).toBe(5000);
    expect(DEFAULT_XTERM_OPTIONS.cursorStyle).toBe('block');
  });
});

describe('MockTerminalBackend 本地状态机', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('connect：connecting → connected 并推送欢迎横幅', async () => {
    const backend = new MockTerminalBackend();
    const seen: string[] = [];
    const off = backend.onMessage((m) => seen.push(m.type));
    expect(backend.getState()).toBe('disconnected');

    const p = backend.connect('s1');
    expect(backend.getState()).toBe('connecting');
    expect(seen).toEqual(['connect']);
    await vi.advanceTimersByTimeAsync(120);
    await p;

    expect(backend.getState()).toBe('connected');
    expect(seen).toEqual(['connect', 'data']);
    off();
  });

  it('disconnect：移除会话并回退 disconnected', async () => {
    const backend = new MockTerminalBackend();
    const connecting = backend.connect('s1');
    await vi.advanceTimersByTimeAsync(120);
    await connecting;
    backend.disconnect('s1');
    expect(backend.getState()).toBe('disconnected');
    backend.disconnect('ghost'); // 未知会话 no-op
    expect(backend.getState()).toBe('disconnected');
  });

  it('write：普通字符原样回显; "\\r" 换行后补提示符; 未知会话静默', async () => {
    const backend = new MockTerminalBackend();
    const data: string[] = [];
    backend.onMessage((m) => { if (m.type === 'data') { data.push(m.data ?? ''); } });
    const connecting = backend.connect('s1');
    await vi.advanceTimersByTimeAsync(120);
    await connecting;
    data.length = 0;

    backend.write('ghost', 'x'); // no-op
    backend.write('s1', 'ls');
    expect(data).toEqual(['ls']);

    backend.write('s1', '\r');
    expect(data).toEqual(['ls', '\r\n']);
    await vi.advanceTimersByTimeAsync(60);
    expect(data).toEqual(['ls', '\r\n', '$ ']);
  });

  it('onMessage 返回退订函数; resize 为安全 no-op', async () => {
    const backend = new MockTerminalBackend();
    const seen: unknown[] = [];
    const off = backend.onMessage((m) => seen.push(m));
    off();
    backend.write('s1', 'x');
    expect(seen).toEqual([]);
    expect(() => backend.resize('s1', 80, 24)).not.toThrow();
  });
});

describe('WebSocketTerminalBackend（WS 桩）与工厂', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('createTerminalBackend 按有无 wsUrl 分流', () => {
    expect(createTerminalBackend()).toBeInstanceOf(MockTerminalBackend);
    expect(createTerminalBackend('ws://x')).toBeInstanceOf(WebSocketTerminalBackend);
  });

  it('connect 后 onopen → connected; JSON 消息透传; 非 JSON 回退 data', async () => {
    const backend = new WebSocketTerminalBackend('ws://ok');
    const seen: { type: string; data?: string }[] = [];
    backend.onMessage((m) => seen.push(m as { type: string; data?: string }));
    await backend.connect('s1');
    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toBe('ws://ok');
    expect(backend.getState()).toBe('connecting');

    ws.emit('not-json-at-all');
    expect(seen[0]).toEqual({ type: 'data', sessionId: 'default', data: 'not-json-at-all' });

    ws.emit(JSON.stringify({ type: 'data', sessionId: 's1', data: 'hello' }));
    expect(seen[1]).toEqual({ type: 'data', sessionId: 's1', data: 'hello' });

    ws.open();
    expect(backend.getState()).toBe('connected');
  });

  it('write/resize 仅在 OPEN 时发送结构化帧', async () => {
    const backend = new WebSocketTerminalBackend('ws://ok');
    await backend.connect('s1');
    const ws = FakeWebSocket.instances[0];

    backend.write('s1', 'x'); // CONNECTING → 不发送
    expect(ws.sent).toEqual([]);

    ws.open();
    backend.write('s1', 'ls\r');
    backend.resize('s1', 120, 40);
    expect(ws.sent).toEqual([
      { type: 'input', data: 'ls\r' },
      { type: 'resize', cols: 120, rows: 40 },
    ]);
  });

  it('onerror → error 状态 + error 通知; onclose → disconnected', async () => {
    const backend = new WebSocketTerminalBackend('ws://ok');
    const seen: { type: string }[] = [];
    backend.onMessage((m) => seen.push(m as { type: string }));
    await backend.connect('s1');
    const ws = FakeWebSocket.instances[0];

    ws.fail();
    expect(backend.getState()).toBe('error');
    expect(seen).toContainEqual({ type: 'error', sessionId: 'default', message: 'WebSocket error' });

    ws.close();
    expect(backend.getState()).toBe('disconnected');
  });

  it('disconnect 关闭底层 WS; 构造异常向上抛出且状态置 error', async () => {
    const backend = new WebSocketTerminalBackend('ws://ok');
    await backend.connect('s1');
    const ws = FakeWebSocket.instances[0];
    backend.disconnect('s1');
    expect(ws.closed).toBe(true);
    expect(backend.getState()).toBe('disconnected');
    expect((backend as unknown as { ws: unknown }).ws).toBeNull();

    const boom = new WebSocketTerminalBackend('ws://boom');
    await expect(boom.connect('s1')).rejects.toThrow('invalid url');
    expect(boom.getState()).toBe('error');
  });

  it('onMessage 退订生效', async () => {
    const backend = new WebSocketTerminalBackend('ws://ok');
    const seen: unknown[] = [];
    const off = backend.onMessage((m) => seen.push(m));
    off();
    await backend.connect('s1');
    FakeWebSocket.instances[0].emit(JSON.stringify({ type: 'data', sessionId: 's1', data: 'x' }));
    expect(seen).toEqual([]);
  });
});
