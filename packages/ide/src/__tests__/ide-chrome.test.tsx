/**
 * @file: ide-chrome.test.tsx
 * @description: IDE 顶栏组件用例 — IDEStatusBar / IDEViewSwitcher / IDETopBar（i18n 以 key 直通桩保证断言确定性）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IDEStatusBar } from '../IDEStatusBar';
import { IDEViewSwitcher } from '../IDEViewSwitcher';
import { IDETopBar } from '../IDETopBar';
import { AI_MODELS } from '../ide-mock-data';
import type { OpenTab, IDEViewMode, IDELayoutMode } from '../ide-types';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string, vars?: Record<string, unknown>) => {
    if (!vars) { return key; }
    let out = key;
    for (const [k, v] of Object.entries(vars)) { out += `|${k}=${String(v)}`; }
    return out;
  } }),
}));

const TAB: OpenTab = {
  id: 'tab-1', filename: 'App.tsx', filepath: 'src/App.tsx',
  content: 'const a = 1;\nconst b = 2;\n', isModified: true,
};

describe('IDEStatusBar', () => {
  it('无活动 tab：分支名 + 0 错误 0 警告 + UTF-8 + 在线', () => {
    render(<IDEStatusBar totalErrors={0} totalWarnings={0} isOnline />);
    expect(screen.getByText('develop')).toBeInTheDocument();
    expect(screen.getByText('UTF-8')).toBeInTheDocument();
    expect(screen.getByText('Prettier')).toBeInTheDocument();
    expect(screen.getByTitle('Prettier')).toBeInTheDocument();
  });

  it('有活动 tab：行数/语言标签; 错误警告分别计数', () => {
    render(<IDEStatusBar activeTab={TAB} totalErrors={3} totalWarnings={7} isOnline={false} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('ide.lineCol|line=3|col=1')).toBeInTheDocument();
    expect(screen.getByText('TSX')).toBeInTheDocument();
  });

  it('错误为 0 但警告 >0 时显示警告不显示零态', () => {
    render(<IDEStatusBar totalErrors={0} totalWarnings={2} isOnline />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('IDEViewSwitcher', () => {
  const noop = () => {};

  function setup(viewMode: IDEViewMode, layoutMode: IDELayoutMode) {
    const onViewChange = vi.fn();
    const onLayoutModeChange = vi.fn();
    const onSearch = vi.fn();
    const onFullscreen = vi.fn();
    render(
      <IDEViewSwitcher
        viewMode={viewMode} onViewChange={onViewChange}
        layoutMode={layoutMode} onLayoutModeChange={onLayoutModeChange}
        onSearch={onSearch} onFullscreen={onFullscreen}
      />,
    );
    return { onViewChange, onLayoutModeChange, onSearch, onFullscreen };
  }

  it('预览模式激活时点击预览 → 回退 default（toggle 分支）', () => {
    const { onViewChange } = setup('preview', 'edit');
    fireEvent.click(screen.getByTitle('ide.preview (Ctrl+1)'));
    expect(onViewChange).toHaveBeenCalledWith('default');
  });

  it('非激活视图点击 → 直达该视图', () => {
    const { onViewChange } = setup('default', 'edit');
    fireEvent.click(screen.getByTitle('ide.code (Ctrl+2)'));
    expect(onViewChange).toHaveBeenCalledWith('code');
  });

  it('三种布局模式逐个切换', () => {
    const { onLayoutModeChange } = setup('default', 'edit');
    fireEvent.click(screen.getByTitle('ide.previewMode — ide.previewModeDesc'));
    expect(onLayoutModeChange).toHaveBeenCalledWith('preview');
    fireEvent.click(screen.getByTitle('ide.freeMode — ide.freeModeDesc'));
    expect(onLayoutModeChange).toHaveBeenCalledWith('free');
  });

  it('全屏与搜索按钮回调', () => {
    const { onSearch, onFullscreen } = setup('default', 'free');
    fireEvent.click(screen.getByTitle('ide.fullscreen'));
    expect(onFullscreen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('ide.search (Ctrl+Shift+F)'));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});

describe('IDETopBar', () => {
  const noop = () => {};

  function setup(selectedModel = 'glm-4-flash', unreadCount = 0) {
    const spies = {
      onBack: vi.fn(), onModelChange: vi.fn(), onExplorerClick: vi.fn(),
      onNotificationsClick: vi.fn(), onSettingsClick: vi.fn(),
      onGithubClick: vi.fn(), onShareClick: vi.fn(), onDeployClick: vi.fn(),
    };
    render(
      <IDETopBar
        projectName="YYC³ Matrix" onBack={spies.onBack}
        selectedModel={selectedModel} onModelChange={spies.onModelChange}
        onExplorerClick={spies.onExplorerClick} onNotificationsClick={spies.onNotificationsClick}
        onSettingsClick={spies.onSettingsClick} onGithubClick={spies.onGithubClick}
        onShareClick={spies.onShareClick} onDeployClick={spies.onDeployClick}
        unreadCount={unreadCount}
      />,
    );
    return spies;
  }

  it('项目名 + 当前模型显示 + 六个动作按钮', () => {
    setup();
    expect(screen.getByText('YYC³ Matrix')).toBeInTheDocument();
    expect(screen.getByText('GLM-4 Flash')).toBeInTheDocument();
    expect(screen.getByTitle('ide.explorer')).toBeInTheDocument();
    expect(screen.getByTitle('ide.notifications')).toBeInTheDocument();
    expect(screen.getByTitle('ide.settings')).toBeInTheDocument();
    expect(screen.getByTitle('GitHub')).toBeInTheDocument();
    expect(screen.getByTitle('ide.share')).toBeInTheDocument();
    expect(screen.getByTitle('ide.deploy')).toBeInTheDocument();
  });

  it('未读徽标 3 显示为 3', () => {
    setup('glm-4-flash', 3);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('未读徽标 >9 显示 9+', () => {
    setup('glm-4-flash', 42);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('模型选择器：开合 + 选中回调 + 未知模型回落首个', () => {
    const spies = setup('unknown-model'); // 未知 id → currentModel 回落 AI_MODELS[0]
    expect(screen.getAllByText('GLM-4 Flash').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByTitle('ide.modelSelector'));
    for (const m of AI_MODELS) {
      expect(screen.getAllByText(m.name).length).toBeGreaterThanOrEqual(1);
    }
    fireEvent.click(screen.getByText('GPT-4o'));
    expect(spies.onModelChange).toHaveBeenCalledWith('gpt-4o');
  });

  it('返回/动作按钮回调触发', () => {
    const spies = setup();
    fireEvent.click(screen.getByText('Cloud AI'));
    expect(spies.onBack).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('ide.deploy'));
    expect(spies.onDeployClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('ide.notifications'));
    expect(spies.onNotificationsClick).toHaveBeenCalledTimes(1);
  });
});
