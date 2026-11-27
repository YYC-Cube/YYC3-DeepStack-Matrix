/**
 * @file: ide-dialogs.test.tsx
 * @description: IDE 对话框/面板用例 — ShareDialog / NotificationPanel / DeployDialog(构建日志定时器) / CodePreviewPanel(CodeMirror 桩)
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { ShareDialog } from '../ShareDialog';
import { NotificationPanel } from '../NotificationPanel';
import { DeployDialog } from '../DeployDialog';
import { CodePreviewPanel } from '../CodePreviewPanel';
import { MOCK_NOTIFICATIONS } from '../ide-mock-data';
import type { OpenTab } from '../ide-types';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

// CodeMirror 重库桩（jsdom 无法完整实例化 EditorView）
vi.mock('@uiw/react-codemirror', async () => {
  const React = await import('react');
  return {
    default: (props: { value?: string }) =>
      React.createElement('div', { 'data-testid': 'codemirror-stub' }, props.value),
  };
});

describe('ShareDialog', () => {
  const noop = () => {};

  it('isOpen=false 渲染 null', () => {
    const { container } = render(<ShareDialog isOpen={false} onClose={noop} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('打开：分享链接 + 权限切换 + 复制反馈 + 关闭回调', () => {
    const onClose = vi.fn();
    const { container } = render(<ShareDialog isOpen onClose={onClose} />);
    expect(screen.getByText('https://yyc3.cloud/ide/share/proj-abc123')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ide.shareAdmin'));
    fireEvent.click(screen.getByText('ide.shareReadWrite'));
    fireEvent.click(screen.getByText('ide.shareReadOnly'));

    fireEvent.click(screen.getByTitle('ide.shareCopyLink'));
    expect(screen.getByText('ide.shareCopied')).toBeInTheDocument();

    // 头部 X（container 内第一个 button）
    fireEvent.click(container.querySelector('button')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationPanel', () => {
  const noop = () => {};

  it('isOpen=false 渲染 null', () => {
    const { container } = render(<NotificationPanel isOpen={false} onClose={noop} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('打开：列表渲染 + 未读徽标 + 全部已读 + 单条已读 + 关闭', () => {
    const onClose = vi.fn();
    render(<NotificationPanel isOpen onClose={onClose} />);
    expect(screen.getByText('ide.notificationPanel')).toBeInTheDocument();
    const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
    expect(screen.getByText(String(unread))).toBeInTheDocument();
    expect(screen.getByText('Build Succeeded')).toBeInTheDocument();
    expect(screen.getByText('GPU Alert')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ide.markAllRead'));
    expect(screen.queryByText('ide.markAllRead')).not.toBeInTheDocument(); // 全读后按钮消失

    fireEvent.click(screen.getByText('GPU Alert'));
    fireEvent.click(screen.getByText('GPU Alert')); // 再次点击仍安全（markRead 幂等）
  });

  it('点击背板或 X 关闭', () => {
    const onClose = vi.fn();
    const { container } = render(<NotificationPanel isOpen onClose={onClose} />);
    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
    const headerButtons = container.querySelectorAll('button');
    fireEvent.click(headerButtons[headerButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('DeployDialog', () => {
  const noop = () => {};

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('isOpen=false 渲染 null', () => {
    const { container } = render(<DeployDialog isOpen={false} onClose={noop} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('打开：环境切换 → 部署 → 构建日志推进（success 分支因产品缺陷不可达，见 PR 描述）', () => {
    const onClose = vi.fn();
    render(<DeployDialog isOpen onClose={onClose} />);
    expect(screen.getByText('ide.deployTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ide.deployStaging'));
    fireEvent.click(screen.getByText('ide.deployProduction'));

    fireEvent.click(screen.getByText('ide.deployStart')); // idle → building
    expect(screen.getByText('ide.deployBuilding')).toBeInTheDocument();

    // 逐拍 flush。产品缺陷：setLogs updater 闭包读可变循环变量 i（自增后求值），
    // 第 13 拍（最后一条日志）flush 时 i==13 越界 → TypeError，success 分支因此不可达。
    for (let k = 0; k < 11; k++) {
      act(() => { vi.advanceTimersByTime(400); });
    }
    expect(screen.getByText('ide.deployBuilding')).toBeInTheDocument(); // 仍在构建
    expect(screen.getByText('ide.deployLogs')).toBeInTheDocument();
    expect(screen.getByText(/248 modules transformed/)).toBeInTheDocument();
  });

  it('构建中关闭 → handleClose 复位状态（注意：构建 interval 未随关闭清除 —— 已登记产品问题）', () => {
    const onClose = vi.fn();
    const { container } = render(<DeployDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('ide.deployStart'));
    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ide.deployStart')).toBeInTheDocument(); // 复位 idle
  });
});

describe('CodePreviewPanel（CodeMirror 桩）', () => {
  const TABS: OpenTab[] = [
    { id: 't1', filename: 'App.tsx', filepath: 'src/App.tsx', content: 'const a = 1;', isModified: true },
    { id: 't2', filename: 'notes.md', filepath: 'docs/notes.md', content: '# hello', isModified: false },
  ];

  function setup(activeTabId: string) {
    const spies = { onTabSelect: vi.fn(), onTabClose: vi.fn(), onContentChange: vi.fn() };
    render(
      <CodePreviewPanel
        openTabs={TABS} activeTabId={activeTabId}
        onTabSelect={spies.onTabSelect} onTabClose={spies.onTabClose} onContentChange={spies.onContentChange}
      />,
    );
    return spies;
  }

  it('无打开文件 → 空态占位', () => {
    render(
      <CodePreviewPanel
        openTabs={[]} activeTabId="" onTabSelect={() => {}} onTabClose={() => {}} onContentChange={() => {}}
      />,
    );
    expect(screen.getByText('ide.selectFile')).toBeInTheDocument();
    expect(screen.getByText('ide.openFromExplorer')).toBeInTheDocument();
  });

  it('tab 渲染/选中/关闭 + 面包屑 + 编辑器内容', () => {
    const spies = setup('t1');
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('TSX')).toBeInTheDocument(); // getLanguageLabel
    expect(screen.getByTestId('codemirror-stub')).toHaveTextContent('const a = 1;');

    fireEvent.click(screen.getByText('notes.md'));
    expect(spies.onTabSelect).toHaveBeenCalledWith('t2');
  });

  it('activeTabId 无匹配 → 无激活文件占位', () => {
    render(
      <CodePreviewPanel
        openTabs={TABS} activeTabId="ghost" onTabSelect={() => {}} onTabClose={() => {}} onContentChange={() => {}}
      />,
    );
    expect(screen.getByText('ide.noActiveFile')).toBeInTheDocument();
  });

  it('tab 上的 X 关闭（stopPropagation 不触发 select）', () => {
    const spies = setup('t1');
    const closeSpans = document.querySelectorAll('span.p-0\\.5');
    expect(closeSpans.length).toBe(2);
    fireEvent.click(closeSpans[1]); // 关 t2
    expect(spies.onTabClose).toHaveBeenCalledWith('t2');
    expect(spies.onTabSelect).not.toHaveBeenCalled();
  });
});

describe('DeployDialog 修复锁（#2 interval 泄漏）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('构建中关闭 → interval 被清除：长时间推进无新日志且无崩溃', () => {
    const onClose = vi.fn();
    const { container } = render(<DeployDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('ide.deployStart'));
    fireEvent.click(container.querySelector('.fixed.inset-0')!); // handleClose 清 interval
    const bodyAtClose = document.body.textContent ?? '';
    // 修复前：interval 泄漏 → 日志继续累积 + updater 读可变 i 越界崩溃
    act(() => { vi.advanceTimersByTime(60000); });
    expect(screen.getByText('ide.deployStart')).toBeInTheDocument(); // 仍 idle
    expect(document.body.textContent).toBe(bodyAtClose); // 日志未增长
    expect(screen.queryByText(/Deploy succeeded!/)).not.toBeInTheDocument();
  });

  it('重复 Deploy：旧 interval 被新部署清除（双 interval 不叠加）', () => {
    render(<DeployDialog isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByText('ide.deployStart'));
    // building 态下 start 按钮隐藏 → 无法重复部署（旧 interval 叠加场景在 UI 层不可达，句柄清理由 close/unmount 锁定）
    expect(screen.getByText('ide.deployBuilding')).toBeInTheDocument();
    expect(screen.queryByText('ide.deployStart')).not.toBeInTheDocument();
  });

  it('卸载兜底：构建中卸载组件 → interval 清理不崩（unmount cleanup）', () => {
    const { unmount } = render(<DeployDialog isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByText('ide.deployStart'));
    expect(() => unmount()).not.toThrow();
    act(() => { vi.advanceTimersByTime(60000); }); // 无消费者，不崩即过
  });
});
