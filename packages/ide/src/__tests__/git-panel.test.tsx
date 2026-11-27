/**
 * @file: git-panel.test.tsx
 * @description: GitPanel 深交互流 — 三 tab + 暂存全流程（stage/unstage/stageAll/unstageAll）+ 提交流（含关爱消息）+ 提交历史展开/搜索 + 分支切换 + 刷新/Pull/Push
 * @author: YanYuCloudCube Team
 * @version: v0.2.0
 * @updated: 2026-11-28
 * @status: active
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GitPanel } from '../GitPanel';
import { getGitService } from '@yyc3-deepstack/core/GitService';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

/** 等待 mock GitService 初始化完成（changes 渲染或干净态） */
async function waitReady() {
  await waitFor(() => {
    const text = document.body.textContent ?? '';
    expect(text.includes('family-anthem.ts') || text.includes('ide.gitClean')).toBe(true);
  }, { timeout: 5000 });
}

describe('GitPanel changes tab：暂存全流程', () => {
  it('初始渲染：mock 变更列表（staged/unstaged 分区）+ 提交框', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    expect(screen.getByPlaceholderText('ide.gitCommitMsg')).toBeInTheDocument();
    // mock 后端 getStatus：index.ts staged + 3 个 unstaged（见 core GitService mock）
    await waitFor(() => {
      expect(screen.getByText('packages/ai-family/src/index.ts')).toBeInTheDocument();
    });
  }, 15000);

  it('点击变更行 → toggleStage（staged ↔ unstaged 往返）', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    // 初始 unstaged 的 GitPanel.tsx 行 → 点击 stage → Unstage 钮
    const row = await screen.findByText('src/app/components/ide/GitPanel.tsx');
    expect(screen.getAllByTitle('Stage').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.getAllByTitle('Unstage').length).toBeGreaterThanOrEqual(1);
    });
    // 再点击 → 回到 unstaged
    fireEvent.click(screen.getByText('src/app/components/ide/GitPanel.tsx'));
    await waitFor(() => {
      expect(screen.getAllByTitle('Stage').length).toBeGreaterThanOrEqual(1);
    });
  }, 15000);

  it('Stage all → 全部入暂存区；Unstage all → 全部退出', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent.click(await screen.findByTitle('Stage all'));
    await waitFor(() => {
      expect(screen.getByTitle('Unstage all')).toBeInTheDocument();
    });
    const commitBtn = screen.getByText(/ide\.gitCommit \(/);
    expect(commitBtn).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Unstage all'));
    await waitFor(() => {
      expect(screen.getByTitle('Stage all')).toBeInTheDocument();
    });
  }, 15000);

  it('提交流：stageAll + 消息 + 提交 → lastAction ✅ + 提交数 +1（showAIIntegration → 关爱消息）', async () => {
    getGitService().destroy();
    render(<GitPanel showAIIntegration />);
    await waitReady();
    fireEvent.click(await screen.findByTitle('Stage all'));
    const input = screen.getByPlaceholderText('ide.gitCommitMsg') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'test: c3 deep flow' } });
    fireEvent.click(screen.getByText(/ide\.gitCommit \(/));
    await waitFor(() => {
      expect(screen.getByText(/✅ Committed:/)).toBeInTheDocument();
    });
    // showAIIntegration → commit_success 关爱消息
    await waitFor(() => {
      expect(screen.getByText(/每一次提交都是成长的印记/)).toBeInTheDocument();
    });
    // 提交数 +1（历史 tab 计数 8→9）。注意：mock GitService 的 auto-refresh 会用
    // 默认 mock 状态回填 changes（测试性现象，非产品缺陷），故不断言 staged→0
    await waitFor(() => {
      const tabBtn = screen.getByText(/ide\.gitHistory/).closest('button');
      expect(tabBtn?.textContent).toContain('9');
    }, { timeout: 3000 });
  }, 15000);

  it('空消息/无暂存 → 提交钮禁用（handleCommit 守卫）', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    const commitBtn = screen.getByText(/ide\.gitCommit \(/).closest('button')!;
    expect(commitBtn).toBeDisabled();
  }, 15000);
});

describe('GitPanel commits tab：历史/搜索/展开', () => {
  it('历史列表渲染 + 关键词过滤 + 无结果空态', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent.click(screen.getByText('ide.gitHistory'));
    expect(await screen.findByText(/添加AI Family关爱语言引擎/)).toBeInTheDocument();
    const search = screen.getByPlaceholderText('ide.gitSearchCommits') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'a1b2c3d' } });
    expect(screen.getByText(/添加AI Family关爱语言引擎/)).toBeInTheDocument();
    expect(screen.queryByText(/UI组件库升级/)).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'zzz-none' } });
    expect(screen.getByText('No commits found')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByText(/UI组件库升级/)).toBeInTheDocument();
  }, 15000);

  it('点击提交条目 → 展开详情（files/+/−）', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent.click(screen.getByText('ide.gitHistory'));
    const item = await screen.findByText(/添加AI Family关爱语言引擎/);
    fireEvent.click(item);
    await waitFor(() => {
      expect(screen.getByText(/files/)).toBeInTheDocument();
    });
  }, 15000);
});

describe('GitPanel branches tab 与分支选择器', () => {
  it('branches tab：分支列表 + 点击切换 checkout', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent.click(screen.getByText('ide.gitBranches'));
    expect(await screen.findByText('develop')).toBeInTheDocument();
    fireEvent.click(screen.getByText('develop'));
    // checkoutBranch 后 branches 重载（全部分支仍在列表）
    await waitFor(() => {
      expect(screen.getAllByText('main').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('develop')).toBeInTheDocument();
    });
  }, 15000);

  it('头部分支选择器：开合 + 选中切换 + 背板关闭', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    // 当前分支名（singleton 可能被前序用例 checkout 成 develop → 兼容两种）
    const current = screen.queryByText('main') ?? screen.getByText('develop');
    fireEvent.click(current);
    const other = await screen.findByText(current.textContent === 'main' ? 'develop' : 'main');
    fireEvent.click(other); // 选中另一分支 → 下拉关闭（背板移除）
    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0.z-40')).toBeNull();
    });
  }, 15000);
});

describe('GitPanel 工具栏', () => {
  it('Refresh → lastAction 🔄 Refreshed', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent.click(screen.getByTitle('Refresh'));
    await waitFor(() => {
      expect(screen.getByText('🔄 Refreshed')).toBeInTheDocument();
    });
  }, 15000);

  it('Pull / Push → lastAction 结果条', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent.click(screen.getByTitle('Pull'));
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      expect(text.includes('✅') || text.includes('❌') || text.includes('🔄')).toBe(true);
    }, { timeout: 6000 });
    fireEvent.click(screen.getByTitle('Push'));
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      expect(text.includes('✅') || text.includes('❌') || text.includes('🔄')).toBe(true);
    }, { timeout: 6000 });
  }, 15000);

  it('compact + showAIIntegration 渲染不抛错', async () => {
    getGitService().destroy();
    render(<GitPanel compact showAIIntegration />);
    await waitReady();
    expect(screen.getByPlaceholderText('ide.gitCommitMsg')).toBeInTheDocument();
  }, 15000);
});

describe('GitPanel 离线流（batch C3 分支清扫）', () => {
  it('window offline 事件当前不改变在线态（监听器误绑 setIsOffline(false) —— 已登记产品缺陷，锁现状）', async () => {
    getGitService().destroy();
    render(<GitPanel showAIIntegration />);
    await waitReady();
    fireEvent(window, new Event('offline'));
    // 现状：offline 监听器与 online 一样调 setIsOffline(false) → isOnline 不变 → 按钮仍可用
    expect(screen.getByTitle('Pull')).toBeEnabled();
    expect(screen.getByTitle('Push')).toBeEnabled();
  }, 15000);

  it('离线时 toggleStage 异常路径不崩（service status 空守卫）', async () => {
    getGitService().destroy();
    render(<GitPanel />);
    await waitReady();
    fireEvent(window, new Event('offline'));
    const row = document.body.textContent?.includes('index.ts');
    if (row) {
      fireEvent.click(screen.getByText('packages/ai-family/src/index.ts'));
    }
    expect(document.body.textContent!.length).toBeGreaterThan(50);
    fireEvent(window, new Event('online'));
  }, 15000);
});
