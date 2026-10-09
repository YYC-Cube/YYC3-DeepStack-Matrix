/**
 * GitService.ts
 * ==============
 * 统一 Git 服务抽象层 (Mock 实现)
 *
 * 浏览器环境无真实 Git 二进制，此模块提供内存 Mock 数据源，
 * 保持与真实 GitService 一致的异步 API，供 GitPanel 等 UI 使用。
 *
 * 后续接入真实后端 (如 WebContainer / Electron Git 插件) 时，
 * 仅需替换 getGitService 的内部实现，接口保持不变。
 */

// ============================================================
// 类型定义
// ============================================================

export type GitFileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked";

export interface GitFileChange {
  id: string;
  /** 相对仓库根目录的路径 */
  path: string;
  status: GitFileStatus;
  staged: boolean;
  additions?: number;
  deletions?: number;
}

export interface GitCommitInfo {
  id: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  body?: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
  isRemote?: boolean;
  lastCommit?: string;
  ahead?: number;
  behind?: number;
}

export interface GitStatusResult {
  staged: GitFileChange[];
  unstaged: GitFileChange[];
}

export interface GitActionResult {
  success: boolean;
  message: string;
}

export interface GitServiceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export interface GitService {
  initialize(): Promise<void>;
  destroy(): void;
  getStatus(): Promise<GitStatusResult>;
  getCommits(limit?: number, offset?: number, search?: boolean): Promise<GitCommitInfo[]>;
  getBranches(): Promise<GitBranchInfo[]>;
  getPlatform(): string;
  stageFile(id: string): Promise<void>;
  unstageFile(id: string): Promise<void>;
  stageAllFiles(): Promise<void>;
  unstageAllFiles(): Promise<void>;
  commit(message: string): Promise<GitCommitInfo | null>;
  refreshStatus(): Promise<void>;
  pull(): Promise<GitActionResult>;
  push(): Promise<GitActionResult>;
  checkoutBranch(name: string): Promise<void>;
}

// ============================================================
// Mock 数据源
// ============================================================

const MOCK_FILES: GitFileChange[] = [
  { id: "f1", path: "src/App.tsx", status: "modified", staged: false, additions: 12, deletions: 3 },
  { id: "f2", path: "src/routes.ts", status: "modified", staged: true, additions: 8, deletions: 2 },
  { id: "f3", path: "components/ide/IDELayout.tsx", status: "modified", staged: false, additions: 45, deletions: 10 },
  { id: "f4", path: "hooks/useI18n.ts", status: "added", staged: false, additions: 89, deletions: 0 },
  { id: "f5", path: "lib/api-config.ts", status: "deleted", staged: false, additions: 0, deletions: 23 },
  { id: "f6", path: "docs/TESTING-GUIDE.ts", status: "untracked", staged: false, additions: 156, deletions: 0 },
];

const MOCK_COMMITS: GitCommitInfo[] = [
  {
    id: "c1",
    hash: "a1b2c3d",
    message: "feat: 补齐 IDE 多联式面板系统",
    author: "YYC Team",
    date: "2 天前",
    body: "基于 react-resizable-panels v4 重构布局，支持编辑/预览/自由三种模式。",
    filesChanged: 12,
    additions: 864,
    deletions: 156,
  },
  {
    id: "c2",
    hash: "e4f5a6b",
    message: "refactor: 统一 i18n 语言包结构",
    author: "YYC Team",
    date: "5 天前",
    filesChanged: 8,
    additions: 342,
    deletions: 210,
  },
  {
    id: "c3",
    hash: "9c8d7e6",
    message: "fix: 修复 Figma 沙箱路由加载失败",
    author: "YYC Team",
    date: "1 周前",
    body: "改用 createHashRouter + 静态导入规避动态 import 并发限制。",
    filesChanged: 3,
    additions: 96,
    deletions: 40,
  },
  {
    id: "c4",
    hash: "5f6a7b8",
    message: "feat: 引入 Supabase Mock 认证与 Ghost 登录",
    author: "YYC Team",
    date: "2 周前",
    filesChanged: 15,
    additions: 1204,
    deletions: 88,
  },
];

const MOCK_BRANCHES: GitBranchInfo[] = [
  { name: "main", current: true, lastCommit: "a1b2c3d", ahead: 0, behind: 0 },
  { name: "feature/ide-panels", current: false, lastCommit: "e4f5a6b", ahead: 4, behind: 2 },
  { name: "feature/pwa-offline", current: false, lastCommit: "9c8d7e6", ahead: 2, behind: 5 },
  { name: "origin/main", current: false, isRemote: true, lastCommit: "a1b2c3d" },
  { name: "origin/feature/ide-panels", current: false, isRemote: true, lastCommit: "e4f5a6b" },
];

// ============================================================
// 工厂实现
// ============================================================

export function getGitService(options: GitServiceOptions = {}): GitService {
  const { refreshInterval = 30000, onError } = options;

  let initialized = false;
  let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  const mockFiles = MOCK_FILES.map((f) => ({ ...f }));
  const mockCommits = MOCK_COMMITS.map((c) => ({ ...c }));
  const mockBranches = MOCK_BRANCHES.map((b) => ({ ...b }));

  const emitError = (error: Error) => {
    if (onError) onError(error);
  };

  const simulateLatency = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 120 + Math.random() * 180));

  const service: GitService = {
    async initialize() {
      await simulateLatency();
      initialized = true;
      if (options.autoRefresh && refreshInterval > 0) {
        autoRefreshTimer = setInterval(() => {
          service.refreshStatus().catch((err) => emitError(err));
        }, refreshInterval);
      }
    },

    destroy() {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    },

    async getStatus() {
      await simulateLatency();
      if (!initialized) {
        throw new Error("[GitService] Not initialized. Call initialize() first.");
      }
      return {
        staged: mockFiles.filter((f) => f.staged),
        unstaged: mockFiles.filter((f) => !f.staged),
      };
    },

    async getCommits(limit = 20, offset = 0) {
      await simulateLatency();
      return mockCommits.slice(offset, offset + limit);
    },

    async getBranches() {
      await simulateLatency();
      return mockBranches.map((b) => ({ ...b }));
    },

    getPlatform() {
      // 浏览器环境中返回 "web"
      return "web";
    },

    async stageFile(id) {
      await simulateLatency();
      const file = mockFiles.find((f) => f.id === id);
      if (file) file.staged = true;
    },

    async unstageFile(id) {
      await simulateLatency();
      const file = mockFiles.find((f) => f.id === id);
      if (file) file.staged = false;
    },

    async stageAllFiles() {
      await simulateLatency();
      mockFiles.forEach((f) => { f.staged = true; });
    },

    async unstageAllFiles() {
      await simulateLatency();
      mockFiles.forEach((f) => { f.staged = false; });
    },

    async commit(message) {
      await simulateLatency();
      const stagedCount = mockFiles.filter((f) => f.staged).length;
      if (stagedCount === 0) return null;

      const additions = mockFiles.filter((f) => f.staged).reduce((s, f) => s + (f.additions ?? 0), 0);
      const deletions = mockFiles.filter((f) => f.staged).reduce((s, f) => s + (f.deletions ?? 0), 0);

      const commitInfo: GitCommitInfo = {
        id: `c${Date.now()}`,
        hash: Math.random().toString(16).slice(2, 10),
        message,
        author: "YYC Operator",
        date: "刚刚",
        filesChanged: stagedCount,
        additions,
        deletions,
      };

      mockCommits.unshift(commitInfo);
      // 提交后清空暂存区
      mockFiles.forEach((f) => { f.staged = false; });

      return commitInfo;
    },

    async refreshStatus() {
      await simulateLatency();
      // Mock: 无操作，保持现有数据
    },

    async pull() {
      await simulateLatency();
      return { success: true, message: "Already up to date" };
    },

    async push() {
      await simulateLatency();
      return { success: true, message: "Pushed to origin/main" };
    },

    async checkoutBranch(name) {
      await simulateLatency();
      mockBranches.forEach((b) => {
        b.current = b.name === name && !b.isRemote;
      });
    },
  };

  return service;
}
