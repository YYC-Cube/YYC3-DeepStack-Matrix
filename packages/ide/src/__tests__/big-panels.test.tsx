/**
 * @file: big-panels.test.tsx
 * @description: 大组件冒烟+交互 — IDETerminal(mock 命令终端) / IDESettingsPanel(设置三 tab) / IDEPanel(IDELayout 桩) / CodeEditor+SQLEditor(CodeMirror 桩) / AIChatPanel(真实 store+KB)
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import { IDETerminal } from '../IDETerminal';
import { IDESettingsPanel } from '../IDESettingsPanel';
import { IDEPanel } from '../IDEPanel';
import { CodeEditor, SQLEditor, getLanguageLabel } from '../CodeEditor';
import { AIChatPanel } from '../AIChatPanel';
import { useIDESettingsSlice } from '../ide-settings-slice';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

// CodeMirror 重库桩（jsdom 无法完整实例化 EditorView）
vi.mock('@uiw/react-codemirror', async () => {
  const React = await import('react');
  return {
    default: (props: { value?: string; placeholder?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': 'codemirror-stub' },
        props.value,
        props.placeholder,
      ),
  };
});

// IDEPanel 内部依赖 IDELayout（重编排组件）——本文件只验证壳层
vi.mock('../IDELayout', async () => {
  const React = await import('react');
  return {
    IDELayout: () => React.createElement('div', { 'data-testid': 'ide-layout-stub' }, 'layout'),
  };
});

describe('IDETerminal（mock 终端）', () => {
  function typeCommand(cmd: string) {
    const input = screen.getByPlaceholderText('ide.commandPlaceholder');
    fireEvent.change(input, { target: { value: cmd } });
    fireEvent.keyDown(input, { key: 'Enter' });
  }

  it('折叠态仍渲染头部（展开/收起钮可见）', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed onToggleCollapse={onToggle} />);
    expect(screen.queryByPlaceholderText('ide.commandPlaceholder')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('ide.terminalToggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('欢迎横幅 + help 命令输出命令表', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    expect(screen.getByText(/ide\.terminalWelcome/)).toBeInTheDocument();
    typeCommand('help');
    expect(screen.getByText(/YYC³ Terminal Commands/)).toBeInTheDocument();
  });

  it('echo/cat/git commit/yyc3 node/未知命令/空命令', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    typeCommand('echo hello-test');
    expect(screen.getByText('hello-test')).toBeInTheDocument();
    typeCommand('cat app.tsx');
    expect(screen.getByText(/Content of app\.tsx/)).toBeInTheDocument();
    typeCommand('git commit -m "feat: x"');
    expect(screen.getByText(/\[develop a3f8c2d\] feat: x/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Committed successfully/)).toBeInTheDocument();
    typeCommand('yyc3 node GPU-A100-01');
    expect(screen.getByText(/Status: ACTIVE/)).toBeInTheDocument();
    typeCommand('no-such-cmd');
    expect(screen.getAllByText(/no-such-cmd/).length).toBeGreaterThanOrEqual(2); // 输入回显 + 未找到输出
    typeCommand('   ');
  });

  it('clear 清屏 + 历史条目数衰减', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    typeCommand('help');
    typeCommand('clear');
    expect(screen.queryByText(/YYC³ Terminal Commands/)).not.toBeInTheDocument();
  });

  it('↑ 历史回填输入框', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    typeCommand('echo hist-1');
    const input = screen.getByPlaceholderText('ide.commandPlaceholder') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('echo hist-1');
  });
});

describe('IDESettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useIDESettingsSlice.getState().resetSettings();
  });

  it('isOpen=false 渲染 null', () => {
    const { container } = render(<IDESettingsPanel isOpen={false} onClose={() => {}} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('editor tab：设置项渲染 + updateSetting 写入切片 + 重置', () => {
    const onClose = vi.fn();
    render(<IDESettingsPanel isOpen onClose={onClose} />);
    expect(screen.getByText('ide.settingsTitle')).toBeInTheDocument();
    expect(screen.getByText('ide.settingsFontSize')).toBeInTheDocument();
    expect(screen.getByText('ide.settingsWordWrap')).toBeInTheDocument();

    // toggle wordWrap → 切片变化
    const wrapRow = screen.getByText('ide.settingsWordWrap').closest('div');
    const wrapBtn = wrapRow?.querySelector('button') ?? screen.getByText('ide.settingsWordWrap').parentElement?.querySelector('button');
    if (wrapBtn) {
      fireEvent.click(wrapBtn);
      expect(useIDESettingsSlice.getState().settings.wordWrap).toBe(false);
    }
  });

  it('appearance tab：主题按钮切换 + shortcuts tab 渲染快捷键表', () => {
    const onClose = vi.fn();
    render(<IDESettingsPanel isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('ide.settingsAppearance'));
    expect(screen.getByText('ide.settingsThemeDark')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ide.settingsThemeCyberpunk'));
    fireEvent.click(screen.getByText('ide.settingsShortcuts'));
    expect(screen.getByText('Ctrl+Shift+F')).toBeInTheDocument();
    expect(screen.getByText('Global Search')).toBeInTheDocument();
  });

  it('背板点击触发 onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<IDESettingsPanel isOpen onClose={onClose} />);
    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('IDEPanel 壳层（IDELayout 桩）', () => {
  it('渲染负 margin 外壳并挂载 IDELayout', () => {
    const { container } = render(<IDEPanel />);
    const shell = container.querySelector('div.w-full') as HTMLElement;
    expect(shell).not.toBeNull();
    expect(shell.style.margin).toBe('-1rem');
    expect(screen.getByTestId('ide-layout-stub')).toBeInTheDocument();
  });
});

describe('CodeEditor / SQLEditor（CodeMirror 桩）与 getLanguageLabel', () => {
  it('getLanguageLabel 全扩展名映射 + 未知扩展大写回退', () => {
    expect(getLanguageLabel('a.tsx')).toBe('TSX');
    expect(getLanguageLabel('b.py')).toBe('Python');
    expect(getLanguageLabel('c.scss')).toBe('SCSS');
    expect(getLanguageLabel('d.yaml')).toBe('YAML');
    expect(getLanguageLabel('e.rs')).toBe('Rust');
    expect(getLanguageLabel('f.vue')).toBe('Vue');
    expect(getLanguageLabel('g.r')).toBe('R');
    expect(getLanguageLabel('Dockerfile')).toBe('DOCKERFILE');
    expect(getLanguageLabel('x.weird')).toBe('WEIRD');
    expect(getLanguageLabel('noext')).toBe('NOEXT');
  });

  it('CodeEditor 渲染桩（语言扩展按 filename 选择不抛错）', () => {
    const onChange = vi.fn();
    const filenames = ['a.tsx', 'b.js', 'c.json', 'd.py', 'e.sql', 'f.md', 'g.html', 'h.css', 'i.xml', 'j.yaml', 'k.txt', 'Dockerfile', '.env.local'];
    for (const f of filenames) {
      const { unmount } = render(
        <CodeEditor value={'code of ' + f} onChange={onChange} filename={f} height="120px" />,
      );
      expect(screen.getByTestId('codemirror-stub')).toHaveTextContent('code of ' + f);
      unmount();
    }
  });

  it('SQLEditor 渲染 + placeholder + readOnly', () => {
    render(
      <SQLEditor
        value="SELECT 1;" onChange={() => {}} onExecute={() => {}}
        placeholder="run a query" readOnly height="80px"
      />,
    );
    expect(screen.getByTestId('codemirror-stub')).toHaveTextContent('SELECT 1;');
    expect(screen.getByTestId('codemirror-stub')).toHaveTextContent('run a query');
  });
});

// AIChatPanel 的 provider/sdk 以可切换桩控制走 sdk 分支或本地 fallback 分支
const aiMock = vi.hoisted(() => ({ hasProvider: true }));
vi.mock('@yyc3-deepstack/store/provider-slice', () => ({
  useProviderSlice: () => ({
    configuredModels: aiMock.hasProvider
      ? [{ id: 'stub-1', name: 'Stub', provider: 'stub', baseUrl: 'http://stub', model: 'stub' }]
      : [],
  }),
}));
vi.mock('@yyc3-deepstack/store/use-big-model-sdk', () => ({
  useBigModelSDK: () => ({
    sendMessage: async () => ({ content: 'SDK-STUB-REPLY' }),
  }),
}));

describe('AIChatPanel（provider/sdk 桩）', () => {
  beforeEach(() => {
    aiMock.hasProvider = true;
  });

  it('渲染聊天历史 + 快捷操作 + 输入框', () => {
    render(<AIChatPanel />);
    expect(screen.getByText(/YYC3 AI 编程助手已就绪/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ide.askAI')).toBeInTheDocument();
    expect(screen.getByText('ide.explain')).toBeInTheDocument();
  });

  it('发送消息 → sdk.sendMessage 应答透传', async () => {
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('ide.askAI');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('SDK-STUB-REPLY');
  });

  it('无 provider → 本地 fallback 响应（600-1400ms 延迟）', async () => {
    aiMock.hasProvider = false;
    vi.useFakeTimers();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('ide.askAI');
    fireEvent.change(input, { target: { value: '请解释这段代码' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText(/React 函数组件/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('快捷操作按钮直接注入 prompt 触发应答', async () => {
    render(<AIChatPanel />);
    fireEvent.click(screen.getByText('ide.explain').closest('button')!);
    await screen.findByText('SDK-STUB-REPLY');
  });
});

describe('IDETerminal 命令注册表全命令（函数覆盖补充）', () => {
  function typeCommand(cmd: string) {
    const input = screen.getByPlaceholderText('ide.commandPlaceholder');
    fireEvent.change(input, { target: { value: cmd } });
    fireEvent.keyDown(input, { key: 'Enter' });
  }
  const expectText = (s: string) => expect(document.body.textContent).toContain(s);

  it('系统命令: yyc3 status/alerts/patrol + ls/pwd/date/whoami/neofetch', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    typeCommand('yyc3 status');
    expectText('Cluster: YYC³ Matrix');
    typeCommand('yyc3 alerts');
    expectText('AL-0032');
    typeCommand('yyc3 patrol run');
    expectText('Patrol complete.');
    typeCommand('ls');
    expectText('pnpm-lock.yaml');
    typeCommand('pwd');
    expectText('/home/yyc3/cloudpivot-intelli-matrix');
    typeCommand('whoami');
    expectText('yyc3-dev');
    typeCommand('neofetch');
    expectText('Apple M4 Max 40-core');
    typeCommand('date');
  });

  it('git 命令: status/log/branch/diff/add .(键名含空格)/push/pull', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    typeCommand('git status');
    expectText('On branch develop');
    typeCommand('git log');
    expectText('commit a3f8c2d (HEAD -> develop)');
    typeCommand('git branch');
    expectText('* develop');
    typeCommand('git diff');
    expectText('diff --git a/src/app/components/ide/IDELayout.tsx');
    typeCommand('git add .');
    expectText('All changes staged.');
    typeCommand('git push');
    expectText('b7e1a4f..a3f8c2d  develop -> develop');
    typeCommand('git pull');
    expectText('Already up to date.');
  });

  it('pnpm 命令: install/dev/build/test/lint', () => {
    const onToggle = vi.fn();
    render(<IDETerminal isCollapsed={false} onToggleCollapse={onToggle} />);
    typeCommand('pnpm install');
    expectText('Done in 1.2s');
    typeCommand('pnpm dev');
    expectText('Local:   http://localhost:3113/');
    typeCommand('pnpm build');
    expectText('built in 3.42s');
    typeCommand('pnpm test');
    expectText('Test Files  4 passed (4)');
    typeCommand('pnpm lint');
    expectText('Running ESLint on 248 files...');
  });
});
