/**
 * @file: layout-context.test.tsx
 * @description: LayoutContext 逻辑用例 — reducer 17 action 全分支（拖拽/缩放几何 + snap 网格 + tab 管理 + 持久化联动）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LayoutProvider, useLayoutContext } from '../LayoutContext';
import { useIDESettingsSlice } from '../ide-settings-slice';

type LayoutContextType = ReturnType<typeof useLayoutContext>;

/** 上下文探针：把最新 context 值抛给外部可变盒子 */
function Probe({ box }: { box: { current: LayoutContextType | null } }) {
  const ctx = useLayoutContext();
  box.current = ctx;
  return null;
}

function renderProvider() {
  const box: { current: LayoutContextType | null } = { current: null };
  render(
    <LayoutProvider>
      <Probe box={box} />
    </LayoutProvider>,
  );
  // 每次调用取最新 context（getter 解构会缓存旧快照，必须用函数取值）
  return () => box.current as LayoutContextType;
}

function makeMouseEvent(clientX: number, clientY: number): MouseEvent {
  return { clientX, clientY } as unknown as MouseEvent;
}

const FRESH_PANEL = {
  type: 'code-editor' as const,
  title: 'Fresh',
  position: { x: 40, y: 40, w: 0, h: 0 },
  size: { width: 300, height: 300 },
  minSize: { width: 100, height: 100 },
  maxSize: { width: 500, height: 500 },
  isLocked: false,
  isMinimized: false,
  isMaximized: false,
  isClosable: true,
  isResizable: true,
};

function resetSlices() {
  localStorage.clear();
  useIDESettingsSlice.getState().resetSettings();
  useIDESettingsSlice.getState().setLayoutConfig(null as never);
}

describe('LayoutContext 初始态', () => {
  beforeEach(resetSlices);

  it('默认三面板 + 选中 code-editor + 网格开启', () => {
    const getCtx = renderProvider();
    expect(getCtx().panels.map((p) => p.id)).toEqual(['panel-code-editor', 'panel-ai-chat', 'panel-terminal']);
    expect(getCtx().activePanelId).toBe('panel-code-editor');
    expect(getCtx().layoutConfig.showGridLines).toBe(true);
    expect(getCtx().layoutConfig.gridSize).toBe(20);
    expect(getCtx().state.dragging.panelId).toBeNull();
    expect(getCtx().state.resizing.panelId).toBeNull();
  });
});

describe('LayoutContext 面板 CRUD 与守卫', () => {
  beforeEach(resetSlices);

  it('addPanel 生成 id/zIndex/tabs 缺省', () => {
    const getCtx = renderProvider();
    act(() => getCtx().addPanel({ ...FRESH_PANEL }));
    expect(getCtx().panels).toHaveLength(4);
    const added = getCtx().panels[3];
    expect(added.id).toMatch(/^panel-\d+$/);
    expect(added.zIndex).toBe(4);
    expect(added.tabs).toEqual([]);
    expect(added.isClosable).toBe(true);
  });

  it('removePanel 移除并清除选中; 仅剩最后一块时拒绝删除', () => {
    const getCtx = renderProvider();
    act(() => getCtx().removePanel('panel-ai-chat'));
    expect(getCtx().panels).toHaveLength(2);
    act(() => getCtx().selectPanel('panel-terminal'));
    act(() => getCtx().removePanel('panel-terminal'));
    expect(getCtx().activePanelId).toBeNull();
    expect(getCtx().panels).toHaveLength(1);
    // 守卫分支：仅剩一块时 REMOVE_PANEL 返回原 state
    act(() => getCtx().removePanel('panel-code-editor'));
    expect(getCtx().panels).toHaveLength(1);
    expect(getCtx().panels[0].id).toBe('panel-code-editor');
  });

  it('updatePanel 合并更新', () => {
    const getCtx = renderProvider();
    act(() => getCtx().updatePanel('panel-terminal', { title: 'Sh', zIndex: 99 }));
    const t = getCtx().panels.find((p) => p.id === 'panel-terminal');
    expect(t?.title).toBe('Sh');
    expect(t?.zIndex).toBe(99);
  });

  it('selectPanel 切换与置空', () => {
    const getCtx = renderProvider();
    act(() => getCtx().selectPanel('panel-ai-chat'));
    expect(getCtx().activePanelId).toBe('panel-ai-chat');
    act(() => getCtx().selectPanel(null));
    expect(getCtx().activePanelId).toBeNull();
  });
});

describe('LayoutContext 拖拽几何（snap + 钳位）', () => {
  beforeEach(resetSlices);

  it('START_DRAG 记录偏移; ON_DRAG 吸附网格且钳位 ≥0; END_DRAG 复位', () => {
    const getCtx = renderProvider();
    act(() => getCtx().startDrag('panel-code-editor', makeMouseEvent(100, 100)));
    expect(getCtx().state.dragging.panelId).toBe('panel-code-editor');
    expect(getCtx().state.dragging.offsetX).toBe(80); // 100 - 20

    act(() => getCtx().onDrag(makeMouseEvent(163, 87)));
    const p = getCtx().panels.find((x) => x.id === 'panel-code-editor');
    // newX=83 → snap 80; newY=7 → snap 0（钳位后仍 0）
    expect(p?.position.x).toBe(80);
    expect(p?.position.y).toBe(0);

    act(() => getCtx().endDrag());
    expect(getCtx().state.dragging.panelId).toBeNull();
  });

  it('START_DRAG 未知面板 no-op; ON_DRAG 无拖拽态 no-op', () => {
    const getCtx = renderProvider();
    act(() => getCtx().startDrag('ghost', makeMouseEvent(1, 2)));
    expect(getCtx().state.dragging.panelId).toBeNull();
    const snapshot = getCtx().panels.map((p) => p.position.x);
    act(() => getCtx().onDrag(makeMouseEvent(500, 500)));
    expect(getCtx().panels.map((p) => p.position.x)).toEqual(snapshot);
  });

  it('snapToGrid 关闭时使用原始坐标（负值钳位）', () => {
    const getCtx = renderProvider();
    act(() => getCtx().updateLayoutConfig({ snapToGrid: false }));
    act(() => getCtx().startDrag('panel-code-editor', makeMouseEvent(100, 100)));
    act(() => getCtx().onDrag(makeMouseEvent(-50, -10)));
    const p = getCtx().panels.find((x) => x.id === 'panel-code-editor');
    expect(p?.position.x).toBe(0); // -130 → 钳位 0
    expect(p?.position.y).toBe(0);
  });
});

describe('LayoutContext 缩放几何（四方向 + min/max 钳位 + snap）', () => {
  beforeEach(resetSlices);

  function addFresh() {
    const getCtx = renderProvider();
    act(() => getCtx().addPanel({ ...FRESH_PANEL }));
    const id = getCtx().panels[getCtx().panels.length - 1].id;
    return { getCtx, id };
  }

  it('east：宽度增长并吸附', () => {
    const { getCtx, id } = addFresh();
    act(() => getCtx().startResize(id, 'e', makeMouseEvent(100, 0)));
    act(() => getCtx().onResize(makeMouseEvent(163, 0)));
    const p = getCtx().panels.find((x) => x.id === id);
    expect(p?.size.width).toBe(360); // 300+63=363 → snap 360
    expect(p?.size.height).toBe(300);
  });

  it('west：宽度收缩且 left 左移并吸附', () => {
    const { getCtx, id } = addFresh();
    act(() => getCtx().startResize(id, 'w', makeMouseEvent(100, 0)));
    act(() => getCtx().onResize(makeMouseEvent(63, 0)));
    const p = getCtx().panels.find((x) => x.id === id);
    expect(p?.size.width).toBe(340); // 300+37=337 → snap 340
    expect(p?.position.x).toBe(0); // 40-37=3 → snap 0
  });

  it('south/north：高度增减', () => {
    const { getCtx, id } = addFresh();
    act(() => getCtx().startResize(id, 's', makeMouseEvent(0, 100)));
    act(() => getCtx().onResize(makeMouseEvent(0, 130)));
    expect(getCtx().panels.find((x) => x.id === id)?.size.height).toBe(340); // 330 → snap 340

    act(() => getCtx().startResize(id, 'n', makeMouseEvent(0, 0)));
    act(() => getCtx().onResize(makeMouseEvent(0, -40)));
    const p = getCtx().panels.find((x) => x.id === id);
    expect(p?.size.height).toBe(380); // 340+40=380 → snap 380
    expect(p?.position.y).toBe(0); // 40-40=0 → snap 0
  });

  it('min/max 钳位优先于 snap', () => {
    const { getCtx, id } = addFresh();
    act(() => getCtx().startResize(id, 'w', makeMouseEvent(100, 0)));
    act(() => getCtx().onResize(makeMouseEvent(3000, 0))); // 想缩到负宽
    const p = getCtx().panels.find((x) => x.id === id);
    expect(p?.size.width).toBe(100); // minSize.width → snap 100
    act(() => getCtx().startResize(id, 'e', makeMouseEvent(0, 0)));
    act(() => getCtx().onResize(makeMouseEvent(5000, 0)));
    expect(getCtx().panels.find((x) => x.id === id)?.size.width).toBe(500); // maxSize.width → snap 500
  });

  it('END_RESIZE 复位缩放态; ON_RESIZE 无缩放态 no-op', () => {
    const { getCtx, id } = addFresh();
    act(() => getCtx().onResize(makeMouseEvent(999, 999)));
    expect(getCtx().state.resizing.panelId).toBeNull();
    act(() => getCtx().startResize(id, 'se', makeMouseEvent(0, 0)));
    expect(getCtx().state.resizing.direction).toBe('se');
    act(() => getCtx().endResize());
    expect(getCtx().state.resizing.panelId).toBeNull();
    expect(getCtx().state.resizing.direction).toBeNull();
  });
});

describe('LayoutContext Tab 管理', () => {
  beforeEach(resetSlices);

  // 产品码用 Date.now() 生成 tab id —— 同毫秒连开会碰撞；
  // 用递增时钟隔离（碰撞现象已登记为已知问题，不在测试内复现依赖）
  let tick = 1000;
  beforeEach(() => {
    tick = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => tick++);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('addTab 激活新 tab 且旧 tab 失活', () => {
    const getCtx = renderProvider();
    act(() => getCtx().addTab('panel-code-editor', { title: 'A.tsx', panelId: 'panel-code-editor', isPinned: false, isModified: false, isUnsaved: false, hasError: false }));
    act(() => getCtx().addTab('panel-code-editor', { title: 'B.tsx', panelId: 'panel-code-editor', isPinned: false, isModified: true, isUnsaved: false, hasError: false }));
    const panel = getCtx().panels.find((p) => p.id === 'panel-code-editor');
    expect(panel?.tabs).toHaveLength(2);
    expect(panel?.tabs.map((t) => t.isActive)).toEqual([false, true]);
    expect(panel?.activeTabId).toBe(panel?.tabs[1].id);
  });

  it('removeTab 回落到首个 tab; 清空后 activeTabId 为空串', () => {
    const getCtx = renderProvider();
    act(() => getCtx().addTab('panel-code-editor', { title: 'A', panelId: 'panel-code-editor', isPinned: false, isModified: false, isUnsaved: false, hasError: false }));
    act(() => getCtx().addTab('panel-code-editor', { title: 'B', panelId: 'panel-code-editor', isPinned: false, isModified: false, isUnsaved: false, hasError: false }));
    const panel = () => getCtx().panels.find((p) => p.id === 'panel-code-editor')!;
    const second = panel().tabs[1].id;
    act(() => getCtx().removeTab('panel-code-editor', second));
    expect(panel().tabs).toHaveLength(1);
    expect(panel().activeTabId).toBe(panel().tabs[0].id);
    act(() => getCtx().removeTab('panel-code-editor', panel().tabs[0].id));
    expect(panel().tabs).toHaveLength(0);
    expect(panel().activeTabId).toBe('');
  });

  it('switchTab / updateTab', () => {
    const getCtx = renderProvider();
    act(() => getCtx().addTab('panel-code-editor', { title: 'A', panelId: 'panel-code-editor', isPinned: false, isModified: false, isUnsaved: false, hasError: false }));
    act(() => getCtx().addTab('panel-code-editor', { title: 'B', panelId: 'panel-code-editor', isPinned: false, isModified: false, isUnsaved: false, hasError: false }));
    const panel = () => getCtx().panels.find((p) => p.id === 'panel-code-editor')!;
    const first = panel().tabs[0].id;
    act(() => getCtx().switchTab('panel-code-editor', first));
    expect(panel().tabs.map((t) => t.isActive)).toEqual([true, false]);
    expect(panel().activeTabId).toBe(first);
    act(() => getCtx().updateTab('panel-code-editor', first, { isModified: true, title: 'A*' }));
    expect(panel().tabs[0].isModified).toBe(true);
    expect(panel().tabs[0].title).toBe('A*');
  });
});

describe('LayoutContext 布局配置与持久化联动', () => {
  beforeEach(resetSlices);

  it('updateLayoutConfig 合并配置', () => {
    const getCtx = renderProvider();
    act(() => getCtx().updateLayoutConfig({ showGridLines: false, gridSize: 10 }));
    expect(getCtx().layoutConfig.showGridLines).toBe(false);
    expect(getCtx().layoutConfig.gridSize).toBe(10);
    expect(getCtx().layoutConfig.snapToGrid).toBe(true);
  });

  it('saveLayout 写入 settings-slice; loadLayout 回滚到已存档布局', () => {
    const getCtx = renderProvider();
    act(() => getCtx().saveLayout());
    const saved = useIDESettingsSlice.getState().layoutConfig;
    expect(saved?.panels.map((p) => p.id)).toContain('panel-terminal');

    act(() => getCtx().updateLayoutConfig({ gridSize: 5 }));
    act(() => getCtx().loadLayout()); // 有存档 → LOAD_LAYOUT 回滚 gridSize
    expect(getCtx().layoutConfig.gridSize).toBe(20);
  });

  it('loadLayout 恢复外部存档; resetLayout 清空为 split', () => {
    const getCtx = renderProvider();
    const archive = {
      panels: [{ ...FRESH_PANEL, id: 'p-ext', zIndex: 1, tabs: [], activeTabId: '' }],
      layout: 'grid' as const,
      theme: 'dark' as const,
      showGridLines: false,
      snapToGrid: false,
      gridSize: 40,
    };
    useIDESettingsSlice.getState().setLayoutConfig(archive as never);
    act(() => getCtx().loadLayout());
    expect(getCtx().panels.map((p) => p.id)).toEqual(['p-ext']);
    expect(getCtx().layoutConfig.gridSize).toBe(40);

    act(() => getCtx().resetLayout());
    expect(getCtx().panels).toHaveLength(0);
    expect(getCtx().layoutConfig.layout).toBe('split');
    expect(getCtx().activePanelId).toBeNull();
  });

  it('Provider 外使用 useLayoutContext 抛出指引错误', () => {
    const box: { current: LayoutContextType | null } = { current: null };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe box={box} />)).toThrow('useLayoutContext must be used within a LayoutProvider');
    spy.mockRestore();
  });
});
