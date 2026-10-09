/**
 * local-knowledge-base.ts
 * ========================
 * 本地知识库 — YYC³ 项目文档语义检索 (Mock 实现)
 *
 * 提供基于关键词的本地知识检索，供 AI 助手在回答问题时
 * 附带项目文档上下文，增强回答的准确性。
 *
 * 当前为纯前端 Mock 数据源；后续可替换为向量数据库或
 * 远程知识库 API，对外接口保持不变。
 */

// ============================================================
// 类型定义
// ============================================================

export interface KnowledgeArticle {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** 摘要 */
  summary: string;
  /** 相对文档路径 */
  path?: string;
  /** 标签 */
  tags?: string[];
  /** 正文关键词 (用于内部匹配) */
  keywords?: string[];
}

export interface KnowledgeSearchResult {
  article: KnowledgeArticle;
  /** 相关度分数 0-100 */
  score: number;
}

// ============================================================
// 本地知识库数据源
// ============================================================

const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: "kb-001",
    title: "YYC³ CloudPivot Intelli-Matrix 架构概览",
    summary: "基于 Next.js + React + shadcn/ui + pnpm 的多维智能运维矩阵，五维驱动五高五标五化。",
    path: "docs/DEVELOPER-HANDOFF.ts",
    tags: ["架构", "技术栈"],
    keywords: ["架构", "arch", "matrix", "运维", "云枢", "架构概览", "技术栈"],
  },
  {
    id: "kb-002",
    title: "路由配置与 Figma 沙箱注意事项",
    summary: "路由使用 createHashRouter，Figma Make iframe 沙箱对动态 import 有并发限制，采用静态导入保证可靠启动。",
    path: "routes.ts",
    tags: ["路由", "Figma"],
    keywords: ["路由", "routes", "hash", "figma", "沙箱", "import"],
  },
  {
    id: "kb-003",
    title: "环境变量配置指南",
    summary: "通过 VITE_YYC3_ 前缀环境变量覆盖运行时配置，优先级: import.meta.env > localStorage > 默认值。",
    path: "lib/env-config.ts",
    tags: ["配置", "环境变量"],
    keywords: ["env", "环境变量", "配置", "VITE", "config"],
  },
  {
    id: "kb-004",
    title: "Supabase 认证与 Ghost 登录",
    summary: "支持 Email + Password 认证，Mock 模式内置 Ghost 幽灵登录可跳过认证获得全权限。",
    path: "lib/supabaseClient.ts",
    tags: ["认证", "安全"],
    keywords: ["supabase", "认证", "login", "ghost", "登录", "auth"],
  },
  {
    id: "kb-005",
    title: "本地存储方案 (localStorage + IndexedDB)",
    summary: "统一 localStorage CRUD 工厂 createLocalStore 与 IndexedDB 双轨持久化，支持导出/导入。",
    path: "lib/create-local-store.ts",
    tags: ["存储", "持久化"],
    keywords: ["storage", "存储", "localstorage", "indexeddb", "持久化", "idb"],
  },
  {
    id: "kb-006",
    title: "IDE 多联式面板系统",
    summary: "基于 react-resizable-panels v4 的三栏布局 + 底部终端，支持编辑/预览/自由三种布局模式与设置持久化。",
    path: "components/ide/IDELayout.tsx",
    tags: ["IDE", "布局"],
    keywords: ["ide", "面板", "panel", "布局", "layout", "终端", "terminal"],
  },
  {
    id: "kb-007",
    title: "i18n 国际化方案",
    summary: "内置 zh-CN / en-US 双语言包，通过 useI18n Hook 提供翻译函数 t() 与语言切换。",
    path: "i18n/index.ts",
    tags: ["国际化"],
    keywords: ["i18n", "国际化", "zh", "en", "翻译", "language"],
  },
  {
    id: "kb-008",
    title: "PWA 离线支持与后台同步",
    summary: "支持 PWA 安装提示、离线状态监控、后台同步队列与 WebSocket 断线自动重连。",
    path: "hooks/usePWAManager.ts",
    tags: ["PWA", "离线"],
    keywords: ["pwa", "离线", "offline", "同步", "sync", "reconnect", "重连"],
  },
];

// ============================================================
// 检索实现
// ============================================================

/**
 * 本地知识检索
 * 基于标题/摘要/关键词的简单关键词匹配 + 打分。
 */
export function searchKnowledge(query: string): KnowledgeSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const tokens = q.split(/[\s,，。.;；:：、/\\\-_()（）[\]【】]+/).filter(Boolean);

  const results: KnowledgeSearchResult[] = [];

  for (const article of KNOWLEDGE_BASE) {
    let score = 0;
    const title = article.title.toLowerCase();
    const summary = article.summary.toLowerCase();
    const keywords = (article.keywords ?? []).map((k) => k.toLowerCase());

    for (const token of tokens) {
      if (title.includes(token)) score += 40;
      if (summary.includes(token)) score += 20;
      if (keywords.some((k) => k.includes(token) || token.includes(k))) score += 15;
    }

    // 整句模糊匹配 (中文场景)
    if (title.includes(q)) score += 30;
    if (summary.includes(q)) score += 15;

    if (score > 0) {
      results.push({ article, score: Math.min(100, score) });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * 将检索结果格式化为 AI 可用的上下文片段。
 */
export function formatSearchResultForAI(results: KnowledgeSearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `${i + 1}. **${r.article.title}** — ${r.article.summary}` +
        (r.article.path ? ` (${r.article.path})` : ""),
    )
    .join("\n");
}
