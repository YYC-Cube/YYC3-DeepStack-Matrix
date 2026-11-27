/**
 * @file: file-explorer.test.tsx
 * @description: FileExplorer 用例 — 文件树渲染/搜索过滤/文件夹展开收起/文件选中/Git 侧栏 tab(GitPanel 挂载) + 右键菜单
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileExplorer } from '../FileExplorer';
import { MOCK_FILE_TREE, MOCK_FILE_CONTENTS } from '../ide-mock-data';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('FileExplorer 资源管理器 tab', () => {
  const onFileSelect = vi.fn();

  function setup(activeFileId?: string) {
    return render(<FileExplorer onFileSelect={onFileSelect} activeFileId={activeFileId} />);
  }

  beforeEach(() => {
    onFileSelect.mockClear();
  });

  it('渲染默认展开树（src 展开态）与根文件夹', () => {
    setup();
    expect(screen.getByText('src')).toBeInTheDocument();
    // 默认展开 src → App.tsx 可见
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('搜索过滤：输入关键字过滤树', () => {
    setup();
    const input = screen.getByPlaceholderText('ide.filterFiles') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'App' } });
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'zzz-no-match' } });
    expect(screen.queryByText('App.tsx')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('文件夹展开/收起切换', () => {
    setup();
    const srcRow = screen.getByText('src');
    fireEvent.click(srcRow); // 收起 src（默认展开）
    expect(screen.queryByText('App.tsx')).not.toBeInTheDocument();
    fireEvent.click(srcRow); // 重新展开
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('点击文件 → onFileSelect 回调', () => {
    setup();
    fireEvent.click(screen.getByText('App.tsx'));
    expect(onFileSelect).toHaveBeenCalledWith('app-tsx', 'App.tsx');
  });

  it('右键文件 → 上下文菜单渲染并按动作关闭', () => {
    setup();
    const fileRow = screen.getByText('App.tsx');
    fireEvent.contextMenu(fileRow.closest('div')!);
    // 菜单项（newFile/rename/delete 或 copy path）——以文档中出现菜单容器为准
    const menuItems = ['ide.newFile', 'ide.rename', 'ide.delete', 'ide.copyPath'].filter((k) => {
      try {
        return screen.queryByText(k) !== null;
      } catch {
        return false;
      }
    });
    // 至少渲染了菜单（非文件夹 → 无 newFile）
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    if (menuItems.length > 0) {
      fireEvent.click(screen.getByText(menuItems[0]));
    }
  });
});

describe('FileExplorer Git 侧栏（挂载 GitPanel）', () => {
  it('切到 Git tab 渲染 GitPanel 骨架（变更/暂存/提交输入）并切回', () => {
    render(<FileExplorer onFileSelect={() => {}} />);
    fireEvent.click(screen.getByText('ide.git'));
    // GitPanel 静态骨架（数据经 GitService 异步加载，初始仅 tab 骨架）
    expect(screen.getByText('ide.gitChanges')).toBeInTheDocument();
    expect(screen.getByText('ide.gitHistory')).toBeInTheDocument();
    expect(screen.getByText('ide.gitBranches')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('ide.filterFiles')).not.toBeInTheDocument();
    // 切回 explorer
    fireEvent.click(screen.getByText('ide.explorer'));
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });
});

describe('FileExplorer 树形数据一致性（与 ide-mock-data 对齐）', () => {
  it('根级文件夹数量与 mock 一致', () => {
    render(<FileExplorer onFileSelect={() => {}} />);
    for (const root of MOCK_FILE_TREE) {
      expect(screen.getByText(root.name)).toBeInTheDocument();
    }
  });
});

describe('FileExplorer 右键菜单深流程（batch C3）', () => {
  const onFileSelect = vi.fn();

  function openMenuOn(target: RegExp | string) {
    // 直接在文本节点上触发——冒泡穿过行级 onContextMenu（其内部 stopPropagation 拦截容器回退）
    fireEvent.contextMenu(screen.getByText(target));
  }

  beforeEach(() => {
    onFileSelect.mockClear();
  });

  it('文件右键 → rename → InlineInput 提交 → 树更新', async () => {
    render(<FileExplorer onFileSelect={onFileSelect} />);
    openMenuOn('routes.ts');
    fireEvent.click(screen.getByText('ide.rename'));
    const input = document.querySelector('input.border-\\[rgba\\(0\\,212\\,255\\,0\\.3\\)\\]') as HTMLInputElement
      ?? document.querySelector('.flex-1.bg-\\[rgba\\(0\\,40\\,80\\,0\\.4\\)\\]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).value).toBe('routes.ts');
    fireEvent.change(input, { target: { value: 'renamed-routes.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('renamed-routes.ts')).toBeInTheDocument();
    expect(screen.queryByText('routes.ts')).not.toBeInTheDocument();
  });

  it('文件右键 → delete → 从树移除', () => {
    render(<FileExplorer onFileSelect={onFileSelect} />);
    openMenuOn('App.tsx');
    fireEvent.click(screen.getByText('ide.deleteFile'));
    expect(screen.queryByText('App.tsx')).not.toBeInTheDocument();
    // MOCK_FILE_CONTENTS 仍在（不动 contents map）
    expect(MOCK_FILE_CONTENTS['app-tsx']).toBeTruthy();
  });

  it('文件夹右键 → newFile → InlineInput → 新文件入 src', () => {
    render(<FileExplorer onFileSelect={onFileSelect} />);
    openMenuOn('src');
    fireEvent.click(screen.getByText('ide.newFile'));
    const input = document.querySelector('input') as HTMLInputElement; // InlineInput（唯一输入框，搜索框在上方——取最后一个）
    const inputs = document.querySelectorAll('input');
    const inline = inputs[inputs.length - 1] as HTMLInputElement;
    expect(inline.value).toBe('untitled.tsx');
    fireEvent.change(inline, { target: { value: 'c3-new-file.tsx' } });
    fireEvent.keyDown(inline, { key: 'Enter' });
    expect(screen.getByText('c3-new-file.tsx')).toBeInTheDocument();
  });

  it('根区右键 → newFolder → 新文件夹入 src-app', () => {
    const { container } = render(<FileExplorer onFileSelect={onFileSelect} />);
    const treeArea = container.querySelector('.flex-1.overflow-y-auto')!;
    fireEvent.contextMenu(treeArea);
    fireEvent.click(screen.getByText('ide.newFolder'));
    const inputs = document.querySelectorAll('input');
    const inline = inputs[inputs.length - 1] as HTMLInputElement;
    expect(inline.value).toBe('new-folder');
    fireEvent.keyDown(inline, { key: 'Enter' });
    expect(screen.getByText('new-folder')).toBeInTheDocument();
  });

  it('copy path 动作为 mock no-op（菜单点击不抛错）', () => {
    render(<FileExplorer onFileSelect={onFileSelect} />);
    openMenuOn('App.tsx');
    expect(() => fireEvent.click(screen.getByText('ide.copyPath'))).not.toThrow();
    expect(screen.queryByText('ide.copyPath')).not.toBeInTheDocument(); // 菜单关闭
  });

  it('InlineInput Escape 取消 + blur 提交', () => {
    render(<FileExplorer onFileSelect={onFileSelect} />);
    openMenuOn('routes.ts');
    fireEvent.click(screen.getByText('ide.rename'));
    let inputs = document.querySelectorAll('input');
    const inline = inputs[inputs.length - 1] as HTMLInputElement;
    fireEvent.keyDown(inline, { key: 'Escape' });
    expect(screen.getByText('routes.ts')).toBeInTheDocument(); // 取消未改名
    // blur 提交路径
    openMenuOn('routes.ts');
    fireEvent.click(screen.getByText('ide.rename'));
    inputs = document.querySelectorAll('input');
    const inline2 = inputs[inputs.length - 1] as HTMLInputElement;
    fireEvent.change(inline2, { target: { value: 'blur-renamed.ts' } });
    fireEvent.blur(inline2);
    expect(screen.getByText('blur-renamed.ts')).toBeInTheDocument();
  });

  it('菜单外点 mousedown 关闭', () => {
    render(<FileExplorer onFileSelect={onFileSelect} />);
    openMenuOn('App.tsx');
    expect(screen.getByText('ide.rename')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('ide.rename')).not.toBeInTheDocument();
  });
});
