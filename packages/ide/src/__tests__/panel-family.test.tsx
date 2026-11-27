/**
 * @file: panel-family.test.tsx
 * @description: Panel 家族冒烟+交互用例 — PanelHeader/Panel/PanelContent(7 分支)/PanelResizeHandle(8 向)/TabBar/PanelToolbar/PanelContainer/Workspace
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LayoutProvider, useLayoutContext } from '../LayoutContext';
import { Panel } from '../Panel';
import { PanelHeader } from '../PanelHeader';
import { PanelContent } from '../PanelContent';
import { PanelResizeHandle } from '../PanelResizeHandle';
import { PanelToolbar } from '../PanelToolbar';
import { PanelContainer } from '../PanelContainer';
import { TabBar } from '../TabBar';
import { Workspace } from '../Workspace';
import type { Panel as PanelModel, Tab } from '../ide-layout-types';

type Ctx = ReturnType<typeof useLayoutContext>;

function Probe({ box }: { box: { current: Ctx | null } }) {
  box.current = useLayoutContext();
  return null;
}

function makeTab(id: string, title: string, extra: Partial<Tab> = {}): Tab {
  return {
    id, panelId: 'panel-x', title,
    isPinned: false, isModified: false, isUnsaved: false, hasError: false, isActive: false,
    ...extra,
  };
}

function makePanel(overrides: Partial<PanelModel> = {}): PanelModel {
  return {
    id: 'panel-x', type: 'code-editor', title: '代码面板',
    position: { x: 10, y: 10, w: 0, h: 0 },
    size: { width: 300, height: 300 },
    minSize: { width: 100, height: 100 },
    maxSize: { width: 800, height: 600 },
    isLocked: false, isMinimized: false, isMaximized: false,
    isClosable: true, isResizable: true, zIndex: 1,
    tabs: [], activeTabId: '',
    ...overrides,
  };
}

const noop = () => {};

describe('PanelHeader', () => {
  it('渲染标题并回调 minimize/maximize/close（closable 决定关闭钮）', () => {
    const onMin = vi.fn(); const onMax = vi.fn(); const onClose = vi.fn();
    const { rerender } = render(
      <PanelHeader panel={makePanel()} isActive onMouseDown={noop} onMinimize={onMin} onMaximize={onMax} onClose={onClose} />,
    );
    expect(screen.getByText('代码面板')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Minimize'));
    fireEvent.click(screen.getByTitle('Maximize'));
    fireEvent.click(screen.getByTitle('Close'));
    expect(onMin).toHaveBeenCalledTimes(1);
    expect(onMax).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    // isClosable=false → 无 Close 按钮
    rerender(
      <PanelHeader panel={makePanel({ isClosable: false })} isActive={false} onMouseDown={noop} onMinimize={onMin} onMaximize={onMax} onClose={onClose} />,
    );
    expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
  });
});

describe('Panel 外壳', () => {
  it('标题栏 mouseDown/maximize/close 全部透传回调', () => {
    const onMouseDown = vi.fn(); const onMinimize = vi.fn(); const onMaximize = vi.fn(); const onClose = vi.fn();
    render(
      <LayoutProvider>
        <Panel panel={makePanel()} isActive onMouseDown={onMouseDown} onMinimize={onMinimize} onMaximize={onMaximize} onClose={onClose} />
      </LayoutProvider>,
    );
    fireEvent.mouseDown(screen.getByText('代码面板'));
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Maximize'));
    fireEvent.click(screen.getByTitle('Close'));
    expect(onMaximize).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.panel.maximized')).toBeNull();
  });

  it('isMaximized 时容器带 maximized class', () => {
    const { container } = render(
      <LayoutProvider>
        <Panel panel={makePanel({ isMaximized: true })} isActive={false} onMouseDown={noop} onMinimize={noop} onMaximize={noop} onClose={noop} />
      </LayoutProvider>,
    );
    expect(container.querySelector('.panel.maximized')).not.toBeNull();
  });
});

describe('PanelContent 七种面板类型渲染', () => {
  const cases = [
    { type: 'code-editor', label: 'Code Editor' },
    { type: 'preview', label: 'Preview Panel' },
    { type: 'terminal', label: 'Terminal' },
    { type: 'file-browser', label: 'File Explorer' },
    { type: 'ai-chat', label: 'AI Chat' },
    { type: 'database', label: 'Database' },
    { type: 'version-control', label: 'Version Control' },
  ] as const;

  it.each(cases)('type=$type 渲染 $label 占位', ({ type, label }) => {
    render(
      <LayoutProvider>
        <PanelContent panel={makePanel({ type })} />
      </LayoutProvider>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('未知 type 走 default 分支', () => {
    render(
      <LayoutProvider>
        <PanelContent panel={makePanel({ type: 'no-such' as never })} />
      </LayoutProvider>,
    );
    expect(screen.getByText('Unknown Panel Type')).toBeInTheDocument();
  });
});

describe('PanelResizeHandle', () => {
  it.each(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const)('方向 %s 渲染手柄', (direction) => {
    const { container } = render(<PanelResizeHandle direction={direction} onMouseDown={noop} />);
    expect(container.querySelector('.panel-resize-handle')).not.toBeNull();
  });

  it('mousedown 注册全局监听，mouseup 释放', () => {
    const onMouseDown = vi.fn();
    render(<PanelResizeHandle direction="se" onMouseDown={onMouseDown} />);
    const handle = document.querySelector('.panel-resize-handle')!;
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    fireEvent.mouseDown(handle);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    fireEvent.mouseUp(window);
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

/** 渲染 context 中最后一块面板的 TabBar（面板必须在 context state 中才能驱动 reducer） */
function CtxLastTabBar() {
  const ctx = useLayoutContext();
  const panel = ctx.panels[ctx.panels.length - 1];
  return <TabBar panel={panel} />;
}

/** 渲染 context 中最后一块面板的 PanelContainer */
function CtxLastPanelContainer({ isActive = true }: { isActive?: boolean }) {
  const ctx = useLayoutContext();
  const panel = ctx.panels[ctx.panels.length - 1];
  if (!panel) { return null; }
  return <PanelContainer panel={panel} isActive={isActive} />;
}

describe('TabBar', () => {
  it('渲染 tabs（icon/modified/unsaved 标记）', () => {
    render(
      <LayoutProvider>
        <TabBar
          panel={makePanel({
            tabs: [
              makeTab('t1', 'A.tsx', { icon: '📄', isActive: true }),
              makeTab('t2', 'B.tsx', { isModified: true, isUnsaved: true }),
            ],
            activeTabId: 't1',
          })}
        />
      </LayoutProvider>,
    );
    expect(screen.getByText('A.tsx')).toBeInTheDocument();
    expect(screen.getByText('📄')).toBeInTheDocument();
    const dots = screen.getAllByText('●');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  function setupCtxTabBar() {
    const box: { current: Ctx | null } = { current: null };
    render(
      <LayoutProvider>
        <Probe box={box} />
        <CtxLastTabBar />
      </LayoutProvider>,
    );
    act(() => box.current!.addPanel({
      type: 'code-editor', title: 'T',
      position: { x: 0, y: 0, w: 0, h: 0 },
      size: { width: 300, height: 300 },
      isLocked: false, isMinimized: false, isMaximized: false,
      isClosable: true, isResizable: true,
    }));
    const pid = box.current!.panels[box.current!.panels.length - 1].id;
    let seq = 0;
    const addTab = (title: string, extra: Partial<Tab> = {}) => {
      act(() => box.current!.addTab(pid, {
        title, panelId: pid, isPinned: false, isModified: false, isUnsaved: false, hasError: false,
        ...extra,
      } as never));
    };
    return { box, pid, addTab };
  }

  it('点击非激活 tab → switchTab; 点击激活 tab 不触发', () => {
    const { box, addTab } = setupCtxTabBar();
    addTab('A.tsx');
    addTab('B.tsx');
    const panel = () => box.current!.panels[box.current!.panels.length - 1];
    const tabB = panel().tabs[1];
    const tabA = panel().tabs[0];
    expect(panel().activeTabId).toBe(tabB.id);

    fireEvent.click(screen.getByText('A.tsx'));
    expect(panel().activeTabId).toBe(tabA.id);
    fireEvent.click(screen.getByText('A.tsx')); // 已激活 → 不 dispatch
    expect(panel().activeTabId).toBe(tabA.id);
    expect(panel().tabs.map((t) => t.isActive)).toEqual([true, false]);
  });

  it('关闭按钮 → removeTab', () => {
    const { box, addTab } = setupCtxTabBar();
    addTab('A.tsx');
    addTab('B.tsx');
    const panel = () => box.current!.panels[box.current!.panels.length - 1];
    const closeBtns = document.querySelectorAll('.tab-close');
    expect(closeBtns.length).toBe(2);
    fireEvent.click(closeBtns[0]); // 关闭 A
    expect(panel().tabs).toHaveLength(1);
    expect(panel().tabs[0].title).toBe('B.tsx');
  });
});

describe('PanelToolbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('添加面板菜单：开合 + 五类型逐个添加 + 面板计数', () => {
    const box: { current: Ctx | null } = { current: null };
    const { container } = render(
      <LayoutProvider>
        <Probe box={box} />
        <PanelToolbar />
      </LayoutProvider>,
    );
    expect(screen.getByText('3 个面板')).toBeInTheDocument();

    const labels = ['代码编辑器', '预览', '终端', '资源管理器', 'AI 对话'];
    let first = true;
    for (const label of labels) {
      fireEvent.click(screen.getByText('添加面板')); // 每次添加后菜单关闭，重开
      if (first) {
        expect(screen.getByText('代码编辑器')).toBeInTheDocument(); // 菜单展开
        first = false;
      }
      fireEvent.click(screen.getByText(label));
    }
    expect(box.current?.panels).toHaveLength(8);
    expect(screen.getByText('8 个面板')).toBeInTheDocument();
    // 菜单在添加后关闭
    expect(screen.queryByText('代码编辑器')).not.toBeInTheDocument();
    expect(container.querySelector('.panel-toolbar')).not.toBeNull();
  });

  it('网格线/吸附开关切换', () => {
    const box: { current: Ctx | null } = { current: null };
    render(
      <LayoutProvider>
        <Probe box={box} />
        <PanelToolbar />
      </LayoutProvider>,
    );
    fireEvent.click(screen.getByTitle('切换网格线'));
    expect(box.current?.layoutConfig.showGridLines).toBe(false);
    fireEvent.click(screen.getByTitle('切换吸附网格'));
    expect(box.current?.layoutConfig.snapToGrid).toBe(false);
  });

  it('saveLayout 写入切片; reset 经 confirm=true 清空; confirm=false 保留', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const box: { current: Ctx | null } = { current: null };
    render(
      <LayoutProvider>
        <Probe box={box} />
        <PanelToolbar />
      </LayoutProvider>,
    );
    fireEvent.click(screen.getByTitle('保存布局'));
    expect(box.current?.layoutConfig.panels).toHaveLength(3);

    fireEvent.click(screen.getByTitle('重置布局'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(box.current?.panels).toHaveLength(0);

    confirmSpy.mockReturnValue(false);
    fireEvent.click(screen.getByTitle('重置布局'));
    expect(box.current?.panels).toHaveLength(0); // 取消 → 不变
    confirmSpy.mockRestore();
  });
});

describe('PanelContainer（context 驱动面板）', () => {
  let box: { current: Ctx | null };

  beforeEach(() => {
    localStorage.clear();
    box = { current: null };
  });

  function renderCtxContainer() {
    const { container } = render(
      <LayoutProvider>
        <Probe box={box} />
        <CtxLastPanelContainer isActive />
      </LayoutProvider>,
    );
    act(() => box.current!.addPanel({
      type: 'code-editor', title: '代码面板',
      position: { x: 10, y: 10, w: 0, h: 0 },
      size: { width: 300, height: 300 },
      minSize: { width: 100, height: 100 },
      maxSize: { width: 800, height: 600 },
      isLocked: false, isMinimized: false, isMaximized: false,
      isClosable: true, isResizable: true,
    }));
    return { container };
  }

  it('渲染 header+content+三个缩放手柄', () => {
    const { container } = renderCtxContainer();
    expect(screen.getByText('代码面板')).toBeInTheDocument();
    expect(screen.getByText('Code Editor')).toBeInTheDocument(); // PanelContent 占位
    expect(container.querySelectorAll('.panel-resize-handle')).toHaveLength(3);
  });

  it('header mousedown → selectPanel + startDrag; window mousemove → onDrag 更新位置', () => {
    renderCtxContainer();
    fireEvent.mouseDown(screen.getByText('代码面板'), { button: 0 });
    expect(box.current?.activePanelId).not.toBe('panel-code-editor');
    expect(box.current?.state.dragging.panelId).not.toBeNull();
    const xBefore = box.current!.panels[box.current!.panels.length - 1].position.x;
    fireEvent.mouseMove(window, { clientX: 253, clientY: 20 });
    const moved = box.current!.panels[box.current!.panels.length - 1];
    expect(moved.position.x).toBeGreaterThanOrEqual(0);
    expect(moved.position.x).not.toBe(xBefore);
    fireEvent.mouseUp(window);
    expect(box.current?.state.dragging.panelId).toBeNull();
  });

  it('minimize → null; 恢复后 maximize → fixed 定位; close → 移除', () => {
    renderCtxContainer();
    fireEvent.click(screen.getByTitle('Minimize'));
    expect(box.current!.panels[box.current!.panels.length - 1].isMinimized).toBe(true);

    act(() => box.current!.updatePanel(box.current!.panels[box.current!.panels.length - 1].id, { isMinimized: false }));
    fireEvent.click(screen.getByTitle('Maximize'));
    const el = document.querySelector('.panel-container') as HTMLElement;
    expect(el.style.position).toBe('fixed');

    fireEvent.click(screen.getByTitle('Close'));
    expect(box.current!.panels).toHaveLength(3); // 回到默认三面板
  });

  it('isClosable=false → 不渲染 Close 钮（handleClose 守卫 false 分支 UI 不可达）; isResizable=false → 无手柄', () => {
    const { container } = render(
      <LayoutProvider>
        <Probe box={box} />
        <PanelContainer panel={makePanel({ title: '固定面板', isClosable: false, isResizable: false })} isActive />
      </LayoutProvider>,
    );
    expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.panel-resize-handle')).toHaveLength(0);
    expect(box.current?.panels).toHaveLength(3); // context 未动
  });
});

describe('Workspace', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('渲染工具栏与默认三面板; 网格背景层随开关增减', () => {
    const box: { current: Ctx | null } = { current: null };
    const { container } = render(
      <LayoutProvider>
        <Probe box={box} />
        <Workspace />
      </LayoutProvider>,
    );
    expect(screen.getByText('添加面板')).toBeInTheDocument();
    expect(container.querySelectorAll('.panel-container')).toHaveLength(3);
    const content = container.querySelector('.workspace-content') as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.children).toHaveLength(4); // 网格层 + 3 面板

    act(() => box.current?.updateLayoutConfig({ showGridLines: false }));
    expect(content.children).toHaveLength(3); // 网格层消失

    act(() => box.current?.resetLayout());
    expect(container.querySelectorAll('.panel-container')).toHaveLength(0);
  });
});

describe('外点关闭/拖拽分支清扫（batch C3）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('PanelToolbar 添加菜单：文档 mousedown 外点关闭', () => {
    const box: { current: Ctx | null } = { current: null };
    render(
      <LayoutProvider>
        <Probe box={box} />
        <PanelToolbar />
      </LayoutProvider>,
    );
    fireEvent.click(screen.getByText('添加面板'));
    expect(screen.getByText('代码编辑器')).toBeInTheDocument(); // 菜单开
    fireEvent.mouseDown(document.body); // 外点
    expect(screen.queryByText('代码编辑器')).not.toBeInTheDocument(); // 菜单关
  });

  it('Panel 无回调 props：minimize/maximize/close 点击守卫分支不抛错', () => {
    render(
      <LayoutProvider>
        <Panel
          panel={makePanel()}
          isActive={false}
          onMouseDown={undefined as never}
          onMinimize={undefined as never}
          onMaximize={undefined as never}
          onClose={undefined as never}
        />
      </LayoutProvider>,
    );
    expect(() => {
      fireEvent.click(screen.getByTitle('Minimize'));
      fireEvent.click(screen.getByTitle('Maximize'));
      fireEvent.click(screen.getByTitle('Close'));
      fireEvent.mouseDown(screen.getByText('代码面板'));
    }).not.toThrow();
  });

  it('TabBar 关闭钮 hover 进出样式切换分支', () => {
    const { container } = render(
      <LayoutProvider>
        <TabBar panel={makePanel({ tabs: [makeTab('t1', 'A', { isActive: true })], activeTabId: 't1' })} />
      </LayoutProvider>,
    );
    const close = container.querySelector('.tab-close') as HTMLElement;
    fireEvent.mouseEnter(close);
    expect(close.style.opacity).toBe('1');
    fireEvent.mouseLeave(close);
    expect(close.style.opacity).toBe('0.6');
  });

  it('PanelResizeHandle 拖拽态 mousemove（preventDefault 分支）+ 卸载清理', () => {
    const { unmount } = render(<PanelResizeHandle direction="e" onMouseDown={noop} />);
    const handle = document.querySelector('.panel-resize-handle')!;
    fireEvent.mouseDown(handle);
    // 拖拽态：isResizing=true → preventDefault 分支
    const evt = new window.Event('mousemove', { cancelable: true });
    const spy = vi.spyOn(evt, 'preventDefault');
    window.dispatchEvent(evt);
    expect(spy).toHaveBeenCalled();
    // mouseup 结束拖拽
    fireEvent.mouseUp(window);
    const evt2 = new window.Event('mousemove', { cancelable: true });
    const spy2 = vi.spyOn(evt2, 'preventDefault');
    window.dispatchEvent(evt2);
    expect(spy2).not.toHaveBeenCalled();
    // 卸载清理分支
    expect(() => unmount()).not.toThrow();
    spy.mockRestore();
    spy2.mockRestore();
  });

  it('PanelContainer 缩放手柄 mousedown → startResize 联动 context', () => {
    const box: { current: Ctx | null } = { current: null };
    const { container } = render(
      <LayoutProvider>
        <Probe box={box} />
        <CtxLastPanelContainer isActive />
      </LayoutProvider>,
    );
    act(() => box.current!.addPanel({
      type: 'code-editor', title: '代码面板',
      position: { x: 10, y: 10, w: 0, h: 0 },
      size: { width: 300, height: 300 },
      minSize: { width: 100, height: 100 },
      maxSize: { width: 800, height: 600 },
      isLocked: false, isMinimized: false, isMaximized: false,
      isClosable: true, isResizable: true,
    }));
    const handles = container.querySelectorAll('.panel-resize-handle');
    expect(handles.length).toBe(3);
    fireEvent.mouseDown(handles[0]); // direction e
    const id = box.current!.panels[box.current!.panels.length - 1].id;
    expect(box.current?.state.resizing.panelId).toBe(id);
    expect(box.current?.state.resizing.direction).toBe('e');
  });
});
