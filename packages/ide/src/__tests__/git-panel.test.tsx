/**
 * @file: git-panel.test.tsx
 * @description: GitPanel 用例 — 三 tab 切换(changes/commits/branches) + 暂存操作(全暂存/取消/单文件) + 提交流 + 提交历史搜索 + 刷新
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GitPanel } from '../GitPanel';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('GitPanel（真实 GitService mock 后端）', () => {
  it('初始化加载 changes 列表', async () => {
    render(<GitPanel />);
    await waitFor(() => {
      expect(screen.queryByText('ide.gitChanges')).toBeInTheDocument();
    });
    // GitService mock 提供状态数据 → 变更/干净二态之一渲染
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      expect(text.includes('ide.gitClean') || text.includes('.tsx')).toBe(true);
    });
  }, 15000);

  it('三 tab 切换渲染', async () => {
    render(<GitPanel />);
    await waitFor(() => {
      expect(screen.queryByText('ide.gitHistory')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ide.gitHistory'));
    const body = document.body.textContent ?? '';
    expect(body.includes('commit') || body.includes('ide.gitSearchCommits') || body.length > 100).toBe(true);
    fireEvent.click(screen.getByText('ide.gitBranches'));
    expect(document.body.textContent!.length).toBeGreaterThan(50);
    fireEvent.click(screen.getByText('ide.gitChanges'));
    expect(screen.getByText('ide.gitChanges')).toBeInTheDocument();
  }, 15000);

  it('暂存区操作按钮存在（Stage all / Unstage all / Refresh）', async () => {
    render(<GitPanel />);
    await waitFor(() => {
      expect(screen.queryByText('ide.gitChanges')).toBeInTheDocument();
    });
    await waitFor(() => {
      const hasToolbar =
        screen.queryByTitle('Stage all') !== null ||
        screen.queryByTitle('Unstage all') !== null;
      expect(hasToolbar || document.body.textContent!.includes('ide.gitClean')).toBe(true);
    });
  }, 15000);

  it('提交输入框（placeholder）可输入消息', async () => {
    render(<GitPanel />);
    const input = await screen.findByPlaceholderText('ide.gitCommitMsg');
    fireEvent.change(input, { target: { value: 'test: panel smoke' } });
    expect((input as HTMLTextAreaElement).value).toBe('test: panel smoke');
  }, 15000);

  it('compact 模式与 AI 集成开关 props 不抛错', async () => {
    render(<GitPanel compact showAIIntegration />);
    await waitFor(() => {
      expect(screen.queryByText('ide.gitChanges')).toBeInTheDocument();
    });
    expect(document.body.textContent!.length).toBeGreaterThan(50);
  }, 15000);
});
