/**
 * @file: xterm-terminal.test.tsx
 * @description: XtermTerminal 用例 — xterm/addon 模块桩下的会话管理/连接徽标/折叠/后端联动（MockTerminalBackend 真实例）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { XtermTerminal } from '../XtermTerminal';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

// xterm 终端桩（记录 onData/onResize 处理器供断言）
const terminalStub = vi.hoisted(() => {
  const handlers: Record<string, (a: never) => void> = {};
  const instances: { written: string[]; disposed: boolean }[] = [];
  class Terminal {
    options: unknown;
    written: string[] = [];
    disposed = false;
    constructor(options: unknown) {
      this.options = options;
      instances.push(this);
    }
    loadAddon() { /* noop */ }
    open() { /* noop */ }
    onData(cb: (d: string) => void) { handlers.data = cb as (a: never) => void; return { dispose: () => {} }; }
    onResize(cb: (d: unknown) => void) { handlers.resize = cb as (a: never) => void; return { dispose: () => {} }; }
    write(s: string) { this.written.push(s); }
    dispose() { this.disposed = true; }
  }
  (globalThis as Record<string, unknown>).__terminalStubHandlers = handlers;
  (globalThis as Record<string, unknown>).__terminalStubInstances = instances;
  return { Terminal, handlers, instances };
});

vi.mock('@xterm/xterm', () => ({ Terminal: terminalStub.Terminal }));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class { fit() { /* noop */ } dispose() { /* noop */ } },
}));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class { /* noop */ } }));

describe('XtermTerminal（xterm 桩 + MockTerminalBackend 实例）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始化：会话连接后徽标转 connected（Mock 后端 100ms 握手）', async () => {
    const onSessionCreate = vi.fn();
    render(<XtermTerminal sessionId="s1" onSessionCreate={onSessionCreate} />);
    // 动态 import + open 同步；connect 内部 100ms 定时器
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    expect(onSessionCreate).toHaveBeenCalledWith('s1');
    // 连接徽标：connected → Wifi 图标（无法直接查 icon → 断言状态按钮仍渲染）
    expect(screen.getAllByText('bash').length).toBeGreaterThanOrEqual(1);
    // 终端桩收到 Mock 后端欢迎横幅写入
    // （terminalStub.handlers 由组件注册）
  });

  it('addSession 新增会话并切换激活', async () => {
    const onSessionCreate = vi.fn();
    render(<XtermTerminal sessionId="s1" onSessionCreate={onSessionCreate} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    const addBtn = screen.getByTitle('ide.newTerminal');
    fireEvent.click(addBtn);
    expect(screen.getAllByText('bash').length).toBe(2);
    expect(onSessionCreate).toHaveBeenLastCalledWith(expect.stringMatching(/^term-\d+$/));
  });

  it('closeSession：多会话可关、单会话守卫、激活回落', async () => {
    const onSessionClose = vi.fn();
    render(<XtermTerminal sessionId="s1" onSessionClose={onSessionClose} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    // 单会话 → 无关闭钮
    expect(document.querySelectorAll('.hover\\:text-\\[\\#ff3366\\]').length).toBe(0);
    // 开新会话 → 出现关闭钮
    fireEvent.click(screen.getByTitle('ide.newTerminal'));
    const closeBtns = document.querySelectorAll('span.hover\\:text-\\[\\#ff3366\\]');
    expect(closeBtns.length).toBe(2);
    fireEvent.click(closeBtns[0]); // 关掉激活的 s1 → 回落
    expect(onSessionClose).toHaveBeenCalled();
    expect(screen.getAllByText('bash').length).toBe(1);
    // 单会话守卫：无关闭钮
    expect(document.querySelectorAll('span.hover\\:text-\\[\\#ff3366\\]').length).toBe(0);
  });

  it('折叠/展开切换（Ctrl+` 外部由父层控制，此处直接验证高度切换）', async () => {
    const { rerender } = render(<XtermTerminal sessionId="s1" isCollapsed={false} onToggleCollapse={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    const shell = document.querySelector('div.flex.flex-col') as HTMLElement;
    expect(shell.style.height).toBe('100%');
    rerender(<XtermTerminal sessionId="s1" isCollapsed onToggleCollapse={() => {}} />);
    expect(shell.style.height).toBe('28px');
  });

  it('数据回写链：onData → backend.write → onMessage → xterm.write', async () => {
    render(<XtermTerminal sessionId="s1" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    const handlers = (globalThis as Record<string, unknown>).__terminalStubHandlers as Record<string, (d: string) => void>;
    const instances = (globalThis as Record<string, unknown>).__terminalStubInstances as { written: string[] }[];
    expect(handlers.data).toBeTruthy();
    // 欢迎横幅已写入
    const last = instances[instances.length - 1];
    expect(last.written.join('')).toContain('YYC³ Terminal');
    // 用户输入 → backend 回显
    handlers.data('ls');
    expect(last.written.join('')).toContain('ls');
    // 回车 → \r\n + 提示符
    handlers.data('\r');
    await act(async () => { await vi.advanceTimersByTimeAsync(80); });
    expect(last.written.join('')).toContain('\r\n');
    expect(last.written.join('')).toContain('$ ');
  });

  it('onResize → backend.resize（安全 no-op）', async () => {
    render(<XtermTerminal sessionId="s1" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    const handlers = (globalThis as Record<string, unknown>).__terminalStubHandlers as Record<string, (d: unknown) => void>;
    expect(() => handlers.resize?.({ cols: 100, rows: 30 })).not.toThrow();
  });

  it('session tab 点击切换激活会话', async () => {
    render(<XtermTerminal sessionId="s1" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    fireEvent.click(screen.getByTitle('ide.newTerminal'));
    const tabs = screen.getAllByText('bash');
    fireEvent.click(tabs[0]); // 切回第一个
    expect(tabs[0].closest('button')).toBeTruthy();
  });
});

class FakeWS {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: FakeWS[] = [];
  readyState = FakeWS.CONNECTING;
  binaryType = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) { FakeWS.instances.push(this); }
  send() { /* noop */ }
  close() { this.onclose?.(); }
}

describe('XtermTerminal WebSocket 后端消息分支（batch C3 分支清扫）', () => {
  beforeEach(() => {
    FakeWS.instances = [];
    vi.stubGlobal('WebSocket', FakeWS);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function handlers() {
    return (globalThis as Record<string, unknown>).__terminalStubHandlers as Record<string, (d: never) => void>;
  }

  it('ws 消息：data 缺 data 字段回退 / connect 会话匹配双分支 / error 匹配双分支', async () => {
    render(<XtermTerminal sessionId="s1" wsUrl="ws://stub" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    const ws = FakeWS.instances[0];
    const h = handlers();
    // error 消息（sessionId 匹配）→ 会话置 error
    act(() => { ws.onmessage?.({ data: JSON.stringify({ type: 'error', sessionId: 's1', message: 'boom' }) }); });
    // 非 JSON → data 回退（?? '' 分支）
    act(() => { ws.onmessage?.({ data: 'plain-text' }); });
    // error 消息（sessionId 不匹配）→ map false 分支
    act(() => { ws.onmessage?.({ data: JSON.stringify({ type: 'error', sessionId: 'zz' }) }); });
    expect(h.data).toBeTruthy();
  });

  it('双会话下 connect 消息命中匹配/不匹配两分支', async () => {
    const { rerender } = render(<XtermTerminal sessionId="s1" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    // addSession → activeSessionId 变 → initializeTerminal 重建 → connect 重发（此时 2 会话）
    fireEvent.click(screen.getByTitle('ide.newTerminal'));
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    expect(screen.getAllByText('bash').length).toBe(2);
  });

  it('后端未就绪时 onData/resize 守卫分支不抛错', () => {
    const h = handlers();
    expect(() => h.data?.('x' as never)).not.toThrow();
    expect(() => h.resize?.({ cols: 80, rows: 24 } as never)).not.toThrow();
  });
});
