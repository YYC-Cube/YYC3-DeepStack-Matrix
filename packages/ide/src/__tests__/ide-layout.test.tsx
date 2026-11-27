/**
 * @file: ide-layout.test.tsx
 * @description: IDELayout 集成用例 — 三种布局模式切换 / 键盘快捷键 / 文件选中开 tab / 搜索遮罩 / 顶栏导航（react-router 与 AI store 桩）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { IDELayout } from '../IDELayout';
import { useIDESettingsSlice } from '../ide-settings-slice';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router', () => ({
  useNavigate: () => navigateSpy,
}));

// CodeMirror 重库桩
vi.mock('@uiw/react-codemirror', async () => {
  const React = await import('react');
  return {
    default: (props: { value?: string }) =>
      React.createElement('div', { 'data-testid': 'codemirror-stub' }, props.value),
  };
});

// AIChatPanel 的 provider/sdk 桩（避免网络路径）
vi.mock('@yyc3-deepstack/store/provider-slice', () => ({
  useProviderSlice: () => ({ configuredModels: [] }),
}));
vi.mock('@yyc3-deepstack/store/use-big-model-sdk', () => ({
  useBigModelSDK: () => ({ sendMessage: async () => ({ content: 'stub' }) }),
}));

describe('IDELayout 三种布局模式', () => {
  beforeEach(() => {
    localStorage.clear();
    useIDESettingsSlice.getState().resetSettings();
    useIDESettingsSlice.getState().setLayoutMode('edit');
    navigateSpy.mockClear();
  });

  it('edit 模式：AI 聊天 + 资源管理器 + 编辑器 + 终端并存', () => {
    render(<IDELayout />);
    expect(screen.getByPlaceholderText('ide.askAI')).toBeInTheDocument(); // AIChatPanel
    expect(screen.getByText('src')).toBeInTheDocument(); // FileExplorer
    expect(screen.getByPlaceholderText('ide.commandPlaceholder')).toBeInTheDocument(); // IDETerminal
    expect(screen.getByText('ide.search')).toBeInTheDocument(); // ViewSwitcher
  });

  it('preview / free 模式切换（ViewSwitcher → 切片联动）', () => {
    render(<IDELayout />);
    fireEvent.click(screen.getByTitle('ide.previewMode — ide.previewModeDesc'));
    expect(useIDESettingsSlice.getState().layoutMode).toBe('preview');
    fireEvent.click(screen.getByTitle('ide.freeMode — ide.freeModeDesc'));
    expect(useIDESettingsSlice.getState().layoutMode).toBe('free');
    // free 模式 → LayoutProvider + Workspace 面板系统
    expect(screen.getByText('ide.addPanel')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('ide.editMode — ide.editModeDesc'));
    expect(useIDESettingsSlice.getState().layoutMode).toBe('edit');
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('返回按钮 → navigate(-1)', () => {
    render(<IDELayout />);
    fireEvent.click(screen.getByText('Cloud AI'));
    expect(navigateSpy).toHaveBeenCalledWith(-1);
  });

  it('文件选中 → 打开 tab → 关闭 tab', () => {
    render(<IDELayout />);
    fireEvent.click(screen.getByText('App.tsx'));
    // CodePreviewPanel 打开 App.tsx → 面包屑 + 语言标签
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getAllByText('TSX').length).toBeGreaterThanOrEqual(1);
    // 关闭 tab（tab 行的 X span）
    const closeSpans = document.querySelectorAll('span.p-0\\.5');
    fireEvent.click(closeSpans[0]);
    expect(screen.queryByText('src/App.tsx')).not.toBeInTheDocument();
  });

  it('搜索遮罩：Ctrl+Shift+F 开启 / Esc 或按钮关闭', () => {
    render(<IDELayout />);
    expect(screen.queryByPlaceholderText(/Esc/)).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true });
    expect(screen.getByPlaceholderText(/Esc/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/Esc/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('ide.search (Ctrl+Shift+F)'));
    expect(screen.getByPlaceholderText(/Esc/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText(/Esc/), { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/Esc/)).not.toBeInTheDocument();
  });

  it('键盘快捷键：Ctrl+1 视图切换 / Ctrl+3 布局循环 / Ctrl+` 终端折叠', () => {
    render(<IDELayout />);
    // Ctrl+3: edit → preview
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(useIDESettingsSlice.getState().layoutMode).toBe('preview');
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(useIDESettingsSlice.getState().layoutMode).toBe('free');
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(useIDESettingsSlice.getState().layoutMode).toBe('edit');
    // Ctrl+` 折叠终端 → 输入框消失
    expect(screen.getByPlaceholderText('ide.commandPlaceholder')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '`', ctrlKey: true });
    expect(screen.queryByPlaceholderText('ide.commandPlaceholder')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: '`', ctrlKey: true });
    expect(screen.getByPlaceholderText('ide.commandPlaceholder')).toBeInTheDocument();
    // Ctrl+1: default → preview 视图（中栏资源管理器消失，AI 面板保留）
    fireEvent.keyDown(window, { key: '1', ctrlKey: true });
    expect(screen.queryByText('src')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('ide.askAI')).toBeInTheDocument();
    // Ctrl+2: → code 视图（AI 面板消失，编辑器全宽）
    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    expect(screen.queryByPlaceholderText('ide.askAI')).not.toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('顶栏 share/deploy/通知/设置按钮为 no-op（状态置位但无弹层渲染 —— 已登记产品问题）', () => {
    render(<IDELayout />);
    fireEvent.click(screen.getByTitle('ide.share'));
    expect(screen.queryByText('ide.shareTitle')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('ide.deploy'));
    expect(screen.queryByText('ide.deployTitle')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('ide.notifications'));
    fireEvent.click(screen.getByTitle('ide.settings'));
    expect(screen.queryByText('ide.settingsTitle')).not.toBeInTheDocument();
  });

  it('全屏按钮：jsdom 无 fullscreen API → catch 忽略不抛错', () => {
    render(<IDELayout />);
    expect(() => fireEvent.click(screen.getByTitle('ide.fullscreen'))).not.toThrow();
  });
});
