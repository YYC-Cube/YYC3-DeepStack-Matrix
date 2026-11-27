/**
 * @file: ide-mock-data.test.ts
 * @description: ide-mock-data 数据完整性用例 — 文件树/内容/聊天/Git/通知/模型各 mock 集合的形状与一致性
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect } from 'vitest';
import {
  MOCK_FILE_TREE,
  MOCK_FILE_CONTENTS,
  MOCK_CHAT_HISTORY,
  MOCK_RECENT_PROJECTS,
  AI_MODELS,
  MOCK_GIT_BRANCHES,
  MOCK_GIT_CHANGES,
  MOCK_GIT_COMMITS,
  MOCK_NOTIFICATIONS,
} from '../ide-mock-data';
import type { IDEFile, GitFileStatus, IDENotificationSeverity } from '../ide-types';

/** 递归收集文件树叶子 */
function collectFiles(nodes: IDEFile[]): IDEFile[] {
  return nodes.flatMap((n) => (n.type === 'folder' && n.children ? collectFiles(n.children) : [n]));
}

describe('ide-mock-data 文件树与内容', () => {
  it('MOCK_FILE_TREE 根目录含 src/docs/config 等文件夹且递归合法', () => {
    expect(MOCK_FILE_TREE.length).toBeGreaterThan(3);
    for (const node of MOCK_FILE_TREE) {
      expect(node.id).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(['folder', 'file']).toContain(node.type);
      if (node.type === 'folder') {
        expect(Array.isArray(node.children)).toBe(true);
        expect(node.children!.length).toBeGreaterThan(0);
      } else {
        expect(node.language).toBeTruthy();
        expect(node.size).toBeTruthy();
        expect(node.modified).toBeTruthy();
      }
    }
    const files = collectFiles(MOCK_FILE_TREE);
    expect(new Set(files.map((f) => f.id)).size).toBe(files.length); // id 无重复
    expect(files.some((f) => f.name === 'App.tsx')).toBe(true);
  });

  it('MOCK_FILE_CONTENTS 键均为文件树中的文件 id 且内容非空代码文本', () => {
    const fileIds = new Set(collectFiles(MOCK_FILE_TREE).map((f) => f.id));
    const keys = Object.keys(MOCK_FILE_CONTENTS);
    expect(keys.length).toBeGreaterThan(3);
    for (const [id, content] of Object.entries(MOCK_FILE_CONTENTS)) {
      expect(fileIds.has(id), `contents 键 ${id} 不在文件树中`).toBe(true);
      expect(content.length).toBeGreaterThan(10);
    }
    expect(MOCK_FILE_CONTENTS['app-tsx']).toContain('RouterProvider');
    expect(MOCK_FILE_CONTENTS['glasscard-tsx']).toContain('GlassCard');
  });
});

describe('ide-mock-data 会话/项目/模型/Git/通知', () => {
  it('MOCK_CHAT_HISTORY 角色/时间戳合法且有序', () => {
    expect(MOCK_CHAT_HISTORY.length).toBeGreaterThanOrEqual(3);
    const roles = new Set(MOCK_CHAT_HISTORY.map((m) => m.role));
    expect(roles).toEqual(new Set(['system', 'user', 'assistant']));
    for (const m of MOCK_CHAT_HISTORY) {
      expect(m.id).toMatch(/^msg-/);
      expect(m.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(m.content.length).toBeGreaterThan(0);
    }
  });

  it('MOCK_RECENT_PROJECTS 状态合法', () => {
    expect(MOCK_RECENT_PROJECTS).toHaveLength(4);
    for (const p of MOCK_RECENT_PROJECTS) {
      expect(['active', 'archived']).toContain(p.status);
      expect(p.updatedAt).toBeTruthy();
    }
  });

  it('AI_MODELS 五模型含 provider/status', () => {
    expect(AI_MODELS).toHaveLength(5);
    const ids = AI_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toContain('glm-4-flash');
    for (const m of AI_MODELS) {
      expect(['online', 'offline']).toContain(m.status);
      expect(m.provider).toBeTruthy();
    }
  });

  it('MOCK_GIT_BRANCHES 恰一条 current 且 ahead/behind 数字', () => {
    expect(MOCK_GIT_BRANCHES.filter((b) => b.current)).toHaveLength(1);
    expect(MOCK_GIT_BRANCHES.map((b) => b.name)).toContain('main');
    for (const b of MOCK_GIT_BRANCHES) {
      expect(typeof b.ahead).toBe('number');
      expect(typeof b.behind).toBe('number');
      expect(b.lastCommit).toBeTruthy();
    }
  });

  it('MOCK_GIT_CHANGES 状态/staged/增删行合法', () => {
    const valid: GitFileStatus[] = ['modified', 'added', 'deleted', 'renamed', 'untracked'];
    for (const c of MOCK_GIT_CHANGES) {
      expect(valid).toContain(c.status);
      expect(typeof c.staged).toBe('boolean');
      expect(c.additions).toBeGreaterThanOrEqual(0);
      expect(c.deletions).toBeGreaterThanOrEqual(0);
      expect(c.filepath).toContain(c.filename);
    }
    expect(MOCK_GIT_CHANGES.some((c) => c.status === 'deleted' && c.deletions > 0)).toBe(true);
  });

  it('MOCK_GIT_COMMITS 哈希唯一且分支引用存在', () => {
    const branchNames = new Set(MOCK_GIT_BRANCHES.map((b) => b.name));
    const hashes = MOCK_GIT_COMMITS.map((c) => c.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
    for (const c of MOCK_GIT_COMMITS) {
      expect(branchNames.has(c.branch));
      expect(c.filesChanged).toBeGreaterThan(0);
      expect(c.message).toMatch(/^(feat|fix|refactor|chore|style)/);
    }
  });

  it('MOCK_NOTIFICATIONS severity/read/source 合法', () => {
    const severities: IDENotificationSeverity[] = ['info', 'warning', 'error', 'success'];
    expect(MOCK_NOTIFICATIONS.length).toBeGreaterThanOrEqual(6);
    for (const n of MOCK_NOTIFICATIONS) {
      expect(severities).toContain(n.severity);
      expect(typeof n.read).toBe('boolean');
      expect(n.source).toBeTruthy();
      expect(n.timestamp).toBeTruthy();
    }
    expect(MOCK_NOTIFICATIONS.some((n) => !n.read)).toBe(true);
    expect(MOCK_NOTIFICATIONS.some((n) => n.read)).toBe(true);
  });
});
